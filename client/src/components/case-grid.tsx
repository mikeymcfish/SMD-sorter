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

  const getCaseLayout = (model: string) => {
    const layouts: Record<string, { rows: number; cols: number; description: string; isMixed?: boolean; isTall?: boolean }> = {
      "LAYOUT-12x6-BOTH": { 
        rows: 6, 
        cols: 12, 
        description: "12×6 Both Layers (uniform squares)"
      },
      "LAYOUT-6x4-TOP": { 
        rows: 4, 
        cols: 6, 
        description: "6×4 Top + 12×6 Bottom (mixed)", 
        isMixed: true
      },
      "LAYOUT-6x4-BOTH": { 
        rows: 4, 
        cols: 6, 
        description: "6×4 Both Layers (tall rectangles)", 
        isTall: true
      },
      // Legacy support
      "BOX-ALL-144": { rows: 6, cols: 12, description: "Legacy BOX-ALL-144" },
      "BOX-ALL-96": { rows: 6, cols: 12, description: "Legacy BOX-ALL-96" },
      "BOX-ALL-48": { rows: 4, cols: 6, description: "Legacy BOX-ALL-48" },
      "BOX-ALL-24": { rows: 2, cols: 6, description: "Legacy BOX-ALL-24" },
      "LAYOUT-MIXED": { rows: 4, cols: 6, description: "Mixed Layout", isMixed: true }
    };
    return layouts[model] || layouts["LAYOUT-12x6-BOTH"];
  };

  const layout = getCaseLayout(case_.model);
  const topCompartments = case_.compartments.filter(comp => comp.layer === "top");
  const bottomCompartments = case_.compartments.filter(comp => comp.layer === "bottom");

  const renderLayer = (compartments: any[], layerName: string, aspectRatio: string = "square") => {
    // Filter compartments based on search query
    const searchFilteredCompartments = searchQuery
      ? compartments.filter(comp => {
          if (!comp.component) return false;
          const component = comp.component;
          return (
            component.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            component.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (component.packageSize && component.packageSize.toLowerCase().includes(searchQuery.toLowerCase()))
          );
        })
      : compartments;

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-700 flex items-center">
          {layerName}
          {layout.isTall && (
            <span className="ml-2 text-sm text-gray-500">(All tall rectangles)</span>
          )}
          {layout.isMixed && layerName === "Top Layer" && (
            <span className="ml-2 text-sm text-gray-500">(Rows 1-2: Long, Rows 3-4: Tall)</span>
          )}
          {layout.isMixed && layerName === "Bottom Layer" && (
            <span className="ml-2 text-sm text-gray-500">(All square compartments)</span>
          )}
        </h3>
        <div 
          className={`grid gap-1 max-w-4xl mx-auto`}
          style={{ 
            gridTemplateColumns: `repeat(${layout.cols}, minmax(0, 1fr))` 
          }}
        >
          {Array.from({ length: layout.rows }, (_, rowIndex) =>
            Array.from({ length: layout.cols }, (_, colIndex) => {
              const position = String.fromCharCode(65 + rowIndex) + (colIndex + 1);
              const compartment = searchQuery 
                ? searchFilteredCompartments.find(c => c.position === position)
                : compartments.find(c => c.position === position);
              
              const isHighlighted = !searchQuery || (compartment && searchFilteredCompartments.includes(compartment));
              
              // Determine aspect ratio based on layout type and row position
              let cellClass = "";
              if (layout.isTall) {
                // 6x4 Both Layers - all tall rectangles
                cellClass = "aspect-[1/2]";
              } else if (layout.isMixed) {
                // 6x4 Top + 12x6 Bottom - mixed based on layer
                if (layerName === "Top Layer") {
                  // Top layer: first 2 rows long, last 2 rows tall
                  if (rowIndex < 2) {
                    cellClass = "aspect-[2/1]"; // Long rectangles for first 2 rows
                  } else {
                    cellClass = "aspect-[1/2]"; // Tall rectangles for last 2 rows
                  }
                } else {
                  cellClass = "aspect-square"; // Squares for bottom layer
                }
              } else {
                // 12x6 Both Layers - all squares
                cellClass = "aspect-square";
              }
              
              return (
                <div key={`${layerName}-${position}`} className={cellClass}>
                  <CompartmentCell
                    compartment={compartment}
                    position={position}
                    onClick={() => compartment && onCompartmentClick(compartment, compartment.component)}
                    isHighlighted={isHighlighted}
                  />
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 space-y-8">
      {/* Case Header */}
      <div className="text-center">
        <div className="text-sm text-gray-500">
          {layout.description}
        </div>
      </div>

      {/* Top Layer */}
      {renderLayer(topCompartments, "Top Layer")}

      {/* Visual Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-3 bg-white text-gray-500">Case Separator</span>
        </div>
      </div>

      {/* Bottom Layer */}
      {renderLayer(bottomCompartments, "Bottom Layer")}

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
