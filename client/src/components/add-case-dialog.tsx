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
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const caseSchema = z.object({
  name: z.string().min(1, "Case name is required"),
  topLayoutType: z.string().min(1, "Top layout is required"),
  bottomLayoutType: z.string().min(1, "Bottom layout is required"),
  description: z.string().optional(),
});

type CaseFormData = z.infer<typeof caseSchema>;

const LAYOUT_OPTIONS = [
  { value: "uniform", label: "Uniform (6×4 squares)" },
  { value: "large", label: "Large (12×6 squares)" },
  { value: "mixed", label: "Mixed (rows 1-2 long, rows 3-4 tall)" },
];

interface AddCaseDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddCaseDialog({ isOpen, onClose, onSuccess }: AddCaseDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<CaseFormData>({
    resolver: zodResolver(caseSchema),
    defaultValues: {
      name: "",
      topLayoutType: "",
      bottomLayoutType: "",
      description: "",
    },
  });

  const createCaseMutation = useMutation({
    mutationFn: async (data: CaseFormData) => {
      const response = await apiRequest("POST", "/api/cases", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
      toast({ title: "Case created successfully" });
      form.reset();
      onSuccess();
    },
    onError: () => {
      toast({ title: "Failed to create case", variant: "destructive" });
    },
  });

  const onSubmit = (data: CaseFormData) => {
    createCaseMutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Case</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Case Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Main Resistors" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="topLayoutType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Top Layer Layout</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select top layer layout" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {LAYOUT_OPTIONS.map((layout) => (
                        <SelectItem key={layout.value} value={layout.value}>
                          {layout.label}
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
              name="bottomLayoutType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bottom Layer Layout</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select bottom layer layout" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {LAYOUT_OPTIONS.map((layout) => (
                        <SelectItem key={layout.value} value={layout.value}>
                          {layout.label}
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
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Optional description..." {...field} />
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
              <Button 
                type="submit" 
                className="flex-1"
                disabled={createCaseMutation.isPending}
              >
                {createCaseMutation.isPending ? "Creating..." : "Create Case"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
