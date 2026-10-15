// Avatar Setup (S03, FR-90) options. Kept separate from characters.ts
// (login identity) since this is purely cosmetic data, not account data.
//
// Scope note on "scrubs color": FR-90 says players choose a scrubs color,
// which implies live recoloring. The actual base art is a single flat
// composited image (body + clothes + shading baked together), so a CSS
// hue/color filter would shift skin and hair tone right along with the
// scrubs - not acceptable. True "just recolor the clothing" needs the
// clothing rendered as its own masked layer, which isn't how this art was
// generated. Rather than hack a masking pipeline together, each scrub
// color is its own pre-generated sprite pair (scrubs-only + scrubs+coat),
// same approach as the coat toggle itself - higher quality, much simpler
// to build, at the cost of needing a new generation per color.
//
// 7 colors total: Classic (the original neutral gray) plus 6 generated
// variants - 5 use the locked UI palette's own hex values directly (so
// clothing color and UI accent color are never two different "violets"),
// and Sky Blue is the one deliberate non-palette "practical extra," since
// real scrubs are very often blue and the locked palette has nothing in
// that family.
import type { CharacterLogin } from "./characters";

export type CharacterId = CharacterLogin["id"];

export interface ScrubColorOption {
  id: string;
  label: string;
  swatch: string; // CSS color for the picker swatch itself
  images: Record<CharacterId, { scrubs: string; coat: string }>;
}

export const SCRUB_COLORS: ScrubColorOption[] = [
  {
    id: "classic-gray",
    label: "Classic",
    swatch: "#D8D4DC",
    images: {
      lakshmi: { scrubs: "/characters/lakshmi-scrubs.png", coat: "/characters/lakshmi-coat.png" },
      surya: { scrubs: "/characters/surya-scrubs.png", coat: "/characters/surya-coat.png" },
    },
  },
  {
    id: "lilac",
    label: "Lilac",
    swatch: "#DEC9E9",
    images: {
      lakshmi: { scrubs: "/characters/lakshmi-scrubs-lilac.png", coat: "/characters/lakshmi-coat-lilac.png" },
      surya: { scrubs: "/characters/surya-scrubs-lilac.png", coat: "/characters/surya-coat-lilac.png" },
    },
  },
  {
    id: "amethyst",
    label: "Amethyst",
    swatch: "#A06CD5",
    images: {
      lakshmi: { scrubs: "/characters/lakshmi-scrubs-amethyst.png", coat: "/characters/lakshmi-coat-amethyst.png" },
      surya: { scrubs: "/characters/surya-scrubs-amethyst.png", coat: "/characters/surya-coat-amethyst.png" },
    },
  },
  {
    id: "coral",
    label: "Coral",
    swatch: "#FF7A7A",
    images: {
      lakshmi: { scrubs: "/characters/lakshmi-scrubs-coral.png", coat: "/characters/lakshmi-coat-coral.png" },
      surya: { scrubs: "/characters/surya-scrubs-coral.png", coat: "/characters/surya-coat-coral.png" },
    },
  },
  {
    id: "mint",
    label: "Mint",
    swatch: "#8FE3B0",
    images: {
      lakshmi: { scrubs: "/characters/lakshmi-scrubs-mint.png", coat: "/characters/lakshmi-coat-mint.png" },
      surya: { scrubs: "/characters/surya-scrubs-mint.png", coat: "/characters/surya-coat-mint.png" },
    },
  },
  {
    id: "butter",
    label: "Butter",
    swatch: "#FFE08A",
    images: {
      lakshmi: { scrubs: "/characters/lakshmi-scrubs-butter.png", coat: "/characters/lakshmi-coat-butter.png" },
      surya: { scrubs: "/characters/surya-scrubs-butter.png", coat: "/characters/surya-coat-butter.png" },
    },
  },
  {
    id: "sky-blue",
    label: "Sky Blue",
    swatch: "#7EC8E3",
    images: {
      lakshmi: { scrubs: "/characters/lakshmi-scrubs-skyblue.png", coat: "/characters/lakshmi-coat-skyblue.png" },
      surya: { scrubs: "/characters/surya-scrubs-skyblue.png", coat: "/characters/surya-coat-skyblue.png" },
    },
  },
];

export interface AvatarConfig {
  scrubColorId: string;
  coatOn: boolean;
}

export const DEFAULT_AVATAR_CONFIG: AvatarConfig = {
  scrubColorId: "classic-gray",
  coatOn: false,
};

/** The actual sprite for a character's confirmed look - same coat/scrubs
 * lookup Avatar Setup's own preview uses, pulled out here so anywhere else
 * that wants to show "how this person currently looks" (the Lounge's
 * profile button) doesn't duplicate it. */
export function getAvatarSpriteSrc(characterId: CharacterId, config: AvatarConfig): string {
  const scrubColor = SCRUB_COLORS.find((c) => c.id === config.scrubColorId) ?? SCRUB_COLORS[0]!;
  return config.coatOn ? scrubColor.images[characterId].coat : scrubColor.images[characterId].scrubs;
}

function storageKey(characterId: CharacterId): string {
  return `ward-games:avatar:${characterId}`;
}

export function loadAvatarConfig(characterId: CharacterId): AvatarConfig {
  try {
    const raw = localStorage.getItem(storageKey(characterId));
    if (!raw) return DEFAULT_AVATAR_CONFIG;
    return { ...DEFAULT_AVATAR_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_AVATAR_CONFIG; // storage blocked / corrupt - just fall back, no harm
  }
}

export function saveAvatarConfig(characterId: CharacterId, config: AvatarConfig): void {
  try {
    localStorage.setItem(storageKey(characterId), JSON.stringify(config));
  } catch {
    // ignore, per browser-storage guidance - never let this break the page
  }
}
