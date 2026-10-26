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

## Notificações ao entrar no CRM

No carregamento inicial de qualquer CRM (**master**, **cliente** ou **corretor**), o sistema examina **somente os dados disponíveis para a sessão atual segundo o RLS** e abre automaticamente a central de notificações **quando há pendências**. Ela também pode ser aberta pelo botão **Ver notificações** no início da tela.

São apresentados:
- **Próximos contatos** do lead (campo `next_contact_at`) até os próximos 7 dias, incluindo atrasados. Leads ganhos ou perdidos não entram nesta categoria.
- **Negociações** em proposta/negociação com prazo previsto (`expected_close_date`) até os próximos 7 dias ou já vencido.
- **Visitas agendadas** nos próximos 7 dias ou que passaram e ainda constam agendadas.
- **Aniversários** hoje e nos próximos 7 dias, desde que a **data de nascimento** tenha sido informada no cadastro de lead. Clientes perdidos não entram nos aniversários.

Há indicadores de **Hoje / Amanhã / Atrasado / Em X dias**, botão para abrir a área correspondente e, para aniversários com telefone, um atalho **Parabenizar no WhatsApp**, que abre a conversa e preenche a mensagem, mas **não a envia automaticamente**.

Caso não haja alertas, o CRM exibe discretamente **Tudo em dia por aqui** e não abre um modal automaticamente. Ao abrir de novo a rota, as pendências aparecem novamente; fechar a central não marca uma negociação ou visita como resolvida. Para remover avisos, atualize seus registros (ex.: visite, conclua, reagende ou atualize o próximo contato).

**Privacidade:** `crm_leads.birth_date` é um campo opcional e permanece protegido pelas mesmas políticas RLS de cada carteira. A data de nascimento não é solicitada no formulário público de interesse e não é publicada no site. Recomenda-se registrar apenas com finalidade transparente e base legal apropriada, conforme LGPD.

**Ativação:** executar `drizzle/migrations/0011_crm_lead_birthdays.sql` após as migrações anteriores. Os avisos são gerados **ao acessar a aplicação**: esta versão não envia push, SMS, e-mail ou mensagens de WhatsApp em segundo plano. Não há serviço de cron/automação configurado.

## Convite simplificado de corretor — sem Cloud → Users

Na aba **Equipe** do CRM, o proprietário da empresa ou o Super Admin informa **nome e e-mail**, clica em **Gerar convite de acesso**, copia o link e envia pelo WhatsApp. O endereço segue o formato `/convite?codigo=<token aleatório>`. O link expira após sete dias, só pode ser usado uma vez e está restrito ao e-mail convidado. Ao abrir, o corretor escolhe **Criar senha** (nova conta) ou **Já tenho conta**, confirma o e-mail, e ativa o acesso. Se o provedor tiver confirmação de e-mail ligada, o corretor confirma antes de usar. **Se o cadastro de novos usuários estiver desativado no Supabase Auth**, habilite cadastro por e-mail com confirmação (Auth) para permitir este fluxo; a plataforma não altera essa configuração automaticamente.

O código de convite não fica disponível permanentemente no painel: copiar/compartilhar logo após criar. A tabela interna armazena apenas o hash SHA-256 do token, não o token em claro. A ativação exige login autenticado com e-mail confirmado e confere os limites de usuários por plano. Convites não utilizados reservam temporariamente uma vaga na geração de novos convites. O link é um segredo: compartilhe somente com a pessoa convidada e não o publique.

## Imóveis na planta, renda familiar e sob consulta

No formulário do anúncio, ativar **Imóvel na planta / lançamento** para colocar o selo de lançamento, ou filtrar apenas anúncios na planta. No controle **Valor no anúncio**, escolher:

- **Preço definido**: informar valor em reais, exibido normalmente;
- **Faixa de renda**: informar renda familiar mensal mínima e máxima (R$); o anúncio mostrará a faixa **como critério de renda, sem tratá-la como preço**;
- **Sob consulta**: nenhum preço numérico, apenas a mensagem de consulta.

Mapas, cartões, páginas individuais e listas do administrador usam o mesmo formatador de valor. O banco impõe consistência por `price_display_type`, `income_min`, `income_max` e `price`. Um anúncio na planta pode usar qualquer uma das três modalidades. Migração requerida: `drizzle/migrations/0012_offplan_broker_invites.sql`.

**Antes de publicar para clientes:** testar cadastro de um novo corretor e sua confirmação de e-mail com conta de demonstração, limite de assentos, distribuição de leads e a renderização da faixa de renda em telas mobile. Verificar política de privacidade e garantias de financiamento antes de comercializar.
