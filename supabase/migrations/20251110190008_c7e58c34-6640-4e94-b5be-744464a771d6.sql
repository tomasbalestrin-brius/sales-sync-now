-- Add assigned_to column to fifty_scripts_leads table
ALTER TABLE public.fifty_scripts_leads
ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_fifty_scripts_leads_assigned_to 
ON public.fifty_scripts_leads(assigned_to);

-- Add RLS policy for SDRs to view their assigned leads
CREATE POLICY "SDRs can view their assigned leads"
ON public.fifty_scripts_leads
FOR SELECT
USING (
  has_role(auth.uid(), 'sdr'::app_role) 
  AND assigned_to = auth.uid()
);

-- Add RLS policy for SDRs to update their assigned leads
CREATE POLICY "SDRs can update their assigned leads"
ON public.fifty_scripts_leads
FOR UPDATE
USING (
  has_role(auth.uid(), 'sdr'::app_role) 
  AND assigned_to = auth.uid()
);

-- Add RLS policy for admins and gestors to assign leads
CREATE POLICY "Admins and gestors can assign leads"
ON public.fifty_scripts_leads
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'gestor'::app_role)
);