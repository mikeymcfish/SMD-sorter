import { 
  users, cases, compartments, components,
  type User, type InsertUser,
  type Case, type InsertCase,
  type Compartment, type InsertCompartment,
  type Component, type InsertComponent,
  type CaseWithCompartments
} from "@shared/schema";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq, and, like, or } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Case methods
  getCases(): Promise<Case[]>;
  getCase(id: number): Promise<Case | undefined>;
  getCaseWithCompartments(id: number): Promise<CaseWithCompartments | undefined>;
  createCase(case_: InsertCase): Promise<Case>;
  updateCase(id: number, updates: Partial<InsertCase>): Promise<Case | undefined>;
  deleteCase(id: number): Promise<boolean>;

  // Compartment methods
  getCompartmentsByCase(caseId: number): Promise<Compartment[]>;
  getCompartment(id: number): Promise<Compartment | undefined>;
  createCompartment(compartment: InsertCompartment): Promise<Compartment>;

  // Component methods
  getComponents(): Promise<Component[]>;
  getComponent(id: number): Promise<Component | undefined>;
  getComponentByCompartment(compartmentId: number): Promise<Component | undefined>;
  createComponent(component: InsertComponent): Promise<Component>;
  updateComponent(id: number, updates: Partial<InsertComponent>): Promise<Component | undefined>;
  deleteComponent(id: number): Promise<boolean>;
  searchComponents(query: string): Promise<Component[]>;
}

// PostgreSQL Storage Implementation
export class PostgreSQLStorage implements IStorage {
  private db: ReturnType<typeof drizzle>;

  constructor() {
    const sql = neon(process.env.DATABASE_URL!);
    this.db = drizzle(sql);
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await this.db.insert(users).values(user).returning();
    return result[0];
  }

  // Case methods
  async getCases(): Promise<Case[]> {
    return await this.db.select().from(cases);
  }

  async getCase(id: number): Promise<Case | undefined> {
    const result = await this.db.select().from(cases).where(eq(cases.id, id));
    return result[0];
  }

  async getCaseWithCompartments(id: number): Promise<CaseWithCompartments | undefined> {
    const case_ = await this.getCase(id);
    if (!case_) return undefined;

    const caseCompartments = await this.db.select().from(compartments).where(eq(compartments.caseId, id));
    
    const compartmentsWithComponents = await Promise.all(
      caseCompartments.map(async (compartment) => {
        const component = await this.getComponentByCompartment(compartment.id);
        return { ...compartment, component };
      })
    );

    return {
      ...case_,
      compartments: compartmentsWithComponents
    };
  }

  async createCase(case_: InsertCase): Promise<Case> {
    const result = await this.db.insert(cases).values(case_).returning();
    const newCase = result[0];
    
    // Create compartments for the new case
    await this.createCompartmentsForCase(newCase);
    
    return newCase;
  }

  private async createCompartmentsForCase(case_: Case) {
    const { CASE_LAYOUTS } = await import("../client/src/lib/constants");
    const layout = CASE_LAYOUTS[case_.model as keyof typeof CASE_LAYOUTS];
    
    if (!layout) {
      console.warn(`Unknown case model: ${case_.model}`);
      return;
    }

    const compartmentInserts = [];

    // Create compartments for each layer
    const layers = case_.model.includes("BOTH") ? ["top", "bottom"] : ["top"];
    
    for (const layer of layers) {
      for (let row = 1; row <= layout.rows; row++) {
        for (let col = 1; col <= layout.cols; col++) {
          const rowLetter = String.fromCharCode(64 + row); // A, B, C, etc.
          compartmentInserts.push({
            caseId: case_.id,
            position: `${rowLetter}${col}`,
            row,
            col,
            layer: layer as "top" | "bottom"
          });
        }
      }
    }

    await this.db.insert(compartments).values(compartmentInserts);
    console.log(`Created ${compartmentInserts.length} compartments for case ${case_.name}`);
  }

  async updateCase(id: number, updates: Partial<InsertCase>): Promise<Case | undefined> {
    const result = await this.db.update(cases).set(updates).where(eq(cases.id, id)).returning();
    return result[0];
  }

  async deleteCase(id: number): Promise<boolean> {
    try {
      // First delete all components in this case
      const caseCompartments = await this.db.select().from(compartments).where(eq(compartments.caseId, id));
      for (const compartment of caseCompartments) {
        await this.db.delete(components).where(eq(components.compartmentId, compartment.id));
      }
      
      // Then delete all compartments
      await this.db.delete(compartments).where(eq(compartments.caseId, id));
      
      // Finally delete the case
      const result = await this.db.delete(cases).where(eq(cases.id, id));
      return result.rowCount > 0;
    } catch (error) {
      console.error("Error deleting case:", error);
      return false;
    }
  }

