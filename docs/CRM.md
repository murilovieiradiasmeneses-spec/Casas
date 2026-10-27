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

## Acesso direto de corretores, sem tokens de convite

Os proprietários das imobiliárias e o Super Admin agora utilizam **CRM → Equipe → Autorizar corretor**. Preenchem nome e e-mail e executam `crm_authorize_broker`, que valida empresa, proprietário e limite de assentos no banco.

- Se o e-mail já corresponder a conta confirmada, a vinculação de corretor fica ativa imediatamente, sem necessidade de gerar convite;
- Se ainda não existir conta confirmada, a autorização fica **pendente**, reservando um dos acessos do plano. O corretor usa `/acesso-corretor?empresa=<slug>` para cadastrar senha ou entrar com conta existente, confirma o e-mail e aciona `crm_activate_authorized_broker`;
- O link é permanente e compartilhável, mas **não concede acesso sozinho**. O servidor verifica se o e-mail foi autorizado pelo proprietário;
- A listagem exibe corretores ativos, autorizados e revogados. Revogações também desativam o vínculo no CRM;
- Permissões são por imobiliária, o corretor não vê leads de outra empresa ou não atribuídos a ele;
- O SQL migra em `0016_direct_broker_authorization.sql` e `0017_broker_authorization_seat_fix.sql`. A antiga RPC de convites não fica mais executável por usuários normais. A rota legada `/convite` exibe orientação de migração.

A confirmação de e-mail do provedor de autenticação continua obrigatória para novos acessos. Não compartilhe senhas entre profissionais.

## Backup completo por imobiliária

Os proprietários acessam **Painel → Backup**. No painel Master, **Meus clientes → Backup** seleciona a empresa e mostra sua página de exportação. A interface oferece opção **Diário**, **Semanal** e **Mensal** para organização de arquivos e respectivo nome.

A exportação é sempre um **snapshot completo do momento do clique**. Não há rotina automática de download ou armazenamento em nuvem neste recurso. O download é um **ZIP** com:
- `backup.json`: empresa e identidade visual, imóveis, fotos (metadados), leads, visitas, negócios, corretoras/corretores, plano e autorizações;
- `midia/property-images/` e `midia/agency-branding/`: imagens armazenadas no CASAS relacionadas à empresa, quando o arquivo for encontrado;
- `LEIA-ME.txt` com instruções de guarda e recuperação assistida;
- Para Super Admin, dados de cobrança manual da empresa também são incluídos; o cliente comum não exporta dados privados de administração geral.

Exportação roda no navegador do proprietário; RLS restringe os registros por empresa. O ZIP não inclui senhas, tokens nem credenciais do Supabase. Se alguma mídia obrigatória não puder ser copiada, **não há arquivo parcial**. O limite desta primeira versão é 220 MB por exportação para evitar travamento de memória; bases maiores exigem backup administrado fora do navegador. A importação não é automática.

**Importante:** o arquivo contém dados pessoais (LGPD), deve ser armazenado privadamente e não enviado por WhatsApp para terceiros. Teste a recuperação por procedimento técnico antes de tratar o backup como garantia de restauração.

## E-mail de acesso do cliente alterado pelo Painel Master

Na página **Master → Meus clientes**, cada imobiliária agora oferece **Trocar e-mail**. Selecione a conta atual (proprietário ou editor) e informe o novo endereço. A troca é um **transfer da permissão** entre contas de autenticação, NÃO uma alteração de e-mail dentro do registro global `auth.users`; isso protege contas que tenham acesso a mais de uma empresa.

- Novo e-mail com conta existente e CONFIRMADA: a permissão da imobiliária é transferida imediatamente em transação, sem apagar imóveis, CRM nem identidade visual.
- Novo e-mail sem conta/sem confirmação: o master cria uma autorização pendente de até **14 dias** e compartilha o link fixo `/acesso-cliente?empresa=<slug>`. O destinatário cria sua própria senha (ou entra com senha existente), confirma o e-mail e ativa a transferência.
- **Enquanto pendente, o usuário original mantém seu acesso à imobiliária.** Após a ativação, o vínculo antigo com aquela imobiliária é removido, preservando quaisquer acessos dele a outras empresas.
- Autorizações pendentes aparecem na seção da imobiliária e o master pode cancelá-las. O novo e-mail nunca recebe acesso antes da comprovação de propriedade da conta via confirmação Auth.
- O procedimento é exclusivo do usuário com papel `admin` de plataforma, verificado no banco pelas funções `master_change_agency_login`, `master_list_agency_login_changes` e `master_cancel_agency_login_change`.
- O próprio destinatário chama `activate_agency_login_change` somente após autenticação e confirmação do e-mail. A tabela interna `agency_member_email_changes` não tem acesso direto por `anon` nem `authenticated`.
- Migração: `0019_master_change_client_email.sql`.

## Distribuição de leads para corretores

