-- Add new columns to fifty_scripts_leads table
ALTER TABLE public.fifty_scripts_leads
ADD COLUMN IF NOT EXISTS instagram_profissional TEXT,
ADD COLUMN IF NOT EXISTS negocio TEXT,
ADD COLUMN IF NOT EXISTS nicho_negocio TEXT,
ADD COLUMN IF NOT EXISTS funcao_negocio TEXT,
ADD COLUMN IF NOT EXISTS faturamento_mensal TEXT,
ADD COLUMN IF NOT EXISTS lucro_liquido_mensal TEXT;

-- Add new columns to mpm_leads table
ALTER TABLE public.mpm_leads
ADD COLUMN IF NOT EXISTS instagram_profissional TEXT,
ADD COLUMN IF NOT EXISTS negocio TEXT,
ADD COLUMN IF NOT EXISTS nicho_negocio TEXT,
ADD COLUMN IF NOT EXISTS funcao_negocio TEXT,
ADD COLUMN IF NOT EXISTS faturamento_mensal TEXT,
ADD COLUMN IF NOT EXISTS lucro_liquido_mensal TEXT;

-- Add new columns to teste_leads table
ALTER TABLE public.teste_leads
ADD COLUMN IF NOT EXISTS instagram_profissional TEXT,
ADD COLUMN IF NOT EXISTS negocio TEXT,
ADD COLUMN IF NOT EXISTS nicho_negocio TEXT,
ADD COLUMN IF NOT EXISTS funcao_negocio TEXT,
ADD COLUMN IF NOT EXISTS faturamento_mensal TEXT,
ADD COLUMN IF NOT EXISTS lucro_liquido_mensal TEXT;