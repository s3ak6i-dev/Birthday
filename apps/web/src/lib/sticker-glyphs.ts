// Placeholder sticker art. The real 20-icon pixel-art set (masterdoc.md
// section 2.6) doesn't exist yet - rather than block the album screen on
// generating it, each sticker's `icon` id (packages/shared/src/stickers.ts)
// maps to a plain emoji glyph for now. Swap this map for real
// art/export/stickers/<icon>.png paths once that art exists; StickerAlbum.tsx
// doesn't need to change, just this map.
export const STICKER_GLYPH: Record<string, string> = {
  stork: "🦢",
  "ecg-heart": "💓",
  peacock: "🦚",
  phone: "📞",
  magnifier: "🔍",
  flame: "🔥",
  bandage: "🩹",
  "stethoscope-heart": "🩺",
  "coffee-cup": "☕",
  brain: "🧠",
  pill: "💊",
  thermometer: "🌡️",
  "ward-dog": "🐶",
  mascot: "🦉",
  star: "⭐",
  trophy: "🏆",
  key: "🔑",
  moon: "🌙",
  plant: "🌱",
  polaroid: "📷",
};
