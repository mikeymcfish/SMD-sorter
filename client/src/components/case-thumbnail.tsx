import { Badge } from "@/components/ui/badge";
import type { CaseWithCompartments, Component } from "@shared/schema";

interface CaseThumbnailProps {
  case_: CaseWithCompartments;
  matchingComponents: Component[];
  onClick: () => void;
}

export default function CaseThumbnail({ case_, matchingComponents, onClick }: CaseThumbnailProps) {
  const getCaseLayout = (model: string) => {
    const layouts: Record<string, { rows: number; cols: number; description: string; isMixed?: boolean; isTall?: boolean }> = {
      "LAYOUT-12x6-BOTH": { 
        rows: 6, 
        cols: 12, 
        description: "12×6 Both Layers"
      },
      "LAYOUT-6x4-TOP": { 
        rows: 4, 
        cols: 6, 
        description: "6×4 Top + 12×6 Bottom", 
        isMixed: true
      },
      "LAYOUT-6x4-BOTH": { 
        rows: 4, 
        cols: 6, 
        description: "6×4 Both Layers", 
        isTall: true
      },
      "BOX-ALL-144": { rows: 6, cols: 12, description: "Legacy 144" },
      "BOX-ALL-96": { rows: 6, cols: 12, description: "Legacy 96" },
      "BOX-ALL-48": { rows: 4, cols: 6, description: "Legacy 48" },
      "BOX-ALL-24": { rows: 2, cols: 6, description: "Legacy 24" },
      "LAYOUT-MIXED": { rows: 4, cols: 6, description: "Mixed Layout", isMixed: true }
    };
    return layouts[model] || layouts["LAYOUT-12x6-BOTH"];
  };

  const layout = getCaseLayout(case_.model);
  
  // Get matching compartment IDs
  const matchingCompartmentIds = new Set(matchingComponents.map(comp => comp.compartmentId));
  
  // Create a grid representation
  const topLayerCompartments = case_.compartments.filter(comp => comp.layer === 'top');
  const bottomLayerCompartments = case_.compartments.filter(comp => comp.layer === 'bottom');
  
  const renderLayer = (compartments: any[], layerName: string, gridRows: number, gridCols: number) => {
    if (compartments.length === 0) return null;
    
    // Create grid matrix
    const grid = Array(gridRows).fill(null).map(() => Array(gridCols).fill(null));
    
    // Fill grid with compartments
    compartments.forEach(comp => {
      if (comp.row <= gridRows && comp.col <= gridCols) {
        grid[comp.row - 1][comp.col - 1] = comp;
      }
    });
    
    return (
      <div className="space-y-1">
        <h4 className="text-xs font-medium text-gray-600 capitalize">{layerName}</h4>
        <div 
          className="grid gap-0.5"
          style={{ 
            gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
            gridTemplateRows: `repeat(${gridRows}, 1fr)`
          }}
        >
          {grid.map((row, rowIndex) =>
            row.map((compartment, colIndex) => {
              const isMatching = compartment && matchingCompartmentIds.has(compartment.id);
              const hasComponent = compartment?.component;
              
              return (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  className={`
                    w-3 h-3 border rounded-sm relative
                    ${isMatching ? 'bg-yellow-400 border-yellow-600 shadow-lg ring-2 ring-yellow-300 ring-opacity-50' : 
                      hasComponent ? 'bg-blue-200 border-blue-300' : 
                      'bg-gray-50 border-gray-200'}
                  `}
                  title={compartment ? `${compartment.position}${hasComponent ? ` - ${compartment.component?.name}` : ''}` : ''}
                >
                  {isMatching && (
                    <div className="absolute inset-0 bg-yellow-400 animate-pulse rounded-sm opacity-60"></div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  const topLayout = layout.isMixed ? { rows: layout.rows, cols: layout.cols } : layout;
  const bottomLayout = layout.isMixed ? { rows: 6, cols: 12 } : layout;

  return (
    <div 
      onClick={onClick}
      className="bg-white rounded-lg border border-gray-200 p-4 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-gray-900">{case_.name}</h3>
          <p className="text-sm text-gray-600">{layout.description}</p>
        </div>
        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
          {matchingComponents.length} match{matchingComponents.length !== 1 ? 'es' : ''}
        </Badge>
      </div>
      
      <div className="space-y-3">
        {renderLayer(topLayerCompartments, 'top', topLayout.rows, topLayout.cols)}
        {bottomLayerCompartments.length > 0 && 
          renderLayer(bottomLayerCompartments, 'bottom', bottomLayout.rows, bottomLayout.cols)
        }
      </div>
      
      <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
        <span>{case_.compartments.filter(c => c.component).length} filled</span>
        <span>{case_.compartments.length} total</span>
      </div>
    </div>
  );
}