// Shapes returned by the API (backend/src). Kept by hand: the API is small.

export type Explain = "simple" | "straight" | "nerd";
export type Decision = "just_do_it" | "research_first" | "ask_trusted" | "wait";

export interface CaseSummary {
  caseId: string;
  family: string;
  score: number;
  band: string;
  people: { id: string; name: string }[];
}

export interface SurveyInfo {
  caseId: string;
  member: string;
  name: string;
  partner: string | null;
  worries: { id: string; label: string }[];
  defaultDecision: Decision;
}

/** Every answer is optional: Skip leaves it out and the backend uses the default. */
export interface Answers {
  nickname?: string;
  explain?: Explain;
  worry?: string;
  /** "Something else", in their own words. Not sent: the video covers only what the plan covers. */
  worryText?: string;
  decision?: Decision;
}

export interface Check {
  name: string;
  ok: boolean;
  detail?: string;
}

export interface JobResult {
  runId: string;
  caseId: string;
  member: string;
  name: string;
  partner: string | null;
  explain: Explain;
  decision: Decision;
  source: "claude" | "fallback";
  videoUrl: string | null;
  scenes: { part: string; narration: string; visualIdea: string; start: number; seconds: number; audioUrl: string | null }[];
  chapters: { title: string; body: string; start: number }[];
  duration: number;
  cta: { type: Decision; text: string };
  firstStep: { title: string; action: string | null; effort: string | null; before: number; after: number; lift: number };
  detail: { key: string; label: string; exact: string }[];
  checks: Check[];
  notes: string[];
}

export interface Progress {
  p: number;
  step: string;
  left: number | null;
}
