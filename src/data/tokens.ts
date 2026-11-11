/**
 * Annotated example tokens for the token inspector.
 * Every claim is tagged with the question it answers.
 */

export type ClaimCat =
  | "who"
  | "what"
  | "where"
  | "may"
  | "proof"
  | "when"
  | "meta";

export const CAT_LABEL: Record<ClaimCat, string> = {
  who: "Who is this for?",
  what: "What software is acting?",
  where: "Where is it valid?",
  may: "What may it do?",
  proof: "How is possession proven?",
  when: "For how long?",
  meta: "Bookkeeping",
};

export const CAT_TONE: Record<ClaimCat, string> = {
  who: "red",
  what: "blue",
  where: "green",
  may: "violet",
  proof: "amber",
  when: "neutral",
  meta: "neutral",
};

export interface ClaimLine {
  /** JSON text for this line, without indentation. */
  text: string;
  indent?: number;
  cat?: ClaimCat;
  /** Explanation shown when the line is opened. md-lite. */
  note?: string;
}

export interface TokenSpec {
  id: string;
  name: string;
  /** Issuer → consumer, in words. */
  path: string;
  intro: string;
  lines: ClaimLine[];
  /** ids from data/standards.ts */
  standards: string[];
  flow?: string;
}

export const tokens: TokenSpec[] = [
  {
    id: "user-access-token",
    name: "User access token",
    path: "Authorization server → agent → API",
    intro:
      "What an agent holds after a person signs in and consents. The JWT profile (RFC 9068) is one common format; opaque tokens checked by introspection carry the same information.",
    lines: [
      { text: "{" },
      {
        text: '"iss": "https://auth.example",',
        indent: 1,
        cat: "meta",
        note: "The authorization server that issued the token. The API must check it against the issuer it trusts. The agent does not read it: a client must not inspect an access token (RFC 9068). An agent that talks to many servers checks the `iss` parameter of the authorization response instead (RFC 9207), against the server it sent the request to.",
      },
      {
        text: '"sub": "user:alice",',
        indent: 1,
        cat: "who",
        note: "The **subject**: whose authority this token carries. Here, a human. APIs apply this user’s permissions.",
      },
      {
        text: '"client_id": "https://agent.example/client.json",',
        indent: 1,
        cat: "what",
        note: "The OAuth client the token was issued to. This is usually the closest thing to “which agent” in a plain access token, and it identifies an application, not an individual agent run. With Client ID Metadata Documents the value is a URL the server can fetch to learn about the client.",
      },
      {
        text: '"aud": "https://calendar.example/api",',
        indent: 1,
        cat: "where",
        note: "The **audience**: the one API that should accept this token. Agents talk to many servers, so audience restriction (requested with the `resource` parameter) is what stops a token given to one server from being replayed at another.",
      },
      {
        text: '"scope": "calendar.read",',
        indent: 1,
        cat: "may",
        note: "What the user consented to. Coarse by design. For anything transaction-shaped, `authorization_details` (RFC 9396) is more precise.",
      },
      {
        text: '"exp": 1794269400,',
        indent: 1,
        cat: "when",
        note: "Expiry. Minutes, not days. A leaked short-lived token is a small incident.",
      },
      {
        text: '"iat": 1794268800,',
        indent: 1,
        cat: "when",
        note: "When the token was issued.",
      },
      {
        text: '"jti": "8f1c9a52-…"',
        indent: 1,
        cat: "meta",
        note: "A unique identifier for this token, used for replay detection, revocation lists and correlating audit logs.",
      },
      { text: "}" },
    ],
    standards: ["rfc9068", "rfc8707", "oauth-2-1"],
    flow: "authorization-code-pkce",
  },
  {
    id: "delegated-token",
    name: "Delegated token",
    path: "Authorization server → tool → downstream API",
    intro:
      "The result of a token exchange. The user is still the subject; the `act` claim names who is acting for them. Nested `act` claims record the chain.",
    lines: [
      { text: "{" },
      {
        text: '"iss": "https://auth.example",',
        indent: 1,
        cat: "meta",
        note: "Issuer.",
      },
      {
        text: '"sub": "user:alice",',
        indent: 1,
        cat: "who",
        note: "Still Alice. Delegation keeps the original subject so that downstream permissions are hers.",
      },
      {
        text: '"aud": "https://warehouse.example/api",',
        indent: 1,
        cat: "where",
        note: "A new audience. The token the tool received was addressed to the tool; this one is addressed to the next hop.",
      },
      {
        text: '"scope": "sales.read",',
        indent: 1,
        cat: "may",
        note: "Narrower than the original grant. Each exchange is a chance to drop privileges the next hop does not need.",
      },
      {
        text: '"exp": 1794269100,',
        indent: 1,
        cat: "when",
        note: "Shorter-lived than the token it was exchanged for.",
      },
      {
        text: '"act": {',
        indent: 1,
        cat: "what",
        note: "The **actor** claim from RFC 8693. Its presence is the difference between delegation (“the tool, acting for Alice”) and impersonation (“Alice”). Without it the API cannot tell software from the person.",
      },
      {
        text: '"sub": "https://tools.example/mcp",',
        indent: 2,
        cat: "what",
        note: "The current actor: the party authorized to act for Alice. It says who was given that authority, not who is holding the token.",
      },
      {
        text: '"act": { "sub": "research-agent" }',
        indent: 2,
        cat: "what",
        note: "A prior actor, nested. RFC 8693 says only the outermost actor is relevant to access control; nested actors are history, useful for audit. Several current drafts would make this chain richer for agents.",
      },
      { text: "}", indent: 1 },
      { text: "}" },
    ],
    standards: ["rfc8693"],
    flow: "token-exchange",
  },
  {
    id: "agent-own-token",
    name: "Agent’s own token",
    path: "Authorization server → agent → API",
    intro:
      "Issued by the client credentials grant. There is no user. The agent is the subject, and everything it does with this token is on its own authority.",
    lines: [
      { text: "{" },
      {
        text: '"iss": "https://auth.example",',
        indent: 1,
        cat: "meta",
        note: "Issuer.",
      },
      {
        text: '"sub": "invoice-agent",',
        indent: 1,
        cat: "who",
        note: "The subject is the client itself. An API must not treat this as a user; RFC 9068 warns about exactly this confusion and recommends that authorization servers keep client and user identifiers from colliding.",
      },
      {
        text: '"client_id": "invoice-agent",',
        indent: 1,
        cat: "what",
        note: "Same value as `sub`: the token was issued to the party it describes.",
      },
      {
        text: '"aud": "https://erp.example/api",',
        indent: 1,
        cat: "where",
        note: "One API.",
      },
      {
        text: '"scope": "invoices.read invoices.reconcile",',
        indent: 1,
        cat: "may",
        note: "Granted by an administrator ahead of time. Nobody was asked at issuance.",
      },
      {
        text: '"exp": 1794269400',
        indent: 1,
        cat: "when",
        note: "No refresh token accompanies it. The agent simply requests another.",
      },
      { text: "}" },
    ],
    standards: ["rfc6749", "rfc9068"],
    flow: "client-credentials",
  },
  {
    id: "k8s-sa-token",
    name: "Kubernetes ServiceAccount token",
    path: "Cluster API server → kubelet → pod → external verifier",
    intro:
      "A projected, bound token: issued for one pod, with a chosen audience and a short life. It is a workload identity document, and the usual starting point for federation.",
    lines: [
      { text: "{" },
      {
        text: '"iss": "https://oidc.cluster.example",',
        indent: 1,
        cat: "meta",
        note: "The cluster’s service account issuer. External systems fetch `/.well-known/openid-configuration` from here to find the signing keys.",
      },
      {
        text: '"sub": "system:serviceaccount:agents:research-agent",',
        indent: 1,
        cat: "who",
        note: "Namespace and service account name. This is the string that federation trust rules match on, so the mapping from service accounts to agents is your identity model.",
      },
      {
        text: '"aud": ["https://sts.example"],',
        indent: 1,
        cat: "where",
        note: "Set per projected volume. Give each consumer its own audience. A token whose audience is the Kubernetes API server should never be sent anywhere else.",
      },
      {
        text: '"exp": 1794272400,',
        indent: 1,
        cat: "when",
        note: "The kubelet refreshes the file on disk before this passes.",
      },
      {
        text: '"iat": 1794268800,',
        indent: 1,
        cat: "when",
        note: "Issued at.",
      },
      {
        text: '"jti": "5d2f0c0e-…",',
        indent: 1,
        cat: "meta",
        note: "Unique token ID, recorded in API server audit logs so a token’s use can be traced back to its issuance.",
      },
      {
        text: '"kubernetes.io": {',
        indent: 1,
        cat: "proof",
        note: "Binding information. The token is bound to the pod named here, and the API server stops accepting it once that pod is deleted, whatever `exp` says. A verifier learns that only by asking the cluster, through the TokenReview API. One that checks the signature against the published keys accepts the token until it expires.",
      },
      {
        text: '"namespace": "agents",',
        indent: 2,
        cat: "who",
        note: "The namespace, repeated in structured form.",
      },
      {
        text: '"serviceaccount": { "name": "research-agent", "uid": "…" },',
        indent: 2,
        cat: "who",
        note: "Name and UID. The UID changes if the service account is deleted and recreated, and the API server then refuses old tokens.",
      },
      {
        text: '"pod": { "name": "research-agent-7c9f-x2x8k", "uid": "…" },',
        indent: 2,
        cat: "what",
        note: "The specific pod. This is the nearest thing Kubernetes offers to “this running instance of the agent.”",
      },
      {
        text: '"node": { "name": "node-3", "uid": "…" }',
        indent: 2,
        cat: "what",
        note: "The node the pod is scheduled on.",
      },
      { text: "}", indent: 1 },
      { text: "}" },
    ],
    standards: ["k8s-sa-tokens"],
    flow: "workload-identity-federation",
  },
  {
    id: "jwt-svid",
    name: "JWT-SVID",
    path: "SPIRE → workload → peer workload",
    intro:
      "A SPIFFE identity in JWT form, for cases where a certificate cannot reach the application. Deliberately minimal.",
    lines: [
      { text: "{" },
      {
        text: '"sub": "spiffe://example.org/ns/agents/sa/research-agent",',
        indent: 1,
        cat: "who",
        note: "The SPIFFE ID: a trust domain (`example.org`) and a path that the operator chooses. Here the path mirrors the Kubernetes namespace and service account, a common convention.",
      },
      {
        text: '"aud": ["spiffe://example.org/ns/tools/sa/search"],',
        indent: 1,
        cat: "where",
        note: "Required. The workload asks for a token for a specific audience, and the receiver must reject tokens addressed to anyone else.",
      },
      {
        text: '"exp": 1794269100,',
        indent: 1,
        cat: "when",
        note: "Required and short. JWT-SVIDs are bearer tokens.",
      },
      { text: '"iat": 1794268800', indent: 1, cat: "when", note: "Issued at." },
      { text: "}" },
    ],
    standards: ["spiffe"],
    flow: "spiffe-workload-identity",
  },
  {
    id: "dpop-proof",
    name: "DPoP proof",
    path: "Agent → authorization server or API, on every request",
    intro:
      "Not a token that grants anything. A one-time signed statement that the sender holds the private key an access token is bound to.",
    lines: [
      { text: "// header" },
      { text: "{" },
      {
        text: '"typ": "dpop+jwt",',
        indent: 1,
        cat: "meta",
        note: "Marks this JWT as a DPoP proof so it cannot be confused with any other kind.",
      },
      {
        text: '"alg": "ES256",',
        indent: 1,
        cat: "proof",
        note: "An asymmetric signature algorithm. Symmetric algorithms and `none` are not allowed.",
      },
      {
        text: '"jwk": { "kty": "EC", "crv": "P-256", "x": "…", "y": "…" }',
        indent: 1,
        cat: "proof",
        note: "The public key. The proof is signed with the matching private key. The server computes this key’s thumbprint and compares it with `cnf.jkt` in the access token.",
      },
      { text: "}" },
      { text: "// payload" },
      { text: "{" },
      {
        text: '"jti": "e1j3V_bKic8-LAEB",',
        indent: 1,
        cat: "meta",
        note: "Unique per proof. A server that remembers recent values can reject repeats. The specification leaves that to the server.",
      },
      {
        text: '"htm": "GET",',
        indent: 1,
        cat: "where",
        note: "The HTTP method this proof is for.",
      },
      {
        text: '"htu": "https://calendar.example/api/events",',
        indent: 1,
        cat: "where",
        note: "The URL this proof is for, without query or fragment. A proof captured for one endpoint is useless at another.",
      },
      {
        text: '"iat": 1794268830,',
        indent: 1,
        cat: "when",
        note: "Creation time. Servers accept only a narrow window.",
      },
      {
        text: '"ath": "fUHyO2r2Z3DZ53EsNrWBb0xWXoaNy59IiKCAqksmQEo"',
        indent: 1,
        cat: "proof",
        note: "Hash of the access token being presented, tying this proof to that token.",
      },
      { text: "}" },
    ],
    standards: ["rfc9449"],
    flow: "dpop",
  },
  {
    id: "id-jag",
    name: "ID-JAG",
    path: "Enterprise IdP → agent → the application’s authorization server",
    intro:
      "An Identity Assertion JWT Authorization Grant. Not an access token: a short-lived statement from the company identity provider that this client may get one, for this user, at that application.",
    lines: [
      { text: "// header" },
      {
        text: '{ "typ": "oauth-id-jag+jwt" }',
        cat: "meta",
        note: "An explicit type, so the grant cannot be mistaken for an ID token or an access token and replayed as one.",
      },
      { text: "// payload" },
      { text: "{" },
      {
        text: '"iss": "https://acme.idp.example",',
        indent: 1,
        cat: "meta",
        note: "The enterprise identity provider. The application’s authorization server trusts it because the company’s tenant is configured for single sign-on with it.",
      },
      {
        text: '"sub": "U019488227",',
        indent: 1,
        cat: "who",
        note: "The employee, as the identity provider knows them. The receiving side maps this to its own account.",
      },
      {
        text: '"aud": "https://auth.chat.example/",',
        indent: 1,
        cat: "where",
        note: "The **authorization server** of the target application, not the application’s API. Only that server should accept this grant.",
      },
      {
        text: '"resource": "https://mcp.chat.example/",',
        indent: 1,
        cat: "where",
        note: "The API, here an MCP server, that the eventual access token must be restricted to.",
      },
      {
        text: '"client_id": "f53f191f9311af35",',
        indent: 1,
        cat: "what",
        note: "The client the grant was issued to, as known to the receiving authorization server. The client presenting the grant must match.",
      },
      {
        text: '"scope": "chat.read chat.history",',
        indent: 1,
        cat: "may",
        note: "What the administrator’s policy allowed, which may be less than was requested.",
      },
      {
        text: '"jti": "9e43f81b64a33f20116179",',
        indent: 1,
        cat: "meta",
        note: "A unique identifier for this grant. A receiving server that accepts each grant only once tracks it.",
      },
      {
        text: '"exp": 1311281270,',
        indent: 1,
        cat: "when",
        note: "Minutes. The client may present the grant again for a new access token until it expires, unless the receiving server accepts each grant once.",
      },
      { text: '"iat": 1311280970', indent: 1, cat: "when", note: "Issued at." },
      { text: "}" },
    ],
    standards: ["id-jag", "mcp-ema"],
    flow: "cross-app-access",
  },
  {
    id: "txn-token",
    name: "Transaction token",
    path: "Transaction token service → every workload in one call chain",
    intro:
      "Issued at the edge of a trust domain in exchange for the external access token, then passed unchanged from service to service.",
    lines: [
      { text: "// header" },
      {
        text: '{ "typ": "txntoken+jwt" }',
        cat: "meta",
        note: "Explicitly typed. Carried in the `Txn-Token` HTTP header, not `Authorization`.",
      },
      { text: "// payload" },
      { text: "{" },
      {
        text: '"aud": "trust-domain.example",',
        indent: 1,
        cat: "where",
        note: "The trust domain itself. Every workload inside may accept it; nothing outside should.",
      },
      {
        text: '"txn": "97053963-771d-49cc-a4e3-20aad399c312",',
        indent: 1,
        cat: "meta",
        note: "A unique transaction identifier, the same at every hop. This is what ties the logs of a dozen services to one user request.",
      },
      {
        text: '"sub": "d084sdrt234fsaw34tr23t",',
        indent: 1,
        cat: "who",
        note: "The user or workload the transaction is for.",
      },
      {
        text: '"req_wl": "apigateway.trust-domain.example",',
        indent: 1,
        cat: "what",
        note: "The workload that requested this token, usually the gateway that received the external call.",
      },
      {
        text: '"scope": "trade.stocks",',
        indent: 1,
        cat: "may",
        note: "The purpose of the transaction. Narrower than the external token’s scope.",
      },
      {
        text: '"rctx": { "req_ip": "69.151.72.123", "authn": "face" },',
        indent: 1,
        cat: "proof",
        note: "Request context: the circumstances of the original call, such as the caller’s address and how the user authenticated.",
      },
      {
        text: '"tctx": { "action": "BUY", "ticker": "MSFT", "quantity": "100" },',
        indent: 1,
        cat: "may",
        note: "Transaction context: the fixed parameters of what was asked for. Signed, so no service downstream, and no agent talked into something else, can change them.",
      },
      {
        text: '"iat": 1686536226,',
        indent: 1,
        cat: "when",
        note: "Issued at.",
      },
      {
        text: '"exp": 1686536586',
        indent: 1,
        cat: "when",
        note: "Minutes. Long enough for one call chain to finish.",
      },
      { text: "}" },
    ],
    standards: ["txn-tokens"],
    flow: "transaction-tokens",
  },
  {
    id: "wit",
    name: "Workload Identity Token",
    path: "Identity issuer → workload → any peer, always with a proof",
    intro:
      "The WIMSE working group’s workload credential. It names a workload and carries its public key. It is never valid alone.",
    lines: [
      { text: "// header" },
      {
        text: '{ "alg": "ES256", "typ": "wit+jwt" }',
        cat: "meta",
        note: "Typed. Carried in the `Workload-Identity-Token` header. A receiver must refuse it if it arrives as a bearer token.",
      },
      { text: "// payload" },
      { text: "{" },
      {
        text: '"iss": "https://issuer.example.org",',
        indent: 1,
        cat: "meta",
        note: "Recommended for auditing. Trust comes from the pre-configured binding between a trust domain and its issuer keys, not from following this value.",
      },
      {
        text: '"sub": "spiffe://example.org/ns/agents/sa/research-agent",',
        indent: 1,
        cat: "who",
        note: "The workload identifier: a URI scoped to a trust domain. A SPIFFE ID qualifies. For an agent, this is “what is acting”; a user’s delegation travels separately.",
      },
      {
        text: '"cnf": { "jwk": { "kty": "OKP", "crv": "Ed25519", "alg": "Ed25519", "x": "1CXX…" } },',
        indent: 1,
        cat: "proof",
        note: "The workload’s public key. Each request must come with a proof signed by the matching private key: a Workload Proof Token or an HTTP Message Signature. The key must carry `alg`, and the proof must be made with that algorithm.",
      },
      {
        text: '"jti": "x-_1CTL2cca3CSE4cwb_l",',
        indent: 1,
        cat: "meta",
        note: "Token identifier.",
      },
      {
        text: '"exp": 1745512510',
        indent: 1,
        cat: "when",
        note: "Short-lived and re-issued automatically. Note there is no audience: the same token is shown to every peer, which is safe only because of the key binding.",
      },
      { text: "}" },
    ],
    standards: ["wimse-creds", "wimse-wpt"],
    flow: "wimse-workload-tokens",
  },
];
