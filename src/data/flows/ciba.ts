import type { Flow } from "../types";

export const ciba: Flow = {
  slug: "ciba",
  title: "Backchannel approval (CIBA)",
  short: "Backchannel approval (CIBA)",
  group: "human-in-the-loop",
  human: "reachable",
  maturity: "stable",
  tagline:
    "The agent asks the authorization server to go and find the user. Approval arrives as a push notification, not a redirect.",
  summary: `An agent has been working for an hour. It reaches a step it is not allowed to take alone: send the payment, merge the change, email the customer. The user is not looking at the agent. There is no browser to redirect.

Client-Initiated Backchannel Authentication turns the flow around. The agent calls the authorization server directly and says which user it needs and why. The server contacts that user on a device it already knows, typically a phone, and shows them a message describing the request. When the user approves, the agent receives a token. Nothing is typed, nothing is redirected, and the user can be anywhere.

CIBA came out of banking, where a call-centre agent or a point-of-sale terminal needs a customer’s approval on the customer’s own phone. That is the same shape as an AI agent asking its principal for permission.`,
  fits: [
    "Long-running or background agents that need occasional human approval.",
    "The user is known in advance and has an enrolled device.",
    "High-stakes actions where approval should be bound to the details of one transaction.",
  ],
  watchOut: [
    "**Approval fatigue.** An agent that can trigger a push whenever it likes will train its user to tap “approve”. Rate-limit requests and make each one specific.",
    "The `binding_message` is what the human actually reads. “Agent requests access” is useless. “Pay invoice 1042, $1,250.00, to Acme Ltd” is a decision.",
    "The agent chooses whom to ask via `login_hint`. If an attacker can influence that value, they choose who gets prompted. Derive it from the authenticated session, never from model output.",
    "CIBA support is uneven. It is common in financial-grade identity providers and less so elsewhere.",
  ],
  participants: [
    { id: "user", label: "User", sub: "On their phone", role: "human" },
    {
      id: "as",
      label: "Authorization server",
      sub: "OpenID provider",
      role: "authz",
    },
    {
      id: "agent",
      label: "Agent",
      sub: "Running in background",
      role: "agent",
    },
    { id: "api", label: "Payments API", role: "resource" },
  ],
  steps: [
    {
      from: "agent",
      kind: "self",
      label: "Reaches a gated action",
      title: "The agent needs approval it does not have",
      body: `The agent’s standing permissions let it read invoices and draft payments. Releasing a payment requires a fresh approval from Alice for this specific payment.`,
    },
    {
      from: "agent",
      to: "as",
      kind: "back",
      label: "Backchannel auth request",
      title: "The agent asks the server to get approval",
      body: `A direct, authenticated call. \`login_hint\` identifies the user. \`binding_message\` is shown on the user’s device so they can match the prompt to the action. With Rich Authorization Requests, \`authorization_details\` carries the transaction in structured form so the resulting token is good for this payment and no other.`,
      code: {
        lang: "http",
        text: `POST /bc-authorize HTTP/1.1
Host: auth.example
Content-Type: application/x-www-form-urlencoded

client_assertion_type=urn:ietf:params:oauth:client-assertion-type:jwt-bearer
&client_assertion=eyJhbGciOiJFUzI1NiJ9…
&scope=openid payments.release
&login_hint=alice@example.com
&binding_message=Pay invoice 1042: $1,250.00 to Acme Ltd
&requested_expiry=300
&authorization_details=[{"type":"payment","invoice":"1042",
   "amount":{"currency":"USD","value":"1250.00"},"payee":"Acme Ltd"}]`,
      },
    },
    {
      from: "as",
      to: "agent",
      kind: "resp",
      label: "auth_req_id, interval",
      title: "The server acknowledges",
      body: `The request is accepted but not decided. The agent receives an identifier for it and is told how often it may ask for the result.`,
      code: {
        lang: "json",
        text: `{
  "auth_req_id": "1c266114-a1be-4252-8ad1-04986c5b9ac1",
  "expires_in": 300,
  "interval": 5
}`,
      },
      gain: [["agent", "auth_req_id"]],
    },
    {
      from: "as",
      to: "user",
      kind: "oob",
      label: "Push: “Pay invoice 1042?”",
      title: "The server contacts the user",
      body: `How is up to the server: a push to an authenticator app, a passkey prompt, a message in a workplace chat tool. What matters is that the channel was set up beforehand between the user and the server, so the agent cannot forge it.`,
    },
    {
      from: "user",
      to: "as",
      kind: "front",
      label: "Authenticate and approve",
      title: "The user approves on their own device",
      body: `The user authenticates (a biometric, a PIN) and approves or denies. They are talking to the authorization server, not the agent. If the details look wrong, denial is one tap.`,
    },
    {
      from: "agent",
      to: "as",
      kind: "back",
      label: "Poll token endpoint",
      title: "The agent collects the result",
      body: `In **poll** mode the agent asks periodically. CIBA also defines **ping** mode (the server calls the agent back when ready, then the agent fetches the token) and **push** mode (the server delivers the token to the agent’s endpoint). Ping suits agents that can receive webhooks.`,
      code: {
        lang: "http",
        text: `POST /token HTTP/1.1
Host: auth.example
Content-Type: application/x-www-form-urlencoded

grant_type=urn:openid:params:grant-type:ciba
&auth_req_id=1c266114-a1be-4252-8ad1-04986c5b9ac1
&client_assertion_type=urn:ietf:params:oauth:client-assertion-type:jwt-bearer
&client_assertion=eyJhbGciOiJFUzI1NiJ9…`,
      },
    },
    {
      from: "as",
      to: "agent",
      kind: "resp",
      label: "Token for this payment",
      title: "The server issues a narrowly scoped token",
      body: `The access token carries the approved \`authorization_details\`. It is short-lived, and it authorizes one payment to one payee for one amount.`,
      gain: [["agent", "access token (invoice 1042 only)"]],
      lose: [["agent", "auth_req_id"]],
    },
    {
      from: "agent",
      to: "api",
      kind: "back",
      label: "Release payment 1042",
      title: "The agent performs the approved action",
      body: `The API checks that the request matches the authorization details in the token. An agent that tries to pay a different amount, or pay twice, is refused.`,
    },
    {
      from: "api",
      to: "agent",
      kind: "resp",
      label: "201 Created",
      title: "Done, with a record of who approved",
      body: `The audit trail links the payment to Alice’s approval at the authorization server, and to the agent that asked for it.`,
    },
  ],
  standards: ["ciba", "rfc9396", "rfc7523", "fapi-2"],
  related: [
    "step-up-authorization",
    "device-authorization",
    "url-elicitation",
    "authorization-code-pkce",
  ],
  notes: [
    {
      title: "Approval is not the same as an agent pausing to ask",
      body: `Many agent frameworks have a “human in the loop” feature where the agent stops and asks the user to confirm in the chat window. That is a useful control, but the agent enforces it, so a compromised or confused agent can skip it. CIBA moves enforcement to the authorization server and the API: without the user’s approval there is no token, and without the token the call fails.`,
    },
  ],
};
