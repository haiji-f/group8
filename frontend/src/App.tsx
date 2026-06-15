import { useState } from "react";
import StepBar from "./components/StepBar";
import RaceSelectionView from "./features/race-selection/RaceSelectionView";
import SimulationView from "./features/simulation/SimulationView";
import ResultsView from "./features/results/ResultsView";
import type { Race, Horse } from "./types";
import "./App.css";

function App() {
  const [step, setStep] = useState<number>(1);
  const [selectedRace, setSelectedRace] = useState<Race | null>(null);
  const [raceHorses, setRaceHorses] = useState<Horse[]>([]);
  const [ranking, setRanking] = useState<number[]>([]); // Array of horse numbers: [1st, 2nd, 3rd]

  const handleRaceSelect = (race: Race, horses: Horse[]) => {
    setSelectedRace(race);
    setRaceHorses(horses);
    setStep(2); // Go to physics simulation
  };

  const handleSimulationFinish = (podium: number[]) => {
    setRanking(podium);
    setStep(3); // Go to results & odds calculation
  };

  const handleReset = () => {
    setSelectedRace(null);
    setRaceHorses([]);
    setRanking([]);
    setStep(1); // Go back to start
  };

  return (
    <div className="app-container">
      {/* Premium Header */}
      <header className="app-header">
        <div className="header-logo">
          <span className="logo-text">TRIFECTA DROP</span>
          <span className="logo-subtext">
            {step === 1 && "1 レース選択"}
            {step === 2 && "2 ボール抽選"}
            {step === 3 && "3 結果発表"}
          </span>
        </div>
        <StepBar currentStep={step} />
      </header>

      {/* Main interactive area */}
      <main className="app-main-content">
        {step === 1 && <RaceSelectionView onSelectRace={handleRaceSelect} />}

        {step === 2 && selectedRace && (
          <SimulationView
            key={selectedRace.race_id}
            race={selectedRace}
            horses={raceHorses}
            onFinish={handleSimulationFinish}
          />
        )}

        {step === 3 && selectedRace && (
          <ResultsView
            race={selectedRace}
            horses={raceHorses}
            ranking={ranking}
            onReset={handleReset}
          />
        )}
      </main>

      {/* Premium footer */}
      <footer className="app-footer">
        <p>© 2026 TrifectaDrop. All Rights Reserved. Powered by Matter.js & React.</p>
      </footer>
    </div>
  );
}

export default App;
