import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Layers, Replace, FileText, Camera, Calculator } from "lucide-react";

interface CollectedData {
  photoEstimate: any | null;
  calculatorResults: any[];
  templateItems: any[];
}

interface DataMergeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collectedData: CollectedData;
  onMerge: () => void;
  onReplace: () => void;
}

const DataMergeDialog = ({
  open,
  onOpenChange,
  collectedData,
  onMerge,
  onReplace,
}: DataMergeDialogProps) => {
  const hasData = collectedData.photoEstimate || 
                  collectedData.calculatorResults.length > 0 || 
                  collectedData.templateItems.length > 0;

  const itemCount = 
    (collectedData.photoEstimate ? 1 : 0) +
    collectedData.calculatorResults.length +
    collectedData.templateItems.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-amber-600" />
            Keep Quick Mode Data?
          </DialogTitle>
          <DialogDescription>
            You have collected {itemCount} item{itemCount !== 1 ? 's' : ''} in Quick Mode. 
            How would you like to proceed with Blueprint Analysis?
          </DialogDescription>
        </DialogHeader>

        {/* Data Summary */}
        {hasData && (
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <p className="text-sm font-medium text-foreground mb-2">Your collected data:</p>
            <div className="flex flex-wrap gap-2">
              {collectedData.photoEstimate && (
                <Badge variant="secondary" className="gap-1">
                  <Camera className="h-3 w-3" />
                  Photo Estimate
                </Badge>
              )}
              {collectedData.calculatorResults.length > 0 && (
                <Badge variant="secondary" className="gap-1">
                  <Calculator className="h-3 w-3" />
                  {collectedData.calculatorResults.length} Calculator Result{collectedData.calculatorResults.length !== 1 ? 's' : ''}
                </Badge>
              )}
              {collectedData.templateItems.length > 0 && (
                <Badge variant="secondary" className="gap-1">
                  <FileText className="h-3 w-3" />
                  {collectedData.templateItems.length} Template{collectedData.templateItems.length !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 pt-2">
          <Button
            variant="outline"
            onClick={onReplace}
            className="flex flex-col h-auto py-4 gap-2"
          >
            <Replace className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium">Start Fresh</span>
            <span className="text-xs text-muted-foreground">
              Use only blueprint data
            </span>
          </Button>
          
          <Button
            onClick={onMerge}
            className="flex flex-col h-auto py-4 gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
          >
            <Layers className="h-5 w-5" />
            <span className="font-medium">Merge Both</span>
            <span className="text-xs text-white/80">
              Keep Quick Mode + add blueprints
            </span>
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Conflicts between estimates will be flagged on the Summary page
        </p>
      </DialogContent>
    </Dialog>
  );
};

export default DataMergeDialog;
