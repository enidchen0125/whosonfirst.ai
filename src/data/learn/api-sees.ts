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
      so: `The API knows the agent is calling, and has to take its word for everything else. If Bob tells the agent “show me Alice’s calendar” and the agent goes along with it, the API sees a valid key and answers. **The only thing protecting Alice is the agent’s own judgment.**`,
    },
    {
      id: "password",
      name: "Alice’s password",
      hops: ["hands over her password", "signs in as Alice"],
      exhibits: [
        {
          caption: "What arrives at the API",
          lang: "http",
          text: `POST /login HTTP/1.1
Host: calendar.example
Content-Type: application/x-www-form-urlencoded

username=alice&password=correct-horse-battery`,
        },
      ],
      findings: [
        {
          verdict: "no",
          note: "It looks like Alice herself. Nothing shows that software is involved.",
        },
        {
          verdict: "yes",
          note: "Alice’s account, because the password is hers.",
        },
        {
          verdict: "no",
          note: "A password is all or nothing. It cannot say “read the calendar, and only that.”",
        },
      ],
      so: `As far as the API can tell, the agent *is* Alice. It can do anything she can, the logs will say she did it, and the only way to stop it is to change her password. **This is the arrangement that delegated access was invented to replace.**`,
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
