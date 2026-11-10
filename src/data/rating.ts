/**
 * The rating rule, kept free of site data so it can be checked on its own
 * (scripts/rating-check.mjs). The rule is stated for readers on the About page
 * under "How flows are rated".
 *
 *   - A flow takes the level of its least mature required reference.
 *   - Optional and background references never change it.
 *   - A reference whose role is not settled is not counted, and is not assumed
 *     to be optional or stable either. If requiring it would lower the level,
 *     the rating is provisional until the reference is classified.
 */
import type { Maturity, RefRole, StdStatus } from './types';

/** Least mature first. */
const ORDER: Maturity[] = ['experimental', 'emerging', 'stable'];

/**
 * The level a reference's status shows by itself. A project, a platform or a
 * guidance document shows none: its tracker entry states a level, from what its
 * maintainers publish, or it stays unknown.
 */
export function levelOf(ref: { status: StdStatus; level?: Maturity }): Maturity | undefined {
  if (ref.level) return ref.level;
  if (ref.status === 'rfc' || ref.status === 'final') return 'stable';
  if (ref.status === 'wg-draft') return 'emerging';
  if (ref.status === 'draft') return 'experimental';
  return undefined;
}

export interface RatedRef {
  id: string;
  role: RefRole;
  /** Undefined when no evidence of its maturity has been recorded. */
  level: Maturity | undefined;
}

export interface Rating {
  level: Maturity;
  /** True while a reference whose role is not settled could lower the level. */
  provisional: boolean;
  /** Those references: role not settled, and less mature than the level or of unknown maturity. */
  pending: string[];
}

export function rate(refs: RatedRef[]): Rating {
  const required = refs.filter((r) => r.role === 'required');
  if (required.length === 0) throw new Error('no required reference to rate from');
  const unknown = required.filter((r) => r.level === undefined);
  if (unknown.length > 0) {
    throw new Error(
      `required ${unknown.map((r) => `"${r.id}"`).join(', ')} has no recorded maturity level; state one on its tracker entry, with its evidence`,
    );
  }
  const rank = Math.min(...required.map((r) => ORDER.indexOf(r.level!)));
  const pending = refs
    .filter((r) => r.role === 'unresolved' && (r.level === undefined || ORDER.indexOf(r.level) < rank))
    .map((r) => r.id);
  return { level: ORDER[rank], provisional: pending.length > 0, pending };
}
