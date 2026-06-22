import { FastForward, Pause, Play, RotateCcw, Volume2, VolumeX } from "lucide-react";
import Matter from "matter-js";
import React, { useEffect, useRef, useState } from "react";
import Button from "../../components/Button";
import type { Horse, Race } from "../../types";
import { getGateColor } from "../../utils/colors";
import sound from "../../utils/sound";
import LiveLeaderboard from "./LiveLeaderboard";
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
  const getInitialBallCounts = () => {
    const initialCounts: Record<number, number> = {};
    horses.forEach((h) => {
      initialCounts[h.horse_no] = h.ball_count;
    });
    return initialCounts;
  };

  // Simulation Controls State
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(sound.getMutedState());
  const [isGateOpened, setIsGateOpened] = useState<boolean>(false);
  const [isBallDropComplete, setIsBallDropComplete] = useState<boolean>(false);
  const [isResultReady, setIsResultReady] = useState<boolean>(false);
  const [simulationRunId, setSimulationRunId] = useState<number>(0);

  // Real-time Standings State
  const [ranking, setRanking] = useState<number[]>([]);
  const [activeBallCounts, setActiveBallCounts] =
    useState<Record<number, number>>(getInitialBallCounts);

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

  // Reset the current simulation back to the closed-gate state.
  const handleResetSimulation = () => {
    sound.playClick();
    rankingRef.current = [];
    particlesRef.current = [];
    isPlayingRef.current = true;
    speedRef.current = 1;
    partitionRef.current = null;
    setRanking([]);
    setActiveBallCounts(getInitialBallCounts());
    setIsGateOpened(false);
    setIsBallDropComplete(false);
    setIsResultReady(false);
    setIsPlaying(true);
    setSpeedMultiplier(1);
    setSimulationRunId((current) => current + 1);
  };

  // Handle Gate Release (Open Gate)
  const handleOpenGate = () => {
    if (isGateOpened || !isBallDropComplete) return;
    sound.playClick();
    setIsGateOpened(true);
    if (partitionRef.current && worldRef.current) {
      Matter.Composite.remove(worldRef.current, partitionRef.current);
    }
  };

  const handleViewResults = () => {
    if (!isResultReady || rankingRef.current.length < 3) return;
    sound.playClick();
    onFinish([...rankingRef.current]);
  };

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    setIsBallDropComplete(false);
    setIsResultReady(false);

    const width = 560;
    const height = 560;

    // 1. Create Matter.js Engine & World
    const engine = Matter.Engine.create({
      gravity: { x: 0, y: 1.0, scale: 0.001 },
    });
    engineRef.current = engine;
    const world = engine.world;
    worldRef.current = world;

    // Keep track of peg hits to draw temporary glow flashes
    const pegHitsMap: Record<string, number> = {};
    const scheduledTimeouts: number[] = [];
    let isDisposed = false;
    let isRaceFinished = false;

    const scheduleTimeout = (callback: () => void, delay: number) => {
      const timeoutId = window.setTimeout(() => {
        if (isDisposed) return;
        callback();
      }, delay);
      scheduledTimeouts.push(timeoutId);
    };

    // 2. Build barriers for the compact single-queue stage.
    const wallOptions = { isStatic: true, restitution: 0.8, friction: 0.01 };

    const stage = {
      queueX: 20,
      queueWidth: 520,
      queueY: 58,
      queueHeight: 76,
      trapTopY: 172,
      trapBottomY: 440,
      trapTopLeftX: 20,
      trapTopRightX: 540,
      trapBottomLeftX: 125,
      trapBottomRightX: 435,
      goalX: 90,
      goalY: 486,
      goalWidth: 380,
      goalHeight: 48,
    };
    const gateY = stage.queueY + stage.queueHeight;
    const dropSpawnTopY = 24;

    const createWallFromLine = (
      x1: number,
      y1: number,
      x2: number,
      y2: number,
      thickness: number,
      label: string,
    ) => {
      const dx = x2 - x1;
      const dy = y2 - y1;
      const length = Math.sqrt(dx * dx + dy * dy);
      return Matter.Bodies.rectangle((x1 + x2) / 2, (y1 + y2) / 2, length, thickness, {
        ...wallOptions,
        angle: Math.atan2(dy, dx),
        label,
      });
    };

    const queueWallTopY = 0;
    const queueWallHeight = gateY - queueWallTopY;
    const queueWallY = queueWallTopY + queueWallHeight / 2;

    const queueLeftWall = Matter.Bodies.rectangle(stage.queueX, queueWallY, 8, queueWallHeight, {
      ...wallOptions,
      label: "queue_left_wall",
    });

    const queueRightWall = Matter.Bodies.rectangle(
      stage.queueX + stage.queueWidth,
      queueWallY,
      8,
      queueWallHeight,
      {
        ...wallOptions,
        label: "queue_right_wall",
      },
    );

    const leftGuideWall = createWallFromLine(
      stage.queueX,
      gateY + 8,
      stage.trapTopLeftX,
      stage.trapTopY,
      8,
      "left_guide_wall",
    );

    const rightGuideWall = createWallFromLine(
      stage.queueX + stage.queueWidth,
      gateY + 8,
      stage.trapTopRightX,
      stage.trapTopY,
      8,
      "right_guide_wall",
    );

    const leftWall = createWallFromLine(
      stage.trapTopLeftX,
      stage.trapTopY,
      stage.trapBottomLeftX,
      stage.trapBottomY,
      8,
      "left_stage_wall",
    );

    const rightWall = createWallFromLine(
      stage.trapTopRightX,
      stage.trapTopY,
      stage.trapBottomRightX,
      stage.trapBottomY,
      8,
      "right_stage_wall",
    );

    const goalLeftWall = Matter.Bodies.rectangle(
      stage.goalX,
      stage.goalY + stage.goalHeight / 2,
      8,
      stage.goalHeight,
      { ...wallOptions, label: "goal_left_wall" },
    );

    const goalRightWall = Matter.Bodies.rectangle(
      stage.goalX + stage.goalWidth,
      stage.goalY + stage.goalHeight / 2,
      8,
      stage.goalHeight,
      { ...wallOptions, label: "goal_right_wall" },
    );

    const goalBottomFloor = Matter.Bodies.rectangle(
      stage.goalX + stage.goalWidth / 2,
      stage.goalY + stage.goalHeight,
      stage.goalWidth,
      8,
      { ...wallOptions, label: "goal_bottom_floor" },
    );

    const partition = Matter.Bodies.rectangle(280, gateY, stage.queueWidth, 8, {
      isStatic: true,
      label: "partition",
    });
    partitionRef.current = partition;

    // Add static boundaries to world
    const boundaries = [
      queueLeftWall,
      queueRightWall,
      leftGuideWall,
      rightGuideWall,
      leftWall,
      rightWall,
      goalLeftWall,
      goalRightWall,
      goalBottomFloor,
      partition,
    ];
    Matter.Composite.add(world, boundaries);

    // 3. Setup pegs inside the inverted triangle bounds
    const pegs: Matter.Body[] = [];
    const pegOptions = { isStatic: true, restitution: 0.9, friction: 0 };
    const pegRadius = 3.8;
    const pegKeys = new Set<string>();
    const startY = 206;
    const endY = 438;
    const rowSpacing = 22;
    const colSpacing = 29;

    const addPeg = (x: number, y: number) => {
      const key = `${Math.round(x)}_${Math.round(y)}`;
      if (pegKeys.has(key)) return;

      const peg = Matter.Bodies.circle(x, y, pegRadius, pegOptions);
      peg.label = `peg_${key}`;
      pegs.push(peg);
      pegKeys.add(key);
    };

    let rowIndex = 0;
    for (let y = startY; y <= endY; y += rowSpacing) {
      const progress = (y - stage.trapTopY) / (stage.trapBottomY - stage.trapTopY);
      const leftX = stage.trapTopLeftX + (stage.trapBottomLeftX - stage.trapTopLeftX) * progress;
      const rightX =
        stage.trapTopRightX + (stage.trapBottomRightX - stage.trapTopRightX) * progress;

      const leftLimit = leftX + 12;
      const rightLimit = rightX - 12;
      const zigzagOffset = rowIndex % 2 === 0 ? 0 : colSpacing / 2;
      const centerPegX = width / 2 + zigzagOffset;

      addPeg(leftX + 8, y);
      addPeg(rightX - 8, y);

      for (let x = centerPegX; x <= rightLimit; x += colSpacing) {
        addPeg(x, y);
      }

      for (let x = centerPegX - colSpacing; x >= leftLimit; x -= colSpacing) {
        addPeg(x, y);
      }
      rowIndex++;
    }
    Matter.Composite.add(world, pegs);

    // 4. Goal line sensor across the goal area
    const goalSensor = Matter.Bodies.rectangle(
      stage.goalX + stage.goalWidth / 2,
      stage.goalY + 8,
      stage.goalWidth,
      8,
      {
        isStatic: true,
        isSensor: true,
        label: "goal_sensor",
      },
    );
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
      if (isDisposed || isRaceFinished) return;
      if (!isPlayingRef.current) {
        scheduleTimeout(() => dropBall(def, idx), 100);
        return;
      }

      const spawnMargin = 26;
      const spawnLaneCount = Math.max(
        1,
        Math.floor((stage.queueWidth - spawnMargin * 2) / (8.5 * 2.4)),
      );
      const spawnLaneStep =
        spawnLaneCount === 1 ? 0 : (stage.queueWidth - spawnMargin * 2) / (spawnLaneCount - 1);
      const spawnLaneIndex = idx % spawnLaneCount;
      const spawnWaveIndex = Math.floor(idx / spawnLaneCount);
      const spawnX =
        stage.queueX + spawnMargin + spawnLaneIndex * spawnLaneStep + (Math.random() - 0.5) * 3;
      const spawnY = dropSpawnTopY - (spawnWaveIndex % 4) * 18;

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
        x: (Math.random() - 0.5) * 0.6,
        y: 1 + Math.random() * 0.4,
      });

      ballsList.push(ball);
      Matter.Composite.add(world, ball);

      if (idx === ballDefinitions.length - 1) {
        setIsBallDropComplete(true);
      }

      if (idx % 12 === 0) {
        sound.playBounce(0.3);
      }
    };

    // Stagger ball releases above the waiting zone.
    if (ballDefinitions.length === 0) {
      scheduleTimeout(() => setIsBallDropComplete(true), 0);
    } else {
      ballDefinitions.forEach((def, i) => {
        scheduleTimeout(() => {
          dropBall(def, i);
        }, i * 35);
      });
    }

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
                isRaceFinished = true;
                isPlayingRef.current = false;
                setIsPlaying(false);
                setIsResultReady(true);
                sound.playFanfare();
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

    const drawRoundedBox = (
      x: number,
      y: number,
      boxWidth: number,
      boxHeight: number,
      radius: number,
      fillStyle: string,
      strokeStyle: string,
      lineWidth = 1.5,
    ) => {
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(x, y, boxWidth, boxHeight, radius);
      ctx.fillStyle = fillStyle;
      ctx.fill();
      ctx.strokeStyle = strokeStyle;
      ctx.lineWidth = lineWidth;
      ctx.stroke();
      ctx.restore();
    };

    const drawStageLabel = (text: string, x: number, y: number, size = 12) => {
      ctx.save();
      ctx.fillStyle = "rgba(255,255,255,0.68)";
      ctx.font = `bold ${size}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, x, y);
      ctx.restore();
    };

    const drawStageShell = () => {
      drawStageLabel("待機ゾーン", 280, 24, 13);

      drawRoundedBox(
        stage.queueX,
        stage.queueY,
        stage.queueWidth,
        stage.queueHeight,
        8,
        "rgba(245,245,245,0.06)",
        "rgba(255,255,255,0.22)",
      );

      drawStageLabel("ゲート", 280, gateY + 20, 11);
      if (world.bodies.includes(partition)) {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(stage.queueX, gateY);
        ctx.lineTo(stage.queueX + stage.queueWidth, gateY);
        ctx.strokeStyle = "rgba(204,164,82,0.22)";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();

        drawRoundedBox(
          stage.queueX,
          gateY - 5,
          stage.queueWidth,
          10,
          5,
          "rgba(204,164,82,0.95)",
          "rgba(255,255,255,0.34)",
          1,
        );
      }

      drawStageLabel("ピンゾーン", 280, stage.trapTopY + 16, 12);
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(stage.trapTopLeftX, stage.trapTopY);
      ctx.lineTo(stage.trapTopRightX, stage.trapTopY);
      ctx.lineTo(stage.trapBottomRightX, stage.trapBottomY);
      ctx.lineTo(stage.trapBottomLeftX, stage.trapBottomY);
      ctx.closePath();
      ctx.fillStyle = "rgba(255,255,255,0.045)";
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();

      drawStageLabel("ゴール", 280, stage.goalY - 16, 12);
      drawRoundedBox(
        stage.goalX,
        stage.goalY,
        stage.goalWidth,
        stage.goalHeight,
        3,
        "rgba(255,255,255,0.03)",
        "rgba(204,164,82,0.55)",
      );
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

      drawStageShell();

      // Draw barriers
      ctx.fillStyle = "rgba(18, 18, 20, 0.6)";
      ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
      ctx.lineWidth = 1.5;

      boundaries.forEach((body) => {
        if (body.label === "partition") return;

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
        ctx.arc(peg.position.x, peg.position.y, pegRadius, 0, Math.PI * 2);

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

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(stage.goalX + 8, stage.goalY + 8);
      ctx.lineTo(stage.goalX + stage.goalWidth - 8, stage.goalY + 8);
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
      isDisposed = true;
      scheduledTimeouts.forEach((timeoutId) => {
        window.clearTimeout(timeoutId);
      });
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      Matter.World.clear(world, false);
      Matter.Engine.clear(engine);
    };
  }, [horses, simulationRunId]);

  const simulationControls = (
    <div className="controls-bar">
      <Button variant="secondary" size="md" onClick={handleTogglePlay} className="control-btn">
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

      <Button variant="secondary" size="md" onClick={handleCycleSpeed} className="control-btn">
        <FastForward size={16} /> 倍速: {speedMultiplier}x
      </Button>

      <Button variant="secondary" size="md" onClick={handleToggleMute} className="control-btn-icon">
        {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
      </Button>

      <Button
        variant="secondary"
        size="md"
        onClick={handleResetSimulation}
        className="control-btn-icon"
        aria-label="ゲートを開ける前に戻す"
        title="ゲートを開ける前に戻す"
      >
        <RotateCcw size={16} />
      </Button>
    </div>
  );

  return (
    <div className="simulation-container">
      <div className="simulation-header">
        <h2 className="race-sim-title">ボール落下抽選</h2>
        <p className="sim-intro-text">
          小さなボールが静かに落ちて、入った3頭で三連複の組み合わせが決まります。
        </p>
      </div>

      <div className="simulation-layout">
        {/* Left Column: Physics Chute Board */}
        <div className="arena-panel">
          <div className="canvas-wrapper">
            <canvas ref={canvasRef} width={560} height={560} className="physics-canvas" />
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
            isBallDropComplete={isBallDropComplete}
            isResultReady={isResultReady}
            controls={simulationControls}
            onOpenGate={handleOpenGate}
            onViewResults={handleViewResults}
          />
        </div>
      </div>
    </div>
  );
};

export default SimulationView;
