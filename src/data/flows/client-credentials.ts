import type { Flow } from "../types";

export const clientCredentials: Flow = {
  slug: "client-credentials",
  title: "Client credentials",
  short: "Client credentials",
  group: "autonomous",
  human: "absent",
  maturity: "stable",
  tagline:
    "The agent authenticates as itself. No user, no consent screen, no one to ask.",
  summary: `When an agent runs on a schedule, reacts to an event, or does work that belongs to an organization rather than a person, there is no user to redirect. The agent is the principal. It proves its own identity to the authorization server and receives a token whose subject is the agent.

The grant is trivial. The hard part is the credential the agent uses to authenticate. A static client secret in an environment variable is a long-lived password that never gets rotated and leaks into logs, images and model context. A signed assertion from a key the agent holds is better. A platform-issued workload identity the agent never has to store is better still.`,
  fits: [
    "No user is involved: batch jobs, monitors, scheduled research, back-office automation.",
    "The agent acts with its **own** permissions, which an administrator granted in advance.",
    "Both sides belong to the same organization, or have a pre-arranged trust relationship.",
  ],
  watchOut: [
    "An agent that serves many users with one service identity is a confused deputy waiting to happen. If user A can talk the agent into fetching user B’s data, the API cannot stop it: the token says “agent,” not “user A.”",
    "Client secrets are the most common credential found in agent prompts, traces and repositories. Prefer `private_key_jwt` or [workload identity federation](/flows/workload-identity-federation/).",
    "There is no consent step, so scopes are whatever an admin configured. Review them as you would a service account’s IAM role.",
    "No refresh token is issued; the agent just asks again. Keep access tokens short-lived so revoking the client takes effect quickly.",
  ],
  participants: [
    { id: "agent", label: "Agent", sub: "Confidential client", role: "agent" },
    { id: "as", label: "Authorization server", role: "authz" },
    { id: "api", label: "API", sub: "Resource server", role: "resource" },
  ],
  steps: [
    {
      from: "agent",
      kind: "self",
      label: "Sign a client assertion",
      title: "The agent creates a signed proof of its identity",
      body: `Instead of sending a shared secret, the agent signs a short-lived JWT with its private key. Issuer and subject are both the client ID; the audience is the authorization server; \`jti\` makes it single-use. The private key never leaves the agent.`,
      code: {
        lang: "json",
        text: `{
  "iss": "invoice-agent",
  "sub": "invoice-agent",
  "aud": "https://auth.example",
  "jti": "b1f7c2a0-5d1e-4c8e-9f3a-0d6b8e1a2c44",
  "iat": 1794268800,
  "exp": 1794268860
}`,
      },
      gain: [["agent", "private key"]],
    },
    {
      from: "agent",
      to: "as",
      kind: "back",
      label: "Token request with assertion",
      title: "The agent requests a token",
      body: `One direct call. The \`resource\` parameter asks for a token that is valid for one API only.`,
      code: {
        lang: "http",
        text: `POST /token HTTP/1.1
Host: auth.example
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials
&scope=invoices.read invoices.reconcile
&resource=https://erp.example/api
&client_assertion_type=urn:ietf:params:oauth:client-assertion-type:jwt-bearer
&client_assertion=eyJhbGciOiJFUzI1NiJ9…`,
      },
    },
    {
      from: "as",
      kind: "self",
      label: "Verify assertion, apply policy",
      title: "The authorization server authenticates the client",
      body: `It verifies the signature against the public key registered for this client, checks audience, expiry and replay, then decides which of the requested scopes this client is allowed. There is no user to ask, so policy is the only gate.`,
    },
    {
      from: "as",
      to: "agent",
      kind: "resp",
      label: "Access token (sub = agent)",
      title: "The server issues an access token",
      body: `The subject of the token is the client itself. Nothing in it refers to a human.`,
      code: {
        lang: "json",
        text: `{
  "iss": "https://auth.example",
  "sub": "invoice-agent",
  "client_id": "invoice-agent",
  "aud": "https://erp.example/api",
  "scope": "invoices.read invoices.reconcile",
  "exp": 1794269400
}`,
      },
      gain: [["agent", "access token"]],
    },
    {
      from: "agent",
      to: "api",
      kind: "back",
      label: "API call with Bearer token",
      title: "The agent calls the API",
      body: `An ordinary bearer request.`,
    },
    {
      from: "api",
      kind: "self",
      label: "Validate; authorize the client",
      title: "The API authorizes a service, not a person",
      body: `The API must treat this as a machine caller. Row-level rules that depend on “the current user” have nothing to bind to. If the agent is doing something for a particular user, that fact has to arrive some other way, and a request parameter the agent filled in is not evidence.`,
    },
    {
      from: "api",
      to: "agent",
      kind: "resp",
      label: "200 OK",
      title: "The API responds",
      body: `The audit log records the agent’s client ID. If several replicas, runs or sub-agents share that ID, the log cannot tell them apart. Workload identity systems such as [SPIFFE](/flows/spiffe-workload-identity/) address this by giving each workload its own identity.`,
    },
  ],
  standards: [
    "rfc6749",
    "rfc7523",
    "rfc8707",
    "rfc9068",
    "mcp-client-credentials",
  ],
  related: [
    "workload-identity-federation",
    "spiffe-workload-identity",
    "dpop",
    "token-exchange",
  ],
};
