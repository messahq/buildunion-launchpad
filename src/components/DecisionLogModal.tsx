import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  FileSearch,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Eye,
  Ruler,
  FileText,
  Info,
} from "lucide-react";

// Custom icons for the engines
const GeminiIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
  </svg>
);

const OpenAIIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.8956zm16.0993 3.8558L12.6 8.3829l2.02-1.1638a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.1408 1.6465 4.4708 4.4708 0 0 1 .5765 3.0137zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.5056-2.6067-1.4998z" />
  </svg>
);

interface DataPoint {
  type: "visual" | "text" | "cross-verified";
  description: string;
  value: string;
  source: string;
  confidence?: "high" | "medium" | "low";
  verificationSource?: string;
}

interface Conflict {
  topic: string;
  geminiValue: string;
  openaiValue: string;
  source: string;
  isContradiction?: boolean;
}

interface CrossVerifyResult {
  visualElement: string;
  found: "yes" | "no" | "partial";
  textRef: string;
  source: string;
}

interface DecisionLogData {
  geminiResponse: string | null;
  openaiResponse: string | null;
  verification: {
    status: "verified" | "not-verified" | "conflict" | "gemini-only" | "openai-only" | "operational-truth" | "error";
    verified: boolean;
    engines: { gemini: boolean; openai: boolean };
    summary?: string;
  } | null;
  comparison?: {
    matchingPoints?: Array<{ gemini: DataPoint; openai: DataPoint; match: boolean }>;
    conflicts?: Conflict[];
    geminiOnlyPoints?: DataPoint[];
    openaiOnlyPoints?: DataPoint[];
    operationalTruths?: DataPoint[];
    crossVerified?: CrossVerifyResult[];
  };
}

interface DecisionLogModalProps {
  data: DecisionLogData;
  trigger?: React.ReactNode;
}

