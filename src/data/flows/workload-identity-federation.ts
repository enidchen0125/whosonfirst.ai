import type { Flow } from "../types";

export const workloadIdentityFederation: Flow = {
  slug: "workload-identity-federation",
  title: "Workload identity federation",
  short: "Workload identity federation",
  group: "autonomous",
  human: "absent",
  maturity: "stable",
  tagline:
    "Your agent uses an identity established by its runtime to obtain short-lived access from a system that trusts that identity.",
  summary: `The place an agent runs already knows which workload it started. Cloud services, virtual machines, containers, CI jobs and on-premises infrastructure can all turn that knowledge into an identity the workload can prove. Kubernetes service account tokens are one implementation, worked through [further down](#example).

Two related ideas are involved, and they are not interchangeable. **Platform-provided workload identity** means the infrastructure establishes the workload’s identity and supplies its credentials, so the application owner does not provision a long-lived application secret. **Workload identity federation** means a receiving system trusts an identity established in another trust domain and uses it to grant access.

A Lambda function calling AWS APIs with its execution role is using native workload identity: one identity system, and nothing is federated. Using that function’s identity to obtain access in a different identity system is federation. The other system does not have to belong to another cloud provider. A Kubernetes cluster and the cloud it runs in are separate trust domains, and so are a CI service and the account it deploys to.

What the pattern removes is the need to provision and manage a long-lived application secret, for the integrations that support it. It does not remove credentials. The identity credential and whatever is issued in exchange are short-lived, and they still need protecting. The destination also has to support the trust arrangement: an API that only accepts an API key cannot be federated to, and a [credential broker](/flows/credential-broker/) is the usual answer there.`,
  fits: [
    "Agents running where the platform can identify the workload: a cloud function, virtual machine or managed container, a Kubernetes pod, a CI job.",
    "Calling cloud APIs, or any service that can be configured to trust the platform’s identities, as the agent itself.",
    "Anywhere you would otherwise deliver an API key or client secret to the workload, provided the destination supports the trust arrangement.",
  ],
  watchOut: [
    "**Trust a specific issuer, and know who else it serves.** Some issuers sign for many tenants under one URL. GitHub Actions on GitHub.com uses a single issuer for every repository, so trusting the issuer alone trusts all of them.",
    "**Require the audience you intended.** The identity credential should name the receiving token service, and the receiver should refuse any other value. A credential issued for one recipient and accepted by another is a confused-deputy path.",
    "**Match the exact workload.** Pin the subject, or the claims that stand in for it, to one workload: one service account, one repository and environment, one role. Avoid wildcards and prefix matches, and prefer identifiers that cannot be reassigned, such as IDs over names where the issuer offers them. What a rule can match on differs by receiver.",
    "**Grant the least access that works.** The role or permission behind the trust rule is what a stolen credential is worth.",
    "**Do not share one identity between agents.** Agents that share a service account, a role or a job identity are one principal to every system downstream. They cannot be limited, audited or cut off separately.",
    "**Short-lived credentials still need protecting.** A bearer token, such as a JWT identity credential or an access token issued for it, can be replayed by whoever holds a copy until it expires. Certificate-based authentication is different: it requires proof of possession of the matching private key, so the key is what has to stay private. Keep tokens and private keys out of logs, prompts and tool output. Limit what can reach the platform’s credential endpoints too: anything that can make requests from inside the workload, including a tool the agent was talked into calling, may be able to ask for the same credentials.",
    "**Deleting the workload does not cut off its credentials.** It stops the platform issuing or renewing the identity credential. A copy that has not expired can still be exchanged for new access while the receiver’s trust rule stands, and what the receiver already issued has a lifetime of its own. See the note on stopping access.",
    "**The receiver has to reach the issuer’s keys.** A private cluster or an internal identity provider has to publish its discovery document and keys somewhere the receiver can fetch them, or upload the keys where the receiver allows that.",
    "**Workload identity is not a user’s authority.** Federation establishes which workload is calling. It does not carry a person’s identity or consent, and it does not turn the agent’s access into the user’s. Carrying a user’s authority is delegation: see [token exchange](/flows/token-exchange/).",
  ],
  lesson: "whose-authority",
  phases: [
    {
      title: "The identity provider gives the workload an identity credential",
      from: 1,
    },
    {
      title: "The workload presents it, and the token service checks it",
      from: 2,
    },
    {
      title: "The token service applies a trust rule and issues a credential",
      from: 5,
    },
    {
      title: "The workload calls the target API with that credential",
      from: 7,
    },
  ],
  parts: {
    idp: "Establishes which workload this is and supplies a short-lived, signed credential that says so. The platform usually does this and keeps the credential fresh. You configure which identity the workload runs as.",
    agent:
      "Reads the identity credential, presents it to the token service, and uses the short-lived credential that comes back to call the target API, repeating the exchange when that expires. An SDK or credential library usually does this, once it is told where to find the identity credential and what to ask for. Both credentials still need protecting: keep them out of logs, prompts and tool output.",
    sts: "Finds the issuer’s public keys, checks the credential’s signature, issuer, audience and expiry, applies a trust rule, and issues a short-lived credential. The receiving system does the checking. The trust rule and the access behind it are written in advance, and they are yours to get right: a rule that matches more workloads than you meant gives each of them the access.",
    api: "Authorizes the call with the access the trust rule granted, and logs it under that role or identity. It has to support the arrangement: an API that only accepts an API key cannot be federated to. That access is the agent’s own authority: nothing in this flow carries a user’s identity or consent.",
  },
  participants: [
    {
      id: "idp",
      label: "Identity provider",
      sub: "workload’s platform",
      role: "infra",
    },
    { id: "agent", label: "Agent workload", role: "agent" },
    {
      id: "sts",
      label: "Token service",
      sub: "receiving system",
      role: "authz",
    },
    { id: "api", label: "Target API", role: "resource" },
  ],
  steps: [
    {
      from: "idp",
      to: "agent",
      kind: "back",
      label: "Workload identity credential",
      title: "The platform gives the workload an identity credential",
      body: `The workload identity provider is whatever established which workload this is: a cloud’s metadata service, a Kubernetes cluster, a CI system, a SPIFFE implementation. It supplies a short-lived, signed statement of that identity, most often a JWT (RFC 7519) like the one shown. How it arrives depends on the platform: a file that is kept fresh, a local endpoint, a request the workload makes when it needs one. Some receivers accept other proofs instead, such as an X.509 certificate or a signed request.

*Usually handled by the platform, and read by an SDK.*`,
      code: {
        lang: "jsonc",
        text: `// Illustrative claims.
// Names and values depend on the issuer.
{
  "iss": "https://identity.platform.example",
  "sub": "workload:research-agent",
  "aud": "https://sts.receiver.example",
  "iat": 1794268800,
  "exp": 1794272400
}`,
      },
      gain: [["agent", "identity credential (aud: token service)"]],
    },
    {
      from: "agent",
      to: "sts",
      kind: "back",
      label: "Present identity credential",
      title: "The workload presents it to the receiving token service",
      body: `This is the federation step. The receiving token service belongs to the system the agent wants access to: a cloud’s security token service, or an identity platform’s token endpoint. The request has no universal format. Google Cloud uses OAuth token exchange (RFC 8693). Microsoft Entra takes the credential as the client assertion on a client credentials request. AWS has its own operation, \`AssumeRoleWithWebIdentity\`. The note on request formats, below, sets out the differences.

*Usually handled by an SDK or credential library, once it is told where to find the identity credential and what to ask for.*`,
    },
    {
      from: "sts",
      to: "idp",
      kind: "back",
      label: "Fetch issuer keys",
      title: "The token service finds the issuer’s public keys",
      body: `A signed credential is checked against its issuer’s public keys. Most receivers read them from the issuer’s OpenID Connect discovery document, at \`/.well-known/openid-configuration\` under the issuer URL, which points to a key set (JWKS). They cache what they find. Where the issuer cannot be reached from outside, some receivers let an administrator upload the keys instead. Either way the issuer was registered in advance: a token service does not go looking for the keys of an issuer nobody told it to trust.

*Handled by the receiving system.*`,
    },
    {
      from: "sts",
      kind: "self",
      label: "Validate the credential",
      title: "The token service validates what it was given",
      body: `It checks the signature against the issuer’s keys, that the issuer is one it was configured to trust, that the audience names this token service, and that the credential has not expired. The audience check is what stops a token issued for one recipient from being replayed at another: RFC 7519 requires a recipient to reject a JWT whose audience does not include it. What the audience value should be is for the receiver to define, and differs by provider.

So far the receiver knows only that a trusted issuer made this statement, for this recipient, recently. It has not yet decided what the workload may do.

*Handled by the receiving system.*`,
    },
    {
      from: "sts",
      kind: "self",
      label: "Apply the trust rule",
      title: "A trust rule turns the identity into permissions",
      body: `An administrator wrote the rule in advance: credentials from *this* issuer, for *this* audience, naming *this* workload, get *that* access. Receivers call it different things, such as a role trust policy, a federated identity credential, or an attribute condition on an identity pool. The syntax differs, and so does what a rule can match on, but this rule is the security boundary everywhere. One that matches more workloads than you meant gives each of them the access.

*Written ahead of time by whoever administers the receiving system. This part is yours to get right.*`,
      code: {
        lang: "yaml",
        text: `# Conceptual trust rule.
# Each receiver has its own syntax.
issuer:   https://identity.platform.example
audience: https://sts.receiver.example
subject:  workload:research-agent
grants:   role/model-inference`,
      },
    },
    {
      from: "sts",
      to: "agent",
      kind: "resp",
      label: "Short-lived credential",
      title: "The token service issues a short-lived credential",
      body: `What comes back depends on the receiver. Google Cloud returns a federated access token, used directly or to impersonate a service account. Microsoft Entra returns an OAuth access token. AWS returns temporary security credentials: an access key ID, a secret access key and a session token. Those sign requests. They are not an OAuth bearer token.

How long the credential lasts is the receiver’s setting, and differs by provider and configuration. When it expires, the exchange is repeated with a fresh identity credential.

*Usually cached and renewed by the SDK.*`,
      gain: [["agent", "short-lived credential (for the target API)"]],
    },
    {
      from: "agent",
      to: "api",
      kind: "back",
      label: "Call API with the credential",
      title: "The agent calls the target API",
      body: `How the credential is used depends on its kind. An OAuth access token is sent as a bearer token in the \`Authorization\` header. AWS credentials are used to sign the request. The identity credential from step 1 is not sent to the API: its audience is the token service.

*Usually handled by the SDK or client library, which attaches the token or signs the request.*`,
    },
    {
      from: "api",
      to: "agent",
      kind: "resp",
      label: "200 OK",
      title: "The API responds",
      body: `The API authorized the call with the access the trust rule granted. Its logs attribute the call to that role or identity, which traces back to one workload if the rule was written for one.

That is the agent’s own authority. Nothing in this flow carries a human user’s identity or consent. If the agent is acting for a person, that authority has to come from a delegation flow, such as [authorization code](/flows/authorization-code-pkce/) or [token exchange](/flows/token-exchange/).`,
    },
  ],
  standards: [
    "rfc7519",
    "oidc-discovery",
    "rfc8693",
    "rfc7523",
    "k8s-sa-tokens",
    "spiffe",
    "github-actions-oidc",
    "aws-oidc-federation",
    "aws-sts-web-identity",
    "aws-outbound-federation",
    "gcp-wif",
    "gcp-wif-x509",
    "entra-wif",
    "aws-iam-roles",
    "gcp-auth",
    "azure-managed-identities",
  ],
  // No single specification defines the pattern. Required here means required by the flow the
  // diagram draws (see `illustrated`): a JWT identity credential and OIDC discovery. Each
  // provider's mechanism, other proofs, and the Kubernetes worked example are variants.
  roles: {
    rfc7519: "required", // the identity credential drawn in step 1 is a JWT; step 4 teaches the audience and expiry rules it sets
    "oidc-discovery": "required", // step 3 shows the discovery document the receiver reads to find the issuer's keys
    rfc8693: "optional", // one request format (Google Cloud, and the worked example); no general step depends on it
    rfc7523: "optional", // the client assertion format Microsoft Entra uses; named, not drawn
    "k8s-sa-tokens": "optional", // the worked example's identity credential; one implementation of step 1
    spiffe: "optional", // one identity provider for workloads outside a cluster or cloud; named in the comparison
    "github-actions-oidc": "optional", // the CI row: one identity provider
    "aws-oidc-federation": "optional", // one receiving system
    "aws-sts-web-identity": "optional", // its request format and what it returns
    "aws-outbound-federation": "optional", // AWS as the identity provider
    "gcp-wif": "optional", // one receiving system
    "gcp-wif-x509": "optional", // a proof other than a JWT, named above the diagram and in the cautions; not drawn
    "entra-wif": "optional", // one receiving system
    "aws-iam-roles": "background", // native identity, named as the contrast with federation
    "gcp-auth": "background", // native identity, named as the contrast with federation
    "azure-managed-identities": "background", // native identity, named as the contrast with federation
  },
  basis: ["rfc7519", "oidc-discovery"],
  related: [
    "spiffe-workload-identity",
    "client-credentials",
    "wimse-workload-tokens",
    "token-exchange",
  ],
  notes: [
    {
      title: "What the platform and the SDK do for you",
      body: `In most deployments you write none of the eight steps. The platform issues the identity credential and keeps it fresh. A cloud SDK or credential library, pointed at that credential, makes the exchange, caches what comes back, renews it, and attaches it to requests or signs them. The receiving system does the validation. What is left to you is configuration: which identity the workload runs as, the trust rule on the receiving side, and the access behind it.

With native workload identity there is less still. A function, virtual machine or managed container calling its own cloud’s APIs is handed credentials for that cloud’s identity system by the platform, and nothing is exchanged. Federation starts when the system being called is not the one that established the identity.`,
    },
    {
      title: "One exchange, several request formats",
      body: `No single specification defines this pattern. What the implementations share is a signed identity credential, usually a JWT, and a published way to find the issuer’s keys, usually OpenID Connect discovery. The exchange itself is where they differ.

**Google Cloud** follows OAuth token exchange (RFC 8693). The workload posts its credential to the Security Token Service as the subject token and receives a federated access token. The service also accepts proofs that are not JWTs, including a signed AWS request and an X.509 client certificate presented over mutual TLS.

**Microsoft Entra** uses the client credentials grant. The outside token goes in \`client_assertion\`, with \`client_assertion_type\` set to the JWT bearer type from RFC 7523, in place of an assertion the application would otherwise sign with its own certificate. Its issuer, subject and audience must match the federated identity credential exactly. A [flexible federated identity credential](https://learn.microsoft.com/en-us/entra/workload-id/workload-identities-flexible-federated-identity-credentials), which Microsoft marks as a preview, replaces the fixed subject with an expression over the token’s claims that can use wildcards. It is supported for tokens issued by GitHub, GitLab and Terraform Cloud.

**AWS, inbound.** \`AssumeRoleWithWebIdentity\` takes the token and the role to assume. The call is not signed with AWS credentials. It returns temporary security credentials for signing requests, not an OAuth access token.

**AWS, outbound.** A workload that already has AWS credentials can call \`GetWebIdentityToken\` for a short-lived JWT to present to a service outside AWS. The feature has to be enabled for the account first, and the caller needs permission for the operation. The caller names the audience and the signing algorithm. The token lasts from one minute to an hour, five minutes by default. The issuer URL is specific to the account, and the operation is not available on the STS global endpoint. AWS describes the token as proof of identity, to be exchanged at the outside service for that service’s own credentials.

Audience values, credential lifetimes, the claims a rule can match on and the way keys are discovered are each provider’s own. Do not carry one provider’s settings over to another.`,
    },
    {
      title: "Stopping access",
      body: `Cutting off a workload is three separate events. Each has its own control, and none of them brings about the others.

**The platform stops issuing or renewing the identity credential.** Deleting the workload or disabling its platform identity does this. It does not recall a credential already handed out. A copy that has not expired is still a validly signed statement.

**The receiving system stops accepting that credential in new exchanges.** A receiver that validates a JWT offline, against cached keys, sees a valid signature and an unexpired token. It cannot see that the pod, service account or job behind the token is gone. So a copied token can go on obtaining new downstream credentials after its workload is deleted, for as long as it is unexpired and the trust rule is in place. Removing or narrowing the trust rule is what stops further exchanges, once that change has taken effect.

**Downstream credentials already issued are invalidated.** These have their own validity and their own revocation rules, set by the receiver. Removing the trust rule does not recall them. Some receivers can cut them short: AWS can revoke the sessions a role issued before a given time, by attaching a policy that denies them. Some cannot: Azure says a managed identity’s token cannot be forced to refresh before it expires, and that changes to the identity’s group or role membership can take several hours to apply.

Short lifetimes on both credentials keep the gaps small. Deleting a pod, a service account or a job is not an instant cut-off, and neither is deleting a trust rule.`,
    },
  ],
  illustrated: {
    steps: `The diagram shows a common JWT-based federation flow using OIDC discovery. Other implementations use different proofs and verification mechanisms, such as an X.509 certificate presented over mutual TLS, a signed request, or keys an administrator uploads. A service can also validate the identity credential itself, with no exchange, as the first of the [real implementations](#implementations) does.`,
    references: `These are required by the flow the diagram draws: a JWT identity credential, and OIDC discovery to find the keys that verify it. Neither is required of every implementation of workload identity federation, and each can be replaced separately. A certificate or a signed request can take the place of the JWT. Keys an administrator uploads can take the place of OIDC discovery, and a JWT verified against uploaded keys still depends on RFC 7519. The maturity rating describes the diagram’s flow in the same way.`,
  },
  comparison: {
    title: "The same pattern by environment",
    intro: `Each environment is a place a workload runs. Where it runs and how it gets its initial identity describe platform-provided identity. The receiving system shows where federation comes in, and where it does not.`,
    rowHeading: "Environment",
    fields: [
      { heading: "Where the workload runs", label: "Runs on" },
      {
        heading: "How it gets its initial identity",
        label: "Initial identity",
      },
      {
        heading: "Which system trusts that identity",
        label: "Receiving system",
      },
      {
        heading: "What it receives, and how it is used",
        label: "Resulting credential",
      },
    ],
    rows: [
      {
        name: "AWS",
        values: [
          "A Lambda function, an EC2 instance, an ECS task.",
          "An IAM role attached to the function, instance or task. AWS supplies the role’s temporary credentials to the code.",
          "AWS itself: this is native identity, with nothing to federate. A system outside AWS can trust the workload through outbound federation, where the account has enabled it.",
          "Temporary AWS credentials that sign API requests. For outbound federation, a short-lived JWT from `GetWebIdentityToken`, exchanged at the outside system.",
        ],
      },
      {
        name: "Google Cloud",
        values: [
          "A Cloud Run service or function, a Compute Engine VM.",
          "A service account attached to the resource. Client libraries get its credentials from the metadata server.",
          "Google Cloud itself, natively. An outside system can be configured to trust a Google-signed ID token for the service account.",
          "OAuth access tokens for Google APIs, sent as bearer tokens. For an outside system, an ID token with the audience the workload asks for.",
        ],
      },
      {
        name: "Azure",
        values: [
          "A function app, a virtual machine, a container app.",
          "A managed identity assigned to the resource. Code asks a local endpoint on the platform for tokens.",
          "Microsoft Entra itself, natively. An app registration can also be configured to trust a managed identity, which is federation without leaving Azure.",
          "Microsoft Entra access tokens for the resource the workload names, sent as bearer tokens.",
        ],
      },
      {
        name: "CI/CD",
        values: [
          "A GitHub Actions job. GitLab CI has an equivalent.",
          "The CI system’s OIDC provider issues the job a JWT that describes it: repository, branch or environment, workflow. The job has to be permitted to request it.",
          "A cloud or service configured in advance with the CI issuer and a rule on the token’s claims: an IAM role’s trust policy, a workload identity pool provider, a federated identity credential.",
          "Whatever that receiver issues: temporary AWS credentials, a Google federated access token, a Microsoft Entra access token.",
        ],
      },
      {
        name: "Kubernetes and on-premises",
        values: [
          "A pod in any cluster, or a service on hosts you run.",
          "In a cluster, a service account token signed by the cluster and projected into the pod. Elsewhere, an identity provider you operate, such as a SPIFFE implementation or an existing OIDC or SAML provider.",
          "Any receiver that can be given the issuer and reach its keys. Managed Kubernetes services offer this for their own cloud’s identity system.",
          "The receiver’s short-lived credential, as in the other environments. The [worked example](#example) is this one.",
        ],
      },
    ],
    after: `These are recognizable examples, not a catalog. Not every service offers every path. Audience values, lifetimes and the claims a rule can match on differ by provider, so check the documentation for the combination you need. Managed agent platforms apply the same model to the agents they host: see [agent platforms](/deployments/agent-platforms/) and the other [deployment guides](/deployments/).`,
  },
  example: {
    title: "Worked example: a Kubernetes pod",
    intro: `One concrete case of the steps above: an agent in a pod federates from its cluster to a token service outside it. The details are specific to Kubernetes. Other environments may deliver credentials differently, and their tokens carry different claims.`,
    parts: [
      {
        title: "The pod asks for a projected token",
        body: `The pod spec asks for a service account token with a chosen audience and lifetime. The kubelet obtains it through the TokenRequest API, writes it to a file in the pod, and replaces it before it expires. Set the audience. Left unset, the token is issued for the cluster’s own API server, which is the wrong recipient for an outside service.`,
        code: {
          lang: "yaml",
          text: `volumes:
  - name: agent-identity
    projected:
      sources:
        - serviceAccountToken:
            audience: https://sts.example
            expirationSeconds: 3600
            path: token`,
        },
      },
      {
        title: "The token names the service account and the pod",
        body: `The token is a JWT signed by the cluster. The subject names the namespace and service account. The token is bound to the pod named in the \`kubernetes.io\` claim: the API server stops accepting it once that pod is deleted. The node entry is additional metadata. It does not bind the token to the node, and Kubernetes does not check that the node exists when it authenticates the token.

A receiver outside the cluster that validates the signature offline checks none of this. A token whose pod is gone still verifies until it expires. Kubernetes says a client that needs the binding checked must present the token to the API server through the TokenReview API.

Read the file fresh each time, because it rotates on disk.`,
        code: {
          lang: "jsonc",
          text: `// Illustrative claims from a projected
// service account token.
{
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
        title: "The cluster publishes its keys",
        body: `The cluster serves a discovery document at \`/.well-known/openid-configuration\` under its issuer URL, and its signing keys at \`/openid/v1/jwks\`. Kubernetes describes these as compatible with OpenID Connect without being strictly compliant. The receiving token service has to be able to fetch both. For a private cluster that means publishing them somewhere reachable, or uploading the keys where the receiver supports it.`,
      },
      {
        title: "The agent exchanges the token",
        body: `The receiver in this example takes OAuth token exchange (RFC 8693), the form Google Cloud’s Security Token Service follows. The request is illustrative: the host, audience and scope are placeholders. Microsoft Entra would take the same token as a \`client_assertion\`, and AWS as the \`WebIdentityToken\` parameter of \`AssumeRoleWithWebIdentity\`.`,
        code: {
          lang: "http",
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
        title: "The trust rule names the service account",
        body: `The rule on the receiving side pins the cluster’s issuer, the audience, and one namespace and service account. A rule that accepts any token from the cluster lets every pod in it become your agent.`,
        code: {
          lang: "yaml",
          text: `# Conceptual trust rule.
# Each receiver has its own syntax.
issuer:   https://oidc.cluster.example
audience: https://sts.example
subject:  system:serviceaccount:agents:research-agent
grants:   role/model-inference`,
        },
      },
      {
        title: "On managed Kubernetes",
        body: `EKS, GKE and AKS each tie a Kubernetes service account to an identity in their own cloud, and usually do the exchange for the pod, in an SDK, a node agent or a metadata endpoint. The mechanisms differ: see [reaching the cloud](/deployments/kubernetes/#reaching-the-cloud) in the Kubernetes guide.`,
      },
    ],
  },
  sections: [
    {
      id: "permissions",
      title: "From identity to permissions",
      intro: `A validated credential says who is calling. What the caller may do is a separate decision, and the system that receives the call makes it. Three jobs are involved. Keeping them apart is what lets workload identity support roles and permissions of your own.`,
      parts: [
        {
          title: "Trust the issuer",
          body: `The receiver accepts credentials only from issuers it was configured to trust, and checks each one’s signature, audience and expiry. That establishes that the statement is authentic and meant for this receiver. It grants nothing yet.`,
        },
        {
          title: "Identify the workload, or the user",
          body: `The validated claims name the caller: a subject such as a service account, a SPIFFE ID, or a repository and environment. A token issued for a user names that user as well, or instead. Only claims from a validated credential count. A name sent in a request body or a header is only the caller’s word.`,
        },
        {
          title: "Grant and enforce permissions",
          body: `Someone decides what that identity may do, and something enforces the decision on every request: roles and assignments in the receiving system, a gateway’s policy, an authorization service, or the API’s own code. Business rules live here. In the illustration, an invoice agent may read invoices and create reconciliation drafts. It cannot approve payments, because nothing grants it that.`,
          code: {
            lang: "yaml",
            text: `# Illustration only. Not a vendor feature
# and not a tested deployment.
identity: workload:invoice-agent
may:
  - invoices:read
  - reconciliation-drafts:create
# Not granted: payments:approve`,
          },
        },
      ],
      after: `Workload identity can underpin custom roles and permissions like these. It does not define them, and it does not convey a human user’s authority. The API, gateway or authorization service has to enforce the resulting policy.`,
    },
    {
      id: "implementations",
      title: "Real implementations",
      intro: `Three paths the providers document, for agents and services you operate. They are documented implementation paths, read in November 2026. They are not evidence of how widely any of them is used in production, and none was tested here.`,
      parts: [
        {
          title: "An agent acting as itself against a custom service",
          tags: [{ text: "Google Cloud" }, { text: "Preview", tone: "amber" }],
          body: `Google Cloud’s Agent Identity issues an agent an OIDC ID token for the audience the agent asks for. The token is a JWT whose subject is the agent’s SPIFFE ID. A custom API, a gateway or an on-premises service validates it against Google’s public discovery and key endpoints, checking issuer, signature, audience and expiry. The service then authorizes the verified identity. Google’s example compares the subject against an allowlist of agent SPIFFE IDs.

The service accepts the identity token directly, as a bearer token on the request. Nothing is exchanged. Google documents the exchange path separately, for receivers with built-in federation such as Microsoft Entra, so not every integration needs a second token. By default the token is also bound to the agent’s certificate. A receiver can enforce that binding over mutual TLS. One that ignores it is accepting a bearer token.

Google marks this feature Preview, under pre-GA terms and with limited support. That is the product’s release stage. It is separate from the maturity of the standards underneath, JWT and OpenID Connect Discovery, which are stable.`,
          sources: [
            {
              label:
                "Authenticate to external services using an agent’s own identity (Google Cloud)",
              href: "https://docs.cloud.google.com/iam/docs/auth-agent-own-identity-external",
            },
          ],
        },
        {
          title: "A federated workload with application-defined permissions",
          tags: [{ text: "Microsoft Entra" }],
          body: `Two Microsoft documents together establish this path. Neither is a walkthrough for agents.

The first covers authentication. With workload identity federation, a workload outside Azure presents a token from its own identity provider and receives a Microsoft Entra access token, with no client secret or certificate of its own.

The second covers authorization. The designer of a custom API defines application roles on the API’s registration, and an administrator assigns them to the workload. The receiving API validates the access token and checks its \`roles\` claim for the operation being called. Microsoft says an API does not use the scope claim for workloads, and that the API is responsible for enforcing the workload’s access. By default an application role covers every instance of a resource, so anything finer is the API’s own policy.`,
          sources: [
            {
              label:
                "Authorize applications, resources, and workloads with Microsoft Entra ID",
              href: "https://learn.microsoft.com/en-us/entra/architecture/authorize-applications-resources-workloads",
            },
            {
              label:
                "Workload identity federation (Microsoft Entra Workload ID)",
              href: "https://learn.microsoft.com/en-us/entra/workload-id/workload-identity-federation",
            },
          ],
        },
        {
          title: "An agent carrying a user’s authorization downstream",
          tags: [
            { text: "AWS AgentCore" },
            { text: "Related: user delegation" },
          ],
          body: `This is a related case, here for contrast. The agent is not proving only its own workload identity. A signed-in user’s authorization travels with each request, and the downstream system applies that user’s access. AWS published it in August 2026 as a reference implementation on Amazon Bedrock AgentCore. Its three data sources are protected in three different ways.

**DynamoDB.** The agent passes the user’s Cognito ID token to \`AssumeRoleWithWebIdentity\`. Session tags taken from the signed token, and an IAM policy that keys on them, limit the temporary credentials to the user’s department. IAM refuses a request outside it.

**Salesforce.** AgentCore Identity performs an on-behalf-of token exchange (RFC 8693) and obtains a user-scoped token. Salesforce’s own sharing rules decide what that user sees.

**Knowledge Bases.** The agent adds a metadata filter to its query. AWS calls this application-layer enforcement: it holds only while the agent’s code applies the filter, unlike the DynamoDB restriction, which IAM enforces. For stricter isolation AWS suggests a knowledge base for each department, with IAM policies on each.

Access delegated by a user is the subject of [token exchange](/flows/token-exchange/).`,
          sources: [
            {
              label:
                "Propagate user authorization context in AI agents with Amazon Bedrock AgentCore (AWS Security Blog)",
              href: "https://aws.amazon.com/blogs/security/propagate-user-authorization-context-in-ai-agents-with-amazon-bedrock-agentcore/",
            },
          ],
        },
      ],
      after: `All three keep the same jobs apart: an issuer the receiver trusts, an identity read from validated claims, and permissions the receiving system grants and enforces. For the products themselves, see [agent platforms](/deployments/agent-platforms/).`,
    },
  ],
};
