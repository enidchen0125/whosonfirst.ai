/** Types for the lessons under /learn/ and the figures they use. */
import type { Role } from "../types";

export interface Lesson {
  slug: string;
  /** The question the lesson answers. It is the page's title. */
  title: string;
  /** A few words for lists and the progress strip. */
  short: string;
  /** What the reader will be able to do afterwards. One sentence. */
  promise: string;
  /** Reading time, including the figure. */
  minutes: number;
  /** The terms the lesson teaches, in the order they appear. Each must be a glossary term. */
  teaches: string[];
  /** Where the same ground is covered in full. */
  deeper: { href: string; label: string; note: string }[];
}

/** `skipped`: a check that is never reached, because an earlier one failed. */
export type Verdict = "yes" | "no" | "partly" | "skipped";

export const VERDICT_WORD: Record<Verdict, string> = {
  yes: "Yes",
  no: "No",
  partly: "Partly",
  skipped: "Skipped",
};

export interface Actor {
  label: string;
  /** Second line in the box. */
  sub?: string;
  role: Role;
}

/** One listing in a figure: a request, a token, a log line. */
export interface Exhibit {
  caption: string;
  lang: string;
  text: string;
}

export interface ScenarioOption {
  id: string;
  /** The choice, as it reads on its button. */
  name: string;
  /**
   * Set where this variation is shown for comparison and must not be built: one
   * plain sentence saying why. md-lite. The figure then puts a warning sign on
   * the choice itself, says "do not build this" with the reason at the head of
   * its panel, and marks its row in the comparison table, so the warning
   * depends neither on the text around the figure nor on a click.
   * A variation that is only an attack, or only weaker, does not need it; one a
   * reader might take for a design they could ship does.
   */
  avoid?: string;
  /** Replaces the scenario's cast while this option is chosen. */
  cast?: Actor[];
  /** What travels along each arrow: one entry per gap between actors. */
  hops: string[];
  /** What the receiver has in front of it. */
  exhibits?: Exhibit[];
  /**
   * One per question, in the scenario's order. `note` is md-lite. Leave `verdict`
   * out where the question is not a yes-or-no one: the note is then the answer.
   */
  findings: { verdict?: Verdict; note: string }[];
  /** What follows. md-lite blocks. */
  so: string;
  link?: { href: string; text: string };
}

/**
 * A figure with a small cast, one thing that varies, and the same questions asked
 * of every variation. The reader picks a variation and sees the answers change.
 * It is drawn with radio inputs and CSS, so it works without JavaScript, and the
 * variation shown first has to make the point on its own: many readers never click.
 */
export interface Scenario {
  /** Unique on the page: names the radio group. */
  id: string;
  /** What varies, e.g. "The agent attaches". Not shown when there is only one option. */
  legend: string;
  cast: Actor[];
  /** Heading over the answers, e.g. "What the API can tell". */
  asks: string;
  questions: string[];
  options: ScenarioOption[];
  /** The option shown first. Defaults to the first one. */
  initial?: string;
}

export interface CheckOption {
  text: string;
  correct?: boolean;
  /** Shown when this option is chosen. md-lite. Says why, right or wrong. */
  why: string;
}

/** A question the reader answers before moving on. Feedback is immediate and says why. */
export interface CheckQuestion {
  id: string;
  /** md-lite. */
  question: string;
  options: CheckOption[];
}
