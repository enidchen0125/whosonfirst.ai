/**
 * "What can the API verify?" — one user, one agent, one API, and two credentials
 * the agent might present. Used by the compact demonstration on the home page
 * (VerifyBrief) and by the full comparison on the Concepts page (VerifyDetail),
 * so the two cannot drift apart.
 *
 * Five things are kept apart here, because a credential can settle one without
 * settling the others:
 *   1. who the credential was issued to            (check: software)
 *   2. whose authority it represents               (check: user)
 *   3. what permissions it conveys                 (check: grant)
 *   4. proof that the presenter is that holder     (check: sender; detail only)
 *   5. whether access can be refused or revoked    (`stop`; not a verification)
 *      Three things stay separate there: the API's own access policy, revocation
 *      at the authorization server, and how the API learns of a revocation.
 *
 * The token is one specific example: a JWT access token following RFC 9068,
 * shown abbreviated. Not every token or introspection response carries these
 * fields; `exampleToken` says so on the Concepts page.
 *
 * `brief` is the few words shown beside a verdict in the compact version;
 * `detail` is the full explanation. A verdict only holds under the condition
 * in the credential's `reads`, which the compact version shows beside it.
 */
export type Verdict = 'yes' | 'no' | 'conditional';

export const VERDICT_LABEL: Record<Verdict, string> = { yes: 'Yes', no: 'No', conditional: 'Conditional' };

export interface Check {
  id: 'software' | 'user' | 'grant' | 'sender';
  /** The clause of the site's question this check answers. */
  clause: string;
  question: string;
  /** Shown in the compact demonstration. The fourth check needs more room than that allows. */
  compact: boolean;
}

export const checks: Check[] = [
  { id: 'software', clause: 'Who is acting', question: 'Which software the credential was issued to', compact: true },
  { id: 'user', clause: 'For whom', question: 'Which user the request is for', compact: true },
  { id: 'grant', clause: 'Who said they could', question: 'What was granted for that user', compact: true },
  { id: 'sender', clause: 'Proof', question: 'That the sender is the software it was issued to', compact: false },
];

export interface Credential {
  id: string;
  /** Completes "The agent presents …". */
  name: string;
  hint: string;
  /** What passes between the user and the agent. */
  ask: string;
  askDetail: string;
  /** The credential on the wire, as a short label for the arrow. */
  onWire: string;
  /** What the example shown actually is, when it is more specific than the arrow's label. */
  sample?: string;
  /** Claims the API can read from it, if any. */
  claims?: string[];
  /** What the API does with it. Every verdict below depends on this. */
  reads: string;
  /** How the API verifies it, in full. */
  how: string;
  results: Record<Check['id'], { verdict: Verdict; brief: string; detail: string }>;
  consequence: string;
  /** What the credential does not settle, however carefully it is checked. */
  boundary: string;
  /** Refusing and revoking, as three separate things. */
  stop: { policy: string; revoke: string; learns: string };
  flow: { href: string; text: string };
}

