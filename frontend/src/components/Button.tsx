import React from "react";
import sound from "../utils/sound";
import "./Button.css";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "accent";
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  size = "md",
  children,
  onClick,
  className = "",
  ...props
}) => {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    sound.playClick();
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <button
      className={`btn btn-${variant} btn-${size} ${className}`}
      onClick={handleClick}
      {...props}
    >
      <span className="btn-content">{children}</span>
    </button>
  );
};

export default Button;
