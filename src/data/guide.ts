/**
 * Decision guide: questions, and the rules that turn answers into recommended flows.
 *
 * A rule applies when every key it names matches the selected answer. Questions
 * the reader has not answered yet do not rule anything out.
 */

export interface Question {
  id: string;
  title: string;
  help?: string;
  options: { value: string; label: string; hint?: string }[];
}

export const questions: Question[] = [
  {
    id: "principal",
    title: "Whose authority is the agent using?",
    help: "The single most important question. It decides whose name is on the token.",
    options: [
      {
        value: "user",
        label: "A specific person’s",
        hint: "Their data, their permissions",
      },
      {
        value: "self",
        label: "Its own",
        hint: "A service identity that an admin set up",
      },
    ],
  },
  {
    id: "human",
    title: "Is a person available when access is needed?",
    options: [
      {
        value: "present",
        label: "Yes, in the session",
        hint: "They can click through a sign-in now",
      },
      {
        value: "reachable",
        label: "Reachable, but elsewhere",
        hint: "Phone, chat, email",
      },
      {
        value: "absent",
        label: "No",
        hint: "Scheduled, event-driven, overnight",
      },
    ],
  },
  {
    id: "target",
    title: "What is the agent calling?",
    options: [
      { value: "mcp", label: "An MCP server" },
      { value: "api", label: "An HTTP API" },
      { value: "agent", label: "Another agent" },
      { value: "web", label: "A public website" },
      { value: "internal", label: "Services inside my own infrastructure" },
    ],
  },
  {
    id: "boundary",
    title: "Who runs the thing being called?",
    options: [
      {
        value: "same",
        label: "We do",
        hint: "Same organization, same identity system",
      },
      {
        value: "enterprise",
        label: "A vendor we use at work",
        hint: "Both sides connected to our company identity provider",
      },
      {
        value: "cross",
        label: "Someone else entirely",
        hint: "No shared identity provider",
      },
    ],
  },
  {
    id: "runtime",
    title: "Where does the agent run?",
    options: [
      {
        value: "local",
        label: "On the user’s machine",
        hint: "Desktop app, IDE, CLI",
      },
      {
        value: "headless",
        label: "Remote, with no browser",
        hint: "Container, SSH session, CI job",
      },
      { value: "k8s", label: "Kubernetes or a cloud we operate" },
      { value: "managed", label: "A managed agent platform" },
      { value: "sandbox", label: "A sandbox that runs untrusted code" },
    ],
  },
  {
    id: "risk",
    title: "What is the worst it could do?",
    options: [
      { value: "read", label: "Read data" },
      { value: "write", label: "Change things that can be undone" },
      {
        value: "irreversible",
        label: "Something irreversible",
        hint: "Move money, delete, send in someone’s name",
      },
    ],
  },
];

export type Role = "start" | "add" | "consider";

export const ROLE_TITLE: Record<Role, string> = {
  start: "Start with",
  add: "Then add",
  consider: "Worth a look",
};

export interface Rule {
  flow: string;
  role: Role;
  /** question id → acceptable answers */
  when: Record<string, string[]>;
  why: string;
  /** Higher sorts first within a role. */
  weight?: number;
}

