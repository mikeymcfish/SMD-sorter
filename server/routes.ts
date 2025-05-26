import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertCaseSchema, insertComponentSchema } from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";

const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Ensure uploads directory exists
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Serve uploaded files
  app.use('/uploads', express.static('uploads'));

  // Get all cases
  app.get("/api/cases", async (req, res) => {
    try {
      const cases = await storage.getCases();
      res.json(cases);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch cases" });
    }
  });

  // Get case with compartments and components
  app.get("/api/cases/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const case_ = await storage.getCaseWithCompartments(id);
      
      if (!case_) {
        return res.status(404).json({ message: "Case not found" });
      }
      
      res.json(case_);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch case" });
    }
  });

  // Create new case
  app.post("/api/cases", async (req, res) => {
    try {
      // Create a schema that accepts the new dual-layout format
      const newCaseSchema = z.object({
        name: z.string().min(1),
        topLayoutType: z.string().min(1),
        bottomLayoutType: z.string().min(1),
        description: z.string().optional(),
      });
      
      const validatedData = newCaseSchema.parse(req.body);
      const case_ = await storage.createCase(validatedData);
      res.status(201).json(case_);
    } catch (error) {
      console.error('Case creation error:', error);
      res.status(400).json({ message: "Invalid case data" });
    }
  });

  // Update case
  app.patch("/api/cases/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = insertCaseSchema.partial().parse(req.body);
      const case_ = await storage.updateCase(id, updates);
      
      if (!case_) {
        return res.status(404).json({ message: "Case not found" });
      }
      
      res.json(case_);
    } catch (error) {
      res.status(400).json({ message: "Invalid update data" });
    }
  });

  // Delete case
  app.delete("/api/cases/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteCase(id);
      
      if (!success) {
        return res.status(404).json({ message: "Case not found" });
      }
      
      res.json({ message: "Case deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete case" });
    }
  });

  // Get all components
  app.get("/api/components", async (req, res) => {
    try {
      const components = await storage.getComponents();
      res.json(components);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch components" });
    }
  });

  // Search components
  app.get("/api/components/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query) {
        return res.status(400).json({ message: "Search query is required" });
      }
      
      const components = await storage.searchComponents(query);
      res.json(components);
    } catch (error) {
      res.status(500).json({ message: "Failed to search components" });
    }
  });

  // Create component
  app.post("/api/components", async (req, res) => {
    try {
      const validatedData = insertComponentSchema.parse(req.body);
      const component = await storage.createComponent(validatedData);
      res.status(201).json(component);
    } catch (error) {
      res.status(400).json({ message: "Invalid component data" });
    }
  });

  // Update component
  app.patch("/api/components/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = insertComponentSchema.partial().parse(req.body);
      const component = await storage.updateComponent(id, updates);
      
      if (!component) {
        return res.status(404).json({ message: "Component not found" });
      }
      
      res.json(component);
    } catch (error) {
      res.status(400).json({ message: "Invalid update data" });
    }
  });

  // Delete component
  app.delete("/api/components/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteComponent(id);
      
      if (!success) {
        return res.status(404).json({ message: "Component not found" });
      }
      
      res.json({ message: "Component deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete component" });
    }
  });

  // Upload datasheet
  app.post("/api/upload/datasheet", upload.single('datasheet'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      const fileUrl = `/uploads/${req.file.filename}`;
      res.json({ url: fileUrl });
    } catch (error) {
      res.status(500).json({ message: "Failed to upload file" });
    }
  });

  // Upload photo
  app.post("/api/upload/photo", upload.single('photo'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      const fileUrl = `/uploads/${req.file.filename}`;
      res.json({ url: fileUrl });
    } catch (error) {
      res.status(500).json({ message: "Failed to upload file" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
