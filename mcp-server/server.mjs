// Plan in Motion MCP server: the "Explainer" agent, next to Sherpas' Intake, Paraplanner and Portfolio analyst.
// An advisor (or any MCP client: Claude Desktop, Claude Code, Cursor) can ask:
//   "Make Michael Carter's day-3 episode"  ->  create_episode  ->  a link to send the family
//
// Run over stdio:  node mcp-server/server.mjs
// Claude Code:     claude mcp add plan-in-motion -- node "<repo>/mcp-server/server.mjs"
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// stdout is the MCP channel: send every log line to stderr instead.
console.log = (...a) => console.error(...a);

const { env, EPISODES_DIR } = await import("../pipeline/env.mjs");
const { listLocalCases, loadCase } = await import("../pipeline/sherpas-mcp.mjs");
const { buildFacts } = await import("../pipeline/facts.mjs");
const { generateEpisode } = await import("../pipeline/generate.mjs");
const { EPISODES } = await import("../pipeline/storyboard.mjs");
const { personalize } = await import("../web/lib/personalize.js");

// A link can carry the answers to the four onboarding questions, so the family skips them.
const link = (caseId, person, answers = {}) => {
  const q = new URLSearchParams({ case: caseId, person });
  for (const [k, v] of Object.entries(answers)) if (v) q.set(k, v);
  return `${env.PAGES_BASE_URL}/web/?${q}`;
};

const text = (t) => ({ content: [{ type: "text", text: t }] });

const server = new McpServer({ name: "plan-in-motion", version: "0.1.0" });

server.registerTool(
  "list_families",
  {
    title: "List families",
    description: "Families with a Sherpas plan, the people in each, their score, and the episodes Plan in Motion can make for them.",
    inputSchema: {},
  },
  async () => {
    const rows = [];
    for (const caseId of listLocalCases()) {
      const f = buildFacts(await loadCase(caseId, { useMcp: false }));
      rows.push(`- ${caseId}: ${f.adults.map((a) => `${a.name} (${a.id})`).join(" & ")}, ${f.location}, score ${f.facts.score.value} (${f.band})`);
    }
    const eps = Object.entries(EPISODES).map(([n, e]) => `  ${n}. "${e.title}" (day ${e.day})`).join("\n");
    return text(`Families:\n${rows.join("\n")}\n\nEpisodes:\n${eps}`);
  },
);

server.registerTool(
  "create_episode",
  {
    title: "Create an episode",
    description:
      "Generates a short, interactive episode explaining a family's Sherpas plan to one person, from the plan data (no invented figures). " +
      "Episode 1 = the plan in 60 seconds (day 0), 2 = how to take the first step (day 3), 3 = check-in (day 30). Returns a shareable link.",
    inputSchema: {
      caseId: z.string().describe("Family case id, e.g. michael-carter"),
      person: z.string().optional().describe("First name of the adult watching (lowercase). Omit for every adult."),
      episode: z.number().int().min(1).max(3).default(1),
      useLlm: z.boolean().default(true).describe("Let the LLM personalise the script (figures still come only from the plan)"),
      voice: z.boolean().default(true).describe("Generate the voice-over audio"),
      callThem: z.string().max(24).optional().describe("Name or nickname to use, e.g. Mike. Omit to let them answer in the player."),
      explain: z.enum(["simple", "straight", "nerd"]).optional().describe("simple = no jargon (skips the pillars), straight = default, nerd = adds a scene with every metric"),
      topOfMind: z.string().optional().describe("What worries them most; picks the opening. One of retire, home, college, cushion, card, protection (only the ones this plan supports)"),
      moneyIsAbout: z.enum(["freedom", "security", "family", "experiences"]).optional().describe("Their 'why': changes the colour and the framing"),
    },
  },
  async ({ caseId, person, episode, useLlm, voice, callThem, explain, topOfMind, moneyIsAbout }) => {
    if (!listLocalCases().includes(caseId)) return text(`Unknown family "${caseId}". Use list_families.`);
    const written = await generateEpisode(caseId, person?.toLowerCase(), episode, { llm: useLlm, tts: voice });
    const lines = written.map(({ ep }) => {
      const worries = ep.personalize?.worries ?? [];
      const worry = worries.some((w) => w.id === topOfMind) ? topOfMind : undefined;
      const answers = { name: callThem, mode: explain, worry, anchor: moneyIsAbout };
      const seen = Object.values(answers).some(Boolean) ? personalize(ep, answers) : ep;
      const script = seen.scenes.map((s, i) => `  ${i + 1}. [${s.type}] ${s.voice}`).join("\n");
      return `${ep.personName}, episode ${episode} "${seen.recipeTitle ?? ep.title}":\n${link(caseId, ep.person, answers)}\n${script}` +
        (worries.length ? `\n  topOfMind options for ${ep.personName}: ${worries.map((w) => `${w.id} (${w.label})`).join(", ")}` : "") +
        (topOfMind && !worry ? `\n  "${topOfMind}" is not in this plan, so the default opening is used.` : "") +
        (ep.report.length ? `\n  notes: ${ep.report.join(" | ")}` : "");
    });
    return text(`${lines.join("\n\n")}\n\n(The link works once the repo is pushed to GitHub Pages; locally: npm run serve.)`);
  },
);

server.registerTool(
  "get_episode_script",
  {
    title: "Read an episode's script",
    description: "Returns the on-screen headlines and voice-over of an existing episode, so the advisor can review it before sending.",
    inputSchema: {
      caseId: z.string(),
      person: z.string(),
      episode: z.number().int().min(1).max(3).default(1),
    },
  },
  async ({ caseId, person, episode }) => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    try {
      const ep = JSON.parse(readFileSync(join(EPISODES_DIR, caseId, person.toLowerCase(), `ep${episode}.json`), "utf8"));
      return text(ep.scenes.map((s, i) => `${i + 1}. ${s.headline}\n   voice: ${s.voice}`).join("\n"));
    } catch {
      return text(`No episode yet for ${caseId}/${person} ep${episode}. Use create_episode.`);
    }
  },
);

await server.connect(new StdioServerTransport());
console.error("plan-in-motion MCP server ready (stdio)");