const DecisionLogModal = ({ data, trigger }: DecisionLogModalProps) => {
  const [open, setOpen] = useState(false);

  const getStatusBadge = () => {
    if (!data.verification) return null;

    if (data.verification.verified) {
      return (
        <Badge className="bg-green-500 text-white gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5" />
          MATCH - Verified
        </Badge>
      );
    }

    if (data.verification.status === "conflict") {
      return (
        <Badge variant="destructive" className="gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5" />
          TRUE CONFLICT
        </Badge>
      );
    }

    if (data.verification.status === "operational-truth") {
      return (
        <Badge className="bg-amber-500 text-white gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Operational Truth
        </Badge>
      );
    }

    if (data.verification.status === "gemini-only" || data.verification.status === "openai-only") {
      return (
        <Badge variant="secondary" className="gap-1.5">
          <Info className="h-3.5 w-3.5" />
          Single Engine
        </Badge>
      );
    }

    return (
      <Badge variant="secondary" className="gap-1.5">
        <Info className="h-3.5 w-3.5" />
        Analysis Complete
      </Badge>
    );
  };

  const renderDataPoint = (point: DataPoint, index: number) => {
    const getIcon = () => {
      if (point.type === "cross-verified") {
        return <CheckCircle2 className="h-3.5 w-3.5 text-purple-500 shrink-0 mt-0.5" />;
      }
      if (point.type === "visual") {
        return <Ruler className="h-3.5 w-3.5 text-blue-500 shrink-0 mt-0.5" />;
      }
      return <FileText className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />;
    };

    const getConfidenceBadge = () => {
      if (!point.confidence) return null;
      const colors = {
        high: "bg-green-100 text-green-700 border-green-300",
        medium: "bg-amber-100 text-amber-700 border-amber-300",
        low: "bg-red-100 text-red-700 border-red-300",
      };
      return (
        <span className={`text-[9px] px-1.5 py-0.5 rounded border ${colors[point.confidence]}`}>
          {point.confidence.toUpperCase()}
        </span>
      );
    };

    return (
      <div 
        key={index}
        className="p-2 rounded-md bg-white/50 border border-slate-200 text-xs"
      >
        <div className="flex items-start gap-2">
          {getIcon()}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-medium text-slate-700 break-words">{point.description}</p>
              {getConfidenceBadge()}
            </div>
            <p className="text-slate-900 font-semibold mt-0.5 break-words">{point.value}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <p className="text-slate-500 text-[10px]">{point.source}</p>
              {point.verificationSource && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                  {point.verificationSource}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderConflict = (conflict: Conflict, index: number) => {
    const isTrueConflict = conflict.isContradiction;
    const bgColor = isTrueConflict ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200";
    const iconColor = isTrueConflict ? "text-red-500" : "text-amber-500";
    const textColor = isTrueConflict ? "text-red-700" : "text-amber-700";
    const sourceColor = isTrueConflict ? "text-red-600" : "text-amber-600";

    return (
      <div 
        key={index}
        className={`p-3 rounded-lg ${bgColor}`}
      >
        <div className="flex items-center gap-2 mb-2">
          {isTrueConflict ? (
            <XCircle className={`h-4 w-4 ${iconColor}`} />
          ) : (
            <Info className={`h-4 w-4 ${iconColor}`} />
          )}
          <span className={`text-sm font-semibold ${textColor} break-words`}>
            {conflict.topic}
            {!isTrueConflict && <span className="font-normal text-xs ml-2">(different perspectives)</span>}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <div className="p-2 rounded bg-blue-50 border border-blue-200">
            <div className="flex items-center gap-1 mb-1">
              <GeminiIcon className="h-3 w-3 text-blue-600" />
              <span className="font-medium text-blue-700">Gemini (Visual)</span>
            </div>
            <p className="text-blue-900 break-words">{conflict.geminiValue}</p>
          </div>
          <div className="p-2 rounded bg-emerald-50 border border-emerald-200">
            <div className="flex items-center gap-1 mb-1">
              <OpenAIIcon className="h-3 w-3 text-emerald-600" />
              <span className="font-medium text-emerald-700">OpenAI (Text)</span>
            </div>
            <p className="text-emerald-900 break-words">{conflict.openaiValue}</p>
          </div>
        </div>
        <p className={`text-[10px] ${sourceColor} mt-2`}>Source: {conflict.source}</p>
      </div>
    );
  };

  const renderOperationalTruth = (point: DataPoint, index: number) => (
    <div 
      key={index}
      className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-xs"
    >
      <div className="flex items-start gap-2">
        <CheckCircle2 className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-amber-800 break-words">{point.description}</p>
          <p className="text-amber-900 font-semibold mt-0.5 break-words">{point.value}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <p className="text-amber-600 text-[10px]">{point.source}</p>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-300">
              {point.verificationSource || "Operational Truth"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCrossVerified = (cv: CrossVerifyResult, index: number) => {
    const statusColors = {
      yes: "bg-purple-50 border-purple-200",
      partial: "bg-amber-50 border-amber-200",
      no: "bg-slate-50 border-slate-200",
    };
    const statusIcons = {
      yes: <CheckCircle2 className="h-3.5 w-3.5 text-purple-600" />,
      partial: <Info className="h-3.5 w-3.5 text-amber-600" />,
      no: <XCircle className="h-3.5 w-3.5 text-slate-400" />,
    };

    return (
      <div key={index} className={`p-2 rounded-lg ${statusColors[cv.found]} text-xs`}>
        <div className="flex items-start gap-2">
          {statusIcons[cv.found]}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-slate-700 break-words">{cv.visualElement}</p>
            <p className="text-slate-600 mt-0.5 break-words">
              {cv.found === "yes" ? `Confirmed: "${cv.textRef}"` : 
               cv.found === "partial" ? `Partial match: "${cv.textRef}"` :
               "No text reference found"}
            </p>
            <p className="text-slate-500 text-[10px] mt-1">{cv.source}</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-1.5 text-slate-500 hover:text-slate-700 h-auto py-1 px-2"
          >
            <Eye className="h-3.5 w-3.5" />
            <span className="text-xs">Decision Log</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-4 pb-3 border-b shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <FileSearch className="h-5 w-5 text-amber-600" />
              Decision Log
            </DialogTitle>
            {getStatusBadge()}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Detailed breakdown of dual-engine analysis and verification
          </p>
        </DialogHeader>

        <ScrollArea className="flex-1 max-h-[calc(90vh-100px)]">
          <div className="p-4 space-y-4">
            {/* Engine Role Explanation */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <GeminiIcon className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-blue-700 text-sm">Gemini Pro</h4>
                    <p className="text-[10px] text-blue-600">Visual Analysis Engine</p>
                  </div>
                </div>
                <p className="text-xs text-blue-700">
                  Focuses on drawings, measurements, dimensions, and visual data from plans and site photos.
                </p>
              </div>
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <OpenAIIcon className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-emerald-700 text-sm">GPT-5</h4>
                    <p className="text-[10px] text-emerald-600">Text & Regulations Engine</p>
                  </div>
                </div>
                <p className="text-xs text-emerald-700">
                  Focuses on specifications, code references, written notes, and regulatory requirements.
                </p>
              </div>
            </div>

            {/* Conflicts Section */}
            {data.comparison?.conflicts && data.comparison.conflicts.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-red-700 mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Conflicts Detected ({data.comparison.conflicts.length})
                </h4>
                <div className="space-y-2">
                  {data.comparison.conflicts.map((conflict, idx) => renderConflict(conflict, idx))}
                </div>
              </div>
            )}

            {/* Matching Points Section */}
            {data.comparison?.matchingPoints && data.comparison.matchingPoints.filter(m => m.match).length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-green-700 mb-2 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Matching Data Points ({data.comparison.matchingPoints.filter(m => m.match).length})
                </h4>
                <div className="space-y-2">
                  {data.comparison.matchingPoints
                    .filter(m => m.match)
                    .map((match, idx) => (
                      <div key={idx} className="p-2 rounded-lg bg-green-50 border border-green-200">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                          <span className="text-xs font-medium text-green-700 break-words">{match.gemini.description}</span>
                        </div>
                        <p className="text-xs text-green-800 mt-1 font-semibold break-words">{match.gemini.value}</p>
                        <p className="text-[10px] text-green-600 mt-0.5">Both engines agree • {match.gemini.source}</p>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Operational Truths Section */}
            {data.comparison?.operationalTruths && data.comparison.operationalTruths.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-amber-700 mb-2 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Operational Truths ({data.comparison.operationalTruths.length})
                </h4>
                <p className="text-xs text-amber-600 mb-2">
                  Data verified by one engine with high confidence, accepted as truth.
                </p>
                <div className="space-y-2">
                  {data.comparison.operationalTruths.map((truth, idx) => renderOperationalTruth(truth, idx))}
                </div>
              </div>
            )}

            {/* Cross-Verified Section */}
            {data.comparison?.crossVerified && data.comparison.crossVerified.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-purple-700 mb-2 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Cross-Verification Results ({data.comparison.crossVerified.length})
                </h4>
                <p className="text-xs text-purple-600 mb-2">
                  Visual elements checked against text references.
                </p>
                <div className="space-y-2">
                  {data.comparison.crossVerified.map((cv, idx) => renderCrossVerified(cv, idx))}
                </div>
              </div>
            )}

            <Separator />

            {/* Raw Engine Responses */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-slate-700">Raw Engine Outputs</h4>
              
              {/* Gemini Response */}
              {data.geminiResponse && (
                <div className="rounded-lg border border-blue-200 overflow-hidden">
                  <div className="bg-blue-50 px-3 py-2 flex items-center gap-2 border-b border-blue-200">
                    <GeminiIcon className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-700">Gemini Pro Response</span>
                    <Badge variant="outline" className="ml-auto text-[10px] border-blue-300 text-blue-600">
                      Visual Data
                    </Badge>
                  </div>
                  <div className="p-3 bg-white max-h-48 overflow-y-auto">
                    <pre className="text-xs text-slate-700 whitespace-pre-wrap font-sans leading-relaxed break-words">
                      {data.geminiResponse}
                    </pre>
                  </div>
                </div>
              )}

              {/* OpenAI Response */}
              {data.openaiResponse && (
                <div className="rounded-lg border border-emerald-200 overflow-hidden">
                  <div className="bg-emerald-50 px-3 py-2 flex items-center gap-2 border-b border-emerald-200">
                    <OpenAIIcon className="h-4 w-4 text-emerald-600" />
                    <span className="text-sm font-medium text-emerald-700">GPT-5 Response</span>
                    <Badge variant="outline" className="ml-auto text-[10px] border-emerald-300 text-emerald-600">
                      Text/Regulations
                    </Badge>
                  </div>
                  <div className="p-3 bg-white max-h-48 overflow-y-auto">
                    <pre className="text-xs text-slate-700 whitespace-pre-wrap font-sans leading-relaxed break-words">
                      {data.openaiResponse}
                    </pre>
                  </div>
                </div>
              )}
            </div>

            {/* Engine Status */}
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <h4 className="text-xs font-semibold text-slate-600 mb-2">Engine Status</h4>
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-1.5">
                  <GeminiIcon className={`h-4 w-4 ${data.verification?.engines?.gemini ? 'text-blue-500' : 'text-slate-300'}`} />
                  <span className={`text-xs ${data.verification?.engines?.gemini ? 'text-blue-700' : 'text-slate-400'}`}>
                    Gemini: {data.verification?.engines?.gemini ? 'Responded' : 'No Response'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <OpenAIIcon className={`h-4 w-4 ${data.verification?.engines?.openai ? 'text-emerald-500' : 'text-slate-300'}`} />
                  <span className={`text-xs ${data.verification?.engines?.openai ? 'text-emerald-700' : 'text-slate-400'}`}>
                    OpenAI: {data.verification?.engines?.openai ? 'Responded' : 'No Response'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default DecisionLogModal;
