import type { Flow } from "../types";

export const agentPayments: Flow = {
  slug: "agent-payments",
  title: "Agent payments with signed mandates",
  short: "Agent payments (AP2)",
  group: "agent-to-agent",
  human: "reachable",
  maturity: "experimental",
  tagline:
    "The user signs what the agent may buy. The agent proves, to the merchant and to the payment network, that a purchase falls inside it.",
  summary: `Payments are where “the agent says the user wanted this” stops being good enough. If an agent buys the wrong thing, someone bears the cost, and the merchant, the card issuer and the user will each want evidence of what was authorized.

The Agent Payments Protocol answers with **mandates**: digitally signed statements of what a user has approved. In the current version there are two kinds. A **checkout mandate** shows a merchant that the agent may complete a particular purchase. A **payment mandate** shows the payment side that the agent may pay for it. Each comes in two forms. A *closed* mandate authorizes one specific checkout. An *open* mandate sets out constraints in advance, for when the user will not be there, and names the agent’s key so the agent can later sign closed mandates that stay within those limits.

The diagram shows the second case: the human approves the boundaries, leaves, and the agent shops inside them.`,
  fits: [
    "Agents that complete purchases, with or without the user present at checkout.",
    "Situations where a merchant or issuer needs verifiable evidence of user intent for disputes.",
    "Commerce protocols that need a payment-authorization layer.",
  ],
  watchOut: [
    "This is pre-1.0 and changing. The mandate model was redesigned between the first and second versions, and stewardship has moved to a standards body where work is only starting.",
    "There are several competing and overlapping efforts from card networks, payment processors and AI vendors. None has settled as the standard.",
    "An open mandate is a signed blank check with limits. The limits are the security: amount, merchant, items, expiry.",
    "The user’s consent must be captured on a surface the agent does not control. If the agent draws the approval screen, the signature proves nothing.",
  ],
  lesson: "limits",
  phases: [
    {
      title: "The user signs the limits, and the agent later finds an offer",
      from: 1,
    },
    {
      title: "The merchant signs the terms, and the agent signs the purchase",
      from: 3,
    },
    {
      title:
        "The credential provider checks the limits, then issues a credential",
      from: 6,
    },
    { title: "The agent completes the purchase and gets a receipt", from: 9 },
  ],
  parts: {
    user: "Reviews and signs the limits the agent must stay within, such as amount, merchant, items and expiry. Signs on a trusted surface that the agent does not control, then leaves.",
    agent:
      "Finds an offer inside the user’s limits while the user is away, and builds a checkout with the merchant. Using the key that the open mandates name, signs closed mandates bound to the merchant’s signed checkout. Presents the payment mandate to the credential provider, then the checkout mandate and the payment credential to the merchant.",
    cp: "Holds the user’s payment methods. Verifies that the open mandate is signed by the user, that it names this agent’s key, and that the closed mandate is inside the limits, then issues a credential for this payment. The protocol requires that check to be done by deterministic code, not by a model.",
    merchant:
      "Signs the checkout, which fixes the items, price and totals. Receives the checkout mandate together with the payment credential, and returns a receipt. The mandates and receipts form the evidence trail if the purchase is disputed.",
  },
  participants: [
    { id: "user", label: "User", sub: "On a trusted surface", role: "human" },
    {
      id: "agent",
      label: "Shopping agent",
      sub: "Holds its own key",
      role: "agent",
    },
    {
      id: "cp",
      label: "Credential provider",
      sub: "Payment side",
      role: "authz",
    },
    { id: "merchant", label: "Merchant", role: "resource" },
  ],
  steps: [
    {
      from: "user",
      to: "agent",
      kind: "front",
      label: "Sign open mandates",
      title: "The user approves constraints, not a purchase",
      body: `“Buy these running shoes in size 43 if the price drops below €120, this month.” The user reviews and signs on a **trusted surface**, a piece of interface that the protocol requires to be non-agentic. The result is a pair of open mandates, checkout and payment, that carry the constraints and the public key of the agent allowed to act on them.`,
      gain: [
        ["agent", "agent key"],
        ["agent", "open mandates (user-signed)"],
      ],
    },
    {
      from: "agent",
      kind: "self",
      label: "Later: finds a matching offer",
      title: "The agent works alone",
      body: `Days later, with the user absent, the agent finds an offer that satisfies the constraints.`,
    },
    {
      from: "agent",
      to: "merchant",
      kind: "back",
      label: "Start checkout",
      title: "The agent builds a checkout with the merchant",
      body: `Through whatever commerce protocol the merchant supports. The payment protocol sits beneath it as the authorization layer.`,
    },
    {
      from: "merchant",
      to: "agent",
      kind: "resp",
      label: "Merchant-signed checkout",
      title: "The merchant commits to the terms",
      body: `The merchant signs the checkout: items, price, totals. This fixes what is being bought, so the agent’s authorization can refer to it by hash.`,
      gain: [["agent", "signed checkout"]],
    },
    {
      from: "agent",
      kind: "self",
      label: "Sign closed mandates",
      title: "The agent authorizes this specific purchase",
      body: `Using the key named in the open mandates, the agent signs closed checkout and payment mandates bound to the merchant’s signed checkout. Anyone verifying them can follow the chain: the user authorized this key within these limits, and this key authorized this purchase.`,
      gain: [["agent", "closed mandates (agent-signed)"]],
    },
    {
      from: "agent",
      to: "cp",
      kind: "back",
      label: "Present payment mandate",
      title: "The agent asks the credential provider for a payment credential",
      body: `The credential provider holds the user’s payment methods. It receives the payment mandate and only the details it needs.`,
    },
    {
      from: "cp",
      kind: "self",
      label: "Verify chain and limits",
      title: "The credential provider checks the delegation",
      body: `Is the open mandate genuinely signed by the user? Does it name this agent’s key? Is the closed mandate inside the constraints? The protocol requires this to be done by deterministic code, not by a model.`,
    },
    {
      from: "cp",
      to: "agent",
      kind: "resp",
      label: "Payment credential",
      title: "A credential usable for this payment",
      body: `Typically a network token or similar single-purpose credential, not the underlying card number.`,
      gain: [["agent", "payment credential (this purchase)"]],
    },
    {
      from: "agent",
      to: "merchant",
      kind: "back",
      label: "Checkout mandate + payment",
      title: "The agent completes the purchase",
      body: `The merchant receives the payment credential and the checkout mandate. The mandate shows that this agent is authorized to complete this checkout.`,
    },
    {
      from: "merchant",
      to: "agent",
      kind: "resp",
      label: "Signed receipt",
      title: "Receipts close the loop",
      body: `The merchant returns a signed checkout receipt. The merchant’s payment processor, which is not drawn here, returns a signed payment receipt. With the mandates, they form the evidence trail if the purchase is ever disputed.`,
      lose: [["agent", "payment credential (this purchase)"]],
    },
  ],
  standards: [
    "ap2",
    "verifiable-intent",
    "rfc9901",
    "openid4vp",
    "acp-commerce",
    "visa-tap",
    "x402",
  ],
  related: ["web-bot-auth", "ciba", "step-up-authorization", "agent-to-agent"],
  notes: [
    {
      title: "The same idea in OAuth terms",
      body: `A mandate is a transaction-specific authorization that can be verified offline by several parties. [Rich Authorization Requests](/flows/step-up-authorization/) express the same intent inside OAuth, with the authorization server as the single verifier. The payments world chose signed credentials because merchants, processors, networks and issuers each need to check the evidence independently, sometimes long after the fact.`,
    },
  ],
};
