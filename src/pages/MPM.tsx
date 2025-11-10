import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon, Search, Download, RefreshCw, Trash2, Users, Phone, TrendingUp, CalendarRange } from "lucide-react";
import { toast } from "sonner";
import { useUserRole } from "@/hooks/useUserRole";
import { AssignLeadDialog } from "@/components/AssignLeadDialog";
import { BulkAssignLeadsDialog } from "@/components/BulkAssignLeadsDialog";

interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  source: string | null;
  status: string;
  notes: string | null;
  assigned_to: string | null;
  form_submitted_at: string;
  created_at: string;
  updated_at: string;
  assigned_user_name?: string;
}

export default function MPM() {
  const { role } = useUserRole();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [syncActive, setSyncActive] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [syncMode, setSyncMode] = useState<"month" | "day">("month");
  const [selectedSdr, setSelectedSdr] = useState<string>("all");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("all");
  const [sdrs, setSdrs] = useState<Array<{ id: string; name: string }>>([]);
  const [syncedLeads, setSyncedLeads] = useState<Lead[]>([]);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    fetchLeads();
    fetchSyncStatus();
    if (role === "admin" || role === "gestor") {
      fetchSdrs();
    }

    const channel = supabase
      .channel('mpm_leads_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mpm_leads'
        },
        () => {
          fetchLeads();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [role, selectedSdr, selectedPeriod]);

  const fetchSdrs = async () => {
    const { data, error } = await supabase
      .from("user_roles")
      .select(`
        user_id,
        profiles!inner(
          id,
          full_name
        )
      `)
      .eq("role", "sdr");

    if (error) {
      console.error("Error fetching SDRs:", error);
      return;
    }

    const sdrList = data.map((item: any) => ({
      id: item.user_id,
      name: item.profiles.full_name || "Sem nome"
    }));

    setSdrs(sdrList);
  };

  const fetchSyncStatus = async () => {
    const { data, error } = await supabase
      .from("sync_config")
      .select("is_active, last_sync_at")
      .eq("product_name", "MPM")
      .single();

    if (!error && data) {
      setSyncActive(data.is_active);
      setLastSyncAt(data.last_sync_at);
    }
  };

  const fetchLeads = async () => {
    setLoading(true);
    let query = supabase
      .from("mpm_leads")
      .select("*")
      .order("created_at", { ascending: false });

    if (role === "sdr") {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        query = query.eq("assigned_to", user.id);
      }
    } else if (selectedSdr !== "all") {
      query = query.eq("assigned_to", selectedSdr);
    }

    if (selectedPeriod !== "all") {
      const now = new Date();
      let startDate: Date;

      switch (selectedPeriod) {
        case "today":
          startDate = new Date(now.setHours(0, 0, 0, 0));
          break;
        case "week":
          startDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case "month":
          startDate = new Date(now.setMonth(now.getMonth() - 1));
          break;
        default:
          startDate = new Date(0);
      }

      query = query.gte("created_at", startDate.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching leads:", error);
      toast.error("Erro ao carregar leads");
    } else {
      const leadsWithNames = await Promise.all(
        (data || []).map(async (lead) => {
          if (lead.assigned_to) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("id", lead.assigned_to)
              .single();

            return {
              ...lead,
              assigned_user_name: profile?.full_name || "Desconhecido"
            };
          }
          return lead;
        })
      );

      setLeads(leadsWithNames);
    }
    setLoading(false);
  };

  const filteredLeads = leads.filter((lead) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      lead.name.toLowerCase().includes(searchLower) ||
      lead.email?.toLowerCase().includes(searchLower) ||
      lead.phone?.toLowerCase().includes(searchLower)
    );
  });

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      "novo": "bg-blue-500",
      "contatado": "bg-yellow-500",
      "qualificado": "bg-green-500",
      "não_qualificado": "bg-red-500",
      "agendado": "bg-purple-500"
    };
    return colors[status] || "bg-gray-500";
  };

  const toggleSync = async () => {
    const newState = !syncActive;
    const { error } = await supabase
      .from("sync_config")
      .update({ is_active: newState })
      .eq("product_name", "MPM");

    if (error) {
      toast.error("Erro ao atualizar sincronização");
    } else {
      setSyncActive(newState);
      toast.success(newState ? "Sincronização ativada" : "Sincronização desativada");
    }
  };

  const removeDuplicates = async () => {
    try {
      // Remove duplicates based on email and phone
      const { data: duplicates, error: queryError } = await supabase
        .from('mpm_leads')
        .select('email, phone')
        .not('email', 'is', null);

      if (queryError) throw queryError;

      // Delete duplicates keeping only the first occurrence
      if (duplicates && duplicates.length > 0) {
        for (const dup of duplicates) {
          const { data: leads, error: leadsError } = await supabase
            .from('mpm_leads')
            .select('id')
            .or(`email.eq.${dup.email},phone.eq.${dup.phone}`)
            .order('created_at', { ascending: true });

          if (leadsError) throw leadsError;

          if (leads && leads.length > 1) {
            const idsToDelete = leads.slice(1).map(l => l.id);
            const { error: deleteError } = await supabase
              .from('mpm_leads')
              .delete()
              .in('id', idsToDelete);

            if (deleteError) throw deleteError;
          }
        }
      }

      toast.success("Duplicatas removidas com sucesso!");
      fetchLeads();
    } catch (error) {
      console.error("Error removing duplicates:", error);
      toast.error("Erro ao remover duplicatas");
    }
  };

  const syncGoogleSheets = async () => {
    setSyncing(true);
    try {
      const payload = syncMode === "month"
        ? { targetMonth: selectedDate ? format(selectedDate, "yyyy-MM") : format(new Date(), "yyyy-MM"), productName: "MPM" }
        : { targetDate: selectedDate ? format(selectedDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"), productName: "MPM" };

      const response = await supabase.functions.invoke('sync-google-sheets', {
        body: payload
      });

      if (response.error) throw response.error;

      toast.success(`Sincronização concluída! ${response.data.newLeadsCount} novos leads importados.`);
      
      const { data: newLeads } = await supabase
        .from("mpm_leads")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(response.data.newLeadsCount);

      if (newLeads) {
        setSyncedLeads(newLeads);
      }

      fetchLeads();
      fetchSyncStatus();
    } catch (error) {
      console.error("Sync error:", error);
      toast.error("Erro ao sincronizar planilha");
    } finally {
      setSyncing(false);
    }
  };

  const stats = {
    total: leads.length,
    novo: leads.filter(l => l.status === "novo").length,
    contatado: leads.filter(l => l.status === "contatado").length,
    qualificado: leads.filter(l => l.status === "qualificado").length,
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">MPM</h1>
          <p className="text-muted-foreground">
            Gerencie e acompanhe seus leads do funil MPM
          </p>
        </div>

        <Tabs defaultValue="leads" className="space-y-4">
          <TabsList>
            <TabsTrigger value="leads">Base de Leads</TabsTrigger>
            {(role === "admin" || role === "gestor") && (
              <TabsTrigger value="sync">Sincronização</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="leads" className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, email ou telefone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              {(role === "admin" || role === "gestor") && (
                <>
                  <Select value={selectedSdr} onValueChange={setSelectedSdr}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Filtrar por SDR" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os SDRs</SelectItem>
                      {sdrs.map((sdr) => (
                        <SelectItem key={sdr.id} value={sdr.id}>
                          {sdr.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              )}
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="today">Hoje</SelectItem>
                  <SelectItem value="week">Última semana</SelectItem>
                  <SelectItem value="month">Último mês</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <Card className="p-6">
                <div className="flex items-center gap-4">
                  <div className="rounded-full bg-primary/10 p-3">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total de Leads</p>
                    <p className="text-2xl font-bold">{stats.total}</p>
                  </div>
                </div>
              </Card>
              <Card className="p-6">
                <div className="flex items-center gap-4">
                  <div className="rounded-full bg-blue-500/10 p-3">
                    <TrendingUp className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Novos</p>
                    <p className="text-2xl font-bold">{stats.novo}</p>
                  </div>
                </div>
              </Card>
              <Card className="p-6">
                <div className="flex items-center gap-4">
                  <div className="rounded-full bg-yellow-500/10 p-3">
                    <Phone className="h-5 w-5 text-yellow-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Contatados</p>
                    <p className="text-2xl font-bold">{stats.contatado}</p>
                  </div>
                </div>
              </Card>
              <Card className="p-6">
                <div className="flex items-center gap-4">
                  <div className="rounded-full bg-green-500/10 p-3">
                    <TrendingUp className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Qualificados</p>
                    <p className="text-2xl font-bold">{stats.qualificado}</p>
                  </div>
                </div>
              </Card>
            </div>

            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Atribuído a</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center">
                        Carregando...
                      </TableCell>
                    </TableRow>
                  ) : filteredLeads.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center">
                        Nenhum lead encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLeads.map((lead) => (
                      <TableRow key={lead.id}>
                        <TableCell className="font-medium">{lead.name}</TableCell>
                        <TableCell>{lead.email || "-"}</TableCell>
                        <TableCell>{lead.phone || "-"}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(lead.status)}>
                            {lead.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{lead.assigned_user_name || "Não atribuído"}</TableCell>
                        <TableCell>-</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          {(role === "admin" || role === "gestor") && (
            <TabsContent value="sync" className="space-y-4">
              <Card className="p-6">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">Sincronização Automática</h3>
                      <p className="text-sm text-muted-foreground">
                        Sincronize automaticamente com o Google Sheets
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={syncActive}
                        onCheckedChange={toggleSync}
                      />
                      <Label>{syncActive ? "Ativa" : "Inativa"}</Label>
                    </div>
                  </div>

                  {lastSyncAt && (
                    <p className="text-sm text-muted-foreground">
                      Última sincronização: {format(new Date(lastSyncAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  )}

                  <div className="space-y-4">
                    <div>
                      <Label>Modo de Sincronização</Label>
                      <Select value={syncMode} onValueChange={(value: "month" | "day") => setSyncMode(value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="month">Por Mês</SelectItem>
                          <SelectItem value="day">Por Dia</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Selecione a {syncMode === "month" ? "Mês" : "Data"}</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start text-left font-normal">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {selectedDate ? format(selectedDate, syncMode === "month" ? "MMMM yyyy" : "dd/MM/yyyy", { locale: ptBR }) : "Selecionar"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={setSelectedDate}
                            initialFocus
                            locale={ptBR}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="flex gap-2">
                      <Button onClick={syncGoogleSheets} disabled={syncing} className="flex-1">
                        <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                        {syncing ? "Sincronizando..." : "Sincronizar Agora"}
                      </Button>
                      <Button variant="destructive" onClick={removeDuplicates}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remover Duplicatas
                      </Button>
                    </div>
                  </div>

                  {syncedLeads.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-semibold">Leads Sincronizados ({syncedLeads.length})</h4>
                      <div className="max-h-64 overflow-y-auto rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Nome</TableHead>
                              <TableHead>Email</TableHead>
                              <TableHead>Telefone</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {syncedLeads.map((lead) => (
                              <TableRow key={lead.id}>
                                <TableCell>{lead.name}</TableCell>
                                <TableCell>{lead.email || "-"}</TableCell>
                                <TableCell>{lead.phone || "-"}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>

    </DashboardLayout>
  );
}
