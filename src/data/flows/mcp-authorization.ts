import type { Flow } from "../types";

export const mcpAuthorization: Flow = {
  slug: "mcp-authorization",
  title: "MCP authorization",
  short: "MCP authorization",
  group: "human-present",
  human: "present",
  maturity: "emerging",
  tagline:
    "How an MCP client that has never seen a server before discovers where to sign in, identifies itself, and gets a token good for that server alone.",
  summary: `The Model Context Protocol has a problem classic OAuth never had to solve: any client may meet any server, with no prior arrangement. A user pastes in a server URL, and the client has to work out which authorization server protects it, introduce itself to that server, and obtain a token, all at runtime.

MCP answers this with a profile of OAuth 2.1 plus three discovery steps. The MCP server is an OAuth **resource server**. It points to its authorization server through protected resource metadata. The client identifies itself with a URL that the authorization server can fetch, called a Client ID Metadata Document, instead of registering in advance. Every token request names one MCP server through the \`resource\` parameter.

This page describes the **2026-07-28** revision of the specification. Authorization is optional in MCP and applies to HTTP transports; a server launched over stdio takes its credentials from its environment.`,
  fits: [
    "Remote MCP servers that act on a user’s data.",
    "Clients and servers that have no prior relationship.",
    "A person is present to complete a browser sign-in on first connection.",
  ],
  watchOut: [
    "**Token passthrough is forbidden.** An MCP server must only accept tokens issued for itself, and must not forward the token it received to an upstream API. If it needs upstream access it gets its own token.",
    "Dynamic Client Registration is deprecated as of 2026-07-28 and kept only for compatibility. New clients should use Client ID Metadata Documents; new authorization servers should support them.",
    "Every URL in the discovery steps comes from a server the client has never seen. A client that runs on your servers should refuse any that are not HTTPS or that resolve to private, loopback or link-local addresses, including after a redirect. Before opening the authorization endpoint, check that it is an `https:` URL, and hand it to the browser without passing it through a shell.",
    "Client credentials must be stored per issuer and never reused with a different authorization server. A server that changes its metadata to point somewhere new is the start of a mix-up attack.",
    "A Client ID Metadata Document proves control of a URL, not that the software on the user’s machine is the genuine client. Authorization servers must show the redirect host on the consent screen for this reason.",
    "Scopes are whatever the server defines. The core specification has no per-tool permission model; fine-grained control is left to the server, a [gateway](/deployments/gateways/), or an external policy engine.",
  ],
  lesson: "getting-a-token",
  like: {
    flow: "authorization-code-pkce",
    except:
      "the client has never seen the server before. So discovery comes first, and the client can identify itself by a URL instead of a client ID registered in advance.",
  },
  phases: [
    { title: "The client finds out where to sign in", from: 1 },
    { title: "The client says who it is", from: 5 },
    {
      title:
        "The user signs in, and the client gets a token for this one server",
      from: 8,
    },
    {
      title: "The client calls the server, and the server checks the token",
      from: 13,
    },
  ],
  parts: {
    user: "Signs in and approves, as in any OAuth sign-in.",
    client:
      "Follows the server’s pointers to its authorization server, identifies itself, runs the sign-in with PKCE, checks who answered, and keeps each token for the one server it was issued for. An MCP client library does most of this. Check that yours validates the issuer.",
    as: "Publishes its metadata, looks the client up, signs the user in, and issues a token whose audience is this MCP server. It is a separate role, and usually a separate service: the MCP server does not have to be one.",
    mcp: "Answers a request that has no token with a 401 that points to its metadata, publishes that metadata, and validates every token: issued for this server, by its authorization server, with the scope the tool needs. It never passes the token on. [What a server author builds](#server) is set out below.",
  },
  participants: [
    { id: "user", label: "User", role: "human" },
    { id: "client", label: "MCP client", sub: "Agent host", role: "agent" },
    { id: "as", label: "Authorization server", role: "authz" },
    {
      id: "mcp",
      label: "MCP server",
      sub: "Resource server",
      role: "resource",
    },
  ],
  steps: [
    {
      from: "client",
      to: "mcp",
      kind: "back",
      label: "MCP request, no token",
      title: "The client calls a server it knows nothing about",
      body: `The user has added a server URL. The client simply tries a request.`,
    },
    {
      from: "mcp",
      to: "client",
      kind: "resp",
      label: "401 + resource_metadata",
      title: "The server says where to look",
      body: `The \`WWW-Authenticate\` header can carry the URL of the server’s protected resource metadata and the scopes needed for this request. The \`resource_metadata\` parameter is optional: a server may leave it out if it serves the document at a well-known URL. The client then constructs that URL itself, trying the path-specific form before the root.`,
      code: {
        lang: "http",
        text: `HTTP/1.1 401 Unauthorized
WWW-Authenticate: Bearer
  resource_metadata="https://mcp.example.com/.well-known/oauth-protected-resource/mcp",
  scope="files:read"`,
      },
    },
    {
      from: "client",
      to: "mcp",
      kind: "back",
      label: "Get resource metadata",
      title: "The client reads the protected resource metadata",
      body: `This document (RFC 9728) is the bridge between a resource and its authorization server. It must list at least one entry in \`authorization_servers\`. The client checks \`resource\` in this document and stops if it does not match. What it must match depends on how the document was found. If the server’s \`WWW-Authenticate\` header gave the address, \`resource\` must be the URL the client called, wherever the document itself lives. If the client built the well-known address itself, \`resource\` must be the URL it built that address from: the server URL for the path-specific form, and the server’s origin for the root. \`scopes_supported\` is meant to be the minimal set for basic use, not everything the server could ever ask for.`,
      code: {
        lang: "json",
        text: `{
  "resource": "https://mcp.example.com/mcp",
  "authorization_servers": ["https://auth.example.com"],
  "scopes_supported": ["files:read"],
  "bearer_methods_supported": ["header"]
}`,
      },
    },
    {
      from: "client",
      to: "as",
      kind: "back",
      label: "Get server metadata",
      title: "The client discovers the authorization server",
      body: `This exchange shows OAuth authorization server metadata (RFC 8414). An MCP authorization server must publish that or OpenID Connect Discovery metadata, and a conforming client must support both: it tries the RFC 8414 location first, then the OpenID one. Three checks happen here. The \`issuer\` in the document must be identical to the one used to build the URL. \`code_challenge_methods_supported\` must be present, or the client must refuse to continue. And the client looks for \`client_id_metadata_document_supported\` to decide how to identify itself.`,
      code: {
        lang: "json",
        text: `{
  "issuer": "https://auth.example.com",
  "authorization_endpoint": "https://auth.example.com/authorize",
  "token_endpoint": "https://auth.example.com/token",
  "code_challenge_methods_supported": ["S256"],
  "client_id_metadata_document_supported": true,
  "authorization_response_iss_parameter_supported": true
}`,
      },
    },
    {
      from: "client",
      kind: "self",
      label: "Choose client ID; PKCE; note issuer",
      title: "The client decides who it will say it is",
      body: `Preference order: credentials pre-registered for this server; otherwise a **Client ID Metadata Document** if the server supports them; otherwise Dynamic Client Registration (deprecated); otherwise ask the user. With a metadata document the \`client_id\` is an HTTPS URL the client’s publisher controls.

The client also creates a PKCE verifier and records the validated issuer alongside it, to check the response against later.`,
      code: {
        lang: "json",
        text: `// served at https://app.example.com/oauth/client.json
{
  "client_id": "https://app.example.com/oauth/client.json",
  "client_name": "Example Agent",
  "redirect_uris": ["http://127.0.0.1:3000/callback"],
  "grant_types": ["authorization_code", "refresh_token"],
  "token_endpoint_auth_method": "none"
}`,
      },
      gain: [["client", "code_verifier"]],
    },
    {
      from: "client",
      to: "as",
      kind: "front",
      label: "Authorization request + resource",
      title: "The authorization request names the MCP server",
      body: `Authorization code with PKCE, plus the \`resource\` parameter set to the canonical URI of the MCP server. Clients must send \`resource\` on both the authorization request and the token request, whether or not the authorization server is known to support it.`,
      code: {
        lang: "http",
        text: `GET /authorize?response_type=code
  &client_id=https://app.example.com/oauth/client.json
  &redirect_uri=http://127.0.0.1:3000/callback
  &scope=files:read
  &resource=https://mcp.example.com/mcp
  &code_challenge=E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM
  &code_challenge_method=S256
  &state=xyzABC123 HTTP/1.1
Host: auth.example.com`,
      },
    },
    {
      from: "as",
      kind: "self",
      label: "Fetch and check client metadata",
      title: "The authorization server looks the client up",
      body: `Seeing a URL as \`client_id\`, the server fetches it. The \`client_id\` inside the document must match the URL exactly, and the redirect URI in the request must be listed in it. Because this is a server fetching a URL chosen by a stranger, it needs the usual protections against server-side request forgery, and may apply its own policy about which client domains it trusts.`,
    },
    {
      from: "user",
      to: "as",
      kind: "front",
      label: "Sign in and approve",
      title: "The user signs in and consents",
      body: `The server shows the client’s name from the metadata document and must clearly display the redirect URI’s hostname. A client that redirects only to localhost deserves a warning, since anything on the machine can claim that address.`,
    },
    {
      from: "as",
      to: "client",
      kind: "front",
      label: "Redirect: code + iss",
      title: "The code comes back with the issuer",
      body: `Authorization servers should include the \`iss\` parameter (RFC 9207), and the specification signals that this will become mandatory.`,
      code: {
        lang: "http",
        text: `GET /callback?code=SplxlOBeZQQYbYS6WxSbIA
  &state=xyzABC123
  &iss=https://auth.example.com HTTP/1.1
Host: 127.0.0.1:3000`,
      },
      gain: [["client", "authorization code"]],
    },
    {
      from: "client",
      kind: "self",
      label: "Check iss and state",
      title: "The client verifies who answered",
      body: `Before sending the code anywhere, the client compares \`iss\` with the issuer it recorded, as a plain string comparison. If the server advertised that it sends \`iss\` and none arrived, the client rejects the response. An MCP client deals with many authorization servers, some of them hostile; this check stops one from harvesting codes meant for another.`,
    },
    {
      from: "client",
      to: "as",
      kind: "back",
      label: "Token request + verifier",
      title: "The client redeems the code",
      body: `With the PKCE verifier and, again, the \`resource\` parameter. There is no \`redirect_uri\` here: MCP builds on OAuth 2.1, which removed it from the token request.`,
      code: {
        lang: "http",
        text: `POST /token HTTP/1.1
Host: auth.example.com
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code
&code=SplxlOBeZQQYbYS6WxSbIA
&client_id=https://app.example.com/oauth/client.json
&code_verifier=dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk
&resource=https://mcp.example.com/mcp`,
      },
      lose: [
        ["client", "authorization code"],
        ["client", "code_verifier"],
      ],
    },
    {
      from: "as",
      to: "client",
      kind: "resp",
      label: "Access token for this server",
      title: "A token for one MCP server",
      body: `The client stores it against this issuer and this server. A refresh token may or may not be issued; clients must not assume one.`,
      gain: [["client", "access token (aud: MCP server)"]],
    },
    {
      from: "client",
      to: "mcp",
      kind: "back",
      label: "MCP request + Bearer token",
      title: "The client retries with the token",
      body: `The token goes in the \`Authorization\` header on every request. As of 2026-07-28 MCP has no sessions and no initialization handshake, so the bearer token is the only thing identifying the caller from one request to the next. For the same reason every request states its protocol version, in the \`MCP-Protocol-Version\` header and again in \`_meta\`, where it also declares the client’s capabilities. The \`Mcp-Method\` and \`Mcp-Name\` headers let a gateway apply per-tool policy without parsing the body.`,
      code: {
        lang: "http",
        text: `POST /mcp HTTP/1.1
Host: mcp.example.com
Authorization: Bearer eyJhbGciOiJFUzI1NiIsInR5cCI6ImF0K2p3dCJ9…
Accept: application/json, text/event-stream
Content-Type: application/json
MCP-Protocol-Version: 2026-07-28
Mcp-Method: tools/call
Mcp-Name: search_files

{"jsonrpc":"2.0","id":2,"method":"tools/call",
 "params":{"name":"search_files","arguments":{"query":"Q3 plan"},
  "_meta":{"io.modelcontextprotocol/protocolVersion":"2026-07-28",
           "io.modelcontextprotocol/clientCapabilities":{}}}}`,
      },
    },
    {
      from: "mcp",
      to: "client",
      kind: "resp",
      label: "Validate audience; result",
      title: "The server validates and responds",
      body: `The server must confirm the token was issued for it and reject anything else. If the tool needs a scope the token lacks, it answers \`403\` with an \`insufficient_scope\` challenge listing everything the operation needs, and the client runs a [step-up](/flows/step-up-authorization/) for the union of old and new scopes.`,
    },
  ],
  standards: [
    "mcp-authorization",
    "oauth-2-1",
    "cimd",
    "rfc9728",
    "rfc8414",
    "rfc8707",
    "rfc9207",
    "rfc7636",
    "oidc-discovery",
    "rfc6750",
    "rfc7591",
  ],
  basis: ["mcp-authorization"],
  roles: {
    "mcp-authorization": "required", // the stated basis: revision 2026-07-28
    "oauth-2-1": "required", // the MCP revision requires it, and cites draft -13
    cimd: "required", // how the client is identified in steps 4 to 8
    rfc9728: "required", // steps 2 and 3
    rfc8414: "required", // step 4, as drawn
    "oidc-discovery": "required", // not drawn, but step 4 says a conforming client must support it: MCP 2026-07-28 says clients MUST support both
    rfc8707: "required", // `resource`, steps 6, 11, 14
    rfc9207: "required", // `iss`, steps 4, 9, 10
    rfc7636: "required", // PKCE, steps 5, 6, 11
    rfc6750: "required", // the Bearer challenge and header, steps 2 and 13
    rfc7591: "optional", // deprecated, and MCP 2026-07-28 says clients and servers MAY support it; no registration message is drawn
  },
  related: [
    "authorization-code-pkce",
    "url-elicitation",
    "cross-app-access",
    "step-up-authorization",
  ],
  sections: [
    {
      id: "server",
      title: "If you are writing the server",
      intro: `Most of the fourteen steps belong to the client and the authorization server. A server author’s share is three of them, and a few decisions that come first.`,
      parts: [
        {
          title: "Does a server need this at all?",
          body: `Authorization is optional in MCP. A server that the client launches as a local process takes its credentials from its environment, and a server that only serves public, read-only data may have nothing to protect.

A remote server that acts on a user’s data is the case this flow is for. It has to know which user each request is for, from something it can check.`,
        },
        {
          title: "Why not an API key?",
          body: `There are two ways to use one, and they fail differently.

**One key for the whole client** tells your server which application is calling and nothing about which person. Your server then cannot keep one user’s data from another. [Lesson 1](/learn/what-the-api-sees/) walks through that.

**A key for each user, pasted into the client’s configuration**, does identify the user. But it is long-lived, it is often good for everything that user can do, and the user has to copy it by hand into a file on a machine you do not control.

An access token from this flow is short-lived, as short as the authorization server is set to make it. It carries only the scopes the user approved and, where the authorization server honors the \`resource\` parameter, it is issued for your server alone.

The client may still hold a refresh token on that machine. The difference is that it belongs to one client, can be replaced and revoked for that client alone, and the user never sees or pastes it.`,
        },
        {
          title: "Where the authorization server comes from",
          body: `It is a separate role, and usually a separate service. You rarely write one. The sign-in system your company already runs can be it, or an identity product you host or subscribe to.

The specification requires it to implement OAuth 2.1, publish its metadata and support PKCE. For your audience check to mean anything, choose one that also honors the \`resource\` parameter, so that a token is issued for your server alone. For clients that have never registered with it, choose one that accepts a Client ID Metadata Document, which the specification says it should.`,
        },
        {
          title: "What you build",
          body: `**A 401 that points the way** (step 2). Answer a request that has no token with the address of your metadata.

**A metadata document** (step 3). A small JSON file that names your authorization server and the scopes a client needs to get started.

**Token validation on every request** (step 14). Signature, issuer, expiry and scope, and above all that the token was issued for your server. Reject anything else. [Lesson 2](/learn/tokens/) takes those checks one at a time. If the tokens are JWTs, a library does the cryptography, with the public keys your authorization server publishes at the address its metadata gives. If they are opaque, your server asks the authorization server what each one stands for. Either way, the audience and scope checks are the part to get right.`,
        },
        {
          title: "What you must not do",
          body: `Do not pass the client’s token to the API behind you. It was issued for your server, and the next service should refuse it.

Do not turn your server into a silent front for someone else’s sign-in. If it accepts sign-ins from MCP clients and forwards them to a provider under one client ID of its own, it has to show its own consent screen for each client first, naming the client and where the code will be sent. Otherwise the provider’s remembered consent lets an attacker’s client collect a code the user never approved.

If your server has to call something else for the user, it gets a token of its own: by [token exchange](/flows/token-exchange/) where both sit under one authorization server, or by sending the user to connect that account directly, which is [URL elicitation](/flows/url-elicitation/).`,
        },
      ],
    },
  ],
  notes: [
    {
      title: "Why this flow is rated emerging",
      body: `The 2026-07-28 revision is published and current, but two things this page draws rest on IETF working-group drafts. The revision requires authorization servers to implement OAuth 2.1 and cites draft -13; the current draft is -17. It recommends Client ID Metadata Documents, which steps 4 to 8 use, and cites draft -00; the current draft is -03. Both current drafts require the authorization server to send \`iss\`, which the revision only recommends (step 9). Either draft can still change. The rating describes those dependencies. It is not a judgment on how safe the flow is.`,
    },
    {
      title: "How the specification got here",
      body: `**2025-03-26.** First authorization framework. The MCP server doubled as the authorization server.

**2025-06-18.** The MCP server became a resource server. Protected resource metadata and resource indicators became mandatory; token passthrough was prohibited.

**2025-11-25.** Client ID Metadata Documents became the preferred way to identify a client and Dynamic Client Registration became optional. Step-up through \`insufficient_scope\` challenges and URL-mode elicitation were added.

**2026-07-28.** The protocol became stateless. Dynamic Client Registration was deprecated, issuer validation (RFC 9207) was added, and client credentials were bound to their issuer.

The two official authorization extensions are kept in their own repository and became stable on their own dates: enterprise-managed authorization in June 2026 and client credentials in October 2026.`,
    },
    {
      title: "When no human is present",
      body: `The same discovery steps apply to machine-to-machine use. The official **OAuth Client Credentials** extension has the client authenticate with a signed JWT assertion (recommended) or a secret, with pre-registered credentials. See [client credentials](/flows/client-credentials/).`,
    },
  ],
};
