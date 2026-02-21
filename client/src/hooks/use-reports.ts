import { useMutation } from "@tanstack/react-query";
import { api, type ReportInput } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

export function useReportUser() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (data: ReportInput) => {
      const res = await fetch(api.reports.create.path, {
        method: api.reports.create.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!res.ok) {
        throw new Error("Failed to submit report");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Report Submitted",
        description: "Thank you for helping keep our community safe.",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to submit report. Please try again.",
      });
    }
  });
}
