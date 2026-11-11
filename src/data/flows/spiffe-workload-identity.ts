import type { Flow } from "../types";

export const spiffeWorkloadIdentity: Flow = {
  slug: "spiffe-workload-identity",
  title: "SPIFFE identities and mutual TLS",
  short: "SPIFFE + mTLS",
  group: "autonomous",
  human: "absent",
  maturity: "stable",
  tagline:
    "Every agent process gets a cryptographic identity from the infrastructure it runs on, and uses it to authenticate both ends of every connection.",
  summary: `SPIFFE is a set of open specifications for giving software an identity without giving it a secret. Each workload gets a name, a SPIFFE ID such as \`spiffe://example.org/ns/agents/sa/research-agent\`, and a short-lived credential that proves the name: an X.509 certificate or a JWT, called an SVID.

The workload does not log in to get it. It asks a local agent over a Unix socket, and the local agent works out who is asking by inspecting the calling process: which pod, which service account, which container image. Identity is derived from what the workload *is*, checked by something outside it.

For agent systems this gives you a per-workload identity that works the same across clusters and clouds, authenticates both sides of a connection, and rotates without anyone noticing. Service meshes use the same identities under the hood.`,
  fits: [
    "Agent-to-tool and agent-to-agent calls inside your own infrastructure.",
    "Multi-cluster or multi-cloud deployments that need one identity scheme.",
    "A foundation for other flows: an SVID can authenticate an OAuth client or be exchanged for a token.",
  ],
  watchOut: [
    "SPIFFE says **who a workload is**. It says nothing about which user the workload is acting for. For that you still need a token carrying the user’s delegation, alongside the workload identity.",
    "Authentication is not authorization. Mutual TLS with no policy means every workload in the trust domain can call every other.",
    "Registration entries decide which workloads get which IDs. Loose selectors (a whole namespace) hand the same identity to things that should differ.",
    "An LLM agent that spawns sub-agents in one process shares one SVID among them. Workload identity stops at the process boundary.",
    "Anything running in the agent’s container can ask for the agent’s certificate and key, including code the agent was asked to run. Run untrusted code in a separate pod that cannot reach the socket.",
  ],
  lesson: "whose-authority",
  phases: [
    {
      title: "The SPIRE agent proves what it is and learns what it may issue",
      from: 1,
    },
    {
      title: "The AI agent asks for its identity and receives a certificate",
      from: 3,
    },
    { title: "The AI agent and the tool service verify each other", from: 6 },
    {
      title: "The tool service decides whether this identity may call it",
      from: 7,
    },
  ],
  parts: {
    server:
      "Has the SPIRE agent on each node prove what it is, then tells it which identities it may issue. Registration entries decide which workloads get which IDs. Loose selectors, such as a whole namespace, hand the same identity to things that should differ.",
    node: "Proves what it is to the SPIRE server with evidence the platform provides. When a workload asks over the local socket, it works out which process is calling, matches that against the registration entries, and hands back a short-lived certificate and the trust bundle. It pushes a new certificate before the old one expires.",
    agent:
      "Asks the SPIRE agent for its identity over a local socket, sending no password, token or key, then presents the certificate it receives to the tool service and verifies the tool’s in return. If a call is for a user, the request carries an access token as well: the certificate says which workload this is, not which user it is acting for. Sub-agents it spawns in the same process share its one identity.",
    tool: "Presents its own certificate, verifies the AI agent’s against the trust bundle, then reads the caller’s SPIFFE ID and decides whether that identity may call this endpoint. A sidecar or mesh proxy in front of it can read the ID and decide instead. With no policy, every workload in the trust domain can call every other.",
  },
  participants: [
    {
      id: "server",
      label: "SPIRE server",
      sub: "Trust domain CA",
      role: "authz",
    },
    { id: "node", label: "SPIRE agent", sub: "One per node", role: "infra" },
    { id: "agent", label: "AI agent", sub: "Workload", role: "agent" },
    { id: "tool", label: "Tool service", sub: "Workload", role: "resource" },
  ],
  steps: [
    {
      from: "node",
      to: "server",
      kind: "back",
      label: "Node attestation",
      title: "The node proves what it is",
      body: `Before any workload gets an identity, the SPIRE agent on each node proves its own to the SPIRE server, using evidence the platform provides: on Kubernetes a projected service account token, on a cloud VM a signed instance identity document.`,
    },
    {
      from: "server",
      to: "node",
      kind: "resp",
      label: "Registration entries",
      title: "The server tells the node which identities it may issue",
      body: `Registration entries map selectors to SPIFFE IDs: “a pod in namespace \`agents\` with service account \`research-agent\` is \`spiffe://example.org/ns/agents/sa/research-agent\`.”`,
      gain: [["node", "node SVID"]],
    },
    {
      from: "agent",
      to: "node",
      kind: "back",
      label: "Workload API: fetch SVID",
      title: "The agent asks for its identity, presenting nothing",
      body: `The agent connects to the Workload API on a local Unix domain socket. It sends no password, token or key. This is the answer to the bootstrap problem: how do you authenticate a workload that has no credential yet?`,
    },
    {
      from: "node",
      kind: "self",
      label: "Attest the calling process",
      title: "The node agent identifies the caller",
      body: `From the socket it learns the caller’s process ID. From the kernel and the kubelet it learns which container and pod that process belongs to, its service account, labels and image. It matches those facts against the registration entries.`,
    },
    {
      from: "node",
      to: "agent",
      kind: "resp",
      label: "X.509-SVID + trust bundle",
      title: "The agent receives a short-lived certificate",
      body: `The certificate carries the SPIFFE ID in its URI subject alternative name. It typically lives for an hour or less and is pushed again over the same stream before it expires. The trust bundle is the set of CA certificates for verifying peers.`,
      code: {
        lang: "text",
        text: `Subject Alternative Name:
  URI: spiffe://example.org/ns/agents/sa/research-agent
Validity:
  Not After: +1h`,
      },
      gain: [["agent", "X.509-SVID + key"]],
    },
    {
      from: "agent",
      to: "tool",
      kind: "back",
      label: "mTLS handshake",
      title: "Both sides present certificates",
      body: `The agent presents its SVID as a client certificate. The tool service presents its own. Each verifies the other against the trust bundle, and each checks the other’s SPIFFE ID against the one it expects. A valid certificate from the trust domain is not enough: every workload has one. The connection is authenticated in both directions before any application data flows.`,
      gain: [["tool", "X.509-SVID + key"]],
    },
    {
      from: "tool",
      kind: "self",
      label: "Authorize the SPIFFE ID",
      title: "The tool applies policy to the caller’s identity",
      body: `The tool, or a sidecar or mesh proxy in front of it, reads the peer’s SPIFFE ID and decides whether that identity may call this endpoint.`,
      code: {
        lang: "yaml",
        text: `allow:
  - from: spiffe://example.org/ns/agents/sa/research-agent
    to:   [ "POST /tools/search", "POST /tools/summarize" ]`,
      },
    },
    {
      from: "tool",
      to: "agent",
      kind: "resp",
      label: "Response over mTLS",
      title: "The call proceeds",
      body: `If the call is on behalf of a user, the request carries an access token as well. Workload identity for the hop, user delegation for the request: the two layers answer different questions and are stronger together.`,
    },
  ],
  standards: ["spiffe", "spire", "rfc8705", "spiffe-client-auth", "wimse-arch"],
  roles: {
    spiffe: "required", // SPIFFE ID, X.509-SVID, Workload API, trust bundle: steps 3, 5, 6, 7
    spire: "required", // the implementation drawn: attestation and registration in steps 1, 2, 4
    rfc8705: "optional", // an SVID authenticating an OAuth client is offered under "Use it when"; no step shows it
    "spiffe-client-auth": "optional", // the same use, as an IETF draft
    "wimse-arch": "background", // named once in a note about related IETF work
  },
  related: [
    "workload-identity-federation",
    "wimse-workload-tokens",
    "transaction-tokens",
    "client-credentials",
  ],
  notes: [
    {
      title: "JWT-SVIDs",
      body: `When a load balancer or gateway terminates TLS, the certificate does not reach the application. SPIFFE also issues **JWT-SVIDs**: signed tokens with the SPIFFE ID as subject and a specific audience, sent in a header. They are bearer tokens, so keep them short-lived and audience-bound. The IETF WIMSE work adds proof-of-possession for this case; see [workload tokens](/flows/wimse-workload-tokens/).`,
    },
  ],
};
