import type { LinearGradientProps } from "expo-linear-gradient";

export const HERO_GRADIENTS: LinearGradientProps["colors"][] = [
  ["#00C6FB", "#005BEA"],
  ["#F5576C", "#F093FB"],
  ["#4FACFE", "#00F2FE"],
  ["#43E97B", "#38F9D7"],
  ["#FA709A", "#FEE140"],
  ["#667eea", "#764ba2"],
  ["#89f7fe", "#66a6ff"],
  ["#a18cd1", "#fbc2eb"],
  ["#f093fb", "#f5576c"],
  ["#84fab0", "#8fd3f4"],
  ["#e0c3fc", "#8ec5fc"],
  ["#ff9a9e", "#fecfef"],
];

export const getGradientByString = (value: string): LinearGradientProps["colors"] => {
  if (!value) return HERO_GRADIENTS[0];

  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = value.charCodeAt(index) + ((hash << 5) - hash);
  }

  return HERO_GRADIENTS[Math.abs(hash) % HERO_GRADIENTS.length];
};
