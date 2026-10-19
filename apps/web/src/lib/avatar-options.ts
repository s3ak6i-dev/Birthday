// Avatar Setup (S03, FR-90) options. Kept separate from characters.ts
// (login identity) since this is purely cosmetic data, not account data.
//
// The coat toggle (scrubs-only vs. scrubs+coat) that used to sit alongside
// scrub color was removed on request - each color option was a pre-
// generated scrubs/coat sprite pair specifically so the coat toggle could
// exist without live layer compositing; removing the toggle meant
// dropping the coat half of every pair, not just hiding a button (see
// `images` below - was `Record<CharacterId, { scrubs: string; coat:
// string }>`, now just `Record<CharacterId, string>`).
//
// Scope note on "scrubs color": FR-90 says players choose a scrubs color,
// which implies live recoloring. The actual base art is a single flat
// composited image (body + clothes + shading baked together), so a CSS
// hue/color filter would shift skin and hair tone right along with the
// scrubs - not acceptable. True "just recolor the clothing" needs the
// clothing rendered as its own masked layer, which isn't how this art was
// generated. Rather than hack a masking pipeline together, each scrub
// color is its own pre-generated sprite - higher quality, much simpler to
// build, at the cost of needing a new generation per color.
//
// The Lounge's in-game PlayableCharacter sprite is a different story -
// it only ever had the one gray sheet, pre-generating a color pair per
// FR-90 color there would mean 7 colors × ~29 walk/idle/wave/sit frames
// × 2 characters, not a reasonable art ask. That one DOES recolor live
// (packages/ui/src/recolor.ts, wired in by apps/web/src/routes/Lounge.tsx's
// `scrubColorHexFor`) via masked color-range + connected-component
// detection rather than a flat hue filter, specifically to avoid the skin/
// hair bleed problem described above. Reads `scrubColorId` from this same
// `AvatarConfig`, just takes a different path to the screen than this
// screen's own preview does.
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
  images: Record<CharacterId, string>;
}

export const SCRUB_COLORS: ScrubColorOption[] = [
  {
    id: "classic-gray",
    label: "Classic",
    swatch: "#D8D4DC",
    images: {
      lakshmi: "/characters/lakshmi-scrubs.png",
      surya: "/characters/surya-scrubs.png",
    },
  },
  {
    id: "lilac",
    label: "Lilac",
    swatch: "#DEC9E9",
    images: {
      lakshmi: "/characters/lakshmi-scrubs-lilac.png",
      surya: "/characters/surya-scrubs-lilac.png",
    },
  },
  {
    id: "amethyst",
    label: "Amethyst",
    swatch: "#A06CD5",
    images: {
      lakshmi: "/characters/lakshmi-scrubs-amethyst.png",
      surya: "/characters/surya-scrubs-amethyst.png",
    },
  },
  {
    id: "coral",
    label: "Coral",
    swatch: "#FF7A7A",
    images: {
      lakshmi: "/characters/lakshmi-scrubs-coral.png",
      surya: "/characters/surya-scrubs-coral.png",
    },
  },
  {
    id: "mint",
    label: "Mint",
    swatch: "#8FE3B0",
    images: {
      lakshmi: "/characters/lakshmi-scrubs-mint.png",
      surya: "/characters/surya-scrubs-mint.png",
    },
  },
  {
    id: "butter",
    label: "Butter",
    swatch: "#FFE08A",
    images: {
      lakshmi: "/characters/lakshmi-scrubs-butter.png",
      surya: "/characters/surya-scrubs-butter.png",
    },
  },
  {
    id: "sky-blue",
    label: "Sky Blue",
    swatch: "#7EC8E3",
    images: {
      lakshmi: "/characters/lakshmi-scrubs-skyblue.png",
      surya: "/characters/surya-scrubs-skyblue.png",
    },
  },
];

export interface AvatarConfig {
  scrubColorId: string;
}

export const DEFAULT_AVATAR_CONFIG: AvatarConfig = {
  scrubColorId: "classic-gray",
};

/** The actual sprite for a character's confirmed look - same lookup
 * Avatar Setup's own preview uses, pulled out here so anywhere else that
 * wants to show "how this person currently looks" (the Lounge's profile
 * button) doesn't duplicate it. */
export function getAvatarSpriteSrc(characterId: CharacterId, config: AvatarConfig): string {
  const scrubColor = SCRUB_COLORS.find((c) => c.id === config.scrubColorId) ?? SCRUB_COLORS[0]!;
  return scrubColor.images[characterId];
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
