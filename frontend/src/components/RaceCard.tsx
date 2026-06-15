import React from "react";
import type { Race } from "../types";
import sound from "../utils/sound";
import "./RaceCard.css";

interface RaceCardProps {
  race: Race;
  onSelect: (race: Race) => void;
  isSelected: boolean;
}

export const RaceCard: React.FC<RaceCardProps> = ({ race, onSelect, isSelected }) => {
  const handleClick = () => {
    sound.playClick();
    onSelect(race);
  };

  const isTurf = race.track_type === "Turf";

  return (
    <div className={`race-card-row ${isSelected ? "selected" : ""}`} onClick={handleClick}>
      <div className="race-row-left">
        <h3 className="race-row-title">{race.race_name}</h3>
        <p className="race-row-meta">
          {isTurf ? "芝" : "ダ"}
          {race.distance}m / {race.post_time} / {race.num_horses}頭
        </p>
      </div>
      <div className="race-row-right">
        <button className={`race-select-btn ${isSelected ? "selected" : ""}`}>
          {isSelected ? "選択中" : "選択"}
        </button>
      </div>
    </div>
  );
};

export default RaceCard;
