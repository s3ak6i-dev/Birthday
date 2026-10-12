// See masterdoc.md section 5.2.
import { z } from "zod";

export const wordleEntrySchema = z.object({
  id: z.string().min(1),
  word: z
    .string()
    .length(5, "Wordle words must be exactly 5 letters, see masterdoc.md 3.3")
    .regex(/^[A-Z]+$/, "words must be uppercase A-Z"),
  definition: z.string().min(1),
  pack: z.enum(["General", "OB-GYN", "Pharmacology", "Anatomy", "Pediatrics", "Inside-Jokes"]),
  difficultyTier: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  source: z.string().min(1),
  reviewed: z.boolean(),
});

export type WordleEntryContent = z.infer<typeof wordleEntrySchema>;
export const wordleEntryPackSchema = z.array(wordleEntrySchema);
