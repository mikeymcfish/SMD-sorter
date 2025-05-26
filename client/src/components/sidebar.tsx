import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Plus, Search, BarChart3, Tags, Grid3X3 } from "lucide-react";
import type { Case } from "@shared/schema";

interface SidebarProps {
  cases: Case[];
  selectedCaseId: number | null;
  onCaseSelect: (id: number) => void;
  onAddCase: () => void;
}

export default function Sidebar({ cases, selectedCaseId, onCaseSelect, onAddCase }: SidebarProps) {
  const getStatusColor = (isActive: boolean) => {
    return isActive ? "bg-green-500" : "bg-gray-400";
  };

  return (
    <div className="w-64 bg-white shadow-lg border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <i className="fas fa-microchip text-white text-sm"></i>
          </div>
          <h1 className="text-xl font-semibold text-gray-900">SMD Manager</h1>
        </div>
      </div>

      {/* Cases List */}
      <nav className="flex-1 p-4">
        <div className="mt-8">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">My Cases</h3>
          <div className="space-y-1">
            {cases.map((case_) => (
              <button
                key={case_.id}
                onClick={() => onCaseSelect(case_.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                  selectedCaseId === case_.id
                    ? "bg-blue-50 text-blue-900"
                    : "hover:bg-gray-50 text-gray-700"
                }`}
              >
                <div className="flex items-center space-x-2 min-w-0">
                  <div className={`w-2 h-2 rounded-full ${getStatusColor(case_.isActive)}`} />
                  <span className="text-sm font-medium truncate">{case_.name}</span>
                </div>
                <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                  {case_.model.replace("BOX-ALL-", "BOX-")}
                </span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Add Case Button */}
      <div className="p-4 border-t border-gray-200">
        <Button 
          onClick={onAddCase}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium flex items-center justify-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Add New Case</span>
        </Button>
      </div>
    </div>
  );
}
