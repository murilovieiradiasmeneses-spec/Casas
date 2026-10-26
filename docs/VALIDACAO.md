# CASAS — Checklist de validação antes de vender acessos

Executar migrações 0000 (apenas se necessário), 0001, 0002 e 0003 em ordem. Testar com contas reais diferentes, uma empresa A e uma empresa B.

- [ ] Admin geral cria A e B e edita identidade das duas
- [ ] Login da empresa A só lista a empresa A; não acessa /admin/clientes
- [ ] Usuário owner A pode editar sua logo/cores; editor A não pode
- [ ] A não consegue ler rascunhos, alterar nem excluir imóveis ou fotos de B (diretamente pela API, não só via interface)
- [ ] Ao suspender A, vitrine A e seus anúncios públicos deixam de aparecer
- [ ] Pins de A abrem apenas páginas do catálogo A
- [ ] Link WhatsApp contém /v/A/imovel/slug e telefone correto
- [ ] Foto e logo são armazenadas e carregam após atualizar a página
- [ ] Login sem vínculo a qualquer empresa tem acesso negado
- [ ] Site mobile: vitrine, mapa, formulário e galeria
- [ ] Verificar execução de build e testes e conferir preview conectado
- [ ] Verificar se há mais dados privados exibidos pelo catálogo global do que a empresa autorizou

**Atenção:** o recurso show_address controla a exibição na interface, mas a coluna address ainda existe na tabela de anúncios; antes do lançamento, mova endereços reservados para armazenamento protegido ou utilize um endpoint público que omita explicitamente dados privados. O contrato de privacidade não deve prometer ocultação técnica de endereço até essa correção.
