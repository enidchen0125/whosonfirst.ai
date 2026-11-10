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

Web Bot Auth replaces both with cryptography. The agent’s operator publishes its public keys at a well-known URL. The agent signs each request using HTTP Message Signatures and names the operator in a header. The website, or more usually the CDN in front of it, fetches the keys, verifies the signature, and then applies whatever policy it likes to a caller it can now name.

This is identification, not authorization. A valid signature says “this request came from operator X’s agent.” It does not say a user asked for it or that the site must serve it.`,
  fits: [
    "Agents that fetch or interact with public websites: browsing, research, shopping.",
    "Operators who want their traffic recognized and not blocked as an unknown bot.",
    "Sites and CDNs that want to treat known agents differently from anonymous automation.",
  ],
  watchOut: [
    "It identifies the **operator**, not the end user and not the individual agent run. Per-user authorization still needs a login or a token.",
    "The identity is only as meaningful as the site’s policy for it. Verification proves a name; reputation is a separate matter.",
    "The specification is an early working group draft, and the header syntax has changed between revisions. Deployed verifiers may expect an older form.",
    "The signature covers selected parts of the request. Know which, and do not assume the body is protected.",
  ],
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
      body: `A key directory in JWKS format, served over HTTPS from a well-known path on a domain the operator controls. That domain is the agent’s identity. The path and media type shown are those used in the drafts to date.`,
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
      body: `An RFC 9421 signature over, at minimum, the target authority and the \`Signature-Agent\` header. The signature parameters carry a creation time, a short expiry, the key ID, and a \`tag\` that marks the signature’s purpose.`,
    },
    {
      from: "agent",
      to: "edge",
      kind: "back",
      label: "Signed HTTP request",
      title: "The request arrives with three extra headers",
      body: `\`Signature-Agent\` says where to find the keys. \`Signature-Input\` describes what was signed and how. \`Signature\` is the signature itself.

The example shows \`Signature-Agent\` in its original string form, which is what most deployed verifiers accept. Later drafts redefine it as a structured dictionary, so check the revision your counterpart implements.`,
      code: {
        lang: "http",
        text: `GET /products/widget HTTP/1.1
Host: shop.example
User-Agent: ExampleAgent/2.1
Signature-Agent: "https://agent.operator.example"
Signature-Input: sig1=("@authority" "signature-agent");created=1794268800;
  expires=1794268860;keyid="poqkLGiymh_W0uP6PZFw-dvez3QJT5SolqXBCW38r0U";
  alg="ed25519";tag="web-bot-auth"
Signature: sig1=:jdq0SqOwHdyHr9+r5jw3iYZH6aNGKijYp/EstF4RQTQdi5N5YYKrD+mCT1HA1nZDsi6nJKuHxUi/5Syp3rLWBA==:`,
      },
    },
    {
      from: "edge",
      to: "op",
      kind: "back",
      label: "Fetch key directory",
      title: "The verifier looks up the operator’s keys",
      body: `Using the URL from \`Signature-Agent\`, cached according to HTTP caching headers. A verifier may also keep its own registry of operators it recognizes.`,
    },
    {
      from: "edge",
      kind: "self",
      label: "Verify signature; apply policy",
      title: "The verifier checks the signature and decides",
      body: `It rebuilds the signature base from the request, verifies it with the named key, and checks the time window. The request is now attributable to \`agent.operator.example\`. What happens next is policy: allow, rate-limit, serve a different representation, charge, or block.`,
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
  ],
};
