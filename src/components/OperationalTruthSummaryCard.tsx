import { CheckCircle2, AlertCircle, Sparkles, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface Fact {
  question?: string;
  title?: string;
  answer?: string;
  value?: string;
  content?: string;
  verification_status?: string;
  source?: string;
}

interface OperationalTruthSummaryCardProps {
  facts: Fact[];
}

const OperationalTruthSummaryCard = ({ facts }: OperationalTruthSummaryCardProps) => {
  const verifiedCount = facts.filter(f => f.verification_status === "verified").length;
  const unverifiedCount = facts.filter(f => f.verification_status !== "verified").length;
  const totalCount = facts.length;
  const verificationRate = totalCount > 0 ? Math.round((verifiedCount / totalCount) * 100) : 0;

  if (totalCount === 0) {
    return null;
  }

  return (
    <Card className="bg-gradient-to-br from-slate-50 to-cyan-50/50 border-cyan-200/50 mb-4">
      <CardContent className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h4 className="font-semibold text-slate-900">Truth Verification Status</h4>
            <p className="text-xs text-slate-500">AI-verified project facts overview</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-white rounded-lg p-3 border border-green-200 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span className="text-xs font-medium text-green-700">Verified</span>
            </div>
            <div className="text-2xl font-bold text-green-700">{verifiedCount}</div>
          </div>
          
          <div className="bg-white rounded-lg p-3 border border-amber-200 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-medium text-amber-700">Pending</span>
            </div>
            <div className="text-2xl font-bold text-amber-700">{unverifiedCount}</div>
          </div>
          
          <div className="bg-white rounded-lg p-3 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-slate-600" />
              <span className="text-xs font-medium text-slate-700">Total</span>
            </div>
            <div className="text-2xl font-bold text-slate-700">{totalCount}</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600 font-medium">Verification Progress</span>
            <Badge 
              variant="outline" 
              className={`text-xs ${
                verificationRate >= 80 
                  ? "border-green-300 text-green-700 bg-green-50" 
                  : verificationRate >= 50 
                    ? "border-amber-300 text-amber-700 bg-amber-50"
                    : "border-red-300 text-red-700 bg-red-50"
              }`}
            >
              {verificationRate}%
            </Badge>
          </div>
          <Progress 
            value={verificationRate} 
            className="h-2 bg-slate-200" 
          />
          <p className="text-xs text-slate-500">
            {verifiedCount} of {totalCount} facts have been cross-verified by dual AI engines
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default OperationalTruthSummaryCard;
