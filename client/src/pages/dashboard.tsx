import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Download, Plus, HelpCircle } from "lucide-react";
import Sidebar from "@/components/sidebar";
import CaseGrid from "@/components/case-grid";
import EditComponentDialog from "@/components/edit-component-dialog";
import AddCaseDialog from "@/components/add-case-dialog";
import ImportGuideDialog from "@/components/import-guide-dialog";
import FilterDropdown from "@/components/filter-dropdown";
import type { CaseWithCompartments, Component, Compartment, Case } from "@shared/schema";

export default function Dashboard() {
  const [selectedCaseId, setSelectedCaseId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingComponent, setEditingComponent] = useState<{
    component?: Component;
    compartment: Compartment;
  } | null>(null);
  const [showAddCase, setShowAddCase] = useState(false);
  const [showImportGuide, setShowImportGuide] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [, setLocation] = useLocation();

  // Fetch all cases
  const { data: cases = [] } = useQuery<Case[]>({
    queryKey: ["/api/cases"],
  });

  // Auto-select first case if none selected
  useEffect(() => {
    if (cases.length > 0 && selectedCaseId === null) {
      setSelectedCaseId(cases[0].id);
    }
  }, [cases, selectedCaseId]);

  // Fetch selected case with compartments
  const { data: selectedCase, isLoading } = useQuery<CaseWithCompartments>({
    queryKey: ["/api/cases", selectedCaseId],
    queryFn: async () => {
      if (!selectedCaseId) return null;
      const response = await fetch(`/api/cases/${selectedCaseId}`);
      if (!response.ok) throw new Error('Failed to fetch case');
      return response.json();
    },
    enabled: !!selectedCaseId,
    retry: 3,
  });

  // Search components
  const { data: searchResults = [] } = useQuery<Component[]>({
    queryKey: ["/api/components/search", { q: searchQuery }],
    enabled: searchQuery.length > 2,
  });

  const handleCompartmentClick = (compartment: Compartment, component?: Component) => {
    setEditingComponent({ compartment, component });
  };

  const handleCaseSelect = (caseId: number) => {
    console.log('Case selected:', caseId);
    console.log('Current selectedCase:', selectedCase);
    console.log('IsLoading:', isLoading);
    setSelectedCaseId(caseId);
  };

  const exportData = async () => {
    try {
      const casesResponse = await fetch('/api/cases');
      const allCases = await casesResponse.json();
      
      const componentsResponse = await fetch('/api/components');
      const allComponents = await componentsResponse.json();
      
      // Get all cases with their compartments for proper import mapping
      const casesWithCompartments = [];
      for (const case_ of allCases) {
        const caseResponse = await fetch(`/api/cases/${case_.id}`);
        const caseWithCompartments = await caseResponse.json();
        casesWithCompartments.push(caseWithCompartments);
      }
      
      // Transform cases to match import format expectations
      const transformedCases = casesWithCompartments.map(case_ => ({
        ...case_,
        // Convert model string to rows/cols structure for import compatibility
        rows: case_.model?.includes('12x6') ? 6 : 4,
        cols: case_.model?.includes('12x6') ? 12 : 6,
        hasBottom: case_.model?.includes('BOTH') || false,
        // Remove components from compartments to avoid duplication - they're in the separate components array
        compartments: case_.compartments?.map(comp => ({
          id: comp.id,
          caseId: comp.caseId,
          position: comp.position,
          row: comp.row,
          col: comp.col,
          layer: comp.layer
        })) || []
      }));

      const exportData = {
        cases: transformedCases,
        components: allComponents,
        exportDate: new Date().toISOString(),
        version: "1.0"
      };
      
      console.log('Export data:', exportData);
      console.log('Components being exported:', allComponents.length);
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `smd-components-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const clearAllData = async () => {
    if (confirm('Are you sure you want to delete ALL cases and components? This cannot be undone.')) {
      try {
        // Delete all components first
        const componentsResponse = await fetch('/api/components');
        const allComponents = await componentsResponse.json();
        for (const component of allComponents) {
          await fetch(`/api/components/${component.id}`, { method: 'DELETE' });
        }
        
        // Delete all cases including the default one
        const casesResponse = await fetch('/api/cases');
        const allCases = await casesResponse.json();
        for (const case_ of allCases) {
          await fetch(`/api/cases/${case_.id}`, { method: 'DELETE' });
        }
        
        alert('All data cleared successfully!');
        window.location.reload();
      } catch (error) {
        console.error('Clear failed:', error);
        alert('Failed to clear data.');
      }
    }
  };

  const importData = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        
        console.log('Import data received:', data);
        console.log('Cases in data:', data.cases?.length || 0);
        console.log('Components in data:', data.components?.length || 0);
        
        // Validate data structure - cases are required, components are optional
        if (!data.cases) {
          alert('Invalid file format. No cases found in export file.');
          return;
        }
        
        // Ask user about overwrite preference
        const shouldOverwrite = confirm(
          'Would you like to overwrite existing data?\n\n' +
          'OK = Replace existing cases and components\n' +
          'Cancel = Add as new (imported) items'
        );
        
        // Create compartment ID mapping that will be used in both branches
        const compartmentIdMapping = new Map();
        
        if (shouldOverwrite) {
          // Clear existing data first
          const componentsResponse = await fetch('/api/components');
          const existingComponents = await componentsResponse.json();
          for (const component of existingComponents) {
            await fetch(`/api/components/${component.id}`, { method: 'DELETE' });
          }
          
          const casesResponse = await fetch('/api/cases');
          const existingCases = await casesResponse.json();
          for (const case_ of existingCases) {
            await fetch(`/api/cases/${case_.id}`, { method: 'DELETE' });
          }
          
          // Import cases and create mapping of old to new compartment IDs
          
          for (const caseData of data.cases) {
            const caseResponse = await fetch('/api/cases', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: caseData.name,
                rows: parseInt(caseData.model.split('-')[1]) || 6,
                cols: parseInt(caseData.model.split('-')[2]) || 4,
                hasBottom: caseData.model.includes('BOTH'),
                description: caseData.description || '',
                isActive: true
              })
            });
            
            if (caseResponse.ok) {
              const newCase = await caseResponse.json();
              // Get the new compartments for this case
              const compartmentsResponse = await fetch(`/api/cases/${newCase.id}`);
              const caseWithCompartments = await compartmentsResponse.json();
              
              // Map old compartment IDs to new ones based on position and layer
              console.log(`Processing case ${caseData.name} (old ID: ${caseData.id}, new ID: ${newCase.id})`);
              console.log(`- Old compartments: ${caseData.compartments?.length || 0}`);
              console.log(`- New compartments: ${caseWithCompartments.compartments.length}`);
              
              caseWithCompartments.compartments.forEach((newComp: any) => {
                // Find the matching old compartment by position and layer
                const oldCompartment = caseData.compartments?.find((oldComp: any) => 
                  oldComp.position === newComp.position && oldComp.layer === newComp.layer
                );
                
                if (oldCompartment) {
                  compartmentIdMapping.set(oldCompartment.id, newComp.id);
                  console.log(`Mapped: ${oldCompartment.id} -> ${newComp.id} (${newComp.position}/${newComp.layer})`);
                }
              });
            }
          }
        } else {
          // Import as new items
          
          for (const caseData of data.cases) {
            const caseResponse = await fetch('/api/cases', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: `${caseData.name} (imported)`,
                model: caseData.model,
                description: caseData.description
              })
            });
            
            if (caseResponse.ok) {
              const newCase = await caseResponse.json();
              const compartmentsResponse = await fetch(`/api/cases/${newCase.id}`);
              const caseWithCompartments = await compartmentsResponse.json();
              
              caseWithCompartments.compartments.forEach((newComp: any) => {
                // Find the matching old compartment by position and layer
                const oldCompartment = caseData.compartments?.find((oldComp: any) => 
                  oldComp.position === newComp.position && oldComp.layer === newComp.layer
                );
                
                if (oldCompartment) {
                  compartmentIdMapping.set(oldCompartment.id, newComp.id);
                }
              });
            }
          }
        }
        
        // Import components using the new compartment IDs
        console.log('Starting component import. Total components:', data.components?.length || 0);
        console.log('Compartment ID mapping size:', compartmentIdMapping.size);
        
        for (const componentData of data.components || []) {
          const newCompartmentId = compartmentIdMapping.get(componentData.compartmentId);
          console.log(`Component ${componentData.name}: old compartmentId ${componentData.compartmentId} -> new compartmentId ${newCompartmentId}`);
          
          if (newCompartmentId) {
            const response = await fetch('/api/components', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: componentData.name,
                compartmentId: newCompartmentId,
                categoryId: 1, // Default category for imported components
                quantity: componentData.quantity || 1,
                minQuantity: componentData.minQuantity || 5,
                datasheetUrl: componentData.datasheetUrl || null,
                photoUrl: componentData.photoUrl || null,
                notes: componentData.notes || null
              })
            });
            console.log(`Component ${componentData.name} import result:`, response.ok);
          } else {
            console.log(`No mapping found for compartment ID ${componentData.compartmentId}`);
          }
        }
        
        alert('Import completed successfully!');
        window.location.reload(); // Refresh to show imported data
      } catch (error) {
        console.error('Import failed:', error);
        alert('Import failed. Please check the file format.');
      }
    };
    input.click();
  };

  const getStockStatus = (quantity: number, minQuantity: number = 5) => {
    if (quantity === 0) return "empty";
    if (quantity <= minQuantity / 2) return "critical";
    if (quantity <= minQuantity) return "low";
    return "good";
  };

  const getStockColor = (status: string) => {
    switch (status) {
      case "good": return "bg-green-50 border-green-300";
      case "low": return "bg-yellow-50 border-yellow-300";
      case "critical": return "bg-red-50 border-red-300";
      default: return "bg-gray-50 border-dashed border-gray-300";
    }
  };

  const calculateStats = () => {
    if (!selectedCase || !selectedCase.compartments) return { totalComponents: 0, totalQuantity: 0, lowStock: 0, emptySlots: 0 };

    const components = selectedCase.compartments
      .map(c => c.component)
      .filter(Boolean) as Component[];

    return {
      totalComponents: components.length,
      totalQuantity: components.reduce((sum, c) => sum + c.quantity, 0),
      lowStock: components.filter(c => c.quantity <= (c.minQuantity || 5)).length,
      emptySlots: selectedCase.compartments.filter(c => !c.component).length,
    };
  };

  const stats = calculateStats();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar
        cases={cases}
        selectedCaseId={selectedCaseId}
        onCaseSelect={handleCaseSelect}
        onAddCase={() => setShowAddCase(true)}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h2 className="text-2xl font-semibold text-gray-900">
                {selectedCase?.name || "Select a Case"}
              </h2>
              {selectedCase && (
                <>
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                    {selectedCase.model}
                  </span>
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full flex items-center">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                    {selectedCase.compartments ? Math.round(((selectedCase.compartments.length - stats.emptySlots) / selectedCase.compartments.length) * 100) : 0}% Full
                  </span>
                </>
              )}
            </div>

            <div className="flex items-center space-x-4">
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Search components..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && searchQuery.trim()) {
                      setLocation(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
                    }
                  }}
                  className="w-80 pl-10"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              </div>
              <FilterDropdown
                selectedCategories={selectedCategories}
                onCategoriesChange={setSelectedCategories}
              />
              <Button variant="ghost" size="sm" onClick={importData} title="Import Data">
                <Plus className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowImportGuide(true)} title="Import Guide">
                <HelpCircle className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={exportData} title="Export Data">
                <Download className="h-4 w-4" />
              </Button>
              <Button variant="destructive" size="sm" onClick={clearAllData} title="Clear All Data (DEBUG)">
                Clear All
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-6 overflow-auto">
          {selectedCase && selectedCase.compartments ? (
            <>
              <CaseGrid
                case_={selectedCase}
                onCompartmentClick={handleCompartmentClick}
                searchQuery={searchQuery}
              />

              {/* Quick Stats */}
              <div className="mt-6 grid grid-cols-4 gap-4">
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Components</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.totalComponents}</p>
                    </div>
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <i className="fas fa-microchip text-blue-600"></i>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Quantity</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.totalQuantity}</p>
                    </div>
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <i className="fas fa-boxes text-green-600"></i>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Low Stock</p>
                      <p className="text-2xl font-bold text-orange-600">{stats.lowStock}</p>
                    </div>
                    <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                      <i className="fas fa-exclamation-triangle text-orange-600"></i>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Empty Slots</p>
                      <p className="text-2xl font-bold text-gray-500">{stats.emptySlots}</p>
                    </div>
                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                      <Plus className="h-4 w-4 text-gray-600" />
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Case Selected</h3>
                <p className="text-gray-500">Select a case from the sidebar to begin managing components</p>
              </div>
            </div>
          )}
        </main>
      </div>



      {/* Dialogs */}
      <EditComponentDialog
        isOpen={!!editingComponent}
        onClose={() => setEditingComponent(null)}
        compartment={editingComponent?.compartment}
        component={editingComponent?.component}
        onSuccess={() => setEditingComponent(null)}
      />

      <AddCaseDialog
        isOpen={showAddCase}
        onClose={() => setShowAddCase(false)}
        onSuccess={() => setShowAddCase(false)}
      />

      <ImportGuideDialog
        isOpen={showImportGuide}
        onClose={() => setShowImportGuide(false)}
      />
    </div>
  );
}
