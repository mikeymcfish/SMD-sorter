import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Minus, Plus, Upload, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { COMPONENT_CATEGORIES, PACKAGE_SIZES } from "@/lib/constants";
import type { Component, Compartment } from "@shared/schema";

const componentSchema = z.object({
  name: z.string().min(1, "Component name is required"),
  category: z.string().min(1, "Category is required"),
  packageSize: z.string().optional(),
  quantity: z.number().min(0, "Quantity must be positive"),
  minQuantity: z.number().min(1, "Minimum quantity must be at least 1").default(5),
  notes: z.string().optional(),
});

type ComponentFormData = z.infer<typeof componentSchema>;

interface EditComponentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  compartment?: Compartment;
  component?: Component;
  onSuccess: () => void;
}

export default function EditComponentDialog({
  isOpen,
  onClose,
  compartment,
  component,
  onSuccess,
}: EditComponentDialogProps) {
  const [datasheetFile, setDatasheetFile] = useState<File | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<ComponentFormData>({
    resolver: zodResolver(componentSchema),
    defaultValues: {
      name: "",
      category: "",
      packageSize: "",
      quantity: 0,
      minQuantity: 5,
      notes: "",
    },
  });

  useEffect(() => {
    if (component) {
      form.reset({
        name: component.name,
        category: component.category,
        packageSize: component.packageSize || "",
        quantity: component.quantity,
        minQuantity: component.minQuantity || 5,
        notes: component.notes || "",
      });
    } else {
      form.reset({
        name: "",
        category: "",
        packageSize: "",
        quantity: 0,
        minQuantity: 5,
        notes: "",
      });
    }
  }, [component, form]);

  const createComponentMutation = useMutation({
    mutationFn: async (data: ComponentFormData & { compartmentId: number; datasheetUrl?: string; photoUrl?: string }) => {
      const response = await apiRequest("POST", "/api/components", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
      toast({ title: "Component created successfully" });
      onSuccess();
    },
    onError: () => {
      toast({ title: "Failed to create component", variant: "destructive" });
    },
  });

  const updateComponentMutation = useMutation({
    mutationFn: async (data: Partial<ComponentFormData> & { datasheetUrl?: string; photoUrl?: string }) => {
      const response = await apiRequest("PATCH", `/api/components/${component!.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
      toast({ title: "Component updated successfully" });
      onSuccess();
    },
    onError: () => {
      toast({ title: "Failed to update component", variant: "destructive" });
    },
  });

  const deleteComponentMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", `/api/components/${component!.id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
      toast({ title: "Component deleted successfully" });
      onSuccess();
    },
    onError: () => {
      toast({ title: "Failed to delete component", variant: "destructive" });
    },
  });

  const uploadFile = async (file: File, type: "datasheet" | "photo") => {
    const formData = new FormData();
    formData.append(type, file);

    const response = await apiRequest("POST", `/api/upload/${type}`, formData);
    const result = await response.json();
    return result.url;
  };

  const onSubmit = async (data: ComponentFormData) => {
    if (!compartment) return;

    setUploading(true);
    try {
      let datasheetUrl = component?.datasheetUrl;
      let photoUrl = component?.photoUrl;

      if (datasheetFile) {
        datasheetUrl = await uploadFile(datasheetFile, "datasheet");
      }

      if (photoFile) {
        photoUrl = await uploadFile(photoFile, "photo");
      }

      if (component) {
        updateComponentMutation.mutate({ ...data, datasheetUrl, photoUrl });
      } else {
        createComponentMutation.mutate({
          ...data,
          compartmentId: compartment.id,
          datasheetUrl,
          photoUrl,
        });
      }
    } catch (error) {
      toast({ title: "Failed to upload files", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const adjustQuantity = (delta: number) => {
    const currentQuantity = form.getValues("quantity");
    const newQuantity = Math.max(0, currentQuantity + delta);
    form.setValue("quantity", newQuantity);
  };

  const handleFileChange = (file: File | null, type: "datasheet" | "photo") => {
    if (type === "datasheet") {
      setDatasheetFile(file);
    } else {
      setPhotoFile(file);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {component ? "Edit" : "Add"} Component - 
            <span className="font-mono text-blue-600 ml-1">{compartment?.position}</span>
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Component Name/Value</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., 10kΩ Resistor" {...field} autoComplete="off" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {COMPONENT_CATEGORIES.map((category) => (
                        <SelectItem key={category.value} value={category.value}>
                          <div className="flex items-center space-x-2">
                            <div 
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: category.color }}
                            />
                            <span>{category.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="packageSize"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Package/Size</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select package size" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PACKAGE_SIZES.map((size) => (
                        <SelectItem key={size} value={size}>
                          {size}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantity</FormLabel>
                  <FormControl>
                    <div className="flex items-center space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => adjustQuantity(-1)}
                        className="w-8 h-8 p-0"
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        className="text-center"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => adjustQuantity(1)}
                        className="w-8 h-8 p-0"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="minQuantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Minimum Quantity</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 5)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* File Uploads */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Datasheet</label>
                <div className="border-2 border-dashed border-gray-300 rounded-md p-3 text-center hover:border-blue-400 cursor-pointer transition-colors duration-200">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => handleFileChange(e.target.files?.[0] || null, "datasheet")}
                    className="hidden"
                    id="datasheet-upload"
                  />
                  <label htmlFor="datasheet-upload" className="cursor-pointer">
                    <Upload className="mx-auto h-4 w-4 text-gray-400 mb-1" />
                    <p className="text-xs text-gray-500">
                      {datasheetFile ? datasheetFile.name : "Drop PDF or click"}
                    </p>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Photo</label>
                <div className="border-2 border-dashed border-gray-300 rounded-md p-3 text-center hover:border-blue-400 cursor-pointer transition-colors duration-200">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e.target.files?.[0] || null, "photo")}
                    className="hidden"
                    id="photo-upload"
                  />
                  <label htmlFor="photo-upload" className="cursor-pointer">
                    <Upload className="mx-auto h-4 w-4 text-gray-400 mb-1" />
                    <p className="text-xs text-gray-500">
                      {photoFile ? photoFile.name : "Drop image or click"}
                    </p>
                  </label>
                </div>
              </div>
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Optional notes..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              {component && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => deleteComponentMutation.mutate()}
                  disabled={deleteComponentMutation.isPending}
                >
                  Delete
                </Button>
              )}
              <Button 
                type="submit" 
                className="flex-1"
                disabled={createComponentMutation.isPending || updateComponentMutation.isPending || uploading}
              >
                {uploading ? "Uploading..." : component ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
