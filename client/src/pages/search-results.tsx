import { useQuery } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { ArrowLeft, MapPin, Grid3X3, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import CaseThumbnail from "@/components/case-thumbnail";
import type { Component, CaseWithCompartments } from "@shared/schema";

export default function SearchResults() {
  const [location] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const query = searchParams.get('q') || '';
  const [viewMode, setViewMode] = useState<'thumbnail' | 'list'>('thumbnail');

  const { data: components = [], isLoading: componentsLoading } = useQuery({
    queryKey: ["/api/components/search", query],
    queryFn: () => fetch(`/api/components/search?q=${encodeURIComponent(query)}`).then(res => res.json()),
    enabled: !!query
  });

  const { data: casesData = [] } = useQuery({
    queryKey: ["/api/cases"],
  });

  // Fetch detailed case data with compartments
  const { data: casesWithCompartments = [] } = useQuery<CaseWithCompartments[]>({
    queryKey: ["/api/cases/detailed", casesData.map((c: any) => c.id)],
    queryFn: async () => {
      if (!casesData.length) return [];
      const promises = casesData.map((case_: any) => 
        fetch(`/api/cases/${case_.id}`).then(res => res.json())
      );
      return Promise.all(promises);
    },
    enabled: casesData.length > 0
  });

  // Group components by case
  const componentsByCase = components.reduce((acc: Record<number, Component[]>, component: Component) => {
    const case_ = casesWithCompartments.find(c => 
      c.compartments.some(comp => comp.id === component.compartmentId)
    );
    if (case_) {
      if (!acc[case_.id]) acc[case_.id] = [];
      acc[case_.id].push(component);
    }
    return acc;
  }, {});

  const getComponentCase = (compartmentId: number) => {
    return casesWithCompartments.find(case_ => 
      case_.compartments?.some((comp: any) => comp.id === compartmentId)
    ) || null;
  };

  const getCompartmentPosition = (compartmentId: number) => {
    for (const case_ of casesWithCompartments) {
      const compartment = case_.compartments?.find((comp: any) => comp.id === compartmentId);
      if (compartment) {
        return { position: compartment.position, layer: compartment.layer };
      }
    }
    return null;
  };

  if (componentsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center space-x-4 mb-6">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">Searching...</h1>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Search Results for "{query}"</h1>
              <p className="text-gray-600">
                Found {components.length} components in {Object.keys(componentsByCase).length} cases
              </p>
            </div>
          </div>
          
          {components.length > 0 && (
            <div className="flex items-center space-x-2">
              <Button
                variant={viewMode === 'thumbnail' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('thumbnail')}
              >
                <Grid3X3 className="h-4 w-4 mr-2" />
                Thumbnail
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4 mr-2" />
                List
              </Button>
            </div>
          )}
        </div>

        {components.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <p className="text-gray-500">No components found matching your search.</p>
          </div>
        ) : viewMode === 'thumbnail' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(componentsByCase).map(([caseId, caseComponents]) => {
              const case_ = casesWithCompartments.find(c => c.id === parseInt(caseId));
              if (!case_) return null;
              
              return (
                <CaseThumbnail
                  key={caseId}
                  case_={case_}
                  matchingComponents={caseComponents}
                  onClick={() => window.location.href = `/?case=${caseId}&search=${encodeURIComponent(query)}`}
                />
              );
            })}
          </div>
        ) : (
          <div className="grid gap-4">
            {components.map((component: Component) => {
              const case_ = getComponentCase(component.compartmentId);
              const compartmentInfo = getCompartmentPosition(component.compartmentId);
              
              return (
                <div key={component.id} className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {component.name}
                        </h3>
                        <Badge variant="secondary">{component.category}</Badge>
                      </div>
                      
                      <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Package:</span>
                          <p className="font-medium">{component.packageSize || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Quantity:</span>
                          <p className={`font-medium ${
                            component.quantity <= (component.minQuantity || 5) / 2 ? 'text-red-600' :
                            component.quantity <= (component.minQuantity || 5) ? 'text-orange-600' : 
                            'text-green-600'
                          }`}>
                            {component.quantity}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-500">Min Stock:</span>
                          <p className="font-medium">{component.minQuantity}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Notes:</span>
                          <p className="font-medium">{component.notes || 'None'}</p>
                        </div>
                      </div>
                    </div>
                    
                    {case_ && compartmentInfo && (
                      <div className="ml-6 text-right">
                        <div className="flex items-center text-gray-600 mb-2">
                          <MapPin className="h-4 w-4 mr-1" />
                          <span className="text-sm">Location</span>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3 min-w-[120px]">
                          <p className="font-medium text-gray-900">{case_.name}</p>
                          <p className="text-sm text-gray-600">
                            {compartmentInfo.position} ({compartmentInfo.layer})
                          </p>
                          <p className="text-xs text-gray-500 mt-1">{case_.model}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}