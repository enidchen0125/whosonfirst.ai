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
  /** Refusing and revoking: who can stop it, and how finely. */
  stop: string;
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
    stop: 'The API can refuse the key, or whoever issued it can revoke it. Either way every user the agent serves is cut off together, because nothing in a request tells them apart.',
    flow: { href: '/flows/client-credentials/', text: 'When the agent acts as itself' },
  },
  {
    id: 'delegated',
    name: 'A token Alice delegated',
    hint: 'Issued to the agent by an authorization server after she approved',
    ask: 'approves',
    askDetail: 'Approves access at the authorization server',
    onWire: 'Access token',
    claims: ['sub=alice', 'client_id=agent', 'scope=calendar.read'],
    reads: 'The API reads these once it has validated the token.',
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
        detail: '`sub` names Alice. The authorization server that signed the token vouches for it.',
      },
      grant: {
        verdict: 'yes',
        brief: 'recorded in `scope`: a scope, not each action',
        detail:
          '`scope` and `aud` record what the authorization server granted after Alice approved, and where it applies. The API sees that record, not the approval itself, and it covers a scope, not each action.',
      },
      sender: {
        verdict: 'conditional',
        brief: 'only if the token is bound to a key',
        detail:
          'Only if the token is bound to a key the agent holds, with DPoP or mutual TLS. A plain bearer token works for anyone who has a copy.',
      },
    },
    consequence: 'The API can apply Alice’s permissions and the agent’s limits together, and refuse one without refusing the other.',
    boundary: 'Not proven: who is sending it. A bearer token works for anyone holding a copy, unless it is bound to a key.',
    stop: 'The API can refuse by `sub` or by `client_id` in its own policy, one without the other. Revoking a token already issued is done at the authorization server. An API that validates tokens on its own does not learn of that, so the token keeps working until it expires unless the API also asks the authorization server.',
    flow: { href: '/flows/authorization-code-pkce/', text: 'How the agent gets this token' },
  },
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
