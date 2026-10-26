# CASAS — plataforma imobiliária

Projeto integrado ao [GitHub](https://github.com/murilovieiradiasmeneses-spec/Casas) e ao [Lovable](https://lovable.dev/projects/9f3504e6-6ee6-44a7-9a3d-85854b38a9ce). O desenvolvimento pode ser feito **diretamente neste repositório**, e os commits na branch `main` sincronizam com o editor Lovable sem solicitar alterações ao agente de IA.

## Primeira versão

- Vitrine pública com catálogo de casas, apartamentos e terrenos para venda ou locação.
- Filtros por cidade, bairro, preço, quartos e tipo de imóvel.
- Mapa interativo OpenStreetMap com pins de preço, pop-up e link direto do anúncio.
- Página própria por imóvel: galeria, descrição, características, quartos, suítes, banheiros, vagas, áreas, endereço opcional e botão de WhatsApp.
- Painel administrativo com login por e-mail e senha, gestão de anúncios, publicação, fotos e posição do pin.
- Estrutura de agência associada aos imóveis para futura versão multiempresa.

**Importante:** o painel usa autenticação e políticas RLS no banco. Ter o código não cria automaticamente a sua conta de administrador. Consulte [docs/ADMIN.md](docs/ADMIN.md).

## Desenvolvimento local

Use Node.js 20+ e Bun ou npm:

```sh
git clone https://github.com/murilovieiradiasmeneses-spec/Casas.git
cd Casas
npm install
npm run dev
```

Variáveis de ambiente: conexão com Supabase/Lovable Cloud fornecida pelo projeto (`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` e equivalentes `VITE_`). Somente a chave **publicável** pode ficar no frontend; nunca comite uma chave secreta/service-role.

Comandos úteis: `npm run build`, `npm test`, `npm run lint`.

## Segurança e implantação

Anúncios despublicados e operações de gravação devem ser restritos pelas políticas RLS, não apenas pelo frontend. Fotos ficam em storage e precisam de configuração adequada de permissões. Configure e verifique o administrador seguindo [docs/ADMIN.md](docs/ADMIN.md) antes do uso real. O preview não equivale a produção publicada.

## Próximas etapas

Criar marcas e painéis isolados por imobiliária/construtora, membros por empresa, logotipos/domínios individuais e um painel comercial manual para contratos negociados pelo WhatsApp. Essas funções **não** fazem parte do MVP de administrador único.


## White-label / multi-empresa (fase inicial)

Este repositório contém o início da arquitetura SaaS para comercialização de acessos:
- Uma `agencies` por cliente, com logotipo, capa, cores, WhatsApp, Instagram e apresentação próprios.
- Vitrine separada em `/v/<slug-do-cliente>`, com catálogo, mapa e página individual do imóvel.
- Login em `/entrar`; o administrador geral administra empresas em `/admin/clientes`, e a marca em `/admin/marca`.
- Usuários da empresa recebem vínculo em `agency_members`: **owner** pode editar a marca e imóveis; **editor** pode editar apenas imóveis.
- Os imóveis são filtrados por `agency_id`; RLS no banco impede gravação e leitura de anúncios privados de outras empresas.
- O repositório **não contém cobrança automática, domínio personalizado validado nem emissão automática de login por e-mail**.

### Passo obrigatório para ativar

Após a migração inicial, aplicar `drizzle/migrations/0001_whitelabel.sql` e `drizzle/migrations/0002_tenant_guards.sql` no banco associado ao CASAS (se ainda não foram aplicadas). A sincronização de código GitHub → Lovable **não comprova** que alterações SQL foram executadas no banco. Não conceda acessos de clientes antes de validar as políticas RLS. Consulte `docs/ADMIN.md`.

### Domínios próprios

O campo `custom_domain` é uma preparação; apontar DNS e exibir o site em domínio próprio requer confirmação de propriedade e roteamento seguro no hosting. Não aponte domínios para esta aplicação até a implementação de verificação.


## Modelo comercial — pagamentos por WhatsApp

O pagamento e a negociação **acontecem fora do sistema**, diretamente pelo WhatsApp com o responsável pela plataforma. Não há checkout, integração de pagamento ou cobrança automática. A área **/admin/pagamentos** permite registrar manualmente valor, periodicidade, vencimento, data do último pagamento confirmado, status, telefone para conversa e observações de cada cliente.

Esses registros ficam em `agency_billing`, com acesso protegido por RLS e exclusivo do superadministrador. O botão abre o WhatsApp com mensagem sugerida, **sem enviar a mensagem automaticamente**. A situação financeira não suspende o acesso automaticamente; suspensões são feitas manualmente em `/admin/clientes`.

**Ativação:** aplicar também a migração `drizzle/migrations/0004_manual_whatsapp_billing.sql` ao banco antes de abrir a tela. O código em GitHub não executa migrações sozinho.
