// See masterdoc.md section 5.2.
import { z } from "zod";

export const guessCardSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  specialty: z.enum(["General", "OB-GYN", "Pediatrics", "Cardiology", "Pharmacology", "Anatomy"]),
  tags: z.array(z.string().min(1)).min(1),
  blurb: z.string().min(1),
  difficultyTier: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  source: z.string().min(1),
  reviewed: z.boolean(),
});

export type GuessCardContent = z.infer<typeof guessCardSchema>;
export const guessCardPackSchema = z.array(guessCardSchema);
