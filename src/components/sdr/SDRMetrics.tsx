import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Users, CheckCircle, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface SDRMetricsProps {
  totalLeads: number;
  qualifiedLeads: number;
  pendingTasks: number;
  completedToday: number;
  loading: boolean;
}

export function SDRMetrics({
  totalLeads,
  qualifiedLeads,
  pendingTasks,
  completedToday,
  loading,
}: SDRMetricsProps) {
  const qualificationRate = totalLeads > 0 ? ((qualifiedLeads / totalLeads) * 100).toFixed(1) : "0";

  const metrics = [
    {
      title: "Total de Leads",
      value: totalLeads,
      icon: Users,
      description: "Leads atribuídos a você",
    },
    {
      title: "Taxa de Qualificação",
      value: `${qualificationRate}%`,
      icon: TrendingUp,
      description: `${qualifiedLeads} leads qualificados`,
    },
    {
      title: "Tarefas Pendentes",
      value: pendingTasks,
      icon: Clock,
      description: "Tarefas a fazer",
    },
    {
      title: "Concluídas Hoje",
      value: completedToday,
      icon: CheckCircle,
      description: "Tarefas finalizadas hoje",
    },
  ];

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-1" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric) => {
        const Icon = metric.icon;
        return (
          <Card key={metric.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {metric.title}
              </CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
              <p className="text-xs text-muted-foreground">
                {metric.description}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
