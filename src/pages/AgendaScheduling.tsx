import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/DashboardLayout";

interface Closer {
  id: string;
  full_name: string;
}

interface TimeSlot {
  time: string;
  available: boolean;
}

export default function AgendaScheduling() {
  const navigate = useNavigate();
  const location = useLocation();
  const [closers, setClosers] = useState<Closer[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedCloser, setSelectedCloser] = useState<string>("");
  const [leadName, setLeadName] = useState("");
  const [leadPhone, setLeadPhone] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [funnel, setFunnel] = useState("");
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [selectedTime, setSelectedTime] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchClosers();
    
    // Preencher dados do lead se vier da navegação
    if (location.state) {
      const { leadName, leadPhone, leadEmail, funnel } = location.state;
      if (leadName) setLeadName(leadName);
      if (leadPhone) setLeadPhone(leadPhone);
      if (leadEmail) setLeadEmail(leadEmail);
      if (funnel) setFunnel(funnel);
    }
  }, [location]);

  useEffect(() => {
    if (selectedDate && selectedCloser) {
      fetchAvailableSlots();
    }
  }, [selectedDate, selectedCloser]);

  const fetchClosers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", (
        await supabase
          .from("user_roles")
          .select("user_id")
          .eq("role", "closer")
      ).data?.map(r => r.user_id) || []);
    
    setClosers(data || []);
  };

  const fetchAvailableSlots = async () => {
    if (!selectedDate || !selectedCloser) return;

    const dayOfWeek = selectedDate.getDay();
    const dateStr = format(selectedDate, "yyyy-MM-dd");

    // Get time slot configuration for this day
    const { data: config } = await supabase
      .from("time_slots_config")
      .select("*")
      .eq("day_of_week", dayOfWeek === 0 ? 7 : dayOfWeek)
      .eq("is_active", true)
      .single();

    if (!config) {
      setAvailableSlots([]);
      return;
    }

    // Get existing appointments for this closer on this date
    const { data: appointments } = await supabase
      .from("appointments")
      .select("scheduled_time")
      .eq("closer_id", selectedCloser)
      .eq("scheduled_date", dateStr);

    // Generate time slots
    const slots: TimeSlot[] = [];
    const startTime = new Date(`2000-01-01T${config.start_time}`);
    const endTime = new Date(`2000-01-01T${config.end_time}`);
    const slotDuration = config.slot_duration_minutes;

    let currentTime = startTime;
    const bookedTimes = new Set(appointments?.map(a => a.scheduled_time) || []);

    while (currentTime < endTime) {
      const timeStr = format(currentTime, "HH:mm:ss");
      slots.push({
        time: timeStr,
        available: !bookedTimes.has(timeStr),
      });
      currentTime = new Date(currentTime.getTime() + slotDuration * 60000);
    }

    setAvailableSlots(slots);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !selectedTime || !selectedCloser) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("appointments").insert({
        closer_id: selectedCloser,
        lead_name: leadName,
        lead_phone: leadPhone,
        lead_email: leadEmail,
        funnel: funnel,
        scheduled_date: format(selectedDate, "yyyy-MM-dd"),
        scheduled_time: selectedTime,
        status: "scheduled",
      });

      if (error) throw error;

      toast.success("Agendamento criado com sucesso!");
      navigate("/agenda");
    } catch (error: any) {
      toast.error("Erro ao criar agendamento: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto p-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/agenda")}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Novo Agendamento</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="leadName">Nome do Lead *</Label>
                  <Input
                    id="leadName"
                    value={leadName}
                    onChange={(e) => setLeadName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="leadPhone">Telefone</Label>
                  <Input
                    id="leadPhone"
                    value={leadPhone}
                    onChange={(e) => setLeadPhone(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="leadEmail">Email</Label>
                  <Input
                    id="leadEmail"
                    type="email"
                    value={leadEmail}
                    onChange={(e) => setLeadEmail(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="funnel">Funil *</Label>
                  <Select value={funnel} onValueChange={setFunnel} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o funil" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fifty_scripts">Fifty Scripts</SelectItem>
                      <SelectItem value="mpm">MPM</SelectItem>
                      <SelectItem value="teste">Teste</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Closer *</Label>
                  <Select value={selectedCloser} onValueChange={setSelectedCloser} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um closer" />
                    </SelectTrigger>
                    <SelectContent>
                      {closers.map((closer) => (
                        <SelectItem key={closer.id} value={closer.id}>
                          {closer.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Data *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !selectedDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate ? (
                          format(selectedDate, "PPP", { locale: ptBR })
                        ) : (
                          <span>Selecione uma data</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        disabled={(date) =>
                          date < new Date() || date.getDay() === 0 || date.getDay() === 6
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {selectedDate && selectedCloser && availableSlots.length > 0 && (
                <div className="space-y-2">
                  <Label>Horário Disponível *</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {availableSlots.map((slot) => (
                      <Button
                        key={slot.time}
                        type="button"
                        variant={selectedTime === slot.time ? "default" : "outline"}
                        disabled={!slot.available}
                        onClick={() => setSelectedTime(slot.time)}
                        className="w-full"
                      >
                        {format(new Date(`2000-01-01T${slot.time}`), "HH:mm")}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? "Criando..." : "Criar Agendamento"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
