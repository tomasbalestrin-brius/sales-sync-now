-- Tabela de atividades/interações dos SDRs com leads
CREATE TABLE public.lead_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL,
  lead_table TEXT NOT NULL CHECK (lead_table IN ('fifty_scripts_leads', 'mpm_leads', 'teste_leads')),
  sdr_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('call', 'email', 'whatsapp', 'meeting', 'note', 'status_change', 'qualification')),
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de tarefas/follow-ups para SDRs
CREATE TABLE public.sdr_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sdr_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_id UUID,
  lead_table TEXT CHECK (lead_table IN ('fifty_scripts_leads', 'mpm_leads', 'teste_leads')),
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sdr_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for lead_activities
CREATE POLICY "SDRs can view their own activities"
  ON public.lead_activities FOR SELECT
  USING (has_role(auth.uid(), 'sdr'::app_role) AND sdr_id = auth.uid());

CREATE POLICY "Admins and gestors can view all activities"
  ON public.lead_activities FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role));

CREATE POLICY "Closers can view activities of their leads"
  ON public.lead_activities FOR SELECT
  USING (has_role(auth.uid(), 'closer'::app_role));

CREATE POLICY "SDRs can create their own activities"
  ON public.lead_activities FOR INSERT
  WITH CHECK (sdr_id = auth.uid());

CREATE POLICY "SDRs can update their own activities"
  ON public.lead_activities FOR UPDATE
  USING (sdr_id = auth.uid());

-- RLS Policies for sdr_tasks
CREATE POLICY "SDRs can view their own tasks"
  ON public.sdr_tasks FOR SELECT
  USING (has_role(auth.uid(), 'sdr'::app_role) AND sdr_id = auth.uid());

CREATE POLICY "Admins and gestors can view all tasks"
  ON public.sdr_tasks FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role));

CREATE POLICY "SDRs can create their own tasks"
  ON public.sdr_tasks FOR INSERT
  WITH CHECK (sdr_id = auth.uid());

CREATE POLICY "SDRs can update their own tasks"
  ON public.sdr_tasks FOR UPDATE
  USING (sdr_id = auth.uid());

CREATE POLICY "SDRs can delete their own tasks"
  ON public.sdr_tasks FOR DELETE
  USING (sdr_id = auth.uid());

-- Trigger for updating updated_at on sdr_tasks
CREATE TRIGGER update_sdr_tasks_updated_at
  BEFORE UPDATE ON public.sdr_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Atualizar policies dos leads para permitir SDRs criarem leads
DROP POLICY IF EXISTS "Admins and gestors can insert leads" ON public.fifty_scripts_leads;
DROP POLICY IF EXISTS "Admins and gestors can insert mpm leads" ON public.mpm_leads;
DROP POLICY IF EXISTS "Admins and gestors can insert teste leads" ON public.teste_leads;

CREATE POLICY "Admins, gestors and SDRs can insert leads"
  ON public.fifty_scripts_leads FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'gestor'::app_role) OR 
    has_role(auth.uid(), 'sdr'::app_role)
  );

CREATE POLICY "Admins, gestors and SDRs can insert mpm leads"
  ON public.mpm_leads FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'gestor'::app_role) OR 
    has_role(auth.uid(), 'sdr'::app_role)
  );

CREATE POLICY "Admins, gestors and SDRs can insert teste leads"
  ON public.teste_leads FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'gestor'::app_role) OR 
    has_role(auth.uid(), 'sdr'::app_role)
  );

-- Adicionar campo de qualificação nos leads
ALTER TABLE public.fifty_scripts_leads ADD COLUMN IF NOT EXISTS qualified BOOLEAN DEFAULT false;
ALTER TABLE public.fifty_scripts_leads ADD COLUMN IF NOT EXISTS qualification_notes TEXT;
ALTER TABLE public.fifty_scripts_leads ADD COLUMN IF NOT EXISTS qualified_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.fifty_scripts_leads ADD COLUMN IF NOT EXISTS qualified_by UUID REFERENCES auth.users(id);

ALTER TABLE public.mpm_leads ADD COLUMN IF NOT EXISTS qualified BOOLEAN DEFAULT false;
ALTER TABLE public.mpm_leads ADD COLUMN IF NOT EXISTS qualification_notes TEXT;
ALTER TABLE public.mpm_leads ADD COLUMN IF NOT EXISTS qualified_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.mpm_leads ADD COLUMN IF NOT EXISTS qualified_by UUID REFERENCES auth.users(id);

ALTER TABLE public.teste_leads ADD COLUMN IF NOT EXISTS qualified BOOLEAN DEFAULT false;
ALTER TABLE public.teste_leads ADD COLUMN IF NOT EXISTS qualification_notes TEXT;
ALTER TABLE public.teste_leads ADD COLUMN IF NOT EXISTS qualified_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.teste_leads ADD COLUMN IF NOT EXISTS qualified_by UUID REFERENCES auth.users(id);