// Story layer types. See masterdoc.md section 2.5 (story layer) and 4.8
// (story engine / inkjs integration).

export type TimeOfDayTag = "After Rounds" | "Night Duty" | "Late Night Call" | "Weekend" | "Exam Week";

export interface SceneTags {
  bg: string;
  music: string;
  time: TimeOfDayTag;
}

/** Persisted to the `scene_flags` table (masterdoc 4.5) so both devices agree on story state. */
export interface SceneFlags {
  [flagName: string]: boolean | number | string;
}

// TODO (M3, section 7.2 "Scene player + Ink pipeline"):
//  - compile scenes/*.ink to JSON via inkjs at build time
//  - implement the scene player reading SceneTags for background/music/time
//  - sync SceneFlags (e.g. met_dog, bond_rank) to the scene_flags table on scene end
