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

## Edição de valores e exclusão de negociações

Em **CRM → Negociações e vendas**, cada registro mostra os botões **Editar valor** e, para proprietário ou master, **Excluir**.

- **Editar valor** abre o cadastro existente, com o valor, etapa, título, lead, imóvel, prazo e observações preenchidos. Salvar usa UPDATE filtrado por `id` e `agency_id`; nunca cria outra negociação. A autorização segue a política de UPDATE do banco: gestores ou o corretor ao qual pertence o lead. Se a negociação já estava concluída, a data original do fechamento é preservada quando se edita apenas o valor.
- **Excluir** exibe título e valor, alerta sobre o impacto financeiro e exige digitar `EXCLUIR`. O DELETE é limitado pelo banco ao proprietário da imobiliária e ao administrador master (`crm_is_owner`, migration `0024_owner_master_delete_deals.sql`). O lead e o imóvel não são excluídos, mas a negociação não pode ser restaurada pelo CRM.
- Após qualquer mudança, a consulta da empresa é invalidada, e gráficos, previsões e faturamento refletem os dados mais recentes. O faturamento é apenas valor das negociações **ganhas**, não recebimento bancário.

Testes: `src/test/crm-negotiations.test.ts` cobre preservação da data de fechamento, ajuste de valor e atualização dos indicadores, exclusão e distinção de previsão/faturamento.

## Locações integradas aos imóveis e aluguéis a receber

O CRM do CASAS agora tem a aba **Locações**, visível ao proprietário, editores autorizados e master. Os corretores continuam vendo somente suas próprias carteiras de leads e negociações (não têm acesso aos dados financeiros de locações). Os imóveis continuam únicos no catálogo CASAS, sem cadastro paralelo.

**Passo a passo:**
1. Em **Imóveis**, cadastrar ou editar o imóvel e marcar **Finalidade: Locação**. O mesmo imóvel poderá ser usado diretamente no CRM.
2. Em **CRM → Locações → Contratos de aluguel**, clicar **Novo contrato**. Escolher o imóvel, selecionar um lead existente (opcional), informar nome/contato do inquilino, aluguel mensal, dia do vencimento (1 a 28), início, término opcional e observações.
3. Ao iniciar contrato ativo, o imóvel passa automaticamente a **Alugado** no catálogo. Ao encerrar o contrato, volta a **Disponível**. Imóveis com contrato ativo não podem mudar de finalidade nem ser vinculados a dois contratos ativos simultâneos.
4. No card do contrato, escolher o primeiro mês e **Gerar parcelas** (1, 3, 6 ou 12). O banco cria uma cobrança mensal com valor original do contrato e vencimento fixo. Não duplica competências já cadastradas e não sobrescreve valores antigos. Pode também ir a **Aluguéis a receber → Cadastrar aluguel a receber** para registrar um mês manualmente.
5. Na aba **Aluguéis a receber**, filtrar Todos / Pendentes / Vencidos / Recebidos. Para registrar o pagamento, clicar **Marcar recebido**. O status e o instante do recebimento ficam armazenados. Apenas proprietário/master pode desfazer uma baixa já registrada.

**Indicadores:** contratos cadastrados/ativos, montante mensal contratado, saldo a receber, atrasados, vencimentos próximos, recebidos no mês. Na **Visão geral** esses indicadores aparecem separadamente dos gráficos de vendas. Faturamento de vendas não soma contratos de locação, e os números de aluguéis correspondem aos recebimentos **manuais**, sem conciliação bancária.

**Segurança:** `crm_rentals` e `crm_rent_receivables` possuem isolamento RLS por `agency_id`, com acesso somente a quem passa em `crm_is_manager`. Anônimos e corretores não podem consultar informações financeiras dos contratos. Gatilhos asseguram que os imóveis e os leads pertencem à própria imobiliária e bloqueiam a migração de contrato entre empresas. A função `crm_generate_rent_receivables` verifica empresa, contrato ativo e limite de mensalidades no próprio banco.

**Backup:** `backup.json` agora inclui `crm_rentals` e `crm_rent_receivables` da imobiliária no ZIP individual. Contratos, parcelas e dados de inquilinos são privados. A restauração ainda exige processo técnico.

**Observações:** o CASAS não envia boletos, Pix ou lembretes automáticos, não recolhe pagamentos e não faz integração bancária nesta etapa. O dia de vencimento fica entre 1 e 28 para funcionar em todos os meses. Evite cadastrar dados pessoais de inquilinos além do necessário e trate os backups conforme a LGPD.

Migrações: `0025_rental_crm.sql` e `0026_rental_integrity_guards.sql`. Testes unitários: `src/test/rentals.test.ts`. Antes da operação comercial, testar com uma imobiliária e um imóvel de locação, criar contrato, gerar parcelas, marcar recebido e conferir backup e relatórios; não há teste de ponta a ponta confirmado para esta entrega.

## Cadastro de empresas e corretores com e-mail confirmado (onboarding)

O cadastro de **novos clientes** agora permite autorizar e-mails diretamente no **Master → Meus clientes → Liberar acesso vendido**. Não é necessário pré-cadastrar usuários no Cloud. A função `master_authorize_agency_member` aceita:
- conta existente e com e-mail confirmado: vincula imediatamente ao `agency_members`;
- conta inexistente ou ainda não confirmada: registra autorização pendente de **14 dias**, não concede acesso antecipado. O master envia o link fixo `/acesso-cliente?empresa=<slug>`. O destinatário cria senha, recebe o e-mail de confirmação do **Auth** e depois ativa a empresa.

**Corretores:** o proprietário libera o e-mail em **CRM → Equipe**. O corretor usa `/acesso-corretor?empresa=<slug>`, cria senha, confirma o e-mail e ativa seu vínculo. Não recebe acesso aos dados de outra imobiliária. A confirmação de endereço é verificada no servidor por `email_confirmed_at`. Ambos os formulários têm a ação **Reenviar e-mail de confirmação** via `supabase.auth.resend({type:"signup",...})`.

**Antes de testar envio real:** em Lovable **More → Users → Settings → Email**, desligar **Auto-confirm email**. Confirmar configurações de Site URL, URLs de redirecionamento e do domínio publicado. Em **More → Emails**, configurar o domínio/remetente do CASAS e o template de confirmação; segundo a documentação do Lovable, seu serviço próprio de e-mails transacionais pode enviar mensagens da conta sem exigir serviço externo adicional. Esses ajustes de console não são feitos pelo GitHub e ainda precisam ser verificados por um responsável. Se o projeto for ligado a um Supabase externo em vez do Lovable Cloud, usar as configurações de Auth/SMTP daquele Supabase.

**Escopo ainda não implementado:** e-mail de convite disparado automaticamente quando o master autoriza o primeiro cliente ou o proprietário autoriza o corretor. Hoje o proprietário/admin copia e encaminha o link fixo pelo WhatsApp; o envio da **confirmação** é disparado pelo provedor Auth quando o destinatário inicia o cadastro e cria a senha. Para convite imediato no momento da autorização, precisaremos integrar o serviço de e-mails com uma ação autenticada do backend e um modelo de convite, sem expor credenciais no navegador. Não afirmar que o e-mail foi enviado até o serviço confirmar a entrega.

Migration: `0027_agency_self_registration.sql`. A confirmação deve ser validada com e-mails de teste reais antes do lançamento.
