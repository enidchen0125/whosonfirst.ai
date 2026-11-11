import type { Flow } from "../types";

// Follows draft-hardt-oauth-aauth-protocol-11 (25 September 2026) and
// draft-hardt-httpbis-signature-key-09. Section numbers in comments are the protocol draft's.
// The person token, and with it most of this diagram, is new in -11: recheck every step
// against the change log when the revision moves (docs/source-review.md).
export const aauth: Flow = {
  slug: "aauth",
  title: "Signed agent requests with a person server (AAuth)",
  short: "AAuth",
  group: "human-in-the-loop",
  human: "reachable",
  maturity: "experimental",
  tagline:
    "The agent has a key of its own and signs every request. A server the user chose tells the API who the agent acts for and what they approved.",
  summary: `In most OAuth deployments an agent is a client that someone registered: an identifier one authorization server issued and no other recognizes. That suits software whose APIs are known before it ships. An agent finds its APIs as it works, in organizations where nobody has registered it.

AAuth starts from the other end. It is not an OAuth extension. It is a separate protocol, written by the editor of the OAuth 2.0 specification. Each agent has its own key pair and an identifier that anyone can check, and it signs every request it makes. Every token in the protocol is bound to that key, so none of them is a bearer token. The user is represented by a **person server**, which they choose. It tells an API which person the agent acts for, asks that person when something needs their approval, and issues the token that records the answer.

AAuth is an individual draft in its eleventh revision, which is why this page is rated experimental. An unrelated OAuth draft, the Agentic Authorization Grant, goes by the same short name. This page is not about that one.`,
  fits: [
    "Agents that find APIs at runtime, in organizations where they were never registered.",
    "APIs that want to know which person a request is for without keeping a registry of agents or running a sign-in of their own.",
    "People and companies that want one place to see, approve and revoke what their agents do across services.",
    "Prototypes and interoperability tests. Nothing here is settled enough to build a product on.",
  ],
  watchOut: [
    "**It is an individual draft, and it is still being redesigned.** The person token, which every step of this diagram depends on, first appeared in the current revision. That revision also renamed endpoints and removed claims. The draft lists four implementations and calls each of them exploratory.",
    "**The API never learns which agent is calling.** In the arrangement drawn it sees a person, a scope and a key. No token it reads names the agent or the agent’s provider, and that is deliberate. A rule such as “only agents from this vendor” cannot be enforced here.",
    "**Check the token’s type.** A person token and an auth token from the same person server carry the same issuer, audience, subject and key. Only `typ` tells them apart. An API that skips that check treats “this is Alice’s agent” as “Alice approved this.” The draft says to test for the mistake, because it fails open.",
    "**Any person server can speak to any API.** Nothing is arranged between them beforehand. A person token shows that the same person is back, under the same issuer and subject. It does not show who they are, or that anyone checked. Key your records on issuer and subject together, and decide what a newcomer may do.",
    "**The agent writes its own justification**, and the user reads it when deciding. The person server has to show it as the agent’s claim, apart from the API’s own description of the access. An agent that has been talked into something will still give a reasonable-sounding reason.",
    "**The signature covers less than it seems.** By default: the method, the host, the path and the token presented. The query string and the body are covered only if the API says they must be.",
  ],
  lesson: "whose-authority",
  phases: [
    {
      title: "The agent starts with a key of its own and a token that names it",
      from: 1,
    },
    {
      title: "The person server gives the agent a token that names its person",
      from: 2,
    },
    {
      title:
        "The API learns who the agent acts for, and writes down what it needs",
      from: 4,
    },
    {
      title: "The person server asks the user, then issues a token",
      from: 6,
    },
    {
      title: "The agent signs its request, and the API checks token and key",
      from: 12,
    },
  ],
  parts: {
    user: "Chooses a person server and connects each agent to it once. After that, approves or refuses requests on the person server’s own page, where the API’s description of the access and the agent’s stated reason are shown apart. The person server sees every request for access that their agents make, and its word is taken wherever they go. The choice of one matters.",
    ps: "Checks the agent’s signature and agent token on every call, and keeps each agent bound to exactly one person. Issues a person token for one API at a time, under an identifier it uses for that person at that API. When the agent brings a resource token, checks that it matches the person token and the agent’s key, asks the user if it needs to, and issues an auth token that lasts no longer than the tokens behind it. Publishes its keys where any API can fetch them.",
    agent:
      "Generates a key pair and keeps the private key outside the model’s reach. Gets an agent token from its provider and renews it. Signs every request, presenting the token the recipient needs: the agent token to the person server, the person token and then the auth token to the API. Checks each resource token before passing it on: that it came from the API just called, and that it names the agent’s own key and person server. Treats `202` from any endpoint as an instruction to poll.",
    api: "Verifies the signature on every request, then the token presented with it: its type, its issuer’s published keys, that it was issued for this API, and that its key is the one that signed. Issues a resource token only after verifying a person token or an auth token. On the call itself, requires an auth token and not a person token, then applies its own policy to the person and scope it names. Says which parts of a request must be signed beyond the method, host and path. Needs no registry of agents and no sign-in page.",
  },
  participants: [
    { id: "user", label: "User", sub: "AAuth: person", role: "human" },
    {
      id: "ps",
      label: "Person server",
      sub: "Chosen by the user",
      role: "authz",
    },
    { id: "agent", label: "Agent", sub: "Has its own key", role: "agent" },
    {
      id: "api",
      label: "Calendar API",
      sub: "AAuth: resource",
      role: "resource",
    },
  ],
  steps: [
    {
      from: "agent",
      kind: "self",
      label: "Key pair and agent token",
      title: "The agent starts with a key and a name",
      // §4.1, §5.1 to §5.3
      body: `The agent generates a key pair and proves itself to its **agent provider**: the service that stands behind it, such as a vendor’s backend or a company’s platform. A self-hosted agent is its own provider. How the agent proves itself depends on where it runs, and a companion draft covers that.

The provider returns an **agent token**. It binds the public key to an identifier of the form \`aauth:name@domain\`, and the draft recommends it last no more than a day. \`ps\` names the person server of the user this agent works for.

Anyone can verify the token by fetching the provider’s keys from a well-known address on its domain. Nobody has to register the agent first.`,
      code: {
        lang: "json",
        text: `{
  "iss": "https://agents.example",
  "dwk": "aauth-agent.json",
  "sub": "aauth:assistant.7f3c@agents.example",
  "ps": "https://ps.example",
  "cnf": {
    "jwk": {
      "kty": "OKP",
      "crv": "Ed25519",
      "alg": "Ed25519",
      "x": "ea1QQGf1oeC9vnp0g3rNa9DgNGmjBkODCdFgOaolCss"
    }
  },
  "jti": "at-51c2e0",
  "iat": 1794240000,
  "exp": 1794326400
}`,
      },
      gain: [
        ["agent", "signing key"],
        ["agent", "agent token"],
      ],
    },
    {
      from: "agent",
      to: "ps",
      kind: "back",
      label: "Ask for a person token",
      title: "The agent asks for a person token for this API",
      // §6.4, §7.1, §11.2.4 (access_mode), §11.3.3.1 (covered components)
      body: `The calendar API publishes metadata saying it expects an auth token, which means the first call has to carry a person token. An API that publishes nothing says the same with a \`401\`. So the agent asks its person server for one, naming the API.

The request is signed. \`Signature-Key\` carries the agent token. \`Signature-Input\` lists what the signature covers, with the time it was made. \`Signature\` is the signature. Every request in this flow has all three; the later listings show only \`Signature-Key\`, until the last call.`,
      code: {
        lang: "http",
        text: `POST /person HTTP/1.1
Host: ps.example
Content-Type: application/json
Content-Digest: sha-256=:3B5kr1N+7RsZx0N/Ye5sOXIa+xc6skzUiG/ieCr66oI=:
Signature-Key: sig=jwt;jwt="eyJhbGciOiJFZDI1NTE5IiwidHlwIjoiYWEtYWdlbnQrand0…"
Signature-Input: sig=("@method" "@authority" "@path" "signature-key"
  "content-digest" "content-type");created=1794268800
Signature: sig=:hELT5RcN9P3baUmWh6xAAh6d+Ui+bGFKorz+GKROlOVu/ez0WmWEAjC0ISJtB8wCL1zzwLGg8ZK/+mmwtc7UAQ==:

{"resource":"https://calendar.example","capabilities":["interaction"]}`,
      },
    },
    {
      from: "ps",
      to: "agent",
      kind: "resp",
      label: "Person token for this API",
      title: "The person server names the person, to this API only",
      // §7.1, §7.1.1, §7.1.2, §13.8, §13.14, §14.1
      body: `The person server checks the signature, checks the agent token against the provider’s published keys, and looks up which person this agent is bound to. Each agent is bound to exactly one. Alice connected this agent earlier and has let it act for her at the calendar API before, so the answer comes at once. For an API she has not used, the person server should ask her first, in the way steps 7 to 9 show.

A **person token** says who, and nothing about what. It has no scope. \`aud\` is one API. \`sub\` is the identifier the person server uses for Alice at that API, and the draft recommends a different one for each. \`cnf\` holds the agent’s key. It lasts an hour at most, and it does not name the agent.`,
      code: {
        lang: "json",
        text: `{
  "iss": "https://ps.example",
  "dwk": "aauth-person.json",
  "aud": "https://calendar.example",
  "sub": "bc83dde689646e8541a62df13b879317",
  "cnf": { "jwk": { "kty": "OKP", "crv": "Ed25519", "alg": "Ed25519",
                    "x": "ea1QQGf1oeC9vnp0g3rNa9DgNGmjBkODCdFgOaolCss" } },
  "jti": "pt-3ab910",
  "iat": 1794268800,
  "exp": 1794272400
}`,
      },
      gain: [["agent", "person token (calendar API)"]],
    },
    {
      from: "agent",
      to: "api",
      kind: "back",
      label: "Signed request, person token",
      title: "The agent calls the API as Alice’s agent",
      // §6.5, §7.1.3
      body: `Signed with the same key, and presenting the person token in place of the agent token. This is the first the API has heard of this agent. Nothing was registered beforehand, and nothing in the request says which agent it is.`,
      code: {
        lang: "http",
        text: `GET /events HTTP/1.1
Host: calendar.example
Signature-Key: sig=jwt;jwt="eyJhbGciOiJFZDI1NTE5IiwidHlwIjoiYWEtcGVyc29uK2p3dCIs…"`,
      },
    },
    {
      from: "api",
      to: "agent",
      kind: "resp",
      label: "401 with a resource token",
      title: "The API says what it needs, in a token of its own",
      // §6.5, §6.7, §6.7.1, §7.1.4
      body: `The API verifies the person token: it is the right type, signed by keys its issuer publishes, issued for this API, and bound to the key that signed the request. It now knows which person this is about. Reading her calendar takes her consent, so it answers \`401\`, with a **resource token** in the \`AAuth-Requirement\` header.

A resource token is the API’s own signed statement of the request: which API, which person at which person server, which person token it was shown, which key, which scope. \`aud\` is the person server that issued the person token, because this API has no access server of its own. The agent carries the token and cannot alter it. The draft recommends it expire within five minutes.`,
      code: {
        lang: "json",
        text: `{
  "iss": "https://calendar.example",
  "dwk": "aauth-resource.json",
  "aud": "https://ps.example",
  "ps": "https://ps.example",
  "sub": "bc83dde689646e8541a62df13b879317",
  "presented_jti": "pt-3ab910",
  "agent_jkt": "cGXbwNDIqrkzguDVr5oBxAEAY2kEm2LccCsY3WJtRX8",
  "scope": "calendar.read",
  "jti": "rt-90c1f4",
  "iat": 1794268802,
  "exp": 1794269102
}`,
      },
      gain: [["agent", "resource token"]],
    },
    {
      from: "agent",
      to: "ps",
      kind: "back",
      label: "Ask for an auth token",
      title: "The agent takes the API’s request to the person server",
      // §6.7.3, §7.2.1, §11.8.1
      body: `First the agent checks the resource token: that it came from the API it just called, and that it names the agent’s own key, its person server and the person token it presented. Then it sends both tokens to the person server, signed, and presenting its agent token again.

\`justification\` is the agent’s own account of why it wants the access. The person server will show it to Alice as that and no more. \`Prefer: wait\` says how long the agent will hold the connection open for an answer.`,
      code: {
        lang: "http",
        text: `POST /token HTTP/1.1
Host: ps.example
Content-Type: application/json
Prefer: wait=45
Signature-Key: sig=jwt;jwt="eyJhbGciOiJFZDI1NTE5IiwidHlwIjoiYWEtYWdlbnQrand0…"

{
  "resource_token": "eyJhbGciOiJFZDI1NTE5IiwidHlwIjoiYWEtcmVzb3VyY2Urand0…",
  "presented_token": "eyJhbGciOiJFZDI1NTE5IiwidHlwIjoiYWEtcGVyc29uK2p3dCIs…",
  "justification": "Find a time next week when Alice and Bob are both free"
}`,
      },
    },
    {
      from: "ps",
      to: "agent",
      kind: "resp",
      label: "202: the user must approve",
      title: "The person server answers: not yet",
      // §6.7.2, §7.2.2, §11.6.3, §11.6.3.1, §11.8.2
      body: `The person server verifies the resource token against the API’s published keys and checks that everything matches: it is addressed to this person server, bound to the key that signed this request, and names the person token that came with it. The request is in order. Alice has not approved calendar access for this agent, so the answer is \`202 Accepted\`, with a pending URL to poll and a page to send her to.

In AAuth a wait is an ordinary answer, not an error, and any endpoint may give one. The \`code\` ties Alice’s visit to this pending request. It is not a credential, and holding it approves nothing.`,
      code: {
        lang: "http",
        text: `HTTP/1.1 202 Accepted
Location: /pending/f7a3b9c
Retry-After: 5
Cache-Control: no-store
AAuth-Requirement: requirement=interaction;
  url="https://ps.example/interact"; code="A1B2-C3D4"
Content-Type: application/json

{"status":"pending"}`,
      },
      gain: [["agent", "pending URL"]],
    },
    {
      from: "agent",
      to: "user",
      kind: "oob",
      label: "Link and code",
      title: "The agent sends Alice to her person server",
      // §7.3, §13.5
      body: `The agent passes on the URL and the code, over whatever channel it has to her. A link the agent relays is a link an attacker can imitate, so the page Alice lands on has to show the whole request, for her to recognize or refuse.

A person server that has its own channel to Alice, such as a notification on her phone, can use that and leave the agent out. The draft calls that the stronger arrangement.`,
      code: {
        lang: "text",
        text: `To approve, open https://ps.example/interact?code=A1B2-C3D4`,
      },
    },
    {
      from: "user",
      to: "ps",
      kind: "front",
      label: "Sign in, read, approve",
      title: "Alice decides at her person server",
      // §7.4, §11.6.3.1 (correlation only), §13.4
      body: `Alice signs in to her person server; how is between the two of them. The page shows content from two sources and has to keep them apart. From the API: its name, and its own description of the scope, “Read your calendar events”. From the agent: its justification, marked as the agent’s claim. Where the API has described the access, the person server may not decide on the agent’s words alone.

She is answering her person server, on its page. The agent does not draw that page, and the code it relayed approves nothing.`,
    },
    {
      from: "agent",
      to: "ps",
      kind: "back",
      label: "Poll the pending URL",
      title: "The agent polls",
      // §11.8.3, §13.2, Appendix C.2.2
      body: `A signed \`GET\` to the pending URL, repeated at the interval the person server asked for. The person server checks the agent’s identity on every poll, so the URL is no use to anyone else.

Nothing comes back through Alice’s browser. There is no authorization code to intercept, and so nothing like PKCE is needed to protect one.`,
      code: {
        lang: "http",
        text: `GET /pending/f7a3b9c HTTP/1.1
Host: ps.example
Prefer: wait=45
Signature-Key: sig=jwt;jwt="eyJhbGciOiJFZDI1NTE5IiwidHlwIjoiYWEtYWdlbnQrand0…"`,
      },
    },
    {
      from: "ps",
      to: "agent",
      kind: "resp",
      label: "Auth token",
      title: "The person server issues an auth token",
      // §7.2.2, §9.4.1, §9.4.4
      body: `An **auth token** records what Alice approved: this person, this API, this scope, this key. It lasts an hour at most, and never longer than the agent token and the person token it was issued from. Like the person token, it names no agent.

The agent checks it before use: issued by the server the resource token was addressed to, for the API it means to call, bound to its own key, and for the same person.`,
      code: {
        lang: "json",
        text: `{
  "iss": "https://ps.example",
  "dwk": "aauth-person.json",
  "aud": "https://calendar.example",
  "ps": "https://ps.example",
  "sub": "bc83dde689646e8541a62df13b879317",
  "scope": "calendar.read",
  "cnf": { "jwk": { "kty": "OKP", "crv": "Ed25519", "alg": "Ed25519",
                    "x": "ea1QQGf1oeC9vnp0g3rNa9DgNGmjBkODCdFgOaolCss" } },
  "jti": "au-7d20b5",
  "iat": 1794268890,
  "exp": 1794272400
}`,
      },
      gain: [["agent", "auth token (calendar.read)"]],
      lose: [
        ["agent", "resource token"],
        ["agent", "pending URL"],
      ],
    },
    {
      from: "agent",
      to: "api",
      kind: "back",
      label: "Signed request, auth token",
      title: "The agent calls again, with the auth token",
      // §9.4.2, §11.3.3, §11.3.4.2, Appendix C.2.4
      body: `The request of step 4, now presenting the auth token. The signature covers the method, the host, the path and the \`Signature-Key\` header, and carries the time it was made. The API accepts it for about a minute. A copy of the whole request can repeat this one call within that minute, unless the API remembers what it has seen. The token lifted out of it is useless without the private key.

The query string and the body are not covered unless the API says they must be.`,
      code: {
        lang: "http",
        text: `GET /events HTTP/1.1
Host: calendar.example
Signature-Key: sig=jwt;jwt="eyJhbGciOiJFZDI1NTE5IiwidHlwIjoiYWEtYXV0aCtqd3QiLCJr…"
Signature-Input: sig=("@method" "@authority" "@path" "signature-key");
  created=1794268891
Signature: sig=:Vm2IefOv9exvy+TCf9aiDSCHN0khqpfE2uvNprUZqnfJVWUYdyoc6JSfGA43tJfGoWJpFTzTCEI1iXQLgwhHBQ==:`,
      },
    },
    {
      from: "api",
      to: "agent",
      kind: "resp",
      label: "Verify, then 200 OK",
      title: "The API checks the token, the key and its own policy",
      // §9.4.3, §13.7, §13.11
      body: `The API verifies the signature, then the token: it is an auth token and not a person token, signed by keys its issuer publishes, issued for this API, and bound to the key that signed the request. It matches the issuer and subject to its record of Alice, or makes one. Then it applies its own rules. The person server vouched for who she is and what she agreed to. What \`calendar.read\` allows is still the API’s decision.

The API now knows which person this is for, what she approved, and that the caller holds the key. It does not know which agent the caller is.`,
    },
  ],
  standards: [
    "aauth-hardt",
    "signature-key",
    "rfc9421",
    "rfc7638",
    "rfc9449",
    "aauth-rosenberg",
  ],
  basis: ["aauth-hardt"],
  roles: {
    "aauth-hardt": "required", // the stated basis: revision -11
    "signature-key": "required", // the Signature-Key header and key discovery, steps 2 to 13; the protocol draft cites it normatively
    rfc9421: "required", // Signature-Input and Signature, steps 2 and 12
    rfc7638: "required", // `agent_jkt` in the resource token, step 5
    rfc9449: "background", // DPoP, named in the notes as OAuth's way to the same binding
    "aauth-rosenberg": "background", // the other AAuth, named so the two are not confused
  },
  illustrated: {
    steps: `AAuth defines five arrangements, which it calls resource access modes. **The diagram draws the one it calls PS authorization**, PS for person server: an agent, an API with no access server of its own, and the user’s person server. It also shows the user being asked, which the person server decides each time. [The five are compared below](#comparison).`,
    references: `These are required by the arrangement the diagram draws: the protocol, the header that carries the key, the signature format, and the thumbprint that ties a resource token to the agent’s key. Every arrangement depends on the first three, so none of them would be rated differently.`,
  },
  related: ["web-bot-auth", "dpop", "ciba", "mcp-authorization"],
  comparison: {
    title: "The five arrangements",
    intro: `An API chooses among these, and may use different ones for different endpoints. It says which it needs when it answers a request it will not yet serve. They differ in what the API ends up knowing, and in who established it.`,
    rowHeading: "Arrangement",
    fields: [
      { heading: "What the API ends up knowing", label: "The API knows" },
      { heading: "Who established it", label: "Established by" },
      { heading: "What the agent presents", label: "The agent presents" },
    ],
    rows: [
      {
        name: "Agent identity",
        values: [
          "Which agent",
          "The agent’s provider",
          "Its agent token. Nothing else is involved: this is the arrangement that takes the place of an API key",
        ],
      },
      {
        name: "Resource-managed",
        values: [
          "Which agent and which person",
          "The API’s own sign-in or consent, which can be the OAuth it already runs",
          "Its agent token, with a session token from the API that works only under the agent’s signature",
        ],
      },
      {
        name: "Person identity",
        values: [
          "Which person",
          "The person server",
          "A person token. The API decides what a person it recognizes may do",
        ],
      },
      {
        name: "PS authorization, as drawn",
        values: [
          "Which person, and the scope they consented to",
          "The person server",
          "A person token, then an auth token from the person server",
        ],
      },
      {
        name: "Federated authorization",
        values: [
          "Which person, and what its own policy decided",
          "An access server that evaluates policy for the API",
          "A person token, then an auth token from the access server, which the person server obtains for it",
        ],
      },
    ],
    after: `In agent identity and resource-managed access, the API sees the agent’s identifier and can make rules about it. In the other three it does not: no token the API reads names the agent. In federated authorization the agent token does reach the access server, which may weigh what it says about the agent.`,
  },
  notes: [
    {
      title: "How this differs from OAuth",
      body: `**No registration.** An OAuth client is known where it was registered or, with a Client ID Metadata Document, where its URL is accepted. An AAuth agent can be checked by anyone who can fetch its provider’s keys.

**No bearer tokens.** In OAuth, binding a token to a key is an addition: [DPoP](/flows/dpop/) or mutual TLS. Here every token is bound to the agent’s key and every request is signed.

**No authorization code.** Nothing of value returns through the browser. The agent collects the token by polling, on a signed request.

**The user’s server, not the API’s.** In OAuth the authorization server belongs with the API, and the user has an account there. In the arrangement drawn, consent is collected by a server the user chose, which the API may never have heard of.`,
    },
    {
      title: "What is not drawn",
      body: `Most of the draft is outside this diagram.

**Missions.** The agent proposes a description of a whole task, the user approves it at the person server, and every later request is judged against it and logged under it.

**Access servers.** An API that wants a policy engine of its own names one in the resource token, and the person server obtains the auth token there.

**Chains.** An API that calls another API acts as an agent in its turn, and presents the token it received as evidence of whom it is acting for. The draft deliberately puts no delegation chain in any token, which is the opposite choice to [token exchange](/flows/token-exchange/).

Companion drafts cover how an agent enrolls with its provider, authorization described in an API’s own vocabulary, and event delivery.`,
    },
    {
      title: "Where it stands",
      body: `Both documents the diagram depends on are individual drafts: the protocol at revision -11 and HTTP Signature Keys at -09, each dated September 2026. A call for the HTTP working group to adopt the second was issued, and its outcome is not confirmed. The protocol’s author reports that the work is moving to a new working group at the OpenID Foundation.

Read it, and prototype with it. For something further along: [MCP authorization](/flows/mcp-authorization/) does without registration, [DPoP](/flows/dpop/) binds a token to a key, and [CIBA](/flows/ciba/) reaches a user who is somewhere else.`,
    },
  ],
};
