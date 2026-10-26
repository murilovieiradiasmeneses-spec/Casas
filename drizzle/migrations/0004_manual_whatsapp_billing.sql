-- 0004 — CASAS: acompanhamento COMERCIAL MANUAL de pagamentos via WhatsApp
-- Este registro não processa pagamentos, não cria cobranças e NÃO suspende contas automaticamente.
-- Informações financeiras e o WhatsApp de cobrança nunca ficam na tabela pública agencies.
CREATE TABLE IF NOT EXISTS public.agency_billing (
  agency_id uuid PRIMARY KEY REFERENCES public.agencies(id) ON DELETE CASCADE,
  amount_brl numeric(12,2) NOT NULL DEFAULT 0 CHECK (amount_brl >= 0),
  billing_frequency text NOT NULL DEFAULT 'mensal'
    CHECK (billing_frequency IN ('mensal','trimestral','anual','unico')),
  next_due_date date,
  last_paid_date date,
  payment_status text NOT NULL DEFAULT 'nao_definido'
    CHECK (payment_status IN ('nao_definido','pendente','pago','atrasado')),
  billing_whatsapp text,
  notes text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agency_billing ENABLE ROW LEVEL SECURITY;

-- Acesso administrativo limitado exclusivamente ao dono da plataforma.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agency_billing TO authenticated;
GRANT ALL ON public.agency_billing TO service_role;
REVOKE ALL ON public.agency_billing FROM anon;
DROP POLICY IF EXISTS "Only platform admin manages billing" ON public.agency_billing;
CREATE POLICY "Only platform admin manages billing" ON public.agency_billing
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP TRIGGER IF EXISTS agency_billing_updated_at ON public.agency_billing;
CREATE TRIGGER agency_billing_updated_at BEFORE UPDATE ON public.agency_billing
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

COMMENT ON TABLE public.agency_billing IS
'Registro administrativo de negociações e pagamentos feitos FORA da plataforma pelo WhatsApp. Situação definida manualmente, sem confirmação ou suspensão automática.';
