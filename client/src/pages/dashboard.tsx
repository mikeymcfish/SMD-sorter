import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Filter, Download, Plus } from "lucide-react";
import Sidebar from "@/components/sidebar";
import CaseGrid from "@/components/case-grid";
import EditComponentDialog from "@/components/edit-component-dialog";
import AddCaseDialog from "@/components/add-case-dialog";
import type { CaseWithCompartments, Component, Compartment, Case } from "@shared/schema";

export default function Dashboard() {
  const [selectedCaseId, setSelectedCaseId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingComponent, setEditingComponent] = useState<{
    component?: Component;
    compartment: Compartment;
  } | null>(null);
  const [showAddCase, setShowAddCase] = useState(false);
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
      
      const exportData = {
        cases: allCases,
        components: allComponents,
        exportDate: new Date().toISOString(),
        version: "1.0"
      };
      
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
        
        // Validate data structure
        if (!data.cases || !data.components) {
          alert('Invalid file format. Please select a valid export file.');
          return;
        }
        
        // Ask user about overwrite preference
        const shouldOverwrite = confirm(
          'Would you like to overwrite existing data?\n\n' +
          'OK = Replace existing cases and components\n' +
          'Cancel = Add as new (imported) items'
        );
        
        if (shouldOverwrite) {
          // Clear existing data (keeping the default case if it exists)
          const response = await fetch('/api/cases');
          const existingCases = await response.json();
          
          // Import cases with original names
          for (const caseData of data.cases) {
            await fetch('/api/cases', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: caseData.name,
                model: caseData.model,
                description: caseData.description
              })
            });
          }
        } else {
          // Import as new items
          for (const caseData of data.cases) {
            await fetch('/api/cases', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: `${caseData.name} (imported)`,
                model: caseData.model,
                description: caseData.description
              })
            });
          }
        }
        
        // Import components
        for (const componentData of data.components) {
          await fetch('/api/components', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(componentData)
          });
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
              <Button variant="ghost" size="sm">
                <Filter className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={importData} title="Import Data">
                <Plus className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={exportData} title="Export Data">
                <Download className="h-4 w-4" />
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
    </div>
  );
}
