// Reads a family's plan. First choice: the Sherpas MCP (list_cases / get_case) with MCP_TOKEN.
// Fallback: the same JSON in cases/, so the pipeline also works offline or after tokens expire.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { CASES_DIR, env, hasKey } from "./env.mjs";

const PARTS = ["financial-health", "investment-analysis", "persona"];

async function withMcp(fn) {
  const client = new Client({ name: "plan-in-motion", version: "0.1.0" });
  const transport = new StreamableHTTPClientTransport(new URL(env.MCP_URL), {
    requestInit: { headers: { Authorization: `Bearer ${env.MCP_TOKEN}` } },
  });
  await client.connect(transport);
  try {
    return await fn(client);
  } finally {
    await client.close().catch(() => {});
  }
}

function toolValue(result) {
  const text = result?.content?.[0]?.text ?? "";
  try {
    const parsed = JSON.parse(text);
    return parsed?.value ?? parsed;
  } catch {
    return text;
  }
}

function readLocal(caseId) {
  const dir = join(CASES_DIR, caseId);
  if (!existsSync(join(dir, "financial-health.json"))) throw new Error(`Unknown case: ${caseId}`);
  const json = (f) => JSON.parse(readFileSync(join(dir, f), "utf8"));
  return {
    caseId,
    source: "local",
    fh: json("financial-health.json"),
    ia: existsSync(join(dir, "investment-analysis.json")) ? json("investment-analysis.json") : null,
    personaMd: existsSync(join(dir, "persona.md")) ? readFileSync(join(dir, "persona.md"), "utf8") : "",
  };
}

export function listLocalCases() {
  return readdirSync(CASES_DIR)
    .filter((id) => existsSync(join(CASES_DIR, id, "financial-health.json")))
    .sort();
}

/** Returns { caseId, source: "mcp" | "local", fh, ia, personaMd }. */
export async function loadCase(caseId, { useMcp = true } = {}) {
  if (useMcp && hasKey(env.MCP_TOKEN)) {
    try {
      const parts = await withMcp(async (mcp) => {
        const out = {};
        for (const part of PARTS) {
          out[part] = toolValue(await mcp.callTool({ name: "get_case", arguments: { caseId, part } }));
        }
        return out;
      });
      const fh = typeof parts["financial-health"] === "string" ? JSON.parse(parts["financial-health"]) : parts["financial-health"];
      const ia = typeof parts["investment-analysis"] === "string" ? JSON.parse(parts["investment-analysis"]) : parts["investment-analysis"];
      const personaMd = typeof parts.persona === "string" ? parts.persona : JSON.stringify(parts.persona);
      if (fh?.score) return { caseId, source: "mcp", fh, ia, personaMd };
      console.warn(`[mcp] ${caseId}: unexpected shape, using local files`);
    } catch (err) {
      console.warn(`[mcp] ${caseId}: ${err.message}. Using local files.`);
    }
  }
  return readLocal(caseId);
}

/** Splits persona.md into sections keyed by "D0".."D6" or by heading text ("Tensions", ...). */
export function parsePersona(md) {
  const sections = {};
  const chunks = md.split(/^## /m).slice(1);
  for (const chunk of chunks) {
    const [heading, ...rest] = chunk.split("\n");
    const body = rest.join("\n").trim();
    const code = heading.match(/^(D\d)\s*:/)?.[1];
    sections[code ?? heading.trim()] = body;
  }
  return sections;
}
