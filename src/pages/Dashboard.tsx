import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Users, Calendar, TrendingUp, DollarSign } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface FunnelStats {
  totalLeads: number;
  novoLeads: number;
  contatadoLeads: number;
  qualificadoLeads: number;
  agendadoLeads: number;
}

interface Stats {
  fiftyScripts: FunnelStats;
  mpm: FunnelStats;
  teste: FunnelStats;
  scheduledCalls: number;
  completedCalls: number;
  totalSales: number;
  totalRevenue: number;
  attendanceRate: number;
  conversionRate: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    fiftyScripts: {
      totalLeads: 0,
      novoLeads: 0,
      contatadoLeads: 0,
      qualificadoLeads: 0,
      agendadoLeads: 0,
    },
    mpm: {
      totalLeads: 0,
      novoLeads: 0,
      contatadoLeads: 0,
      qualificadoLeads: 0,
      agendadoLeads: 0,
    },
    teste: {
      totalLeads: 0,
      novoLeads: 0,
      contatadoLeads: 0,
      qualificadoLeads: 0,
      agendadoLeads: 0,
    },
    scheduledCalls: 0,
    completedCalls: 0,
    totalSales: 0,
    totalRevenue: 0,
    attendanceRate: 0,
    conversionRate: 0,
  });

  useEffect(() => {
    fetchStats();

    // Set up realtime subscriptions
    const fiftyScriptsChannel = supabase
      .channel("dashboard-fifty-scripts")
      .on("postgres_changes", { event: "*", schema: "public", table: "fifty_scripts_leads" }, fetchStats)
      .subscribe();

    const mpmChannel = supabase
      .channel("dashboard-mpm")
      .on("postgres_changes", { event: "*", schema: "public", table: "mpm_leads" }, fetchStats)
      .subscribe();

    const testeChannel = supabase
      .channel("dashboard-teste")
      .on("postgres_changes", { event: "*", schema: "public", table: "teste_leads" }, fetchStats)
      .subscribe();

    const callsChannel = supabase
      .channel("dashboard-calls")
      .on("postgres_changes", { event: "*", schema: "public", table: "calls" }, fetchStats)
      .subscribe();

    const salesChannel = supabase
      .channel("dashboard-sales")
      .on("postgres_changes", { event: "*", schema: "public", table: "sales" }, fetchStats)
      .subscribe();

    return () => {
      supabase.removeChannel(fiftyScriptsChannel);
      supabase.removeChannel(mpmChannel);
      supabase.removeChannel(testeChannel);
      supabase.removeChannel(callsChannel);
      supabase.removeChannel(salesChannel);
    };
  }, []);

  const fetchStats = async () => {
    // Fetch 50 Scripts leads
    const { data: fiftyScriptsLeads } = await supabase
      .from("fifty_scripts_leads")
      .select("id, status");

    // Fetch MPM leads
    const { data: mpmLeads } = await supabase
      .from("mpm_leads")
      .select("id, status");

    // Fetch Teste leads
    const { data: testeLeads } = await supabase
      .from("teste_leads")
      .select("id, status");

    const { data: calls } = await supabase.from("calls").select("id, status");
    const { data: sales } = await supabase.from("sales").select("id, value");

    const scheduledCalls = calls?.filter((c) => c.status === "agendada").length || 0;
    const completedCalls = calls?.filter((c) => c.status === "realizada").length || 0;
    const totalSales = sales?.length || 0;
    const totalRevenue = sales?.reduce((sum, s) => sum + Number(s.value), 0) || 0;

    const attendanceRate = scheduledCalls > 0 
      ? (completedCalls / scheduledCalls) * 100 
      : 0;
    
    const conversionRate = completedCalls > 0 
      ? (totalSales / completedCalls) * 100 
      : 0;

    const calculateFunnelStats = (leads: any[]): FunnelStats => ({
      totalLeads: leads?.length || 0,
      novoLeads: leads?.filter((l) => l.status === "novo").length || 0,
      contatadoLeads: leads?.filter((l) => l.status === "contatado").length || 0,
      qualificadoLeads: leads?.filter((l) => l.status === "qualificado").length || 0,
      agendadoLeads: leads?.filter((l) => l.status === "agendado").length || 0,
    });

    setStats({
      fiftyScripts: calculateFunnelStats(fiftyScriptsLeads || []),
      mpm: calculateFunnelStats(mpmLeads || []),
      teste: calculateFunnelStats(testeLeads || []),
      scheduledCalls,
      completedCalls,
      totalSales,
      totalRevenue,
      attendanceRate,
      conversionRate,
    });
  };

  const totalLeads = stats.fiftyScripts.totalLeads + stats.mpm.totalLeads + stats.teste.totalLeads;

  const funnelChartData = [
    { name: "50 Scripts", value: stats.fiftyScripts.totalLeads },
    { name: "MPM", value: stats.mpm.totalLeads },
    { name: "Teste", value: stats.teste.totalLeads },
  ];

  const FunnelCard = ({ title, funnelStats }: { title: string; funnelStats: FunnelStats }) => (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Total de Leads</span>
            <span className="text-2xl font-bold">{funnelStats.totalLeads}</span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Novos</span>
              <span className="font-medium">{funnelStats.novoLeads}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Contatados</span>
              <span className="font-medium">{funnelStats.contatadoLeads}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Qualificados</span>
              <span className="font-medium">{funnelStats.qualificadoLeads}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Agendados</span>
              <span className="font-medium">{funnelStats.agendadoLeads}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Visão geral do desempenho</p>
        </div>

        {/* Indicadores Gerais */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Leads</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalLeads}</div>
              <p className="text-xs text-muted-foreground">todos os funis</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Calls Agendadas</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.scheduledCalls}</div>
              <p className="text-xs text-muted-foreground">
                {stats.completedCalls} realizadas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Taxa de Comparecimento</CardTitle>
              <TrendingUp className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.attendanceRate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">calls realizadas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
              <DollarSign className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(stats.totalRevenue)}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.totalSales} vendas • {stats.conversionRate.toFixed(1)}% conversão
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Indicadores por Funil */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Leads por Funil</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <FunnelCard title="50 Scripts" funnelStats={stats.fiftyScripts} />
            <FunnelCard title="MPM" funnelStats={stats.mpm} />
            <FunnelCard title="Teste" funnelStats={stats.teste} />
          </div>
        </div>

        {/* Gráfico de Comparação de Funis */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição de Leads por Funil</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={funnelChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
