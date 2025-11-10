import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";

interface SDR {
  id: string;
  full_name: string;
  email: string;
}

interface AssignLeadDialogProps {
  leadId: string;
  currentAssignedTo?: string;
  onAssigned: () => void;
}

export function AssignLeadDialog({ leadId, currentAssignedTo, onAssigned }: AssignLeadDialogProps) {
  const [open, setOpen] = useState(false);
  const [sdrs, setSdrs] = useState<SDR[]>([]);
  const [selectedSdr, setSelectedSdr] = useState<string>(currentAssignedTo || "");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchSDRs();
    }
  }, [open]);

  const fetchSDRs = async () => {
    try {
      const { data: sdrRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "sdr");

      if (rolesError) throw rolesError;

      const userIds = sdrRoles.map((r) => r.user_id);

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);

      if (profilesError) throw profilesError;

      setSdrs(profiles || []);
    } catch (error: any) {
      toast.error("Erro ao carregar SDRs: " + error.message);
    }
  };

  const handleAssign = async () => {
    if (!selectedSdr) {
      toast.error("Selecione um SDR");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("fifty_scripts_leads")
        .update({ assigned_to: selectedSdr })
        .eq("id", leadId);

      if (error) throw error;

      toast.success("Lead atribuído com sucesso!");
      setOpen(false);
      onAssigned();
    } catch (error: any) {
      toast.error("Erro ao atribuir lead: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <UserPlus className="h-4 w-4 mr-2" />
          Atribuir
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Atribuir Lead a SDR</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Selecione um SDR:</label>
            <Select value={selectedSdr} onValueChange={setSelectedSdr}>
              <SelectTrigger>
                <SelectValue placeholder="Escolha um SDR" />
              </SelectTrigger>
              <SelectContent>
                {sdrs.map((sdr) => (
                  <SelectItem key={sdr.id} value={sdr.id}>
                    {sdr.full_name} ({sdr.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAssign} disabled={loading}>
              {loading ? "Atribuindo..." : "Atribuir"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
