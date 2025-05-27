import { MemStorage, PostgreSQLStorage } from "./server/storage";
import { CASE_LAYOUTS } from "./client/src/lib/constants";

async function migrateData() {
  console.log("Starting data migration...");
  
  // Create instances of both storage types
  const memStorage = new MemStorage();
  const pgStorage = new PostgreSQLStorage();
  
  try {
    // Migrate cases
    console.log("Migrating cases...");
    const cases = await memStorage.getCases();
    for (const case_ of cases) {
      const { id, ...caseData } = case_;
      await pgStorage.createCase(caseData);
    }
    console.log(`Migrated ${cases.length} cases`);
    
    // Migrate compartments
    console.log("Migrating compartments...");
    let totalCompartments = 0;
    for (const case_ of cases) {
      const compartments = await memStorage.getCompartmentsByCase(case_.id);
      for (const compartment of compartments) {
        const { id, ...compartmentData } = compartment;
        await pgStorage.createCompartment(compartmentData);
        totalCompartments++;
      }
    }
    console.log(`Migrated ${totalCompartments} compartments`);
    
    // Migrate components
    console.log("Migrating components...");
    const components = await memStorage.getComponents();
    for (const component of components) {
      const { id, ...componentData } = component;
      await pgStorage.createComponent(componentData);
    }
    console.log(`Migrated ${components.length} components`);
    
    console.log("Data migration completed successfully!");
    
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

migrateData();