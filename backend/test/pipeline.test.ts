// Unit tests on the deterministic pieces only (SPEC §6): brief, facts.ts, the figure check,
// decision style -> call to action, and the zod schemas.
import { describe, expect, it } from "vitest";
import { listCaseIds, loadCase } from "../src/cases.js";
import { buildPlan, constName, factsTs } from "../src/facts.js";
import { buildBrief, briefSize } from "../src/brief.js";
import { contextFor, ctaFor, ScriptSchema, writeFallbackScript } from "../src/script.js";
import { decisionFromPersona, JobRequestSchema, surveyFor } from "../src/survey.js";
import { checkFigures, checkScript } from "../src/validate.js";

const daniel = () => buildPlan(loadCase("daniel-emily-johnson"));

describe("facts", () => {
  it("reads the score and the moves from the plan", () => {
    const plan = daniel();
    expect(plan.facts.score.value).toBe(52);
    expect(plan.moves[0]).toMatchObject({ title: "Raise mortality coverage", before: 52, after: 57 });
  });

  it("writes facts.ts with named constants", () => {
    expect(constName("score")).toBe("SCORE_NOW");
    expect(constName("retirement.savingsRunOutAge")).toBe("RETIREMENT_SAVINGS_RUN_OUT_AGE");
    const ts = factsTs(daniel().facts);
    expect(ts).toContain("export const SCORE_NOW = 52;");
    expect(ts).not.toMatch(/export const \w*[a-z]/); // every constant is UPPER_CASE
  });
});

describe("brief", () => {
  it("stays around 8 KB and carries the survey", () => {
    const plan = daniel();
    const brief = buildBrief(contextFor(plan, "daniel", { nickname: "Dan", explain: "nerd", decision: "research_first" }));
    expect(briefSize(brief)).toBeLessThan(10 * 1024);
    expect(brief).toContain("Call them: Dan");
    expect(brief).toContain("Explain it: nerd");
  });
});

describe("figure check", () => {
  const facts = daniel().facts;
  it("accepts figures from the plan in any of their forms", () => {
    expect(checkFigures("Your score is 52 and it can reach 57.", facts)).toEqual([]);
    expect(checkFigures(`You have ${facts["cash.accessibleCash"].display} today.`, facts)).toEqual([]);
  });
  it("rejects a number the plan doesn't have", () => {
    expect(checkFigures("You need $123,457 more.", facts)).toEqual(["$123,457"]);
  });
  it("ignores small numbers (two digits or fewer)", () => {
    expect(checkFigures("Two steps, 10 minutes, 99 problems.", facts)).toEqual([]);
  });
});

describe("decision style -> call to action", () => {
  it("maps persona D5 when the question is skipped", () => {
    expect(decisionFromPersona("COLLABORATOR")).toBe("ask_trusted");
    expect(decisionFromPersona("VALIDATOR")).toBe("research_first");
    expect(decisionFromPersona(undefined)).toBe("just_do_it");
  });
  it("the survey answer wins over D5", () => {
    const ctx = contextFor(daniel(), "emily", { decision: "wait" });
    expect(ctx.decision).toBe("wait");
  });
  it("ask_trusted names the partner", () => {
    const ctx = contextFor(daniel(), "emily", { decision: "ask_trusted" });
    expect(ctaFor(ctx).text).toContain("Send this to Daniel");
  });
});

describe("schemas and the plan-only script", () => {
  it("rejects a bad survey", () => {
    expect(JobRequestSchema.safeParse({ caseId: "x", member: "y", survey: { explain: "loud" } }).success).toBe(false);
  });

  for (const caseId of listCaseIds()) {
    const plan = buildPlan(loadCase(caseId));
    for (const a of plan.adults) {
      for (const explain of ["simple", "straight", "nerd"] as const) {
        it(`${caseId}/${a.id}/${explain}: valid, five parts, no invented figures`, () => {
          const survey = surveyFor(plan, a.id);
          const ctx = contextFor(plan, a.id, { explain, worry: survey.worries[0]?.id });
          const script = writeFallbackScript(ctx);
          expect(ScriptSchema.safeParse(script).success).toBe(true);
          const checks = checkScript(script, plan.facts, script.scenes.map(() => 5));
          expect(checks.find((c) => c.name === "figures")).toMatchObject({ ok: true });
          expect(checks.find((c) => c.name === "facts used")).toMatchObject({ ok: true });
        });
      }
    }
  }
});
