import type { Flow } from "../types";

export const wimseWorkloadTokens: Flow = {
  slug: "wimse-workload-tokens",
  title: "Workload identity tokens with proof of possession",
  short: "Workload tokens (WIMSE)",
  group: "autonomous",
  human: "absent",
  maturity: "emerging",
  tagline:
    "A workload identity that is bound to a key and proven on every request, so it survives the gateways and proxies that agent traffic passes through.",
  summary: `Mutual TLS gives two workloads strong mutual authentication, until something in the middle terminates the connection. Agent traffic passes through a lot of middle: API gateways, MCP gateways, service-mesh waypoints, inspection proxies. Each one ends the TLS session, and the caller’s certificate goes no further. The usual fallback is a bearer JWT in a header, which anyone along the path can copy and replay.

The IETF WIMSE working group is standardizing a credential built for this. A **Workload Identity Token** (WIT) is a JWT that names the workload and carries its public key. It is never accepted on its own. Each request must also carry proof that the sender holds the matching private key: either a **Workload Proof Token** (WPT), a small signed JWT bound to this request, or an HTTP Message Signature over the request itself. A proxy can forward both, and a thief who copies them gets nothing reusable.

The working group’s agent architecture document says plainly that agents are workloads, and builds on exactly this.`,
  fits: [
    "Agent-to-tool and agent-to-agent calls that pass through gateways or proxies.",
    "Environments where mutual TLS cannot reach end to end.",
    "Teams already using SPIFFE: the WIT-SVID is a SPIFFE profile of the same token.",
  ],
  watchOut: [
    "These are drafts. No WIMSE document has been published as an RFC yet, and implementations are experimental.",
    "The WIT must never be sent in the `Authorization` header or accepted as a bearer token. A receiver that skips the proof has reintroduced the problem.",
    "The private key lives in the agent process. Protect it accordingly and rotate the credential often.",
    "As with any workload identity, this identifies the software, not the user it is working for. Carry the user’s delegation separately.",
  ],
  participants: [
    {
      id: "issuer",
      label: "Identity issuer",
      sub: "e.g. SPIRE",
      role: "authz",
    },
    { id: "agent", label: "Agent", sub: "Workload", role: "agent" },
    { id: "proxy", label: "Gateway", sub: "Terminates TLS", role: "infra" },
    { id: "tool", label: "Tool service", sub: "Workload", role: "resource" },
  ],
  steps: [
    {
      from: "agent",
      kind: "self",
      label: "Generate a key pair",
      title: "The workload creates a key",
      body: `The private key stays in the workload. Only the public key is sent to the issuer.`,
      gain: [["agent", "private key"]],
    },
    {
      from: "agent",
      to: "issuer",
      kind: "back",
      label: "Request credential",
      title: "The workload asks for its identity",
      body: `How the issuer recognizes the workload is the platform’s business: process attestation through the SPIFFE Workload API, a Kubernetes service account token, a cloud instance identity. The draft does not prescribe it.`,
    },
    {
      from: "issuer",
      to: "agent",
      kind: "resp",
      label: "WIT: subject + public key",
      title: "The issuer returns a Workload Identity Token",
      body: `A signed JWT of type \`wit+jwt\`. The subject is the workload’s identifier, a URI scoped to a trust domain. The \`cnf\` claim holds the workload’s public key. There is no audience: the same WIT is shown to every peer, which is safe because it is worthless without the key.`,
      code: {
        lang: "json",
        text: `// header: { "alg": "ES256", "kid": "issuer-key-1", "typ": "wit+jwt" }
{
  "iss": "https://issuer.example.org",
  "sub": "spiffe://example.org/ns/agents/sa/research-agent",
  "exp": 1745512510,
  "jti": "x-_1CTL2cca3CSE4cwb_l",
  "cnf": {
    "jwk": { "kty": "OKP", "crv": "Ed25519", "x": "1CXXvflN_LVVsIsYXsUvB03JmlGWeCHqQVuouCF92bg" }
  }
}`,
      },
      gain: [["agent", "WIT (bound to key)"]],
    },
    {
      from: "agent",
      kind: "self",
      label: "Sign a proof for this request",
      title: "The agent signs a Workload Proof Token",
      body: `A very short-lived JWT of type \`wpt+jwt\`, signed with the private key. \`aud\` is the URL being called, \`wth\` is a hash of the WIT, and \`jti\` makes it single-use. Optional claims bind it to an access token or a transaction token travelling in the same request.`,
      code: {
        lang: "json",
        text: `// header: { "alg": "EdDSA", "typ": "wpt+jwt" }
{
  "aud": "https://tools.example.org/search",
  "exp": 1745510016,
  "jti": "__bwc4ESC3acc2LTC1-_x",
  "wth": "MeOILk2AJHh6czknhZ2c7TkiVpeFTC_cyYAonmT7mkI"
}`,
      },
    },
    {
      from: "agent",
      to: "proxy",
      kind: "back",
      label: "Request + WIT + WPT",
      title: "Both tokens travel as headers",
      body: `Each has its own header field. Neither goes in \`Authorization\`, which stays free for a user’s access token.`,
      code: {
        lang: "http",
        text: `POST /search HTTP/1.1
Host: tools.example.org
Workload-Identity-Token: eyJhbGciOiJFUzI1NiIsInR5cCI6IndpdCtqd3QifQ…
Workload-Proof-Token: eyJhbGciOiJFZERTQSIsInR5cCI6IndwdCtqd3QifQ…
Authorization: Bearer <user's delegated access token>`,
      },
    },
    {
      from: "proxy",
      to: "tool",
      kind: "back",
      label: "Forwarded on a new connection",
      title: "The gateway forwards the request",
      body: `The TLS session from the agent ended at the gateway. A client certificate would be gone at this point. The headers pass through untouched, and the gateway itself can verify them to apply policy.`,
    },
    {
      from: "tool",
      kind: "self",
      label: "Verify WIT, then proof",
      title: "The tool verifies identity and possession",
      body: `It verifies the WIT against the issuer’s keys, then verifies the WPT’s signature with the public key inside the WIT, checks that \`wth\` matches, that \`aud\` is this endpoint, and that the proof is fresh and unseen. Only then does it treat the caller as \`research-agent\`.`,
    },
    {
      from: "tool",
      to: "agent",
      kind: "resp",
      label: "Response",
      title: "The call proceeds",
      body: `Anything that copied the headers on the way, including the gateway’s logs, has a proof valid for one request to one URL for a few seconds.`,
    },
  ],
  standards: [
    "wimse-creds",
    "wimse-wpt",
    "wimse-httpsig",
    "wimse-arch",
    "wimse-aims",
    "spiffe",
    "rfc9421",
  ],
  related: [
    "spiffe-workload-identity",
    "dpop",
    "transaction-tokens",
    "workload-identity-federation",
  ],
  notes: [
    {
      title: "Three ways to prove possession",
      body: `The working group split its original protocol draft into separate documents. One defines the credentials. Three define how to prove possession: the **Workload Proof Token** shown here, **HTTP Message Signatures** (which can also sign the response), and **mutual TLS** with an X.509 workload certificate for cases where nothing sits in the path. The first two are for the application layer and survive proxies.`,
    },
    {
      title: "Availability",
      body: `SPIFFE has added the WIT-SVID as a third identity document type, at incubating stability, and SPIRE has experimental support behind a flag. Treat this as something to prototype with, not to depend on.`,
    },
  ],
};
