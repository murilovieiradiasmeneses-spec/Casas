-- 0011: Data de nascimento opcional para avisos de aniversário no CRM.
-- PII privada: somente usuários autorizados pelas políticas RLS existentes.
ALTER TABLE public.crm_leads
  ADD COLUMN IF NOT EXISTS birth_date date;
COMMENT ON COLUMN public.crm_leads.birth_date IS
  'Data de nascimento informada voluntariamente no cadastro do lead. Usada apenas para lembrete interno de aniversário.';
CREATE INDEX IF NOT EXISTS crm_leads_birth_month_day_idx
  ON public.crm_leads ((EXTRACT(MONTH FROM birth_date)), (EXTRACT(DAY FROM birth_date)))
  WHERE birth_date IS NOT NULL;
