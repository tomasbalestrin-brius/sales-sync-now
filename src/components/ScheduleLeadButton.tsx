import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";
import { toast } from "sonner";

interface ScheduleLeadButtonProps {
  leadId: string;
  leadName: string;
  leadPhone: string;
  leadEmail?: string;
  instagramProfissional?: string;
  negocio?: string;
  nichoNegocio?: string;
  funcaoNegocio?: string;
  faturamentoMensal?: string;
  lucroLiquidoMensal?: string;
  tableName: "fifty_scripts_leads" | "mpm_leads" | "teste_leads";
}

export function ScheduleLeadButton({
  leadId,
  leadName,
  leadPhone,
  leadEmail,
  instagramProfissional,
  negocio,
  nichoNegocio,
  funcaoNegocio,
  faturamentoMensal,
  lucroLiquidoMensal,
  tableName,
}: ScheduleLeadButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleSchedule = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("schedule-lead-webhook", {
        body: {
          leadId,
          leadName,
          leadPhone,
          leadEmail,
          instagramProfissional,
          negocio,
          nichoNegocio,
          funcaoNegocio,
          faturamentoMensal,
          lucroLiquidoMensal,
          tableName,
        },
      });

      if (error) throw error;

      toast.success("Lead agendado com sucesso! Webhook enviado.");
    } catch (error: any) {
      console.error("Error scheduling lead:", error);
      toast.error("Erro ao agendar lead: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleSchedule}
      disabled={loading}
      className="gap-2"
    >
      <Calendar className="h-4 w-4" />
      {loading ? "Agendando..." : "Agendar"}
    </Button>
  );
}
