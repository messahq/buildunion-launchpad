import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useExternalDb } from "@/hooks/useExternalDb";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Database,
  Cloud,
  Server,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRightLeft,
  Loader2,
  FolderKanban,
  FileText,
  ListTodo,
  Archive,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { User } from "lucide-react";

interface SyncRecord {
  id: string;
  name?: string;
  title?: string;
  status?: string;
  created_at?: string;
  ownerName?: string;
  archived_at?: string;
  inLovableCloud: boolean;
  inExternalDb: boolean;
  lovableData?: Record<string, unknown>;
  externalData?: Record<string, unknown>;
}

interface SyncStats {
  total: number;
  synced: number;
  onlyLovable: number;
  onlyExternal: number;
}

export default function DatabaseSyncDashboard() {
  const { select, insert } = useExternalDb();
  const [activeTable, setActiveTable] = useState("projects");
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState<string | null>(null);

  const [projectRecords, setProjectRecords] = useState<SyncRecord[]>([]);
  const [contractRecords, setContractRecords] = useState<SyncRecord[]>([]);
  const [taskRecords, setTaskRecords] = useState<SyncRecord[]>([]);

  const [projectStats, setProjectStats] = useState<SyncStats>({ total: 0, synced: 0, onlyLovable: 0, onlyExternal: 0 });
  const [contractStats, setContractStats] = useState<SyncStats>({ total: 0, synced: 0, onlyLovable: 0, onlyExternal: 0 });
  const [taskStats, setTaskStats] = useState<SyncStats>({ total: 0, synced: 0, onlyLovable: 0, onlyExternal: 0 });

  const fetchComparisonData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        fetchProjects(),
        fetchContracts(),
        fetchTasks(),
      ]);
      toast.success("Sync status refreshed");
    } catch (error) {
      console.error("Error fetching comparison data:", error);
      toast.error("Failed to fetch comparison data");
    } finally {
      setIsLoading(false);
    }
  };

  // Admin function to fetch ALL platform data (bypasses RLS)
  const fetchAdminData = async (table: string) => {
    const { data, error } = await supabase.functions.invoke("admin-sync-data", {
      body: { table },
    });
    
    if (error) {
      console.error(`[Admin Sync] Error fetching ${table}:`, error);
      throw error;
    }
    
    if (data?.error) {
      throw new Error(data.error);
    }
    
    return data?.data || [];
  };

  const fetchProjects = async () => {
    // Fetch ALL projects from Lovable Cloud (admin access)
    const lovableProjects = await fetchAdminData("projects");

    // Fetch from External DB
    const externalResult = await select("projects");
    const externalProjects = externalResult.data || [];

    // Create comparison map
    const lovableMap = new Map(lovableProjects?.map((p: Record<string, unknown>) => [p.id, p]) || []);
    const externalMap = new Map(externalProjects.map((p: Record<string, unknown>) => [p.id, p]));

    const allIds = new Set([
      ...(lovableProjects?.map((p: Record<string, unknown>) => p.id as string) || []),
      ...externalProjects.map((p: Record<string, unknown>) => p.id as string),
    ]);

    const records: SyncRecord[] = Array.from(allIds).map(id => {
      const lovable = lovableMap.get(id) as Record<string, unknown> | undefined;
      const external = externalMap.get(id) as Record<string, unknown> | undefined;
      const profiles = lovable?.profiles as { full_name?: string } | null;
      return {
        id,
        name: (lovable?.name || external?.name) as string,
        status: (lovable?.status || external?.status) as string,
        created_at: (lovable?.created_at || external?.created_at) as string,
        ownerName: profiles?.full_name || "Unknown User",
        archived_at: (lovable?.archived_at || external?.archived_at) as string | undefined,
        inLovableCloud: !!lovable,
        inExternalDb: !!external,
        lovableData: lovable || undefined,
        externalData: external || undefined,
      };
    });

    setProjectRecords(records);
    setProjectStats({
      total: records.length,
      synced: records.filter(r => r.inLovableCloud && r.inExternalDb).length,
      onlyLovable: records.filter(r => r.inLovableCloud && !r.inExternalDb).length,
      onlyExternal: records.filter(r => !r.inLovableCloud && r.inExternalDb).length,
    });
  };

  const fetchContracts = async () => {
    // Fetch ALL contracts from Lovable Cloud (admin access)
    const lovableContracts = await fetchAdminData("contracts");

    // Fetch from External DB
    const externalResult = await select("contracts");
    const externalContracts = externalResult.data || [];

    // Create comparison map
    const lovableMap = new Map(lovableContracts?.map((c: Record<string, unknown>) => [c.id, c]) || []);
    const externalMap = new Map(externalContracts.map((c: Record<string, unknown>) => [c.id, c]));

    const allIds = new Set([
      ...(lovableContracts?.map((c: Record<string, unknown>) => c.id as string) || []),
      ...externalContracts.map((c: Record<string, unknown>) => c.id as string),
    ]);

    const records: SyncRecord[] = Array.from(allIds).map(id => {
      const lovable = lovableMap.get(id) as Record<string, unknown> | undefined;
      const external = externalMap.get(id) as Record<string, unknown> | undefined;
      const profiles = lovable?.profiles as { full_name?: string } | null;
      return {
        id,
        name: (lovable?.project_name || external?.project_name || lovable?.contract_number || external?.contract_number) as string,
        status: (lovable?.status || external?.status) as string,
        created_at: (lovable?.created_at || external?.created_at) as string,
        ownerName: profiles?.full_name || "Unknown User",
        archived_at: (lovable?.archived_at || external?.archived_at) as string | undefined,
        inLovableCloud: !!lovable,
        inExternalDb: !!external,
        lovableData: lovable || undefined,
        externalData: external || undefined,
      };
    });

    setContractRecords(records);
    setContractStats({
      total: records.length,
      synced: records.filter(r => r.inLovableCloud && r.inExternalDb).length,
      onlyLovable: records.filter(r => r.inLovableCloud && !r.inExternalDb).length,
      onlyExternal: records.filter(r => !r.inLovableCloud && r.inExternalDb).length,
    });
  };

  const fetchTasks = async () => {
    // Fetch ALL tasks from Lovable Cloud (admin access)
    const lovableTasks = await fetchAdminData("project_tasks");

    // Fetch from External DB (table name is project_tasks in external DB)
    const externalResult = await select("project_tasks");
    const externalTasks = externalResult.data || [];

    // Create comparison map
    const lovableMap = new Map(lovableTasks?.map((t: Record<string, unknown>) => [t.id, t]) || []);
    const externalMap = new Map(externalTasks.map((t: Record<string, unknown>) => [t.id, t]));

    const allIds = new Set([
      ...(lovableTasks?.map((t: Record<string, unknown>) => t.id as string) || []),
      ...externalTasks.map((t: Record<string, unknown>) => t.id as string),
    ]);

    const records: SyncRecord[] = Array.from(allIds).map(id => {
      const lovable = lovableMap.get(id) as Record<string, unknown> | undefined;
      const external = externalMap.get(id) as Record<string, unknown> | undefined;
      const profiles = lovable?.profiles as { full_name?: string } | null;
      return {
        id,
        title: (lovable?.title || external?.title) as string,
        status: (lovable?.status || external?.status) as string,
        created_at: (lovable?.created_at || external?.created_at) as string,
        ownerName: profiles?.full_name || "Unknown User",
        archived_at: (lovable?.archived_at || external?.archived_at) as string | undefined,
        inLovableCloud: !!lovable,
        inExternalDb: !!external,
        lovableData: lovable || undefined,
        externalData: external || undefined,
      };
    });

    setTaskRecords(records);
    setTaskStats({
      total: records.length,
      synced: records.filter(r => r.inLovableCloud && r.inExternalDb).length,
      onlyLovable: records.filter(r => r.inLovableCloud && !r.inExternalDb).length,
      onlyExternal: records.filter(r => !r.inLovableCloud && r.inExternalDb).length,
    });
  };

  const syncRecordToExternal = async (record: SyncRecord, tableName: string) => {
    if (!record.lovableData) return;
    
    setIsSyncing(record.id);
    try {
      let payload: Record<string, unknown> = {};
      
      if (tableName === "projects") {
        const data = record.lovableData as { id: string; name: string; address?: string; status: string; user_id: string };
        payload = {
          id: data.id,
          lovable_user_id: data.user_id,
          name: data.name,
          address: data.address || null,
          status: data.status,
        };
      } else if (tableName === "contracts") {
        const data = record.lovableData as { id: string; contract_number: string; project_name?: string; client_name?: string; status: string; total_amount?: number; user_id: string };
        payload = {
          id: data.id,
          lovable_user_id: data.user_id,
          contract_number: data.contract_number,
          project_name: data.project_name,
          client_name: data.client_name,
          status: data.status,
          total_amount: data.total_amount || 0,
        };
      } else if (tableName === "tasks") {
        const data = record.lovableData as { id: string; title: string; status: string; priority: string; project_id: string; assigned_to: string };
        payload = {
          id: data.id,
          lovable_user_id: data.assigned_to,
          title: data.title,
          status: data.status,
          priority: data.priority,
          project_id: data.project_id,
        };
      }

      // Use correct external table name (project_tasks for tasks)
      const externalTableName = tableName === "tasks" ? "project_tasks" : tableName;
      const result = await insert(externalTableName, payload);
      
      if (result.error) {
        throw new Error(result.error);
      }

      toast.success(`Record synced to External DB`);
      await fetchComparisonData();
    } catch (error) {
      console.error("Sync error:", error);
      toast.error("Failed to sync record");
    } finally {
      setIsSyncing(null);
    }
  };

  const syncAllMissing = async (tableName: string) => {
    const records = tableName === "projects" ? projectRecords :
                    tableName === "contracts" ? contractRecords : taskRecords;
    
    const missingRecords = records.filter(r => r.inLovableCloud && !r.inExternalDb);
    
    if (missingRecords.length === 0) {
      toast.info("All records are already synced");
      return;
    }

    setIsLoading(true);
    let successCount = 0;
    let errorCount = 0;

    for (const record of missingRecords) {
      try {
        await syncRecordToExternal(record, tableName);
        successCount++;
      } catch {
        errorCount++;
      }
    }

    setIsLoading(false);
    toast.success(`Synced ${successCount} records${errorCount > 0 ? `, ${errorCount} failed` : ""}`);
    await fetchComparisonData();
  };

  useEffect(() => {
    fetchComparisonData();
  }, []);

  const getSyncBadge = (record: SyncRecord) => {
    if (record.inLovableCloud && record.inExternalDb) {
      return <Badge className="bg-green-500"><CheckCircle2 className="h-3 w-3 mr-1" />Synced</Badge>;
    }
    if (record.inLovableCloud && !record.inExternalDb) {
      return <Badge className="bg-amber-500"><AlertTriangle className="h-3 w-3 mr-1" />Only Lovable</Badge>;
    }
    if (!record.inLovableCloud && record.inExternalDb) {
      return <Badge className="bg-blue-500"><Server className="h-3 w-3 mr-1" />Only External</Badge>;
    }
    return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Missing</Badge>;
  };

  const renderStatsCard = (title: string, stats: SyncStats, icon: React.ReactNode) => (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-2 text-center">
          <div>
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-500">{stats.synced}</div>
            <div className="text-xs text-muted-foreground">Synced</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-amber-500">{stats.onlyLovable}</div>
            <div className="text-xs text-muted-foreground">Only Cloud</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-500">{stats.onlyExternal}</div>
            <div className="text-xs text-muted-foreground">Only External</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderTable = (records: SyncRecord[], tableName: string) => (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>
              <User className="h-4 w-4 inline mr-1" />
              Owner
            </TableHead>
            <TableHead>Status</TableHead>
            <TableHead>
              <Archive className="h-4 w-4 inline mr-1" />
              Archived
            </TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-center">
              <Cloud className="h-4 w-4 inline mr-1" />
              Lovable
            </TableHead>
            <TableHead className="text-center">
              <Server className="h-4 w-4 inline mr-1" />
              External
            </TableHead>
            <TableHead>Sync Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                No records found
              </TableCell>
            </TableRow>
          ) : (
            records.map(record => (
              <TableRow key={record.id} className={record.archived_at ? "bg-amber-50/50 dark:bg-amber-950/20" : ""}>
                <TableCell className="font-medium">
                  {record.name || record.title || record.id.slice(0, 8)}
                  {record.archived_at && (
                    <Badge className="ml-2 bg-amber-100 text-amber-700 text-[10px]">
                      <Archive className="h-3 w-3 mr-1" />
                      Soft Deleted
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {record.ownerName || "—"}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{record.status || "N/A"}</Badge>
                </TableCell>
                <TableCell>
                  {record.archived_at ? (
                    <span className="text-amber-600 text-xs">
                      {format(new Date(record.archived_at), "MMM d, yyyy")}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {record.created_at ? format(new Date(record.created_at), "MMM d, yyyy") : "N/A"}
                </TableCell>
                <TableCell className="text-center">
                  {record.inLovableCloud ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500 inline" />
                  ) : (
                    <XCircle className="h-5 w-5 text-destructive inline" />
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {record.inExternalDb ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500 inline" />
                  ) : (
                    <XCircle className="h-5 w-5 text-destructive inline" />
                  )}
                </TableCell>
                <TableCell>{getSyncBadge(record)}</TableCell>
                <TableCell>
                  {record.inLovableCloud && !record.inExternalDb && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => syncRecordToExternal(record, tableName)}
                      disabled={isSyncing === record.id}
                    >
                      {isSyncing === record.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ArrowRightLeft className="h-4 w-4" />
                      )}
                      <span className="ml-1">Sync</span>
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Database className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-xl font-bold">Platform Sync Dashboard</h2>
            <p className="text-sm text-muted-foreground">
              All users' data · Lovable Cloud ↔ External Supabase Pro
            </p>
          </div>
        </div>
        <Button onClick={fetchComparisonData} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {renderStatsCard("Projects", projectStats, <FolderKanban className="h-4 w-4 text-green-500" />)}
        {renderStatsCard("Contracts", contractStats, <FileText className="h-4 w-4 text-amber-500" />)}
        {renderStatsCard("Tasks", taskStats, <ListTodo className="h-4 w-4 text-blue-500" />)}
      </div>

      {/* Data Tables */}
      <Tabs value={activeTable} onValueChange={setActiveTable}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="projects" className="gap-2">
              <FolderKanban className="h-4 w-4" />
              Projects
            </TabsTrigger>
            <TabsTrigger value="contracts" className="gap-2">
              <FileText className="h-4 w-4" />
              Contracts
            </TabsTrigger>
            <TabsTrigger value="tasks" className="gap-2">
              <ListTodo className="h-4 w-4" />
              Tasks
            </TabsTrigger>
          </TabsList>

          <Button
            variant="outline"
            size="sm"
            onClick={() => syncAllMissing(activeTable)}
            disabled={isLoading}
          >
            <ArrowRightLeft className="h-4 w-4 mr-2" />
            Sync All Missing
          </Button>
        </div>

        <TabsContent value="projects" className="mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            renderTable(projectRecords, "projects")
          )}
        </TabsContent>

        <TabsContent value="contracts" className="mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            renderTable(contractRecords, "contracts")
          )}
        </TabsContent>

        <TabsContent value="tasks" className="mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            renderTable(taskRecords, "tasks")
          )}
        </TabsContent>
      </Tabs>

      {/* Legend */}
      <Card className="bg-muted/50">
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Cloud className="h-4 w-4 text-primary" />
              <span>Lovable Cloud = Primary database (Lovable infrastructure)</span>
            </div>
            <div className="flex items-center gap-2">
              <Server className="h-4 w-4 text-blue-500" />
              <span>External = Your Supabase Pro instance</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>Synced = Exists in both databases</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
