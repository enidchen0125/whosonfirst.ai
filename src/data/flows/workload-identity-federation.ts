import type { Flow } from '../types';

export const workloadIdentityFederation: Flow = {
  slug: 'workload-identity-federation',
  title: 'Workload identity federation',
  short: 'Workload identity federation',
  group: 'autonomous',
  human: 'absent',
  maturity: 'stable',
  tagline:
    'The platform vouches for the agent. A short-lived platform token is exchanged for access elsewhere, and no secret is ever stored.',
  summary: `Every secret an agent holds has to be created, delivered, stored, rotated and eventually revoked. Workload identity federation removes the secret. The platform the agent runs on, such as a Kubernetes cluster, a cloud function runtime or a CI system, already knows which workload it started. It issues that workload a short-lived signed token saying so. Other systems are configured to trust the platform’s signing keys, and exchange the platform token for their own.

The agent’s credential is now a fact about where it is running, attested by infrastructure, valid for minutes, and refreshed automatically. There is nothing to leak into a prompt or bake into an image. For agents with no human in the loop this is the strongest foundation available today.`,
  fits: [
    'Agents running on Kubernetes, a major cloud, or a CI system that issues OIDC tokens.',
    'Calling cloud APIs, model providers or internal services as the agent itself.',
    'Anywhere you would otherwise mount an API key from a secret.',
  ],
  watchOut: [
    '**Match on more than the issuer.** A trust rule that accepts any token from the cluster lets every pod become your agent. Pin the `sub` (namespace and service account) and the `aud`.',
    'Set a specific audience on the projected token. A token minted for the Kubernetes API server and replayed at an external service is a classic confused-deputy path.',
    'One service account shared by many agents gives them one identity. If agents differ in what they may do, they need different service accounts.',
    'The receiving side must be able to fetch the cluster’s signing keys. For private clusters that means publishing the issuer discovery document somewhere reachable, or uploading the keys.',
  ],
  participants: [
    { id: 'k8s', label: 'Kubernetes', sub: 'API server + kubelet', role: 'infra' },
    { id: 'agent', label: 'Agent pod', sub: 'ServiceAccount', role: 'agent' },
    { id: 'sts', label: 'Token service', sub: 'Cloud STS or AS', role: 'authz' },
    { id: 'api', label: 'External API', role: 'resource' },
  ],
  steps: [
    {
      from: 'k8s',
      to: 'agent',
      kind: 'back',
      label: 'Mount projected token',
      title: 'The kubelet delivers an identity token to the pod',
      body: `The pod spec asks for a projected service account token with a chosen audience and lifetime. The kubelet obtains it from the API server’s TokenRequest API and writes it to a file in the pod. The token is bound to this pod: once the pod is deleted, the API server no longer accepts it. The kubelet replaces the file before the token expires.`,
      code: {
        lang: 'yaml',
        text: `volumes:
  - name: agent-identity
    projected:
      sources:
        - serviceAccountToken:
            audience: https://sts.example
            expirationSeconds: 3600
            path: token`,
      },
      gain: [['agent', 'ServiceAccount token (aud: token service)']],
    },
    {
      from: 'agent',
      kind: 'self',
      label: 'Read token from volume',
      title: 'The agent reads its identity',
      body: `A JWT (RFC 7519) signed by the cluster. The subject names the namespace and service account, and a \`kubernetes.io\` claim records the exact pod and node. Read it fresh each time; it rotates on disk.`,
      code: {
        lang: 'json',
        text: `{
  "iss": "https://oidc.cluster.example",
  "sub": "system:serviceaccount:agents:research-agent",
  "aud": ["https://sts.example"],
  "exp": 1794272400,
  "jti": "5d2f0c0e-6b1a-4c55-9a0e-3f1c6b6f8a21",
  "kubernetes.io": {
    "namespace": "agents",
    "serviceaccount": { "name": "research-agent", "uid": "…" },
    "pod": { "name": "research-agent-7c9f-x2x8k", "uid": "…" },
    "node": { "name": "node-3", "uid": "…" }
  }
}`,
      },
    },
    {
      from: 'agent',
      to: 'sts',
      kind: 'back',
      label: 'Exchange platform token',
      title: 'The agent trades it for an access token',
      body: `The shape varies by provider. Some use RFC 8693 token exchange, as shown. Others accept the platform token as a \`client_assertion\` (RFC 7523) on an ordinary token request. In managed Kubernetes this step is usually hidden inside an SDK or a metadata endpoint.`,
      code: {
        lang: 'http',
        text: `POST /token HTTP/1.1
Host: sts.example
Content-Type: application/x-www-form-urlencoded

grant_type=urn:ietf:params:oauth:grant-type:token-exchange
&subject_token=<ServiceAccount token>
&subject_token_type=urn:ietf:params:oauth:token-type:jwt
&audience=https://models.example/api
&scope=inference`,
      },
    },
    {
      from: 'sts',
      to: 'k8s',
      kind: 'back',
      label: 'Fetch issuer keys',
      title: 'The token service finds the cluster’s public keys',
      body: `Clusters publish standard OIDC discovery metadata at \`/.well-known/openid-configuration\` under the issuer URL, pointing to a JWKS. The token service caches the keys. The cluster is acting as an identity provider for its workloads.`,
    },
    {
      from: 'sts',
      kind: 'self',
      label: 'Verify; map subject to role',
      title: 'Trust policy turns an identity into permissions',
      body: `The token service verifies the signature, issuer, audience and expiry, then evaluates a rule that an administrator wrote in advance: tokens from *this* issuer with *this* subject may assume *that* role. This rule is the entire security boundary.`,
      code: {
        lang: 'yaml',
        text: `# conceptual trust rule
issuer:   https://oidc.cluster.example
audience: https://sts.example
subject:  system:serviceaccount:agents:research-agent
grants:   role/model-inference`,
      },
    },
    {
      from: 'sts',
      to: 'agent',
      kind: 'resp',
      label: 'Short-lived access token',
      title: 'The agent receives a scoped credential',
      body: `Minutes to an hour, scoped to the mapped role. When it expires the agent repeats the exchange with whatever token is on disk by then.`,
      gain: [['agent', 'access token (aud: API)']],
    },
    {
      from: 'agent',
      to: 'api',
      kind: 'back',
      label: 'Call API with access token',
      title: 'The agent calls the external API',
      body: `No API key was provisioned, stored or rotated.`,
    },
    {
      from: 'api',
      to: 'agent',
      kind: 'resp',
      label: '200 OK',
      title: 'The API responds',
      body: `Access logs attribute the call to a role that maps back to one namespace and service account. Deleting the service account, or the trust rule, cuts access without touching a secret store.`,
    },
  ],
  standards: ['k8s-sa-tokens', 'rfc8693', 'oidc-discovery', 'rfc7519', 'rfc7523', 'spiffe', 'wimse-arch'],
  roles: {
    'k8s-sa-tokens': 'required', // projected tokens, their claims and issuer discovery: steps 1, 2, 4
    rfc8693: 'required', // the exchange as drawn: steps 3 and 6
    'oidc-discovery': 'required', // fetching the issuer's keys, step 4
    rfc7519: 'required', // the platform token is a JWT: step 2 shows its claims, step 5 teaches checking issuer, audience and expiry
    rfc7523: 'optional', // the client-assertion alternative named in step 3 but not drawn
    spiffe: 'background', // related; not named or used on this page
    'wimse-arch': 'background', // related; not named or used on this page
  },
  related: ['spiffe-workload-identity', 'client-credentials', 'wimse-workload-tokens', 'token-exchange'],
  notes: [
    {
      title: 'The same pattern outside Kubernetes',
      body: `CI systems issue OIDC tokens to jobs. Cloud runtimes issue instance and function identity tokens. Managed agent platforms have started doing the same for agents. Whenever the place your agent runs can sign a statement about what it is running, federation applies. See [deployments](/deployments/) for specifics.`,
    },
  ],
};
