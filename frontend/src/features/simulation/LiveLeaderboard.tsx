import React from "react";
import type { Horse } from "../../types";
import { getGateColor } from "../../utils/colors";
import Button from "../../components/Button";
import "./LiveLeaderboard.css";

interface LiveLeaderboardProps {
  horses: Horse[];
  ranking: number[]; // e.g. [7]
  isGateOpened: boolean;
  isBallDropComplete: boolean;
  isResultReady: boolean;
  controls?: React.ReactNode;
  onOpenGate: () => void;
  onViewResults: () => void;
}

export const LiveLeaderboard: React.FC<LiveLeaderboardProps> = ({
  horses,
  ranking,
  isGateOpened,
  isBallDropComplete,
  isResultReady,
  controls,
  onOpenGate,
  onViewResults,
}) => {
  const rank1 = ranking[0];
  const rank2 = ranking[1];
  const rank3 = ranking[2];

  const getHorseName = (horseNo: number) => {
    return horses.find((h) => h.horse_no === horseNo)?.horse_name || "";
  };

  return (
    <div className="live-leaderboard">
      <h3 className="leaderboard-title">進行状況</h3>

      {/* Podium Status Capsule Rows */}
      <div className="podium-status">
        {/* 1st Place */}
        <div className={`status-capsule rank-1 ${rank1 ? "confirmed" : "pending"}`}>
          {rank1 ? (
            <div className="capsule-content">
              <span className="capsule-label">1頭目</span>
              <span
                className="capsule-gate-circle"
                style={{
                  backgroundColor: getGateColor(
                    horses.find((h) => h.horse_no === rank1)?.post_no || 1,
                  ).bg,
                  color: getGateColor(horses.find((h) => h.horse_no === rank1)?.post_no || 1).text,
                }}
              >
                {rank1}
              </span>
              <span className="capsule-name">{getHorseName(rank1)}</span>
              <span className="capsule-status-tag">確定</span>
            </div>
          ) : (
            <div className="capsule-content">
              <span className="capsule-label">1頭目</span>
              <span className="capsule-status-tag">判定中</span>
            </div>
          )}
        </div>

        {/* 2nd Place */}
        <div
          className={`status-capsule rank-2 ${rank2 ? "confirmed" : rank1 ? "pending" : "waiting"}`}
        >
          {rank2 ? (
            <div className="capsule-content">
              <span className="capsule-label">2頭目</span>
              <span
                className="capsule-gate-circle"
                style={{
                  backgroundColor: getGateColor(
                    horses.find((h) => h.horse_no === rank2)?.post_no || 1,
                  ).bg,
                  color: getGateColor(horses.find((h) => h.horse_no === rank2)?.post_no || 1).text,
                }}
              >
                {rank2}
              </span>
              <span className="capsule-name">{getHorseName(rank2)}</span>
              <span className="capsule-status-tag">確定</span>
            </div>
          ) : rank1 ? (
            <div className="capsule-content">
              <span className="capsule-label">2頭目</span>
              <span className="capsule-status-tag">判定中</span>
            </div>
          ) : (
            <div className="capsule-content">
              <span className="capsule-label">2頭目</span>
              <span className="capsule-status-tag text-muted">待機</span>
            </div>
          )}
        </div>

        {/* 3rd Place */}
        <div
          className={`status-capsule rank-3 ${rank3 ? "confirmed" : rank2 ? "pending" : "waiting"}`}
        >
          {rank3 ? (
            <div className="capsule-content">
              <span className="capsule-label">3頭目</span>
              <span
                className="capsule-gate-circle"
                style={{
                  backgroundColor: getGateColor(
                    horses.find((h) => h.horse_no === rank3)?.post_no || 1,
                  ).bg,
                  color: getGateColor(horses.find((h) => h.horse_no === rank3)?.post_no || 1).text,
                }}
              >
                {rank3}
              </span>
              <span className="capsule-name">{getHorseName(rank3)}</span>
              <span className="capsule-status-tag">確定</span>
            </div>
          ) : rank2 ? (
            <div className="capsule-content">
              <span className="capsule-label">3頭目</span>
              <span className="capsule-status-tag">判定中</span>
            </div>
          ) : (
            <div className="capsule-content">
              <span className="capsule-label">3頭目</span>
              <span className="capsule-status-tag text-muted">待機</span>
            </div>
          )}
        </div>
      </div>

      {/* Guide Card Box */}
      <div className="simulation-guide-box">
        <h4 className="guide-title">見方</h4>
        <p className="guide-description">ポケットへ入った3頭で三連複の組み合わせを確定します。</p>
      </div>

      <div className="live-actions">
        {controls && <div className="leaderboard-controls-wrapper">{controls}</div>}

        {/* Bottom release CTA button */}
        <div className="live-action-wrapper">
          {!isGateOpened && !isBallDropComplete ? (
            <Button variant="secondary" size="lg" className="w-full" disabled>
              ボール投入中
            </Button>
          ) : !isGateOpened ? (
            <Button variant="primary" size="lg" className="w-full" onClick={onOpenGate}>
              ゲートを開ける
            </Button>
          ) : isResultReady ? (
            <Button variant="primary" size="lg" className="w-full" onClick={onViewResults}>
              結果を見る
            </Button>
          ) : (
            <Button variant="secondary" size="lg" className="w-full" disabled>
              抽選を見守る
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default LiveLeaderboard;
