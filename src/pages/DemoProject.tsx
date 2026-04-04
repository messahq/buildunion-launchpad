import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { DEMO_PROJECT, type DemoMaterial } from "@/data/demoProject";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
import { useState, useEffect } from "react";

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
    ? "border-destructive/60 bg-destructive/10"
    : "border-green-500/40 bg-green-500/5";

const statusBadge = (s: DemoMaterial["status"]) =>
  s === "conflict" ? (
    <Badge variant="destructive" className="gap-1 text-xs animate-pulse">
      <XCircle className="h-3 w-3" /> CONFLICT
    </Badge>
  ) : (
    <Badge className="gap-1 bg-green-600/80 hover:bg-green-600 text-xs">
      <CheckCircle2 className="h-3 w-3" /> Verified
    </Badge>
  );

/* ─── Skeleton loader ─── */
function DemoSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-8">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-40 rounded-lg" />
      <Skeleton className="h-64 rounded-lg" />
    </div>
  );
}

export default function DemoProject() {
  const navigate = useNavigate();
  const d = DEMO_PROJECT;
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 600);
    return () => clearTimeout(t);
  }, []);

  if (!loaded) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <BuildUnionHeader />
        <DemoSkeleton />
        <BuildUnionFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>Demo Project — BuildUnion Operational Truth</title>
        <meta name="description" content="See how BuildUnion's 5-engine AI catches budget conflicts in real-time. Interactive demo of a 1302 sqft Toronto duplex renovation." />
        <meta property="og:title" content="BuildUnion Demo — Operational Truth in Action" />
        <meta property="og:description" content="Interactive demo: see how 5 AI engines catch a $1,400 electrical budget conflict in real-time." />
      </Helmet>

      <BuildUnionHeader />

      <main className="mx-auto max-w-6xl px-3 sm:px-4 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* Back + title */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0">
            <Badge variant="outline" className="mb-1 text-amber-400 border-amber-400/40">
              DEMO PROJECT
            </Badge>
            <h1 className="text-xl sm:text-2xl font-bold truncate">{d.basics.name}</h1>
            <p className="text-muted-foreground text-sm flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{d.basics.address}</span>
            </p>
          </div>
        </div>

        {/* ─── Quick stats row ─── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <Card className="bg-card/60 backdrop-blur border-border/40">
            <CardContent className="p-3 sm:p-4 text-center">
              <p className="text-xl sm:text-2xl font-bold text-foreground">{d.gfa.totalArea}</p>
              <p className="text-xs text-muted-foreground">sqft GFA</p>
            </CardContent>
          </Card>
          <Card className="bg-card/60 backdrop-blur border-border/40">
            <CardContent className="p-3 sm:p-4 text-center flex flex-col items-center">
              <Users className="h-4 sm:h-5 w-4 sm:w-5 text-amber-400 mb-1" />
              <p className="text-xl sm:text-2xl font-bold text-foreground">{d.team.length}</p>
              <p className="text-xs text-muted-foreground">Team Members</p>
            </CardContent>
          </Card>
          <Card className="bg-card/60 backdrop-blur border-border/40">
            <CardContent className="p-3 sm:p-4 text-center flex flex-col items-center">
              <Calendar className="h-4 sm:h-5 w-4 sm:w-5 text-blue-400 mb-1" />
              <p className="text-xl sm:text-2xl font-bold text-foreground">{d.timeline.weeks}</p>
              <p className="text-xs text-muted-foreground">Week Timeline</p>
            </CardContent>
          </Card>
          <Card className="bg-destructive/10 backdrop-blur border-destructive/30">
            <CardContent className="p-3 sm:p-4 text-center flex flex-col items-center">
              <AlertTriangle className="h-4 sm:h-5 w-4 sm:w-5 text-destructive mb-1 animate-pulse" />
              <p className="text-xl sm:text-2xl font-bold text-destructive">{d.financialSummary.conflictCount}</p>
              <p className="text-xs text-destructive/70">Active Conflict</p>
            </CardContent>
          </Card>
        </div>

        {/* ─── 5 Engine Scores ─── */}
        <Card className="bg-card/60 backdrop-blur border-border/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg">5-Engine AI Verification</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-3">
              {Object.entries(d.engineScores).map(([key, eng]) => (
                <div
                  key={key}
                  className="flex flex-col items-center gap-1.5 rounded-lg border border-border/40 bg-muted/30 p-2.5 sm:p-3 text-center"
                >
                  <div className="rounded-full bg-amber-500/20 p-1.5 sm:p-2 text-amber-400">
                    {engineIcons[eng.icon]}
                  </div>
                  <p className="text-[11px] sm:text-xs font-medium text-foreground">{eng.label}</p>
                  <p className="text-[10px] sm:text-[11px] text-muted-foreground">{eng.score}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ─── Materials & Labor with CONFLICT ─── */}
        <Card className="bg-card/60 backdrop-blur border-border/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2 flex-wrap">
              Materials & Labor
              <Badge variant="destructive" className="text-[10px] animate-pulse">
                1 Conflict Detected
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {d.materials.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col sm:flex-row sm:items-center justify-between rounded-lg border p-3 transition-all ${statusColor(m.status)} ${
                  m.status === "conflict" ? "shadow-[0_0_15px_-3px_hsl(var(--destructive)/0.4)]" : ""
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                      {m.trade}
                    </span>
                    <span className="text-sm font-medium text-foreground truncate">{m.item}</span>
                  </div>
                  {m.status === "conflict" && m.conflictDetail && (
                    <div className="mt-2 rounded-md bg-destructive/10 border border-destructive/30 p-2.5 animate-[fadeIn_0.5s_ease-out]">
                      <p className="text-xs text-destructive font-semibold flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3 animate-pulse" /> Operational Truth — Conflict
                      </p>
                      <p className="text-xs text-destructive/80 mt-1">{m.conflictDetail.reason}</p>
                      <p className="text-[10px] text-destructive/60 mt-1 font-mono">
                        {m.conflictDetail.citation}
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-2 sm:mt-0 sm:ml-3 shrink-0">
                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground">
                      ${m.total.toLocaleString()}
                    </p>
                    {m.status === "conflict" && (
                      <p className="text-[10px] text-destructive line-through">
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
            <CardTitle className="text-base sm:text-lg">Financial Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 text-center">
              <div>
                <p className="text-xs text-muted-foreground">Materials</p>
                <p className="text-base sm:text-lg font-bold text-foreground">${d.financialSummary.materialCost.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Labor</p>
                <p className="text-base sm:text-lg font-bold text-foreground">${d.financialSummary.laborCost.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Budget</p>
                <p className="text-base sm:text-lg font-bold text-foreground">${d.financialSummary.totalBudget.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Variance</p>
                <p className="text-base sm:text-lg font-bold text-destructive">
                  +${d.financialSummary.variance.toLocaleString()} ({d.financialSummary.variancePercent}%)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ─── Timeline (simple Gantt) ─── */}
        <Card className="bg-card/60 backdrop-blur border-border/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg">Timeline — 3-Week Gantt</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {d.timeline.phases.map((p, i) => (
              <div key={i} className="flex items-center gap-2 sm:gap-3">
                <span className="text-[11px] sm:text-xs text-muted-foreground w-28 sm:w-40 shrink-0 truncate">{p.name}</span>
                <div className="flex-1 h-4 sm:h-5 bg-muted/30 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000"
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
                <span className="text-[11px] sm:text-xs text-muted-foreground w-8 sm:w-10 text-right">{p.progress}%</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* ─── Team ─── */}
        <Card className="bg-card/60 backdrop-blur border-border/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg">Team</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 sm:gap-3">
              {d.team.map((t, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded-lg border border-border/40 bg-muted/20 px-2.5 sm:px-3 py-2"
                >
                  <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-amber-500/20 text-amber-400 text-[10px] sm:text-xs font-bold">
                    {t.initials}
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-foreground">{t.name}</p>
                    <p className="text-[9px] sm:text-[10px] text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* CTA */}
        <div className="text-center py-4 sm:py-6">
          <p className="text-muted-foreground text-xs sm:text-sm mb-3">
            This is a read-only demo. Start your own project to unlock full Operational Truth.
          </p>
          <Button
            onClick={() => navigate("/buildunion/register")}
            className="bg-amber-500 hover:bg-amber-600 text-black font-semibold px-6 sm:px-8"
          >
            Start Your Free Project →
          </Button>
        </div>
      </main>

      <BuildUnionFooter />

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
