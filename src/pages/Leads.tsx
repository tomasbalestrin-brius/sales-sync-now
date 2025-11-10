import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  source: string;
  status: string;
  created_at: string;
}

export default function Leads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    fetchLeads();

    const channel = supabase
      .channel("leads-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "leads" }, () => {
        fetchLeads();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchLeads = async () => {
    try {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setLeads(data || []);
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

  const syncGoogleSheets = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-google-sheets");
      
      if (error) throw error;
      
      if (data?.success) {
        toast.success(
          `Sincronização concluída! ${data.stats.inserted} novos leads, ${data.stats.skipped} ignorados.`
        );
      } else {
        throw new Error(data?.error || "Erro desconhecido");
      }
    } catch (error: any) {
      toast.error("Erro ao sincronizar: " + error.message);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Leads</h1>
            <p className="text-muted-foreground">Gerencie seus leads</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={syncGoogleSheets} disabled={syncing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              Sincronizar Planilha
            </Button>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Lead
            </Button>
          </div>
        </div>

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
        </div>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Ações</TableHead>
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
                      <Badge variant="outline">{lead.source}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(lead.status)}>
                        {lead.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(lead.created_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        Agendar Call
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </DashboardLayout>
  );
}
