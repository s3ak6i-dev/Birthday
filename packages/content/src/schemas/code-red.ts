// See masterdoc.md section 5.2.
import { z } from "zod";

const vitalsPointSchema = z.object({
  atSecond: z.number().nonnegative(),
  hr: z.number().positive(),
  bpSystolic: z.number().positive(),
  bpDiastolic: z.number().positive(),
  spo2: z.number().min(0).max(100),
  bloodLossMl: z.number().nonnegative().optional(),
});

const findingSchema = z.object({
  regionId: z.string().min(1),
  text: z.string().min(1),
});

const orderSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
});

export const codeRedScenarioSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    briefing: z.string().min(1),
    vitalsTimeline: z.array(vitalsPointSchema).min(1),
    examineFindings: z.array(findingSchema).min(1),
    orderOptions: z.array(orderSchema).min(1),
    correctSequence: z.array(z.string().min(1)).min(1),
    debriefNotes: z.string().min(1),
    source: z.string().min(1),
    reviewed: z.boolean(),
  })
  .superRefine((scenario, ctx) => {
    // FR-CNT-4 (masterdoc 5.2/4.9): correctSequence must only reference real order ids.
    const validIds = new Set(scenario.orderOptions.map((o) => o.id));
    scenario.correctSequence.forEach((orderId, i) => {
      if (!validIds.has(orderId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["correctSequence", i],
          message: `correctSequence references unknown order id "${orderId}"`,
        });
      }
    });
  });

export type CodeRedScenarioContent = z.infer<typeof codeRedScenarioSchema>;
export const codeRedScenarioPackSchema = z.array(codeRedScenarioSchema);
