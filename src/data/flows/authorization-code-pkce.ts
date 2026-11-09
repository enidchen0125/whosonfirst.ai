import type { Flow } from '../types';

export const authorizationCodePkce: Flow = {
  slug: 'authorization-code-pkce',
  title: 'Authorization code with PKCE',
  short: 'Authorization code + PKCE',
  group: 'human-present',
  human: 'present',
  maturity: 'stable',
  tagline:
    'The baseline. A person signs in, approves specific scopes, and the agent receives a token that says so.',
  summary: `This is the flow almost everything else on this site builds on or stands in for. The user is sent to an authorization server they already trust, signs in there, and approves what the agent may do. The agent never sees a password; it gets a short-lived access token scoped to one resource.

OAuth 2.1 folds a decade of security guidance into the default: PKCE on every authorization code request, exact redirect URI matching, no implicit grant, no password grant. If an agent acts for a person and that person is at the keyboard, start here.`,
  fits: [
    'A user is present and can complete a browser sign-in.',
    'The agent needs access to **that user’s** data, with that user’s permissions.',
    'You want consent recorded by the authorization server, not inferred by the agent.',
  ],
  watchOut: [
    'Consent fatigue. An agent that connects to twenty tools produces twenty consent screens, and people stop reading them. Ask for narrow scopes, late.',
    'The token is the user’s authority minus nothing unless scopes are narrow. An agent with `mail.readwrite` can do anything the user can do to mail.',
    'Refresh tokens outlive the conversation. Decide where they are stored and who can revoke them before you ship.',
    'Desktop and CLI agents are public clients. Use a loopback redirect and PKCE; do not embed a client secret in a binary.',
  ],
  participants: [
    { id: 'user', label: 'User', sub: 'Resource owner', role: 'human' },
    { id: 'agent', label: 'Agent', sub: 'OAuth client', role: 'agent' },
    { id: 'as', label: 'Authorization server', sub: 'Issuer', role: 'authz' },
    { id: 'api', label: 'API', sub: 'Resource server', role: 'resource' },
  ],
  steps: [
    {
      from: 'user',
      to: 'agent',
      kind: 'back',
      label: '“Check my calendar”',
      title: 'The user asks for something the agent cannot do yet',
      body: `The agent has no credential for the calendar API. It could ask for one up front, but the better habit is to wait until a task actually needs it: the consent screen then matches something the user just asked for.`,
    },
    {
      from: 'agent',
      kind: 'self',
      label: 'Create PKCE pair + state',
      title: 'The agent prepares a one-time secret',
      body: `The agent generates a random \`code_verifier\`, hashes it into a \`code_challenge\`, and creates a \`state\` value. The verifier stays with the agent. Only the hash travels through the browser, so an authorization code stolen in transit is useless without it.`,
      code: {
        lang: 'text',
        text: `code_verifier  = random(43–128 chars)
code_challenge = BASE64URL(SHA256(code_verifier))
state          = random()`,
      },
      gain: [['agent', 'code_verifier']],
    },
    {
      from: 'agent',
      to: 'as',
      kind: 'front',
      label: 'Authorization request',
      title: 'The agent sends the user’s browser to the authorization server',
      body: `Everything in this request is visible to the browser, so it carries no secrets: who the client is, where to send the user back, what is being asked for, and which resource the token is for. The \`resource\` parameter matters more for agents than for classic apps, because one agent talks to many servers and a token must be good for exactly one.`,
      code: {
        lang: 'http',
        text: `GET /authorize?response_type=code
  &client_id=https://agent.example/client.json
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
      from: 'as',
      to: 'user',
      kind: 'front',
      label: 'Sign-in and consent screen',
      title: 'The authorization server authenticates the user',
      body: `The user signs in with whatever the authorization server requires: a passkey, SSO, a second factor. The agent is not part of this conversation. Then the server shows what is being requested and by whom. This screen is the only place a human sees the scopes in plain language, which is why its wording deserves more care than it usually gets.`,
    },
    {
      from: 'user',
      to: 'as',
      kind: 'front',
      label: 'Approve calendar.read',
      title: 'The user consents',
      body: `Consent is recorded at the authorization server, tied to this user, this client and these scopes. That record is what lets the user (or an admin) see and revoke the grant later without involving the agent.`,
    },
    {
      from: 'as',
      to: 'agent',
      kind: 'front',
      label: 'Redirect with code',
      title: 'The browser returns to the agent with an authorization code',
      body: `The code is single-use and expires in about a minute. The agent checks that \`state\` matches what it sent and, where the server provides it, that \`iss\` matches the authorization server it meant to talk to. That second check defeats mix-up attacks, which are a real risk for agents that deal with many authorization servers.`,
      code: {
        lang: 'http',
        text: `GET /callback?code=SplxlOBeZQQYbYS6WxSbIA
  &state=af0ifjsldkj
  &iss=https://auth.example HTTP/1.1
Host: 127.0.0.1:52100`,
      },
      gain: [['agent', 'authorization code']],
    },
    {
      from: 'agent',
      to: 'as',
      kind: 'back',
      label: 'Token request + verifier',
      title: 'The agent redeems the code directly',
      body: `This call goes straight from the agent to the token endpoint, not through the browser. The agent presents the code and the original \`code_verifier\`. The server hashes the verifier and compares it with the challenge from step 3; only the party that started the flow can finish it.`,
      code: {
        lang: 'http',
        text: `POST /token HTTP/1.1
Host: auth.example
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code
&code=SplxlOBeZQQYbYS6WxSbIA
&redirect_uri=http://127.0.0.1:52100/callback
&client_id=https://agent.example/client.json
&code_verifier=dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk
&resource=https://calendar.example/api`,
      },
      lose: [['agent', 'authorization code']],
    },
    {
      from: 'as',
      to: 'agent',
      kind: 'resp',
      label: 'Access token (+ refresh)',
      title: 'The authorization server issues tokens',
      body: `The access token is short-lived and bound to one audience. The refresh token, if issued, lets the agent get new access tokens without the user. For public clients OAuth 2.1 requires refresh tokens to be either rotated on use or sender-constrained.`,
      code: {
        lang: 'json',
        text: `{
  "access_token": "eyJhbGciOiJFUzI1NiIsInR5cCI6ImF0K2p3dCJ9…",
  "token_type": "Bearer",
  "expires_in": 600,
  "refresh_token": "8xLOxBtZp8",
  "scope": "calendar.read"
}`,
      },
      gain: [
        ['agent', 'access token'],
        ['agent', 'refresh token'],
      ],
      lose: [['agent', 'code_verifier']],
    },
    {
      from: 'agent',
      to: 'api',
      kind: 'back',
      label: 'API call with Bearer token',
      title: 'The agent calls the API',
      body: `The token goes in the \`Authorization\` header and nowhere else. Never in a URL, and never into the model’s context window: a token the model can read is a token a prompt injection can exfiltrate.`,
      code: {
        lang: 'http',
        text: `GET /api/events?from=today HTTP/1.1
Host: calendar.example
Authorization: Bearer eyJhbGciOiJFUzI1NiIsInR5cCI6ImF0K2p3dCJ9…`,
      },
    },
    {
      from: 'api',
      kind: 'self',
      label: 'Validate iss, aud, exp, scope',
      title: 'The API validates the token',
      body: `Signature, issuer, expiry, scope, and above all **audience**. An API that accepts tokens minted for some other service becomes a confused deputy. If the token is for \`https://calendar.example/api\` and this is not that, reject it.`,
    },
    {
      from: 'api',
      to: 'agent',
      kind: 'resp',
      label: '200 OK',
      title: 'The API responds',
      body: `The API knows which user this is for (\`sub\`) and which client is calling (\`client_id\`). What it does not know from a plain access token is that an *AI agent* was in the middle, or which model run decided to make the call. Flows further down this site add that information.`,
    },
  ],
  standards: ['oauth-2-1', 'rfc7636', 'rfc8707', 'rfc9207', 'rfc9700', 'rfc8252'],
  related: ['mcp-authorization', 'device-authorization', 'dpop', 'step-up-authorization'],
};
