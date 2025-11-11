import { useState } from "react";
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
import { Input } from "@/components/ui/input";
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

interface CreateLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLeadCreated: () => void;
}

export function CreateLeadDialog({
  open,
  onOpenChange,
  onLeadCreated,
}: CreateLeadDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [funnel, setFunnel] = useState<string>("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    instagram_profissional: "",
    negocio: "",
    nicho_negocio: "",
    funcao_negocio: "",
    faturamento_mensal: "",
    lucro_liquido_mensal: "",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !funnel) {
      toast.error("Selecione um funil");
      return;
    }

    setLoading(true);
    try {
      const tableName =
        funnel === "fifty_scripts"
          ? "fifty_scripts_leads"
          : funnel === "mpm"
          ? "mpm_leads"
          : "teste_leads";

      const leadData = {
        ...formData,
        source: "manual_sdr",
        assigned_to: user.id,
        status: "novo" as "novo",
      };

      const { error } = await supabase.from(tableName).insert([leadData]);

      if (error) throw error;

      // Registrar atividade
      await supabase.from("lead_activities").insert([
        {
          lead_id: user.id,
          lead_table: tableName,
          sdr_id: user.id,
          activity_type: "note",
          title: "Lead criado manualmente",
          description: `Lead ${formData.name} criado pelo SDR`,
        },
      ]);

      toast.success("Lead criado com sucesso!");
      onLeadCreated();
      onOpenChange(false);
      setFormData({
        name: "",
        email: "",
        phone: "",
        instagram_profissional: "",
        negocio: "",
        nicho_negocio: "",
        funcao_negocio: "",
        faturamento_mensal: "",
        lucro_liquido_mensal: "",
        notes: "",
      });
      setFunnel("");
    } catch (error: any) {
      console.error("Error creating lead:", error);
      toast.error("Erro ao criar lead: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Novo Lead</DialogTitle>
          <DialogDescription>
            Preencha os dados do lead manualmente
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="funnel">Funil *</Label>
            <Select value={funnel} onValueChange={setFunnel} required>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o funil" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fifty_scripts">50 Scripts</SelectItem>
                <SelectItem value="mpm">MPM</SelectItem>
                <SelectItem value="teste">Teste</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="instagram">Instagram</Label>
              <Input
                id="instagram"
                value={formData.instagram_profissional}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    instagram_profissional: e.target.value,
                  })
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="negocio">Negócio</Label>
              <Input
                id="negocio"
                value={formData.negocio}
                onChange={(e) =>
                  setFormData({ ...formData, negocio: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nicho">Nicho do Negócio</Label>
              <Input
                id="nicho"
                value={formData.nicho_negocio}
                onChange={(e) =>
                  setFormData({ ...formData, nicho_negocio: e.target.value })
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="funcao">Função no Negócio</Label>
              <Input
                id="funcao"
                value={formData.funcao_negocio}
                onChange={(e) =>
                  setFormData({ ...formData, funcao_negocio: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="faturamento">Faturamento Mensal</Label>
              <Input
                id="faturamento"
                value={formData.faturamento_mensal}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    faturamento_mensal: e.target.value,
                  })
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="lucro">Lucro Líquido Mensal</Label>
            <Input
              id="lucro"
              value={formData.lucro_liquido_mensal}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  lucro_liquido_mensal: e.target.value,
                })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              rows={3}
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
            <Button type="submit" disabled={loading}>
              {loading ? "Criando..." : "Criar Lead"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
