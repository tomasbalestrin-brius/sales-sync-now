import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Users, Calendar, TrendingUp, DollarSign } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface Stats {
  totalLeads: number;
  scheduledCalls: number;
  completedCalls: number;
  totalSales: number;
  totalRevenue: number;
  attendanceRate: number;
  conversionRate: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    totalLeads: 0,
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
    const leadsChannel = supabase
      .channel("dashboard-fifty-scripts")
      .on("postgres_changes", { event: "*", schema: "public", table: "fifty_scripts_leads" }, fetchStats)
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
      supabase.removeChannel(leadsChannel);
      supabase.removeChannel(callsChannel);
      supabase.removeChannel(salesChannel);
    };
  }, []);

  const fetchStats = async () => {
    const { data: leads } = await supabase.from("fifty_scripts_leads").select("id");
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

    setStats({
      totalLeads: leads?.length || 0,
      scheduledCalls,
      completedCalls,
      totalSales,
      totalRevenue,
      attendanceRate,
      conversionRate,
    });
  };

  const chartData = [
    { name: "Agendadas", value: stats.scheduledCalls },
    { name: "Realizadas", value: stats.completedCalls },
    { name: "Vendas", value: stats.totalSales },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Visão geral do desempenho</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Leads</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalLeads}</div>
              <p className="text-xs text-muted-foreground">leads cadastrados</p>
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

        <Card>
          <CardHeader>
            <CardTitle>Desempenho</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
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
