import type { Flow } from "../types";

export const identityChaining: Flow = {
  slug: "identity-chaining",
  title: "Identity chaining across domains",
  short: "Identity chaining",
  group: "delegation",
  human: "any",
  maturity: "emerging",
  tagline:
    "Carry who-is-this-for across an organizational boundary, with each side keeping control of its own tokens.",
  summary: `Token exchange works inside one trust domain, where a single authorization server can mint a token for any hop. Agent workflows do not stay inside one domain. An agent in company A calls a service run by company B. Company B will not accept company A’s tokens, and should not.

Identity chaining combines two existing pieces to cross the boundary. In its home domain, the agent uses token exchange to obtain a short-lived **JWT authorization grant** addressed to the other domain’s authorization server. It then presents that grant to the other side using the JWT bearer grant, and receives an access token that the second domain issued under its own policy. Each domain validates only what it issued or explicitly agreed to trust, and the pattern repeats for every further boundary.

The specification is through IETF approval and waiting in the RFC Editor’s queue.`,
  fits: [
    "Agents that call services in another organization, cloud or business unit with its own authorization server.",
    "Cases where the user’s identity must survive the crossing so the far side can apply per-user policy.",
    "Federations where the two authorization servers have an agreed trust relationship.",
  ],
  watchOut: [
    "Trust between the two authorization servers is set up in advance: keys, issuer names, and which claims are honored. The specification does not create that trust for you.",
    "Identifiers rarely match across domains. Decide how subjects are mapped, and what happens when a mapping does not exist.",
    "Each hop can add or drop claims. Make sure the receiving side does not treat a claim as verified merely because it arrived.",
    "Keep the grant short-lived and single-audience. It is a bearer credential for obtaining tokens.",
  ],
  lesson: "chains",
  like: {
    flow: "token-exchange",
    except:
      "the next hop belongs to another organization. The exchange yields a grant, and the other side’s authorization server turns that into a token of its own.",
  },
  phases: [
    {
      title: "The agent gets a grant at home, addressed to the other domain",
      from: 1,
    },
    {
      title: "The agent trades the grant for a token from the other domain",
      from: 5,
    },
    {
      title: "The agent calls the other domain’s API, which checks the token",
      from: 8,
    },
  ],
  parts: {
    agent:
      "Trades its domain A token at its home authorization server for a short-lived grant, presents the grant at domain B’s token endpoint, and calls the API with the token domain B issues. It also authenticates to domain B as a client that domain B knows.",
    asa: "Decides what crosses its boundary: which clients may obtain grants for which external domains, and which claims about the user are released. Signs a short-lived grant whose only audience is domain B’s authorization server. It can end the arrangement by refusing to issue grants.",
    asb: "Verifies the grant against keys it has agreed to trust for domain A, checks that it is the audience, and maps the incoming subject and claims to its own. Then issues its own access token, and is free to grant less than was asked. The trust between the two authorization servers is set up in advance: the specification does not create it for you.",
    api: "Validates a token from its own authorization server. It sees nothing issued by domain A.",
  },
  participants: [
    { id: "agent", label: "Agent", sub: "Client in domain A", role: "agent" },
    { id: "asa", label: "AS, domain A", sub: "Home", role: "authz" },
    { id: "asb", label: "AS, domain B", sub: "Remote", role: "authz" },
    { id: "api", label: "API, domain B", role: "resource" },
  ],
  steps: [
    {
      from: "agent",
      kind: "self",
      label: "Holds a domain A token",
      title: "The agent has authority at home, and needs it elsewhere",
      body: `The agent holds a token issued in domain A, for a user or for itself. It needs to call an API protected by domain B’s authorization server.`,
      gain: [["agent", "token (domain A)"]],
    },
    {
      from: "agent",
      to: "asa",
      kind: "back",
      label: "Token exchange: grant for B",
      title: "The agent asks its home server for a grant aimed at domain B",
      body: `A token exchange request (RFC 8693) whose target is the other domain’s authorization server.`,
      code: {
        lang: "http",
        text: `POST /token HTTP/1.1
Host: as.a.example
Content-Type: application/x-www-form-urlencoded

grant_type=urn:ietf:params:oauth:grant-type:token-exchange
&subject_token=<token from domain A>
&subject_token_type=urn:ietf:params:oauth:token-type:access_token
&requested_token_type=urn:ietf:params:oauth:token-type:jwt
&audience=https://as.b.example
&scope=orders.read`,
      },
    },
    {
      from: "asa",
      kind: "self",
      label: "Policy: may this leave?",
      title: "Domain A decides what crosses its boundary",
      body: `The home authorization server controls outbound trust: which clients may obtain grants for which external domains, and which claims about the user are released.`,
    },
    {
      from: "asa",
      to: "agent",
      kind: "resp",
      label: "JWT authorization grant",
      title: "A short-lived grant addressed to domain B",
      body: `Signed by domain A. Its audience is domain B’s authorization server and nothing else. It is not an access token and no API should accept it.`,
      code: {
        lang: "json",
        text: `{
  "iss": "https://as.a.example",
  "sub": "alice@a.example",
  "aud": "https://as.b.example",
  "client_id": "research-agent",
  "scope": "orders.read",
  "jti": "c3f1…",
  "exp": 1794268920
}`,
      },
      gain: [["agent", "JWT grant (aud: AS B)"]],
    },
    {
      from: "agent",
      to: "asb",
      kind: "back",
      label: "JWT bearer grant",
      title: "The agent presents the grant across the boundary",
      body: `An RFC 7523 assertion grant at domain B’s token endpoint. The agent also authenticates as a client known to domain B.`,
      code: {
        lang: "http",
        text: `POST /token HTTP/1.1
Host: as.b.example
Content-Type: application/x-www-form-urlencoded

grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer
&assertion=<JWT authorization grant>
&resource=https://api.b.example`,
      },
      lose: [["agent", "JWT grant (aud: AS B)"]],
    },
    {
      from: "asb",
      kind: "self",
      label: "Trust A’s key; map claims",
      title: "Domain B applies its own policy",
      body: `Domain B verifies the signature against keys it has agreed to trust for domain A, checks it is the audience, and maps the incoming subject and claims to its own. It is free to grant less than was asked.`,
    },
    {
      from: "asb",
      to: "agent",
      kind: "resp",
      label: "Access token (domain B)",
      title: "Domain B issues its own token",
      body: `An ordinary access token, issued and revocable by domain B, with domain B’s idea of who the subject is.`,
      gain: [["agent", "access token (domain B)"]],
    },
    {
      from: "agent",
      to: "api",
      kind: "back",
      label: "API call with B’s token",
      title: "The agent calls the remote API",
      body: `The API validates a token from its own authorization server. It never sees anything issued by domain A.`,
    },
    {
      from: "api",
      to: "agent",
      kind: "resp",
      label: "200 OK",
      title: "The remote API responds",
      body: `Either domain can end the arrangement independently: A by refusing to issue grants, B by refusing to honor them.`,
    },
  ],
  standards: [
    "identity-chaining",
    "rfc8693",
    "rfc7523",
    "rfc10070",
    "id-jag",
    "wimse-aims",
  ],
  related: [
    "cross-app-access",
    "token-exchange",
    "transaction-tokens",
    "workload-identity-federation",
  ],
  notes: [
    {
      title: "Relation to ID-JAG",
      body: `[ID-JAG](/flows/cross-app-access/) is a profile of this pattern for one common case: the first authorization server is an enterprise identity provider and the input is the user’s single sign-on assertion. The WIMSE working group’s agent architecture document recommends identity chaining or ID-JAG whenever an agent crosses a trust domain.`,
    },
  ],
};
