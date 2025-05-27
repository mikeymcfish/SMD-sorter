import { Edit, Plus } from "lucide-react";
import { COMPONENT_CATEGORIES } from "@/lib/constants";
import { getIconForCategory } from "./electronic-icons";
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

  // Get the electronic icon for the component category
  const getCategoryFromId = (categoryId: number) => {
    const categoryMap = {
      1: 'resistor', 2: 'capacitor', 3: 'ic', 4: 'diode', 5: 'transistor',
      6: 'inductor', 7: 'crystal', 8: 'connector', 9: 'led', 10: 'switch',
      11: 'sensor', 12: 'other'
    };
    return categoryMap[categoryId as keyof typeof categoryMap] || 'other';
  };
  
  const componentCategory = component ? getCategoryFromId(component.categoryId) : null;
  const stockStatus = component ? getStockStatus(component.quantity, component.minQuantity) : "empty";
  const opacity = isHighlighted ? "opacity-100" : "opacity-30";
  
  // Use category color as background if component exists
  const backgroundColor = component && componentCategory ? getCategoryColor(componentCategory) : undefined;
  const borderColor = component 
    ? stockStatus === "critical" ? "#DC2626" : 
      stockStatus === "low" ? "#D97706" : "#059669"
    : "#D1D5DB";
    
  const IconComponent = componentCategory ? getIconForCategory(componentCategory) : null;

  return (
    <div
      className={`w-full h-full border-2 rounded-md hover:border-blue-400 cursor-pointer relative group transition-all duration-200 hover:shadow-md ${opacity}`}
      style={{ 
        backgroundColor: backgroundColor ? `${backgroundColor}20` : "#F9FAFB",
        borderColor: borderColor,
        borderStyle: component ? "solid" : "dashed"
      }}
      onClick={onClick}
      title={component ? `${componentCategory} | ${component.notes?.match(/Package: ([^|]+)/)?.[1]?.trim() || 'No package'} | ${component.notes?.replace(/Package: [^|]+\s*\|\s*/, '').replace(/^\s*\|\s*/, '') || 'No notes'}` : 'Empty compartment'}
    >
      {/* Background Electronic Icon */}
      {IconComponent && (
        <div className="absolute inset-0 flex items-center justify-center">
          <IconComponent className="w-8 h-8 text-gray-400 opacity-20" />
        </div>
      )}
      
      <div className="absolute inset-1 flex flex-col justify-center items-center text-xs relative z-10" style={{ left: 0 }}>
        
        {component ? (
          <div className="flex flex-col items-center">
            <div className="font-medium text-[10px] text-gray-700 whitespace-normal break-words">
              {component.name}
            </div>
            {component.notes?.match(/Package: ([^|]+)/)?.[1]?.trim() && (
              <div className="text-[8px] text-gray-500">{component.notes?.match(/Package: ([^|]+)/)?.[1]?.trim()}</div>
            )}
            {/* Quantity shown only on hover */}
            <div 
              className={`text-[8px] font-medium opacity-0 group-hover:opacity-100 transition-opacity ${
                stockStatus === "critical" ? "text-red-600" :
                stockStatus === "low" ? "text-orange-600" : 
                "text-green-600"
              }`}
            >
              {component.quantity}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center">
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
