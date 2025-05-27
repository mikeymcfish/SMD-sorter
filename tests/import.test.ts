import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { MemStorage } from '../server/storage';

const storage = new MemStorage();
let importedData: any;

async function importSample() {
  const file = new URL('../sample.json', import.meta.url);
  const data = JSON.parse(await fs.readFile(file, 'utf8'));
  const mapping = new Map<number, number>();

  for (const caseData of data.cases) {
    const newCase = await storage.createCase({
      name: caseData.name,
      rows: caseData.rows ?? 6,
      cols: caseData.cols ?? 4,
      hasBottom: caseData.hasBottom ?? false,
      description: caseData.description ?? ''
    });

    const withComps = await storage.getCaseWithCompartments(newCase.id);
    if (!withComps) continue;

    for (const newComp of withComps.compartments) {
      const oldComp = caseData.compartments?.find((c: any) => c.position === newComp.position && c.layer === newComp.layer);
      if (oldComp) mapping.set(oldComp.id, newComp.id);
    }
  }

  for (const compData of data.components || []) {
    const newCompartmentId = mapping.get(compData.compartmentId);
    if (!newCompartmentId) continue;
    await storage.createComponent({
      name: compData.name,
      compartmentId: newCompartmentId,
      categoryId: compData.categoryId,
      quantity: compData.quantity ?? 1,
      minQuantity: compData.minQuantity ?? 5,
      datasheetUrl: compData.datasheetUrl ?? null,
      photoUrl: compData.photoUrl ?? null,
      notes: compData.notes ?? null
    });
  }

  return data;
}

test.before(async () => {
  importedData = await importSample();
});

test('sample.json imports', async () => {
  const cases = await storage.getCases();
  assert.equal(cases.length, importedData.cases.length);
});

test('cases and components are retrieved', async () => {
  const cases = await storage.getCases();
  assert.ok(cases.length > 0);

  const caseWithComps = await storage.getCaseWithCompartments(cases[0].id);
  assert.ok(caseWithComps);
  assert.ok(caseWithComps!.compartments.length > 0);

  const someWithComponent = caseWithComps!.compartments.some(c => c.component);
  assert.ok(someWithComponent);

  const allComponents = await storage.getComponents();
  assert.equal(allComponents.length, importedData.components.length);
});
