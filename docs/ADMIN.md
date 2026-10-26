# CASAS — Primeiro administrador

Não existe cadastro público de administrador. O acesso ao `/admin` exige:
1. Uma conta de email+senha no Lovable Cloud.
2. Uma linha em `public.user_roles` com `role = 'admin'` para essa conta.

Toda gravação (anúncios, fotos, agências) é bloqueada no banco por RLS para quem não tem esse papel.

## Passo a passo
1. No Lovable, abra **Cloud → Users** e clique em **Add user** (email + senha forte, marcar como confirmado). Escolha você a senha; ela não fica no código.
2. Em **Cloud → Database → SQL**, execute (troque o email):
   ```sql
   insert into public.user_roles (user_id, role)
   select id, 'admin' from auth.users where email = 'seu-email@exemplo.com';
   ```
3. Acesse `/entrar`, faça login e use o painel em `/admin`.

Para revogar: `delete from public.user_roles where user_id = '<uuid>' and role = 'admin';`

## Multi-empresa (futuro)
Cada imóvel pertence a uma `agencies` (`agency_id`). Hoje há uma única agência `casas` e um admin global gerencia tudo.
Para cadastrar o WhatsApp padrão: `update public.agencies set whatsapp = '+5511...' where slug = 'casas';`
