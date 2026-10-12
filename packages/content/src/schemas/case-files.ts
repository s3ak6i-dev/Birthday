// See masterdoc.md section 5.2 and FR-79 (every evidence card must map to
// exactly one correct grid cell per differential row).
import { z } from "zod";

const evidenceCardContentSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
});

const hintSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  revealsEvidenceId: z.string().min(1),
  revealsDifferentialIndex: z.number().int().min(0).max(4),
});

export const caseFileSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    patientSummary: z.string().min(1),
    differentials: z.tuple([
      z.string().min(1),
      z.string().min(1),
      z.string().min(1),
      z.string().min(1),
      z.string().min(1),
    ]),
    evidenceCards: z.array(evidenceCardContentSchema).min(1),
    // solutionGrid[differentialIndex][evidenceIndex] = true means that evidence
    // card confirms that differential.
    solutionGrid: z.array(z.array(z.boolean())).length(5),
    hints: z.array(hintSchema),
    introSceneId: z.string().min(1),
    outroSceneId: z.string().min(1),
    source: z.string().min(1),
    reviewed: z.boolean(),
  })
  .superRefine((caseFile, ctx) => {
    const n = caseFile.evidenceCards.length;

    caseFile.solutionGrid.forEach((row, di) => {
      if (row.length !== n) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["solutionGrid", di],
          message: `row ${di} has ${row.length} cells, expected one per evidence card (${n})`,
        });
      }
    });

    // FR-79: every evidence card maps to exactly one correct differential.
    for (let ei = 0; ei < n; ei++) {
      const confirmingRows = caseFile.solutionGrid.filter((row) => row[ei] === true).length;
      if (confirmingRows !== 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["solutionGrid", "*", ei],
          message: `evidence card "${caseFile.evidenceCards[ei]?.id}" confirms ${confirmingRows} differentials, expected exactly 1`,
        });
      }
    }
  });

export type CaseFileContent = z.infer<typeof caseFileSchema>;
export const caseFilePackSchema = z.array(caseFileSchema);
