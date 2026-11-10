import type { Flow } from "../types";

export const transactionTokens: Flow = {
  slug: "transaction-tokens",
  title: "Transaction tokens",
  short: "Transaction tokens",
  group: "delegation",
  human: "any",
  maturity: "emerging",
  tagline:
    "Inside your own infrastructure, replace the access token with a short-lived token that pins down one transaction and travels the whole call chain.",
  summary: `A request arrives at your edge with an access token. Behind the edge are an agent, the tools it calls, and the services those tools call. If the access token is passed along, every one of those services holds a credential that works at the front door. If each hop calls the others with only its own service identity, the downstream services have no idea who the request is for.

A transaction token sits between those two failures. At the edge, the external token is exchanged for a signed, short-lived token that records who the request is for, which workload asked, and the fixed details of what was requested. That token is passed unchanged from service to service inside one trust domain. Services can read it and make decisions on it, but they cannot alter the context, and the token is useless outside.

For agent systems this is a way to keep the user’s intent attached to a request as an LLM fans it out across tools, without handing the model’s surroundings a reusable credential.`,
  fits: [
    "Multi-service backends where an agent’s tool calls fan out through several internal hops.",
    "You need every hop to know the original user and request, and to be unable to change them.",
    "A single trust domain, with workload identity already in place between services.",
  ],
  watchOut: [
    "Transaction tokens do not authenticate the hop. Pair them with workload identity (mutual TLS or workload tokens) so each service knows which peer is calling.",
    "They are for use **inside** a trust domain. Crossing to another domain is a job for [identity chaining](/flows/identity-chaining/).",
    "The transaction token service becomes critical infrastructure: every request depends on it, and it must be told the truth about request context.",
    "How agent-specific context should be represented is still being worked out in individual drafts.",
  ],
  participants: [
    { id: "edge", label: "Gateway", sub: "Trust domain edge", role: "infra" },
    { id: "tts", label: "Txn-token service", role: "authz" },
    { id: "agent", label: "Agent service", role: "agent" },
    { id: "tool", label: "Tool service", sub: "Internal", role: "resource" },
  ],
  steps: [
    {
      from: "edge",
      kind: "self",
      label: "Request arrives + access token",
      title: "An external request reaches the edge",
      body: `The gateway validates the caller’s access token in the normal way. This is the last place that token should be seen.`,
      gain: [["edge", "external access token"]],
    },
    {
      from: "edge",
      to: "tts",
      kind: "back",
      label: "Request a Txn-Token",
      title: "The gateway asks for a transaction token",
      body: `A profile of token exchange. The gateway authenticates as a workload, presents the access token as the subject, and supplies details of the request.`,
      code: {
        lang: "http",
        text: `POST /txn-token-service/token_endpoint HTTP/1.1
Host: txn-token-service.trust-domain.example
Content-Type: application/x-www-form-urlencoded

grant_type=urn:ietf:params:oauth:grant-type:token-exchange
&requested_token_type=urn:ietf:params:oauth:token-type:txn_token
&audience=trust-domain.example
&scope=trade.stocks
&subject_token=<external access token>
&subject_token_type=urn:ietf:params:oauth:token-type:access_token
&request_context={"req_ip":"69.151.72.123","authn":"face"}
&request_details={"action":"BUY","ticker":"MSFT","quantity":"100"}`,
      },
    },
    {
      from: "tts",
      kind: "self",
      label: "Validate; fix the context",
      title: "The service validates and freezes the transaction context",
      body: `It checks the subject token and the requester, then writes the context into the token it signs. From here on those details cannot be changed by anything downstream.`,
    },
    {
      from: "tts",
      to: "edge",
      kind: "resp",
      label: "Txn-Token (minutes)",
      title: "A transaction token is issued",
      body: `The header type is \`txntoken+jwt\`. \`txn\` identifies the transaction, \`sub\` the user, \`req_wl\` the workload that asked for the token, \`rctx\` the circumstances of the request, and \`tctx\` its fixed parameters. The audience is the trust domain itself.`,
      code: {
        lang: "json",
        text: `{
  "iat": 1686536226,
  "exp": 1686536586,
  "aud": "trust-domain.example",
  "txn": "97053963-771d-49cc-a4e3-20aad399c312",
  "sub": "d084sdrt234fsaw34tr23t",
  "req_wl": "apigateway.trust-domain.example",
  "rctx": { "req_ip": "69.151.72.123", "authn": "face" },
  "scope": "trade.stocks",
  "tctx": { "action": "BUY", "ticker": "MSFT", "quantity": "100" }
}`,
      },
      gain: [["edge", "Txn-Token"]],
    },
    {
      from: "edge",
      to: "agent",
      kind: "back",
      label: "Call + Txn-Token header",
      title: "The request continues without the access token",
      body: `The gateway forwards the request with the transaction token in the \`Txn-Token\` header. The external access token is dropped here.`,
      lose: [["edge", "external access token"]],
      gain: [["agent", "Txn-Token"]],
    },
    {
      from: "agent",
      kind: "self",
      label: "Verify; read context",
      title: "The agent service verifies the token",
      body: `Signature, audience, expiry. The agent now knows the user and the approved action without holding anything it could use to start a different transaction.`,
    },
    {
      from: "agent",
      to: "tool",
      kind: "back",
      label: "Tool call + same Txn-Token",
      title: "The same token travels to the next hop",
      body: `The agent authenticates to the tool as itself with its workload identity, and attaches the unmodified transaction token. Two questions, two credentials: which service is calling, and what transaction this is part of.`,
      gain: [["tool", "Txn-Token"]],
    },
    {
      from: "tool",
      kind: "self",
      label: "Verify; authorize on context",
      title: "The tool enforces the original intent",
      body: `The tool can refuse anything that does not match \`tctx\`. If a prompt injection has convinced the agent to sell instead of buy, the tool sees a request that contradicts the signed transaction and rejects it.`,
    },
    {
      from: "tool",
      to: "agent",
      kind: "resp",
      label: "Result",
      title: "Results flow back",
      body: `The token expires within minutes. A copy found in a log is of little use: wrong time, and no value outside the trust domain.`,
    },
  ],
  standards: [
    "txn-tokens",
    "rfc8693",
    "txn-tokens-agents",
    "wimse-arch",
    "wimse-aims",
  ],
  related: [
    "token-exchange",
    "identity-chaining",
    "wimse-workload-tokens",
    "spiffe-workload-identity",
  ],
  notes: [
    {
      title: "Where this stands",
      body: `The transaction tokens draft has been through repeated working group last calls and is waiting for its write-up before going to the IESG. A separate individual draft proposes agent-specific context for the token, so that each agent in a chain is recorded as the request moves. Its claim design changed during 2026, which is a fair signal of how settled it is.`,
    },
  ],
};