- **Gestor da imobiliária (proprietário/editor):** no CRM, aba **Leads e distribuição**, cadastra o lead e seleciona **Enviar lead para corretor**. É possível reatribuir ou devolver o lead à carteira da imobiliária.
- **Corretor:** na página `/corretor`, encontra **Leads recebidos da imobiliária**, um resumo dos novos leads e aviso ao entrar enquanto o lead estiver na etapa **Novo**. Pode abrir os contatos, trabalhar as etapas e gerenciar visitas/negociações dos seus leads.
- Um corretor **não pode criar um lead independente nem se atribuir leads sem autorização**; o banco aplica política de INSERT apenas para gestores e restringe SELECT/UPDATE ao corretor efetivamente atribuído. A validação das atribuições compara imobiliária e corretor ativos.
- Lead público captado pelo formulário do imóvel entra na carteira da imobiliária **sem corretor**. O gestor faz a distribuição.
- O corretor não recebe mensagens automáticas por SMS/WhatsApp, e-mail ou push: por enquanto, os avisos são **dentro do CRM**, que atualiza os registros periodicamente.
- Migração: `0020_broker_assigned_leads_only.sql`.

Antes de disponibilizar comercialmente, testar em sessão real com duas imobiliárias, um proprietário e dois corretores, incluindo transferência de e-mail com conta nova e existente; simular que o corretor não consegue ver leads dos demais.

## Correção: sessões não podem trocar de conta ao ativar corretores

As sessões de autenticação do CASAS são armazenadas em `sessionStorage` **por aba**, em vez do armazenamento global da prévia do Lovable (que compartilhava o mesmo login entre superfícies), impedindo que o corretor aberto numa aba assuma involuntariamente a sessão do gestor em outra. O sistema limpa o cache de permissões, CRM e cadastros ao detectar uma mudança de usuário **na mesma aba**, redirecionando a área protegida para resolver as permissões novamente.

- Cada aba pode ter uma conta diferente; fechar a aba encerra a persistência daquela sessão. Atualizar a aba preserva o login.
- **Uma migração de sessão:** usuários já conectados com o armazenamento antigo podem precisar entrar novamente, uma única vez, após atualizar o CASAS.
- No CRM da imobiliária há um link **Testar em outra aba** com `rel="noopener noreferrer"` para preservar a sessão do gestor. O cliente deve enviar o mesmo link ao corretor para que **ele** faça login em sua própria aba, navegador ou aparelho.
- O link de ativação guarda o `slug` da imobiliária e, ao abrir `/corretor?empresa=<slug>`, prioriza **essa** carteira quando a mesma conta tiver vínculos em mais de uma imobiliária.
- O banco continua sendo a fonte de verdade para autorizações; separar sessões não concede nenhuma permissão extra a usuários.
- Teste com dois usuários em abas diferentes, inclusive na prévia do Lovable. O navegador pode bloquear cookies/armazenamento de terceiros; em caso de restrição, abra o link em nova aba normal ou janela privativa.

## Exclusão de leads pelo gestor

Na aba **Funil de leads**, cada card tem a opção **Excluir**, e o formulário de **Editar lead** também tem **Excluir este lead**. A opção aparece apenas para o proprietário da imobiliária ou administrador master, nunca para editor ou corretor. A política de DELETE no PostgreSQL `crm_leads` reforça `crm_is_owner(agency_id)` e, portanto, o corretor não pode contornar a restrição pela API.

A exclusão tem duas etapas: abrir o diálogo de confirmação (com nome/empresa do lead e contagem de visitas, negociações e vendas ganhas) e digitar `EXCLUIR`. O comando envia `DELETE` filtrado por **id do lead e agency_id**, espera o banco retornar exatamente um registro eliminado e só então atualiza o CRM. Se a permissão falhar ou o registro já não existir, o sistema mostra erro e não anuncia sucesso.

**Exclusão definitiva:** as FKs `crm_visits.lead_id` e `crm_deals.lead_id` estão configuradas com `ON DELETE CASCADE`. Excluir o lead apaga permanentemente essas visitas e negociações, incluindo vendas concluídas: gráficos de faturamento, conversão e histórico comercial são recalculados. Imóveis e outros leads permanecem intactos. O usuário deve guardar um backup antes de excluir dados importantes. Não existe lixeira/recuperação automática nesta versão.

## Botão de exclusão no site (proprietário e master)

Em **CRM → Funil de leads**, no cabeçalho à direita do botão **Cadastrar**, há um botão **Excluir lead**. O responsável escolhe o contato numa lista, revisa a contagem de visitas/negociações/vendas vinculadas e digita `EXCLUIR` para confirmar. O mesmo comando fica nos cards e na edição de cada lead. As três entradas da interface verificam `canManageTeam` (RPC `crm_is_owner`), incluindo o master e o proprietário, não editores e nem corretores.

No banco a migration `drizzle/migrations/0023_owner_master_delete_leads.sql` substitui a antiga política de gestor por `crm_is_owner(agency_id)` para que a regra não dependa apenas do botão visual. SQL já aplicado. A exclusão é irreversível no CRM; visitas e negociações são excluídas via cascata. Faça backup antes de excluir histórico importante.
