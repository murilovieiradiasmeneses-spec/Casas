# CASAS — Administração geral e acessos white-label

## 1. Primeiro superadministrador

A conta master não fica no código. No provedor de autenticação do Lovable Cloud/Supabase, crie um usuário com email e senha forte. No SQL Editor do banco, vincule seu UUID à função global:

```sql
insert into public.user_roles (user_id, role)
select id, 'admin'::public.app_role from auth.users
where email = 'SEU_EMAIL_AQUI'
on conflict (user_id, role) do nothing;
```

**Sem esse passo, você não terá acesso de superadministrador.** Ative MFA quando disponível.

## 2. Banco de dados

Aplique em ordem:
1. `drizzle/migrations/0000_casas_schema.sql` (apenas se banco ainda não tiver a estrutura);
2. `drizzle/migrations/0001_whitelabel.sql`;
3. `drizzle/migrations/0002_tenant_guards.sql`;
4. `drizzle/migrations/0003_tenant_public_security.sql`;
5. `drizzle/migrations/0004_manual_whatsapp_billing.sql`.

Confirme no banco que as tabelas `agencies`, `agency_members`, `properties` e as policies RLS existem. Confirme também buckets de imagens.

O primeiro script não deve ser executado duas vezes em banco já provisionado. Não assuma que commits no GitHub executam migrations por conta própria.

## 3. Cadastro e acesso vendido

1. Entre em `/entrar` com o superadministrador.
2. Abra `/admin/clientes` e cadastre a imobiliária/construtora com um identificador único.
3. A vitrine será `/v/identificador` e poderá ter nome, cores, logo e imagem de capa próprios.
4. Crie uma conta **individual para o cliente** em Auth → Users.
5. Em `/admin/clientes`, selecione a empresa e vincule o email cadastrado como **owner** (marca + imóveis) ou **editor** (imóveis).
6. O cliente entra pelo mesmo `/entrar` e só encontra suas empresas no seletor. Um superadmin pode abrir todos os clientes.
7. Suspender uma empresa desativa a vitrine pública e seu acesso administrativo à empresa (sem excluir os dados).

Para revogar uma conta, o superadmin pode excluir sua linha em `agency_members` via SQL Editor até criarmos gerenciamento de membros por tela.

## 4. Controle comercial manual via WhatsApp

Os clientes pagam diretamente ao responsável pela plataforma, em negociação conduzida no WhatsApp; **não existe checkout, link Pix gerado, cobrança automática nem confirmação bancária integrada**.

- Em `/admin/pagamentos`, o administrador geral escolhe a empresa e registra o **valor combinado**, periodicidade (mensal, trimestral, anual ou único), próximo vencimento, último pagamento conferido e status (não definido, pendente, pago ou atrasado).
- O cadastro privado também armazena o WhatsApp de cobrança do cliente e anotações internas.
- O botão **Abrir WhatsApp** prepara uma conversa; nenhuma mensagem é enviada automaticamente.
- O administrador altera o status financeiro **manualmente**, após confirmar o pagamento fora da plataforma.
- A situação de pagamento **não ativa ou suspende automaticamente** o acesso. A suspensão é uma decisão manual feita em `/admin/clientes`.
- RLS da tabela `agency_billing` permite leitura e edição **somente para o superadministrador**; imobiliárias não podem visualizar preço cobrado de outros clientes.

## 5. O que ainda falta para lançamento comercial

Não serão integrados gateways de pagamento nesta fase, pois a negociação e o recebimento serão realizados por WhatsApp. Domínios próprios e convite automático por email também não foram integrados. Também é preciso validar a separação das empresas, permissões e publicação em ambiente de testes antes de usar com clientes pagantes.

O site compartilhado `/` continua como catálogo central da plataforma; os sites white-label ficam em `/v/<slug>`. Os anúncios públicos do catálogo central são uma opção de marketplace — revisar essa regra de negócio antes do lançamento.
