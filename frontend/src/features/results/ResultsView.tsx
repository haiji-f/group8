import confetti from "canvas-confetti";
import { RotateCcw, Trophy } from "lucide-react";
import React, { useEffect, useState } from "react";
import { getTrioOdds } from "../../api/raceService";
import Button from "../../components/Button";
import type { Horse, Race } from "../../types";
import { getGateColor } from "../../utils/colors";
import "./ResultsView.css";

interface ResultsViewProps {
  race: Race;
  horses: Horse[];
  ranking: number[]; // e.g. [5, 11, 3]
  onReset: () => void;
}

export const ResultsView: React.FC<ResultsViewProps> = ({ race, horses, ranking, onReset }) => {
  const [animatedOdds, setAnimatedOdds] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  const rank1Horse = horses.find((h) => h.horse_no === ranking[0]);
  const rank2Horse = horses.find((h) => h.horse_no === ranking[1]);
  const rank3Horse = horses.find((h) => h.horse_no === ranking[2]);

  // Trigger confetti and fetch odds on mount
  useEffect(() => {
    // 1. Confetti bursts
    const duration = 2.5 * 1000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ["#e67e22", "#c084fc", "#3b82f6"],
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ["#e67e22", "#c084fc", "#3b82f6"],
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();

    // 2. Fetch odds from service
    async function loadOdds() {
      try {
        setLoading(true);
        const fetchedOdds = await getTrioOdds(race.race_id, ranking[0], ranking[1], ranking[2]);

        // 3. Count up animation
        const duration = 1200; // ms
        const startTime = performance.now();

        const animateCount = (timestamp: number) => {
          const elapsed = timestamp - startTime;
          const progress = Math.min(elapsed / duration, 1);

          // Easing out quadratic
          const easeProgress = progress * (2 - progress);
          const current = easeProgress * fetchedOdds;

          setAnimatedOdds(current);

          if (progress < 1) {
            requestAnimationFrame(animateCount);
          } else {
            setAnimatedOdds(fetchedOdds);
          }
        };

        requestAnimationFrame(animateCount);
      } catch (err) {
        console.error("Failed to load odds", err);
      } finally {
        setLoading(false);
      }
    }

    loadOdds();
  }, [race, ranking]);

  const animatedPayout = Math.floor(animatedOdds * 100);

  return (
    <div className="results-container">
      <div className="results-header">
        <div className="award-banner">
          <Trophy className="trophy-icon" size={32} />
          <span className="results-subtitle">{race.race_name}</span>
          <h1 className="results-title">レース確定</h1>
        </div>
      </div>

      <div className="results-layout">
        {/* Left Card: 3連複 & Odds Display */}
        <div className="payout-panel">
          <h3 className="panel-section-title">三連複 配当金結果</h3>

          {/* Big Ticket Combo */}
          <div className="ticket-combo">
            {ranking.map((horseNo, index) => {
              const horse = horses.find((h) => h.horse_no === horseNo);
              const colorInfo = getGateColor(horse?.post_no || 1);
              return (
                <React.Fragment key={horseNo}>
                  <div className="ticket-item">
                    <span className="ticket-rank-label">{index + 1}頭目</span>
                    <div
                      className="ticket-circle"
                      style={{
                        backgroundColor: colorInfo.bg,
                        color: colorInfo.text,
                        boxShadow: `0 0 15px ${colorInfo.glow}`,
                      }}
                    >
                      {horseNo}
                    </div>
                    <span className="ticket-name-label">{horse?.horse_name}</span>
                  </div>
                  {index < 2 && <span className="combo-separator">-</span>}
                </React.Fragment>
              );
            })}
          </div>

          {/* Animated Payout Counters */}
          <div className="odds-stats-box">
            {loading ? (
              <div className="odds-loading">オッズ計算中...</div>
            ) : (
              <>
                <div className="stat-row">
                  <span className="stat-label">三連複オッズ</span>
                  <span className="stat-value odds-ratio">
                    {animatedOdds.toFixed(1)} <span className="stat-unit">倍</span>
                  </span>
                </div>
                <div className="stat-row highlight">
                  <span className="stat-label">
                    払戻金 <span className="stake-label">(100円あたり)</span>
                  </span>
                  <span className="stat-value payout-amount">
                    ¥{animatedPayout.toLocaleString()}
                  </span>
                </div>
              </>
            )}
          </div>

          <div className="restart-wrapper">
            <Button variant="primary" size="lg" onClick={onReset} className="restart-button">
              <RotateCcw size={18} /> 別のレースを予想する
            </Button>
          </div>
        </div>

        {/* Right Card: Podium Standings Visual */}
        <div className="podium-panel">
          <h3 className="panel-section-title">選出馬一覧</h3>

          <div className="visual-podium">
            {/* 2nd Place */}
            {rank2Horse && (
              <div className="podium-place place-2">
                <div className="podium-horse-card">
                  <div
                    className="podium-gate-line"
                    style={{ backgroundColor: getGateColor(rank2Horse.post_no).bg }}
                  />
                  <span className="podium-horse-num">{rank2Horse.horse_no}</span>
                  <span className="podium-horse-name">{rank2Horse.horse_name}</span>
                  <span className="podium-horse-jockey">{rank2Horse.jockey_name}</span>
                </div>
                <div className="podium-pedestal p2">
                  <span className="pedestal-num">2</span>
                </div>
              </div>
            )}

            {/* 1st Place */}
            {rank1Horse && (
              <div className="podium-place place-1">
                <div className="podium-horse-card">
                  <div
                    className="podium-gate-line"
                    style={{ backgroundColor: getGateColor(rank1Horse.post_no).bg }}
                  />
                  <span className="podium-horse-num">{rank1Horse.horse_no}</span>
                  <span className="podium-horse-name">{rank1Horse.horse_name}</span>
                  <span className="podium-horse-jockey">{rank1Horse.jockey_name}</span>
                </div>
                <div className="podium-pedestal p1">
                  <span className="pedestal-num">1</span>
                </div>
              </div>
            )}

            {/* 3rd Place */}
            {rank3Horse && (
              <div className="podium-place place-3">
                <div className="podium-horse-card">
                  <div
                    className="podium-gate-line"
                    style={{ backgroundColor: getGateColor(rank3Horse.post_no).bg }}
                  />
                  <span className="podium-horse-num">{rank3Horse.horse_no}</span>
                  <span className="podium-horse-name">{rank3Horse.horse_name}</span>
                  <span className="podium-horse-jockey">{rank3Horse.jockey_name}</span>
                </div>
                <div className="podium-pedestal p3">
                  <span className="pedestal-num">3</span>
                </div>
              </div>
            )}
          </div>

          {/* Full Standings Detail table */}
          <div className="full-standings-list">
            <div className="standings-header">
              <span>確定</span>
              <span>馬番</span>
              <span>馬名</span>
              <span style={{ textAlign: "right" }}>単勝オッズ</span>
            </div>

            <div className="standings-row">
              <span className="rank-num text-gold">1頭目</span>
              <span
                className="gate-num-cell"
                style={{ borderLeftColor: getGateColor(rank1Horse?.post_no || 1).bg }}
              >
                {rank1Horse?.horse_no}
              </span>
              <span className="horse-name-cell">{rank1Horse?.horse_name}</span>
              <span className="odds-cell">{rank1Horse?.odds_win.toFixed(1)}倍</span>
            </div>
            <div className="standings-row">
              <span className="rank-num text-silver">2頭目</span>
              <span
                className="gate-num-cell"
                style={{ borderLeftColor: getGateColor(rank2Horse?.post_no || 1).bg }}
              >
                {rank2Horse?.horse_no}
              </span>
              <span className="horse-name-cell">{rank2Horse?.horse_name}</span>
              <span className="odds-cell">{rank2Horse?.odds_win.toFixed(1)}倍</span>
            </div>
            <div className="standings-row">
              <span className="rank-num text-bronze">3頭目</span>
              <span
                className="gate-num-cell"
                style={{ borderLeftColor: getGateColor(rank3Horse?.post_no || 1).bg }}
              >
                {rank3Horse?.horse_no}
              </span>
              <span className="horse-name-cell">{rank3Horse?.horse_name}</span>
              <span className="odds-cell">{rank3Horse?.odds_win.toFixed(1)}倍</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultsView;
