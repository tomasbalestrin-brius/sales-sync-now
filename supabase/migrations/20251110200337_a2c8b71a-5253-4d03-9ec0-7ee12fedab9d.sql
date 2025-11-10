-- Create MPM leads table
CREATE TABLE public.mpm_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  status lead_status NOT NULL DEFAULT 'novo',
  form_submitted_at TIMESTAMP WITH TIME ZONE,
  assigned_to UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on MPM leads
ALTER TABLE public.mpm_leads ENABLE ROW LEVEL SECURITY;

-- RLS Policies for MPM leads
CREATE POLICY "Admins and gestors can view all mpm leads"
ON public.mpm_leads
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'gestor'::app_role)
);

CREATE POLICY "Closers can view all mpm leads"
ON public.mpm_leads
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'closer'::app_role));

CREATE POLICY "SDRs can only view their assigned mpm leads"
ON public.mpm_leads
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'sdr'::app_role) AND 
  assigned_to = auth.uid()
);

CREATE POLICY "Admins and gestors can insert mpm leads"
ON public.mpm_leads
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'gestor'::app_role)
);

CREATE POLICY "Admins and gestors can update mpm leads"
ON public.mpm_leads
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'gestor'::app_role)
);

CREATE POLICY "SDRs can update their assigned mpm leads"
ON public.mpm_leads
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'sdr'::app_role) AND 
  assigned_to = auth.uid()
);

CREATE POLICY "Admins and gestors can delete mpm leads"
ON public.mpm_leads
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'gestor'::app_role)
);

-- Create Teste leads table
CREATE TABLE public.teste_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  status lead_status NOT NULL DEFAULT 'novo',
  form_submitted_at TIMESTAMP WITH TIME ZONE,
  assigned_to UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on Teste leads
ALTER TABLE public.teste_leads ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Teste leads
CREATE POLICY "Admins and gestors can view all teste leads"
ON public.teste_leads
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'gestor'::app_role)
);

CREATE POLICY "Closers can view all teste leads"
ON public.teste_leads
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'closer'::app_role));

CREATE POLICY "SDRs can only view their assigned teste leads"
ON public.teste_leads
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'sdr'::app_role) AND 
  assigned_to = auth.uid()
);

CREATE POLICY "Admins and gestors can insert teste leads"
ON public.teste_leads
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'gestor'::app_role)
);

CREATE POLICY "Admins and gestors can update teste leads"
ON public.teste_leads
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'gestor'::app_role)
);

CREATE POLICY "SDRs can update their assigned teste leads"
ON public.teste_leads
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'sdr'::app_role) AND 
  assigned_to = auth.uid()
);

CREATE POLICY "Admins and gestors can delete teste leads"
ON public.teste_leads
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'gestor'::app_role)
);

-- Add triggers for updated_at
CREATE TRIGGER update_mpm_leads_updated_at
BEFORE UPDATE ON public.mpm_leads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_teste_leads_updated_at
BEFORE UPDATE ON public.teste_leads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();