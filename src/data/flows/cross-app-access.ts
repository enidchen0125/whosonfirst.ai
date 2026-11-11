import type { Flow } from "../types";

export const crossAppAccess: Flow = {
  slug: "cross-app-access",
  title: "Enterprise-managed authorization (ID-JAG)",
  short: "Enterprise-managed (ID-JAG)",
  group: "delegation",
  human: "present",
  maturity: "emerging",
  tagline:
    "The company identity provider decides which agents may reach which apps for which employees. No per-app consent screens.",
  summary: `Inside a company, per-user consent is the wrong control. An employee clicking “Allow” twenty times does not give the security team visibility into which AI tools are connected to which systems, and the employee is not the one who should be deciding.

The Identity Assertion JWT Authorization Grant, or ID-JAG, moves the decision to the identity provider the company already uses for single sign-on. The agent signs the user in once. When it needs access to another application, it asks the identity provider for a short-lived assertion aimed at that application’s authorization server. The identity provider applies administrator policy and either issues it or refuses. The agent trades the assertion for an ordinary access token.

No browser redirect, no consent prompt, and one place where access is granted, logged and revoked. Vendors market this as Cross App Access. In MCP it is the official **Enterprise-Managed Authorization** extension.`,
  fits: [
    "Workforce use: employees using an agent with company applications.",
    "The agent and the target application both trust the same enterprise identity provider.",
    "Security teams need central policy and audit over agent-to-app connections.",
  ],
  watchOut: [
    "It only works when both sides are connected to the same identity provider. It is not a mechanism for consumer or cross-organization access.",
    "The identity provider sees and controls token issuance. It does not see what the agent then does with the token.",
    "The underlying IETF specification is still a working group draft, and the MCP extension pins a specific revision. Expect changes.",
    "Support is uneven on both ends: the identity provider must issue ID-JAGs and each application’s authorization server must accept them.",
  ],
  lesson: "chains",
  phases: [
    {
      title: "The user signs in through the company identity provider",
      from: 1,
    },
    {
      title: "The agent asks for a grant, and the identity provider decides",
      from: 2,
    },
    {
      title: "The agent trades the grant at the app’s authorization server",
      from: 5,
    },
    {
      title: "The agent calls the MCP server, and the server checks the token",
      from: 8,
    },
  ],
  parts: {
    client:
      "Signs the user in once through the company identity provider. For each application it needs, asks the identity provider for a short-lived grant, trades it at that application’s authorization server for an access token, and uses the token like any other MCP access token. It authenticates to that authorization server as a client, either registered in advance or identified by a URL.",
    idp: "Signs the user in, then decides each request by the administrator’s policy: may this client reach that application, for this user, with these scopes? Issues a short-lived grant or refuses. An administrator configures the answer, and the user is not asked.",
    as: "Validates the grant: the identity provider’s signature, that it is the intended audience, that the client matches, and that the grant has not expired or been used. Then issues an ordinary access token restricted to the MCP server the grant names. It trusts the identity provider because the company’s tenant was configured for single sign-on with it.",
    mcp: "Validates the access token exactly as it would one obtained through an interactive flow. It does not need to know the difference.",
  },
  participants: [
    { id: "client", label: "Agent", sub: "MCP client", role: "agent" },
    {
      id: "idp",
      label: "Enterprise IdP",
      sub: "Single sign-on",
      role: "authz",
    },
    { id: "as", label: "Resource AS", sub: "The app’s own", role: "authz" },
    { id: "mcp", label: "MCP server", sub: "The app", role: "resource" },
  ],
  steps: [
    {
      from: "client",
      to: "idp",
      kind: "front",
      label: "Single sign-on (OIDC)",
      title: "The user signs in to the agent through the company IdP",
      body: `An ordinary OpenID Connect login, the same one used for every other workplace application. The agent receives an ID token asserting who the user is.`,
      gain: [["client", "ID token"]],
    },
    {
      from: "client",
      to: "idp",
      kind: "back",
      label: "Token exchange: request ID-JAG",
      title: "The agent asks the IdP for an assertion aimed at the app",
      body: `A token exchange (RFC 8693) at the identity provider. The ID token is the subject. \`audience\` is the issuer of the application’s authorization server; \`resource\` is the MCP server itself.`,
      code: {
        lang: "http",
        text: `POST /oauth2/token HTTP/1.1
Host: acme.idp.example
Content-Type: application/x-www-form-urlencoded

grant_type=urn:ietf:params:oauth:grant-type:token-exchange
&requested_token_type=urn:ietf:params:oauth:token-type:id-jag
&audience=https://auth.chat.example/
&resource=https://mcp.chat.example/
&scope=chat.read chat.history
&subject_token=eyJraWQiOiJzMTZ0cVNtODhwREo4VGZCXzdrSEtQ…
&subject_token_type=urn:ietf:params:oauth:token-type:id_token
&client_id=2ec954a1d60620116d36d9ceb7
&client_secret=…`,
      },
    },
    {
      from: "idp",
      kind: "self",
      label: "Admin policy check",
      title: "The IdP applies the administrator’s policy",
      body: `Is this client allowed to reach that application, for this user, with these scopes? The answer was configured by an administrator. The user is not asked.`,
    },
    {
      from: "idp",
      to: "client",
      kind: "resp",
      label: "ID-JAG (5 minutes)",
      title: "The IdP issues the grant",
      body: `A signed JWT with its own type, so it cannot be mistaken for an ID token or an access token. It is not usable at the MCP server. Its only purpose is to be presented to the application’s authorization server.`,
      code: {
        lang: "json",
        text: `// header: { "typ": "oauth-id-jag+jwt" }
{
  "jti": "9e43f81b64a33f20116179",
  "iss": "https://acme.idp.example",
  "sub": "U019488227",
  "aud": "https://auth.chat.example/",
  "resource": "https://mcp.chat.example/",
  "client_id": "f53f191f9311af35",
  "scope": "chat.read chat.history",
  "exp": 1311281970,
  "iat": 1311280970
}`,
      },
      gain: [["client", "ID-JAG (aud: resource AS)"]],
    },
    {
      from: "client",
      to: "as",
      kind: "back",
      label: "JWT bearer grant with ID-JAG",
      title: "The agent presents the grant to the app’s authorization server",
      body: `A standard JWT bearer grant (RFC 7523). The agent authenticates as a client of this authorization server, either pre-registered or by using a Client ID Metadata Document URL as its client ID.`,
      code: {
        lang: "http",
        text: `POST /oauth2/token HTTP/1.1
Host: auth.chat.example
Content-Type: application/x-www-form-urlencoded

grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer
&assertion=eyJhbGciOiJIUzI1NiIsI…
&client_id=https://client.example.com/client.json`,
      },
      lose: [["client", "ID-JAG (aud: resource AS)"]],
    },
    {
      from: "as",
      kind: "self",
      label: "Verify IdP signature and audience",
      title: "The app’s authorization server validates the grant",
      body: `It trusts the enterprise IdP because the company’s tenant was configured for single sign-on with it. It checks the signature, that it is the intended audience, that the client matches, and that the grant has not expired or been used.`,
    },
    {
      from: "as",
      to: "client",
      kind: "resp",
      label: "Access token for the MCP server",
      title: "An ordinary access token comes back",
      body: `Audience-restricted to the MCP server named in the grant’s \`resource\` claim. From here the agent uses it like any other MCP access token.`,
      gain: [["client", "access token (aud: MCP server)"]],
    },
    {
      from: "client",
      to: "mcp",
      kind: "back",
      label: "MCP request + Bearer token",
      title: "The agent calls the application",
      body: `The MCP server validates the token exactly as it would one obtained through an interactive flow. It does not need to know the difference.`,
    },
    {
      from: "mcp",
      to: "client",
      kind: "resp",
      label: "Result",
      title: "The application responds",
      body: `When the employee leaves, or the administrator withdraws the agent’s access to this application, the identity provider stops issuing grants. Nothing has to be revoked application by application.`,
    },
  ],
  standards: [
    "id-jag",
    "mcp-ema",
    "rfc8693",
    "rfc7523",
    "identity-chaining",
    "cimd",
  ],
  related: [
    "mcp-authorization",
    "token-exchange",
    "identity-chaining",
    "authorization-code-pkce",
  ],
  notes: [
    {
      title: "How this differs from token exchange",
      body: `In plain [token exchange](/flows/token-exchange/) one authorization server issues both tokens. Here there are two: the identity provider issues a grant, and a different authorization server turns it into an access token. That split is what lets it cross between applications from different vendors. ID-JAG is a profile of the more general [identity chaining](/flows/identity-chaining/) pattern.`,
    },
  ],
};
