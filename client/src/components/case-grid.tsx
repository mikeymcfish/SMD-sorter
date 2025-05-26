import { useState } from "react";
import { Button } from "@/components/ui/button";
import CompartmentCell from "./compartment-cell";
import type { CaseWithCompartments, Compartment, Component } from "@shared/schema";

interface CaseGridProps {
  case_: CaseWithCompartments;
  onCompartmentClick: (compartment: Compartment, component?: Component) => void;
  searchQuery?: string;
}

export default function CaseGrid({ case_, onCompartmentClick, searchQuery = "" }: CaseGridProps) {
  const [activeLayer, setActiveLayer] = useState<"top" | "bottom">("top");

  const getCaseLayout = (model: string) => {
    const layouts: Record<string, { rows: number; cols: number; description: string }> = {
      "BOX-ALL-144": { 
        rows: 6, 
        cols: 12, 
        description: "8.7\" × 5.7\" × 1.5\" | 144 Compartments | 12×6 Grid (Top & Bottom)"
      },
      "BOX-ALL-96": { 
        rows: 6, 
        cols: 12, 
        description: "8.7\" × 5.7\" × 1.5\" | 96 Compartments | Mixed layout"
      },
      "BOX-ALL-48": { 
        rows: 4, 
        cols: 6, 
        description: "8.7\" × 5.7\" × 1.5\" | 48 Compartments | 6×4 Grid"
      },
      "BOX-ALL-24": { 
        rows: 2, 
        cols: 6, 
        description: "9\" × 6\" × 2.5\" | 24 Compartments | Mixed sizes"
      },
    };
    return layouts[model] || layouts["BOX-ALL-144"];
  };

  const layout = getCaseLayout(case_.model);
  const filteredCompartments = case_.compartments.filter(comp => comp.layer === activeLayer);

  // Filter compartments based on search query
  const searchFilteredCompartments = searchQuery
    ? filteredCompartments.filter(comp => {
        if (!comp.component) return false;
        const component = comp.component;
        return (
          component.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          component.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (component.packageSize && component.packageSize.toLowerCase().includes(searchQuery.toLowerCase()))
        );
      })
    : filteredCompartments;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
      {/* Case Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="text-sm text-gray-500">
          {layout.description}
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant={activeLayer === "top" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveLayer("top")}
          >
            Top Layer
          </Button>
          <Button
            variant={activeLayer === "bottom" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveLayer("bottom")}
          >
            Bottom Layer
          </Button>
        </div>
      </div>

      {/* Grid */}
      <div 
        className={`grid gap-1 max-w-4xl mx-auto`}
        style={{ 
          gridTemplateColumns: `repeat(${layout.cols}, minmax(0, 1fr))` 
        }}
      >
        {Array.from({ length: layout.rows }, (_, rowIndex) =>
          Array.from({ length: layout.cols }, (_, colIndex) => {
            const position = String.fromCharCode(65 + rowIndex) + (colIndex + 1); // A1, A2, B1, etc.
            const compartment = searchQuery 
              ? searchFilteredCompartments.find(c => c.position === position)
              : filteredCompartments.find(c => c.position === position);
            
            // If searching and compartment doesn't match, show dimmed version
            const isHighlighted = !searchQuery || (compartment && searchFilteredCompartments.includes(compartment));
            
            return (
              <CompartmentCell
                key={`${activeLayer}-${position}`}
                compartment={compartment}
                position={position}
                onClick={() => compartment && onCompartmentClick(compartment, compartment.component)}
                isHighlighted={isHighlighted}
              />
            );
          })
        )}
      </div>

      {/* Legend */}
      <div className="mt-6 flex items-center justify-center space-x-6 text-sm">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-green-50 border-2 border-green-300 rounded"></div>
          <span className="text-gray-600">In Stock (10+)</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-yellow-50 border-2 border-yellow-300 rounded"></div>
          <span className="text-gray-600">Low Stock (5-9)</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-red-50 border-2 border-red-300 rounded"></div>
          <span className="text-gray-600">Critical (1-4)</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-gray-50 border-2 border-dashed border-gray-300 rounded"></div>
          <span className="text-gray-600">Empty</span>
        </div>
      </div>
    </div>
  );
}
