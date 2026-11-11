import { lessons } from "../learn/lessons";
import type { Rating } from "../rating";
import { levelOf, rate } from "../rating";
import { std } from "../standards";
import type { Flow, FlowGroup } from "../types";
import { GROUPS, MATURITY_LABEL } from "../types";
import { aauth } from "./aauth";
import { agentPayments } from "./agent-payments";
import { agentToAgent } from "./agent-to-agent";
import { authorizationCodePkce } from "./authorization-code-pkce";
import { ciba } from "./ciba";
import { clientCredentials } from "./client-credentials";
import { credentialBroker } from "./credential-broker";
import { crossAppAccess } from "./cross-app-access";
import { deviceAuthorization } from "./device-authorization";
import { dpop } from "./dpop";
import { identityChaining } from "./identity-chaining";
import { mcpAuthorization } from "./mcp-authorization";
import { spiffeWorkloadIdentity } from "./spiffe-workload-identity";
import { stepUpAuthorization } from "./step-up-authorization";
import { tokenExchange } from "./token-exchange";
import { transactionTokens } from "./transaction-tokens";
import { urlElicitation } from "./url-elicitation";
import { webBotAuth } from "./web-bot-auth";
import { wimseWorkloadTokens } from "./wimse-workload-tokens";
import { workloadIdentityFederation } from "./workload-identity-federation";

/** Display order: grouped, and within each group from most to least established. */
export const flows: Flow[] = [
  authorizationCodePkce,
  deviceAuthorization,
  mcpAuthorization,
  stepUpAuthorization,
  ciba,
  urlElicitation,
  aauth,
  tokenExchange,
  crossAppAccess,
  identityChaining,
  transactionTokens,
  clientCredentials,
  workloadIdentityFederation,
  spiffeWorkloadIdentity,
  wimseWorkloadTokens,
  agentToAgent,
  webBotAuth,
  agentPayments,
  dpop,
  credentialBroker,
];

const bySlug = new Map(flows.map((f) => [f.slug, f]));

// A flow's overview has to agree with its steps: phases that start at step 1 and
// run in order, parts that name real participants, and pointers that lead somewhere.
for (const f of flows) {
  const fail = (what: string) => {
    throw new Error(`[${f.slug}] ${what}`);
  };
  // every flow in the catalog has one: a page without it starts at the protocol
  if (!f.phases) fail("has no phases: say what happens in a few plain parts");
  if (!f.parts) fail("has no parts: say what each party has to do");
  if (!f.lesson) fail("names no lesson that teaches its idea first");
  if (f.phases) {
    if (f.phases.length < 2) fail("needs at least two phases");
    if (f.phases[0].from !== 1) fail("its first phase must start at step 1");
    f.phases.forEach((p, i, all) => {
      if (!Number.isInteger(p.from) || p.from > f.steps.length)
        fail(
          `phase "${p.title}" starts at step ${p.from}, which does not exist`,
        );
      if (i > 0 && p.from <= all[i - 1].from)
        fail(`phase "${p.title}" does not start after the one before it`);
    });
  }
  for (const id of Object.keys(f.parts ?? {})) {
    if (!f.participants.some((p) => p.id === id))
      fail(`has a part for "${id}", which is not a participant`);
  }
  if (f.lesson && !lessons.some((l) => l.slug === f.lesson))
    fail(`points to lesson "${f.lesson}", which does not exist`);
  if (f.like && !bySlug.has(f.like.flow))
    fail(`is likened to "${f.like.flow}", which does not exist`);
}

// A flow that classifies its references classifies all of them, bases itself on required ones,
// and carries the rating those required references give it.
const ratings = new Map<string, Rating>();
for (const f of flows) {
  const roles = f.roles;
  if (!roles) {
    if (f.basis) throw new Error(`[${f.slug}] has a basis but no roles`);
    continue;
  }
  const listed = new Set(f.standards);
  const missing = f.standards.filter((id) => !(id in roles));
  const extra = Object.keys(roles).filter((id) => !listed.has(id));
  if (missing.length || extra.length) {
    throw new Error(
      `[${f.slug}] roles do not match standards: missing ${missing.join(", ") || "none"}; unknown ${extra.join(", ") || "none"}`,
    );
  }
  for (const id of f.basis ?? [f.standards[0]]) {
    if (roles[id] !== "required")
      throw new Error(`[${f.slug}] basis "${id}" must be a required reference`);
  }
  let rating: Rating;
  try {
    rating = rate(
      f.standards.map((id) => ({
        id,
        role: roles[id],
        level: levelOf(std(id)),
      })),
    );
  } catch (e) {
    throw new Error(`[${f.slug}] cannot be rated: ${(e as Error).message}`);
  }
  if (rating.level !== f.maturity) {
    throw new Error(
      `[${f.slug}] is declared ${f.maturity}, but its least mature required reference makes it ${rating.level}`,
    );
  }
  ratings.set(f.slug, rating);
}

/** The rating worked out from a flow's classified references. Undefined for a flow not yet reviewed that way. */
export function rating(f: Flow): Rating | undefined {
  return ratings.get(f.slug);
}

/** The rating as shown to readers. Provisional while an unsettled reference could lower it. */
export function maturityLabel(f: Flow): string {
  return (
    MATURITY_LABEL[f.maturity] +
    (ratings.get(f.slug)?.provisional ? " (provisional)" : "")
  );
}

export function flow(slug: string): Flow {
  const f = bySlug.get(slug);
  if (!f) throw new Error(`Unknown flow "${slug}"`);
  return f;
}

/** The steps a phase covers, as numbers counting from 1: [first, last]. */
export function phaseSpan(f: Flow, i: number): [number, number] {
  const phases = f.phases ?? [];
  return [phases[i].from, (phases[i + 1]?.from ?? f.steps.length + 1) - 1];
}

/** The numbers of the steps a participant sends or receives. */
export function stepsOf(f: Flow, participant: string): number[] {
  return f.steps
    .map((s, i) => (s.from === participant || s.to === participant ? i + 1 : 0))
    .filter(Boolean);
}

/** Unknown slugs fail the build, so links between flows never rot. */
export function related(f: Flow): Flow[] {
  return f.related.map(flow);
}

export function byGroup(): {
  id: FlowGroup;
  title: string;
  blurb: string;
  flows: Flow[];
}[] {
  return GROUPS.map((g) => ({
    ...g,
    flows: flows.filter((f) => f.group === g.id),
  }));
}