export const rules: Rule[] = [
  // ── a person's authority, person present ──
  {
    flow: "mcp-authorization",
    role: "start",
    weight: 10,
    when: {
      principal: ["user"],
      human: ["present"],
      target: ["mcp"],
      boundary: ["same", "cross"],
    },
    why: "MCP defines the whole sequence for this case: discover the authorization server, identify the client by URL, sign in, and get a token bound to that one server.",
  },
  {
    flow: "authorization-code-pkce",
    role: "start",
    weight: 9,
    when: {
      principal: ["user"],
      human: ["present"],
      target: ["api", "agent", "web"],
      runtime: ["local", "k8s", "managed"],
    },
    why: "A person is present and a browser is available. This is the baseline everything else is measured against.",
  },
  {
    flow: "device-authorization",
    role: "start",
    weight: 9,
    when: {
      principal: ["user"],
      human: ["present"],
      runtime: ["headless", "sandbox"],
    },
    why: "There is no browser where the agent runs, so the user approves on another device. Mind the phishing risk: the approval screen must make clear what is being approved.",
  },
  {
    flow: "cross-app-access",
    role: "start",
    weight: 11,
    when: {
      principal: ["user"],
      boundary: ["enterprise"],
      target: ["mcp", "api"],
    },
    why: "Both sides trust your company identity provider, so let it decide. Employees sign in once and administrators control which agents reach which applications.",
  },

  // ── a person's authority, person elsewhere or absent ──
  {
    flow: "ciba",
    role: "start",
    weight: 10,
    when: { principal: ["user"], human: ["reachable"] },
    why: "The user is not in the session. The authorization server contacts them on a device it already knows and the agent waits for the answer.",
  },
  {
    flow: "authorization-code-pkce",
    role: "start",
    weight: 6,
    when: {
      principal: ["user"],
      human: ["absent"],
      boundary: ["same", "cross"],
    },
    why: "Someone has to consent once. Obtain the grant while the user is present, with the narrowest scope that works, then run unattended on a refresh token. This is the riskiest arrangement on this page: plan how it is revoked.",
  },
  {
    flow: "ciba",
    role: "consider",
    weight: 5,
    when: { principal: ["user"], human: ["absent"], risk: ["irreversible"] },
    why: "If the agent can do irreversible things for a user who is not watching, find a way to make them reachable for those moments.",
  },

  // ── approvals ──
  {
    flow: "step-up-authorization",
    role: "add",
    weight: 8,
    when: {
      principal: ["user"],
      human: ["present"],
      risk: ["write", "irreversible"],
    },
    why: "Keep the everyday token weak. Let the API demand a fresh, specific approval when the agent reaches a sensitive action.",
  },
  {
    flow: "url-elicitation",
    role: "add",
    weight: 6,
    when: {
      principal: ["user"],
      human: ["present"],
      target: ["mcp"],
      boundary: ["cross", "enterprise"],
    },
    why: "If the MCP server fronts another service, it can collect the user’s grant for that service in a browser, without the credential passing through the agent.",
  },

  // ── delegation down a chain ──
  {
    flow: "token-exchange",
    role: "add",
    weight: 7,
    when: {
      principal: ["user"],
      boundary: ["same"],
      target: ["mcp", "api", "agent", "internal"],
    },
    why: "Any tool or sub-agent that calls another service for the same user should exchange the token it received for a new one, never forward it.",
  },
  {
    flow: "transaction-tokens",
    role: "start",
    weight: 8,
    when: { principal: ["user"], target: ["internal"] },
    why: "Inside your own infrastructure, carry the user and the approved request through every hop in a short-lived token that downstream services cannot alter.",
  },
  {
    flow: "identity-chaining",
    role: "add",
    weight: 6,
    when: {
      boundary: ["cross"],
      target: ["api", "agent", "mcp"],
      human: ["reachable", "absent"],
    },
    why: "If the other organization’s authorization server trusts yours, obtain a grant at home and redeem it there. Each side keeps control of its own tokens.",
  },

  // ── the agent's own authority ──
  {
    flow: "workload-identity-federation",
    role: "start",
    weight: 10,
    when: { principal: ["self"], runtime: ["k8s", "managed", "headless"] },
    why: "The platform can vouch for the agent. Use the identity it establishes to get short-lived access, with no long-lived secret to provision.",
  },
  {
    flow: "client-credentials",
    role: "start",
    weight: 8,
    when: { principal: ["self"], target: ["mcp", "api", "agent"] },
    why: "The agent authenticates as itself. Use a signed assertion instead of a client secret wherever the authorization server allows.",
  },
  {
    flow: "spiffe-workload-identity",
    role: "start",
    weight: 9,
    when: { runtime: ["k8s"], target: ["internal"] },
    why: "Between workloads you operate, give each a cryptographic identity and authenticate both ends of every connection.",
  },
  {
    flow: "wimse-workload-tokens",
    role: "consider",
    weight: 4,
    when: { runtime: ["k8s", "managed"], target: ["internal", "agent"] },
    why: "If gateways terminate TLS between your workloads, a key-bound workload token with per-request proof survives the hop. Still experimental.",
  },

  // ── agents and the web ──
  {
    flow: "agent-to-agent",
    role: "start",
    weight: 9,
    when: { target: ["agent"] },
    why: "The remote agent’s card declares what credentials it accepts. Obtain them with one of the other flows here.",
  },
  {
    flow: "web-bot-auth",
    role: "start",
    weight: 9,
    when: { target: ["web"] },
    why: "Sign requests so sites can tell which operator your agent belongs to. It identifies the agent; a user still needs to log in for anything personal.",
  },
  {
    flow: "agent-payments",
    role: "consider",
    weight: 5,
    when: { target: ["web", "agent"], risk: ["irreversible"] },
    why: "If the irreversible thing is a purchase, signed mandates give merchants and payment providers evidence of what the user approved.",
  },

  // ── hardening ──
  {
    flow: "credential-broker",
    role: "start",
    weight: 12,
    when: { runtime: ["sandbox"] },
    why: "An agent running untrusted code should not hold secrets. Keep them outside the sandbox and inject them at the network edge.",
  },
  {
    flow: "credential-broker",
    role: "add",
    weight: 5,
    when: { runtime: ["managed", "headless"], target: ["api", "mcp", "web"] },
    why: "Where the platform offers a credential vault or egress proxy, use it so the model never sees a token.",
  },
  {
    flow: "dpop",
    role: "add",
    weight: 4,
    when: {
      runtime: ["local", "headless", "sandbox", "managed"],
      target: ["api", "mcp", "agent"],
      risk: ["write", "irreversible"],
    },
    why: "Bind tokens to a key the agent holds. A token copied from a log or a model’s context is then useless on its own.",
  },
  {
    flow: "dpop",
    role: "consider",
    weight: 2,
    when: { target: ["api", "mcp", "agent"], risk: ["read"] },
    why: "Sender-constrained tokens are cheap insurance wherever both ends support them.",
  },
];

