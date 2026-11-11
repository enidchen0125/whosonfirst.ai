import type { Flow } from "../types";

export const dpop: Flow = {
  slug: "dpop",
  title: "Sender-constrained tokens (DPoP)",
  short: "DPoP",
  group: "cross-cutting",
  human: "any",
  maturity: "stable",
  tagline:
    "Bind a token to a key so that stealing the token is not enough to use it.",
  summary: `A bearer token works like cash: whoever holds it can spend it. That was an acceptable trade when tokens lived in a server’s memory. Agents put tokens in riskier places. They pass through tool calls, logs, traces, proxies and sometimes the model’s own context, and an agent that reads untrusted content can be talked into revealing what it holds.

Demonstrating Proof of Possession fixes the cash problem at the application layer. The agent generates a key pair, and the authorization server binds each token to the public key. Every request then carries a small signed proof made with the private key. A stolen token without the key is rejected.

Mutual TLS does the same job at the transport layer and is a good fit where a service mesh or workload identity system already manages certificates. DPoP works where the agent cannot control TLS: public clients, desktop apps, anything behind a proxy that terminates connections.`,
  fits: [
    "Any flow on this site that ends with an access token. DPoP is an add-on, not a grant type.",
    "Public clients (desktop, CLI, mobile) that cannot hold a client secret but can hold a key.",
    "Refresh tokens that live for a long time in an agent runtime.",
  ],
  watchOut: [
    "DPoP protects the token, not the key. If the private key sits in the same file as the token, the thief takes both. Use a platform keystore or non-exportable key where one exists.",
    "It does not stop a compromised agent from *using* its own key. It stops a token from being useful somewhere else.",
    "Both the authorization server and the resource server must support it. A resource server that ignores the binding and accepts the token as a plain bearer token has gained nothing.",
    "Proofs are tied to method and URL, and servers may require a nonce. Clock skew and proxies that rewrite URLs are the usual sources of trouble.",
  ],
  lesson: "limits",
  phases: [
    { title: "The agent creates a key and gets a token bound to it", from: 1 },
    {
      title: "The agent signs a new proof and sends it with the token",
      from: 4,
    },
    { title: "The API checks that the caller holds the key", from: 6 },
  ],
  parts: {
    agent:
      "Generates a key pair, sends a signed proof with the token request, and signs a new proof before each API call, covering the method, the URL, the time and a hash of the token. Where the private key lives is yours to decide: a platform keystore or a non-exportable key where one exists, and not the same file as the token.",
    as: "Binds each token to the agent’s public key by putting the key’s thumbprint in the token, and answers with `token_type: DPoP` instead of `Bearer`. It must support DPoP, and so must the API.",
    api: "Verifies the proof on every request: its signature, that its key matches the thumbprint in the token, that the method and URL are this request’s, that it is recent, and that it has not been seen before. It rejects a DPoP-bound token presented as `Bearer`. If the API is yours, so is this check: an API that ignores the binding has gained nothing.",
  },
  participants: [
    { id: "agent", label: "Agent", sub: "Holds private key", role: "agent" },
    { id: "as", label: "Authorization server", role: "authz" },
    { id: "api", label: "API", sub: "Resource server", role: "resource" },
  ],
  steps: [
    {
      from: "agent",
      kind: "self",
      label: "Generate a key pair",
      title: "The agent creates a key",
      body: `One key pair per agent instance, kept for the life of the session or longer. The private key should never be readable by the model or written to a log.`,
      gain: [["agent", "private key"]],
    },
    {
      from: "agent",
      to: "as",
      kind: "back",
      label: "Token request + DPoP proof",
      title: "The token request carries a proof",
      body: `Any grant type works. The extra piece is the \`DPoP\` header: a JWT that includes the public key and is signed with the private key. It names the HTTP method and URL it is for, and has a unique \`jti\` so it cannot be replayed.`,
      code: {
        lang: "http",
        text: `POST /token HTTP/1.1
Host: auth.example
Content-Type: application/x-www-form-urlencoded
DPoP: eyJ0eXAiOiJkcG9wK2p3dCIsImFsZyI6IkVTMjU2IiwiandrIjp7…

grant_type=authorization_code&code=…&code_verifier=…`,
      },
    },
    {
      from: "as",
      to: "agent",
      kind: "resp",
      label: "Token bound to key (cnf.jkt)",
      title: "The server binds the token to the key",
      body: `The access token contains a confirmation claim with the thumbprint of the agent’s public key. The response says \`token_type: DPoP\` instead of \`Bearer\`.`,
      code: {
        lang: "json",
        text: `{
  "sub": "user:alice",
  "aud": "https://calendar.example/api",
  "exp": 1794269400,
  "cnf": {
    "jkt": "0ZcOCORZNYy-DWpqq30jZyJGHTN0d2HglBV3uiguA4I"
  }
}`,
      },
      gain: [["agent", "access token (bound to key)"]],
    },
    {
      from: "agent",
      kind: "self",
      label: "Sign a fresh proof",
      title: "A new proof for every request",
      body: `Before each API call the agent signs a new proof. It covers the method (\`htm\`), the URL (\`htu\`), the time, a fresh \`jti\`, and a hash of the access token (\`ath\`) so the proof cannot be paired with a different token.`,
      code: {
        lang: "json",
        text: `{
  "typ": "dpop+jwt", "alg": "ES256",
  "jwk": { "kty": "EC", "crv": "P-256", "x": "l8tFrhx-34tV3hRICRDY9zCkDlpBhF42UQUfWVAWBFs", "y": "9VE4jf_Ok_o64zbTTlcuNJajHmt6v9TDVrU0CdvGRDA" }
}
.
{
  "jti": "e1j3V_bKic8-LAEB",
  "htm": "GET",
  "htu": "https://calendar.example/api/events",
  "iat": 1794268830,
  "ath": "fUHyO2r2Z3DZ53EsNrWBb0xWXoaNy59IiKCAqksmQEo"
}`,
      },
    },
    {
      from: "agent",
      to: "api",
      kind: "back",
      label: "Request + token + proof",
      title: "The agent sends token and proof together",
      body: `Note the \`DPoP\` authorization scheme. A resource server that sees a DPoP-bound token presented as \`Bearer\` must reject it.`,
      code: {
        lang: "http",
        text: `GET /api/events HTTP/1.1
Host: calendar.example
Authorization: DPoP eyJhbGciOiJFUzI1NiIsInR5cCI6ImF0K2p3dCJ9…
DPoP: eyJ0eXAiOiJkcG9wK2p3dCIsImFsZyI6IkVTMjU2IiwiandrIjp7…`,
      },
    },
    {
      from: "api",
      kind: "self",
      label: "Match proof key to cnf.jkt",
      title: "The API checks that the caller holds the key",
      body: `It verifies the proof’s signature with the key inside it, checks that the key’s thumbprint equals \`cnf.jkt\` in the token, that method and URL match this request, that the proof is recent, and that \`jti\` has not been seen before.`,
    },
    {
      from: "api",
      to: "agent",
      kind: "resp",
      label: "200 OK",
      title: "The request succeeds",
      body: `An attacker who copied the access token from a log gets nothing: they cannot produce a proof without the private key, and a captured proof is useless for any other method, URL or moment.`,
    },
  ],
  standards: ["rfc9449", "rfc8705", "rfc9700", "rfc7638"],
  related: [
    "authorization-code-pkce",
    "spiffe-workload-identity",
    "wimse-workload-tokens",
    "credential-broker",
  ],
  notes: [
    {
      title: "DPoP, mutual TLS, or message signatures",
      body: `All three prove that the caller holds a key. **Mutual TLS** (RFC 8705) binds the token to a client certificate; it is strong and invisible to application code, but breaks when something in the path terminates TLS. **DPoP** signs a small proof per request and survives proxies. **HTTP Message Signatures** (RFC 9421) sign chosen parts of the request itself, including the body, and are the basis for newer work such as [Web Bot Auth](/flows/web-bot-auth/) and [workload proof tokens](/flows/wimse-workload-tokens/).`,
    },
  ],
};
