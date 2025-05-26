import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Upload, Palette, Save, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getIconForCategory } from "@/components/electronic-icons";
import { queryClient } from "@/lib/queryClient";

interface Category {
  id?: number;
  value: string;
  label: string;
  color: string;
  iconSvg?: string;
}

export default function Categories() {
  const { toast } = useToast();
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [newCategory, setNewCategory] = useState<Category>({
    value: "",
    label: "",
    color: "#6B7280"
  });

  // Fetch categories from backend
  const { data: categories = [], isLoading } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  // Save category mutation
  const saveCategory = useMutation({
    mutationFn: async (category: Category) => {
      const method = category.id ? 'PATCH' : 'POST';
      const url = category.id ? `/api/categories/${category.id}` : '/api/categories';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(category)
      });
      
      if (!response.ok) throw new Error('Failed to save category');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      setEditingCategory(null);
      setNewCategory({ value: "", label: "", color: "#6B7280" });
      toast({
        title: "Success",
        description: "Category saved successfully"
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save category",
        variant: "destructive"
      });
    }
  });

  // Delete category mutation
  const deleteCategory = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/categories/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete category');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      toast({
        title: "Success",
        description: "Category deleted successfully"
      });
    }
  });

  const handleFileUpload = async (file: File, category: Category) => {
    if (!file.type.includes('svg')) {
      toast({
        title: "Invalid file",
        description: "Please upload an SVG file",
        variant: "destructive"
      });
      return;
    }

    const text = await file.text();
    const updatedCategory = { ...category, iconSvg: text };
    
    if (editingCategory) {
      setEditingCategory(updatedCategory);
    } else {
      setNewCategory(updatedCategory);
    }

    toast({
      title: "Icon uploaded",
      description: "SVG icon uploaded successfully"
    });
  };

  const renderCategoryIcon = (category: Category) => {
    if (category.iconSvg) {
      return (
        <div 
          className="w-8 h-8"
          dangerouslySetInnerHTML={{ __html: category.iconSvg }}
        />
      );
    }
    
    const DefaultIcon = getIconForCategory(category.value);
    return <DefaultIcon className="w-8 h-8" />;
  };

  if (isLoading) {
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
            <h1 className="text-2xl font-bold">Loading...</h1>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Component Categories</h1>
              <p className="text-gray-600">Customize colors and icons for component categories</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Existing Categories */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Existing Categories</h2>
            
            {categories.map((category) => (
              <Card key={category.id || category.value}>
                <CardContent className="p-4">
                  {editingCategory?.id === category.id ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor="edit-value">Value</Label>
                          <Input
                            id="edit-value"
                            value={editingCategory.value}
                            onChange={(e) => setEditingCategory({
                              ...editingCategory,
                              value: e.target.value
                            })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="edit-label">Label</Label>
                          <Input
                            id="edit-label"
                            value={editingCategory.label}
                            onChange={(e) => setEditingCategory({
                              ...editingCategory,
                              label: e.target.value
                            })}
                          />
                        </div>
                      </div>
                      
                      <div>
                        <Label htmlFor="edit-color">Color</Label>
                        <div className="flex items-center space-x-2">
                          <Input
                            id="edit-color"
                            type="color"
                            value={editingCategory.color}
                            onChange={(e) => setEditingCategory({
                              ...editingCategory,
                              color: e.target.value
                            })}
                            className="w-16 h-10"
                          />
                          <Input
                            value={editingCategory.color}
                            onChange={(e) => setEditingCategory({
                              ...editingCategory,
                              color: e.target.value
                            })}
                            placeholder="#6B7280"
                            className="flex-1"
                          />
                        </div>
                      </div>

                      <div>
                        <Label>Custom Icon (SVG)</Label>
                        <div className="flex items-center space-x-2 mt-1">
                          <input
                            type="file"
                            accept=".svg"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleFileUpload(file, editingCategory);
                            }}
                            className="hidden"
                            id={`upload-edit-${category.id}`}
                          />
                          <label htmlFor={`upload-edit-${category.id}`}>
                            <Button variant="outline" size="sm" asChild>
                              <span className="cursor-pointer">
                                <Upload className="h-4 w-4 mr-2" />
                                Upload SVG
                              </span>
                            </Button>
                          </label>
                          <div className="flex items-center space-x-2">
                            {renderCategoryIcon(editingCategory)}
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingCategory(null)}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => saveCategory.mutate(editingCategory)}
                          disabled={saveCategory.isPending}
                        >
                          <Save className="h-4 w-4 mr-2" />
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div style={{ color: category.color }}>
                          {renderCategoryIcon(category)}
                        </div>
                        <div>
                          <div className="font-medium">{category.label}</div>
                          <div className="text-sm text-gray-500">{category.value}</div>
                        </div>
                        <Badge 
                          style={{ 
                            backgroundColor: `${category.color}20`,
                            color: category.color,
                            borderColor: category.color
                          }}
                        >
                          {category.color}
                        </Badge>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingCategory(category)}
                        >
                          <Palette className="h-4 w-4" />
                        </Button>
                        {category.id && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteCategory.mutate(category.id!)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Add New Category */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Plus className="h-5 w-5" />
                  <span>Add New Category</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="new-value">Value</Label>
                    <Input
                      id="new-value"
                      value={newCategory.value}
                      onChange={(e) => setNewCategory({
                        ...newCategory,
                        value: e.target.value
                      })}
                      placeholder="e.g. resistor"
                    />
                  </div>
                  <div>
                    <Label htmlFor="new-label">Label</Label>
                    <Input
                      id="new-label"
                      value={newCategory.label}
                      onChange={(e) => setNewCategory({
                        ...newCategory,
                        label: e.target.value
                      })}
                      placeholder="e.g. Resistor"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="new-color">Color</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="new-color"
                      type="color"
                      value={newCategory.color}
                      onChange={(e) => setNewCategory({
                        ...newCategory,
                        color: e.target.value
                      })}
                      className="w-16 h-10"
                    />
                    <Input
                      value={newCategory.color}
                      onChange={(e) => setNewCategory({
                        ...newCategory,
                        color: e.target.value
                      })}
                      placeholder="#6B7280"
                      className="flex-1"
                    />
                  </div>
                </div>

                <div>
                  <Label>Custom Icon (SVG)</Label>
                  <div className="flex items-center space-x-2 mt-1">
                    <input
                      type="file"
                      accept=".svg"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file, newCategory);
                      }}
                      className="hidden"
                      id="upload-new"
                    />
                    <label htmlFor="upload-new">
                      <Button variant="outline" size="sm" asChild>
                        <span className="cursor-pointer">
                          <Upload className="h-4 w-4 mr-2" />
                          Upload SVG
                        </span>
                      </Button>
                    </label>
                    <div className="flex items-center space-x-2">
                      {renderCategoryIcon(newCategory)}
                    </div>
                  </div>
                </div>

                <Button
                  className="w-full"
                  onClick={() => saveCategory.mutate(newCategory)}
                  disabled={!newCategory.value || !newCategory.label || saveCategory.isPending}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Category
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}