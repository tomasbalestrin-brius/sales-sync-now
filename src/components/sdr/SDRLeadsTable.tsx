import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Search, Eye } from "lucide-react";
import { toast } from "sonner";
import { LeadDetailsDialog } from "./LeadDetailsDialog";

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  qualified: boolean;
  created_at: string;
  funnel: string;
  tableName: string;
  notes: string;
  instagram_profissional: string;
  negocio: string;
  nicho_negocio: string;
  funcao_negocio: string;
  faturamento_mensal: string;
  lucro_liquido_mensal: string;
}

interface SDRLeadsTableProps {
  onRefresh: () => void;
}

export function SDRLeadsTable({ onRefresh }: SDRLeadsTableProps) {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  useEffect(() => {
    fetchLeads();
  }, [user]);

  useEffect(() => {
    filterLeads();
  }, [leads, search, statusFilter]);

  const fetchLeads = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Buscar leads de todas as tabelas
      const tables = [
        { name: "fifty_scripts_leads", funnel: "50 Scripts" },
        { name: "mpm_leads", funnel: "MPM" },
        { name: "teste_leads", funnel: "Teste" },
      ];

      const allLeads: Lead[] = [];

      for (const table of tables) {
        const { data, error } = await supabase
          .from(table.name as any)
          .select("*")
          .eq("assigned_to", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;

        if (data) {
          const formattedLeads = data.map((lead: any) => ({
            ...lead,
            funnel: table.funnel,
            tableName: table.name,
          }));
          allLeads.push(...formattedLeads);
        }
      }

      setLeads(allLeads);
    } catch (error) {
      console.error("Error fetching leads:", error);
      toast.error("Erro ao carregar leads");
    } finally {
      setLoading(false);
    }
  };

  const filterLeads = () => {
    let filtered = leads;

    if (search) {
      filtered = filtered.filter(
        (lead) =>
          lead.name.toLowerCase().includes(search.toLowerCase()) ||
          lead.email?.toLowerCase().includes(search.toLowerCase()) ||
          lead.phone?.includes(search)
      );
    }

    if (statusFilter !== "all") {
      if (statusFilter === "qualified") {
        filtered = filtered.filter((lead) => lead.qualified);
      } else {
        filtered = filtered.filter((lead) => lead.status === statusFilter);
      }
    }

    setFilteredLeads(filtered);
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: any }> = {
      novo: { label: "Novo", variant: "default" },
      contato: { label: "Em Contato", variant: "secondary" },
      qualificado: { label: "Qualificado", variant: "default" },
      agendado: { label: "Agendado", variant: "default" },
      perdido: { label: "Perdido", variant: "destructive" },
    };

    const statusInfo = statusMap[status] || { label: status, variant: "outline" };
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  if (loading) {
    return (
      <Card className="p-6">
        <p className="text-center text-muted-foreground">Carregando leads...</p>
      </Card>
    );
  }

  return (
    <>
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, email ou telefone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="novo">Novo</SelectItem>
                <SelectItem value="contato">Em Contato</SelectItem>
                <SelectItem value="qualified">Qualificados</SelectItem>
                <SelectItem value="agendado">Agendados</SelectItem>
                <SelectItem value="perdido">Perdidos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Funil</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Qualificado</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.length === 0 ? (
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
                        <Badge variant="outline">{lead.funnel}</Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(lead.status)}</TableCell>
                      <TableCell>
                        {lead.qualified ? (
                          <Badge variant="default" className="bg-green-600">
                            Qualificado
                          </Badge>
                        ) : (
                          <Badge variant="outline">Não</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedLead(lead)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Ver Detalhes
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </Card>

      {selectedLead && (
        <LeadDetailsDialog
          lead={selectedLead}
          open={!!selectedLead}
          onOpenChange={(open) => !open && setSelectedLead(null)}
          onUpdated={() => {
            fetchLeads();
            onRefresh();
          }}
        />
      )}
    </>
  );
}
