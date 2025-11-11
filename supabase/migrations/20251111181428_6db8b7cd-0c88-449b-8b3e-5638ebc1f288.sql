-- Create closers profile extension (usar profiles existente)
-- Adicionar campos específicos de closer ao perfil

-- Create appointments table (integrada com sistema existente)
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  closer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  lead_id UUID,
  lead_name TEXT NOT NULL,
  lead_phone TEXT,
  lead_email TEXT,
  funnel TEXT NOT NULL,
  scheduled_date DATE NOT NULL,
  scheduled_time TIME NOT NULL,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create time slots configuration table
CREATE TABLE IF NOT EXISTS public.time_slots_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL DEFAULT '08:30:00',
  end_time TIME NOT NULL DEFAULT '18:00:00',
  slot_duration_minutes INTEGER NOT NULL DEFAULT 75,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(day_of_week)
);

-- Insert default time slots configuration (Monday to Friday)
INSERT INTO public.time_slots_config (day_of_week, start_time, end_time, slot_duration_minutes)
VALUES 
  (1, '08:30:00', '18:00:00', 75),
  (2, '08:30:00', '18:00:00', 75),
  (3, '08:30:00', '18:00:00', 75),
  (4, '08:30:00', '18:00:00', 75),
  (5, '08:30:00', '18:00:00', 75)
ON CONFLICT (day_of_week) DO NOTHING;

-- Enable RLS
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_slots_config ENABLE ROW LEVEL SECURITY;

-- Policies for appointments (usar sistema de roles existente)
CREATE POLICY "Admins and gestors can view all appointments" 
  ON public.appointments FOR SELECT 
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role));

CREATE POLICY "Closers can view their own appointments" 
  ON public.appointments FOR SELECT 
  USING (has_role(auth.uid(), 'closer'::app_role) AND closer_id = auth.uid());

CREATE POLICY "Admins and gestors can create appointments" 
  ON public.appointments FOR INSERT 
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role));

CREATE POLICY "Closers can create their own appointments" 
  ON public.appointments FOR INSERT 
  WITH CHECK (has_role(auth.uid(), 'closer'::app_role) AND closer_id = auth.uid());

CREATE POLICY "Admins and gestors can update appointments" 
  ON public.appointments FOR UPDATE 
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role));

CREATE POLICY "Closers can update their own appointments" 
  ON public.appointments FOR UPDATE 
  USING (has_role(auth.uid(), 'closer'::app_role) AND closer_id = auth.uid());

CREATE POLICY "Admins and gestors can delete appointments" 
  ON public.appointments FOR DELETE 
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role));

-- Policies for time_slots_config
CREATE POLICY "Everyone can view time slots" 
  ON public.time_slots_config FOR SELECT 
  USING (true);

CREATE POLICY "Admins and gestors can manage time slots" 
  ON public.time_slots_config FOR ALL 
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role));

-- Create trigger for appointments updated_at
CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_appointments_closer_id ON public.appointments(closer_id);
CREATE INDEX IF NOT EXISTS idx_appointments_scheduled_date ON public.appointments(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_lead_id ON public.appointments(lead_id);