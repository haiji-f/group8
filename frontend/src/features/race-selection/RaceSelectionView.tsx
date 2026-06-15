import React, { useEffect, useState } from "react";
import { getRaces, getHorses } from "../../api/raceService";
import type { Race, Horse } from "../../types";
import { getGateColor } from "../../utils/colors";
import RaceCard from "../../components/RaceCard";
import Button from "../../components/Button";
import { AlertCircle, Loader2 } from "lucide-react";
import "./RaceSelectionView.css";

interface RaceSelectionViewProps {
  onSelectRace: (race: Race, horses: Horse[]) => void;
}

export const RaceSelectionView: React.FC<RaceSelectionViewProps> = ({ onSelectRace }) => {
  const [races, setRaces] = useState<Race[]>([]);
  const [selectedRace, setSelectedRace] = useState<Race | null>(null);
  const [horses, setHorses] = useState<Horse[]>([]);

  const [loadingRaces, setLoadingRaces] = useState<boolean>(true);
  const [loadingHorses, setLoadingHorses] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch races on mount
  useEffect(() => {
    async function loadRaces() {
      try {
        setLoadingRaces(true);
        const data = await getRaces();
        setRaces(data);
        if (data.length > 0) {
          // Pre-select first race
          setSelectedRace(data[0]);
        }
      } catch (err) {
        console.error(err);
        setError("レース一覧の取得に失敗しました。");
      } finally {
        setLoadingRaces(false);
      }
    }
    loadRaces();
  }, []);

  // Fetch horses when selectedRace changes
  useEffect(() => {
    if (!selectedRace) return;
    const selectedRaceId = selectedRace.race_id;

    async function loadHorses() {
      try {
        setLoadingHorses(true);
        const data = await getHorses(selectedRaceId);
        setHorses(data);
      } catch (err) {
        console.error(err);
        setError("出走馬情報の取得に失敗しました。");
      } finally {
        setLoadingHorses(false);
      }
    }
    loadHorses();
  }, [selectedRace]);

  const handleStartSim = () => {
    if (selectedRace && horses.length > 0) {
      onSelectRace(selectedRace, horses);
    }
  };

  if (loadingRaces) {
    return (
      <div className="selection-loading">
        <Loader2 className="spinner" size={48} />
        <p>レースデータを読み込み中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="selection-error">
        <AlertCircle size={40} />
        <p>{error}</p>
        <Button onClick={() => window.location.reload()}>再読み込み</Button>
      </div>
    );
  }

  return (
    <div className="race-selection-container">
      <div className="selection-layout">
        {/* Left Side: Selected Race Info Panel */}
        <div className="selected-race-detail-panel">
          {selectedRace && (
            <>
              <div className="detail-panel-header">
                <span className="selection-label">選択中のレース</span>
                <h2 className="selected-race-title">{selectedRace.race_name}</h2>
                <p className="selected-race-meta">
                  {selectedRace.track_type === "Turf" ? "芝" : "ダート"}
                  {selectedRace.distance}m / {selectedRace.post_time} / {selectedRace.num_horses}頭
                </p>
              </div>

              {loadingHorses ? (
                <div className="detail-loading-inline">
                  <Loader2 className="spinner" size={24} />
                  <span>馬情報を読み込み中...</span>
                </div>
              ) : (
                <div className="detail-panel-body">
                  <div className="ready-badge">抽選準備OK</div>

                  <p className="description-text">
                    このレースでボールを落として、先に入った順で3連単を決めます。
                  </p>

                  {/* Ball previews */}
                  <div className="ball-preview-section">
                    <h4 className="preview-title">ボールプレビュー</h4>
                    <div className="ball-preview-row">
                      {horses.map((horse) => {
                        const colorInfo = getGateColor(horse.post_no);
                        return (
                          <div
                            key={horse.horse_no}
                            className="preview-ball-circle"
                            style={{
                              backgroundColor: colorInfo.bg,
                              color: colorInfo.text,
                              boxShadow: `0 2px 8px ${colorInfo.glow}`,
                            }}
                          >
                            {horse.horse_no}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="action-button-wrapper">
                    <Button variant="primary" size="lg" className="w-full" onClick={handleStartSim}>
                      ボール抽選へ
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Right Side: Race list rows */}
        <div className="race-list-panel">
          <div className="race-list-header">
            <h2 className="panel-title">開催中のレース</h2>
            <p className="panel-subtitle">見たいレースを選んで、抽選へ進みます。</p>
          </div>

          <div className="race-cards-grid">
            {races.map((race) => (
              <RaceCard
                key={race.race_id}
                race={race}
                isSelected={selectedRace?.race_id === race.race_id}
                onSelect={setSelectedRace}
              />
            ))}
          </div>

          <p className="footer-meta-note">
            余計な情報は出さず、次の抽選に必要な選択だけを見せます。
          </p>
        </div>
      </div>
    </div>
  );
};

export default RaceSelectionView;
