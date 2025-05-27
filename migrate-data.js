import fs from 'fs';

// Read your exported data
const data = JSON.parse(fs.readFileSync('./attached_assets/smd-components-2025-05-26 (5).json', 'utf8'));

console.log('Processing data migration...');
console.log(`Found ${data.cases.length} cases and ${data.components.length} components`);

// Create a mapping of compartment positions to components
const componentsByPosition = new Map();

// Process each case to map components by position
for (const case_ of data.cases) {
  for (const compartment of case_.compartments) {
    if (compartment.component) {
      const key = `${case_.name}-${compartment.position}-${compartment.layer}`;
      componentsByPosition.set(key, {
        name: compartment.component.name,
        category: compartment.component.category,
        packageSize: compartment.component.packageSize || "",
        quantity: compartment.component.quantity || 0,
        minQuantity: compartment.component.minQuantity || 5,
        notes: compartment.component.notes || "",
        position: compartment.position,
        layer: compartment.layer,
        caseName: case_.name,
        caseModel: case_.model
      });
    }
  }
}

console.log(`Mapped ${componentsByPosition.size} components by position`);

// Create the migration format that the frontend can use
const migrationData = {
  cases: data.cases.map(case_ => ({
    name: case_.name,
    model: case_.model,
    description: case_.description || "",
    isActive: case_.isActive !== false
  })),
  componentsByPosition: Object.fromEntries(componentsByPosition)
};

// Save the migration data
fs.writeFileSync('./migration-data.json', JSON.stringify(migrationData, null, 2));

console.log('Migration data saved to migration-data.json');
console.log('Components by position sample:');
console.log(Array.from(componentsByPosition.entries()).slice(0, 5));