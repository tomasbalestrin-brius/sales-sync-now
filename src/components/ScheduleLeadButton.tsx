import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";

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
  tableName,
}: ScheduleLeadButtonProps) {
  const navigate = useNavigate();

  const handleSchedule = () => {
    const funnelMap: Record<string, string> = {
      "fifty_scripts_leads": "fifty_scripts",
      "mpm_leads": "mpm",
      "teste_leads": "teste",
    };

    navigate("/agenda/novo", {
      state: {
        leadName,
        leadPhone,
        leadEmail,
        funnel: funnelMap[tableName] || "",
      },
    });
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleSchedule}
      className="gap-2"
    >
      <Calendar className="h-4 w-4" />
      Agendar
    </Button>
  );
}
