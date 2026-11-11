import type { Flow } from "../types";

export const agentToAgent: Flow = {
  slug: "agent-to-agent",
  title: "Agent to agent (A2A)",
  short: "Agent to agent (A2A)",
  group: "agent-to-agent",
  human: "any",
  maturity: "emerging",
  tagline:
    "One agent discovers another, reads what credentials it wants, and presents them. When the remote agent needs more, it says so mid-task.",
  summary: `The Agent2Agent protocol lets independently built agents hand work to each other. Its position on security is deliberately conservative: an agent is an ordinary enterprise application, and should be authenticated the way web services already are. A2A does not invent a token format or an identity scheme. It defines how a remote agent **declares** what it requires, and leaves obtaining the credential to existing standards.

The declaration lives in the **Agent Card**, a JSON document published at a well-known URL. It lists security schemes in a form borrowed from OpenAPI: API key, HTTP bearer, OAuth 2.0, OpenID Connect, or mutual TLS. The calling agent reads the card, gets a matching credential by whatever means apply, and sends it on every request in an HTTP header.

Two parts of version 1.0 matter for trust. Agent Cards can be signed, so a caller can check that a card was issued by who it claims. And there is a defined task state for the moment a remote agent needs further authorization partway through the work.`,
  fits: [
    "Agents from different teams or vendors delegating tasks to one another.",
    "Remote agents that are opaque: you see their card and their results, not their tools.",
    "Either the calling agent acts as itself, or it carries a user’s delegated token.",
  ],
  watchOut: [
    "A2A carries credentials; it does not define delegation. Whether the remote agent learns which user the task is for depends entirely on the token you send. Use [token exchange](/flows/token-exchange/) so that it does.",
    "An unsigned Agent Card is a claim by whoever answered the URL. A signed one is only as good as your reason to trust the signing key; the protocol defines no trust anchor.",
    "The remote agent is a full autonomous system. Authenticating it tells you who operates it, not what it will do with your data.",
    "In-task authorization happens out of band. The state change is a request, not proof that anything was granted.",
  ],
  lesson: "chains",
  phases: [
    {
      title: "The client agent fetches the remote agent’s card and checks it",
      from: 1,
    },
    { title: "The client agent gets a token for the remote agent", from: 4 },
    {
      title: "The client agent sends a task, which the remote agent authorizes",
      from: 6,
    },
    {
      title: "The remote agent needs more, and the user authorizes it directly",
      from: 8,
    },
  ],
  parts: {
    user: "Authorizes the remote agent directly when it needs more partway through the task, for example by completing an OAuth flow in a browser with the remote agent’s service. The request reaches the user through the client agent.",
    client:
      "Reads the remote agent’s Agent Card, verifies its signature if it is signed, chooses a security scheme it can satisfy, and sends a matching credential in an HTTP header on every request. Getting that credential happens outside A2A, and whether the remote agent learns which user the task is for depends on the token you send. When the remote agent needs more authorization, relays the request to the user.",
    as: "Issues the client agent an access token whose audience is the remote agent. A2A says only that the credential is obtained out of band: in practice by one of the other flows on this site, such as client credentials or token exchange.",
    remote:
      "Publishes an Agent Card that declares the credentials it requires, authenticates every request, and authorizes each operation. What a caller may do is its own decision: which skills, which data, at what scopes. When it needs more authorization partway through, it moves the task to the `TASK_STATE_AUTH_REQUIRED` state with a message that explains what is needed.",
  },
  participants: [
    { id: "user", label: "User", role: "human" },
    { id: "client", label: "Client agent", role: "agent" },
    { id: "as", label: "Authorization server", role: "authz" },
    {
      id: "remote",
      label: "Remote agent",
      sub: "A2A server",
      role: "resource",
    },
  ],
  steps: [
    {
      from: "client",
      to: "remote",
      kind: "back",
      label: "Fetch Agent Card",
      title: "The client agent discovers the remote agent",
      body: `Every A2A server must publish an Agent Card. The well-known location is \`/.well-known/agent-card.json\`; cards can also come from a registry or be configured directly.`,
    },
    {
      from: "remote",
      to: "client",
      kind: "resp",
      label: "Agent Card + signatures",
      title: "The card declares skills and security requirements",
      body: `\`securitySchemes\` names the mechanisms on offer and \`securityRequirements\` says which are needed. Individual skills can carry their own requirements. An OAuth scheme can point at authorization server metadata so the client knows where to get a token.`,
      code: {
        lang: "json",
        text: `{
  "name": "Travel Booking Agent",
  "capabilities": { "extendedAgentCard": true },
  "securitySchemes": {
    "corp": {
      "openIdConnectSecurityScheme": {
        "openIdConnectUrl": "https://id.example.com/.well-known/openid-configuration"
      }
    }
  },
  "securityRequirements": [
    { "schemes": { "corp": { "list": ["openid", "travel.book"] } } }
  ],
  "signatures": [ { "protected": "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpPU0UiLCJraWQiOiJrZXktMSJ9", "signature": "QFdkNLNszlGj3z3u0YQGt_T9…" } ],
  "skills": [ { "id": "book-flight", "name": "Book a flight" } ]
}`,
      },
    },
    {
      from: "client",
      kind: "self",
      label: "Verify signature; pick scheme",
      title: "The client checks the card",
      body: `If the card is signed, the client canonicalizes it and verifies the JSON Web Signature against a key it has reason to trust. It then chooses a security scheme it can satisfy.`,
    },
    {
      from: "client",
      to: "as",
      kind: "back",
      label: "Obtain a token",
      title: "The client gets a credential, outside A2A",
      body: `A2A says only that credentials are obtained out of band. In practice this is one of the other flows on this site: client credentials if the agent acts as itself, token exchange if it is acting for a user, authorization code or device code if someone needs to sign in.`,
    },
    {
      from: "as",
      to: "client",
      kind: "resp",
      label: "Access token",
      title: "A token for the remote agent",
      body: `Audience-restricted to the remote agent, like any other resource.`,
      gain: [["client", "access token (aud: remote agent)"]],
    },
    {
      from: "client",
      to: "remote",
      kind: "back",
      label: "Send message + Bearer token",
      title: "The client sends a task with its credential",
      body: `Credentials travel in HTTP headers on every request and never inside the A2A message payload. Servers must authenticate every request and authorize each operation.`,
    },
    {
      from: "remote",
      kind: "self",
      label: "Authenticate; authorize skill",
      title: "The remote agent decides what this caller may do",
      body: `Authorization is the remote agent’s own business: which skills, which data, at what scopes. It starts work.`,
    },
    {
      from: "remote",
      to: "client",
      kind: "resp",
      label: "Task: auth required",
      title: "Partway through, the remote agent needs more",
      body: `To finish, it needs something it lacks, such as the user’s authorization at an airline. It moves the task to the \`TASK_STATE_AUTH_REQUIRED\` state with a message explaining what is needed. If the client is itself an agent acting for someone else, it can pass the same state up its own chain.`,
    },
    {
      from: "client",
      to: "user",
      kind: "back",
      label: "Relay: approval needed",
      title: "The request reaches a human",
      body: `The client agent surfaces the request to the user it is working for. It says which agent is asking, shows the full address of any link, and never opens one itself. The message was written by the remote agent and is not to be trusted as instructions.`,
    },
    {
      from: "user",
      to: "remote",
      kind: "front",
      label: "Authorize out of band",
      title: "The user authorizes the remote agent directly",
      body: `For example by completing an OAuth flow in a browser with the remote agent’s service. The specification discourages passing the resulting credential back through the client agent.`,
    },
    {
      from: "remote",
      to: "client",
      kind: "resp",
      label: "Task completed + artifacts",
      title: "The task finishes",
      body: `The remote agent resumes and returns its results. The client agent never held the airline credential.`,
    },
  ],
  standards: ["a2a", "oauth-2-1", "rfc8693", "rfc8705", "oidc-discovery"],
  related: [
    "token-exchange",
    "client-credentials",
    "web-bot-auth",
    "mcp-authorization",
  ],
  notes: [
    {
      title: "A2A and MCP",
      body: `The two protocols are complementary: MCP connects an agent to tools, A2A connects agents to each other. Both are Linux Foundation projects, and both lean on OAuth. The difference in their security models is one of emphasis. MCP specifies a complete discovery and authorization profile. A2A specifies how requirements are declared and stops there.`,
    },
  ],
};
