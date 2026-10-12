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

export interface AccessoryOption {
  id: "stethoscope" | "glasses" | "headphones" | "hairAccessory" | "backpackCharm";
  label: string;
  image: string;
  /** Position as a percentage box relative to the character sprite's own
   * bounding box, per character (their proportions differ). These are
   * verified, not eyeballed blind: each one was checked by actually
   * compositing the accessory onto the real sprite in Python and looking
   * at the result before being written here - see TODO.md for why the
   * first pass of these numbers (pure percentage guessing from a gridline
   * overlay, no compositing check) came out visibly wrong. Re-verified a
   * second time when the base scrubs art itself was replaced (individually
   * generated and properly body-centered, instead of split out of a
   * combined two-person scene) - different crop, different percentages. */
  position: Record<CharacterId, { left: string; top: string; width: string }>;
}

export const ACCESSORIES: AccessoryOption[] = [
  {
    id: "stethoscope",
    label: "Stethoscope",
    image: "/avatar-accessories/stethoscope.png",
    position: {
      lakshmi: { left: "35%", top: "26%", width: "30%" },
      surya: { left: "24%", top: "25%", width: "30%" },
    },
  },
  {
    id: "glasses",
    label: "Glasses",
    image: "/avatar-accessories/glasses.png",
    position: {
      lakshmi: { left: "26%", top: "14.5%", width: "43%" },
      surya: { left: "22%", top: "11%", width: "40%" },
    },
  },
  {
    id: "headphones",
    label: "Headphones",
    image: "/avatar-accessories/headphones.png",
    // Generated as classic over-ear headphones (band + two cups), which
    // reads as "worn on the head" - placed there, it swallowed the whole
    // face at any width large enough to look right (see TODO.md). The
    // source prompt actually asked for them "resting around a neck," so
    // this positions them in the same neck/chest zone as the stethoscope
    // instead - the band arcs across the collar, cups hang on the chest.
    position: {
      lakshmi: { left: "22%", top: "26%", width: "56%" },
      surya: { left: "15%", top: "27%", width: "55%" },
    },
  },
  {
    id: "hairAccessory",
    label: "Hair accessory",
    image: "/avatar-accessories/hair-scrunchie.png",
    position: {
      lakshmi: { left: "68%", top: "10%", width: "20%" },
      surya: { left: "58%", top: "6%", width: "18%" },
    },
  },
  {
    id: "backpackCharm",
    label: "Backpack charm",
    image: "/avatar-accessories/backpack-charm.png",
    position: {
      lakshmi: { left: "62%", top: "50%", width: "18%" },
      surya: { left: "62%", top: "48%", width: "16%" },
    },
  },
];

export interface AvatarConfig {
  scrubColorId: string;
  coatOn: boolean;
  accessories: Partial<Record<AccessoryOption["id"], boolean>>;
}

export const DEFAULT_AVATAR_CONFIG: AvatarConfig = {
  scrubColorId: "classic-gray",
  coatOn: false,
  accessories: {},
};

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
