import type { Flow } from "../types";

export const webBotAuth: Flow = {
  slug: "web-bot-auth",
  title: "Web Bot Auth",
  short: "Web Bot Auth",
  group: "agent-to-agent",
  human: "any",
  maturity: "emerging",
  tagline:
    "An agent that browses the open web signs its requests, so a site can tell which operator it belongs to without trusting a user-agent string.",
  summary: `Most of this site is about agents calling APIs that expect them. Agents also browse ordinary websites, which were built for people and regard automated traffic with suspicion. Sites have had two bad options for telling good bots from bad: the \`User-Agent\` header, which anyone can type, and lists of IP addresses, which break whenever infrastructure moves and say nothing about shared platforms.

Web Bot Auth replaces both with cryptography. The agent’s operator publishes its public keys at an HTTPS URL. The agent signs each request using HTTP Message Signatures and names that URL in a header. The website, or more usually the CDN in front of it, fetches the keys, verifies the signature, and then applies whatever policy it likes to a caller it can now name.

This is identification, not authorization. A valid signature says that a holder of a key published at that URL signed the parts of the request the signature covers. It does not say a user asked for the request or that the site must serve it.`,
  fits: [
    "Agents that fetch or interact with public websites: browsing, research, shopping.",
    "Operators who want their traffic recognized and not blocked as an unknown bot.",
    "Sites and CDNs that want to treat known agents differently from anonymous automation.",
  ],
  watchOut: [
    "It identifies the **operator**, not the end user and not the individual agent run. Per-user authorization still needs a login or a token.",
    "The identity is only as meaningful as the site’s policy for it. Verification proves a name; reputation is a separate matter.",
    "The specification is an early working group draft. Between revisions the header’s syntax has changed, and so has what its value points to: an origin in earlier drafts, the key directory’s own URL in this one. Deployed verifiers may expect an older form.",
    "The signature covers selected parts of the request. Know which. One that covers only the site’s name can be reused by anyone who sees it, for any method and path on that site, until it expires. Do not assume the body is protected.",
  ],
  lesson: "whose-authority",
  phases: [
    {
      title: "The operator publishes its public keys and gives the agent a key",
      from: 1,
    },
    {
      title: "The agent signs each request and names its key URL in a header",
      from: 3,
    },
    {
      title: "The verifier fetches the keys, checks the signature and decides",
      from: 5,
    },
    { title: "The website receives a labeled request and responds", from: 7 },
  ],
  parts: {
    op: "Publishes its public keys in a key directory, at an HTTPS URL it controls, and gives the agent the matching private key. That URL is the agent’s identifier. On a shared agent platform the key lives in the platform’s infrastructure, not in the model’s reach.",
    agent:
      "Signs each outgoing request and adds three headers: where to find the keys, what was signed and how, and the signature itself. The signature covers selected parts of the request, so know which, and do not assume the body is protected. The header syntax has changed between draft revisions. The current draft requires the dictionary form, and a verifier built to an earlier draft may reject it: check which one your counterpart implements.",
    edge: "Fetches the operator’s keys from the URL the request names, verifies the signature with the named key, checks the time window, and applies policy: allow, rate-limit, serve a different representation, charge, or block. It typically passes the verified operator identity on to the website.",
    site: "Receives the request, typically labeled with the verified operator identity, makes its own decisions and responds. The signature names the operator, not the end user: if the site needs to know which person the agent is acting for, that takes the site’s own login or an OAuth token.",
  },
  participants: [
    { id: "op", label: "Agent operator", sub: "Publishes keys", role: "authz" },
    { id: "agent", label: "Browsing agent", role: "agent" },
    {
      id: "edge",
      label: "CDN / verifier",
      sub: "In front of site",
      role: "infra",
    },
    { id: "site", label: "Website", sub: "Origin", role: "resource" },
  ],
  steps: [
    {
      from: "op",
      kind: "self",
      label: "Publish key directory",
      title: "The operator publishes its public keys",
      body: `A key directory in JWKS format, served over HTTPS at a URL the operator controls. That URL is the agent’s identifier. The example uses the well-known path the draft registers. A URL at that path names the operator’s domain, not just one path on it, and its key directory is served with the media type shown.`,
      code: {
        lang: "http",
        text: `GET /.well-known/http-message-signatures-directory HTTP/1.1
Host: agent.operator.example

HTTP/1.1 200 OK
Content-Type: application/http-message-signatures-directory+json

{ "keys": [ { "kty": "OKP", "crv": "Ed25519", "x": "JrQLj5P_89iXES9-vFgrIy29clF9CC_oPPsw3c5D0bs" } ] }`,
      },
    },
    {
      from: "op",
      to: "agent",
      kind: "back",
      label: "Provision signing key",
      title: "The agent is given a signing key",
      body: `The private key corresponding to an entry in the directory. On a shared agent platform this lives in the platform’s infrastructure, not in the model’s reach.`,
      gain: [["agent", "signing key"]],
    },
    {
      from: "agent",
      kind: "self",
      label: "Sign the request",
      title: "The agent signs each outgoing request",
      body: `An RFC 9421 signature over, at minimum, the target authority and the agent’s entry in the \`Signature-Agent\` header. The signature parameters carry a creation time, a short expiry, the key ID, and a \`tag\` that marks the signature’s purpose.`,
    },
    {
      from: "agent",
      to: "edge",
      kind: "back",
      label: "Signed HTTP request",
      title: "The request arrives with three extra headers",
      body: `\`Signature-Agent\` says where to find the keys. \`Signature-Input\` describes what was signed and how. \`Signature\` is the signature itself.

\`Signature-Agent\` is a dictionary. Its entry is keyed by the signature’s label, here \`sig1\`, and holds the URL of the key directory. \`Signature-Input\` lists that entry among the signed parts as \`"signature-agent";key="sig1"\`.

Earlier drafts sent the header as a bare string. The current draft requires signers to send the dictionary and lets a verifier still accept the string. A verifier built to an earlier draft may accept only the string, so check which one your counterpart implements.`,
      // The Signature value is real: Ed25519 over this example's signature base, made with the
      // test key of RFC 9421 Appendix B.1.4, whose public half is the key in step 1. If a signed
      // value changes (the host, the Signature-Agent entry, a signature parameter), sign again
      // or shorten the value with an ellipsis.
      code: {
        lang: "http",
        text: `GET /products/widget HTTP/1.1
Host: shop.example
User-Agent: ExampleAgent/2.1
Signature-Agent: sig1="https://agent.operator.example/.well-known/http-message-signatures-directory"
Signature-Input: sig1=("@authority" "signature-agent";key="sig1");created=1794268800;
  expires=1794268860;keyid="poqkLGiymh_W0uP6PZFw-dvez3QJT5SolqXBCW38r0U";
  alg="ed25519";tag="web-bot-auth"
Signature: sig1=:tQjDZHcVQ+BJ29HnzMuNjWJr4UC8yyFlTJnPli1pWH6QpLOGt9uDi/hgBwEsoJlCzvng6mnE5u2Hf1wqCTScCw==:`,
      },
    },
    {
      from: "edge",
      to: "op",
      kind: "back",
      label: "Fetch key directory",
      title: "The verifier looks up the operator’s keys",
      body: `The verifier fetches the URL in \`Signature-Agent\` directly, and caches the key directory according to HTTP caching headers. A verifier may also keep its own registry of operators it recognizes. If you write the verifier yourself, treat that URL as hostile input: any visitor can put any address in the header. Fetch over HTTPS only, refuse private, loopback and link-local addresses, set a size and time limit, and cache. Or fetch only for operators you already recognize.`,
    },
    {
      from: "edge",
      kind: "self",
      label: "Verify signature; apply policy",
      title: "The verifier checks the signature and decides",
      body: `It rebuilds the signature base from the request, verifies it with the named key, and checks the time window. A valid signature shows that a holder of a key published at that URL signed the parts the signature covers. Here those are the site’s name and the \`Signature-Agent\` entry, so until it expires, anyone who saw this request could reuse the signature on another request to \`shop.example\`. What happens next is policy: allow, rate-limit, serve a different representation, charge, or block.`,
    },
    {
      from: "edge",
      to: "site",
      kind: "back",
      label: "Forward with verified identity",
      title: "The origin receives a labeled request",
      body: `Typically the CDN passes the verified operator identity to the origin so the site can make its own decisions.`,
    },
    {
      from: "site",
      to: "agent",
      kind: "resp",
      label: "Response",
      title: "The site responds",
      body: `If the site needs to know which person the agent is acting for, to show an account page or take an order, that is a separate step using the site’s own login or an OAuth token.`,
    },
  ],
  standards: ["web-bot-auth", "rfc9421", "visa-tap", "signature-key"],
  related: [
    "agent-payments",
    "agent-to-agent",
    "dpop",
    "wimse-workload-tokens",
  ],
  notes: [
    {
      title: "Where this is going",
      body: `The IETF working group has one adopted document and has missed its original milestones, so the details are still moving. The idea has already spread: payment networks have built agent-recognition schemes on the same signatures, adding fields that say whether the agent is browsing or paying and on whose behalf.`,
    },
    {
      title: "From identifying to authorizing",
      body: `[AAuth](/flows/aauth/) starts from the same kind of signature and adds what this leaves out: a token that says which person the agent acts for, and another that records what they approved. It is an individual draft, further from settled than this one.`,
    },
  ],
};
