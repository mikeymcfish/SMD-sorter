import { 
  users, cases, compartments, components,
  type User, type InsertUser,
  type Case, type InsertCase,
  type Compartment, type InsertCompartment,
  type Component, type InsertComponent,
  type CaseWithCompartments
} from "@shared/schema";

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
    // Create a default case with dual-layout structure
    const defaultCase: Case = {
      id: this.caseIdCounter++,
      name: "Main Resistors",
      topLayoutType: "uniform",
      bottomLayoutType: "uniform", 
      description: "Primary resistor storage case",
      isActive: true,
    };
    this.cases.set(defaultCase.id, defaultCase);

    // Create compartments for default case (4 rows × 6 columns, both layers)
    for (const layer of ["top", "bottom"]) {
      for (let row = 1; row <= 4; row++) {
        for (let col = 1; col <= 6; col++) {
          const position = String.fromCharCode(64 + row) + col; // A1, A2, B1, etc.
          const compartment: Compartment = {
            id: this.compartmentIdCounter++,
            caseId: defaultCase.id,
            position,
            row,
            col,
            layer,
          };
          this.compartments.set(compartment.id, compartment);
        }
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
    // Determine dimensions based on layout types
    const getLayoutDimensions = (layoutType: string) => {
      switch (layoutType) {
        case "large": return { rows: 6, cols: 12 };
        case "uniform":
        case "mixed":
        default: return { rows: 4, cols: 6 };
      }
    };

    const topDims = getLayoutDimensions(case_.topLayoutType);
    const bottomDims = getLayoutDimensions(case_.bottomLayoutType);

    // Create top layer compartments
    for (let row = 1; row <= topDims.rows; row++) {
      for (let col = 1; col <= topDims.cols; col++) {
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
      }
    }

    // Create bottom layer compartments
    for (let row = 1; row <= bottomDims.rows; row++) {
      for (let col = 1; col <= bottomDims.cols; col++) {
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
      }
    }
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

export const storage = new MemStorage();