export const credentials: Credential[] = [
  {
    id: 'key',
    name: 'Its own API key',
    hint: 'One key for the agent, the same for every user',
    ask: 'asks',
    askDetail: 'Asks the agent to act',
    onWire: 'API key',
    reads: 'An opaque secret. The API looks it up in its own records.',
    how: 'The API looks the key up in its own records and finds the account it was issued to. Nothing is read from the key itself.',
    results: {
      software: {
        verdict: 'yes',
        brief: 'the account the key belongs to',
        detail: 'The key maps to the account it was issued to. That identifies the agent only if the agent has a key of its own.',
      },
      user: {
        verdict: 'no',
        brief: 'a user ID sent by the agent is only its word',
        detail: 'Nothing the API can verify names Alice. A user ID added by the agent is only the agent’s word.',
      },
      grant: {
        verdict: 'no',
        brief: 'the key carries the agent’s own access, the same for every user',
        detail:
          'The key carries the access an administrator gave the agent, the same whichever user it is working for. Nothing in the request records a grant for Alice.',
      },
      sender: { verdict: 'no', brief: 'a bearer secret', detail: 'A key is a bearer secret. It works for anyone who has a copy.' },
    },
    consequence: 'The API can limit or refuse the agent as a whole. It cannot tell one user’s request from another’s.',
    boundary: 'Not proven: who is sending it. The key works for anyone holding a copy.',
    stop: {
      policy: 'The API can refuse the key. Every user the agent serves is refused together, because nothing in a request tells them apart.',
      revoke: 'Whoever issued the key can revoke it, with the same effect.',
      learns: 'The API looks the key up on every request, so it sees a revoked key at once.',
    },
    flow: { href: '/flows/client-credentials/', text: 'When the agent acts as itself' },
  },
  {
    id: 'delegated',
    name: 'A token Alice delegated',
    hint: 'Issued to the agent by an authorization server after she approved',
    ask: 'approves',
    askDetail: 'Approves access at the authorization server',
    onWire: 'Access token',
    sample: 'Example JWT access token',
    claims: ['sub=alice', 'client_id=agent', 'scope=calendar.read'],
    reads: 'Abbreviated. The API reads these claims once it has validated the token.',
    how: 'The API checks the token’s signature against the issuer’s published keys, and that the issuer, audience and expiry are the ones it expects. An API that cannot read the token itself can ask the authorization server about it instead (token introspection).',
    results: {
      software: {
        verdict: 'yes',
        brief: 'named in `client_id`',
        detail: '`client_id` names the client the token was issued to. That is the agent’s registration, which may stand for many running copies of it.',
      },
      user: {
        verdict: 'yes',
        brief: 'named in `sub`, vouched for by the issuer',
        detail:
          '`sub` names Alice. Where a resource owner is involved, the profile has `sub` identify them, and the authorization server that signed the token vouches for it.',
      },
      grant: {
        verdict: 'yes',
        brief: 'recorded in `scope`: a scope, not each action',
        detail:
          '`scope` and `aud` record what the authorization server granted after Alice approved, and where it applies. The API sees that record, not the approval itself, and it covers a scope, not each action. The profile only recommends `scope`, so a token may carry none.',
      },
      sender: {
        verdict: 'conditional',
        brief: 'only if the token is bound to a key',
        detail:
          'Only if the token is bound to a key the agent holds, with DPoP or mutual TLS. A plain bearer token works for anyone who has a copy.',
      },
    },
    consequence:
      'The API can use both identifiers in its access policy: for example, blocking this client while still allowing Alice to use another.',
    boundary: 'Not proven: who is sending it. A bearer token works for anyone holding a copy, unless it is bound to a key.',
    stop: {
      policy:
        'The API can use both identifiers: for example, block this client while still allowing Alice to use another, or the reverse. That takes a validated token and a policy that reads both `sub` and `client_id`. Carrying two identifiers does not do it by itself.',
      revoke:
        'A client asks the authorization server to revoke a token ([RFC 7009](/standards/#rfc7009)). That is the authorization server’s mechanism, separate from the API’s policy.',
      learns:
        'Local token validation alone does not reveal a later revocation. Without an additional revocation mechanism, the API may continue accepting the token until it expires. Introspection is one such mechanism. RFC 7009 also describes communication between the authorization server and the API, and short-lived tokens that limit the exposure.',
    },
    flow: { href: '/flows/authorization-code-pkce/', text: 'How the agent gets this token' },
  },
];

/** The three parts of "refusing and revoking", in the order they are shown. */
export const stopAspects: { key: keyof Credential['stop']; title: string }[] = [
  { key: 'policy', title: 'The API’s own access policy' },
  { key: 'revoke', title: 'Revocation' },
  { key: 'learns', title: 'How the API learns of a revocation' },
];

/** What the example token is, and what it is not. Shown on the Concepts page. */
export const exampleToken: string[] = [
  'The token in this example is a JWT access token following the JWT profile for OAuth 2.0 access tokens ([RFC 9068](/standards/#rfc9068)). That profile requires `sub` and `client_id`, and recommends `scope` when the request asked for one.',
  'It is abbreviated. A complete token under the profile also carries `iss`, `exp`, `aud`, `iat` and `jti`, and is signed.',
  'Not every access token is a JWT, and not every JWT follows this profile. An API that asks the authorization server instead, by token introspection ([RFC 7662](/standards/#rfc7662)), gets an answer in which `sub`, `client_id` and `scope` are all optional.',
];

/** What a valid credential still leaves open. Shown on the Concepts page. */
export const notProven: { claim: string; why: string }[] = [
  {
    claim: 'That the sender is the software named',
    why: 'Both are bearer credentials: whoever holds a copy can present it. Binding the token to a key the agent holds, with DPoP or mutual TLS, is what closes this. It is the fourth check above.',
  },
  {
    claim: 'That Alice approved this particular request',
    why: 'The token records a scope granted earlier. A request inside that scope looks the same whether or not she would agree to it now.',
  },
  {
    claim: 'That Alice is present, or has not changed her mind',
    why: 'The token is good until it expires, or until the API learns it was revoked.',
  },
  {
    claim: 'Which running copy of the agent sent it',
    why: '`client_id` names a registration. Many instances, or many agents hosted by one application, can share it.',
  },
];
