import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const cases = pgTable("cases", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  topLayoutType: text("top_layout_type").notNull(), // "uniform" or "mixed"
  bottomLayoutType: text("bottom_layout_type").notNull(), // "uniform" or "mixed"
  description: text("description"),
  isActive: boolean("is_active").default(true),
});

export const compartments = pgTable("compartments", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id").notNull().references(() => cases.id),
  position: text("position").notNull(), // A1, A2, B1, etc.
  row: integer("row").notNull(),
  col: integer("col").notNull(),
  layer: text("layer").notNull().default("top"), // top or bottom
});

export const components = pgTable("components", {
  id: serial("id").primaryKey(),
  compartmentId: integer("compartment_id").notNull().references(() => compartments.id),
  name: text("name").notNull(),
  category: text("category").notNull(),
  packageSize: text("package_size"),
  quantity: integer("quantity").notNull().default(0),
  minQuantity: integer("min_quantity").default(5),
  datasheetUrl: text("datasheet_url"),
  photoUrl: text("photo_url"),
  notes: text("notes"),
});

export const insertCaseSchema = createInsertSchema(cases).omit({
  id: true,
  isActive: true,
});

export const insertCompartmentSchema = createInsertSchema(compartments).omit({
  id: true,
});

export const insertComponentSchema = createInsertSchema(components).omit({
  id: true,
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertCase = z.infer<typeof insertCaseSchema>;
export type InsertCompartment = z.infer<typeof insertCompartmentSchema>;
export type InsertComponent = z.infer<typeof insertComponentSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Case = typeof cases.$inferSelect;
export type Compartment = typeof compartments.$inferSelect;
export type Component = typeof components.$inferSelect;
export type User = typeof users.$inferSelect;

export type CaseWithCompartments = Case & {
  compartments: (Compartment & { component?: Component })[];
};
