// Build-time content validation. See masterdoc.md section 4.9 and FR-CNT-4:
// "Build fails if content fails schema or solvability checks."
//
// Run with: npm run validate-content -w @ward-games/content
//
// TODO (M2+, as each game's content comes online):
//  - Wordle: no repeated word within a rolling 365-day window once a daily
//    schedule/assignment function exists (FR-59)
//  - Wordle: every word must be a valid dictionary word
//  - Case Files: already cross-referenced inside caseFileSchema (FR-79)
//  - Code Red: already cross-referenced inside codeRedScenarioSchema

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { z } from "zod";
import {
  guessCardPackSchema,
  triageSpectrumPackSchema,
  wordleEntryPackSchema,
  codeRedScenarioPackSchema,
  caseFilePackSchema,
} from "../src/schemas";

const __dirname = dirname(fileURLToPath(import.meta.url));
const contentDir = join(__dirname, "..", "src");

interface PackToCheck {
  file: string;
  schema: z.ZodTypeAny;
}

const packs: PackToCheck[] = [
  { file: "guess-the-diagnosis/general.json", schema: guessCardPackSchema },
  { file: "guess-the-diagnosis/ob-gyn.json", schema: guessCardPackSchema },
  { file: "triage-dial/general.json", schema: triageSpectrumPackSchema },
  { file: "wordle/daily-general.json", schema: wordleEntryPackSchema },
  { file: "wordle/daily-ob-gyn.json", schema: wordleEntryPackSchema },
  { file: "wordle/duel-inside-jokes.json", schema: wordleEntryPackSchema },
  { file: "code-red/scenarios.json", schema: codeRedScenarioPackSchema },
  { file: "case-files/cases.json", schema: caseFilePackSchema },
];

let failed = false;

for (const pack of packs) {
  const path = join(contentDir, pack.file);
  const raw = JSON.parse(readFileSync(path, "utf-8"));
  const result = pack.schema.safeParse(raw);

  if (!result.success) {
    failed = true;
    console.error(`\n✗ ${pack.file}`);
    for (const issue of result.error.issues) {
      console.error(`  - ${issue.path.join(".") || "(root)"}: ${issue.message}`);
    }
    continue;
  }

  // ID uniqueness within the pack (section 4.9).
  const items = result.data as Array<{ id: string }>;
  const ids = new Set<string>();
  for (const item of items) {
    if (ids.has(item.id)) {
      failed = true;
      console.error(`\n✗ ${pack.file}: duplicate id "${item.id}"`);
    }
    ids.add(item.id);
  }

  console.log(`✓ ${pack.file} (${items.length} item${items.length === 1 ? "" : "s"})`);
}

if (failed) {
  console.error("\nContent validation failed.");
  process.exit(1);
}

console.log("\nAll content packs valid.");
