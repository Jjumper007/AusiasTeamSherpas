// Reads a family's plan from cases/<caseId>/ (financial-health.json, investment-analysis.json, persona.md).
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { CASES_DIR } from "./env.js";

// The case JSON is large and loosely shaped; we read the fields we need and type those at the edges.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Json = any;

export interface CaseFiles {
  caseId: string;
  fh: Json;
  ia: Json | null;
  personaMd: string;
}

export interface Persona {
  sections: Record<string, string>;
  /** The ```classification``` block: D0..D6 and alerts. */
  classification: Record<string, string>;
}

export function listCaseIds(): string[] {
  return readdirSync(CASES_DIR)
    .filter((id) => existsSync(join(CASES_DIR, id, "financial-health.json")))
    .sort();
}

export function loadCase(caseId: string): CaseFiles {
  if (!/^[a-z0-9-]+$/.test(caseId)) throw new Error(`Bad case id: ${caseId}`);
  const dir = join(CASES_DIR, caseId);
  if (!existsSync(join(dir, "financial-health.json"))) throw new Error(`Unknown case: ${caseId}`);
  const json = (f: string) => JSON.parse(readFileSync(join(dir, f), "utf8"));
  return {
    caseId,
    fh: json("financial-health.json"),
    ia: existsSync(join(dir, "investment-analysis.json")) ? json("investment-analysis.json") : null,
    personaMd: existsSync(join(dir, "persona.md")) ? readFileSync(join(dir, "persona.md"), "utf8") : "",
  };
}

/** Splits persona.md into sections keyed by "D0".."D6" or by heading text, plus the classification block. */
export function parsePersona(md: string): Persona {
  const sections: Record<string, string> = {};
  for (const chunk of md.split(/^## /m).slice(1)) {
    const [heading, ...rest] = chunk.split("\n");
    const code = heading.match(/^(D\d)\s*:/)?.[1];
    sections[code ?? heading.trim()] = rest.join("\n").trim();
  }
  const classification: Record<string, string> = {};
  const block = md.match(/```classification\r?\n([\s\S]*?)```/)?.[1] ?? "";
  for (const line of block.split(/\r?\n/)) {
    const m = line.match(/^(D\d):\s*(.+)$/);
    if (m) classification[m[1]] = m[2].trim();
  }
  return { sections, classification };
}