  // Compartment methods
  async getCompartmentsByCase(caseId: number): Promise<Compartment[]> {
    return await this.db.select().from(compartments).where(eq(compartments.caseId, caseId));
  }

  async getCompartment(id: number): Promise<Compartment | undefined> {
    const result = await this.db.select().from(compartments).where(eq(compartments.id, id));
    return result[0];
  }

  async createCompartment(compartment: InsertCompartment): Promise<Compartment> {
    const result = await this.db.insert(compartments).values(compartment).returning();
    return result[0];
  }

  // Component methods
  async getComponents(): Promise<Component[]> {
    return await this.db.select().from(components);
  }

  async getComponent(id: number): Promise<Component | undefined> {
    const result = await this.db.select().from(components).where(eq(components.id, id));
    return result[0];
  }

  async getComponentByCompartment(compartmentId: number): Promise<Component | undefined> {
    const result = await this.db.select().from(components).where(eq(components.compartmentId, compartmentId));
    return result[0];
  }

  async createComponent(component: InsertComponent): Promise<Component> {
    const result = await this.db.insert(components).values(component).returning();
    return result[0];
  }

  async updateComponent(id: number, updates: Partial<InsertComponent>): Promise<Component | undefined> {
    const result = await this.db.update(components).set(updates).where(eq(components.id, id)).returning();
    return result[0];
  }

  async deleteComponent(id: number): Promise<boolean> {
    const result = await this.db.delete(components).where(eq(components.id, id));
    return result.rowCount > 0;
  }

  async searchComponents(query: string): Promise<Component[]> {
    const searchTerm = `%${query}%`;
    return await this.db.select().from(components).where(
      or(
        like(components.name, searchTerm),
        like(components.category, searchTerm),
        like(components.packageSize, searchTerm),
        like(components.notes, searchTerm)
      )
    );
  }
}

export class MemStorage implements IStorage {
  private users: Map<number, User> = new Map();
  private cases: Map<number, Case> = new Map();
  private compartments: Map<number, Compartment> = new Map();
  private components: Map<number, Component> = new Map();
  
  private userIdCounter = 1;
  private caseIdCounter = 1;
  private compartmentIdCounter = 1;
  private componentIdCounter = 1;

  constructor() {
    this.initializeDefaultData();
  }

  private initializeDefaultData() {
    // Create a default case with BOX-ALL-144 layout
    const defaultCase: Case = {
      id: this.caseIdCounter++,
      name: "Main Resistors",
      model: "BOX-ALL-144",
      description: "Primary resistor storage case",
      isActive: true,
    };
    this.cases.set(defaultCase.id, defaultCase);

    // Create compartments for BOX-ALL-144 (6 rows × 12 columns)
    for (let row = 1; row <= 6; row++) {
      for (let col = 1; col <= 12; col++) {
        const position = String.fromCharCode(64 + row) + col; // A1, A2, B1, etc.
        const compartment: Compartment = {
          id: this.compartmentIdCounter++,
          caseId: defaultCase.id,
          position,
          row,
          col,
          layer: "top",
        };
        this.compartments.set(compartment.id, compartment);
      }
    }
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const user: User = { ...insertUser, id: this.userIdCounter++ };
    this.users.set(user.id, user);
    return user;
  }

  // Case methods
  async getCases(): Promise<Case[]> {
    return Array.from(this.cases.values()).filter(case_ => case_.isActive);
  }

  async getCase(id: number): Promise<Case | undefined> {
    return this.cases.get(id);
  }

  async getCaseWithCompartments(id: number): Promise<CaseWithCompartments | undefined> {
    const case_ = this.cases.get(id);
    if (!case_) return undefined;

    const caseCompartments = Array.from(this.compartments.values())
      .filter(comp => comp.caseId === id)
      .map(comp => {
        const component = Array.from(this.components.values())
          .find(c => c.compartmentId === comp.id);
        return { ...comp, component };
      });

    return { ...case_, compartments: caseCompartments };
  }

  async createCase(insertCase: InsertCase): Promise<Case> {
    const case_: Case = { 
      ...insertCase, 
      id: this.caseIdCounter++,
      isActive: true,
      description: insertCase.description || null
    };
    this.cases.set(case_.id, case_);

    // Create compartments based on model
    this.createCompartmentsForCase(case_);

    return case_;
  }

