export type QualityTier = "high" | "balanced" | "battery-saver";
export function recommendedQualityTier():QualityTier{return window.matchMedia("(max-width: 700px), (pointer: coarse)").matches?"battery-saver":"balanced";}
export function getQualitySettings(tier: QualityTier) { const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches; return { pixelRatioCap:tier==="high"?2:tier==="balanced"?1.5:1, shadows:tier!=="battery-saver", animateVehicle:!reducedMotion, carPoolSize:tier==="high"?18:tier==="balanced"?12:5 } as const; }
