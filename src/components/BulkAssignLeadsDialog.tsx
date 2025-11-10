import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";

interface BulkAssignLeadsDialogProps {
  onAssigned: () => void;
  tableName: "fifty_scripts_leads" | "mpm_leads" | "teste_leads";
}

export function BulkAssignLeadsDialog({ onAssigned, tableName }: BulkAssignLeadsDialogProps) {
  const [open, setOpen] = useState(false);
  const [sdrs, setSdrs] = useState<Array<{ id: string; full_name: string }>>([]);
  const [selectedSdr, setSelectedSdr] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("20");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchSdrs();
    }
  }, [open]);

  const fetchSdrs = async () => {
    try {
      // Buscar todos os SDRs
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
      toast.error("Erro ao carregar SDRs: " + error.message);
    }
  };

  const handleBulkAssign = async () => {
    if (!selectedSdr) {
      toast.error("Selecione um SDR");
      return;
    }

    const qty = parseInt(quantity);
    if (isNaN(qty) || qty <= 0) {
      toast.error("Digite um número válido de leads");
      return;
    }

    setLoading(true);
    try {
      // Buscar leads não atribuídos
      const { data: unassignedLeads, error: fetchError } = await supabase
        .from(tableName)
        .select("id")
        .is("assigned_to", null)
        .order("form_submitted_at", { ascending: false })
        .limit(qty);

      if (fetchError) throw fetchError;

      if (!unassignedLeads || unassignedLeads.length === 0) {
        toast.error("Não há leads não atribuídos disponíveis");
        return;
      }

      // Atribuir os leads ao SDR selecionado
      const leadIds = unassignedLeads.map((lead) => lead.id);
      
      const { error: updateError } = await supabase
        .from(tableName)
        .update({ assigned_to: selectedSdr })
        .in("id", leadIds);

      if (updateError) throw updateError;

      const sdrName = sdrs.find((s) => s.id === selectedSdr)?.full_name;
      toast.success(
        `${leadIds.length} lead${leadIds.length > 1 ? "s" : ""} atribuído${leadIds.length > 1 ? "s" : ""} a ${sdrName}`
      );
      
      setOpen(false);
      setSelectedSdr("");
      setQuantity("20");
      onAssigned();
    } catch (error: any) {
      toast.error("Erro ao atribuir leads: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <UserPlus className="h-4 w-4 mr-2" />
          Atribuir Leads em Massa
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Atribuir Leads em Massa</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="sdr-select">Selecionar SDR</Label>
            <Select value={selectedSdr} onValueChange={setSelectedSdr}>
              <SelectTrigger id="sdr-select">
                <SelectValue placeholder="Escolha um SDR" />
              </SelectTrigger>
              <SelectContent>
                {sdrs.map((sdr) => (
                  <SelectItem key={sdr.id} value={sdr.id}>
                    {sdr.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="quantity">Quantidade de Leads</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Ex: 20"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Serão atribuídos os leads mais recentes não atribuídos
            </p>
          </div>
          <Button onClick={handleBulkAssign} disabled={loading} className="w-full">
            {loading ? "Atribuindo..." : "Atribuir Leads"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