  private createCompartmentsForCase(case_: Case) {
    console.log(`Creating compartments for case ${case_.name}: ${case_.rows}x${case_.cols}, hasBottom: ${case_.hasBottom}`);

    let createdCount = 0;

    // Create top layer compartments
    for (let row = 1; row <= case_.rows; row++) {
      for (let col = 1; col <= case_.cols; col++) {
        const position = String.fromCharCode(64 + row) + col;
        const compartment: Compartment = {
          id: this.compartmentIdCounter++,
          caseId: case_.id,
          position,
          row,
          col,
          layer: "top",
        };
        this.compartments.set(compartment.id, compartment);
        createdCount++;
      }
    }

    // Create bottom layer compartments if hasBottom is true
    if (case_.hasBottom) {
      for (let row = 1; row <= case_.rows; row++) {
        for (let col = 1; col <= case_.cols; col++) {
          const position = String.fromCharCode(64 + row) + col;
          const compartment: Compartment = {
            id: this.compartmentIdCounter++,
            caseId: case_.id,
            position,
            row,
            col,
            layer: "bottom",
          };
          this.compartments.set(compartment.id, compartment);
          createdCount++;
        }
      }
    }
    
    console.log(`Created ${createdCount} compartments for case ${case_.name}`);
  }

  async updateCase(id: number, updates: Partial<InsertCase>): Promise<Case | undefined> {
    const case_ = this.cases.get(id);
    if (!case_) return undefined;

    const updatedCase = { ...case_, ...updates };
    this.cases.set(id, updatedCase);
    return updatedCase;
  }

  async deleteCase(id: number): Promise<boolean> {
    const case_ = this.cases.get(id);
    if (!case_) return false;

    // Soft delete
    const updatedCase = { ...case_, isActive: false };
    this.cases.set(id, updatedCase);
    return true;
  }

  // Compartment methods
  async getCompartmentsByCase(caseId: number): Promise<Compartment[]> {
    return Array.from(this.compartments.values())
      .filter(comp => comp.caseId === caseId);
  }

  async getCompartment(id: number): Promise<Compartment | undefined> {
    return this.compartments.get(id);
  }

  async createCompartment(insertCompartment: InsertCompartment): Promise<Compartment> {
    const compartment: Compartment = { 
      ...insertCompartment, 
      id: this.compartmentIdCounter++,
      layer: insertCompartment.layer || "top"
    };
    this.compartments.set(compartment.id, compartment);
    return compartment;
  }

  // Component methods
  async getComponents(): Promise<Component[]> {
    return Array.from(this.components.values());
  }

  async getComponent(id: number): Promise<Component | undefined> {
    return this.components.get(id);
  }

  async getComponentByCompartment(compartmentId: number): Promise<Component | undefined> {
    return Array.from(this.components.values())
      .find(comp => comp.compartmentId === compartmentId);
  }

  async createComponent(insertComponent: InsertComponent): Promise<Component> {
    const component: Component = { 
      ...insertComponent, 
      id: this.componentIdCounter++,
      packageSize: insertComponent.packageSize || null,
      quantity: insertComponent.quantity || 0,
      minQuantity: insertComponent.minQuantity || null,
      datasheetUrl: insertComponent.datasheetUrl || null,
      photoUrl: insertComponent.photoUrl || null,
      notes: insertComponent.notes || null
    };
    this.components.set(component.id, component);
    return component;
  }

  async updateComponent(id: number, updates: Partial<InsertComponent>): Promise<Component | undefined> {
    const component = this.components.get(id);
    if (!component) return undefined;

    const updatedComponent = { ...component, ...updates };
    this.components.set(id, updatedComponent);
    return updatedComponent;
  }

  async deleteComponent(id: number): Promise<boolean> {
    return this.components.delete(id);
  }

  async searchComponents(query: string): Promise<Component[]> {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.components.values())
      .filter(comp => 
        comp.name.toLowerCase().includes(lowerQuery) ||
        comp.category.toLowerCase().includes(lowerQuery) ||
        (comp.packageSize && comp.packageSize.toLowerCase().includes(lowerQuery)) ||
        (comp.notes && comp.notes.toLowerCase().includes(lowerQuery))
      );
  }
}

// Use memory storage for now to ensure consistent behavior between dev and deployment
export const storage = new MemStorage();
