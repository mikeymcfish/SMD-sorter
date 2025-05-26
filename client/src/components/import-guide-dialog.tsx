import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Copy, Download, FileText, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ImportGuideDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ImportGuideDialog({ isOpen, onClose }: ImportGuideDialogProps) {
  const { toast } = useToast();

  const exampleData = {
    cases: [
      {
        name: "Main Resistors",
        model: "LAYOUT-12x6-BOTH",
        description: "Primary resistor storage case",
        isActive: true
      },
      {
        name: "Small Components", 
        model: "LAYOUT-6x4-TOP",
        description: "Mixed small parts",
        isActive: true
      }
    ],
    components: [
      {
        caseName: "Main Resistors",
        position: "A1",
        layer: "top",
        name: "10kΩ Resistor",
        category: "resistor",
        packageSize: "0805",
        quantity: 100,
        minQuantity: 25,
        notes: "High precision 1%"
      },
      {
        caseName: "Small Components",
        position: "B3", 
        layer: "bottom",
        name: "BC547 Transistor",
        category: "transistor",
        packageSize: "TO-92",
        quantity: 50,
        minQuantity: 10,
        notes: "NPN general purpose"
      }
    ]
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "Example data copied successfully"
    });
  };

  const downloadTemplate = () => {
    const blob = new Blob([JSON.stringify(exampleData, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'smd-components-template.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Template downloaded",
      description: "Import template saved as smd-components-template.json"
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Import Guide</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Overview */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Info className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-900">Import Format</h3>
                <p className="text-blue-700 text-sm mt-1">
                  Import your component data using JSON format. The system will automatically create cases and compartments based on your data.
                </p>
              </div>
            </div>
          </div>

          {/* Case Structure */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Case Properties</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-900">Required Fields</h4>
                  <ul className="mt-2 space-y-1 text-sm">
                    <li><Badge variant="outline">name</Badge> - Case identifier</li>
                    <li><Badge variant="outline">model</Badge> - Layout type</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Optional Fields</h4>
                  <ul className="mt-2 space-y-1 text-sm">
                    <li><Badge variant="secondary">description</Badge> - Case description</li>
                    <li><Badge variant="secondary">isActive</Badge> - Active status (default: true)</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Available Models */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Available Case Models</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-white border rounded-lg p-3">
                <Badge className="mb-2">LAYOUT-12x6-BOTH</Badge>
                <p className="text-sm text-gray-600">12×6 grid on both layers (144 compartments)</p>
              </div>
              <div className="bg-white border rounded-lg p-3">
                <Badge className="mb-2">LAYOUT-6x4-TOP</Badge>
                <p className="text-sm text-gray-600">6×4 top + 12×6 bottom (96 compartments)</p>
              </div>
              <div className="bg-white border rounded-lg p-3">
                <Badge className="mb-2">LAYOUT-6x4-BOTH</Badge>
                <p className="text-sm text-gray-600">6×4 grid on both layers (48 compartments)</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Component Structure */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Component Properties</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-900">Required Fields</h4>
                  <ul className="mt-2 space-y-1 text-sm">
                    <li><Badge variant="outline">caseName</Badge> - Reference to case</li>
                    <li><Badge variant="outline">position</Badge> - Grid position (A1, B3, etc.)</li>
                    <li><Badge variant="outline">layer</Badge> - "top" or "bottom"</li>
                    <li><Badge variant="outline">name</Badge> - Component name</li>
                    <li><Badge variant="outline">category</Badge> - Component type</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Optional Fields</h4>
                  <ul className="mt-2 space-y-1 text-sm">
                    <li><Badge variant="secondary">packageSize</Badge> - Physical package</li>
                    <li><Badge variant="secondary">quantity</Badge> - Stock count</li>
                    <li><Badge variant="secondary">minQuantity</Badge> - Reorder threshold</li>
                    <li><Badge variant="secondary">notes</Badge> - Additional info</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Component Categories */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Component Categories</h3>
            <div className="flex flex-wrap gap-2">
              {[
                "resistor", "capacitor", "inductor", "transistor", "diode", 
                "ic", "crystal", "connector", "switch", "led", "sensor", "other"
              ].map(category => (
                <Badge key={category} variant="outline" className="text-xs">
                  {category}
                </Badge>
              ))}
            </div>
          </div>

          <Separator />

          {/* Example Data */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Example Import Data</h3>
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => copyToClipboard(JSON.stringify(exampleData, null, 2))}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={downloadTemplate}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Template
                </Button>
              </div>
            </div>
            
            <div className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto">
              <pre className="text-sm">
                {JSON.stringify(exampleData, null, 2)}
              </pre>
            </div>
          </div>

          {/* Tips */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h4 className="font-semibold text-amber-900 mb-2">💡 Import Tips</h4>
            <ul className="text-amber-800 text-sm space-y-1">
              <li>• Cases will be created automatically if they don't exist</li>
              <li>• Position format: Letter + Number (A1, B12, F3, etc.)</li>
              <li>• Components will overwrite existing ones in the same position</li>
              <li>• Invalid positions for the case model will be skipped</li>
              <li>• Missing required fields will cause the component to be skipped</li>
            </ul>
          </div>

          <div className="flex justify-end">
            <Button onClick={onClose}>
              Got it!
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}