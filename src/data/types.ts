/** Shared types for the site's structured content. */

/** The five kinds of principal that appear in every diagram. */
export type Role = "human" | "agent" | "authz" | "resource" | "infra";

export const ROLE_LABEL: Record<Role, string> = {
  human: "Human",
  agent: "Agent / client",
  authz: "Authorization",
  resource: "Resource",
  infra: "Infrastructure",
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
export type StepKind = "back" | "front" | "resp" | "oob" | "self";

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
  | "human-present"
  | "human-in-the-loop"
  | "delegation"
  | "autonomous"
  | "agent-to-agent"
  | "cross-cutting";

export type HumanPresence = "present" | "reachable" | "absent" | "any";

export type Maturity = "stable" | "emerging" | "experimental";

/**
 * What a flow page needs from a reference it lists.
 * - required: the page names it as what the flow implements, a numbered step shows
 *   something it defines, the page teaches a security or validation rule it sets, or
 *   the page says a conforming implementation must support it, drawn or not
 * - optional: offered as a variant or an addition; no step depends on it and nothing
 *   on the page requires it
 * - background: named for context only
 * - unresolved: its role could not be settled from the sources available
 * A flow's maturity is that of its least mature required reference. An unresolved
 * reference is not counted, and is not assumed to be optional: if requiring it would
 * lower the rating, the rating is provisional. See data/rating.ts and /about/.
 */
export type RefRole = "required" | "optional" | "background" | "unresolved";

export const REF_ROLE_TITLE: Record<RefRole, string> = {
  required: "Required",
  optional: "Optional extensions",
  background: "Background",
  unresolved: "Role not settled",
};

export const REF_ROLE_BLURB: Record<RefRole, string> = {
  required:
    "What the flow implements, shows in a step, or must support. These decide its maturity rating.",
  optional:
    "Variants and additions the page mentions. No step depends on them, and the flow does not require them.",
  background:
    "Related reading. Not what the flow implements, and not used in a step.",
  unresolved:
    "Listed, but the sources read so far do not settle what the flow needs from them.",
};

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
  /**
   * ids from data/standards.ts. The first is the page's stated basis unless `basis` says
   * otherwise or `noBasis` says there is none.
   */
  standards: string[];
  /**
   * The role of each listed standard, for flows reviewed reference by reference.
   * When present it must name every id in `standards` and no others.
   */
  roles?: Record<string, RefRole>;
  /** The specifications the page says the flow implements, when there is more than one. Each must be required. */
  basis?: string[];
  /**
   * For a pattern that no specification defines: what the page says where its basis would be,
   * e.g. "No standard defines this pattern". The page then names no primary specification.
   * Not for a flow with `roles` or a `basis`: those have required references.
   */
  noBasis?: string;
  related: string[];
  /**
   * The steps in a few plain parts: what a reader sees before the diagram, and the
   * bands the diagram is divided into. Each says which step it starts at, counting
   * from 1. The first starts at step 1, and together they cover every step in order.
   */
  phases?: Phase[];
  /**
   * What each party has to do in this flow, by participant id: what it builds,
   * configures or decides, in a sentence or two of plain words. md-lite. It is what
   * lets a reader find their own part in a protocol that mostly describes other
   * people's. A participant with nothing to do beyond being there can be left out.
   */
  parts?: Record<string, string>;
  /** The lesson under /learn/ that teaches this flow's idea in plain words first. */
  lesson?: string;
  /**
   * For a flow that is another flow with a difference: the flow it resembles, and
   * what is different, completing "the same, except that …". md-lite.
   */
  like?: { flow: string; except: string };
  /** Optional closing notes rendered after the diagram, md-lite blocks. */
  notes?: { title: string; body: string }[];
  /**
   * For a flow that covers more than its diagram draws. `steps` says, above the diagram, which
   * arrangement is drawn and what else exists. `references` says, beside the required references,
   * that they and the rating belong to that arrangement and not to every implementation.
   */
  illustrated?: { steps: string; references: string };
  /**
   * How the flow appears in different settings. For a flow that is a pattern more than a
   * protocol, where the steps have to stay general. Shown as a table where there is room, and as
   * one block of labeled fields per row where there is not; both come from this data, so nothing
   * here may refer to rows or columns. Values are md-lite.
   */
  comparison?: {
    title: string;
    intro?: string;
    /** What each row is: the heading of the table's first column. */
    rowHeading: string;
    /** One per value in a row: its column heading in the table, and its short label in a block. */
    fields: { heading: string; label: string }[];
    rows: { name: string; values: string[] }[];
    /** Qualifications that apply to the whole comparison. */
    after?: string;
  };
  /** One setting worked through concretely, kept apart from the general steps. */
  example?: Omit<FlowSection, "id">;
  /**
   * Further sections after the worked example, in the same form: what to do with the flow once
   * its steps are understood, or documented implementations of it.
   */
  sections?: FlowSection[];
}

