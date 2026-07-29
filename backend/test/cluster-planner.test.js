const test = require('node:test');
const assert = require('node:assert/strict');
const { planCluster, matchExisting, detectCannibalization } = require('../src/modules/cluster-planner/planner');
const { validatePlanInput } = require('../src/modules/cluster-planner/validation');

const destination = {
  id: 'dest-1', name: 'Budapest', slug: 'budapest', country: 'Hongrie', region: 'Europe centrale',
  bestTime: 'avril à octobre', idealDuration: '3 à 5 jours',
  highlights: ['Les bains Széchenyi', 'Le Parlement hongrois', 'Une croisière sur le Danube']
};

test('génère une page pilier et des pages de cluster', () => {
  const result = planCluster({ destination, existingPages: [], limit: 20 });
  assert.equal(result.pillar.key, 'pillar');
  assert.ok(result.pages.length >= 10);
  assert.equal(result.summary.existing, 0);
  assert.equal(result.summary.missing, result.pages.length);
});

test('reconnaît une page existante par son titre ou son slug', () => {
  const existingPages = [{ id: 'p1', title: 'Week-end à Budapest', slug: 'week-end-a-budapest', path: '/week-end-a-budapest' }];
  const result = planCluster({ destination, existingPages, limit: 20 });
  const page = result.pages.find((item) => item.key === 'short-stay');
  assert.equal(page.state, 'existing');
  assert.equal(page.existingPage.id, 'p1');
});

test('calcule la couverture du cluster', () => {
  const base = planCluster({ destination, existingPages: [], limit: 5 });
  const existingPages = base.pages.slice(0, 2).map((page, index) => ({ id: `p${index}`, title: page.title, slug: page.slug }));
  const result = planCluster({ destination, existingPages, limit: 5 });
  assert.equal(result.summary.existing, 2);
  assert.equal(result.summary.coverage, 40);
});

test('construit une topologie sans orphelin', () => {
  const result = planCluster({ destination, existingPages: [], limit: 20 });
  assert.equal(result.topology.some((node) => node.orphan), false);
  const pillar = result.topology.find((node) => node.key === 'pillar');
  assert.ok(pillar.children.length > 0);
});

test('détecte une cannibalisation entre pages proches', () => {
  const warnings = detectCannibalization([], [
    { id: 'a', title: 'Week-end à Budapest pas cher', slug: 'week-end-budapest-pas-cher' },
    { id: 'b', title: 'Week-end pas cher à Budapest', slug: 'week-end-pas-cher-budapest' }
  ]);
  assert.ok(warnings.length >= 1);
});

test('valide et normalise les entrées API', () => {
  const input = validatePlanInput({ destination: 'budapest', limit: 999, scope: 'portfolio' });
  assert.equal(input.destinationSlug, 'budapest');
  assert.equal(input.limit, 50);
  assert.equal(input.scope, 'portfolio');
  assert.throws(() => validatePlanInput({}), /obligatoire/);
});

test('matchExisting refuse une page sans proximité suffisante', () => {
  const match = matchExisting({ title: 'Week-end à Budapest', slug: 'week-end-a-budapest' }, [{ id: 'x', title: 'Plages de Martinique', slug: 'plages-martinique' }]);
  assert.equal(match, null);
});
