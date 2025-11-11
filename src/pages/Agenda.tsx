import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Calendar, Users, Clock, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, addWeeks, startOfWeek, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Appointment {
  id: string;
  lead_name: string;
  lead_phone: string;
  funnel: string;
  scheduled_time: string;
  status: string;
  closer_id: string;
}

interface Closer {
  id: string;
  full_name: string;
}

interface DashboardStats {
  totalAppointments: number;
  todayAppointments: number;
  activeClosers: number;
}

export default function Agenda() {
  const navigate = useNavigate();
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [closers, setClosers] = useState<Closer[]>([]);
  const [selectedCloser, setSelectedCloser] = useState<string>("all");
  const [appointments, setAppointments] = useState<Record<string, Appointment[]>>({});
  const [stats, setStats] = useState<DashboardStats>({
    totalAppointments: 0,
    todayAppointments: 0,
    activeClosers: 0,
  });

  useEffect(() => {
    fetchClosers();
    fetchStats();
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [currentWeek, selectedCloser]);

  const fetchClosers = async () => {
    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "closer");
    
    if (roles) {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", roles.map(r => r.user_id));
      
      setClosers(data || []);
    }
  };

  const fetchStats = async () => {
    const today = format(new Date(), "yyyy-MM-dd");

    const { count: totalCount } = await supabase
      .from("appointments")
      .select("*", { count: "exact", head: true });

    const { count: todayCount } = await supabase
      .from("appointments")
      .select("*", { count: "exact", head: true })
      .eq("scheduled_date", today);

    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "closer");

    setStats({
      totalAppointments: totalCount || 0,
      todayAppointments: todayCount || 0,
      activeClosers: roles?.length || 0,
    });
  };

  const fetchAppointments = async () => {
    const weekDays = Array.from({ length: 5 }, (_, i) => addDays(currentWeek, i));
    const startDate = format(weekDays[0], "yyyy-MM-dd");
    const endDate = format(weekDays[4], "yyyy-MM-dd");

    let query = supabase
      .from("appointments")
      .select("*")
      .gte("scheduled_date", startDate)
      .lte("scheduled_date", endDate)
      .order("scheduled_time");

    if (selectedCloser !== "all") {
      query = query.eq("closer_id", selectedCloser);
    }

    const { data } = await query;

    const groupedAppointments: Record<string, Appointment[]> = {};
    weekDays.forEach((day) => {
      const dateStr = format(day, "yyyy-MM-dd");
      groupedAppointments[dateStr] = data?.filter(
        (apt) => apt.scheduled_date === dateStr
      ) || [];
    });

    setAppointments(groupedAppointments);
  };

  const weekDays = Array.from({ length: 5 }, (_, i) => addDays(currentWeek, i));

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Agenda de Closers</h1>
          <Button onClick={() => navigate("/agenda/novo")}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Agendamento
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Agendamentos</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalAppointments}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Agendamentos Hoje</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.todayAppointments}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Closers Ativos</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeClosers}</div>
            </CardContent>
          </Card>
        </div>

        {/* Week Navigation and Closer Filter */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentWeek(addWeeks(currentWeek, -1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium">
              {format(weekDays[0], "dd MMM", { locale: ptBR })} -{" "}
              {format(weekDays[4], "dd MMM yyyy", { locale: ptBR })}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              onClick={() => setCurrentWeek(startOfWeek(new Date(), { weekStartsOn: 1 }))}
            >
              Hoje
            </Button>
          </div>

          <Select value={selectedCloser} onValueChange={setSelectedCloser}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Closers</SelectItem>
              {closers.map((closer) => (
                <SelectItem key={closer.id} value={closer.id}>
                  {closer.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-5 gap-4">
          {weekDays.map((day) => {
            const dateStr = format(day, "yyyy-MM-dd");
            const dayAppointments = appointments[dateStr] || [];

            return (
              <Card key={dateStr} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-center">
                    {format(day, "EEE", { locale: ptBR })}
                    <br />
                    {format(day, "dd/MM")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {dayAppointments.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center">
                      Sem agendamentos
                    </p>
                  ) : (
                    dayAppointments.map((apt) => (
                      <div
                        key={apt.id}
                        className="p-2 bg-primary/10 rounded-md text-xs space-y-1"
                      >
                        <div className="font-medium">{format(new Date(`2000-01-01T${apt.scheduled_time}`), "HH:mm")}</div>
                        <div className="truncate">{apt.lead_name}</div>
                        <div className="text-muted-foreground">{apt.funnel}</div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}