/** One of the few parts a flow's steps fall into. */
export interface Phase {
  /** A plain sentence fragment: what happens, and who does it. */
  title: string;
  /** The number of the step it starts at, counting from 1. */
  from: number;
}

/**
 * How a participant's part is introduced to the reader who has that job.
 * `{label}` is the participant's name in the diagram.
 */
export const ROLE_PART: Record<Role, string> = {
  human: "{label}",
  agent: "If you build the {label}",
  authz: "{label}",
  resource: "If you run the {label}",
  infra: "{label}",
};

/** A section of a flow page made of parts in reading order, between the steps and the cautions. */
export interface FlowSection {
  /** The heading's anchor. */
  id: string;
  title: string;
  /** md-lite blocks. */
  intro: string;
  parts: {
    title: string;
    /** Short labels under the heading: whose product it is, its release stage, what kind of example. */
    tags?: { text: string; tone?: string }[];
    /** md-lite blocks. */
    body: string;
    code?: { lang: string; text: string };
    /** The documents the part is drawn from, linked by title. */
    sources?: { label: string; href: string }[];
  }[];
  /** md-lite blocks, after the parts. */
  after?: string;
}

export const GROUPS: { id: FlowGroup; title: string; blurb: string }[] = [
  {
    id: "human-present",
    title: "Human present",
    blurb: "Someone is at the keyboard and can sign in and consent right now.",
  },
  {
    id: "human-in-the-loop",
    title: "Human in the loop",
    blurb:
      "The agent works on its own, but pauses for a person to approve specific actions.",
  },
  {
    id: "delegation",
    title: "Delegation chains",
    blurb:
      "Carrying “who asked for this” across agents, tools and trust domains.",
  },
  {
    id: "autonomous",
    title: "No human",
    blurb: "The agent acts as itself: workload identity, not user identity.",
  },
  {
    id: "agent-to-agent",
    title: "Agent to agent, agent to web",
    blurb: "Agents authenticating to each other, to websites and to merchants.",
  },
  {
    id: "cross-cutting",
    title: "Cross-cutting",
    blurb: "Techniques that harden any of the above.",
  },
];

export const HUMAN_LABEL: Record<HumanPresence, string> = {
  present: "Human present",
  reachable: "Human reachable",
  absent: "No human",
  any: "With or without a human",
};

export const HUMAN_TONE: Record<HumanPresence, string> = {
  present: "red",
  reachable: "amber",
  absent: "blue",
  any: "",
};

export const MATURITY_LABEL: Record<Maturity, string> = {
  stable: "Stable standards",
  emerging: "Emerging",
  experimental: "Experimental",
};

/* ---------- standards tracker ---------- */

export type StdStatus =
  | "rfc" // published IETF RFC
  | "final" // final specification from another body
  | "wg-draft" // adopted working group draft / implementers draft
  | "draft" // individual submission or early proposal
  | "project" // open source project or de facto platform API
  | "guidance"; // report, framework or best-practice document

export const STATUS_LABEL: Record<StdStatus, string> = {
  rfc: "RFC",
  final: "Final spec",
  "wg-draft": "WG draft",
  draft: "Individual draft",
  project: "Project / platform",
  guidance: "Guidance",
};

export const STATUS_TONE: Record<StdStatus, string> = {
  rfc: "green",
  final: "green",
  "wg-draft": "blue",
  draft: "amber",
  project: "violet",
  guidance: "",
};

export type StdTopic =
  | "core"
  | "discovery"
  | "registration"
  | "delegation"
  | "human-in-the-loop"
  | "workload"
  | "proof-of-possession"
  | "authorization"
  | "agent-protocol"
  | "commerce"
  | "credentials"
  | "kubernetes"
  | "signals"
  | "guidance";

export const TOPIC_LABEL: Record<StdTopic, string> = {
  core: "Core OAuth",
  discovery: "Discovery",
  registration: "Client identity",
  delegation: "Delegation",
  "human-in-the-loop": "Human in the loop",
  workload: "Workload identity",
  "proof-of-possession": "Proof of possession",
  authorization: "Fine-grained authz",
  "agent-protocol": "Agent protocols",
  commerce: "Commerce",
  credentials: "Verifiable credentials",
  kubernetes: "Kubernetes",
  signals: "Signals & revocation",
  guidance: "Guidance",
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
  /**
   * For a project, a platform or a guidance document, whose status alone shows no
   * maturity: the level its maintainers' own statements support, with the evidence
   * in a comment beside it. Leave unset when that evidence has not been found.
   */
  level?: Maturity;
  topics: StdTopic[];
  /** What it defines. */
  summary: string;
  /** Why it matters for agents. */
  agents: string;
  url: string;
}
