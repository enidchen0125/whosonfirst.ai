/** Shared types for the site's structured content. */

/** The five kinds of principal that appear in every diagram. */
export type Role = 'human' | 'agent' | 'authz' | 'resource' | 'infra';

export const ROLE_LABEL: Record<Role, string> = {
  human: 'Human',
  agent: 'Agent / client',
  authz: 'Authorization',
  resource: 'Resource',
  infra: 'Infrastructure',
};

export interface Participant {
  id: string;
  label: string;
  /** Second line under the label, e.g. "MCP client". */
  sub?: string;
  role: Role;
}

/**
 * How a message travels.
 * - back: direct call between two systems
 * - front: through the human's browser or device (redirects, consent screens)
 * - resp: a response to an earlier call
 * - oob: out of band (push notification, email, chat message)
 * - self: something a participant does locally
 */
export type StepKind = 'back' | 'front' | 'resp' | 'oob' | 'self';

export interface Step {
  from: string;
  /** Omit (or repeat `from`) for a local action. */
  to?: string;
  kind: StepKind;
  /** Short text drawn on the arrow. Keep under ~30 characters. */
  label: string;
  /** Heading for the detail panel. */
  title: string;
  /** Explanation. Inline formatting: `code`, **bold**, [link](url). Blank line = new paragraph. */
  body: string;
  code?: { lang: string; text: string };
  /** Credentials a participant acquires at this step: [participantId, artifact]. */
  gain?: [string, string][];
  /** Credentials a participant uses up or discards at this step. */
  lose?: [string, string][];
}

export type FlowGroup =
  | 'human-present'
  | 'human-in-the-loop'
  | 'delegation'
  | 'autonomous'
  | 'agent-to-agent'
  | 'cross-cutting';

export type HumanPresence = 'present' | 'reachable' | 'absent' | 'any';

export type Maturity = 'stable' | 'emerging' | 'experimental';

export interface Flow {
  slug: string;
  title: string;
  /** Name used in cards and nav. */
  short: string;
  group: FlowGroup;
  human: HumanPresence;
  maturity: Maturity;
  /** One sentence for cards. */
  tagline: string;
  /** Opening paragraph(s) on the flow page. */
  summary: string;
  fits: string[];
  watchOut: string[];
  participants: Participant[];
  steps: Step[];
  /** ids from data/standards.ts */
  standards: string[];
  related: string[];
  /** Optional closing notes rendered after the diagram, md-lite blocks. */
  notes?: { title: string; body: string }[];
}

export const GROUPS: { id: FlowGroup; title: string; blurb: string }[] = [
  {
    id: 'human-present',
    title: 'Human present',
    blurb: 'Someone is at the keyboard and can sign in and consent right now.',
  },
  {
    id: 'human-in-the-loop',
    title: 'Human in the loop',
    blurb: 'The agent works on its own, but pauses for a person to approve specific actions.',
  },
  {
    id: 'delegation',
    title: 'Delegation chains',
    blurb: 'Carrying “who asked for this” across agents, tools and trust domains.',
  },
  {
    id: 'autonomous',
    title: 'No human',
    blurb: 'The agent acts as itself: workload identity, not user identity.',
  },
  {
    id: 'agent-to-agent',
    title: 'Agent to agent, agent to web',
    blurb: 'Agents authenticating to each other, to websites and to merchants.',
  },
  {
    id: 'cross-cutting',
    title: 'Cross-cutting',
    blurb: 'Techniques that harden any of the above.',
  },
];

export const HUMAN_LABEL: Record<HumanPresence, string> = {
  present: 'Human present',
  reachable: 'Human reachable',
  absent: 'No human',
  any: 'With or without a human',
};

export const HUMAN_TONE: Record<HumanPresence, string> = {
  present: 'red',
  reachable: 'amber',
  absent: 'blue',
  any: '',
};

export const MATURITY_LABEL: Record<Maturity, string> = {
  stable: 'Stable standards',
  emerging: 'Emerging',
  experimental: 'Experimental',
};

/* ---------- standards tracker ---------- */

export type StdStatus =
  | 'rfc' // published IETF RFC
  | 'final' // final specification from another body
  | 'wg-draft' // adopted working group draft / implementers draft
  | 'draft' // individual submission or early proposal
  | 'project' // open source project or de facto platform API
  | 'guidance'; // report, framework or best-practice document

export const STATUS_LABEL: Record<StdStatus, string> = {
  rfc: 'RFC',
  final: 'Final spec',
  'wg-draft': 'WG draft',
  draft: 'Individual draft',
  project: 'Project / platform',
  guidance: 'Guidance',
};

export const STATUS_TONE: Record<StdStatus, string> = {
  rfc: 'green',
  final: 'green',
  'wg-draft': 'blue',
  draft: 'amber',
  project: 'violet',
  guidance: '',
};

export type StdTopic =
  | 'core'
  | 'discovery'
  | 'registration'
  | 'delegation'
  | 'human-in-the-loop'
  | 'workload'
  | 'proof-of-possession'
  | 'authorization'
  | 'agent-protocol'
  | 'commerce'
  | 'credentials'
  | 'kubernetes'
  | 'signals'
  | 'guidance';

export const TOPIC_LABEL: Record<StdTopic, string> = {
  core: 'Core OAuth',
  discovery: 'Discovery',
  registration: 'Client identity',
  delegation: 'Delegation',
  'human-in-the-loop': 'Human in the loop',
  workload: 'Workload identity',
  'proof-of-possession': 'Proof of possession',
  authorization: 'Fine-grained authz',
  'agent-protocol': 'Agent protocols',
  commerce: 'Commerce',
  credentials: 'Verifiable credentials',
  kubernetes: 'Kubernetes',
  signals: 'Signals & revocation',
  guidance: 'Guidance',
};

export interface Standard {
  id: string;
  /** Short display name, e.g. "Token Exchange". */
  name: string;
  /** Identifier, e.g. "RFC 8693" or "draft-ietf-oauth-transaction-tokens". */
  ref: string;
  body: string;
  status: StdStatus;
  /** Free-text status detail: revision, date, where it is in the process. */
  detail?: string;
  topics: StdTopic[];
  /** What it defines. */
  summary: string;
  /** Why it matters for agents. */
  agents: string;
  url: string;
}
