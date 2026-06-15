import React, { useEffect, useRef, useState } from "react";
import Matter from "matter-js";
import type { Horse, Race } from "../../types";
import { getGateColor } from "../../utils/colors";
import sound from "../../utils/sound";
import LiveLeaderboard from "./LiveLeaderboard";
import Button from "../../components/Button";
import { Play, Pause, FastForward, RotateCcw, Volume2, VolumeX } from "lucide-react";
import "./SimulationView.css";

interface SimulationViewProps {
  race: Race;
  horses: Horse[];
  onFinish: (result: number[]) => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  alpha: number;
  size: number;
  life: number;
  maxLife: number;
}

interface BallBody extends Matter.Body {
  horseNo: number;
  postNo: number;
}

export const SimulationView: React.FC<SimulationViewProps> = ({ horses, onFinish }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Simulation Controls State
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(sound.getMutedState());
  const [isGateOpened, setIsGateOpened] = useState<boolean>(false);

  // Real-time Standings State
  const [ranking, setRanking] = useState<number[]>([]);
  const [activeBallCounts, setActiveBallCounts] = useState<Record<number, number>>(() => {
    const initialCounts: Record<number, number> = {};
    horses.forEach((h) => {
      initialCounts[h.horse_no] = h.ball_count;
    });
    return initialCounts;
  });

  // Refs to share mutable variables with the physics engine and animation loop
  const engineRef = useRef<Matter.Engine | null>(null);
  const worldRef = useRef<Matter.World | null>(null);
  const partitionRef = useRef<Matter.Body | null>(null);

  const isPlayingRef = useRef<boolean>(true);
  const speedRef = useRef<number>(1);
  const rankingRef = useRef<number[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const animationFrameRef = useRef<number | null>(null);

  // Sync state to refs for use in the animation loops
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    speedRef.current = speedMultiplier;
  }, [speedMultiplier]);

  // Handle Play/Pause
  const handleTogglePlay = () => {
    sound.playClick();
    setIsPlaying(!isPlaying);
  };

  // Handle Speed adjustment
  const handleCycleSpeed = () => {
    sound.playClick();
    const nextSpeed = speedMultiplier === 1 ? 2 : speedMultiplier === 2 ? 4 : 1;
    setSpeedMultiplier(nextSpeed);
  };

  // Handle Mute
  const handleToggleMute = () => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
  };

  // Trigger Restart
  const handleRestart = () => {
    sound.playClick();
    window.location.reload();
  };

  // Handle Gate Release (Open Gate)
  const handleOpenGate = () => {
    if (isGateOpened) return;
    sound.playClick();
    setIsGateOpened(true);
    if (partitionRef.current && worldRef.current) {
      Matter.Composite.remove(worldRef.current, partitionRef.current);
    }
  };

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = 560;
    const height = 700;

    // 1. Create Matter.js Engine & World
    const engine = Matter.Engine.create({
      gravity: { x: 0, y: 1.0, scale: 0.001 },
    });
    engineRef.current = engine;
    const world = engine.world;
    worldRef.current = world;

    // Keep track of peg hits to draw temporary glow flashes
    const pegHitsMap: Record<string, number> = {};

    // 2. Build Barriers & Triangular Chute Funnel
    const wallOptions = { isStatic: true, restitution: 0.8, friction: 0.01 };

    // Left Hopper Wall
    const leftHopper = Matter.Bodies.rectangle(240, 95, 8, 90, wallOptions);
    // Right Hopper Wall
    const rightHopper = Matter.Bodies.rectangle(320, 95, 8, 90, wallOptions);

    // Left Sloped Chute Wall (runs from (240, 140) to (80, 550))
    const leftWall = Matter.Bodies.rectangle(160, 345, 440, 8, {
      isStatic: true,
      angle: Math.atan2(410, -160),
      restitution: 0.85,
      friction: 0.01,
      label: "left_sloped_wall",
    });

    // Right Sloped Chute Wall (runs from (320, 140) to (480, 550))
    const rightWall = Matter.Bodies.rectangle(400, 345, 440, 8, {
      isStatic: true,
      angle: Math.atan2(410, 160),
      restitution: 0.85,
      friction: 0.01,
      label: "right_sloped_wall",
    });

    // Bottom sloped floor to guide balls rightwards (runs from (80, 550) to (400, 640))
    const bottomFloor = Matter.Bodies.rectangle(240, 595, 332, 8, {
      isStatic: true,
      angle: Math.atan2(90, 320),
      restitution: 0.7,
      friction: 0.005,
      label: "bottom_sloped_floor",
    });

    // Pocket left wall
    const leftPocketWall = Matter.Bodies.rectangle(400, 650, 8, 60, wallOptions);
    // Pocket right vertical wall (runs from (480, 550) down to (480, 680))
    const rightPocketWall = Matter.Bodies.rectangle(480, 615, 8, 130, wallOptions);

    // Horizontal Partition Gate (holds balls in hopper initially)
    const partition = Matter.Bodies.rectangle(280, 140, 80, 8, {
      isStatic: true,
      label: "partition",
    });
    partitionRef.current = partition;

    // Add static boundaries to world
    const boundaries = [
      leftHopper,
      rightHopper,
      leftWall,
      rightWall,
      bottomFloor,
      leftPocketWall,
      rightPocketWall,
      partition,
    ];
    Matter.Composite.add(world, boundaries);

    // 3. Setup Pegs inside the sloped triangle bounds
    const pegs: Matter.Body[] = [];
    const pegOptions = { isStatic: true, restitution: 0.9, friction: 0 };
    const startY = 170;
    const endY = 530;
    const rowSpacing = 32;
    const colSpacing = 30;

    let rowIndex = 0;
    for (let y = startY; y <= endY; y += rowSpacing) {
      // Linearly interpolate left and right wall coordinates at current y
      const leftX = 240 - (y - 140) * (160 / 410);
      const rightX = 320 + (y - 140) * (160 / 410);

      const isOffset = rowIndex % 2 === 1;
      const startX = leftX + (isOffset ? colSpacing / 2 : 0);

      for (let x = startX; x <= rightX; x += colSpacing) {
        // Place pegs safely within boundaries (give 18px clearance from walls)
        if (x < leftX + 18 || x > rightX - 18) continue;

        const peg = Matter.Bodies.circle(x, y, 4, pegOptions);
        peg.label = `peg_${x}_${y}`;
        pegs.push(peg);
      }
      rowIndex++;
    }
    Matter.Composite.add(world, pegs);

    // 4. Goal Line Sensor inside bottom right pocket
    const goalSensor = Matter.Bodies.rectangle(440, 670, 72, 8, {
      isStatic: true,
      isSensor: true,
      label: "goal_sensor",
    });
    Matter.Composite.add(world, goalSensor);

    // 5. Spawn Weighted Balls Staggered in top hopper
    const ballsList: Matter.Body[] = [];
    const ballDefinitions: { horseNo: number; postNo: number }[] = [];
    horses.forEach((h) => {
      for (let i = 0; i < h.ball_count; i++) {
        ballDefinitions.push({ horseNo: h.horse_no, postNo: h.post_no });
      }
    });

    // Shuffle ball array to mix colors beautifully
    for (let i = ballDefinitions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ballDefinitions[i], ballDefinitions[j]] = [ballDefinitions[j], ballDefinitions[i]];
    }

    const dropBall = (def: { horseNo: number; postNo: number }, idx: number) => {
      if (!isPlayingRef.current) {
        setTimeout(() => dropBall(def, idx), 100);
        return;
      }

      // Random position inside the hopper bounds (x = 245..315, y = 50..130)
      const spawnX = 245 + Math.random() * 70;
      const spawnY = 50 + Math.random() * 80;

      const ball = Matter.Bodies.circle(spawnX, spawnY, 8.5, {
        restitution: 0.45,
        friction: 0.005,
        frictionAir: 0.008,
        density: 0.002,
        label: `ball_${def.horseNo}`,
      });

      (ball as BallBody).horseNo = def.horseNo;
      (ball as BallBody).postNo = def.postNo;

      Matter.Body.setVelocity(ball, {
        x: (Math.random() - 0.5) * 1.5,
        y: Math.random() * 0.5,
      });

      ballsList.push(ball);
      Matter.Composite.add(world, ball);

      if (idx % 12 === 0) {
        sound.playBounce(0.3);
      }
    };

    // Stagger ball releases in top hopper
    ballDefinitions.forEach((def, i) => {
      setTimeout(() => {
        dropBall(def, i);
      }, i * 35);
    });

    // 6. Handle Collisions
    Matter.Events.on(engine, "collisionStart", (event) => {
      event.pairs.forEach((pair) => {
        const bodyA = pair.bodyA;
        const bodyB = pair.bodyB;

        const isBallA = bodyA.label.startsWith("ball_");
        const isBallB = bodyB.label.startsWith("ball_");

        // Sound on peg hit
        if (
          (isBallA && bodyB.label.startsWith("peg_")) ||
          (isBallB && bodyA.label.startsWith("peg_"))
        ) {
          const peg = bodyA.label.startsWith("peg_") ? bodyA : bodyB;
          const ball = bodyA.label.startsWith("ball_") ? bodyA : bodyB;
          pegHitsMap[peg.label] = 1.0;

          const speed = Math.sqrt(
            ball.velocity.x * ball.velocity.x + ball.velocity.y * ball.velocity.y,
          );
          sound.playBounce(speed / 12);
        }

        // Sound on sloped wall hit
        const isWallA =
          bodyA.label.endsWith("_wall") ||
          bodyA.label.endsWith("_floor") ||
          bodyA.label.endsWith("_hopper");
        const isWallB =
          bodyB.label.endsWith("_wall") ||
          bodyB.label.endsWith("_floor") ||
          bodyB.label.endsWith("_hopper");

        if ((isBallA && isWallB) || (isBallB && isWallA)) {
          const ball = isBallA ? bodyA : bodyB;
          const speed = Math.sqrt(
            ball.velocity.x * ball.velocity.x + ball.velocity.y * ball.velocity.y,
          );
          sound.playBounce(speed / 15 + 0.05);
        }

        // Goal Sensor Hit
        const isGoalSensor = bodyA.label === "goal_sensor" || bodyB.label === "goal_sensor";
        const checkBall = isBallA ? bodyA : isBallB ? bodyB : null;

        if (isGoalSensor && checkBall) {
          const horseNo = (checkBall as BallBody).horseNo;
          const postNo = (checkBall as BallBody).postNo;
          const currentRanking = [...rankingRef.current];

          if (!currentRanking.includes(horseNo)) {
            if (currentRanking.length < 3) {
              const newRank = [...currentRanking, horseNo];
              rankingRef.current = newRank;
              setRanking(newRank);
              sound.playGoal(newRank.length);

              // Vanish all active balls of this horse
              const bodies = Matter.Composite.allBodies(world);
              bodies.forEach((b) => {
                if (b.label === `ball_${horseNo}`) {
                  createExplosion(b.position.x, b.position.y, postNo);
                  Matter.Composite.remove(world, b);
                }
              });

              if (newRank.length === 3) {
                isPlayingRef.current = false;
                setIsPlaying(false);
                sound.playFanfare();
                setTimeout(() => {
                  onFinish(newRank);
                }, 2200);
              }
            } else {
              Matter.Composite.remove(world, checkBall);
            }
          } else {
            Matter.Composite.remove(world, checkBall);
          }
        }
      });
    });

    // 7. Explosion particle system
    const createExplosion = (x: number, y: number, postNo: number) => {
      const colorInfo = getGateColor(postNo);
      const count = 15 + Math.floor(Math.random() * 10);
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 5;
        const maxLife = 30 + Math.floor(Math.random() * 20);

        particlesRef.current.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 1.2,
          color: colorInfo.bg,
          alpha: 1.0,
          size: 2 + Math.random() * 3,
          life: maxLife,
          maxLife,
        });
      }
    };

    const updateAndDrawParticles = () => {
      const particles = particlesRef.current;
      particlesRef.current = particles.filter((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.05;
        p.life--;
        p.alpha = Math.max(0, p.life / p.maxLife);

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 8;
        ctx.shadowColor = p.color;
        ctx.fill();
        ctx.restore();

        return p.life > 0;
      });
    };

    // 8. Custom Render Loop
    const draw = () => {
      if (isPlayingRef.current) {
        const steps = speedRef.current;
        for (let i = 0; i < steps; i++) {
          Matter.Engine.update(engine, 1000 / 60);
        }
      }

      // Clear Canvas
      ctx.fillStyle = "rgba(7,7,8,1)";
      ctx.fillRect(0, 0, width, height);

      // Draw grid guidelines
      ctx.strokeStyle = "rgba(255, 255, 255, 0.01)";
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Draw barriers
      ctx.fillStyle = "rgba(18, 18, 20, 0.6)";
      ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
      ctx.lineWidth = 1.5;

      boundaries.forEach((body) => {
        // Skip drawing the partition if it has been removed
        if (body.label === "partition" && !world.bodies.includes(body)) return;

        ctx.beginPath();
        const vertices = body.vertices;
        ctx.moveTo(vertices[0].x, vertices[0].y);
        for (let i = 1; i < vertices.length; i++) {
          ctx.lineTo(vertices[i].x, vertices[i].y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      });

      // Draw pegs
      pegs.forEach((peg) => {
        const glowOpacity = pegHitsMap[peg.label] || 0;
        ctx.beginPath();
        ctx.arc(peg.position.x, peg.position.y, 3.5, 0, Math.PI * 2);

        if (glowOpacity > 0) {
          ctx.fillStyle = `rgba(255, 255, 255, ${0.4 + glowOpacity * 0.6})`;
          ctx.shadowBlur = 8;
          ctx.shadowColor = "#ffffff";
          pegHitsMap[peg.label] = Math.max(0, glowOpacity - 0.05);
        } else {
          ctx.fillStyle = "rgba(255,255,255,0.15)";
          ctx.shadowBlur = 0;
        }

        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Goal Pocket Label text
      ctx.save();
      ctx.fillStyle = "rgba(204, 164, 82, 0.7)";
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("ゴールポケット", 440, 662);
      ctx.restore();

      // Goal Laser Sensor
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(405, 670);
      ctx.lineTo(475, 670);
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(204, 164, 82, 0.85)";
      ctx.shadowBlur = 8;
      ctx.shadowColor = "rgba(204, 164, 82, 0.85)";
      ctx.stroke();
      ctx.restore();

      // Draw Balls
      const bodiesList = Matter.Composite.allBodies(world);
      const counts: Record<number, number> = {};
      bodiesList.forEach((body) => {
        if (body.label.startsWith("ball_")) {
          const horseNo = (body as BallBody).horseNo;
          const postNo = (body as BallBody).postNo;
          counts[horseNo] = (counts[horseNo] || 0) + 1;

          const colorInfo = getGateColor(postNo);
          ctx.save();
          ctx.beginPath();
          ctx.arc(body.position.x, body.position.y, 8.5, 0, Math.PI * 2);

          ctx.fillStyle = colorInfo.bg;
          ctx.shadowBlur = 10;
          ctx.shadowColor = colorInfo.glow;
          ctx.fill();
          ctx.shadowBlur = 0;

          ctx.lineWidth = 1;
          ctx.strokeStyle = "rgba(0,0,0,0.4)";
          ctx.stroke();

          ctx.fillStyle = colorInfo.text;
          ctx.font = "bold 9px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(String(horseNo), body.position.x, body.position.y);
          ctx.restore();
        }
      });

      // Sync active counts
      setActiveBallCounts(counts);

      // Render sparks
      updateAndDrawParticles();

      animationFrameRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      Matter.World.clear(world, false);
      Matter.Engine.clear(engine);
    };
  }, [horses, onFinish]);

  return (
    <div className="simulation-container">
      <div className="simulation-header">
        <h2 className="race-sim-title">ボール落下抽選</h2>
        <p className="sim-intro-text">
          小さなボールが静かに落ちて、先に入った順で着順が決まります。
        </p>
      </div>

      <div className="simulation-layout">
        {/* Left Column: Physics Chute Board */}
        <div className="arena-panel">
          <div className="canvas-wrapper">
            <canvas ref={canvasRef} width={560} height={700} className="physics-canvas" />
          </div>

          {/* Controls Bar */}
          <div className="controls-bar">
            <Button
              variant="secondary"
              size="md"
              onClick={handleTogglePlay}
              className="control-btn"
            >
              {isPlaying ? (
                <>
                  <Pause size={16} /> 一時停止
                </>
              ) : (
                <>
                  <Play size={16} /> 再生
                </>
              )}
            </Button>

            <Button
              variant="secondary"
              size="md"
              onClick={handleCycleSpeed}
              className="control-btn"
            >
              <FastForward size={16} /> 倍速: {speedMultiplier}x
            </Button>

            <Button
              variant="secondary"
              size="md"
              onClick={handleToggleMute}
              className="control-btn-icon"
            >
              {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </Button>

            <Button
              variant="secondary"
              size="md"
              onClick={handleRestart}
              className="control-btn-icon"
            >
              <RotateCcw size={16} />
            </Button>
          </div>

          {/* Bottom Horse Badge List */}
          <div className="arena-badges-section">
            <div className="horse-badges-grid">
              {horses.map((horse) => {
                const isFinished = ranking.includes(horse.horse_no);
                const remainingBalls = activeBallCounts[horse.horse_no] || 0;
                const isEliminated = remainingBalls === 0 && !isFinished;
                const colorInfo = getGateColor(horse.post_no);

                return (
                  <div
                    key={horse.horse_no}
                    className={`horse-badge-item ${isFinished ? "finished" : ""} ${isEliminated ? "eliminated" : ""}`}
                    style={
                      isFinished
                        ? {
                            backgroundColor: colorInfo.bg,
                            color: colorInfo.text,
                            borderColor: colorInfo.bg,
                            boxShadow: `0 0 10px ${colorInfo.glow}`,
                          }
                        : {}
                    }
                  >
                    {horse.horse_no}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Live Standings Panel & Gate release */}
        <div className="sidebar-panel">
          <LiveLeaderboard
            horses={horses}
            ranking={ranking}
            isGateOpened={isGateOpened}
            onOpenGate={handleOpenGate}
          />
        </div>
      </div>
    </div>
  );
};

export default SimulationView;
