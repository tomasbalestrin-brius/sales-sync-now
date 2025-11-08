import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "lucide-react";

export default function Agenda() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Agenda</h1>
          <p className="text-muted-foreground">Visualize suas calls agendadas</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Calendário de Calls</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Funcionalidade de agenda em desenvolvimento
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
