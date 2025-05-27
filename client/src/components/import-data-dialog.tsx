import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ImportDataDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ImportDataDialog({ isOpen, onClose, onSuccess }: ImportDataDialogProps) {
  const [jsonData, setJsonData] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const importMutation = useMutation({
    mutationFn: async (data: any) => {
      // Import cases and create compartment mapping
      const results = [];
      const { cases: importCases } = data;
      
      if (!importCases || !Array.isArray(importCases)) {
        throw new Error("Invalid import data format");
      }

      for (const importCase of importCases) {
        // Create the case
        const caseResponse = await fetch('/api/cases', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: importCase.name,
            model: importCase.model,
            description: importCase.description || null
          })
        });
        
        if (!caseResponse.ok) {
          throw new Error(`Failed to create case ${importCase.name}`);
        }
        
        const newCase = await caseResponse.json();
        
        // Get the newly created compartments
        const compartmentsResponse = await fetch(`/api/cases/${newCase.id}`);
        const caseWithCompartments = await compartmentsResponse.json();
        
        // Create a mapping from position+layer to compartment ID
        const compartmentMap = new Map();
        caseWithCompartments.compartments.forEach((comp: any) => {
          const key = `${comp.position}-${comp.layer}`;
          compartmentMap.set(key, comp.id);
        });

        // Import components
        let componentsCreated = 0;
        for (const importCompartment of importCase.compartments || []) {
          if (importCompartment.component) {
            const key = `${importCompartment.position}-${importCompartment.layer}`;
            const newCompartmentId = compartmentMap.get(key);
            
            if (newCompartmentId) {
              const componentResponse = await fetch('/api/components', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  compartmentId: newCompartmentId,
                  name: importCompartment.component.name,
                  category: importCompartment.component.category,
                  packageSize: importCompartment.component.packageSize || null,
                  quantity: importCompartment.component.quantity || 0,
                  minQuantity: importCompartment.component.minQuantity || 5,
                  notes: importCompartment.component.notes || null,
                  datasheetUrl: importCompartment.component.datasheetUrl || null,
                  photoUrl: importCompartment.component.photoUrl || null
                })
              });
              
              if (componentResponse.ok) {
                componentsCreated++;
              }
            }
          }
        }

        results.push({
          case: newCase,
          componentsCreated
        });
      }

      return {
        results,
        successCount: results.length,
        totalComponents: results.reduce((sum, r) => sum + r.componentsCreated, 0)
      };
    },
    onSuccess: (result: any) => {
      toast({
        title: "Import Successful",
        description: `Imported ${result.successCount} cases with ${result.totalComponents} components`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/components"] });
      onSuccess();
      onClose();
      setJsonData("");
    },
    onError: (error: any) => {
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import data",
        variant: "destructive",
      });
    },
  });

  const handleImport = () => {
    try {
      const parsedData = JSON.parse(jsonData);
      importMutation.mutate(parsedData);
    } catch (error) {
      toast({
        title: "Invalid JSON",
        description: "Please check your JSON format and try again",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Import Component Data</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label htmlFor="json-data" className="block text-sm font-medium mb-2">
              Paste your JSON data here:
            </label>
            <Textarea
              id="json-data"
              placeholder="Paste your exported component data here..."
              value={jsonData}
              onChange={(e) => setJsonData(e.target.value)}
              className="min-h-[300px] font-mono text-sm"
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleImport}
              disabled={!jsonData.trim() || importMutation.isPending}
            >
              {importMutation.isPending ? "Importing..." : "Import Data"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}