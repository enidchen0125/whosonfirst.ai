// Checks the rating rule in src/data/rating.ts against cases the site's data does not
// currently contain, above all a reference whose role is not settled and which would
// lower the rating if it turned out to be required. Run with `npm run check:rating`.
//
// Node strips the types from rating.ts as it loads it; the module imports types only.
import { strict as assert } from 'node:assert';
import { levelOf, rate } from '../src/data/rating.ts';

const ref = (id, role, status, level) => ({ id, role, level: levelOf({ status, level }) });
const cases = [];
const check = (name, fn) => cases.push([name, fn]);

check('a status shows a level only when it can', () => {
  assert.equal(levelOf({ status: 'rfc' }), 'stable');
  assert.equal(levelOf({ status: 'final' }), 'stable');
  assert.equal(levelOf({ status: 'wg-draft' }), 'emerging');
  assert.equal(levelOf({ status: 'draft' }), 'experimental');
  assert.equal(levelOf({ status: 'project' }), undefined);
  assert.equal(levelOf({ status: 'guidance' }), undefined);
  assert.equal(levelOf({ status: 'project', level: 'stable' }), 'stable');
});

check('the least mature required reference decides', () => {
  assert.equal(rate([ref('a', 'required', 'rfc'), ref('b', 'required', 'final')]).level, 'stable');
  assert.equal(rate([ref('a', 'required', 'rfc'), ref('b', 'required', 'wg-draft')]).level, 'emerging');
  assert.equal(rate([ref('a', 'required', 'wg-draft'), ref('b', 'required', 'draft')]).level, 'experimental');
});

check('optional and background drafts never change it', () => {
  const r = rate([ref('a', 'required', 'rfc'), ref('b', 'optional', 'draft'), ref('c', 'background', 'wg-draft')]);
  assert.deepEqual(r, { level: 'stable', provisional: false, pending: [] });
});

check('an unsettled draft that would lower a stable rating makes it provisional', () => {
  const r = rate([ref('a', 'required', 'rfc'), ref('b', 'unresolved', 'wg-draft')]);
  assert.deepEqual(r, { level: 'stable', provisional: true, pending: ['b'] });
});

check('an unsettled reference of unknown maturity makes it provisional', () => {
  const r = rate([ref('a', 'required', 'rfc'), ref('b', 'unresolved', 'project')]);
  assert.deepEqual(r, { level: 'stable', provisional: true, pending: ['b'] });
});

check('an unsettled reference that could not lower the rating leaves it settled', () => {
  assert.deepEqual(rate([ref('a', 'required', 'rfc'), ref('b', 'unresolved', 'rfc')]), {
    level: 'stable',
    provisional: false,
    pending: [],
  });
  assert.deepEqual(rate([ref('a', 'required', 'wg-draft'), ref('b', 'unresolved', 'wg-draft')]), {
    level: 'emerging',
    provisional: false,
    pending: [],
  });
});

check('only the unsettled references that could lower it are named', () => {
  const r = rate([
    ref('a', 'required', 'wg-draft'),
    ref('b', 'unresolved', 'rfc'),
    ref('c', 'unresolved', 'draft'),
    ref('d', 'unresolved', 'guidance'),
  ]);
  assert.deepEqual(r, { level: 'emerging', provisional: true, pending: ['c', 'd'] });
});

check('a required reference of unknown maturity is refused, not assumed stable', () => {
  assert.throws(() => rate([ref('a', 'required', 'rfc'), ref('b', 'required', 'project')]), /"b" has no recorded maturity level/);
});

check('a flow with nothing required cannot be rated', () => {
  assert.throws(() => rate([ref('a', 'optional', 'rfc'), ref('b', 'unresolved', 'draft')]), /no required reference/);
});

let failed = 0;
for (const [name, fn] of cases) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failed++;
    console.log(`  ✗ ${name}\n    ${String(e.message).split('\n')[0]}`);
  }
}
console.log(`\n${cases.length} rating checks, ${failed} failed.`);
process.exit(failed ? 1 : 0);
