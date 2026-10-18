// See masterdoc.md section 5.2.
import { z } from "zod";

export const wordleEntrySchema = z.object({
  id: z.string().min(1),
  // 4-8 letters, matching MIN_WORD_LENGTH/MAX_WORD_LENGTH in
  // packages/shared/src/games/wordle/engine.ts - was a fixed 5 (masterdoc.md
  // 3.3's original spec) until custom-length words were added; keep these
  // two bounds in sync if either one ever changes.
  word: z
    .string()
    .min(4, "Wordle words must be 4-8 letters")
    .max(8, "Wordle words must be 4-8 letters")
    .regex(/^[A-Z]+$/, "words must be uppercase A-Z"),
  definition: z.string().min(1),
  pack: z.enum(["General", "OB-GYN", "Pharmacology", "Anatomy", "Pediatrics", "Inside-Jokes"]),
  difficultyTier: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  source: z.string().min(1),
  reviewed: z.boolean(),
});

export type WordleEntryContent = z.infer<typeof wordleEntrySchema>;
export const wordleEntryPackSchema = z.array(wordleEntrySchema);
