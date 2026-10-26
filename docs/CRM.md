# CASAS CRM — vendas imobiliárias e corretores

CRM white-label integrado aos imóveis do CASAS, com acesso segregado por empresa.

## Áreas e endereços

- **Super Admin**: /admin/crm (empresa selecionada no painel master).
- **Imobiliária**: /cliente/crm (owner/editor vinculados à empresa).
- **Corretor**: /corretor — acesso restrito aos leads atribuídos ao profissional.

O login /entrar encaminha cada perfil por /painel.

## Recursos da primeira versão

- Dashboard com gráficos mensais de **vendas registradas como concluídas**, funil por etapas, projeção de negociações e produtividade dos corretores.
- Leads: nome, telefone/WhatsApp, origem, imóvel vinculado, orçamento, próximas ações e observações; Kanban com mudança de etapa e atribuição de responsável.
- Visitas: agendamento por lead e imóvel e controle de realizadas/canceladas.
- Negociações: propostas, andamento, valor, datas de fechamento e situação ganho/perdido.
- Equipe: vincular corretores existentes no Auth por nome e e-mail, ativar/desativar e distribuir leads. Cada corretor vê a própria carteira.
- Planos: **Essencial (3 acessos totais)**, Profissional (5) e Premium (10). Administrador master altera plano; usuários owner/editor existentes **contam no total**.

## Preparar banco

Depois das migrações 0000-0006, aplicar nesta ordem:
1. `drizzle/migrations/0007_crm_multitenant.sql`
2. `drizzle/migrations/0008_crm_agents_and_plans.sql`
3. `drizzle/migrations/0009_crm_guard_plan_limits.sql`

O banco do projeto foi atualizado através das ferramentas conectadas, mas **cada nova implantação precisa executar essas migrações**. Confirmar o status antes de convidar usuários.

## Cadastrar corretor

Por segurança, o CRM não cria nem distribui senhas. Primeiro crie a conta do profissional no provedor de autenticação **Cloud → Users**; depois vincule o e-mail na aba **Equipe**. O sistema restringe quantidade de usuários e só atribui novas carteiras dentro da mesma imobiliária. Corretores entram com sua senha própria em `/entrar`.

## Privacidade

Tabelas privadas `crm_leads`, `crm_visits`, `crm_deals` e `crm_salespeople` usam RLS. Políticas por empresa e atribuição são impostas no banco. Há gatilhos que impedem vincular lead ou imóvel de outra empresa. Nenhum contato deve ficar disponível no catálogo público. Realize testes de isolamento com usuários reais diferentes antes de lançamento comercial.

**Faturamento CRM ≠ recebimento bancário**: apenas a soma dos negócios com status "ganho"; não confirma transferências, comissão, notas fiscais ou fluxo de caixa.

## Próximas etapas possíveis

- Integração real de captura automática de leads dos formulários públicos.
- Convite de usuário com e-mail transacional seguro por função de backend com credenciais protegidas.
- Relatórios avançados de comissões, metas e exportação.
- Integração com calendário e WhatsApp Business API, se desejado.

## Captação automática de leads por imóvel

As páginas públicas de imóveis possuem um formulário **Solicitar contato**, que pede nome, WhatsApp, e-mail opcional e consentimento explícito. O envio usa RPC `crm_capture_interest`; nenhuma tabela privada é aberta ao público. O lead criado tem `source='site'`, vinculação ao imóvel e entra na coluna Novo lead, sem corretor atribuído. Um gerente pode encaminhar o lead a um corretor.

Proteção inicial: validação do imóvel publicado, campos e antiduplicidade para mesmo telefone e imóvel por uma hora, mais campo antirrobô. Para produção de grande escala, incluir CAPTCHA/limite por IP em backend, política de privacidade e fluxo de exclusão de dados conforme LGPD. Migração: `0010_crm_public_interest.sql`.
