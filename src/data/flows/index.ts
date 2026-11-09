import type { Flow, FlowGroup } from '../types';
import { GROUPS } from '../types';
import { authorizationCodePkce } from './authorization-code-pkce';
import { mcpAuthorization } from './mcp-authorization';
import { deviceAuthorization } from './device-authorization';
import { stepUpAuthorization } from './step-up-authorization';
import { ciba } from './ciba';
import { urlElicitation } from './url-elicitation';
import { tokenExchange } from './token-exchange';
import { crossAppAccess } from './cross-app-access';
import { identityChaining } from './identity-chaining';
import { transactionTokens } from './transaction-tokens';
import { clientCredentials } from './client-credentials';
import { workloadIdentityFederation } from './workload-identity-federation';
import { spiffeWorkloadIdentity } from './spiffe-workload-identity';
import { wimseWorkloadTokens } from './wimse-workload-tokens';
import { agentToAgent } from './agent-to-agent';
import { webBotAuth } from './web-bot-auth';
import { agentPayments } from './agent-payments';
import { dpop } from './dpop';
import { credentialBroker } from './credential-broker';

/** Display order: grouped, and within each group from most to least established. */
export const flows: Flow[] = [
  authorizationCodePkce,
  mcpAuthorization,
  deviceAuthorization,
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

export function flow(slug: string): Flow {
  const f = bySlug.get(slug);
  if (!f) throw new Error(`Unknown flow "${slug}"`);
  return f;
}

/** Unknown slugs fail the build, so links between flows never rot. */
export function related(f: Flow): Flow[] {
  return f.related.map(flow);
}

export function byGroup(): { id: FlowGroup; title: string; blurb: string; flows: Flow[] }[] {
  return GROUPS.map((g) => ({ ...g, flows: flows.filter((f) => f.group === g.id) }));
}
