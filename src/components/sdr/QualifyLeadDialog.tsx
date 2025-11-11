import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface Closer {
  id: string;
  full_name: string;
  email: string;
}

interface QualifyLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: any;
  onQualified: () => void;
}

export function QualifyLeadDialog({
  open,
  onOpenChange,
  lead,
  onQualified,
}: QualifyLeadDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [closers, setClosers] = useState<Closer[]>([]);
  const [selectedCloser, setSelectedCloser] = useState<string>("");
  const [qualificationNotes, setQualificationNotes] = useState("");

  useEffect(() => {
    if (open) {
      fetchClosers();
    }
  }, [open]);

  const fetchClosers = async () => {
    try {
      // Buscar closers
      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "closer");

      if (rolesError) throw rolesError;

      const closerIds = rolesData.map((r) => r.user_id);

      if (closerIds.length === 0) {
        toast.error("Nenhum closer disponível");
        return;
      }

      const { data: closersData, error: closersError } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", closerIds);

      if (closersError) throw closersError;

      setClosers(closersData || []);
    } catch (error) {
      console.error("Error fetching closers:", error);
      toast.error("Erro ao carregar closers");
    }
  };

  const handleQualify = async () => {
    if (!user || !selectedCloser) {
      toast.error("Selecione um closer");
      return;
    }

    setLoading(true);
    try {
      // Atualizar lead como qualificado
      const { error: updateError } = await supabase
        .from(lead.tableName)
        .update({
          qualified: true,
          qualification_notes: qualificationNotes,
          qualified_at: new Date().toISOString(),
          qualified_by: user.id,
          status: "qualificado",
        })
        .eq("id", lead.id);

      if (updateError) throw updateError;

      // Registrar atividade de qualificação
      await supabase.from("lead_activities").insert([
        {
          lead_id: lead.id,
          lead_table: lead.tableName,
          sdr_id: user.id,
          activity_type: "qualification",
          title: "Lead qualificado",
          description: `Lead qualificado e direcionado para closer. Notas: ${qualificationNotes}`,
        },
      ]);

      toast.success("Lead qualificado com sucesso!");
      onQualified();
      onOpenChange(false);
      setSelectedCloser("");
      setQualificationNotes("");
    } catch (error: any) {
      console.error("Error qualifying lead:", error);
      toast.error("Erro ao qualificar lead: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Qualificar Lead</DialogTitle>
          <DialogDescription>
            Marque este lead como qualificado e direcione para um closer
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="closer">Closer *</Label>
            <Select value={selectedCloser} onValueChange={setSelectedCloser}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um closer" />
              </SelectTrigger>
              <SelectContent>
                {closers.map((closer) => (
                  <SelectItem key={closer.id} value={closer.id}>
                    {closer.full_name} ({closer.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas de Qualificação</Label>
            <Textarea
              id="notes"
              value={qualificationNotes}
              onChange={(e) => setQualificationNotes(e.target.value)}
              rows={4}
              placeholder="Descreva por que este lead está qualificado e informações importantes para o closer..."
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button onClick={handleQualify} disabled={loading}>
              {loading ? "Qualificando..." : "Qualificar Lead"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
