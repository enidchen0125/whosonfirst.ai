import type { Flow } from "../types";

export const deviceAuthorization: Flow = {
  slug: "device-authorization",
  title: "Device authorization grant",
  short: "Device authorization",
  group: "human-present",
  human: "present",
  maturity: "stable",
  tagline:
    "For agents with no browser of their own: show a code, let the person approve on another device, and poll.",
  summary: `A coding agent in a remote container, a CLI over SSH, a job in a sandbox: none of them can open a browser window or receive a redirect. The device authorization grant splits the flow across two devices. The agent displays a short code and a URL; the user opens that URL on a phone or laptop, signs in, and types the code. Meanwhile the agent polls the token endpoint until the answer arrives.

It is simple and widely deployed, which is why it is the first thing people reach for with headless agents. It is also the flow most abused for phishing, because the person approving has no technical proof that the code on their screen came from the session they think it did.`,
  fits: [
    "The agent runs where no browser or loopback redirect is possible.",
    "A person is available right now on some other device.",
    "You control the authorization server and can show rich context on the approval screen.",
  ],
  watchOut: [
    "**Device-code phishing.** An attacker starts the flow themselves and sends the victim the code. The victim approves; the attacker’s agent gets the token. Show the client name, location and requested scopes prominently, and keep codes short-lived.",
    "If the agent runs on the same machine as a browser, use authorization code with PKCE and a loopback redirect instead. The redirect binds the approval to the session; a typed code does not.",
    "Polling too fast earns a `slow_down` error. Respect `interval`.",
    "The token lands in a headless environment. Plan for where it is stored and how it is revoked when the container goes away.",
  ],
  participants: [
    { id: "user", label: "User", sub: "On phone or laptop", role: "human" },
    {
      id: "agent",
      label: "Headless agent",
      sub: "CLI, container",
      role: "agent",
    },
    { id: "as", label: "Authorization server", role: "authz" },
    { id: "api", label: "API", sub: "Resource server", role: "resource" },
  ],
  steps: [
    {
      from: "agent",
      to: "as",
      kind: "back",
      label: "Device authorization request",
      title: "The agent asks to start a device flow",
      body: `No user is involved yet. The agent identifies itself and says what it wants.`,
      code: {
        lang: "http",
        text: `POST /device_authorization HTTP/1.1
Host: auth.example
Content-Type: application/x-www-form-urlencoded

client_id=cli-agent
&scope=repo.read`,
      },
    },
    {
      from: "as",
      to: "agent",
      kind: "resp",
      label: "device_code, user_code, URL",
      title: "The server returns two codes",
      body: `The \`device_code\` is a long secret the agent keeps and uses to poll. The \`user_code\` is short enough to type. \`verification_uri_complete\` embeds the user code so it can be rendered as a QR code.`,
      code: {
        lang: "json",
        text: `{
  "device_code": "GmRhmhcxhwAzkoEqiMEg_DnyEysNkuNhszIySk9eS",
  "user_code": "WDJB-MJHT",
  "verification_uri": "https://auth.example/device",
  "verification_uri_complete": "https://auth.example/device?user_code=WDJB-MJHT",
  "expires_in": 600,
  "interval": 5
}`,
      },
      gain: [["agent", "device_code"]],
    },
    {
      from: "agent",
      to: "user",
      kind: "oob",
      label: "Show code and URL",
      title: "The agent shows the code",
      body: `In a terminal, a chat message, or a QR code. This hop is the weak point: nothing technical ties the code the user sees to the agent they intend to authorize. Whatever channel carries it is the channel an attacker will imitate.`,
      code: {
        lang: "text",
        text: `To sign in, open https://auth.example/device
and enter the code  WDJB-MJHT`,
      },
    },
    {
      from: "user",
      to: "as",
      kind: "front",
      label: "Open URL, sign in, enter code",
      title: "The user signs in on a second device",
      body: `The user authenticates in a real browser, with whatever factors the server requires, then enters the code. The server looks up the pending request and shows what is being asked for.`,
    },
    {
      from: "agent",
      to: "as",
      kind: "back",
      label: "Poll token endpoint",
      title: "The agent polls",
      body: `While the user is busy, the agent asks the token endpoint whether a decision has been made, no more often than \`interval\` seconds. The \`resource\` parameter names the API the token is for. RFC 8707 defines it on token requests for every grant type; RFC 8628 gives the device authorization request only \`client_id\` and \`scope\`.`,
      code: {
        lang: "http",
        text: `POST /token HTTP/1.1
Host: auth.example
Content-Type: application/x-www-form-urlencoded

grant_type=urn:ietf:params:oauth:grant-type:device_code
&device_code=GmRhmhcxhwAzkoEqiMEg_DnyEysNkuNhszIySk9eS
&client_id=cli-agent
&resource=https://git.example/api`,
      },
    },
    {
      from: "as",
      to: "agent",
      kind: "resp",
      label: "authorization_pending",
      title: "Not yet",
      body: `The expected answer until the user finishes. Other answers: \`slow_down\` (back off), \`access_denied\` (the user said no), \`expired_token\` (start again).`,
      code: {
        lang: "json",
        text: `{ "error": "authorization_pending" }`,
      },
    },
    {
      from: "user",
      to: "as",
      kind: "front",
      label: "Approve the request",
      title: "The user approves",
      body: `A good approval screen names the client, says where the request came from, and lists the scopes in plain language. It is the user’s only chance to notice that they did not start this.`,
    },
    {
      from: "agent",
      to: "as",
      kind: "back",
      label: "Poll again",
      title: "The agent polls again",
      body: `Same request as before.`,
    },
    {
      from: "as",
      to: "agent",
      kind: "resp",
      label: "Access token (+ refresh)",
      title: "The server issues tokens",
      body: `From here on the agent is in the same position as after an authorization code flow: a short-lived access token and usually a refresh token.`,
      gain: [
        ["agent", "access token"],
        ["agent", "refresh token"],
      ],
      lose: [["agent", "device_code"]],
    },
    {
      from: "agent",
      to: "api",
      kind: "back",
      label: "API call with Bearer token",
      title: "The agent calls the API as the user",
      body: `The API sees an ordinary access token. It cannot tell that the approval happened on a different device from the one making the call.`,
    },
  ],
  standards: [
    "rfc8628",
    "rfc6749",
    "cross-device-bcp",
    "rfc8707",
    "rfc6750",
    "oauth-2-1",
  ],
  roles: {
    rfc8628: "required", // the grant: steps 1 to 6 and 8
    rfc6749: "required", // the token endpoint and its responses
    "cross-device-bcp": "required", // RFC 10027: its practices apply to this grant, and the page teaches its defences against code phishing
    rfc8707: "required", // `resource` on the token request, step 5
    rfc6750: "required", // the Bearer header on the API call
    "oauth-2-1": "background", // a related draft; not named or used on this page
  },
  related: ["authorization-code-pkce", "ciba", "mcp-authorization"],
  notes: [
    {
      title: "Device flow or CIBA?",
      body: `Both decouple the device that needs a token from the device where the person approves. In the device grant the **user** carries a code from the agent to the server. In [CIBA](/flows/ciba/) the **server** reaches out to a user it already knows. Use the device grant to sign in someone who is sitting there; use CIBA to ask a known user for approval when they are somewhere else.`,
    },
  ],
};
