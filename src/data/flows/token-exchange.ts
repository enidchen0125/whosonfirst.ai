import type { Flow } from "../types";

export const tokenExchange: Flow = {
  slug: "token-exchange",
  title: "Token exchange (on-behalf-of)",
  short: "Token exchange",
  group: "delegation",
  human: "any",
  maturity: "stable",
  tagline:
    "Trade the token you were given for a new one that names both the user and the service now acting for them.",
  summary: `An agent calls a tool. The tool needs to call something else to do its job. What credential does it use? Forwarding the token it received is the tempting answer and the wrong one: that token was issued for the tool, not for the downstream API, and passing it along makes every hop a place where it can be stolen and replayed.

Token exchange is the standard alternative. The middle service presents the token it received and asks the authorization server for a new token aimed at the next hop. The new token can keep the user as its subject while adding an \`act\` claim that names the service acting for them. Downstream, the API can see the whole story: who this is for, and who is doing it.`,
  fits: [
    "A tool, MCP server or sub-agent must call another API **for the same user**.",
    "All hops trust the same authorization server (or servers that trust each other).",
    "You need downstream audit logs to distinguish the user from the software acting for them.",
  ],
  watchOut: [
    "**Impersonation versus delegation.** If the new token has the user as `sub` and no `act` claim, the downstream API believes the user is calling directly. That is impersonation. Sometimes it is what you want; you should know which one you are getting.",
    "RFC 8693 defines the mechanism and leaves policy open. Which clients may exchange which tokens for which audiences is yours to configure, and the default in many products is “anything”.",
    "Each exchange should narrow scope, never widen it.",
    "Support differs between vendors in which parameters are honoured and whether `act` is emitted. Test with the tokens you will really get.",
  ],
  participants: [
    { id: "agent", label: "Agent", sub: "Has user’s token", role: "agent" },
    { id: "tool", label: "Tool server", sub: "Middle tier", role: "agent" },
    { id: "as", label: "Authorization server", role: "authz" },
    { id: "api", label: "Downstream API", role: "resource" },
  ],
  steps: [
    {
      from: "agent",
      to: "tool",
      kind: "back",
      label: "Call tool with user’s token",
      title: "The agent calls a tool for the user",
      body: `The agent already holds an access token obtained with the user’s consent. Its audience is the tool server.`,
      code: {
        lang: "json",
        text: `{
  "iss": "https://auth.example",
  "sub": "user:alice",
  "client_id": "research-agent",
  "aud": "https://tools.example/mcp",
  "scope": "reports.generate"
}`,
      },
      gain: [["agent", "token A (aud: tool)"]],
    },
    {
      from: "tool",
      kind: "self",
      label: "Validate; needs downstream data",
      title: "The tool validates the token and hits a wall",
      body: `The token is valid here. But to build the report the tool must read from a data warehouse, and token A is not addressed to the warehouse. The tool must not forward it. The MCP specification forbids this outright, calling it token passthrough.`,
      gain: [["tool", "token A (aud: tool)"]],
    },
    {
      from: "tool",
      to: "as",
      kind: "back",
      label: "Token exchange request",
      title: "The tool asks for a token for the next hop",
      body: `The tool authenticates as itself and presents token A as the \`subject_token\`. It names the audience it needs and the narrowest scope that will do.`,
      code: {
        lang: "http",
        text: `POST /token HTTP/1.1
Host: auth.example
Content-Type: application/x-www-form-urlencoded
Authorization: Basic <tool server credentials>

grant_type=urn:ietf:params:oauth:grant-type:token-exchange
&subject_token=<token A>
&subject_token_type=urn:ietf:params:oauth:token-type:access_token
&resource=https://warehouse.example/api
&scope=sales.read`,
      },
    },
    {
      from: "as",
      kind: "self",
      label: "Policy: may tool act for user?",
      title: "The authorization server decides",
      body: `This is the control point. The server checks that token A is valid, that this client is allowed to exchange tokens, that the requested audience is permitted for it, and that the requested scope does not exceed what the user originally granted.`,
    },
    {
      from: "as",
      to: "tool",
      kind: "resp",
      label: "Token B: sub=user, act=tool",
      title: "A new token that records the delegation",
      body: `Token B is addressed to the warehouse. Its subject is still Alice. The \`act\` claim says the tool server is the party actually presenting it. If the tool calls yet another service and exchanges again, the previous actor is nested inside the new one, so the chain is preserved.`,
      code: {
        lang: "json",
        text: `{
  "iss": "https://auth.example",
  "sub": "user:alice",
  "aud": "https://warehouse.example/api",
  "scope": "sales.read",
  "exp": 1794269100,
  "act": {
    "sub": "https://tools.example/mcp"
  }
}`,
      },
      gain: [["tool", "token B (aud: API, act: tool)"]],
    },
    {
      from: "tool",
      to: "api",
      kind: "back",
      label: "Call with token B",
      title: "The tool calls the downstream API",
      body: `Token A stays where it is. Only token B crosses this boundary.`,
    },
    {
      from: "api",
      kind: "self",
      label: "Check aud; read sub and act",
      title: "The API sees both parties",
      body: `The warehouse can apply Alice’s row-level permissions **and** a rule such as “the reporting tool may read sales data but not payroll”, and can log both identities.`,
    },
    {
      from: "api",
      to: "tool",
      kind: "resp",
      label: "Data",
      title: "The API responds",
      body: `The response goes to the tool.`,
    },
    {
      from: "tool",
      to: "agent",
      kind: "resp",
      label: "Tool result",
      title: "The tool returns its result",
      body: `The agent never held a credential for the warehouse. If the agent’s context is compromised, the attacker gets token A, which is good only at the tool.`,
    },
  ],
  standards: ["rfc8693", "rfc8707", "rfc9068", "mcp-authorization"],
  related: [
    "cross-app-access",
    "identity-chaining",
    "transaction-tokens",
    "authorization-code-pkce",
  ],
  notes: [
    {
      title: "Where the agent shows up",
      body: `In this picture the agent appears in token A as \`client_id\` and vanishes from token B unless the authorization server carries it forward. Several current drafts are about exactly this gap: how to represent an agent, as distinct from the application hosting it, in the \`act\` chain. See the [standards tracker](/standards/?topic=delegation).`,
    },
  ],
};
