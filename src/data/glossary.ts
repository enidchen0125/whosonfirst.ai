export interface Term {
  term: string;
  /** Other names people search for. */
  aka?: string[];
  def: string;
  /** Internal link for more. */
  see?: { href: string; label: string };
}

/** md-lite formatting is allowed in `def`. Keep entries to one or two sentences. */
export const glossary: Term[] = [
  {
    term: 'Access token',
    def: 'A credential an API accepts as proof that a request is authorized. Short-lived, addressed to one audience, and limited to particular scopes.',
    see: { href: '/concepts/#tokens', label: 'What is in a token' },
  },
  {
    term: 'Actor',
    aka: ['act claim'],
    def: 'The party presenting a token when it is not the subject. Recorded in the `act` claim, which is what distinguishes delegation from impersonation.',
    see: { href: '/flows/token-exchange/', label: 'Token exchange' },
  },
  {
    term: 'Agent',
    def: 'Software that pursues a goal by choosing its own actions, usually with a language model deciding which tools to call. For authentication purposes it is both an OAuth client and a workload.',
  },
  {
    term: 'Agent Card',
    def: 'In A2A, a JSON document an agent publishes to describe its skills and the credentials it requires. It can be signed.',
    see: { href: '/flows/agent-to-agent/', label: 'Agent to agent' },
  },
  {
    term: 'A2A',
    aka: ['Agent2Agent'],
    def: 'A protocol for agents to delegate tasks to one another. It declares security requirements and leaves obtaining credentials to OAuth and related standards.',
    see: { href: '/flows/agent-to-agent/', label: 'Agent to agent' },
  },
  {
    term: 'AIMS',
    aka: ['AI Identity Management System'],
    def: 'An IETF WIMSE working group document describing how existing standards compose for agent identity and authorization. Its premise is that agents are workloads.',
    see: { href: '/standards/#wimse-aims', label: 'Standards tracker' },
  },
  {
    term: 'Audience',
    aka: ['aud'],
    def: 'The recipient a token is intended for. A resource must reject tokens whose audience is someone else; this is the main defence against a token being replayed at a different service.',
  },
  {
    term: 'Authorization code',
    def: 'A single-use, short-lived code returned through the browser after a user consents, which the client exchanges for tokens over a direct connection.',
    see: { href: '/flows/authorization-code-pkce/', label: 'Authorization code + PKCE' },
  },
  {
    term: 'Authorization details',
    aka: ['RAR', 'Rich Authorization Requests'],
    def: 'A structured JSON description of exactly what is being authorized, such as one payment to one payee. More precise than a scope string.',
    see: { href: '/flows/step-up-authorization/', label: 'Step-up authorization' },
  },
  {
    term: 'Authorization server',
    aka: ['AS', 'identity provider', 'IdP'],
    def: 'The system that authenticates users and clients, records consent, and issues tokens.',
  },
  {
    term: 'Bearer token',
    def: 'A token that works for whoever presents it, like cash. Contrast with a sender-constrained token.',
    see: { href: '/flows/dpop/', label: 'Sender-constrained tokens' },
  },
  {
    term: 'CIBA',
    aka: ['Client-Initiated Backchannel Authentication'],
    def: 'An OpenID flow in which the client asks the authorization server to obtain a named user’s approval on the user’s own device.',
    see: { href: '/flows/ciba/', label: 'Backchannel approval' },
  },
  {
    term: 'Client',
    def: 'In OAuth, the application requesting tokens. An agent, or the application hosting it, is the client.',
  },
  {
    term: 'Client credentials',
    def: 'The OAuth grant in which a client obtains a token as itself, with no user involved.',
    see: { href: '/flows/client-credentials/', label: 'Client credentials' },
  },
  {
    term: 'Client ID Metadata Document',
    aka: ['CIMD'],
    def: 'A JSON document at an HTTPS URL that serves as a client’s identifier. The authorization server fetches it instead of requiring the client to register first.',
    see: { href: '/flows/mcp-authorization/', label: 'MCP authorization' },
  },
  {
    term: 'Confused deputy',
    def: 'A service with legitimate authority that is tricked into using it for a caller who should not have it. Agents that forward tokens or share one identity across users are prone to it.',
    see: { href: '/concepts/#delegation', label: 'Delegation or impersonation' },
  },
  {
    term: 'Consent',
    def: 'A user’s recorded approval, at the authorization server, for a client to act with specified scopes.',
  },
  {
    term: 'Cross App Access',
    aka: ['XAA'],
    def: 'A product and industry name for the ID-JAG pattern.',
    see: { href: '/flows/cross-app-access/', label: 'Enterprise-managed authorization' },
  },
  {
    term: 'Delegation',
    def: 'Acting for someone else in a way that keeps both identities visible: the token names the subject and, separately, the actor.',
    see: { href: '/concepts/#delegation', label: 'Delegation or impersonation' },
  },
  {
    term: 'DPoP',
    aka: ['Demonstrating Proof of Possession'],
    def: 'A mechanism that binds a token to a key held by the client. Each request carries a small signed proof.',
    see: { href: '/flows/dpop/', label: 'DPoP' },
  },
  {
    term: 'Dynamic Client Registration',
    aka: ['DCR'],
    def: 'A protocol by which a client registers itself with an authorization server at runtime. Deprecated in MCP in favour of Client ID Metadata Documents.',
  },
  {
    term: 'Elicitation',
    def: 'In MCP, a server’s request for input from the user partway through an operation. URL mode sends the user to a web page for anything that must not pass through the client.',
    see: { href: '/flows/url-elicitation/', label: 'URL elicitation' },
  },
  {
    term: 'Federation',
    def: 'One system accepting identities issued by another, by prior agreement and usually by trusting its signing keys.',
    see: { href: '/flows/workload-identity-federation/', label: 'Workload identity federation' },
  },
  {
    term: 'ID-JAG',
    aka: ['Identity Assertion JWT Authorization Grant'],
    def: 'A short-lived grant issued by an enterprise identity provider that another application’s authorization server exchanges for an access token.',
    see: { href: '/flows/cross-app-access/', label: 'Enterprise-managed authorization' },
  },
  {
    term: 'ID token',
    def: 'An OpenID Connect token that tells a client who signed in. It is for the client, not for calling APIs.',
  },
  {
    term: 'Identity chaining',
    def: 'Carrying identity across trust domains by exchanging a token at home for a grant that another domain’s authorization server will accept.',
    see: { href: '/flows/identity-chaining/', label: 'Identity chaining' },
  },
  {
    term: 'Impersonation',
    def: 'Acting for someone else in a way that makes the software indistinguishable from the person: the token names only the subject.',
    see: { href: '/concepts/#delegation', label: 'Delegation or impersonation' },
  },
  {
    term: 'Issuer',
    aka: ['iss'],
    def: 'The identifier of the system that issued a token. Verifiers check it against the issuers they trust.',
  },
  {
    term: 'JWT',
    aka: ['JSON Web Token'],
    def: 'A compact, signed set of claims. The common format for access tokens, ID tokens, grants and proofs.',
  },
  {
    term: 'Mandate',
    def: 'In agent payment protocols, a signed statement of what a user has authorized an agent to buy, verifiable by merchants and payment providers.',
    see: { href: '/flows/agent-payments/', label: 'Agent payments' },
  },
  {
    term: 'MCP',
    aka: ['Model Context Protocol'],
    def: 'A protocol that connects AI applications to tools and data. Its authorization specification is a profile of OAuth 2.1.',
    see: { href: '/flows/mcp-authorization/', label: 'MCP authorization' },
  },
  {
    term: 'Mutual TLS',
    aka: ['mTLS'],
    def: 'TLS in which both sides present certificates, so each end of the connection is authenticated.',
    see: { href: '/flows/spiffe-workload-identity/', label: 'SPIFFE + mTLS' },
  },
  {
    term: 'Non-human identity',
    aka: ['NHI', 'machine identity'],
    def: 'Any identity that belongs to software: service accounts, API keys, workloads, agents.',
  },
  {
    term: 'OAuth 2.1',
    def: 'A consolidation of OAuth 2.0 and its security guidance into one framework. Still a draft, and already the baseline MCP builds on.',
    see: { href: '/standards/#oauth-2-1', label: 'Standards tracker' },
  },
  {
    term: 'On-behalf-of',
    aka: ['OBO'],
    def: 'A general term, and some vendors’ product term, for a service obtaining a token to act for the user whose request it is handling.',
    see: { href: '/flows/token-exchange/', label: 'Token exchange' },
  },
  {
    term: 'PKCE',
    aka: ['Proof Key for Code Exchange'],
    def: 'A one-time secret that ties an authorization code to the client instance that requested it.',
    see: { href: '/flows/authorization-code-pkce/', label: 'Authorization code + PKCE' },
  },
  {
    term: 'Principal',
    def: 'The party whose authority is being exercised. A person, an organization, or the agent itself.',
    see: { href: '/concepts/#roles', label: 'The roles' },
  },
  {
    term: 'Proof of possession',
    def: 'Evidence, supplied with a request, that the sender holds a particular private key. DPoP, mutual TLS and HTTP message signatures all provide it.',
    see: { href: '/flows/dpop/', label: 'Sender-constrained tokens' },
  },
  {
    term: 'Protected resource metadata',
    def: 'A document in which an API names the authorization servers that protect it, so a client can discover where to get a token.',
    see: { href: '/flows/mcp-authorization/', label: 'MCP authorization' },
  },
  {
    term: 'Public client',
    def: 'A client that cannot keep a secret, because it runs on a user’s device. Desktop, CLI and browser-based agents are public clients.',
    see: { href: '/deployments/local/', label: 'Desktop, IDE and CLI' },
  },
  {
    term: 'Refresh token',
    def: 'A longer-lived credential used to obtain new access tokens without the user. The thing most worth protecting in an agent runtime.',
  },
  {
    term: 'Resource indicator',
    def: 'The `resource` request parameter, naming the API a token is wanted for so the authorization server can restrict the audience.',
  },
  {
    term: 'Resource server',
    def: 'The API or service that accepts access tokens. An MCP server is a resource server.',
  },
  {
    term: 'Scope',
    def: 'A string naming a permission a token carries. Coarse by design.',
  },
  {
    term: 'Sender-constrained token',
    def: 'A token that only the holder of a particular key can use. The opposite of a bearer token.',
    see: { href: '/flows/dpop/', label: 'DPoP' },
  },
  {
    term: 'ServiceAccount token',
    def: 'In Kubernetes, a short-lived signed token identifying a pod’s service account, delivered through a projected volume.',
    see: { href: '/deployments/kubernetes/', label: 'Agents on Kubernetes' },
  },
  {
    term: 'SPIFFE',
    def: 'A set of specifications for workload identity: a URI name (the SPIFFE ID), short-lived identity documents, and an API for obtaining them without a secret.',
    see: { href: '/flows/spiffe-workload-identity/', label: 'SPIFFE + mTLS' },
  },
  {
    term: 'Step-up',
    def: 'An API’s demand for stronger or fresher authentication, or a broader scope, before it will perform a sensitive action.',
    see: { href: '/flows/step-up-authorization/', label: 'Step-up authorization' },
  },
  {
    term: 'Subject',
    aka: ['sub'],
    def: 'Who or what a token is about: the principal.',
  },
  {
    term: 'SVID',
    aka: ['SPIFFE Verifiable Identity Document'],
    def: 'A credential that proves a SPIFFE ID. Comes as an X.509 certificate, a JWT, or a key-bound workload identity token.',
  },
  {
    term: 'Token exchange',
    def: 'Presenting one token to an authorization server to obtain another, typically for a different audience or with an actor added.',
    see: { href: '/flows/token-exchange/', label: 'Token exchange' },
  },
  {
    term: 'Token passthrough',
    def: 'Forwarding a received token to another service instead of obtaining a new one for it. Prohibited by the MCP specification.',
    see: { href: '/concepts/#delegation', label: 'Delegation or impersonation' },
  },
  {
    term: 'Transaction token',
    def: 'A short-lived token that carries the user and the fixed details of one request through a call chain inside a trust domain.',
    see: { href: '/flows/transaction-tokens/', label: 'Transaction tokens' },
  },
  {
    term: 'Trust domain',
    def: 'A set of systems that share a root of trust and one administrative authority for identities.',
  },
  {
    term: 'Web Bot Auth',
    def: 'A scheme by which automated clients sign HTTP requests so websites can verify which operator they belong to.',
    see: { href: '/flows/web-bot-auth/', label: 'Web Bot Auth' },
  },
  {
    term: 'WIMSE',
    aka: ['Workload Identity in Multi-System Environments'],
    def: 'The IETF working group standardizing workload identity credentials and how they are proven between workloads.',
    see: { href: '/flows/wimse-workload-tokens/', label: 'Workload tokens' },
  },
  {
    term: 'Workload',
    def: 'A running piece of software, such as a pod, a function or a process. Distinct from the person or organization it works for.',
  },
  {
    term: 'Workload identity',
    def: 'An identity assigned to a workload by the platform it runs on, proven with a short-lived credential the workload did not have to be given in advance.',
    see: { href: '/flows/workload-identity-federation/', label: 'Workload identity federation' },
  },
  {
    term: 'Workload Identity Token',
    aka: ['WIT'],
    def: 'A WIMSE credential naming a workload and carrying its public key. Valid only alongside a proof of possession.',
    see: { href: '/flows/wimse-workload-tokens/', label: 'Workload tokens' },
  },
  {
    term: 'Workload Proof Token',
    aka: ['WPT'],
    def: 'A short-lived signed JWT that proves possession of the key in a Workload Identity Token for one request.',
    see: { href: '/flows/wimse-workload-tokens/', label: 'Workload tokens' },
  },
];
