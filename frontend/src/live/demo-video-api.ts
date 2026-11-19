// The member's Demo video, from the live server's Demo folder routes (backend/src/live/live-demo.ts): what the
// safety net plays when the Live run is too slow or fails.
import type { JobResult } from "../types";

const NOT_FOUND = 404;

/** The member's Demo video result (its `videoUrl` plays from the live server), or null when they have none. */
export async function getDemoVideo(caseId: string, member: string): Promise<JobResult | null> {
  const res = await fetch(`/api/live/demo/${encodeURIComponent(caseId)}/${encodeURIComponent(member)}`);
  if (res.status === NOT_FOUND) return null;
  if (!res.ok) throw new Error(`The Demo video lookup answered ${res.status}`);
  return (await res.json()) as JobResult;
}
