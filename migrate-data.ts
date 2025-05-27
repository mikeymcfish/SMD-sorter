import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { cases, compartments, components } from "./shared/schema";
import { CASE_LAYOUTS } from "./client/src/lib/constants";

async function seedDatabase() {
  console.log("Seeding database with your latest data...");
  
  const sql = neon(process.env.DATABASE_URL!);
  const db = drizzle(sql);
  
  try {
    // Create the "Case-1" case that had all your components
    console.log("Creating Case-1...");
    const [newCase] = await db.insert(cases).values({
      name: "Case-1",
      model: "LAYOUT-12x6-BOTH",
      description: "Main component storage case",
      isActive: true
    }).returning();
    
    console.log(`Created case with ID: ${newCase.id}`);
    
    // Create compartments for the case (12x6 layout = 144 compartments)
    console.log("Creating compartments...");
    const layout = CASE_LAYOUTS["LAYOUT-12x6-BOTH"];
    const compartmentInserts = [];
    
    // Top layer
    for (let row = 1; row <= layout.rows; row++) {
      for (let col = 1; col <= layout.cols; col++) {
        const rowLetter = String.fromCharCode(64 + row); // A, B, C, etc.
        compartmentInserts.push({
          caseId: newCase.id,
          position: `${rowLetter}${col}`,
          row,
          col,
          layer: "top" as const
        });
      }
    }
    
    // Bottom layer  
    for (let row = 1; row <= layout.rows; row++) {
      for (let col = 1; col <= layout.cols; col++) {
        const rowLetter = String.fromCharCode(64 + row); // A, B, C, etc.
        compartmentInserts.push({
          caseId: newCase.id,
          position: `${rowLetter}${col}`,
          row,
          col,
          layer: "bottom" as const
        });
      }
    }
    
    const newCompartments = await db.insert(compartments).values(compartmentInserts).returning();
    console.log(`Created ${newCompartments.length} compartments`);
    
    console.log("Database seeded successfully! You can now add your components again and they will persist.");
    
  } catch (error) {
    console.error("Database seeding failed:", error);
    process.exit(1);
  }
}

seedDatabase();