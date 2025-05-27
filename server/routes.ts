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
      const validatedData = insertCaseSchema.parse(req.body);
      const case_ = await storage.createCase(validatedData);
      res.status(201).json(case_);
    } catch (error) {
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

  // Import legacy data
  app.post("/api/import", async (req, res) => {
    try {
      const { cases: importCases } = req.body;
      
      if (!importCases || !Array.isArray(importCases)) {
        return res.status(400).json({ message: "Invalid import data format" });
      }

      const results = [];

      for (const importCase of importCases) {
        try {
          // Create the case
          const newCase = await storage.createCase({
            name: importCase.name,
            model: importCase.model,
            description: importCase.description || "",
            isActive: importCase.isActive !== false
          });

          // Get the newly created compartments
          const compartments = await storage.getCompartmentsByCase(newCase.id);
          
          // Create a mapping from position+layer to compartment ID
          const compartmentMap = new Map();
          compartments.forEach(comp => {
            const key = `${comp.position}-${comp.layer}`;
            compartmentMap.set(key, comp.id);
          });

          // Import components for compartments that have them
          const componentsCreated = [];
          for (const importCompartment of importCase.compartments || []) {
            if (importCompartment.component) {
              const key = `${importCompartment.position}-${importCompartment.layer}`;
              const newCompartmentId = compartmentMap.get(key);
              
              if (newCompartmentId) {
                const component = await storage.createComponent({
                  compartmentId: newCompartmentId,
                  name: importCompartment.component.name,
                  category: importCompartment.component.category,
                  packageSize: importCompartment.component.packageSize || null,
                  quantity: importCompartment.component.quantity || 0,
                  minQuantity: importCompartment.component.minQuantity || 5,
                  notes: importCompartment.component.notes || null,
                  datasheetUrl: importCompartment.component.datasheetUrl || null,
                  photoUrl: importCompartment.component.photoUrl || null
                });
                componentsCreated.push(component);
              }
            }
          }

          results.push({
            case: newCase,
            componentsCreated: componentsCreated.length
          });
        } catch (error) {
          console.error(`Failed to import case ${importCase.name}:`, error);
          results.push({
            error: `Failed to import case ${importCase.name}: ${error.message}`
          });
        }
      }

      res.json({ 
        message: "Import completed", 
        results,
        successCount: results.filter(r => !r.error).length,
        errorCount: results.filter(r => r.error).length
      });
    } catch (error) {
      console.error("Import error:", error);
      res.status(500).json({ message: "Import failed", error: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
