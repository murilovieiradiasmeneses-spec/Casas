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

Criar marcas e painéis isolados por imobiliária/construtora, membros por empresa, logotipos/domínios individuais e, se desejado, planos comerciais e cobrança. Essas funções **não** fazem parte do MVP de administrador único.
