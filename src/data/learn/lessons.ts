/**
 * The lessons under /learn/, in reading order.
 *
 * Each lesson answers one question, in plain words first and the specifications'
 * words second, and ends by pointing at the pages that cover the same ground in
 * full. A lesson may use only terms that it, or a lesson before it, has taught:
 * `teaches` is that list, and the build checks each entry against the glossary.
 */
import { glossary } from "../glossary";
import type { Lesson } from "./types";

export const lessons: Lesson[] = [
  {
    slug: "what-the-api-sees",
    title: "What does the API actually see?",
    short: "What the API sees",
    promise:
      "Say what an API can and cannot know about a request from an agent, and why an API key is not enough.",
    minutes: 5,
    teaches: ["Credential", "API key", "Client", "Resource server"],
    deeper: [
      {
        href: "/concepts/#verify",
        label: "What the API can verify",
        note: "The same comparison in full: a fourth check, and what refusing and revoking take.",
      },
      {
        href: "/concepts/#roles",
        label: "The roles",
        note: "All five parties in every diagram, with what each holds and verifies.",
      },
    ],
  },
  {
    slug: "tokens",
    title: "What is a token?",
    short: "What a token is",
    promise:
      "Read an access token, name the five checks an API runs before believing it, and say what a valid token still does not prove.",
    minutes: 7,
    teaches: [
      "Access token",
      "Authorization server",
      "Claim",
      "Issuer",
      "Subject",
      "Audience",
      "Scope",
      "JWT",
      "Bearer token",
    ],
    deeper: [
      {
        href: "/concepts/#tokens",
        label: "What is in a token",
        note: "Nine credentials you will meet, claim by claim.",
      },
      {
        href: "/standards/#rfc9068",
        label: "JWT Profile for Access Tokens",
        note: "The specification the example token follows, RFC 9068.",
      },
    ],
  },
  {
    slug: "getting-a-token",
    title: "How does an agent get a token for a user?",
    short: "Getting a token",
    promise:
      "Explain each hop of an OAuth sign-in: why the browser is involved, why a code comes back before a token, and what a refresh token is for.",
    minutes: 8,
    teaches: [
      "OAuth",
      "Consent",
      "Authorization code",
      "PKCE",
      "Refresh token",
      "Confidential client",
      "Public client",
      "MCP",
    ],
    deeper: [
      {
        href: "/flows/authorization-code-pkce/",
        label: "Authorization code with PKCE",
        note: "The same flow at full size: eleven steps, with the HTTP on the wire.",
      },
      {
        href: "/flows/mcp-authorization/",
        label: "MCP authorization",
        note: "The same flow when the agent has never seen the server before.",
      },
      {
        href: "/flows/device-authorization/",
        label: "Device authorization",
        note: "For an agent with no browser where it runs.",
      },
    ],
  },
  {
    slug: "whose-authority",
    title: "What if nobody is there to sign in?",
    short: "The agent’s own identity",
    promise:
      "Decide whether an agent should act for a person or as itself, and say where an agent’s own identity comes from.",
    minutes: 7,
    teaches: [
      "Principal",
      "Service account",
      "Client credentials",
      "Workload",
      "Workload identity",
      "Federation",
    ],
    deeper: [
      {
        href: "/flows/client-credentials/",
        label: "Client credentials",
        note: "The agent authenticates as itself and gets a token with no user in it.",
      },
      {
        href: "/flows/workload-identity-federation/",
        label: "Workload identity federation",
        note: "The platform vouches for the agent, across clouds, CI and Kubernetes.",
      },
      {
        href: "/deployments/",
        label: "Deployments",
        note: "Where the first credential comes from on each kind of platform.",
      },
    ],
  },
  {
    slug: "chains",
    title: "What happens when the agent calls a tool that calls an API?",
    short: "Chains of calls",
    promise:
      "Explain why a token should be exchanged at each hop and not passed along, and tell delegation from impersonation.",
    minutes: 6,
    teaches: [
      "Token passthrough",
      "Confused deputy",
      "Token exchange",
      "Delegation",
      "Impersonation",
      "Actor",
    ],
    deeper: [
      {
        href: "/flows/token-exchange/",
        label: "Token exchange",
        note: "The exchange step by step, with the request and the token that comes back.",
      },
      {
        href: "/concepts/#delegation",
        label: "Delegation or impersonation",
        note: "Five ways of carrying authority down a chain, compared on five questions.",
      },
      {
        href: "/flows/#g-delegation",
        label: "Delegation chains",
        note: "Across companies, inside one infrastructure, and under a company identity provider.",
      },
    ],
  },
  {
    slug: "limits",
    title: "What limits the damage when something goes wrong?",
    short: "Limiting the damage",
    promise:
      "Name the two failures every agent design has to plan for, and the control that answers each.",
    minutes: 7,
    teaches: [
      "Prompt injection",
      "Sender-constrained token",
      "Proof of possession",
      "DPoP",
      "Step-up",
    ],
    deeper: [
      {
        href: "/flows/dpop/",
        label: "Sender-constrained tokens (DPoP)",
        note: "Binding a token to a key, step by step.",
      },
      {
        href: "/flows/credential-broker/",
        label: "Credential broker",
        note: "Keeping the secret outside the agent altogether.",
      },
      {
        href: "/flows/step-up-authorization/",
        label: "Step-up authorization",
        note: "A fresh approval for one sensitive action.",
      },
      {
        href: "/concepts/#rules",
        label: "Rules of thumb",
        note: "Seven habits that follow from all six lessons.",
      },
    ],
  },
];

const known = new Set(glossary.map((t) => t.term.toLowerCase()));
for (const l of lessons) {
  for (const t of l.teaches) {
    if (!known.has(t.toLowerCase()))
      throw new Error(
        `[learn/${l.slug}] teaches "${t}", which is not in the glossary`,
      );
  }
}

const bySlug = new Map(lessons.map((l) => [l.slug, l]));

export function lesson(slug: string): Lesson {
  const l = bySlug.get(slug);
  if (!l) throw new Error(`Unknown lesson "${slug}"`);
  return l;
}

/** Total reading time, rounded to five minutes. */
export const totalMinutes =
  Math.round(lessons.reduce((n, l) => n + l.minutes, 0) / 5) * 5;
