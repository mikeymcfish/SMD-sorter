import test from 'node:test';
import assert from 'node:assert';
import { MemStorage } from '../server/storage';

// Helper to setup a storage instance for each test
function createStore() {
  return new MemStorage();
}

test('createCase generates compartments for both layers', async () => {
  const store = createStore();
  const caseData = await store.createCase({
    name: 'Test Case',
    rows: 2,
    cols: 2,
    hasBottom: true,
  });
  const fetched = await store.getCaseWithCompartments(caseData.id);
  assert.ok(fetched);
  assert.strictEqual(fetched.compartments.length, 8);
  const top = fetched.compartments.filter(c => c.layer === 'top').length;
  const bottom = fetched.compartments.filter(c => c.layer === 'bottom').length;
  assert.strictEqual(top, 4);
  assert.strictEqual(bottom, 4);
});

test('createComponent and searchComponents', async () => {
  const store = createStore();
  const caseData = await store.createCase({ name: 'Case', rows: 1, cols: 1, hasBottom: false });
  const [compartment] = await store.getCompartmentsByCase(caseData.id);
  await store.createComponent({
    compartmentId: compartment.id,
    name: '1k Resistor',
    categoryId: 1,
    quantity: 10,
  });
  const results = await store.searchComponents('1k');
  assert.strictEqual(results.length, 1);
  assert.strictEqual(results[0].name, '1k Resistor');
});

test('updateComponent modifies stored component', async () => {
  const store = createStore();
  const caseData = await store.createCase({ name: 'Case', rows: 1, cols: 1, hasBottom: false });
  const [compartment] = await store.getCompartmentsByCase(caseData.id);
  const component = await store.createComponent({
    compartmentId: compartment.id,
    name: 'Cap',
    categoryId: 2,
  });
  const updated = await store.updateComponent(component.id, { name: 'Capacitor' });
  assert.ok(updated);
  assert.strictEqual(updated?.name, 'Capacitor');
});

test('deleteCase marks case as inactive', async () => {
  const store = createStore();
  const caseData = await store.createCase({ name: 'Case', rows: 1, cols: 1, hasBottom: false });
  const deleted = await store.deleteCase(caseData.id);
  assert.ok(deleted);
  const fetched = await store.getCase(caseData.id);
  assert.ok(fetched);
  assert.strictEqual(fetched?.isActive, false);
  const activeCases = await store.getCases();
  assert.strictEqual(activeCases.find(c => c.id === caseData.id), undefined);
});
