import type { Rating } from "../rating";
import { levelOf, rate } from "../rating";
import { std } from "../standards";
import type { Flow, FlowGroup } from "../types";
import { GROUPS, MATURITY_LABEL } from "../types";
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

// A flow that classifies its references classifies all of them, bases itself on required ones,
// and carries the rating those required references give it.
const ratings = new Map<string, Rating>();
for (const f of flows) {
  if (!f.roles) {
    if (f.basis) throw new Error(`[${f.slug}] has a basis but no roles`);
    continue;
  }
  const listed = new Set(f.standards);
  const missing = f.standards.filter((id) => !(id in f.roles!));
  const extra = Object.keys(f.roles).filter((id) => !listed.has(id));
  if (missing.length || extra.length) {
    throw new Error(
      `[${f.slug}] roles do not match standards: missing ${missing.join(", ") || "none"}; unknown ${extra.join(", ") || "none"}`,
    );
  }
  for (const id of f.basis ?? [f.standards[0]]) {
    if (f.roles[id] !== "required")
      throw new Error(`[${f.slug}] basis "${id}" must be a required reference`);
  }
  let rating: Rating;
  try {
    rating = rate(
      f.standards.map((id) => ({
        id,
        role: f.roles![id],
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
