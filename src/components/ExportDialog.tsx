import { useState } from "react";
import { Download, FileSpreadsheet, FileText, FileJson, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export type ExportFormat = "csv" | "pdf" | "json";
export type ExportDataType = "projects" | "materials" | "tasks" | "contracts" | "team" | "report";

interface ExportDialogProps {
  dataType: ExportDataType;
  onExport: (format: ExportFormat, options: ExportOptions) => Promise<void>;
  trigger?: React.ReactNode;
  title?: string;
  description?: string;
}

export interface ExportOptions {
  includeMetadata: boolean;
  includeTotals: boolean;
  dateRange?: { from?: Date; to?: Date };
}

const dataTypeLabels: Record<ExportDataType, string> = {
  projects: "Projects",
  materials: "Materials",
  tasks: "Tasks",
  contracts: "Contracts",
  team: "Team Members",
  report: "Full Report",
};

const formatIcons: Record<ExportFormat, React.ReactNode> = {
  csv: <FileSpreadsheet className="h-5 w-5 text-green-600" />,
  pdf: <FileText className="h-5 w-5 text-red-600" />,
  json: <FileJson className="h-5 w-5 text-blue-600" />,
};

export const ExportDialog = ({
  dataType,
  onExport,
  trigger,
  title,
  description,
}: ExportDialogProps) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<ExportFormat>("csv");
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<ExportOptions>({
    includeMetadata: true,
    includeTotals: true,
  });

  const handleExport = async () => {
    setLoading(true);
    try {
      await onExport(format, options);
      toast.success(t("export.success", `${dataTypeLabels[dataType]} exported successfully!`));
      setOpen(false);
    } catch (error: any) {
      console.error("Export error:", error);
      toast.error(error.message || t("export.error", "Export failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            {t("export.button", "Export")}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-amber-500" />
            {title || t("export.title", `Export ${dataTypeLabels[dataType]}`)}
          </DialogTitle>
          <DialogDescription>
            {description || t("export.description", "Choose your export format and options.")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Format Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">
              {t("export.format", "Export Format")}
            </Label>
            <RadioGroup
              value={format}
              onValueChange={(v) => setFormat(v as ExportFormat)}
              className="grid grid-cols-3 gap-3"
            >
              <Label
                htmlFor="csv"
                className={`flex flex-col items-center justify-center p-4 border rounded-lg cursor-pointer transition-all ${
                  format === "csv"
                    ? "border-green-500 bg-green-50 dark:bg-green-950/30"
                    : "border-border hover:border-muted-foreground/50"
                }`}
              >
                <RadioGroupItem value="csv" id="csv" className="sr-only" />
                {formatIcons.csv}
                <span className="mt-2 text-sm font-medium">CSV</span>
                <span className="text-xs text-muted-foreground">Spreadsheet</span>
              </Label>

              <Label
                htmlFor="pdf"
                className={`flex flex-col items-center justify-center p-4 border rounded-lg cursor-pointer transition-all ${
                  format === "pdf"
                    ? "border-red-500 bg-red-50 dark:bg-red-950/30"
                    : "border-border hover:border-muted-foreground/50"
                }`}
              >
                <RadioGroupItem value="pdf" id="pdf" className="sr-only" />
                {formatIcons.pdf}
                <span className="mt-2 text-sm font-medium">PDF</span>
                <span className="text-xs text-muted-foreground">Document</span>
              </Label>

              <Label
                htmlFor="json"
                className={`flex flex-col items-center justify-center p-4 border rounded-lg cursor-pointer transition-all ${
                  format === "json"
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
                    : "border-border hover:border-muted-foreground/50"
                }`}
              >
                <RadioGroupItem value="json" id="json" className="sr-only" />
                {formatIcons.json}
                <span className="mt-2 text-sm font-medium">JSON</span>
                <span className="text-xs text-muted-foreground">Data</span>
              </Label>
            </RadioGroup>
          </div>

          {/* Options */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">
              {t("export.options", "Options")}
            </Label>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="metadata"
                  checked={options.includeMetadata}
                  onCheckedChange={(checked) =>
                    setOptions((prev) => ({ ...prev, includeMetadata: !!checked }))
                  }
                />
                <Label htmlFor="metadata" className="text-sm font-normal cursor-pointer">
                  {t("export.includeMetadata", "Include metadata (dates, IDs)")}
                </Label>
              </div>

              {(dataType === "materials" || dataType === "tasks" || dataType === "contracts") && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="totals"
                    checked={options.includeTotals}
                    onCheckedChange={(checked) =>
                      setOptions((prev) => ({ ...prev, includeTotals: !!checked }))
                    }
                  />
                  <Label htmlFor="totals" className="text-sm font-normal cursor-pointer">
                    {t("export.includeTotals", "Include summary totals")}
                  </Label>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t("common.cancel", "Cancel")}
          </Button>
          <Button
            onClick={handleExport}
            disabled={loading}
            className="bg-amber-500 hover:bg-amber-600 text-white gap-2"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {t("export.export", "Export")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExportDialog;