export interface Caution {
  when: Record<string, string[]>;
  text: string;
}

export const cautions: Caution[] = [
  {
    when: { principal: ["self"], human: ["present", "reachable"] },
    text: "If this agent serves several people under its own identity, the API cannot tell them apart. One user may be able to steer it into fetching another’s data. Consider carrying each user’s delegation instead.",
  },
  {
    when: { principal: ["user"], human: ["absent"] },
    text: "An unattended agent holding a person’s long-lived grant is the configuration most likely to end badly. Scope it narrowly, bind it to a key, and make sure someone can revoke it.",
  },
  {
    when: { risk: ["irreversible"], human: ["absent"] },
    text: "Irreversible actions with no human available leave policy as the only control. Put hard limits at the API or a gateway, not in the prompt.",
  },
  {
    when: { target: ["web"], principal: ["user"] },
    text: "Most websites have no way to accept a delegated token. An agent logging in with the user’s own password is impersonation, with all of the user’s power and none of the audit trail.",
  },
  {
    when: { runtime: ["local"] },
    text: "A local agent is a public client. Do not embed secrets in it; use PKCE, a loopback redirect, and the operating system’s credential store.",
  },
];

export const deployLinks: Record<string, { href: string; label: string }> = {
  local: { href: "/deployments/local/", label: "Desktop, IDE and CLI agents" },
  headless: {
    href: "/deployments/local/#headless-and-remote-agents",
    label: "Headless and CI agents",
  },
  k8s: { href: "/deployments/kubernetes/", label: "Agents on Kubernetes" },
  managed: {
    href: "/deployments/agent-platforms/",
    label: "Managed agent platforms",
  },
  sandbox: { href: "/deployments/sandboxes/", label: "Sandboxed agents" },
};
