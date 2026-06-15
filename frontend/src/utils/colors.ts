export interface GateColorInfo {
  bg: string; // Background color
  text: string; // Text color for readability
  glow: string; // Shadow/Glow color
  name: string; // Japanese name of the gate
}

export const GATE_COLORS: Record<number, GateColorInfo> = {
  1: {
    bg: "#FFFFFF",
    text: "#1E293B",
    glow: "rgba(255, 255, 255, 0.8)",
    name: "1枠 (白)",
  },
  2: {
    bg: "#1E293B",
    text: "#F8FAFC",
    glow: "rgba(30, 41, 59, 0.8)",
    name: "2枠 (黒)",
  },
  3: {
    bg: "#EF4444",
    text: "#FFFFFF",
    glow: "rgba(239, 68, 68, 0.8)",
    name: "3枠 (赤)",
  },
  4: {
    bg: "#3B82F6",
    text: "#FFFFFF",
    glow: "rgba(59, 130, 246, 0.8)",
    name: "4枠 (青)",
  },
  5: {
    bg: "#FBBF24",
    text: "#1E293B",
    glow: "rgba(251, 191, 36, 0.8)",
    name: "5枠 (黄)",
  },
  6: {
    bg: "#10B981",
    text: "#FFFFFF",
    glow: "rgba(16, 185, 129, 0.8)",
    name: "6枠 (緑)",
  },
  7: {
    bg: "#F97316",
    text: "#FFFFFF",
    glow: "rgba(249, 115, 22, 0.8)",
    name: "7枠 (橙)",
  },
  8: {
    bg: "#EC4899",
    text: "#FFFFFF",
    glow: "rgba(236, 72, 153, 0.8)",
    name: "8枠 (桃)",
  },
};

export const getGateColor = (postNo: number): GateColorInfo => {
  return (
    GATE_COLORS[postNo] || {
      bg: "#6B7280",
      text: "#FFFFFF",
      glow: "rgba(107, 114, 128, 0.8)",
      name: "その他",
    }
  );
};
