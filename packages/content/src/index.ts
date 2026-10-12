// @ward-games/content - schemas for every game's JSON content packs.
// The packs themselves (src/<game>/<pack>.json) are plain JSON, imported
// directly by whatever needs them (apps/rooms at room-init time) rather than
// re-exported from here, so adding a pack never requires touching this file.
export * from "./schemas";
