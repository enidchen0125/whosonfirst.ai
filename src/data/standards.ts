import type { Standard } from "./types";

/**
 * The standards tracker.
 *
 * Status and revision details were checked in November 2026 (see data/site.ts).
 * Revision numbers and dates come from the IETF document mirror and from
 * specification repositories. Process states ("in last call", "with the RFC
 * Editor") are reported from secondary sources and are worded accordingly.
 */

const rfc = (n: number) => `https://www.rfc-editor.org/rfc/rfc${n}`;
const draft = (name: string) => `https://datatracker.ietf.org/doc/${name}/`;

export const standards: Standard[] = [
  /* ───────────── Core OAuth ───────────── */
  {
    id: "oauth-2-1",
    name: "OAuth 2.1",
    ref: "draft-ietf-oauth-v2-1",
    body: "IETF",
    status: "wg-draft",
    detail:
      "Revision -17, October 2026. OAuth working group document; submission to the IESG is targeted for December 2026. Recent revisions removed the PKCE “plain” method and require authorization servers to send the `iss` response parameter.",
    topics: ["core"],
    summary:
      "Consolidates OAuth 2.0, bearer tokens, PKCE and the security best current practice into one framework. No implicit grant, no password grant, PKCE everywhere, exact redirect matching.",
    agents:
      "The baseline MCP profiles. Worth knowing that the normative base of most agent authorization is still, formally, a draft.",
    url: draft("draft-ietf-oauth-v2-1"),
  },
  {
    id: "rfc6749",
    name: "OAuth 2.0 Authorization Framework",
    ref: "RFC 6749",
    body: "IETF",
    status: "rfc",
    detail:
      "October 2012. Still the current standard until OAuth 2.1 is published.",
    topics: ["core"],
    summary:
      "Defines the roles (client, authorization server, resource server) and the core grants: authorization code, client credentials, refresh.",
    agents:
      "The foundation under MCP authorization and nearly every agent delegation scheme.",
    url: rfc(6749),
  },
  {
    id: "rfc6750",
    name: "Bearer Token Usage",
    ref: "RFC 6750",
    body: "IETF",
    status: "rfc",
    detail: "October 2012.",
    topics: ["core"],
    summary:
      "The `Authorization: Bearer` header and the `WWW-Authenticate` error vocabulary, including `insufficient_scope`.",
    agents:
      "The default way agents present tokens, and the thing proof-of-possession schemes are trying to replace.",
    url: rfc(6750),
  },
  {
    id: "rfc7636",
    name: "PKCE",
    ref: "RFC 7636",
    body: "IETF",
    status: "rfc",
    detail: "September 2015.",
    topics: ["core"],
    summary:
      "Proof Key for Code Exchange. Binds an authorization code to the client instance that requested it.",
    agents:
      "Mandatory for MCP clients, which must also refuse to proceed if a server does not advertise support.",
    url: rfc(7636),
  },
  {
    id: "rfc8252",
    name: "OAuth for Native Apps",
    ref: "RFC 8252",
    body: "IETF",
    status: "rfc",
    detail: "October 2017. BCP 212.",
    topics: ["core"],
    summary:
      "How desktop and mobile apps should run OAuth: the system browser and loopback or app-claimed redirect URIs.",
    agents:
      "Governs desktop agents, IDE extensions and CLIs, which are native public clients.",
    url: rfc(8252),
  },
  {
    id: "rfc10017",
    name: "OAuth for Browser-Based Applications",
    ref: "RFC 10017",
    body: "IETF",
    status: "rfc",
    detail: "August 2026. BCP 212.",
    topics: ["core"],
    summary:
      "Threats and architecture patterns for apps that run in a browser: backend-for-frontend, token-mediating backend, and browser-only.",
    agents:
      "Applies to agents and copilots embedded in web pages. New in 2026.",
    url: rfc(10017),
  },
  {
    id: "rfc9700",
    name: "OAuth 2.0 Security Best Current Practice",
    ref: "RFC 9700",
    body: "IETF",
    status: "rfc",
    detail: "January 2025. BCP 240. An update draft is in progress.",
    topics: ["core", "guidance"],
    summary:
      "The consolidated list of OAuth attacks and required defenses. Deprecates the implicit and password grants.",
    agents: "The minimum bar for any agent acting as an OAuth client.",
    url: rfc(9700),
  },
  {
    id: "rfc8707",
    name: "Resource Indicators",
    ref: "RFC 8707",
    body: "IETF",
    status: "rfc",
    detail: "February 2020.",
    topics: ["core", "delegation"],
    summary:
      "The `resource` request parameter, which tells the authorization server which API a token is for so it can restrict the audience.",
    agents:
      "Required by MCP. An agent talks to many servers; this is how a client asks for a token good at one server only. What stops replay is the authorization server honoring it and each API checking the audience.",
    url: rfc(8707),
  },
  {
    id: "rfc9207",
    name: "Authorization Server Issuer Identification",
    ref: "RFC 9207",
    body: "IETF",
    status: "rfc",
    detail: "March 2022.",
    topics: ["core"],
    summary:
      "Adds an `iss` parameter to the authorization response so a client can tell which server answered.",
    agents:
      "The defense against mix-up attacks for clients that use many authorization servers. Clients must validate it under MCP 2026-07-28.",
    url: rfc(9207),
  },
  {
    id: "rfc7519",
    name: "JSON Web Token (JWT)",
    ref: "RFC 7519",
    body: "IETF",
    status: "rfc",
    detail: "May 2015.",
    topics: ["core"],
    summary:
      "A compact way to carry claims between two parties, signed or encrypted, with seven registered claims: `iss`, `sub`, `aud`, `exp`, `nbf`, `iat` and `jti`. A recipient not named in `aud` must reject the token, and no one may accept it at or after `exp`.",
    agents:
      "The format under most tokens on this site: JWT access tokens, ID tokens, Kubernetes service account tokens and workload identity tokens.",
    url: rfc(7519),
  },
  {
    id: "rfc9068",
    name: "JWT Profile for Access Tokens",
    ref: "RFC 9068",
    body: "IETF",
    status: "rfc",
    detail: "October 2021.",
    topics: ["core"],
    summary:
      "A standard set of claims for JWT-formatted access tokens (`at+jwt`).",
    agents: "The usual carrier for `act` and other agent-related claims.",
    url: rfc(9068),
  },
  {
    id: "rfc7662",
    name: "Token Introspection",
    ref: "RFC 7662",
    body: "IETF",
    status: "rfc",
    detail: "October 2015.",
    topics: ["core"],
    summary:
      "An endpoint where a resource server asks the authorization server whether a token is active and what it stands for. Only `active` is required in the answer; `sub`, `client_id` and `scope` are optional.",
    agents:
      "How an API that cannot read a token, or wants its current state, learns who and what the token is for.",
    url: rfc(7662),
  },
  {
    id: "rfc7009",
    name: "Token Revocation",
    ref: "RFC 7009",
    body: "IETF",
    status: "rfc",
    detail: "August 2013.",
    topics: ["core"],
    summary:
      "An endpoint where a client asks the authorization server to revoke a token. Servers must support revoking refresh tokens and should support revoking access tokens.",
    agents:
      "Revocation happens at the authorization server. An API that validates self-contained tokens on its own needs something more to learn of it; the RFC names short token lifetimes and communication between the two servers as options.",
    url: rfc(7009),
  },
  {
    id: "rfc9126",
    name: "Pushed Authorization Requests",
    ref: "RFC 9126",
    body: "IETF",
    status: "rfc",
    detail: "September 2021. Updated by RFC 10070.",
    topics: ["core"],
    summary:
      "The client sends its authorization request directly to the server first and gets back a reference to use in the browser.",
    agents:
      "Keeps detailed, transaction-specific requests out of URLs and safe from tampering.",
    url: rfc(9126),
  },
  {
    id: "rfc9101",
    name: "JWT-Secured Authorization Request",
    ref: "RFC 9101",
    body: "IETF",
    status: "rfc",
    detail: "August 2021.",
    topics: ["core"],
    summary:
      "Authorization request parameters packaged as a signed, optionally encrypted JWT.",
    agents:
      "Integrity for rich authorization requests an agent makes on a user’s behalf.",
    url: rfc(9101),
  },
  {
    id: "rfc9635",
    name: "GNAP",
    ref: "RFC 9635",
    body: "IETF",
    status: "rfc",
    detail: "October 2024. Resource server companion is RFC 9767.",
    topics: ["core", "delegation"],
    summary:
      "Grant Negotiation and Authorization Protocol: a ground-up redesign with key-bound clients, negotiated interaction and continuation.",
    agents:
      "Little deployment, but several newer agent proposals borrow its ideas.",
    url: rfc(9635),
  },

  /* ───────────── Discovery and client identity ───────────── */
  {
    id: "rfc9728",
    name: "Protected Resource Metadata",
    ref: "RFC 9728",
    body: "IETF",
    status: "rfc",
    detail: "April 2025.",
    topics: ["discovery"],
    summary:
      "A well-known document where a resource server names the authorization servers that protect it, plus a `resource_metadata` pointer in `WWW-Authenticate`.",
    agents:
      "How an agent that has only a server URL finds out where to get a token. MCP servers must implement it.",
    url: rfc(9728),
  },
  {
    id: "rfc8414",
    name: "Authorization Server Metadata",
    ref: "RFC 8414",
    body: "IETF",
    status: "rfc",
    detail: "June 2018.",
    topics: ["discovery"],
    summary:
      "A well-known document listing an authorization server’s endpoints and capabilities.",
    agents:
      "Zero-configuration discovery. MCP clients must support this and OpenID Connect discovery.",
    url: rfc(8414),
  },
  {
    id: "oidc-discovery",
    name: "OpenID Connect Discovery",
    ref: "OpenID Connect Discovery 1.0",
    body: "OpenID Foundation",
    status: "final",
    // The published page titles itself "Final: OpenID Connect Discovery 1.0 incorporating errata set 2".
    detail:
      "Final specification, incorporating errata set 2, December 15, 2023.",
    topics: ["discovery"],
    summary:
      "The `/.well-known/openid-configuration` document and its JWKS pointer.",
    agents:
      "An MCP authorization server publishes this or RFC 8414 metadata, and an MCP client must support both. It is also the format Kubernetes clusters and CI systems use to publish workload-identity signing keys.",
    url: "https://openid.net/specs/openid-connect-discovery-1_0.html",
  },
  {
    id: "cimd",
    name: "Client ID Metadata Documents",
    ref: "draft-ietf-oauth-client-id-metadata-document",
    body: "IETF",
    status: "wg-draft",
    detail:
      "Revision -03, November 2026. OAuth working group document. The latest revision requires URL normalization and defines error handling. MCP 2026-07-28 cites -00; the MCP draft revision moves to -03.",
    topics: ["registration", "discovery"],
    summary:
      "The `client_id` is an HTTPS URL. The authorization server fetches client metadata from it, so no prior registration is needed.",
    agents:
      "The preferred way for an MCP client to identify itself to a server it has never met.",
    url: draft("draft-ietf-oauth-client-id-metadata-document"),
  },
  {
    id: "rfc7591",
    name: "Dynamic Client Registration",
    ref: "RFC 7591",
    body: "IETF",
    status: "rfc",
    detail:
      "July 2015. Deprecated within MCP as of 2026-07-28, with removal possible from July 2027.",
    topics: ["registration"],
    summary:
      "A client posts its metadata to a registration endpoint and receives a client ID.",
    agents:
      "The original answer for MCP. It left authorization servers with unbounded anonymous registrations, which is why MCP moved away from it.",
    url: rfc(7591),
  },
  {
    id: "attestation-client-auth",
    name: "Attestation-Based Client Authentication",
    ref: "draft-ietf-oauth-attestation-based-client-auth",
    body: "IETF",
    status: "wg-draft",
    detail:
      "Revision -12, October 2026, following a working group last call in September. That revision changed the header syntax in a wire-breaking way.",
    topics: ["registration", "proof-of-possession"],
    summary:
      "A client instance presents an attestation from its platform or backend, plus proof of possession of a key, to authenticate.",
    agents:
      "A way for a platform to vouch for an individual agent instance. Proposals for agent-instance claims build on it.",
    url: draft("draft-ietf-oauth-attestation-based-client-auth"),
  },
  {
    id: "spiffe-client-auth",
    name: "SPIFFE Client Authentication",
    ref: "draft-ietf-oauth-spiffe-client-auth",
    body: "IETF",
    status: "wg-draft",
    detail:
      "Revision -03, November 2026. OAuth working group document, reported as waiting on a WIMSE dependency.",
    topics: ["registration", "workload"],
    summary:
      "A workload authenticates to an authorization server with its SPIFFE credential in place of a client secret.",
    agents:
      "Secretless OAuth client authentication for agents that already have a workload identity.",
    url: draft("draft-ietf-oauth-spiffe-client-auth"),
  },
  {
    id: "rfc7523",
    name: "JWT Client Authentication and Grants",
    ref: "RFC 7523",
    body: "IETF",
    status: "rfc",
    detail: "May 2015. Updated by RFC 10070.",
    topics: ["core", "registration", "delegation"],
    summary:
      "Two uses of a signed JWT at the token endpoint: authenticating a client (`private_key_jwt`) and as an authorization grant (`jwt-bearer`).",
    agents:
      "Secretless client authentication, and the second leg of ID-JAG and identity chaining.",
    url: rfc(7523),
  },
  {
    id: "rfc10070",
    name: "Updates to JWT Client Authentication",
    ref: "RFC 10070",
    body: "IETF",
    status: "rfc",
    detail: "November 2026. Updates RFCs 7521, 7522, 7523 and 9126.",
    topics: ["core", "registration"],
    summary:
      "Fixes an audience-confusion weakness in client assertions: the audience must be the authorization server’s issuer identifier.",
    agents:
      "Any agent using `private_key_jwt` or JWT bearer grants should follow it. Published this month.",
    url: rfc(10070),
  },

  /* ───────────── Delegation ───────────── */
  {
    id: "rfc8693",
    name: "Token Exchange",
    ref: "RFC 8693",
    body: "IETF",
    status: "rfc",
    detail:
      "January 2020. No revision is in progress; all work on richer actor chains is in individual drafts.",
    topics: ["delegation"],
    summary:
      "A token endpoint grant that trades one token for another, and the `act` and `may_act` claims for expressing delegation.",
    agents:
      "The primitive under on-behalf-of flows, ID-JAG, identity chaining and transaction tokens.",
    url: rfc(8693),
  },
  {
    id: "id-jag",
    name: "Identity Assertion Authorization Grant (ID-JAG)",
    ref: "draft-ietf-oauth-identity-assertion-authz-grant",
    body: "IETF",
    status: "wg-draft",
    detail:
      "Revision -06, October 2026. OAuth working group document. Revisions -05 and -06 tightened audience rules and added key binding. The MCP extension pins -04.",
    topics: ["delegation"],
    summary:
      "An enterprise identity provider issues a short-lived grant that another application’s authorization server exchanges for an access token, with no user redirect. Also called Cross-App Access.",
    agents:
      "Lets a company’s identity provider decide which agent may reach which application for which employee.",
    url: draft("draft-ietf-oauth-identity-assertion-authz-grant"),
  },
  {
    id: "identity-chaining",
    name: "Identity and Authorization Chaining Across Domains",
    ref: "draft-ietf-oauth-identity-chaining",
    body: "IETF",
    status: "wg-draft",
    detail:
      "Revision -17, July 2026. Reported approved and in the RFC Editor queue since June 2026; no RFC number yet.",
    topics: ["delegation"],
    summary:
      "Token exchange in one domain yields a JWT grant that is redeemed at another domain’s authorization server.",
    agents:
      "The general mechanism for carrying identity across a trust boundary. ID-JAG is a profile of it.",
    url: draft("draft-ietf-oauth-identity-chaining"),
  },
  {
    id: "txn-tokens",
    name: "Transaction Tokens",
    ref: "draft-ietf-oauth-transaction-tokens",
    body: "IETF",
    status: "wg-draft",
    detail:
      "Revision -11, July 2026. Reported to have completed a third working group last call and to be awaiting write-up.",
    topics: ["delegation", "workload"],
    summary:
      "A short-lived, signed token that carries user identity and immutable request context through a call chain inside one trust domain.",
    agents:
      "Stops access tokens being passed between an agent’s internal tools and services while keeping the user’s intent attached.",
    url: draft("draft-ietf-oauth-transaction-tokens"),
  },
  {
    id: "txn-tokens-agents",
    name: "Transaction Tokens for Agents",
    ref: "draft-araut-oauth-transaction-tokens-for-agents",
    body: "IETF",
    status: "draft",
    detail:
      "Revision -03, October 2026. Individual draft, renamed during 2026; its claim design changed to an `agentic_ctx` claim.",
    topics: ["delegation"],
    summary:
      "Extends transaction tokens with agent context, re-issued at each agent hop.",
    agents: "One of several attempts to record which agents handled a request.",
    url: draft("draft-araut-oauth-transaction-tokens-for-agents"),
  },
  {
    id: "actor-profile",
    name: "OAuth Actor Profile and Actor Chain",
    ref: "draft-mcguinness-oauth-actor-profile · draft-mw-oauth-actor-chain",
    body: "IETF",
    status: "draft",
    detail: "Individual drafts, both revised in fall 2026. Neither is adopted.",
    topics: ["delegation"],
    summary:
      "Two proposals to make the `act` claim interoperable: one classifies actor types, the other defines a cryptographically verifiable ordered chain.",
    agents:
      "RFC 8693 treats nested actors as history only. These try to make a multi-agent chain something a resource can rely on.",
    url: draft("draft-mcguinness-oauth-actor-profile"),
  },
  {
    id: "delegate-sd-jwt",
    name: "Delegate SD-JWT",
    ref: "draft-ietf-oauth-delegate-sd-jwt",
    body: "IETF",
    status: "wg-draft",
    detail:
      "Revision -00, October 2026. Newly adopted by the OAuth working group.",
    topics: ["delegation", "credentials"],
    summary:
      "Lets the holder of an SD-JWT credential delegate it to another holder by making the key-binding JWT itself an SD-JWT.",
    agents:
      "The one adopted OAuth working group document whose abstract names agentic systems.",
    url: draft("draft-ietf-oauth-delegate-sd-jwt"),
  },
  {
    id: "mission-bound",
    name: "Mission-Bound Authorization",
    ref: "draft-mcguinness-oauth-mission",
    body: "IETF",
    status: "draft",
    detail:
      "Revision -02, November 2026. Individual draft; the subject of an OAuth interim meeting in October 2026.",
    topics: ["delegation", "human-in-the-loop", "authorization"],
    summary:
      "The client submits a description of a task. The server derives detailed permissions from it, binds them to an approver’s consent, and ties tokens to the task’s lifecycle.",
    agents:
      "The most active current thread on authorizing a bounded piece of agent work, as opposed to granting standing scopes.",
    url: draft("draft-mcguinness-oauth-mission"),
  },

  /* ───────────── Human in the loop ───────────── */
  {
    id: "rfc8628",
    name: "Device Authorization Grant",
    ref: "RFC 8628",
    body: "IETF",
    status: "rfc",
    detail: "August 2019.",
    topics: ["human-in-the-loop", "core"],
    summary:
      "The user approves on a second device by entering a short code while the client polls.",
    agents:
      "The default for headless and command-line agents. Read alongside RFC 10027.",
    url: rfc(8628),
  },
  {
    id: "cross-device-bcp",
    name: "Security of Cross-Device Flows",
    ref: "RFC 10027",
    body: "IETF",
    status: "rfc",
    detail: "August 2026. BCP 247.",
    topics: ["human-in-the-loop", "guidance"],
    summary:
      "Threats and mitigations for flows where approval happens on a different device from the one being authorized.",
    agents:
      "Covers the consent-phishing risks of device codes and backchannel prompts, which is how agents usually reach humans. New in 2026.",
    url: rfc(10027),
  },
  {
    id: "ciba",
    name: "CIBA",
    ref: "OpenID Connect CIBA Core 1.0",
    body: "OpenID Foundation",
    status: "final",
    detail: "Final since September 2021.",
    topics: ["human-in-the-loop"],
    summary:
      "Client-Initiated Backchannel Authentication. The client asks the server to obtain a named user’s approval on their own device, then polls or is called back.",
    agents:
      "The established way for a background agent to ask a person for approval. The IETF agent architecture draft recommends it, while noting it fits approval before a task better than in the middle of one.",
    url: "https://openid.net/specs/openid-client-initiated-backchannel-authentication-core-1_0.html",
  },
  {
    id: "rfc9470",
    name: "Step-Up Authentication Challenge",
    ref: "RFC 9470",
    body: "IETF",
    status: "rfc",
    detail: "September 2023.",
    topics: ["human-in-the-loop"],
    summary:
      "A resource server signals that the user must authenticate more strongly or more recently, with `acr_values` and `max_age`.",
    agents:
      "Lets an API pull a human back in for sensitive operations instead of trusting a long-lived grant.",
    url: rfc(9470),
  },
  {
    id: "rfc9396",
    name: "Rich Authorization Requests",
    ref: "RFC 9396",
    body: "IETF",
    status: "rfc",
    detail:
      "May 2023. A companion draft on metadata and error remediation is reported to be headed for working group adoption.",
    topics: ["human-in-the-loop", "authorization"],
    summary:
      "`authorization_details`: a structured JSON description of exactly what is being authorized, in place of coarse scope strings.",
    agents:
      "Consent for one payment or one file, not “payments” or “files.” The base of several agent proposals.",
    url: rfc(9396),
  },
  {
    id: "deferred-token-response",
    name: "Deferred Token Response",
    ref: "draft-ietf-oauth-deferred-token-response",
    body: "IETF",
    status: "wg-draft",
    detail:
      "Revision -01, October 2026. Adopted by the OAuth working group in 2026.",
    topics: ["human-in-the-loop"],
    summary:
      "The token endpoint for any grant may answer “not yet” with a deferral code. The client polls or receives a callback once a decision is made.",
    agents:
      "The OAuth working group’s mechanism for asynchronous and human-in-the-loop approval. Unlike CIBA, the server decides to defer and the client need not name the user.",
    url: draft("draft-ietf-oauth-deferred-token-response"),
  },
  {
    id: "aauth-rosenberg",
    name: "AAuth: Agentic Authorization Grant",
    ref: "draft-rosenberg-oauth-aauth",
    body: "IETF",
    status: "draft",
    detail: "Revision -02, November 2026. Individual draft.",
    topics: ["human-in-the-loop"],
    summary:
      "A new OAuth 2.1 grant by which an agent obtains a token at the moment of access through a human-in-the-loop approval.",
    agents:
      "One of two unrelated proposals called AAuth. This one extends OAuth.",
    url: draft("draft-rosenberg-oauth-aauth"),
  },
  {
    id: "aauth-hardt",
    name: "AAuth Protocol",
    ref: "draft-hardt-oauth-aauth-protocol",
    body: "IETF",
    status: "draft",
    detail:
      "Revision -11, September 2026. Individual draft with several companions. That revision added the person token and arranged access into five modes. Its author reports the work is moving to a new OpenID Foundation working group.",
    topics: ["proof-of-possession", "delegation", "agent-protocol"],
    summary:
      "Not an OAuth extension. Every agent has its own key and signs every request with HTTP Message Signatures; there are no bearer tokens and no pre-registration.",
    agents:
      "A clean-slate design for agent identity and authorization. One of two unrelated proposals called AAuth. This one does not extend OAuth.",
    url: draft("draft-hardt-oauth-aauth-protocol"),
  },

  /* ───────────── Proof of possession ───────────── */
  {
    id: "rfc9449",
    name: "DPoP",
    ref: "RFC 9449",
    body: "IETF",
    status: "rfc",
    detail: "September 2023.",
    topics: ["proof-of-possession"],
    summary:
      "Demonstrating Proof of Possession. Tokens are bound to a client key, and each request carries a signed proof.",
    agents:
      "A token copied alone from a log or a trace is refused by an API that checks the binding.",
    url: rfc(9449),
  },
  {
    id: "rfc8705",
    name: "Mutual TLS and Certificate-Bound Tokens",
    ref: "RFC 8705",
    body: "IETF",
    status: "rfc",
    detail: "February 2020.",
    topics: ["proof-of-possession", "workload"],
    summary:
      "Client authentication with a TLS certificate, and access tokens bound to that certificate.",
    agents:
      "Sender-constraining for agents that already have workload certificates.",
    url: rfc(8705),
  },
  {
    id: "rfc9421",
    name: "HTTP Message Signatures",
    ref: "RFC 9421",
    body: "IETF",
    status: "rfc",
    detail: "February 2024.",
    topics: ["proof-of-possession"],
    summary:
      "A general way to sign selected parts of an HTTP request or response.",
    agents:
      "The building block under Web Bot Auth, the WIMSE HTTP signature profile, AAuth, and the card networks’ agent protocols.",
    url: rfc(9421),
  },
  {
    id: "rfc7638",
    name: "JWK Thumbprint",
    ref: "RFC 7638",
    body: "IETF",
    status: "rfc",
    detail: "September 2015.",
    topics: ["proof-of-possession"],
    summary: "A canonical hash of a JSON Web Key.",
    agents:
      "How DPoP and related schemes refer to the key a token is bound to.",
    url: rfc(7638),
  },
  {
    id: "signature-key",
    name: "HTTP Signature Keys",
    ref: "draft-hardt-httpbis-signature-key",
    body: "IETF",
    status: "draft",
    detail:
      "Revision -09, September 2026. Individual draft; a call for adoption in the HTTP working group was issued, outcome not confirmed.",
    topics: ["proof-of-possession"],
    summary:
      "A header for conveying or referencing the public key that verifies an HTTP message signature.",
    agents:
      "Would give signed-request schemes a common way to find the signer’s key. AAuth is built on it.",
    url: draft("draft-hardt-httpbis-signature-key"),
  },

  /* ───────────── Workload identity ───────────── */
  {
    id: "spiffe",
    name: "SPIFFE",
    ref: "SPIFFE specifications",
    body: "CNCF",
    status: "final",
    detail:
      "CNCF graduated project. X.509-SVID and JWT-SVID are stable. In 2026 the project added a third document type, the WIT-SVID (incubating), plus a Broker API and a filesystem delivery specification.",
    topics: ["workload"],
    summary:
      "Secure Production Identity Framework for Everyone: a URI naming scheme for workloads, short-lived identity documents, and a local API for obtaining them without a bootstrap secret.",
    agents:
      "The de facto workload identifier reused by the IETF agent architecture draft, cloud agent-identity products and agent gateways.",
    url: "https://spiffe.io/docs/latest/spiffe-about/overview/",
  },
  {
    id: "spire",
    name: "SPIRE",
    ref: "SPIRE 1.16",
    body: "CNCF",
    status: "project",
    // Evidence for the level: the project's README says "SPIRE is a graduated project of the Cloud
    // Native Computing Foundation". This is the project as a whole, not each plugin or flagged feature.
    level: "stable",
    detail:
      "Version 1.16.0, November 2026, adds experimental WIT-SVID support.",
    topics: ["workload", "kubernetes"],
    summary:
      "The reference implementation of SPIFFE: a server and per-node agents that attest workloads and issue identities.",
    agents: "The usual way to run SPIFFE yourself, on Kubernetes or elsewhere.",
    url: "https://github.com/spiffe/spire",
  },
  {
    id: "wimse-arch",
    name: "WIMSE Architecture",
    ref: "draft-ietf-wimse-arch",
    body: "IETF",
    status: "wg-draft",
    detail:
      "Revision -08, July 2026. WIMSE working group document. No WIMSE document is an RFC yet.",
    topics: ["workload"],
    summary:
      "Architecture and terminology for workload identity and for propagating security context between workloads.",
    agents:
      "Includes a section on agents: each hop in an agent chain must explicitly scope and re-bind the security context.",
    url: draft("draft-ietf-wimse-arch"),
  },
  {
    id: "wimse-aims",
    name: "AI Identity Management System (AIMS)",
    ref: "draft-ietf-wimse-aims",
    body: "IETF",
    status: "wg-draft",
    detail:
      "Revision -01, November 2026. Informational. Adopted by WIMSE in September 2026; previously the individual draft draft-klrc-aiagent-auth.",
    topics: ["workload", "delegation", "guidance"],
    summary:
      "Defines no new protocol. Describes how existing ones compose for agents: workload identity for the agent, OAuth for authorization, transaction tokens inside a domain, identity chaining across domains.",
    agents:
      "The closest thing to an IETF reference architecture for agent authentication and authorization. Its opening position: agents are workloads.",
    url: draft("draft-ietf-wimse-aims"),
  },
  {
    id: "wimse-creds",
    name: "WIMSE Workload Credentials",
    ref: "draft-ietf-wimse-workload-creds",
    body: "IETF",
    status: "wg-draft",
    detail:
      "Revision -03, October 2026. One of four documents that replaced the earlier service-to-service protocol draft.",
    topics: ["workload", "proof-of-possession"],
    summary:
      "Defines the Workload Identity Token (a key-bound JWT) and the Workload Identity Certificate.",
    agents:
      "A workload identity that can pass through proxies without becoming a bearer token.",
    url: draft("draft-ietf-wimse-workload-creds"),
  },
  {
    id: "wimse-wpt",
    name: "Workload Proof Token",
    ref: "draft-ietf-wimse-wpt",
    body: "IETF",
    status: "wg-draft",
    detail: "Revision -02, August 2026.",
    topics: ["workload", "proof-of-possession"],
    summary:
      "A short-lived signed JWT that proves possession of the key in a Workload Identity Token and binds to one request.",
    agents: "The workload equivalent of a DPoP proof.",
    url: draft("draft-ietf-wimse-wpt"),
  },
  {
    id: "wimse-httpsig",
    name: "WIMSE HTTP Signatures",
    ref: "draft-ietf-wimse-http-signature",
    body: "IETF",
    status: "wg-draft",
    detail:
      "Revision -08, October 2026. Reported as submitted to the IESG for publication.",
    topics: ["workload", "proof-of-possession"],
    summary:
      "Workload-to-workload authentication using HTTP Message Signatures with the Workload Identity Token key. Responses can be signed too.",
    agents:
      "End-to-end caller authentication through TLS-terminating gateways.",
    url: draft("draft-ietf-wimse-http-signature"),
  },
  {
    id: "wimse-practices",
    name: "Workload Identity Practices",
    ref: "draft-ietf-wimse-workload-identity-practices",
    body: "IETF",
    status: "wg-draft",
    detail:
      "Revision -08, October 2026. Informational. Reported to be in IETF Last Call in November 2026, which would make it the first WIMSE RFC.",
    topics: ["workload", "guidance", "kubernetes"],
    summary:
      "A survey of how credentials reach workloads today without long-lived secrets: Kubernetes projected tokens, cloud metadata services, SPIFFE, CI/CD OIDC.",
    agents:
      "A vendor-neutral description of the patterns on the deployments pages of this site.",
    url: draft("draft-ietf-wimse-workload-identity-practices"),
  },

  /* ───────────── Kubernetes ───────────── */
  {
    id: "k8s-sa-tokens",
    name: "Bound ServiceAccount Tokens",
    ref: "Kubernetes TokenRequest API",
    body: "Kubernetes",
    status: "final",
    detail:
      "TokenRequest and projected tokens: GA since v1.20. Token ID and pod/node claims: GA in v1.32. OIDC issuer discovery: GA since v1.21. External token signing: GA in v1.36.",
    topics: ["kubernetes", "workload"],
    summary:
      "Short-lived, audience-scoped JWTs bound to a specific pod and delivered by the kubelet through a projected volume. The cluster publishes OIDC discovery metadata so outsiders can verify them.",
    agents:
      "Every pod already has a signed identity document. Workload identity federation turns it into access elsewhere, with no long-lived secret to provision for the pod.",
    url: "https://kubernetes.io/docs/reference/access-authn-authz/service-accounts-admin/",
  },
  {
    id: "k8s-pod-certificates",
    name: "Pod Certificates",
    ref: "Kubernetes KEP-4317",
    body: "Kubernetes",
    status: "final",
    detail:
      "GA in v1.37 (August 2026) in `certificates.k8s.io/v1`. No signer ships with Kubernetes; you install one.",
    topics: ["kubernetes", "workload", "proof-of-possession"],
    summary:
      "The kubelet generates a key, requests a certificate for the pod from a named signer, writes it into a projected volume and rotates it.",
    agents:
      "Native X.509 identity for every pod with no sidecar or node agent: the building block for mutual TLS between agents and tools.",
    url: "https://kubernetes.io/docs/reference/access-authn-authz/certificate-signing-requests/",
  },
  {
    id: "k8s-clustertrustbundle",
    name: "ClusterTrustBundle",
    ref: "Kubernetes KEP-3257",
    body: "Kubernetes",
    status: "final",
    detail: "GA in v1.37 (August 2026).",
    topics: ["kubernetes", "workload"],
    summary:
      "A cluster-scoped object holding X.509 trust anchors, mountable into pods through a projected volume.",
    agents: "The trust-distribution half of Pod Certificates.",
    url: "https://kubernetes.io/docs/reference/access-authn-authz/certificate-signing-requests/#cluster-trust-bundles",
  },
  {
    id: "k8s-structured-authn",
    name: "Structured Authentication Configuration",
    ref: "Kubernetes KEP-3331",
    body: "Kubernetes",
    status: "final",
    detail:
      "GA in v1.34. Structured authorization configuration (KEP-3221) has been GA since v1.32.",
    topics: ["kubernetes"],
    summary:
      "A configuration file for the API server that accepts multiple JWT issuers with CEL-based claim validation and mapping.",
    agents:
      "How tokens from an external identity provider, including an agent platform’s, can authenticate to the Kubernetes API without a webhook.",
    url: "https://kubernetes.io/docs/reference/access-authn-authz/authentication/#using-authentication-configuration",
  },
  {
    id: "k8s-agent-sandbox",
    name: "Agent Sandbox",
    ref: "kubernetes-sigs/agent-sandbox",
    body: "Kubernetes",
    status: "project",
    detail:
      "Project version 1.0 since August 2026; the API is still `v1beta1` in the `agents.x-k8s.io` group. No built-in credential broker.",
    topics: ["kubernetes"],
    summary:
      "A SIG Apps project: a `Sandbox` resource for isolated, stateful, single-pod agent runtimes, with templates, claims and warm pools.",
    agents:
      "Templates turn off service account token mounting by default and generate a network policy that blocks cluster-internal and metadata addresses.",
    url: "https://github.com/kubernetes-sigs/agent-sandbox",
  },
  {
    id: "kube-agentic-networking",
    name: "Kube Agentic Networking",
    ref: "kubernetes-sigs/kube-agentic-networking",
    body: "Kubernetes",
    status: "project",
    detail: "Early releases (v0.x) during 2026. A SIG Network subproject.",
    topics: ["kubernetes", "authorization"],
    summary:
      "APIs for agent-to-tool and agent-to-agent traffic policy, with a reference implementation supporting tool-level MCP authorization and SPIFFE-based agent identity.",
    agents:
      "Where per-tool policy for agents is being worked out at the Kubernetes API level.",
    url: "https://github.com/kubernetes-sigs/kube-agentic-networking",
  },
  {
    id: "agentgateway",
    name: "agentgateway",
    ref: "agentgateway 1.x",
    body: "Linux Foundation",
    status: "project",
    detail:
      "Version 1.7 in October 2026. A Linux Foundation project, reported to have joined the Agentic AI Foundation in June 2026.",
    topics: ["kubernetes", "authorization", "agent-protocol"],
    summary:
      "An open-source proxy for model, MCP and A2A traffic. It can act as an MCP resource server, call an external policy engine per tool call, perform token exchange and ID-JAG, and run as an egress proxy.",
    agents:
      "A concrete place to enforce much of what this site describes without changing agent code.",
    url: "https://github.com/agentgateway/agentgateway",
  },

  /* ───────────── Cloud and CI platforms ───────────── */
  {
    id: "aws-iam-roles",
    name: "AWS IAM Roles",
    ref: "IAM User Guide",
    body: "AWS",
    status: "project",
    detail:
      "Platform documentation. Each compute service documents how it delivers a role’s credentials to code.",
    topics: ["workload"],
    summary:
      "An AWS identity with permissions and no long-term credentials of its own. Whoever assumes a role receives temporary security credentials for that session. Compute services such as Lambda and EC2 assume a role attached to the function or instance and supply its credentials to the code.",
    agents:
      "Native workload identity on AWS: an agent running there calls AWS APIs without an access key being provisioned for it. Using a role inside AWS is not federation.",
    url: "https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles.html",
  },
  {
    id: "aws-oidc-federation",
    name: "AWS OIDC Federation",
    ref: "IAM OIDC identity providers",
    body: "AWS",
    status: "project",
    detail:
      "Platform documentation. The role’s trust policy decides which tokens from the issuer are accepted.",
    topics: ["workload"],
    summary:
      "An IAM OIDC identity provider registers an outside issuer with an AWS account. A workload holding a JWT from that issuer exchanges it for temporary security credentials that map to an IAM role.",
    agents:
      "The way into AWS for CI jobs, Kubernetes pods and workloads on other clouds. The conditions the trust policy puts on audience and subject are the security boundary.",
    url: "https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_oidc.html",
  },
  {
    id: "aws-sts-web-identity",
    name: "AWS Web Identity Exchange",
    ref: "STS AssumeRoleWithWebIdentity",
    body: "AWS",
    status: "project",
    detail:
      "API reference. Sessions last one hour by default, and from 15 minutes up to the maximum set on the role.",
    topics: ["workload"],
    summary:
      "The Security Token Service operation that takes a web identity token and a role, and returns an access key ID, a secret access key and a session token. The call itself is not signed with AWS credentials.",
    agents:
      "What comes back signs AWS API requests. It is not an OAuth bearer access token, which matters to any agent framework that expects one.",
    url: "https://docs.aws.amazon.com/STS/latest/APIReference/API_AssumeRoleWithWebIdentity.html",
  },
  {
    id: "aws-outbound-federation",
    name: "AWS Outbound Identity Federation",
    ref: "STS GetWebIdentityToken",
    body: "AWS",
    status: "project",
    detail:
      "Has to be enabled for the account before a token can be requested. Not available on the STS global endpoint.",
    topics: ["workload"],
    summary:
      "AWS as the identity provider. A workload that already has AWS credentials calls `GetWebIdentityToken` for a short-lived signed JWT naming its IAM principal, for an audience it specifies. Outside services verify the token against keys published under an issuer URL specific to the account.",
    agents:
      "Lets an agent on AWS prove its identity to a service outside AWS, where the token is exchanged for that service’s own credential.",
    url: "https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_outbound.html",
  },
  {
    id: "gcp-wif",
    name: "Google Cloud Workload Identity Federation",
    ref: "Google Cloud IAM",
    body: "Google Cloud",
    status: "project",
    detail: "Platform documentation. The token exchange follows RFC 8693.",
    topics: ["workload"],
    summary:
      "Workloads outside Google Cloud present a credential from their own identity provider to Google’s Security Token Service, which returns a federated access token. A workload identity pool provider holds the trust in the outside issuer and the conditions on its attributes.",
    agents:
      "The way into Google Cloud without a service account key, from AWS, Azure, GitHub, GitLab, Kubernetes clusters, or any OIDC or SAML 2.0 identity provider.",
    url: "https://docs.cloud.google.com/iam/docs/workload-identity-federation",
  },
  {
    id: "gcp-wif-x509",
    name: "Google Cloud Federation with X.509 Certificates",
    ref: "Google Cloud IAM",
    body: "Google Cloud",
    status: "project",
    detail:
      "Platform documentation. The workload authenticates over mutual TLS with a certificate that chains to a registered trust anchor.",
    topics: ["workload"],
    summary:
      "Workload Identity Federation with a client certificate in place of a token. An administrator registers certificate authorities as trust anchors, and a workload holding a certificate that chains to one obtains short-lived Google Cloud credentials over a mutual TLS connection.",
    agents:
      "Federation without a JWT or OIDC discovery. Trust rests on a certificate chain, and the workload has to hold the private key, not only a copy of the certificate.",
    url: "https://docs.cloud.google.com/iam/docs/workload-identity-federation-with-x509-certificates",
  },
  {
    id: "gcp-auth",
    name: "Authentication on Google Cloud",
    ref: "Google Cloud authentication",
    body: "Google Cloud",
    status: "project",
    detail: "Platform documentation.",
    topics: ["workload"],
    summary:
      "How code gets credentials on Google Cloud. A service account attached to the resource is the workload’s identity, and client libraries find its credentials through Application Default Credentials, which asks the metadata server.",
    agents:
      "Native workload identity on Google Cloud. Google recommends it for code running there, and Workload Identity Federation for code running on-premises or on another cloud.",
    url: "https://docs.cloud.google.com/docs/authentication",
  },
  {
    id: "entra-wif",
    name: "Microsoft Entra Workload Identity Federation",
    ref: "Microsoft Entra Workload ID",
    body: "Microsoft",
    status: "project",
    detail:
      "Platform documentation. The issuer, subject and audience of the incoming token must match the configured values exactly; wildcards are not supported.",
    topics: ["workload"],
    summary:
      "An app registration or a user-assigned managed identity is configured, through a federated identity credential, to trust tokens from an outside issuer. The workload sends that token as the client assertion on a client credentials request and receives a Microsoft Entra access token.",
    agents:
      "The way into Microsoft Entra without a client secret or certificate, from Kubernetes, GitHub Actions, Google Cloud, AWS or SPIFFE.",
    url: "https://learn.microsoft.com/en-us/entra/workload-id/workload-identity-federation",
  },
  {
    id: "azure-managed-identities",
    name: "Azure Managed Identities",
    ref: "Managed identities for Azure resources",
    body: "Microsoft",
    status: "project",
    detail: "Platform documentation.",
    topics: ["workload"],
    summary:
      "An identity in Microsoft Entra that Azure creates for a resource, or that you create and assign to one. Code on the resource asks a local endpoint for Microsoft Entra tokens. Azure manages the underlying credentials, which you never handle.",
    agents:
      "Native workload identity on Azure. A user-assigned managed identity can also be what federation from outside maps onto.",
    url: "https://learn.microsoft.com/en-us/entra/identity/managed-identities-azure-resources/overview",
  },
  {
    id: "github-actions-oidc",
    name: "OpenID Connect in GitHub Actions",
    ref: "GitHub Actions OIDC",
    body: "GitHub",
    status: "project",
    detail:
      "Platform documentation. A job needs the `id-token: write` permission to request its token.",
    topics: ["workload"],
    summary:
      "GitHub’s OIDC provider issues a job a signed JWT whose claims name the repository, the branch or environment, and the workflow. A cloud or other service that trusts the issuer exchanges it for short-lived access.",
    agents:
      "The identity of an agent that runs in a CI job. One issuer serves every repository on GitHub.com, so the receiving trust rule has to name the repository.",
    url: "https://docs.github.com/en/actions/concepts/security/openid-connect",
  },

  /* ───────────── MCP ───────────── */
  {
    id: "mcp-authorization",
    name: "MCP Authorization",
    ref: "MCP specification 2026-07-28",
    body: "MCP",
    status: "final",
    detail:
      "Current revision 2026-07-28. It requires OAuth 2.1, citing draft -13, and recommends Client ID Metadata Documents, citing draft -00. Earlier revisions: 2025-03-26, 2025-06-18, 2025-11-25. The next release is planned for March 2027. MCP is a Linux Foundation project hosted by the Agentic AI Foundation.",
    topics: ["agent-protocol", "discovery", "core"],
    summary:
      "A profile of OAuth 2.1 for HTTP transports. The MCP server is a resource server, discovered through protected resource metadata; clients identify themselves with Client ID Metadata Documents; tokens are bound to one server.",
    agents:
      "The most widely implemented authorization profile written specifically for agents and tools.",
    url: "https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization",
  },
  {
    id: "mcp-ema",
    name: "MCP Enterprise-Managed Authorization",
    ref: "io.modelcontextprotocol/enterprise-managed-authorization",
    body: "MCP",
    status: "final",
    detail:
      "Official extension, stable at revision 2026-07-28. An application of ID-JAG.",
    topics: ["agent-protocol", "delegation"],
    summary:
      "An MCP client exchanges the user’s single sign-on token at the enterprise identity provider for an ID-JAG, then redeems it at the MCP server’s authorization server.",
    agents:
      "Central, administrator-controlled access for workforce agents, with no per-server consent prompts.",
    url: "https://github.com/modelcontextprotocol/ext-auth",
  },
  {
    id: "mcp-client-credentials",
    name: "MCP OAuth Client Credentials",
    ref: "io.modelcontextprotocol/oauth-client-credentials",
    body: "MCP",
    status: "final",
    detail: "Official extension, stable at revision 2026-07-28.",
    topics: ["agent-protocol", "workload"],
    summary:
      "Machine-to-machine access to MCP servers with pre-registered clients. A signed JWT assertion is the recommended way to authenticate.",
    agents: "The sanctioned path for agents with no human present.",
    url: "https://github.com/modelcontextprotocol/ext-auth",
  },
  {
    id: "mcp-elicitation",
    name: "MCP URL-Mode Elicitation",
    ref: "MCP specification 2026-07-28, Elicitation",
    body: "MCP",
    status: "final",
    detail:
      "Introduced in 2025-11-25 and reworked in 2026-07-28. Still marked as subject to change.",
    topics: ["agent-protocol", "human-in-the-loop"],
    summary:
      "A server asks the client to send the user to a URL for an interaction that must not pass through the client: third-party sign-in, entering a secret, a payment.",
    agents: "Keeps downstream credentials out of the agent and the model.",
    url: "https://modelcontextprotocol.io/specification/2026-07-28/client/elicitation",
  },

  /* ───────────── Agent protocols ───────────── */
  {
    id: "a2a",
    name: "Agent2Agent (A2A) Protocol",
    ref: "A2A 1.0",
    body: "Linux Foundation",
    status: "final",
    detail:
      "Version 1.0.0 released March 2026; 1.0.1 in May 2026. A Linux Foundation project, reported to have joined the Agentic AI Foundation in August 2026.",
    topics: ["agent-protocol", "discovery"],
    summary:
      "Agents publish an Agent Card declaring their skills and security schemes (API key, HTTP, OAuth 2.0, OpenID Connect, mutual TLS). Cards can be signed. A task state signals that further authorization is needed.",
    agents:
      "Defines how requirements are declared between agents, and leaves obtaining credentials to OAuth and its relatives.",
    url: "https://a2a-protocol.org/latest/specification/",
  },
  {
    id: "web-bot-auth",
    name: "Web Bot Auth",
    ref: "draft-ietf-webbotauth-httpsig-protocol",
    body: "IETF",
    status: "wg-draft",
    detail:
      "Revision -01, October 2026. The working group’s only adopted document; it merges the earlier architecture and key directory drafts.",
    topics: ["agent-protocol", "proof-of-possession"],
    summary:
      "Automated clients sign requests with HTTP Message Signatures and point to a published key directory with a `Signature-Agent` header.",
    agents:
      "The one IETF mechanism for an agent to prove to an arbitrary website which operator it belongs to. Identification only.",
    url: draft("draft-ietf-webbotauth-httpsig-protocol"),
  },
  {
    id: "scim-agents",
    name: "SCIM Agent Resource",
    ref: "draft-wzdk-scim-agent-resource",
    body: "IETF",
    status: "draft",
    detail:
      "Revision -00, June 2026. Individual draft that consolidates two earlier vendor proposals. Not adopted.",
    topics: ["agent-protocol", "guidance"],
    summary:
      "A SCIM resource type for agents, so identity systems can create, update and remove agent identities across applications.",
    agents:
      "The lifecycle half that OAuth does not cover: provisioning an agent and, more importantly, deprovisioning it.",
    url: draft("draft-wzdk-scim-agent-resource"),
  },
  {
    id: "agntcy-identity",
    name: "AGNTCY Identity",
    ref: "AGNTCY Identity",
    body: "Linux Foundation",
    status: "project",
    detail: "Linux Foundation project; APIs are alpha.",
    topics: ["agent-protocol", "credentials"],
    summary:
      "Identities for agents and MCP servers backed by verifiable credentials, with a resolver for verification.",
    agents:
      "One of several attempts at portable agent identity outside a single identity provider.",
    url: "https://github.com/agntcy/identity",
  },

  /* ───────────── Fine-grained authorization ───────────── */
  {
    id: "authzen",
    name: "AuthZEN Authorization API",
    ref: "OpenID AuthZEN Authorization API 1.0",
    body: "OpenID Foundation",
    status: "final",
    detail: "Final specification, approved January 2026.",
    topics: ["authorization"],
    summary:
      "A standard interface between a policy enforcement point and a policy decision point: subject, action, resource, context in; decision out.",
    agents:
      "Lets a gateway or MCP server ask any policy engine “may this agent call this tool with these arguments for this user?”",
    url: "https://openid.net/specs/authorization-api-1_0-final.html",
  },
  {
    id: "coaz-mcp",
    name: "COAZ Binding for MCP",
    ref: "OpenID AuthZEN COAZ-MCP",
    body: "OpenID Foundation",
    status: "wg-draft",
    detail:
      "Draft 1, announced June 2026 with the protocol-neutral COAZ framework. Supersedes the earlier “AuthZEN profile for MCP.”",
    topics: ["authorization", "agent-protocol"],
    summary:
      "Maps MCP requests to AuthZEN authorization requests for parameter-level decisions, with mappings declared per tool.",
    agents:
      "Addresses the gap MCP itself leaves open: there is no per-tool permission model in the core specification.",
    url: "https://github.com/openid/authzen",
  },

  /* ───────────── Signals ───────────── */
  {
    id: "shared-signals",
    name: "Shared Signals Framework, CAEP, RISC",
    ref: "OpenID SSF 1.0 · CAEP 1.0 · RISC 1.0",
    body: "OpenID Foundation",
    status: "final",
    detail: "All three reported final in September 2025.",
    topics: ["signals"],
    summary:
      "A framework for pushing security events between systems: session revoked, credential changed, device non-compliant.",
    agents:
      "The mechanism for telling everything an agent has touched that its access just ended, without waiting for tokens to expire.",
    url: "https://openid.net/wg/sharedsignals/",
  },

  /* ───────────── Verifiable credentials ───────────── */
  {
    id: "rfc9901",
    name: "SD-JWT",
    ref: "RFC 9901",
    body: "IETF",
    status: "rfc",
    detail:
      "November 2025. The companion SD-JWT VC draft is reported to be in IESG evaluation.",
    topics: ["credentials"],
    summary:
      "Selective Disclosure for JWTs: a signed credential whose holder can reveal only chosen claims, with key binding.",
    agents:
      "The format behind payment mandates and delegated credentials in agent commerce.",
    url: rfc(9901),
  },
  {
    id: "openid4vp",
    name: "OpenID for Verifiable Presentations",
    ref: "OpenID4VP 1.0",
    body: "OpenID Foundation",
    status: "final",
    detail:
      "Reported final in July 2025. The issuance counterpart, OpenID4VCI 1.0, followed in September 2025.",
    topics: ["credentials"],
    summary: "A protocol for requesting and presenting verifiable credentials.",
    agents:
      "How an agent, or a user on its behalf, presents a signed mandate to a verifier.",
    url: "https://openid.net/specs/openid-4-verifiable-presentations-1_0.html",
  },
  {
    id: "vc-data-model",
    name: "Verifiable Credentials Data Model",
    ref: "W3C VC Data Model 2.0",
    body: "W3C",
    status: "final",
    detail:
      "W3C Recommendation, May 2025. Decentralized Identifiers 1.1 is at Candidate Recommendation.",
    topics: ["credentials"],
    summary:
      "A data model for cryptographically verifiable claims made by an issuer about a subject.",
    agents:
      "Underlies agent identity proposals that do not assume a shared identity provider.",
    url: "https://www.w3.org/TR/vc-data-model-2.0/",
  },

  /* ───────────── Commerce ───────────── */
  {
    id: "ap2",
    name: "Agent Payments Protocol (AP2)",
    ref: "AP2 v0.2",
    body: "FIDO Alliance",
    status: "draft",
    detail:
      "Version 0.2.0, April 2026. Created by Google and donated to the FIDO Alliance the same month; no FIDO-published draft yet.",
    topics: ["commerce", "credentials"],
    summary:
      "Signed mandates express what a user has authorized an agent to buy. Checkout and payment mandates, each open (constraints for autonomous use) or closed (one purchase), as SD-JWTs.",
    agents:
      "The most detailed open attempt at verifiable user intent for agent purchases.",
    url: "https://ap2-protocol.org",
  },
  {
    id: "verifiable-intent",
    name: "Verifiable Intent",
    ref: "Verifiable Intent draft v0.1",
    body: "FIDO Alliance",
    status: "draft",
    detail:
      "Draft 0.1, maintained by Mastercard and contributed to the FIDO Alliance alongside AP2.",
    topics: ["commerce", "credentials"],
    summary:
      "A layered SD-JWT delegation chain from credential provider to user to agent, with constraints on amount, payee and items.",
    agents: "A card network’s take on the same problem AP2 addresses.",
    url: "https://verifiableintent.dev",
  },
  {
    id: "acp-commerce",
    name: "Agentic Commerce Protocol",
    ref: "ACP 2026-04-17",
    body: "Vendor-led",
    status: "draft",
    detail:
      "Beta, date-versioned; latest stable 2026-04-17. Maintained by OpenAI and Stripe.",
    topics: ["commerce"],
    summary:
      "A checkout protocol between agents and merchants. A delegated payment token lets the merchant’s processor charge within explicit allowance limits.",
    agents: "Payment delegation by scoped token instead of signed mandate.",
    url: "https://agenticcommerce.dev",
  },
  {
    id: "visa-tap",
    name: "Trusted Agent Protocol",
    ref: "Visa Trusted Agent Protocol",
    body: "Vendor-led",
    status: "draft",
    detail:
      "Published by Visa with a sample implementation. Not under a standards body.",
    topics: ["commerce", "proof-of-possession"],
    summary:
      "Agents sign each request with HTTP Message Signatures, bound to the merchant and to whether they are browsing or paying.",
    agents: "Web Bot Auth extended with commerce context.",
    url: "https://github.com/visa/trusted-agent-protocol",
  },
  {
    id: "x402",
    name: "x402",
    ref: "x402 protocol version 2",
    body: "Linux Foundation",
    status: "project",
    detail:
      "Protocol version 2. Moved to an x402 Foundation under the Linux Foundation in 2026.",
    topics: ["commerce"],
    summary:
      "Revives HTTP status 402: a server states its price, and the client retries with a signed payment.",
    agents:
      "Payment as the credential. No identity layer; suited to pay-per-call access by autonomous agents.",
    url: "https://github.com/x402-foundation/x402",
  },

  /* ───────────── Guidance ───────────── */
  {
    id: "fapi-2",
    name: "FAPI 2.0 Security Profile",
    ref: "OpenID FAPI 2.0",
    body: "OpenID Foundation",
    status: "final",
    detail: "Reported final in February 2025.",
    topics: ["guidance", "core"],
    summary:
      "A high-security OAuth profile: pushed authorization requests, sender-constrained tokens, strong client authentication.",
    agents:
      "A ready-made answer to “what should a high-stakes agent integration require?”",
    url: "https://openid.net/specs/fapi-security-profile-2_0-final.html",
  },
  {
    id: "oidf-agentic-whitepaper",
    name: "Identity Management for Agentic AI",
    ref: "OpenID Foundation whitepaper",
    body: "OpenID Foundation",
    status: "guidance",
    detail: "October 2025, from the AI Identity Management Community Group.",
    topics: ["guidance"],
    summary:
      "A survey of how current identity standards apply to agents and where they fall short.",
    agents:
      "A good map of the problem space from the people who maintain the standards.",
    url: "https://openid.net/wp-content/uploads/2025/10/Identity-Management-for-Agentic-AI.pdf",
  },
  {
    id: "nist-agent-identity",
    name: "Software and AI Agent Identity and Authorization",
    ref: "NIST NCCoE concept paper",
    body: "NIST",
    status: "guidance",
    detail:
      "Draft concept paper, February 2026. NIST also launched an AI Agent Standards Initiative the same month.",
    topics: ["guidance"],
    summary:
      "Proposes a demonstration project applying existing identity standards to enterprise agents.",
    agents:
      "Signals which standards a US government reference architecture is likely to draw on: MCP, OAuth, OpenID Connect, SPIFFE, SCIM.",
    url: "https://www.nccoe.nist.gov/",
  },
  {
    id: "owasp-agentic",
    name: "OWASP Top 10 for Agentic Applications",
    ref: "OWASP Agentic Top 10 (2026)",
    body: "OWASP",
    status: "guidance",
    detail: "Released December 2025. An OWASP MCP Top 10 is in beta.",
    topics: ["guidance"],
    summary:
      "The ten most significant risks in agentic systems. Identity and privilege abuse is one of them.",
    agents: "A threat checklist to review any design on this site against.",
    url: "https://genai.owasp.org/",
  },
  {
    id: "owasp-nhi",
    name: "OWASP Non-Human Identities Top 10",
    ref: "OWASP NHI Top 10 (2025)",
    body: "OWASP",
    status: "guidance",
    detail: "2025.",
    topics: ["guidance", "workload"],
    summary:
      "The common failures with service accounts, keys and tokens: long-lived secrets, over-privilege, improper offboarding, reuse.",
    agents:
      "Every agent is a non-human identity. Most real incidents are on this list.",
    url: "https://owasp.org/www-project-non-human-identities-top-10/",
  },
  {
    id: "cosai-agentic-iam",
    name: "Agentic Identity and Access Management",
    ref: "CoSAI workstream 4 paper",
    body: "OASIS",
    status: "guidance",
    detail: "Version 1.0, spring 2026, from the Coalition for Secure AI.",
    topics: ["guidance"],
    summary:
      "Treats agents as a distinct identity class and recommends zero standing privilege and delegation tokens with explicit actor and subject.",
    agents:
      "Industry consensus guidance that lines up closely with the IETF agent architecture draft.",
    url: "https://github.com/cosai-oasis/ws4-secure-design-agentic-systems",
  },
];

const byId = new Map(standards.map((s) => [s.id, s]));
if (byId.size !== standards.length) {
  const seen = new Set<string>();
  for (const s of standards) {
    if (seen.has(s.id)) throw new Error(`Duplicate standard id "${s.id}"`);
    seen.add(s.id);
  }
}

export function std(id: string): Standard {
  const s = byId.get(id);
  if (!s) throw new Error(`Unknown standard "${id}"`);
  return s;
}

export function hasStd(id: string): boolean {
  return byId.has(id);
}
