import type { Flow } from "../types";

export const stepUpAuthorization: Flow = {
  slug: "step-up-authorization",
  title: "Step-up and transaction-specific consent",
  short: "Step-up authorization",
  group: "human-in-the-loop",
  human: "present",
  maturity: "stable",
  tagline:
    "Start with a weak token. When the agent reaches something sensitive, the API says so and the user is asked for exactly that.",
  summary: `Asking for every permission up front is how agents end up holding tokens that can do far more than the task needs. The alternative is to begin with the minimum and let the resource server say when more is required.

Two standards make this workable. The step-up challenge lets an API answer “this token is fine, but not for this: come back with a stronger authentication or a broader scope”. Rich Authorization Requests let the follow-up request describe one specific action in structured detail instead of a coarse scope string. Together they give a pattern where routine work flows without interruption and a human is pulled in only for the moments that matter, to approve something concrete.`,
  fits: [
    "Agents whose work is mostly low-risk with occasional sensitive actions.",
    "The user is available in the session when the sensitive moment arrives.",
    "APIs that can express their requirements per endpoint or per transaction.",
  ],
  watchOut: [
    "Step-up only works if the API enforces it. An API that accepts the weak token for the sensitive call has no step-up.",
    "An agent can be steered by injected instructions into triggering a step-up. The consent screen is the defence, so it must show what will actually happen, sourced from the authorization request rather than from the agent’s description of it.",
    "Scope accumulation: after several step-ups the token may hold everything. Prefer transaction-bound authorization details that expire with the action.",
    "If the user is not in the session, a redirect goes nowhere. Use [CIBA](/flows/ciba/) for that case.",
  ],
  participants: [
    { id: "user", label: "User", role: "human" },
    { id: "agent", label: "Agent", sub: "OAuth client", role: "agent" },
    { id: "as", label: "Authorization server", role: "authz" },
    { id: "api", label: "Banking API", role: "resource" },
  ],
  steps: [
    {
      from: "agent",
      to: "api",
      kind: "back",
      label: "POST /transfers (basic token)",
      title: "The agent tries a sensitive action with its everyday token",
      body: `The agent has a token with \`accounts.read\`, obtained when the user first connected the bank. It now attempts a transfer.`,
      gain: [["agent", "access token (accounts.read)"]],
    },
    {
      from: "api",
      kind: "self",
      label: "Policy: needs more",
      title: "The API evaluates its own policy",
      body: `The token is valid. The policy for this endpoint asks for more: a scope the token lacks, a recent authentication, a phishing-resistant factor, or explicit approval of the transaction. The requirement lives at the API, which is the only place it cannot be bypassed.`,
    },
    {
      from: "api",
      to: "agent",
      kind: "resp",
      label: "401 / 403 with challenge",
      title: "The API explains what is missing",
      body: `The \`WWW-Authenticate\` header is machine-readable. \`insufficient_scope\` names the scope needed. \`insufficient_user_authentication\` names the authentication strength (\`acr_values\`) or freshness (\`max_age\`) required. The agent does not have to guess.`,
      code: {
        lang: "http",
        text: `HTTP/1.1 401 Unauthorized
WWW-Authenticate: Bearer error="insufficient_user_authentication",
  error_description="A recent phishing-resistant login is required",
  acr_values="urn:example:acr:phishing-resistant",
  max_age=300`,
      },
    },
    {
      from: "agent",
      to: "user",
      kind: "back",
      label: "Pause and explain",
      title: "The agent tells the user why it stopped",
      body: `A well-behaved agent surfaces the reason in its own interface before sending the user anywhere. This is courtesy, not security. The authorization server will show the authoritative version.`,
    },
    {
      from: "agent",
      to: "as",
      kind: "front",
      label: "Authorization request with details",
      title: "A new authorization request describes one transaction",
      body: `The agent echoes the API’s requirements and attaches \`authorization_details\`: a typed JSON object describing the transfer. Sending this through a pushed authorization request (PAR) keeps the details out of the browser’s address bar and stops anyone tampering with them on the way.`,
      code: {
        lang: "json",
        text: `{
  "acr_values": "urn:example:acr:phishing-resistant",
  "max_age": 300,
  "authorization_details": [
    {
      "type": "transfer",
      "locations": ["https://bank.example/api"],
      "from_account": "…4411",
      "to": { "name": "Riverside Landscaping", "iban": "DE89 3704 0044 0532 0130 00" },
      "amount": { "currency": "EUR", "value": "480.00" }
    }
  ]
}`,
      },
    },
    {
      from: "as",
      to: "user",
      kind: "front",
      label: "Re-authenticate; show transfer",
      title: "The authorization server shows the real transaction",
      body: `The user is asked for the stronger factor and shown the transfer as the server received it: payee, account, amount. If injected instructions changed the payee, this is where a person can catch it.`,
    },
    {
      from: "user",
      to: "as",
      kind: "front",
      label: "Approve this transfer",
      title: "The user approves one specific thing",
      body: `Not “allow the agent to make transfers”. This transfer.`,
    },
    {
      from: "as",
      to: "agent",
      kind: "front",
      label: "Redirect with code",
      title: "Back to the agent",
      body: `The usual authorization code response, protected by PKCE.`,
      gain: [["agent", "authorization code"]],
    },
    {
      from: "agent",
      to: "as",
      kind: "back",
      label: "Token request",
      title: "The agent redeems the code",
      body: `Identical to the baseline flow.`,
      lose: [["agent", "authorization code"]],
    },
    {
      from: "as",
      to: "agent",
      kind: "resp",
      label: "Token with acr + details",
      title: "A token that carries the approval",
      body: `The new token records how and when the user authenticated (\`acr\`, \`auth_time\`) and includes the approved \`authorization_details\`.`,
      code: {
        lang: "json",
        text: `{
  "sub": "user:alice",
  "aud": "https://bank.example/api",
  "acr": "urn:example:acr:phishing-resistant",
  "auth_time": 1794268790,
  "exp": 1794269090,
  "authorization_details": [
    { "type": "transfer", "to": { "iban": "DE89 3704 0044 0532 0130 00" },
      "amount": { "currency": "EUR", "value": "480.00" } }
  ]
}`,
      },
      gain: [["agent", "access token (this transfer)"]],
    },
    {
      from: "agent",
      to: "api",
      kind: "back",
      label: "Retry POST /transfers",
      title: "The agent retries with the stronger token",
      body: `The API compares the request body with the authorization details in the token. They must match.`,
    },
    {
      from: "api",
      to: "agent",
      kind: "resp",
      label: "201 Created",
      title: "The transfer goes through",
      body: `The stronger token expires in minutes. The agent drops back to its everyday token for everything else.`,
      lose: [["agent", "access token (this transfer)"]],
    },
  ],
  standards: ["rfc9470", "rfc9396", "rfc9126", "rfc6750", "mcp-authorization"],
  related: [
    "ciba",
    "authorization-code-pkce",
    "mcp-authorization",
    "url-elicitation",
  ],
};
