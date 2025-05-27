import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  color: text("color").default("#6366f1"), // Hex color for UI
  iconName: text("icon_name").default("other"), // Icon identifier
});

export const cases = pgTable("cases", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  rows: integer("rows").notNull(),
  cols: integer("cols").notNull(),
  hasBottom: boolean("has_bottom").default(false),
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
  categoryId: integer("category_id").notNull().references(() => categories.id),
  quantity: integer("quantity").notNull().default(0),
  minQuantity: integer("min_quantity").default(5),
  datasheetUrl: text("datasheet_url"),
  photoUrl: text("photo_url"),
  notes: text("notes"),
});

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
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

export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type InsertCase = z.infer<typeof insertCaseSchema>;
export type InsertCompartment = z.infer<typeof insertCompartmentSchema>;
export type InsertComponent = z.infer<typeof insertComponentSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Category = typeof categories.$inferSelect;
export type Case = typeof cases.$inferSelect;
export type Compartment = typeof compartments.$inferSelect;
export type Component = typeof components.$inferSelect;
export type User = typeof users.$inferSelect;

export type CaseWithCompartments = Case & {
  compartments: (Compartment & { component?: Component })[];
};
