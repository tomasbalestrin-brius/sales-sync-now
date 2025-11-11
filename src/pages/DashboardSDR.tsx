import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, TrendingUp, Users, CheckCircle, Clock } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { toast } from "sonner";
import { SDRLeadsTable } from "@/components/sdr/SDRLeadsTable";
import { SDRTasksPanel } from "@/components/sdr/SDRTasksPanel";
import { CreateLeadDialog } from "@/components/sdr/CreateLeadDialog";
import { SDRMetrics } from "@/components/sdr/SDRMetrics";

export default function DashboardSDR() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalLeads: 0,
    qualifiedLeads: 0,
    pendingTasks: 0,
    completedToday: 0,
  });
  const [showCreateLead, setShowCreateLead] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    fetchMetrics();
  }, [user, refreshTrigger]);

  const fetchMetrics = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Total de leads atribuídos
      const { count: fiftyScripts } = await supabase
        .from("fifty_scripts_leads")
        .select("*", { count: "exact", head: true })
        .eq("assigned_to", user.id);

      const { count: mpm } = await supabase
        .from("mpm_leads")
        .select("*", { count: "exact", head: true })
        .eq("assigned_to", user.id);

      const { count: teste } = await supabase
        .from("teste_leads")
        .select("*", { count: "exact", head: true })
        .eq("assigned_to", user.id);

      const totalLeads = (fiftyScripts || 0) + (mpm || 0) + (teste || 0);

      // Leads qualificados
      const { count: qualifiedFifty } = await supabase
        .from("fifty_scripts_leads")
        .select("*", { count: "exact", head: true })
        .eq("assigned_to", user.id)
        .eq("qualified", true);

      const { count: qualifiedMpm } = await supabase
        .from("mpm_leads")
        .select("*", { count: "exact", head: true })
        .eq("assigned_to", user.id)
        .eq("qualified", true);

      const { count: qualifiedTeste } = await supabase
        .from("teste_leads")
        .select("*", { count: "exact", head: true })
        .eq("assigned_to", user.id)
        .eq("qualified", true);

      const qualifiedLeads = (qualifiedFifty || 0) + (qualifiedMpm || 0) + (qualifiedTeste || 0);

      // Tarefas pendentes
      const { count: pendingTasks } = await supabase
        .from("sdr_tasks")
        .select("*", { count: "exact", head: true })
        .eq("sdr_id", user.id)
        .eq("status", "pending");

      // Tarefas completadas hoje
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { count: completedToday } = await supabase
        .from("sdr_tasks")
        .select("*", { count: "exact", head: true })
        .eq("sdr_id", user.id)
        .eq("status", "completed")
        .gte("completed_at", today.toISOString());

      setMetrics({
        totalLeads,
        qualifiedLeads,
        pendingTasks: pendingTasks || 0,
        completedToday: completedToday || 0,
      });
    } catch (error) {
      console.error("Error fetching metrics:", error);
      toast.error("Erro ao carregar métricas");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Dashboard SDR</h1>
            <p className="text-muted-foreground">
              Gerencie seus leads e tarefas
            </p>
          </div>
          <Button onClick={() => setShowCreateLead(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Lead
          </Button>
        </div>

        <SDRMetrics
          totalLeads={metrics.totalLeads}
          qualifiedLeads={metrics.qualifiedLeads}
          pendingTasks={metrics.pendingTasks}
          completedToday={metrics.completedToday}
          loading={loading}
        />

        <Tabs defaultValue="leads" className="space-y-4">
          <TabsList>
            <TabsTrigger value="leads">Meus Leads</TabsTrigger>
            <TabsTrigger value="tasks">Tarefas</TabsTrigger>
          </TabsList>

          <TabsContent value="leads" className="space-y-4">
            <SDRLeadsTable onRefresh={handleRefresh} />
          </TabsContent>

          <TabsContent value="tasks" className="space-y-4">
            <SDRTasksPanel onRefresh={handleRefresh} />
          </TabsContent>
        </Tabs>

        <CreateLeadDialog
          open={showCreateLead}
          onOpenChange={setShowCreateLead}
          onLeadCreated={handleRefresh}
        />
      </div>
    </DashboardLayout>
  );
}
