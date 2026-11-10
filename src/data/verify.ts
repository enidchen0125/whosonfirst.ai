/**
 * "What can the API verify?" — one user, one agent, one API, and two credentials
 * the agent might present. Used by the compact demonstration on the home page
 * (VerifyBrief) and by the full comparison on the Concepts page (VerifyDetail),
 * so the two cannot drift apart.
 *
 * Each claim is worded as what the API can establish from the request, assuming
 * it validates what it is given. `brief` is the few words shown beside the
 * verdict in the compact version; `detail` is the full explanation.
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
  { id: 'grant', clause: 'Who said they could', question: 'What that user approved', compact: true },
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
  /** The credential on the wire, and the claims worth showing. */
  onWire: string;
  claims?: string[];
  results: Record<Check['id'], { verdict: Verdict; brief: string; detail: string }>;
  consequence: string;
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
    results: {
      software: { verdict: 'yes', brief: 'the account the key belongs to', detail: 'The key maps to the agent’s account.' },
      user: {
        verdict: 'no',
        brief: 'a user ID sent by the agent is only its word',
        detail: 'Nothing the API can verify names Alice. A user ID added by the agent is only the agent’s word.',
      },
      grant: {
        verdict: 'no',
        brief: 'the key grants the same access for everyone',
        detail:
          'The key carries what an administrator gave the agent, the same for every user. Alice’s approval is not in the request.',
      },
      sender: { verdict: 'no', brief: 'a bearer secret', detail: 'A key is a bearer secret. It works for anyone who has a copy.' },
    },
    consequence: 'The API can limit what the agent does. It cannot tell one user’s request from another’s.',
    flow: { href: '/flows/client-credentials/', text: 'When the agent acts as itself' },
  },
  {
    id: 'delegated',
    name: 'A token Alice delegated',
    hint: 'Issued to the agent by an authorization server after she approved',
    ask: 'approves',
    askDetail: 'Approves access at the authorization server',
    onWire: 'Access token',
    claims: ['sub=alice', 'client_id=agent'],
    results: {
      software: { verdict: 'yes', brief: 'named in `client_id`', detail: '`client_id` names the agent the token was issued to.' },
      user: {
        verdict: 'yes',
        brief: 'named in `sub`, vouched for by the issuer',
        detail: '`sub` names Alice. The authorization server that signed the token vouches for it.',
      },
      grant: {
        verdict: 'yes',
        brief: '`scope` and `aud`: the scope, not each action',
        detail: '`scope` and `aud` record what she approved and where it applies. Consent covers the scope, not each action.',
      },
      sender: {
        verdict: 'conditional',
        brief: 'only if the token is bound to a key',
        detail:
          'Only if the token is bound to a key the agent holds, with DPoP or mutual TLS. A plain bearer token works for anyone who has a copy.',
      },
    },
    consequence: 'The API can apply Alice’s permissions and the agent’s limits together, and cut off either one alone.',
    flow: { href: '/flows/authorization-code-pkce/', text: 'How the agent gets this token' },
  },
];

/** The condition every verdict above depends on. */
export const assumption =
  'Every answer assumes the API validates what it is given: the key against its own records, or the token’s signature, issuer and audience.';
