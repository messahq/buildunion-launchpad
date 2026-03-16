import { useNavigate } from "react-router-dom";
import { DEMO_PROJECT, type DemoMaterial } from "@/data/demoProject";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft,
  MapPin,
  Users,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Brain,
  Shield,
  Eye,
  TrendingUp,
  Cpu,
} from "lucide-react";
import BuildUnionHeader from "@/components/BuildUnionHeader";
import BuildUnionFooter from "@/components/BuildUnionFooter";

/* ─── tiny engine icon map ─── */
const engineIcons: Record<string, React.ReactNode> = {
  gemini: <Eye className="h-4 w-4" />,
  gpt: <Shield className="h-4 w-4" />,
  claude: <Brain className="h-4 w-4" />,
  lovable: <Cpu className="h-4 w-4" />,
  grok: <TrendingUp className="h-4 w-4" />,
};

/* ─── status colour helper ─── */
const statusColor = (s: DemoMaterial["status"]) =>
  s === "conflict"
    ? "border-red-500/60 bg-red-500/10"
    : "border-green-500/40 bg-green-500/5";

const statusBadge = (s: DemoMaterial["status"]) =>
  s === "conflict" ? (
    <Badge variant="destructive" className="gap-1 text-xs">
      <XCircle className="h-3 w-3" /> CONFLICT
    </Badge>
  ) : (
    <Badge className="gap-1 bg-green-600/80 hover:bg-green-600 text-xs">
      <CheckCircle2 className="h-3 w-3" /> Verified
    </Badge>
  );

export default function DemoProject() {
  const navigate = useNavigate();
  const d = DEMO_PROJECT;
  const conflict = d.materials.find((m) => m.status === "conflict")!;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <BuildUnionHeader />

      <main className="mx-auto max-w-6xl px-4 py-8 space-y-8">
        {/* Back + title */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <Badge variant="outline" className="mb-1 text-amber-400 border-amber-400/40">
              DEMO PROJECT
            </Badge>
            <h1 className="text-2xl font-bold">{d.basics.name}</h1>
            <p className="text-muted-foreground text-sm flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" /> {d.basics.address}
            </p>
          </div>
        </div>

        {/* ─── Quick stats row ─── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-card/60 backdrop-blur border-border/40">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{d.gfa.totalArea}</p>
              <p className="text-xs text-muted-foreground">sqft GFA</p>
            </CardContent>
          </Card>
          <Card className="bg-card/60 backdrop-blur border-border/40">
            <CardContent className="p-4 text-center flex flex-col items-center">
              <Users className="h-5 w-5 text-amber-400 mb-1" />
              <p className="text-2xl font-bold text-foreground">{d.team.length}</p>
              <p className="text-xs text-muted-foreground">Team Members</p>
            </CardContent>
          </Card>
          <Card className="bg-card/60 backdrop-blur border-border/40">
            <CardContent className="p-4 text-center flex flex-col items-center">
              <Calendar className="h-5 w-5 text-blue-400 mb-1" />
              <p className="text-2xl font-bold text-foreground">{d.timeline.weeks}</p>
              <p className="text-xs text-muted-foreground">Week Timeline</p>
            </CardContent>
          </Card>
          <Card className="bg-red-500/10 backdrop-blur border-red-500/30">
            <CardContent className="p-4 text-center flex flex-col items-center">
              <AlertTriangle className="h-5 w-5 text-red-400 mb-1" />
              <p className="text-2xl font-bold text-red-400">{d.financialSummary.conflictCount}</p>
              <p className="text-xs text-red-300/70">Active Conflict</p>
            </CardContent>
          </Card>
        </div>

        {/* ─── 5 Engine Scores ─── */}
        <Card className="bg-card/60 backdrop-blur border-border/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">5-Engine AI Verification</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {Object.entries(d.engineScores).map(([key, eng]) => (
                <div
                  key={key}
                  className="flex flex-col items-center gap-1.5 rounded-lg border border-border/40 bg-muted/30 p-3 text-center"
                >
                  <div className="rounded-full bg-amber-500/20 p-2 text-amber-400">
                    {engineIcons[eng.icon]}
                  </div>
                  <p className="text-xs font-medium text-foreground">{eng.label}</p>
                  <p className="text-[11px] text-muted-foreground">{eng.score}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ─── Materials & Labor with CONFLICT ─── */}
        <Card className="bg-card/60 backdrop-blur border-border/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              Materials & Labor
              <Badge variant="destructive" className="text-[10px]">
                1 Conflict Detected
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {d.materials.map((m) => (
              <div
                key={m.id}
                className={`flex items-center justify-between rounded-lg border p-3 transition-all ${statusColor(m.status)}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                      {m.trade}
                    </span>
                    <span className="text-sm font-medium text-foreground truncate">{m.item}</span>
                  </div>
                  {m.status === "conflict" && m.conflictDetail && (
                    <div className="mt-2 rounded-md bg-red-500/10 border border-red-500/30 p-2.5">
                      <p className="text-xs text-red-400 font-semibold flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" /> Operational Truth — Conflict
                      </p>
                      <p className="text-xs text-red-300/80 mt-1">{m.conflictDetail.reason}</p>
                      <p className="text-[10px] text-red-400/60 mt-1 font-mono">
                        {m.conflictDetail.citation}
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3 ml-3 shrink-0">
                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground">
                      ${m.total.toLocaleString()}
                    </p>
                    {m.status === "conflict" && (
                      <p className="text-[10px] text-red-400 line-through">
                        budget ${m.budgetTotal.toLocaleString()}
                      </p>
                    )}
                  </div>
                  {statusBadge(m.status)}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* ─── Financial Summary ─── */}
        <Card className="bg-card/60 backdrop-blur border-border/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Financial Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-xs text-muted-foreground">Materials</p>
                <p className="text-lg font-bold text-foreground">${d.financialSummary.materialCost.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Labor</p>
                <p className="text-lg font-bold text-foreground">${d.financialSummary.laborCost.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Budget</p>
                <p className="text-lg font-bold text-foreground">${d.financialSummary.totalBudget.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Variance</p>
                <p className="text-lg font-bold text-red-400">
                  +${d.financialSummary.variance.toLocaleString()} ({d.financialSummary.variancePercent}%)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ─── Timeline (simple Gantt) ─── */}
        <Card className="bg-card/60 backdrop-blur border-border/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Timeline — 6-Week Gantt</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {d.timeline.phases.map((p, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-40 shrink-0 truncate">{p.name}</span>
                <div className="flex-1 h-5 bg-muted/30 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${p.progress}%`,
                      background:
                        p.progress === 100
                          ? "hsl(var(--chart-2))"
                          : p.progress > 0
                          ? "hsl(var(--chart-4))"
                          : "hsl(var(--muted))",
                    }}
                  />
                </div>
                <span className="text-xs text-muted-foreground w-10 text-right">{p.progress}%</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* ─── Team ─── */}
        <Card className="bg-card/60 backdrop-blur border-border/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Team</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {d.team.map((t, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded-lg border border-border/40 bg-muted/20 px-3 py-2"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold">
                    {t.initials}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{t.name}</p>
                    <p className="text-[10px] text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* CTA */}
        <div className="text-center py-6">
          <p className="text-muted-foreground text-sm mb-3">
            This is a read-only demo. Start your own project to unlock full Operational Truth.
          </p>
          <Button
            onClick={() => navigate("/buildunion/register")}
            className="bg-amber-500 hover:bg-amber-600 text-black font-semibold px-8"
          >
            Start Your Free Project →
          </Button>
        </div>
      </main>

      <BuildUnionFooter />
    </div>
  );
}
