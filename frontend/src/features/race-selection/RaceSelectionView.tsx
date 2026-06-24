import React, { useCallback, useEffect, useState } from "react";
import { getRaces, getHorses } from "../../api/raceService";
import type { Race, Horse } from "../../types";
import { getGateColor } from "../../utils/colors";
import RaceCard from "../../components/RaceCard";
import Button from "../../components/Button";
import { AlertCircle, Loader2, Calendar } from "lucide-react";
import sound from "../../utils/sound";
import "./RaceSelectionView.css";

interface RaceSelectionViewProps {
  onSelectRace: (race: Race, horses: Horse[]) => void;
}

export const RaceSelectionView: React.FC<RaceSelectionViewProps> = ({ onSelectRace }) => {
  const [races, setRaces] = useState<Race[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedVenue, setSelectedVenue] = useState<string>("");
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
          setSelectedDate(data[0].race_date);
          setSelectedVenue(data[0].venue);
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

  // Fetch horses whenever selectedRace changes.
  // Async work is done inside loadHorses, so no setState is called synchronously.
  const selectedRaceId = selectedRace?.race_id ?? null;
  useEffect(() => {
    if (!selectedRaceId) {
      return;
    }
    let cancelled = false;
    async function loadHorses() {
      try {
        setLoadingHorses(true);
        const data = await getHorses(selectedRaceId as string);
        if (!cancelled) {
          setHorses(data);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setError("出走馬情報の取得に失敗しました。");
        }
      } finally {
        if (!cancelled) {
          setLoadingHorses(false);
        }
      }
    }
    loadHorses();
    return () => {
      cancelled = true;
    };
  }, [selectedRaceId]);

  // Filter races by date and venue (derived, no effect needed)
  const filteredRaces = races.filter(
    (race) => race.race_date === selectedDate && race.venue === selectedVenue
  );

  // ── Event handlers update all related state together (no cascading effects) ──

  const handleDateChange = useCallback(
    (date: string, allRaces: Race[]) => {
      setSelectedDate(date);
      // Keep current venue if it has races on the new date, otherwise clear
      const venueRaces = allRaces.filter(
        (r) => r.race_date === date && r.venue === selectedVenue
      );
      if (venueRaces.length > 0) {
        setSelectedRace(venueRaces[0]);
        setHorses([]);
      } else {
        // Try to find any venue that has races on this date
        const anyRace = allRaces.find((r) => r.race_date === date);
        if (anyRace) {
          setSelectedVenue(anyRace.venue);
          setSelectedRace(anyRace);
          setHorses([]);
        } else {
          setSelectedRace(null);
          setHorses([]);
        }
      }
    },
    [selectedVenue]
  );

  const handleVenueChange = useCallback(
    (venue: string, allRaces: Race[]) => {
      setSelectedVenue(venue);
      const venueRaces = allRaces.filter(
        (r) => r.race_date === selectedDate && r.venue === venue
      );
      if (venueRaces.length > 0) {
        setSelectedRace(venueRaces[0]);
        setHorses([]);
      } else {
        setSelectedRace(null);
        setHorses([]);
      }
    },
    [selectedDate]
  );

  const handleSelectRace = useCallback((race: Race) => {
    setSelectedRace(race);
    setHorses([]);
  }, []);

  const handleStartSim = () => {
    if (selectedRace && horses.length > 0) {
      onSelectRace(selectedRace, horses);
    }
  };

  // Helper to format date string to MM/DD
  const formatDateStr = (dateStr: string) => {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length < 3) return dateStr;
    return `${parseInt(parts[1])}/${parseInt(parts[2])}`;
  };

  // Extract unique dates and sort
  const availableDates = Array.from(new Set(races.map((r) => r.race_date))).sort();
  const allVenues = ["東京", "中山", "阪神", "京都"];

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
          {selectedRace ? (
            <>
              <div className="detail-panel-header">
                <span className="selection-label">選択中のレース</span>
                <h2 className="selected-race-title">{selectedRace.race_name}</h2>
                <p className="selected-race-meta">
                  {selectedRace.race_date} ({selectedRace.venue}) / {selectedRace.track_type === "Turf" ? "芝" : "ダート"}
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
                    このレースでボールを落として、入った3頭で3連複を決めます。
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
          ) : (
            <div className="detail-panel-empty">
              <span className="selection-label">レース未選択</span>
              <h2 className="selected-race-title empty-title">レースが選択されていません</h2>
              <p className="description-text">
                右側のパネルから日付と競馬場を選択し、出走させたいレースを選択してください。
              </p>
              <div className="empty-graphic-container">
                <div className="empty-graphic-ring">
                  <div className="empty-graphic-ball" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Step-by-step filters and Race list */}
        <div className="race-list-panel">
          <div className="race-list-header">
            <h2 className="panel-title">レース選択</h2>
            <p className="panel-subtitle">日付、競馬場を順に選んで、レースを決定します。</p>
          </div>

          {/* Step 1: Date picker */}
          <div className="filter-step-section">
            <div className="filter-step-title-row">
              <span className="step-number-badge">1</span>
              <h3 className="filter-step-title">日付を選択</h3>
            </div>
            <div className="date-filter-wrapper">
              <div className="custom-date-picker-container">
                <Calendar className="date-input-icon" size={16} />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    sound.playClick();
                    handleDateChange(e.target.value, races);
                  }}
                  className="custom-date-input"
                />
              </div>
              <div className="quick-date-chips">
                {availableDates.map((date) => (
                  <button
                    key={date}
                    className={`date-chip-btn ${selectedDate === date ? "selected" : ""}`}
                    onClick={() => {
                      sound.playClick();
                      handleDateChange(date, races);
                    }}
                  >
                    {formatDateStr(date)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Step 2: Venue selector */}
          <div className="filter-step-section">
            <div className="filter-step-title-row">
              <span className="step-number-badge">2</span>
              <h3 className="filter-step-title">競馬場を選択</h3>
            </div>
            <div className="venue-selector-grid">
              {allVenues.map((venue) => {
                const hasRaces = races.some((r) => r.race_date === selectedDate && r.venue === venue);
                return (
                  <button
                    key={venue}
                    className={`venue-selector-btn ${selectedVenue === venue ? "selected" : ""} ${!hasRaces ? "inactive" : ""}`}
                    onClick={() => {
                      sound.playClick();
                      handleVenueChange(venue, races);
                    }}
                  >
                    <span className="venue-name-text">{venue}</span>
                    {hasRaces && <span className="active-dot" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 3: Race list / empty state */}
          <div className="filter-step-section races-step-section">
            <div className="filter-step-title-row">
              <span className="step-number-badge">3</span>
              <h3 className="filter-step-title">レースを選択</h3>
            </div>

            {filteredRaces.length > 0 ? (
              <div className="race-cards-grid">
                {filteredRaces.map((race) => (
                  <RaceCard
                    key={race.race_id}
                    race={race}
                    isSelected={selectedRace?.race_id === race.race_id}
                    onSelect={handleSelectRace}
                  />
                ))}
              </div>
            ) : (
              <div className="no-races-card">
                <AlertCircle className="no-races-icon" size={36} />
                <h4 className="no-races-heading">レースがありません</h4>
                <p className="no-races-subheading">
                  選択された日付 ({selectedDate ? selectedDate.replace(/-/g, "/") : "---"}) と競馬場 ({selectedVenue || "---"}) に開催予定のレースはありません。
                </p>
              </div>
            )}
          </div>

          <p className="footer-meta-note">
            日付と競馬場の組み合わせを変更して、レース情報を探すことができます。
          </p>
        </div>
      </div>
    </div>
  );
};

export default RaceSelectionView;
