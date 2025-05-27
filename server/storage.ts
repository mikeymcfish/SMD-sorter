import {
  users,
  cases,
  compartments,
  components,
  type User,
  type InsertUser,
  type Case,
  type InsertCase,
  type Compartment,
  type InsertCompartment,
  type Component,
  type InsertComponent,
  type CaseWithCompartments,
} from "@shared/schema";
import { db } from "./db";
import { eq, like, or, inArray } from "drizzle-orm";

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

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getCases(): Promise<Case[]> {
    return await db.select().from(cases);
  }

  async getCase(id: number): Promise<Case | undefined> {
    const [case_] = await db.select().from(cases).where(eq(cases.id, id));
    return case_ || undefined;
  }

  async getCaseWithCompartments(id: number): Promise<CaseWithCompartments | undefined> {
    const [case_] = await db.select().from(cases).where(eq(cases.id, id));
    if (!case_) return undefined;

    const caseCompartments = await db.select().from(compartments).where(eq(compartments.caseId, id));
    const caseComponents = await db.select().from(components);

    const compartmentsWithComponents = caseCompartments.map(compartment => {
      const component = caseComponents.find(c => c.compartmentId === compartment.id);
      return { ...compartment, component };
    });

    return { ...case_, compartments: compartmentsWithComponents };
  }

  async createCase(insertCase: InsertCase): Promise<Case> {
    const [case_] = await db
      .insert(cases)
      .values(insertCase)
      .returning();
    
    // Create compartments for the case
    await this.createCompartmentsForCase(case_);
    
    return case_;
  }

  private async createCompartmentsForCase(case_: Case) {
    const layouts: any = {
      "BOX-ALL-144": { rows: 12, cols: 12, layers: [{ name: "top" }] },
      "LAYOUT-6x4-BOTH": { rows: 4, cols: 6, layers: [{ name: "top" }, { name: "bottom" }] },
      "LAYOUT-6x4-TOP": { rows: 4, cols: 6, layers: [{ name: "top" }] },
      "LAYOUT-12x6-BOTH": { rows: 6, cols: 12, layers: [{ name: "top" }, { name: "bottom" }] },
      "LAYOUT-12x6-TOP": { rows: 6, cols: 12, layers: [{ name: "top" }] },
      "LAYOUT-18x10-BOTH": { rows: 10, cols: 18, layers: [{ name: "top" }, { name: "bottom" }] },
    };
    
    const layout = layouts[case_.model];
    if (!layout) return;

    const compartmentsToCreate = [];
    
    for (const layer of layout.layers) {
      const totalCompartments = layout.rows * layout.cols;
      for (let i = 0; i < totalCompartments; i++) {
        const row = Math.floor(i / layout.cols) + 1;
        const col = (i % layout.cols) + 1;
        const position = `${String.fromCharCode(64 + row)}${col}`;
        
        compartmentsToCreate.push({
          caseId: case_.id,
          position,
          row,
          col,
          layer: layer.name,
        });
      }
    }

    if (compartmentsToCreate.length > 0) {
      await db.insert(compartments).values(compartmentsToCreate);
    }
  }

  async updateCase(id: number, updates: Partial<InsertCase>): Promise<Case | undefined> {
    const [case_] = await db
      .update(cases)
      .set(updates)
      .where(eq(cases.id, id))
      .returning();
    return case_ || undefined;
  }

  async deleteCase(id: number): Promise<boolean> {
    // Delete related data first
    const compartmentIds = await db.select({ id: compartments.id }).from(compartments).where(eq(compartments.caseId, id));
    if (compartmentIds.length > 0) {
      await db.delete(components).where(inArray(components.compartmentId, compartmentIds.map(c => c.id)));
    }
    await db.delete(compartments).where(eq(compartments.caseId, id));
    
    const result = await db.delete(cases).where(eq(cases.id, id));
    return (result.rowCount || 0) > 0;
  }

  async getCompartmentsByCase(caseId: number): Promise<Compartment[]> {
    return await db.select().from(compartments).where(eq(compartments.caseId, caseId));
  }

  async getCompartment(id: number): Promise<Compartment | undefined> {
    const [compartment] = await db.select().from(compartments).where(eq(compartments.id, id));
    return compartment || undefined;
  }

  async createCompartment(insertCompartment: InsertCompartment): Promise<Compartment> {
    const [compartment] = await db
      .insert(compartments)
      .values(insertCompartment)
      .returning();
    return compartment;
  }

  async getComponents(): Promise<Component[]> {
    return await db.select().from(components);
  }

  async getComponent(id: number): Promise<Component | undefined> {
    const [component] = await db.select().from(components).where(eq(components.id, id));
    return component || undefined;
  }

  async getComponentByCompartment(compartmentId: number): Promise<Component | undefined> {
    const [component] = await db.select().from(components).where(eq(components.compartmentId, compartmentId));
    return component || undefined;
  }

  async createComponent(insertComponent: InsertComponent): Promise<Component> {
    const [component] = await db
      .insert(components)
      .values(insertComponent)
      .returning();
    return component;
  }

  async updateComponent(id: number, updates: Partial<InsertComponent>): Promise<Component | undefined> {
    const [component] = await db
      .update(components)
      .set(updates)
      .where(eq(components.id, id))
      .returning();
    return component || undefined;
  }

  async deleteComponent(id: number): Promise<boolean> {
    const result = await db.delete(components).where(eq(components.id, id));
    return (result.rowCount || 0) > 0;
  }

  async searchComponents(query: string): Promise<Component[]> {
    const searchTerm = `%${query}%`;
    return await db.select().from(components).where(
      or(
        like(components.name, searchTerm),
        like(components.category, searchTerm),
        like(components.packageSize, searchTerm),
        like(components.notes, searchTerm)
      )
    );
  }
}

export const storage = new DatabaseStorage();