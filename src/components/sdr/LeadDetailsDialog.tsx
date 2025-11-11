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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Phone,
  Mail,
  Calendar,
  MessageSquare,
  CheckCircle,
  Plus,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CreateTaskDialog } from "./CreateTaskDialog";
import { QualifyLeadDialog } from "./QualifyLeadDialog";

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  qualified: boolean;
  notes: string;
  instagram_profissional: string;
  negocio: string;
  nicho_negocio: string;
  funcao_negocio: string;
  faturamento_mensal: string;
  lucro_liquido_mensal: string;
  created_at: string;
  tableName: string;
}

interface Activity {
  id: string;
  activity_type: string;
  title: string;
  description: string;
  created_at: string;
}

interface LeadDetailsDialogProps {
  lead: Lead;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
}

export function LeadDetailsDialog({
  lead,
  open,
  onOpenChange,
  onUpdated,
}: LeadDetailsDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [showQualify, setShowQualify] = useState(false);
  const [activityForm, setActivityForm] = useState({
    activity_type: "note",
    title: "",
    description: "",
  });
  const [status, setStatus] = useState(lead.status);
  const [notes, setNotes] = useState(lead.notes || "");

  useEffect(() => {
    if (open) {
      fetchActivities();
      setStatus(lead.status);
      setNotes(lead.notes || "");
    }
  }, [open, lead]);

  const fetchActivities = async () => {
    try {
      const { data, error } = await supabase
        .from("lead_activities")
        .select("*")
        .eq("lead_id", lead.id)
        .eq("lead_table", lead.tableName)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setActivities(data || []);
    } catch (error) {
      console.error("Error fetching activities:", error);
    }
  };

  const handleUpdateStatus = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from(lead.tableName as any)
        .update({ status, notes })
        .eq("id", lead.id);

      if (error) throw error;

      // Registrar atividade de mudança de status
      if (status !== lead.status) {
        await supabase.from("lead_activities").insert([
          {
            lead_id: lead.id,
            lead_table: lead.tableName,
            sdr_id: user?.id,
            activity_type: "status_change",
            title: `Status alterado para ${status}`,
            description: `Status alterado de ${lead.status} para ${status}`,
          },
        ]);
      }

      toast.success("Lead atualizado com sucesso!");
      onUpdated();
      fetchActivities();
    } catch (error: any) {
      console.error("Error updating lead:", error);
      toast.error("Erro ao atualizar lead");
    } finally {
      setLoading(false);
    }
  };

  const handleAddActivity = async () => {
    if (!user || !activityForm.title) {
      toast.error("Preencha o título da atividade");
      return;
    }

    try {
      const { error } = await supabase.from("lead_activities").insert([
        {
          lead_id: lead.id,
          lead_table: lead.tableName,
          sdr_id: user.id,
          ...activityForm,
        },
      ]);

      if (error) throw error;

      toast.success("Atividade registrada!");
      fetchActivities();
      setShowAddActivity(false);
      setActivityForm({
        activity_type: "note",
        title: "",
        description: "",
      });
    } catch (error: any) {
      console.error("Error adding activity:", error);
      toast.error("Erro ao registrar atividade");
    }
  };

  const getActivityIcon = (type: string) => {
    const icons: Record<string, any> = {
      call: Phone,
      email: Mail,
      whatsapp: MessageSquare,
      meeting: Calendar,
      note: MessageSquare,
      status_change: CheckCircle,
      qualification: CheckCircle,
    };
    const Icon = icons[type] || MessageSquare;
    return <Icon className="h-4 w-4" />;
  };

  const getActivityLabel = (type: string) => {
    const labels: Record<string, string> = {
      call: "Ligação",
      email: "Email",
      whatsapp: "WhatsApp",
      meeting: "Reunião",
      note: "Anotação",
      status_change: "Mudança de Status",
      qualification: "Qualificação",
    };
    return labels[type] || type;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{lead.name}</span>
              {lead.qualified && (
                <Badge variant="default" className="bg-green-600">
                  Qualificado
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>Detalhes e histórico do lead</DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="details" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="details">Detalhes</TabsTrigger>
              <TabsTrigger value="activities">
                Histórico ({activities.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Informações de Contato</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Email</Label>
                      <p className="text-sm">{lead.email || "-"}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Telefone</Label>
                      <p className="text-sm">{lead.phone || "-"}</p>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Instagram</Label>
                    <p className="text-sm">{lead.instagram_profissional || "-"}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Informações do Negócio</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Negócio</Label>
                      <p className="text-sm">{lead.negocio || "-"}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Nicho</Label>
                      <p className="text-sm">{lead.nicho_negocio || "-"}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Função</Label>
                      <p className="text-sm">{lead.funcao_negocio || "-"}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        Faturamento Mensal
                      </Label>
                      <p className="text-sm">{lead.faturamento_mensal || "-"}</p>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Lucro Líquido Mensal
                    </Label>
                    <p className="text-sm">{lead.lucro_liquido_mensal || "-"}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Status e Observações</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={status} onValueChange={setStatus}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="novo">Novo</SelectItem>
                        <SelectItem value="contato">Em Contato</SelectItem>
                        <SelectItem value="qualificado">Qualificado</SelectItem>
                        <SelectItem value="agendado">Agendado</SelectItem>
                        <SelectItem value="perdido">Perdido</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Observações</Label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={4}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={handleUpdateStatus} disabled={loading}>
                      Salvar Alterações
                    </Button>
                    {!lead.qualified && (
                      <Button
                        variant="outline"
                        onClick={() => setShowQualify(true)}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Qualificar Lead
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      onClick={() => setShowCreateTask(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Criar Tarefa
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activities" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium">Histórico de Atividades</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddActivity(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Atividade
                </Button>
              </div>

              {showAddActivity && (
                <Card>
                  <CardContent className="pt-6 space-y-4">
                    <div className="space-y-2">
                      <Label>Tipo de Atividade</Label>
                      <Select
                        value={activityForm.activity_type}
                        onValueChange={(value) =>
                          setActivityForm({ ...activityForm, activity_type: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="call">Ligação</SelectItem>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="whatsapp">WhatsApp</SelectItem>
                          <SelectItem value="meeting">Reunião</SelectItem>
                          <SelectItem value="note">Anotação</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Título</Label>
                      <Input
                        value={activityForm.title}
                        onChange={(e) =>
                          setActivityForm({ ...activityForm, title: e.target.value })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Descrição</Label>
                      <Textarea
                        value={activityForm.description}
                        onChange={(e) =>
                          setActivityForm({
                            ...activityForm,
                            description: e.target.value,
                          })
                        }
                        rows={3}
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button onClick={handleAddActivity}>Salvar</Button>
                      <Button
                        variant="outline"
                        onClick={() => setShowAddActivity(false)}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="space-y-3">
                {activities.length === 0 ? (
                  <Card>
                    <CardContent className="p-6 text-center text-muted-foreground">
                      Nenhuma atividade registrada
                    </CardContent>
                  </Card>
                ) : (
                  activities.map((activity) => (
                    <Card key={activity.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                            {getActivityIcon(activity.activity_type)}
                          </div>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium text-sm">
                                {activity.title}
                              </h4>
                              <Badge variant="outline">
                                {getActivityLabel(activity.activity_type)}
                              </Badge>
                            </div>
                            {activity.description && (
                              <p className="text-sm text-muted-foreground">
                                {activity.description}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              {format(
                                new Date(activity.created_at),
                                "dd/MM/yyyy 'às' HH:mm",
                                { locale: ptBR }
                              )}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <CreateTaskDialog
        open={showCreateTask}
        onOpenChange={setShowCreateTask}
        onTaskCreated={() => {
          fetchActivities();
          onUpdated();
        }}
        leadId={lead.id}
        leadTable={lead.tableName}
      />

      <QualifyLeadDialog
        open={showQualify}
        onOpenChange={setShowQualify}
        lead={lead}
        onQualified={() => {
          fetchActivities();
          onUpdated();
          onOpenChange(false);
        }}
      />
    </>
  );
}
