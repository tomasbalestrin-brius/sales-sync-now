import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, RefreshCw, CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { AssignLeadDialog } from "@/components/AssignLeadDialog";
import { BulkAssignLeadsDialog } from "@/components/BulkAssignLeadsDialog";
import { useUserRole } from "@/hooks/useUserRole";

interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  source: string;
  status: string;
  form_submitted_at: string | null;
  created_at: string;
  assigned_to: string | null;
  profiles?: {
    full_name: string;
  };
}

export default function FiftyScripts() {
  const { role } = useUserRole();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncActive, setSyncActive] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [syncDate, setSyncDate] = useState<Date | undefined>(new Date());
  const [viewMode, setViewMode] = useState<"current" | "all">("current");
  const [syncMode, setSyncMode] = useState<"month" | "day">("day");
  const [viewFilterMode, setViewFilterMode] = useState<"month" | "day">("month");
  const [filterBySdr, setFilterBySdr] = useState<string>("all");
  const [sdrs, setSdrs] = useState<Array<{ id: string; full_name: string }>>([]);
  const [syncedLeads, setSyncedLeads] = useState<Lead[]>([]);

  useEffect(() => {
    fetchLeads();
    fetchSyncStatus();
    if (role === "admin" || role === "gestor") {
      fetchSdrs();
    }

    const channel = supabase
      .channel("fifty-scripts-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "fifty_scripts_leads" }, () => {
        fetchLeads();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedMonth, viewMode, viewFilterMode, filterBySdr, role]);

  const fetchSdrs = async () => {
    try {
      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "sdr");

      if (rolesError) throw rolesError;

      const sdrIds = rolesData.map((r) => r.user_id);

      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", sdrIds);

      if (profilesError) throw profilesError;

      setSdrs(profilesData || []);
    } catch (error: any) {
      console.error("Erro ao buscar SDRs:", error);
    }
  };

  const fetchSyncStatus = async () => {
    try {
      const { data, error } = await supabase
        .from("sync_config")
        .select("is_active")
        .eq("product_name", "50 Scripts")
        .single();

      if (!error && data) {
        setSyncActive(data.is_active);
      }
    } catch (error: any) {
      console.error("Erro ao buscar status de sincronização:", error);
    }
  };

  const fetchLeads = async () => {
    try {
      let query = supabase
        .from("fifty_scripts_leads")
        .select("*");

      // SDRs only see their assigned leads (RLS will handle this, but we add explicit filter)
      if (role === "sdr") {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          query = query.eq("assigned_to", user.id);
        }
      }

      // Filter by SDR if selected (only for admin/gestor)
      if (filterBySdr !== "all" && (role === "admin" || role === "gestor")) {
        if (filterBySdr === "unassigned") {
          query = query.is("assigned_to", null);
        } else {
          query = query.eq("assigned_to", filterBySdr);
        }
      }

      // Filter by selected period if in current mode
      if (viewMode === "current" && selectedMonth) {
        if (viewFilterMode === "month") {
          const startDate = startOfMonth(selectedMonth);
          const endDate = endOfMonth(selectedMonth);
          
          query = query
            .gte("form_submitted_at", startDate.toISOString())
            .lte("form_submitted_at", endDate.toISOString());
        } else {
          // Filter by specific day
          const startOfDay = new Date(selectedMonth);
          startOfDay.setHours(0, 0, 0, 0);
          
          const endOfDay = new Date(selectedMonth);
          endOfDay.setHours(23, 59, 59, 999);
          
          query = query
            .gte("form_submitted_at", startOfDay.toISOString())
            .lte("form_submitted_at", endOfDay.toISOString());
        }
      }

      const { data, error } = await query.order("form_submitted_at", { ascending: false });

      if (error) throw error;
      
      // Fetch profile names for assigned leads
      const leadsWithProfiles = await Promise.all(
        (data || []).map(async (lead) => {
          if (lead.assigned_to) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("id", lead.assigned_to)
              .single();
            
            return { ...lead, profiles: profile };
          }
          return lead;
        })
      );
      
      setLeads(leadsWithProfiles);
    } catch (error: any) {
      toast.error("Erro ao carregar leads: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredLeads = leads.filter(
    (lead) =>
      lead.name.toLowerCase().includes(search.toLowerCase()) ||
      lead.email?.toLowerCase().includes(search.toLowerCase()) ||
      lead.phone?.includes(search)
  );

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      novo: "bg-primary",
      contatado: "bg-accent",
      agendado: "bg-warning",
      finalizado: "bg-success",
    };
    return colors[status] || "bg-muted";
  };

  const toggleSync = async () => {
    try {
      const { error } = await supabase
        .from("sync_config")
        .update({ is_active: !syncActive })
        .eq("product_name", "50 Scripts");

      if (error) throw error;

      setSyncActive(!syncActive);
      toast.success(
        syncActive ? "Sincronização pausada" : "Sincronização ativada"
      );
    } catch (error: any) {
      toast.error("Erro ao alterar status: " + error.message);
    }
  };

  const syncGoogleSheets = async () => {
    if (!syncActive) {
      toast.error("Sincronização está pausada. Ative-a primeiro.");
      return;
    }

    if (!syncDate) {
      toast.error("Selecione uma data para sincronizar.");
      return;
    }

    setSyncing(true);
    setSyncedLeads([]); // Clear previous synced leads
    try {
      const body = syncMode === "month" 
        ? { targetMonth: format(syncDate, "yyyy-MM") }
        : { targetDate: format(syncDate, "yyyy-MM-dd") };

      const { data, error } = await supabase.functions.invoke("sync-google-sheets", {
        body,
      });
      
      if (error) throw error;
      
      if (data?.success) {
        const dateStr = syncMode === "month"
          ? format(syncDate, "MMMM 'de' yyyy", { locale: ptBR })
          : format(syncDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
        
        toast.success(
          `Sincronização concluída! ${data.stats.inserted} novos leads, ${data.stats.skipped} ignorados para ${dateStr}.`
        );
        
        // Fetch the newly synced leads
        if (data.stats.inserted > 0) {
          const { data: newLeads } = await supabase
            .from("fifty_scripts_leads")
            .select("*")
            .is("assigned_to", null)
            .order("created_at", { ascending: false })
            .limit(data.stats.inserted);
          
          if (newLeads) {
            setSyncedLeads(newLeads);
          }
        }
        
        fetchLeads();
      } else {
        throw new Error(data?.error || "Erro desconhecido");
      }
    } catch (error: any) {
      toast.error("Erro ao sincronizar: " + error.message);
    } finally {
      setSyncing(false);
    }
  };

  // Generate list of months for quick selection
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const date = subMonths(new Date(), i);
    return {
      value: date,
      label: format(date, "MMMM 'de' yyyy", { locale: ptBR }),
    };
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">50 Scripts</h1>
            <p className="text-muted-foreground">
              Gerencie leads do produto 50 Scripts
            </p>
          </div>
          <div className="flex gap-2">
            {(role === "admin" || role === "gestor") && (
              <>
                <Button 
                  variant={syncActive ? "destructive" : "default"} 
                  onClick={toggleSync}
                >
                  {syncActive ? "Pausar Sincronização" : "Ativar Sincronização"}
                </Button>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Lead
                </Button>
              </>
            )}
          </div>
        </div>

        <Tabs defaultValue="base" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
            <TabsTrigger value="base">Base de Leads</TabsTrigger>
            <TabsTrigger value="sync">Sincronização</TabsTrigger>
          </TabsList>

          {/* Base de Leads Tab */}
          <TabsContent value="base" className="space-y-6">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar leads..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>

              {(role === "admin" || role === "gestor") && (
                <>
                  <BulkAssignLeadsDialog onAssigned={fetchLeads} />
                  <Select
                    value={filterBySdr}
                    onValueChange={(value) => setFilterBySdr(value)}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Filtrar por SDR" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os SDRs</SelectItem>
                      <SelectItem value="unassigned">Não atribuídos</SelectItem>
                      {sdrs.map((sdr) => (
                        <SelectItem key={sdr.id} value={sdr.id}>
                          {sdr.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              )}
              
              <Select
                value={viewMode}
                onValueChange={(value: "current" | "all") => setViewMode(value)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current">Filtrar Período</SelectItem>
                  <SelectItem value="all">Todos os Leads</SelectItem>
                </SelectContent>
              </Select>

              {viewMode === "current" && (
                <>
                  <Select
                    value={viewFilterMode}
                    onValueChange={(value: "month" | "day") => setViewFilterMode(value)}
                  >
                    <SelectTrigger className="w-[150px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="month">Por Mês</SelectItem>
                      <SelectItem value="day">Por Dia</SelectItem>
                    </SelectContent>
                  </Select>

                  {viewFilterMode === "month" ? (
                    <Select
                      value={selectedMonth.toISOString()}
                      onValueChange={(value) => setSelectedMonth(new Date(value))}
                    >
                      <SelectTrigger className="w-[220px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {monthOptions.map((option) => (
                          <SelectItem key={option.value.toISOString()} value={option.value.toISOString()}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-[220px] justify-start text-left font-normal"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {format(selectedMonth, "dd/MM/yyyy")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={selectedMonth}
                          onSelect={(date) => date && setSelectedMonth(date)}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                </>
              )}
            </div>

            {/* Stats Card */}
            <Card className="p-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total de Leads</p>
                  <p className="text-2xl font-bold">{filteredLeads.length}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Novos</p>
                  <p className="text-2xl font-bold">
                    {filteredLeads.filter((l) => l.status === "novo").length}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Agendados</p>
                  <p className="text-2xl font-bold">
                    {filteredLeads.filter((l) => l.status === "agendado").length}
                  </p>
                </div>
              </div>
            </Card>

            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Atribuído a</TableHead>
                    <TableHead>Preenchimento</TableHead>
                    <TableHead>Cadastro</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center">
                        Carregando...
                      </TableCell>
                    </TableRow>
                  ) : filteredLeads.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center">
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
                          <Badge variant="outline">{lead.source}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(lead.status)}>
                            {lead.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {lead.profiles ? (
                            <Badge variant="outline">{lead.profiles.full_name}</Badge>
                          ) : (
                            <span className="text-muted-foreground">Não atribuído</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {lead.form_submitted_at
                            ? new Date(lead.form_submitted_at).toLocaleDateString("pt-BR")
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {new Date(lead.created_at).toLocaleDateString("pt-BR")}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            {(role === "admin" || role === "gestor") && (
                              <AssignLeadDialog
                                leadId={lead.id}
                                currentAssignedTo={lead.assigned_to || undefined}
                                onAssigned={fetchLeads}
                              />
                            )}
                            <Button variant="ghost" size="sm">
                              Agendar Call
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          {/* Sincronização Tab */}
          <TabsContent value="sync" className="space-y-6">
            {(role === "admin" || role === "gestor") ? (
              <>
                <Card className="p-6">
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-2xl font-bold mb-2">Sincronizar Leads do Google Sheets</h2>
                      <p className="text-muted-foreground">
                        Importe leads de um período específico da planilha do Google Sheets
                      </p>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">
                          Modo de sincronização
                        </label>
                        <Select
                          value={syncMode}
                          onValueChange={(value: "month" | "day") => setSyncMode(value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="month">Importar Mês Inteiro</SelectItem>
                            <SelectItem value="day">Importar Dia Específico</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">
                          {syncMode === "month" ? "Selecionar mês" : "Selecionar dia"}
                        </label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !syncDate && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {syncDate 
                                ? syncMode === "month"
                                  ? format(syncDate, "MMMM 'de' yyyy", { locale: ptBR })
                                  : format(syncDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                                : "Selecione uma data"
                              }
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={syncDate}
                              onSelect={setSyncDate}
                              initialFocus
                              className={cn("p-3 pointer-events-auto")}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button 
                        onClick={syncGoogleSheets} 
                        disabled={syncing || !syncActive}
                        size="lg"
                      >
                        <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                        {syncing ? "Sincronizando..." : "Sincronizar"}
                      </Button>
                    </div>

                    {!syncActive && (
                      <div className="p-4 bg-warning/10 border border-warning rounded-lg">
                        <p className="text-sm text-warning-foreground">
                          ⚠️ Sincronização está pausada. Ative-a no botão do topo da página.
                        </p>
                      </div>
                    )}
                  </div>
                </Card>

                {/* Synced Leads List */}
                {syncedLeads.length > 0 && (
                  <Card>
                    <div className="p-4 border-b flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold">
                          Leads Sincronizados ({syncedLeads.length})
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Leads recém-importados aguardando atribuição
                        </p>
                      </div>
                      <BulkAssignLeadsDialog onAssigned={() => {
                        fetchLeads();
                        setSyncedLeads([]);
                      }} />
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>E-mail</TableHead>
                          <TableHead>Telefone</TableHead>
                          <TableHead>Origem</TableHead>
                          <TableHead>Data Formulário</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {syncedLeads.map((lead) => (
                          <TableRow key={lead.id}>
                            <TableCell className="font-medium">{lead.name}</TableCell>
                            <TableCell>{lead.email || "-"}</TableCell>
                            <TableCell>{lead.phone || "-"}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{lead.source}</Badge>
                            </TableCell>
                            <TableCell>
                              {lead.form_submitted_at
                                ? new Date(lead.form_submitted_at).toLocaleDateString("pt-BR")
                                : "-"}
                            </TableCell>
                            <TableCell className="text-right">
                              <AssignLeadDialog
                                leadId={lead.id}
                                currentAssignedTo={lead.assigned_to || undefined}
                                onAssigned={() => {
                                  fetchLeads();
                                  setSyncedLeads(syncedLeads.filter(l => l.id !== lead.id));
                                }}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Card>
                )}
              </>
            ) : (
              <Card className="p-6 text-center">
                <p className="text-muted-foreground">
                  Você não tem permissão para acessar a sincronização
                </p>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
