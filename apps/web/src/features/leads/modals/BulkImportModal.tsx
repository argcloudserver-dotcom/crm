import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { toast } from "sonner";
import { apiFetch, getListLeadsQueryKey } from "@workspace/api-client";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/shared/utils/utils";

interface BulkImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ImportResult {
  imported: number;
  errors: Array<{ row: number; message: string }>;
}

export function BulkImportModal({ open, onOpenChange }: BulkImportModalProps) {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("No file selected");
      const formData = new FormData();
      formData.append("file", file);
      const res = await apiFetch("/api/leads/bulk", {
        method: "POST",
        body: formData,
      });
      const body = await res.json() as {
        success?: boolean;
        data?: ImportResult;
        error?: { message?: string } | string;
        imported?: number;
        errors?: ImportResult["errors"];
      };
      if (!res.ok || body?.success === false) {
        const msg =
          typeof body?.error === "string"
            ? body.error
            : body?.error?.message ?? "Import failed";
        throw new Error(msg);
      }
      // FIX: API wraps responses in { success, data }. Unwrap and default errors.
      const payload: ImportResult = {
        imported: body?.data?.imported ?? body?.imported ?? 0,
        errors: body?.data?.errors ?? body?.errors ?? [],
      };
      return payload;
    },
    onSuccess: (data) => {
      setResult(data);
      queryClient.invalidateQueries({ queryKey: getListLeadsQueryKey() });
      if (data.imported > 0) {
        toast.success(`${data.imported} leads imported successfully`);
      }
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f && (f.name.endsWith(".xlsx") || f.name.endsWith(".csv"))) {
      setFile(f);
      setResult(null);
    } else {
      toast.error("Please upload an .xlsx or .csv file");
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) { setFile(f); setResult(null); }
  }

  function downloadTemplate() {
    const csv = "Name,Phone,Email,Source,Status,Notes\nJohn Doe,+201012345678,john@example.com,manual,new,Sample lead";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "leads_template.csv";
    a.click(); URL.revokeObjectURL(url);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { setFile(null); setResult(null); } }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
            Bulk Import Leads
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div
            className={cn(
              "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors",
              isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/30"
            )}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
          >
            <input ref={fileRef} type="file" accept=".xlsx,.csv" className="hidden" onChange={handleFileChange} />
            <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            {file
              ? <p className="font-medium text-sm">{file.name}</p>
              : <>
                  <p className="font-medium text-sm">Drop your file here or click to browse</p>
                  <p className="text-xs text-muted-foreground mt-1">Supports .xlsx and .csv</p>
                </>
            }
          </div>

          <Button variant="outline" size="sm" onClick={downloadTemplate} className="w-full gap-2">
            <FileSpreadsheet className="w-4 h-4" /> Download Template
          </Button>

          {result && (() => { const errs = result.errors ?? []; return (
            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-sm font-medium">{result.imported} leads imported</span>
              </div>
              {errs.length > 0 && (
                <div className="space-y-1">
                  {errs.slice(0, 5).map((e) => (
                    <div key={e.row} className="flex items-start gap-2 text-red-600 dark:text-red-400">
                      <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
                      <span className="text-xs">Row {e.row}: {e.message}</span>
                    </div>
                  ))}
                  {errs.length > 5 && (
                    <p className="text-xs text-muted-foreground">...and {errs.length - 5} more errors</p>
                  )}
                </div>
              )}
            </div>
          ); })()}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button onClick={() => mutation.mutate()} disabled={!file || mutation.isPending}>
            {mutation.isPending ? "Importing..." : "Import Leads"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
