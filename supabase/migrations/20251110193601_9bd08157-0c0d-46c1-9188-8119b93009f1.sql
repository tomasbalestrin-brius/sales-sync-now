-- Remover policy antiga que permite SDRs ver leads atribuídos a eles
DROP POLICY IF EXISTS "SDRs can view their assigned leads" ON public.fifty_scripts_leads;

-- Criar nova policy específica para SDRs verem apenas seus leads
CREATE POLICY "SDRs can only view their assigned leads"
ON public.fifty_scripts_leads
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'sdr'::app_role) AND (assigned_to = auth.uid())
);

-- Garantir que admins e gestors podem ver todos os leads
DROP POLICY IF EXISTS "All authenticated users can view leads" ON public.fifty_scripts_leads;

CREATE POLICY "Admins and gestors can view all leads"
ON public.fifty_scripts_leads
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'gestor'::app_role)
);

-- Closers podem ver todos os leads também
CREATE POLICY "Closers can view all leads"
ON public.fifty_scripts_leads
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'closer'::app_role)
);