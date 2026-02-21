import { useState } from "react";
import { Flag } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useReportUser } from "@/hooks/use-reports";

export function ReportDialog() {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const { mutate: submitReport, isPending } = useReportUser();

  const handleSubmit = () => {
    if (!reason.trim()) return;
    submitReport({ reason }, {
      onSuccess: () => {
        setOpen(false);
        setReason("");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-red-400 gap-2">
          <Flag className="w-4 h-4" />
          Report Issue
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-zinc-950 border-white/10 text-white">
        <DialogHeader>
          <DialogTitle>Report User</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Please describe the inappropriate behavior. We take all reports seriously.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Textarea
            placeholder="Describe what happened..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="bg-zinc-900 border-zinc-800 text-white resize-none h-32"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} className="border-white/10 hover:bg-white/5 hover:text-white">
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!reason.trim() || isPending}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {isPending ? "Submitting..." : "Submit Report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
