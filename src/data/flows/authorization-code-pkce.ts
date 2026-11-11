import type { Flow } from "../types";

export const authorizationCodePkce: Flow = {
  slug: "authorization-code-pkce",
  title: "Authorization code with PKCE",
  short: "Authorization code + PKCE",
  group: "human-present",
  human: "present",
  maturity: "stable",
  tagline:
    "The baseline. A person signs in, approves specific scopes, and the agent receives a token that says so.",
  summary: `This is the flow almost everything else on this site builds on or stands in for. The user is sent to an authorization server they already trust, signs in there, and approves what the agent may do. The agent never sees a password; it gets a short-lived access token scoped to one resource.

If an agent acts for a person and that person is at the keyboard, start here.`,
  fits: [
    "A user is present and can complete a browser sign-in.",
    "The agent needs access to **that user’s** data, with that user’s permissions.",
    "You want consent recorded by the authorization server, not inferred by the agent.",
  ],
  watchOut: [
    "Consent fatigue. An agent that connects to twenty tools produces twenty consent screens, and people stop reading them. Ask for narrow scopes, late.",
    "The token is the user’s authority minus nothing unless scopes are narrow. An agent with `mail.readwrite` can do anything the user can do to mail.",
    "Refresh tokens outlive the conversation. Decide where they are stored and who can revoke them before you ship.",
    "Desktop and CLI agents are public clients. Use a loopback redirect and PKCE; do not embed a client secret in a binary.",
  ],
  lesson: "getting-a-token",
  phases: [
    { title: "The user asks, and the agent prepares a sign-in", from: 1 },
    {
      title: "The user signs in and approves, at the authorization server",
      from: 3,
    },
    { title: "The agent trades a one-time code for tokens", from: 6 },
    { title: "The agent calls the API, and the API checks the token", from: 9 },
  ],
  parts: {
    user: "Signs in at the authorization server and approves what the agent may do.",
    agent:
      "Starts the sign-in, keeps the PKCE secret, checks what comes back, trades the code, and attaches the access token to each call. An OAuth client library does most of that. Where the tokens are kept is yours to decide.",
    as: "Signs the user in, shows the consent screen, records the approval and issues the tokens. You register the agent with it and choose the scopes.",
    api: "Validates every token before answering: signature, issuer, audience, expiry and scope. If the API is yours, so is this check.",
  },
  participants: [
    { id: "user", label: "User", sub: "Resource owner", role: "human" },
    { id: "agent", label: "Agent", sub: "OAuth client", role: "agent" },
    { id: "as", label: "Authorization server", sub: "Issuer", role: "authz" },
    { id: "api", label: "API", sub: "Resource server", role: "resource" },
  ],
  steps: [
    {
      from: "user",
      to: "agent",
      kind: "back",
      label: "“Check my calendar”",
      title: "The user asks for something the agent cannot do yet",
      body: `The agent has no credential for the calendar API. It could ask for one up front, but the better habit is to wait until a task actually needs it: the consent screen then matches something the user just asked for.`,
    },
    {
      from: "agent",
      kind: "self",
      label: "Create PKCE pair + state",
      title: "The agent prepares a one-time secret",
      body: `The agent generates a random \`code_verifier\`, hashes it into a \`code_challenge\`, and creates a \`state\` value. The verifier stays with the agent. Only the hash travels through the browser, so an authorization code stolen in transit is useless without it.`,
      code: {
        lang: "text",
        text: `code_verifier  = random(43–128 chars)
code_challenge = BASE64URL(SHA256(code_verifier))
state          = random()`,
      },
      gain: [["agent", "code_verifier"]],
    },
    {
      from: "agent",
      to: "as",
      kind: "front",
      label: "Authorization request",
      title: "The agent sends the user’s browser to the authorization server",
      body: `Everything in this request is visible to the browser, so it carries no secrets: who the client is, where to send the user back, what is being asked for, and which resource the token is for. \`client_id\` is the identifier the authorization server gave this client when it was registered. The \`resource\` parameter matters more for agents than for classic apps, because one agent talks to many servers and a token must be good for exactly one.`,
      code: {
        lang: "http",
        text: `GET /authorize?response_type=code
  &client_id=s6BhdRkqt3
  &redirect_uri=http://127.0.0.1:52100/callback
  &scope=calendar.read
  &resource=https://calendar.example/api
  &code_challenge=E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM
  &code_challenge_method=S256
  &state=af0ifjsldkj HTTP/1.1
Host: auth.example`,
      },
    },
    {
      from: "as",
      to: "user",
      kind: "front",
      label: "Sign-in and consent screen",
      title: "The authorization server authenticates the user",
      body: `The user signs in with whatever the authorization server requires: a passkey, SSO, a second factor. The agent is not part of this conversation. Then the server shows what is being requested and by whom. This screen is the only place a human sees the scopes in plain language, which is why its wording deserves more care than it usually gets.`,
    },
    {
      from: "user",
      to: "as",
      kind: "front",
      label: "Approve calendar.read",
      title: "The user consents",
      body: `Consent is recorded at the authorization server, tied to this user, this client and these scopes. That record is what lets the user (or an admin) see and revoke the grant later without involving the agent.`,
    },
    {
      from: "as",
      to: "agent",
      kind: "front",
      label: "Redirect with code",
      title: "The browser returns to the agent with an authorization code",
      body: `The code is single-use and expires in about a minute. The agent checks that \`state\` matches what it sent and, where the server provides it, that \`iss\` matches the authorization server it meant to talk to. That second check defeats mix-up attacks, which are a real risk for agents that deal with many authorization servers.`,
      code: {
        lang: "http",
        text: `GET /callback?code=SplxlOBeZQQYbYS6WxSbIA
  &state=af0ifjsldkj
  &iss=https://auth.example HTTP/1.1
Host: 127.0.0.1:52100`,
      },
      gain: [["agent", "authorization code"]],
    },
    {
      from: "agent",
      to: "as",
      kind: "back",
      label: "Token request + verifier",
      title: "The agent redeems the code directly",
      body: `This call goes straight from the agent to the token endpoint, not through the browser. The agent presents the code and the original \`code_verifier\`. The server hashes the verifier and compares it with the challenge from step 3; only the party that started the flow can finish it. \`redirect_uri\` is sent again because RFC 6749 requires it here whenever the authorization request carried one.`,
      code: {
        lang: "http",
        text: `POST /token HTTP/1.1
Host: auth.example
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code
&code=SplxlOBeZQQYbYS6WxSbIA
&redirect_uri=http://127.0.0.1:52100/callback
&client_id=s6BhdRkqt3
&code_verifier=dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk
&resource=https://calendar.example/api`,
      },
      lose: [["agent", "authorization code"]],
    },
    {
      from: "as",
      to: "agent",
      kind: "resp",
      label: "Access token (+ refresh)",
      title: "The authorization server issues tokens",
      body: `The access token is short-lived and bound to one audience. The refresh token, if issued, lets the agent get new access tokens without the user. For public clients the security best current practice (RFC 9700) requires refresh tokens to be either sender-constrained or rotated on use.`,
      code: {
        lang: "json",
        text: `{
  "access_token": "eyJhbGciOiJFUzI1NiIsInR5cCI6ImF0K2p3dCJ9…",
  "token_type": "Bearer",
  "expires_in": 600,
  "refresh_token": "8xLOxBtZp8",
  "scope": "calendar.read"
}`,
      },
      gain: [
        ["agent", "access token"],
        ["agent", "refresh token"],
      ],
      lose: [["agent", "code_verifier"]],
    },
    {
      from: "agent",
      to: "api",
      kind: "back",
      label: "API call with Bearer token",
      title: "The agent calls the API",
      body: `The token goes in the \`Authorization\` header and nowhere else. Never in a URL, and never into the model’s context window: a token the model can read is a token a prompt injection can exfiltrate. It goes only to the API it was issued for, at an address fixed in the code or checked against a list you keep, never one taken from the model.`,
      code: {
        lang: "http",
        text: `GET /api/events?from=today HTTP/1.1
Host: calendar.example
Authorization: Bearer eyJhbGciOiJFUzI1NiIsInR5cCI6ImF0K2p3dCJ9…`,
      },
    },
    {
      from: "api",
      kind: "self",
      label: "Validate iss, aud, exp, scope",
      title: "The API validates the token",
      body: `Signature, issuer, expiry, scope, the token type where the issuer sets one, and above all **audience**. An API that accepts tokens minted for some other service becomes a confused deputy. If the token is for \`https://calendar.example/api\` and this is not that, reject it.`,
    },
    {
      from: "api",
      to: "agent",
      kind: "resp",
      label: "200 OK",
      title: "The API responds",
      body: `The token in this example is a JWT access token (RFC 9068), so the API can read which user it is for (\`sub\`) and which client it was issued to (\`client_id\`). What it does not know from a plain access token is that an *AI agent* was in the middle, or which model run decided to make the call. Flows further down this site add that information.`,
    },
  ],
  standards: [
    "rfc6749",
    "rfc7636",
    "rfc9700",
    "rfc8707",
    "rfc9207",
    "rfc8252",
    "rfc6750",
    "rfc9068",
    "oauth-2-1",
  ],
  basis: ["rfc6749", "rfc7636"],
  roles: {
    rfc6749: "required", // the grant itself: every step
    rfc7636: "required", // steps 2, 3, 7
    rfc9700: "required", // the security rules the page teaches: PKCE for public clients, exact redirect matching, audience restriction, refresh token protection
    rfc8707: "required", // `resource`, steps 3 and 7
    rfc9207: "required", // `iss`, step 6
    rfc8252: "required", // the loopback redirect, steps 3, 6, 7
    rfc6750: "required", // the Bearer header, step 9
    rfc9068: "required", // the example token and the claims validated in steps 10 and 11
    "oauth-2-1": "background", // a related draft; this page does not implement it
  },
  related: [
    "mcp-authorization",
    "device-authorization",
    "dpop",
    "step-up-authorization",
  ],
  sections: [
    {
      id: "hosted",
      title: "If the agent is a hosted app",
      intro: `The diagram draws an agent on the user’s machine: a public client, with a redirect to \`127.0.0.1\` and no credential of its own. PKCE shows only that the app finishing the sign-in is the one that started it. An agent that runs on your own servers follows the same eleven steps with two differences.`,
      parts: [
        {
          title: "The browser comes back to your server",
          body: `The redirect address in steps 3, 6 and 7 is an HTTPS address on your backend, registered in advance. The code still passes through the browser’s address bar, and is handed to your server there. No script in the page handles it, and the tokens it is traded for never reach the browser.`,
        },
        {
          title: "The token request says which app is asking",
          body: `A backend can keep a secret, so it is registered as a **confidential client** and authenticates when it redeems the code in step 7. The simplest form is the client ID and client secret in an \`Authorization: Basic\` header. PKCE is still sent: the security best current practice recommends it for every client.`,
          code: {
            lang: "http",
            text: `POST /token HTTP/1.1
Host: auth.example
Authorization: Basic czZCaGRSa3F0MzpnWDFmQmF0M2JW
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code
&code=SplxlOBeZQQYbYS6WxSbIA
&redirect_uri=https://assistant.example/callback
&code_verifier=dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk
&resource=https://calendar.example/api`,
          },
        },
        {
          title: "The callback belongs to the session that started it",
          body: `One desktop agent knows which sign-in it started. A backend serving many users has to work out which user each returning browser belongs to. Keep \`state\` and the PKCE verifier in the user’s session, not in a table any request can look up, and accept a code only if this browser’s session started this request. Otherwise an attacker can start a connection in their own session, sign in to the service as themselves, and get a victim’s browser to load the callback. The attacker’s account is then connected to the victim’s profile, and the victim’s agent begins working in it.

Where a service does not send \`iss\` in step 6, register a separate redirect address for each service, so that a response arriving at the wrong one is refused.`,
        },
        {
          title: "When the access token runs out",
          body: `The backend sends the refresh token to the same endpoint, authenticating the same way, and gets a new access token without the user. If a new refresh token comes back with it, that one replaces the old: save it before doing anything else.`,
          code: {
            lang: "http",
            text: `POST /token HTTP/1.1
Host: auth.example
Authorization: Basic czZCaGRSa3F0MzpnWDFmQmF0M2JW
Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token
&refresh_token=8xLOxBtZp8`,
          },
        },
        {
          title: "What that changes for you",
          body: `The tokens that come back in step 8 stay on the server, filed under the user who signed in. [Hosted apps and backends](/deployments/web-apps/) covers where they live and what to do when the work outlives the request.`,
        },
      ],
    },
  ],
  notes: [
    {
      title: "What this page follows",
      body: `The flow as published: the OAuth 2.0 authorization code grant (RFC 6749) with PKCE (RFC 7636), run the way the security best current practice (RFC 9700) sets out. That means PKCE, which it requires of a public client like this one; exact redirect URI matching; a token restricted to one audience; and no implicit or password grant.`,
    },
    {
      title: "How OAuth 2.1 relates",
      body: `OAuth 2.1 (\`draft-ietf-oauth-v2-1\`) is an Internet-Draft of the IETF OAuth working group, at revision -17 dated October 30, 2026. It is not an RFC. It gathers RFC 6749, RFC 6750, RFC 7636, RFC 8252, RFC 9700 and RFC 10017 into one document and changes some behavior as it does.

Two of its changes touch this page. A token request no longer carries \`redirect_uri\`, and the PKCE \`plain\` method is removed. This page shows the published RFCs, so step 7 still sends \`redirect_uri\`. A flow built on the draft, such as [MCP authorization](/flows/mcp-authorization/), leaves it out.`,
    },
  ],
};
