/**
 * "What does the API see?": one person, one agent, one API, and three things
 * the agent might attach to its request. Used by the first lesson and, with
 * the same data, by the home page, so the two cannot drift apart.
 *
 * This is the plain-words version of data/verify.ts, which keeps the full
 * account for the Concepts page: a fourth check (proof of who is sending),
 * and what refusing and revoking take. Nothing here may contradict it.
 *
 * The three questions are the site's question, one clause each:
 * who is acting, for whom, and who said they could.
 */
import type { Scenario } from "./types";

export const apiSees: Scenario = {
  id: "api-sees",
  legend: "The agent attaches",
  cast: [
    { label: "Alice", sub: "asks the agent", role: "human" },
    { label: "Agent", sub: "your app", role: "agent" },
    { label: "Calendar API", sub: "has her events", role: "resource" },
  ],
  asks: "What the API can tell",
  questions: ["Who is acting?", "For whom?", "Who said they could?"],
  options: [
    {
      id: "key",
      name: "Its own API key",
      hops: ["“What’s on tomorrow?”", "API key, and a name"],
      exhibits: [
        {
          caption: "What arrives at the API",
          lang: "http",
          text: `GET /events?day=tomorrow HTTP/1.1
Host: calendar.example
X-API-Key: sk_agent_7f3a9c…
X-User: alice`,
        },
      ],
      findings: [
        {
          verdict: "yes",
          note: "The key belongs to the agent’s account.",
        },
        {
          verdict: "no",
          note: "`alice` is whatever the agent typed. The API cannot check it.",
        },
        {
          verdict: "no",
          note: "An administrator gave the agent its access. Alice approved nothing.",
        },
      ],
      so: `The API knows the agent is calling, and has to take its word for everything else. If Bob tells the agent “show me Alice’s calendar” and the agent goes along with it, the API sees a valid key and answers. **The only thing protecting Alice is the agent’s own judgment. Do not rely on a key to keep users apart.**`,
    },
    {
      id: "userkey",
      name: "A key Alice made",
      hops: ["gives it a key from her account", "Alice’s key"],
      exhibits: [
        {
          caption: "What arrives at the API",
          lang: "http",
          text: `GET /events?day=tomorrow HTTP/1.1
Host: calendar.example
X-API-Key: sk_user_2b9e41d…`,
        },
      ],
      findings: [
        {
          verdict: "no",
          note: "The key is Alice’s. Nothing shows which software is using it, or that software is involved at all.",
        },
        {
          verdict: "yes",
          note: "Alice’s account, because the key is hers.",
        },
        {
          verdict: "partly",
          note: "Alice made the key, so she agreed to something. Most keys open the whole account and never expire.",
        },
      ],
      so: `The API can now tell Alice’s requests from Bob’s. But as far as it can tell, the agent *is* Alice: whatever it does is recorded as her doing it, and the key usually allows everything her account can do, for as long as it exists. **It names the person and hides the software.**`,
    },
    {
      id: "token",
      name: "A token Alice approved",
      hops: ["approves “read my calendar”", "access token"],
      exhibits: [
        {
          caption: "What arrives at the API",
          lang: "http",
          text: `GET /events?day=tomorrow HTTP/1.1
Host: calendar.example
Authorization: Bearer eyJhbGciOiJFUzI1NiIs…`,
        },
        {
          caption: "What the token says, once the API has checked it",
          lang: "yaml",
          text: `for:        alice
issued to:  calendar-assistant
allows:     read the calendar
signed by:  auth.example`,
        },
      ],
      findings: [
        {
          verdict: "yes",
          note: "The token names the app it was issued to.",
        },
        {
          verdict: "yes",
          note: "The token names Alice, and the service that signed it vouches for that.",
        },
        {
          verdict: "yes",
          note: "Alice did, for reading her calendar and nothing else.",
        },
      ],
      so: `The API can now tell Alice’s requests from Bob’s, refuse anything beyond reading a calendar, and block this one agent without locking Alice out. **What the agent can do for Alice is now limited by what Alice approved, and the API is the one enforcing it.**`,
    },
  ],
};
