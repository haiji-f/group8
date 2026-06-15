import React from "react";
import "./StepBar.css";

interface StepBarProps {
  currentStep: number;
}

export const StepBar: React.FC<StepBarProps> = ({ currentStep }) => {
  const steps = [
    { number: 1, label: "1 レース" },
    { number: 2, label: "2 ボール" },
    { number: 3, label: "3 結果" },
  ];

  return (
    <div className="step-bar-container">
      {steps.map((step) => {
        const isActive = currentStep === step.number;
        return (
          <div key={step.number} className={`step-capsule ${isActive ? "active" : ""}`}>
            {step.label}
          </div>
        );
      })}
    </div>
  );
};

export default StepBar;
