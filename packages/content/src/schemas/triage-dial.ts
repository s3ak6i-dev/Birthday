// See masterdoc.md section 5.2.
import { z } from "zod";

export const triageSpectrumSchema = z.object({
  id: z.string().min(1),
  leftLabel: z.string().min(1),
  rightLabel: z.string().min(1),
  category: z.string().min(1),
  clueExamples: z.array(z.string().min(1)).default([]),
  source: z.string().min(1),
  reviewed: z.boolean(),
});

export type TriageSpectrumContent = z.infer<typeof triageSpectrumSchema>;
export const triageSpectrumPackSchema = z.array(triageSpectrumSchema);
