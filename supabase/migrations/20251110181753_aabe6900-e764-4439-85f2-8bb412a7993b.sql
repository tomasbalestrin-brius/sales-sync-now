-- Rename leads table to fifty_scripts_leads
ALTER TABLE public.leads RENAME TO fifty_scripts_leads;

-- Add column for form submission date
ALTER TABLE public.fifty_scripts_leads 
ADD COLUMN form_submitted_at TIMESTAMP WITH TIME ZONE;

-- Create sync_config table to control sync status
CREATE TABLE public.sync_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_name TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sheet_id TEXT NOT NULL,
  sheet_tab_name TEXT NOT NULL,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for sync_config
ALTER TABLE public.sync_config ENABLE ROW LEVEL SECURITY;

-- Admins and gestors can manage sync configs
CREATE POLICY "Admins and gestors can view sync configs" 
ON public.sync_config 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role));

CREATE POLICY "Admins and gestors can update sync configs" 
ON public.sync_config 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role));

CREATE POLICY "Admins and gestors can insert sync configs" 
ON public.sync_config 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_sync_config_updated_at
BEFORE UPDATE ON public.sync_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial config for 50 Scripts
INSERT INTO public.sync_config (product_name, is_active, sheet_id, sheet_tab_name)
VALUES ('50 Scripts', true, '1gTgxZuX_ijCmcegSSu8qhrF2GrADrNS5gMxabg6PiDs', 'Qualificados');