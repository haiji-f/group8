import React from "react";
import type { Horse } from "../../types";
import { getGateColor } from "../../utils/colors";
import Button from "../../components/Button";
import "./LiveLeaderboard.css";

interface LiveLeaderboardProps {
  horses: Horse[];
  ranking: number[]; // e.g. [7]
  isGateOpened: boolean;
  onOpenGate: () => void;
}

export const LiveLeaderboard: React.FC<LiveLeaderboardProps> = ({
  horses,
  ranking,
  isGateOpened,
  onOpenGate,
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
              <span className="capsule-label">1着</span>
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
              <span className="capsule-label">1着</span>
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
              <span className="capsule-label">2着</span>
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
              <span className="capsule-label">2着</span>
              <span className="capsule-status-tag">判定中</span>
            </div>
          ) : (
            <div className="capsule-content">
              <span className="capsule-label">2着</span>
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
              <span className="capsule-label">3着</span>
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
              <span className="capsule-label">3着</span>
              <span className="capsule-status-tag">判定中</span>
            </div>
          ) : (
            <div className="capsule-content">
              <span className="capsule-label">3着</span>
              <span className="capsule-status-tag text-muted">待機</span>
            </div>
          )}
        </div>
      </div>

      {/* Guide Card Box */}
      <div className="simulation-guide-box">
        <h4 className="guide-title">見方</h4>
        <p className="guide-description">先にポケットへ入った番号から順に確定します。</p>
      </div>

      {/* Bottom release CTA button */}
      <div className="live-action-wrapper">
        {!isGateOpened ? (
          <Button variant="primary" size="lg" className="w-full" onClick={onOpenGate}>
            ゲートを開ける
          </Button>
        ) : (
          <Button variant="secondary" size="lg" className="w-full" disabled>
            抽選を見守る
          </Button>
        )}
      </div>
    </div>
  );
};

export default LiveLeaderboard;
