import { Edit, Plus } from "lucide-react";
import { COMPONENT_CATEGORIES } from "@/lib/constants";
import type { Compartment, Component } from "@shared/schema";

interface CompartmentCellProps {
  compartment?: Compartment;
  position: string;
  onClick: () => void;
  isHighlighted?: boolean;
}

export default function CompartmentCell({ 
  compartment, 
  position, 
  onClick, 
  isHighlighted = true 
}: CompartmentCellProps) {
  const component = compartment?.component;

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

  const getCategoryColor = (category: string) => {
    const categoryInfo = COMPONENT_CATEGORIES.find(cat => cat.value === category);
    return categoryInfo?.color || "#6B7280";
  };

  const stockStatus = component ? getStockStatus(component.quantity, component.minQuantity) : "empty";
  const colorClass = getStockColor(stockStatus);
  const opacity = isHighlighted ? "opacity-100" : "opacity-30";

  return (
    <div
      className={`aspect-square border-2 rounded-md hover:border-blue-400 cursor-pointer relative group transition-all duration-200 hover:shadow-md ${colorClass} ${opacity}`}
      onClick={onClick}
    >
      <div className="absolute inset-1 flex flex-col justify-between text-xs">
        <div className="font-mono text-[10px] text-gray-500">{position}</div>
        
        {component ? (
          <div className="text-center">
            <div 
              className="w-2 h-2 rounded-full mx-auto mb-1"
              style={{ backgroundColor: getCategoryColor(component.category) }}
            />
            <div className="font-medium text-[10px] text-gray-700 truncate">
              {component.name}
            </div>
            {component.packageSize && (
              <div className="text-[8px] text-gray-500">{component.packageSize}</div>
            )}
            <div 
              className={`text-[8px] font-medium ${
                stockStatus === "critical" ? "text-red-600" :
                stockStatus === "low" ? "text-orange-600" : 
                "text-green-600"
              }`}
            >
              {component.quantity}
            </div>
          </div>
        ) : (
          <div className="text-center">
            <div className="text-[10px] text-gray-400">Empty</div>
          </div>
        )}
      </div>

      {/* Quick Edit Overlay */}
      <div className="absolute inset-0 bg-blue-600 bg-opacity-90 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
        {component ? (
          <Edit className="text-white h-3 w-3" />
        ) : (
          <Plus className="text-white h-3 w-3" />
        )}
      </div>
    </div>
  );
}
