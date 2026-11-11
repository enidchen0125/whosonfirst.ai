import type { Flow } from "../types";

export const urlElicitation: Flow = {
  slug: "url-elicitation",
  title: "Out-of-band authorization (MCP URL elicitation)",
  short: "URL elicitation",
  group: "human-in-the-loop",
  human: "present",
  maturity: "emerging",
  tagline:
    "A tool needs the user to sign in somewhere else. It hands back a link, the user completes the flow in a browser, and the secret never touches the agent.",
  summary: `An MCP server often sits in front of someone else’s API. The user has authorized their client to use the MCP server, but the server still needs the user’s permission at the third party: their code host, their CRM, their bank.

The wrong ways to get it are familiar. One is to ask the user to paste an API key into the chat, where the model and every log will see it. The other is to have the client forward its own token, which is token passthrough. URL-mode elicitation is the protocol’s answer: in the middle of a tool call the server replies “I need the user to visit this URL.” The client shows the link, the user opens it in a real browser, and the server completes an ordinary OAuth flow with the third party on its own. The credential is stored by the server and is never seen by the client or the model.

The same mechanism covers anything sensitive that should bypass the agent: entering a key, confirming a payment, approving a specific action on a page the server controls.`,
  fits: [
    "An MCP server needs the user’s credentials for a downstream service.",
    "Collecting anything sensitive (secrets, payment details) that must not enter model context.",
    "Asking the user to approve an action on a page the server controls.",
  ],
  watchOut: [
    "This is **not** how a client gets authorized to the MCP server itself. That is [MCP authorization](/flows/mcp-authorization/); the specification says servers must not use elicitation for it.",
    "Phishing in both directions. A malicious server can send a link to a lookalike sign-in page, so clients must show the full URL and never open it without consent. And the server must make sure the person who completes the flow is the user who started it.",
    "The server becomes a holder of third-party tokens, with everything that implies for storage and revocation.",
    "The feature is still marked as subject to change, and its wire format did change in 2026-07-28. Check client support before depending on it.",
  ],
  lesson: "chains",
  phases: [
    {
      title: "The client calls a tool, and the server answers with a link",
      from: 1,
    },
    {
      title: "The client shows the link, and the user opens it in a browser",
      from: 4,
    },
    { title: "The user signs in at the third-party service", from: 6 },
    { title: "The server gets the third-party tokens and keeps them", from: 8 },
    {
      title: "The client retries, and the server calls the third-party API",
      from: 10,
    },
  ],
  parts: {
    user: "Reads the full URL the client shows, agrees to open it, and signs in and consents at the third-party service in a browser. The access they grant goes to the MCP server, not to the AI client.",
    client:
      "Shows the complete URL, does not fetch it itself, and opens it only with the user’s consent, in a browser context the model cannot read. There is no completion callback, so it then retries the original call, echoing `requestState`.",
    mcp: "Finds it has no third-party token for this user, does not try the client’s token there, and answers the tool call with a URL to visit. Its connect page checks that the browser belongs to the user who made the tool call, then it runs its own OAuth flow with the third party and stores the tokens keyed to the user. If the server is yours, so are the storage and revocation of those tokens.",
    third:
      "Signs the user in, shows a consent screen that names the MCP server’s application, and returns a code that the server redeems for tokens. Its API then receives the server’s call. To it, the MCP server is an ordinary OAuth client.",
  },
  participants: [
    { id: "user", label: "User", sub: "In their browser", role: "human" },
    { id: "client", label: "MCP client", sub: "Agent host", role: "agent" },
    {
      id: "mcp",
      label: "MCP server",
      sub: "Also an OAuth client",
      role: "resource",
    },
    {
      id: "third",
      label: "Third-party service",
      sub: "Its own AS + API",
      role: "authz",
    },
  ],
  steps: [
    {
      from: "client",
      to: "mcp",
      kind: "back",
      label: "tools/call + Bearer token",
      title: "The agent calls a tool",
      body: `The client is already authorized to the MCP server. Its bearer token identifies the user to the server.`,
      gain: [["client", "access token (aud: MCP server)"]],
    },
    {
      from: "mcp",
      kind: "self",
      label: "No third-party grant for user",
      title: "The server finds it has no downstream credential",
      body: `The server looks up the user (from the \`sub\` of the MCP access token) and finds no stored token for the third-party service. It must not try the client’s token there.`,
    },
    {
      from: "mcp",
      to: "client",
      kind: "resp",
      label: "Input required: open URL",
      title: "The server answers with an elicitation",
      body: `Instead of a tool result, the server returns an \`InputRequiredResult\` containing a URL-mode elicitation. \`requestState\` is an opaque value the client will echo back; the server must treat it as attacker-controlled and protect its integrity.`,
      code: {
        lang: "json",
        text: `{
  "jsonrpc": "2.0",
  "id": 7,
  "result": {
    "resultType": "input_required",
    "inputRequests": {
      "connect_tracker": {
        "method": "elicitation/create",
        "params": {
          "mode": "url",
          "url": "https://mcp.example.com/connect/tracker",
          "message": "Connect your issue tracker to continue."
        }
      }
    },
    "requestState": "v1.9f2c…"
  }
}`,
      },
    },
    {
      from: "client",
      to: "user",
      kind: "back",
      label: "Show full URL; ask to open",
      title: "The client asks the user, and stays out of the way",
      body: `The client must show the complete URL, must not fetch it itself, and must not open it without explicit consent. It opens the link in a browser context the model cannot read.`,
    },
    {
      from: "user",
      to: "mcp",
      kind: "front",
      label: "Open connect page",
      title: "The user lands on a page the server controls",
      body: `A common design, which the specification gives as an example, is a “connect” URL on the server’s own domain rather than a direct link to the third party. That page signs the user in, or finds their existing session, with the same authorization server the MCP client used, and compares that user with the \`sub\` on the tool call. Holding the link proves nothing, so the link must carry no identity and grant nothing by itself: the attack is an attacker passing their own link to a victim.`,
    },
    {
      from: "mcp",
      to: "third",
      kind: "front",
      label: "Redirect to third-party sign-in",
      title: "The server starts its own OAuth flow",
      body: `Here the MCP server is an ordinary OAuth client of the third party, with its own client ID, redirect URI and PKCE.`,
    },
    {
      from: "user",
      to: "third",
      kind: "front",
      label: "Sign in and consent",
      title: "The user authorizes the server directly",
      body: `The consent screen names the MCP server’s application, not the AI client. The user is granting access to the server.`,
    },
    {
      from: "third",
      to: "mcp",
      kind: "front",
      label: "Redirect with code",
      title: "The third party returns a code to the server",
      body: `The browser is redirected back to the MCP server, which redeems the code at the third party’s token endpoint.`,
    },
    {
      from: "mcp",
      kind: "self",
      label: "Store tokens for this user",
      title: "The server keeps the third-party tokens",
      body: `Stored server-side, keyed to the user. They never transit the MCP client and are never visible to the model.`,
      gain: [["mcp", "third-party tokens"]],
    },
    {
      from: "client",
      to: "mcp",
      kind: "back",
      label: "Retry tools/call + requestState",
      title: "The client retries the original call",
      body: `There is no completion callback in the current revision. The client simply retries, echoing \`requestState\` and an \`inputResponses\` entry. An \`accept\` response means only that the user agreed to open the link, so the server checks for itself whether the connection now exists.`,
    },
    {
      from: "mcp",
      to: "third",
      kind: "back",
      label: "API call with third-party token",
      title: "The server calls the downstream API as itself",
      body: `Using the token it obtained, addressed to the third-party API.`,
    },
    {
      from: "mcp",
      to: "client",
      kind: "resp",
      label: "Tool result",
      title: "The tool call completes",
      body: `From the agent’s point of view a tool call took a detour through the user. It holds exactly what it held before.`,
    },
  ],
  standards: ["mcp-elicitation", "mcp-authorization", "oauth-2-1"],
  related: [
    "mcp-authorization",
    "credential-broker",
    "ciba",
    "step-up-authorization",
  ],
};
