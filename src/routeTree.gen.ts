/* eslint-disable */
// @ts-nocheck
// Generated CASAS TanStack Router route manifest; router plugin may regenerate.

import { Route as rootRouteImport } from './routes/__root'
import { Route as IndexRouteImport } from './routes/index'
import { Route as AdminRouteImport } from './routes/admin'
import { Route as ClienteRouteImport } from './routes/cliente'
import { Route as CorretorRouteImport } from './routes/corretor'
import { Route as EntrarRouteImport } from './routes/entrar'
import { Route as ImoveisRouteImport } from './routes/imoveis'
import { Route as ImovelSlugRouteImport } from './routes/imovel.$slug'
import { Route as MapaRouteImport } from './routes/mapa'
import { Route as PainelRouteImport } from './routes/painel'
import { Route as RedefinirSenhaRouteImport } from './routes/redefinir-senha'
import { Route as VAgencySlugRouteImport } from './routes/v.$agencySlug'
import { Route as AdminIndexRouteImport } from './routes/admin.index'
import { Route as AdminIdRouteImport } from './routes/admin.$id'
import { Route as AdminClientesRouteImport } from './routes/admin.clientes'
import { Route as AdminCRMRouteImport } from './routes/admin.crm'
import { Route as AdminMarcaRouteImport } from './routes/admin.marca'
import { Route as AdminNovoRouteImport } from './routes/admin.novo'
import { Route as AdminPagamentosRouteImport } from './routes/admin.pagamentos'
import { Route as ClienteIndexRouteImport } from './routes/cliente.index'
import { Route as ClienteIdRouteImport } from './routes/cliente.$id'
import { Route as ClienteCRMRouteImport } from './routes/cliente.crm'
import { Route as ClienteMarcaRouteImport } from './routes/cliente.marca'
import { Route as ClienteNovoRouteImport } from './routes/cliente.novo'
import { Route as VAgencySlugIndexRouteImport } from './routes/v.$agencySlug.index'
import { Route as VAgencySlugImovelSlugRouteImport } from './routes/v.$agencySlug.imovel.$slug'

const IndexRoute = IndexRouteImport.update({
  id: '/',
  path: '/',
  getParentRoute: () => rootRouteImport,
} as any)
const AdminRoute = AdminRouteImport.update({
  id: '/admin',
  path: '/admin',
  getParentRoute: () => rootRouteImport,
} as any)
const ClienteRoute = ClienteRouteImport.update({
  id: '/cliente',
  path: '/cliente',
  getParentRoute: () => rootRouteImport,
} as any)
const CorretorRoute = CorretorRouteImport.update({
  id: '/corretor',
  path: '/corretor',
  getParentRoute: () => rootRouteImport,
} as any)
const EntrarRoute = EntrarRouteImport.update({
  id: '/entrar',
  path: '/entrar',
  getParentRoute: () => rootRouteImport,
} as any)
const ImoveisRoute = ImoveisRouteImport.update({
  id: '/imoveis',
  path: '/imoveis',
  getParentRoute: () => rootRouteImport,
} as any)
const ImovelSlugRoute = ImovelSlugRouteImport.update({
  id: '/imovel/$slug',
  path: '/imovel/$slug',
  getParentRoute: () => rootRouteImport,
} as any)
const MapaRoute = MapaRouteImport.update({
  id: '/mapa',
  path: '/mapa',
  getParentRoute: () => rootRouteImport,
} as any)
const PainelRoute = PainelRouteImport.update({
  id: '/painel',
  path: '/painel',
  getParentRoute: () => rootRouteImport,
} as any)
const RedefinirSenhaRoute = RedefinirSenhaRouteImport.update({
  id: '/redefinir-senha',
  path: '/redefinir-senha',
  getParentRoute: () => rootRouteImport,
} as any)
const VAgencySlugRoute = VAgencySlugRouteImport.update({
  id: '/v/$agencySlug',
  path: '/v/$agencySlug',
  getParentRoute: () => rootRouteImport,
} as any)
const AdminIndexRoute = AdminIndexRouteImport.update({
  id: '/admin/',
  path: '/',
  getParentRoute: () => AdminRoute,
} as any)
const AdminIdRoute = AdminIdRouteImport.update({
  id: '/admin/$id',
  path: '/$id',
  getParentRoute: () => AdminRoute,
} as any)
const AdminClientesRoute = AdminClientesRouteImport.update({
  id: '/admin/clientes',
  path: '/clientes',
  getParentRoute: () => AdminRoute,
} as any)
const AdminCRMRoute = AdminCRMRouteImport.update({
  id: '/admin/crm',
  path: '/crm',
  getParentRoute: () => AdminRoute,
} as any)
const AdminMarcaRoute = AdminMarcaRouteImport.update({
  id: '/admin/marca',
  path: '/marca',
  getParentRoute: () => AdminRoute,
} as any)
const AdminNovoRoute = AdminNovoRouteImport.update({
  id: '/admin/novo',
  path: '/novo',
  getParentRoute: () => AdminRoute,
} as any)
const AdminPagamentosRoute = AdminPagamentosRouteImport.update({
  id: '/admin/pagamentos',
  path: '/pagamentos',
  getParentRoute: () => AdminRoute,
} as any)
const ClienteIndexRoute = ClienteIndexRouteImport.update({
  id: '/cliente/',
  path: '/',
  getParentRoute: () => ClienteRoute,
} as any)
const ClienteIdRoute = ClienteIdRouteImport.update({
  id: '/cliente/$id',
  path: '/$id',
  getParentRoute: () => ClienteRoute,
} as any)
const ClienteCRMRoute = ClienteCRMRouteImport.update({
  id: '/cliente/crm',
  path: '/crm',
  getParentRoute: () => ClienteRoute,
} as any)
const ClienteMarcaRoute = ClienteMarcaRouteImport.update({
  id: '/cliente/marca',
  path: '/marca',
  getParentRoute: () => ClienteRoute,
} as any)
const ClienteNovoRoute = ClienteNovoRouteImport.update({
  id: '/cliente/novo',
  path: '/novo',
  getParentRoute: () => ClienteRoute,
} as any)
const VAgencySlugIndexRoute = VAgencySlugIndexRouteImport.update({
  id: '/v/$agencySlug/',
  path: '/',
  getParentRoute: () => VAgencySlugRoute,
} as any)
const VAgencySlugImovelSlugRoute = VAgencySlugImovelSlugRouteImport.update({
  id: '/v/$agencySlug/imovel/$slug',
  path: '/imovel/$slug',
  getParentRoute: () => VAgencySlugRoute,
} as any)

interface AdminRouteChildren {
  AdminIndexRoute: typeof AdminIndexRoute
  AdminIdRoute: typeof AdminIdRoute
  AdminClientesRoute: typeof AdminClientesRoute
  AdminCRMRoute: typeof AdminCRMRoute
  AdminMarcaRoute: typeof AdminMarcaRoute
  AdminNovoRoute: typeof AdminNovoRoute
  AdminPagamentosRoute: typeof AdminPagamentosRoute
}
const AdminRouteChildren: AdminRouteChildren = {
  AdminIndexRoute: AdminIndexRoute,
  AdminIdRoute: AdminIdRoute,
  AdminClientesRoute: AdminClientesRoute,
  AdminCRMRoute: AdminCRMRoute,
  AdminMarcaRoute: AdminMarcaRoute,
  AdminNovoRoute: AdminNovoRoute,
  AdminPagamentosRoute: AdminPagamentosRoute,
}
const AdminRouteWithChildren = AdminRoute._addFileChildren(AdminRouteChildren)

interface ClienteRouteChildren {
  ClienteIndexRoute: typeof ClienteIndexRoute
  ClienteIdRoute: typeof ClienteIdRoute
  ClienteCRMRoute: typeof ClienteCRMRoute
  ClienteMarcaRoute: typeof ClienteMarcaRoute
  ClienteNovoRoute: typeof ClienteNovoRoute
}
const ClienteRouteChildren: ClienteRouteChildren = {
  ClienteIndexRoute: ClienteIndexRoute,
  ClienteIdRoute: ClienteIdRoute,
  ClienteCRMRoute: ClienteCRMRoute,
  ClienteMarcaRoute: ClienteMarcaRoute,
  ClienteNovoRoute: ClienteNovoRoute,
}
const ClienteRouteWithChildren = ClienteRoute._addFileChildren(ClienteRouteChildren)

interface VAgencySlugRouteChildren {
  VAgencySlugIndexRoute: typeof VAgencySlugIndexRoute
  VAgencySlugImovelSlugRoute: typeof VAgencySlugImovelSlugRoute
}
const VAgencySlugRouteChildren: VAgencySlugRouteChildren = {
  VAgencySlugIndexRoute: VAgencySlugIndexRoute,
  VAgencySlugImovelSlugRoute: VAgencySlugImovelSlugRoute,
}
const VAgencySlugRouteWithChildren = VAgencySlugRoute._addFileChildren(VAgencySlugRouteChildren)

export interface FileRoutesByFullPath {
  '/': typeof IndexRoute
  '/admin': typeof AdminRouteWithChildren
  '/admin/': typeof AdminIndexRoute
  '/admin/$id': typeof AdminIdRoute
  '/admin/clientes': typeof AdminClientesRoute
  '/admin/crm': typeof AdminCRMRoute
  '/admin/marca': typeof AdminMarcaRoute
  '/admin/novo': typeof AdminNovoRoute
  '/admin/pagamentos': typeof AdminPagamentosRoute
  '/cliente': typeof ClienteRouteWithChildren
  '/cliente/': typeof ClienteIndexRoute
  '/cliente/$id': typeof ClienteIdRoute
  '/cliente/crm': typeof ClienteCRMRoute
  '/cliente/marca': typeof ClienteMarcaRoute
  '/cliente/novo': typeof ClienteNovoRoute
  '/corretor': typeof CorretorRoute
  '/entrar': typeof EntrarRoute
  '/imoveis': typeof ImoveisRoute
  '/imovel/$slug': typeof ImovelSlugRoute
  '/mapa': typeof MapaRoute
  '/painel': typeof PainelRoute
  '/redefinir-senha': typeof RedefinirSenhaRoute
  '/v/$agencySlug': typeof VAgencySlugRouteWithChildren
  '/v/$agencySlug/': typeof VAgencySlugIndexRoute
  '/v/$agencySlug/imovel/$slug': typeof VAgencySlugImovelSlugRoute
}
export interface FileRoutesByTo {
  '/': typeof IndexRoute
  '/admin': typeof AdminIndexRoute
  '/admin/$id': typeof AdminIdRoute
  '/admin/clientes': typeof AdminClientesRoute
  '/admin/crm': typeof AdminCRMRoute
  '/admin/marca': typeof AdminMarcaRoute
  '/admin/novo': typeof AdminNovoRoute
  '/admin/pagamentos': typeof AdminPagamentosRoute
  '/cliente': typeof ClienteIndexRoute
  '/cliente/$id': typeof ClienteIdRoute
  '/cliente/crm': typeof ClienteCRMRoute
  '/cliente/marca': typeof ClienteMarcaRoute
  '/cliente/novo': typeof ClienteNovoRoute
  '/corretor': typeof CorretorRoute
  '/entrar': typeof EntrarRoute
  '/imoveis': typeof ImoveisRoute
  '/imovel/$slug': typeof ImovelSlugRoute
  '/mapa': typeof MapaRoute
  '/painel': typeof PainelRoute
  '/redefinir-senha': typeof RedefinirSenhaRoute
  '/v/$agencySlug': typeof VAgencySlugIndexRoute
  '/v/$agencySlug/imovel/$slug': typeof VAgencySlugImovelSlugRoute
}
export interface FileRoutesById {
  __root__: typeof rootRouteImport
  '/': typeof IndexRoute
  '/admin': typeof AdminRouteWithChildren
  '/admin/': typeof AdminIndexRoute
  '/admin/$id': typeof AdminIdRoute
  '/admin/clientes': typeof AdminClientesRoute
  '/admin/crm': typeof AdminCRMRoute
  '/admin/marca': typeof AdminMarcaRoute
  '/admin/novo': typeof AdminNovoRoute
  '/admin/pagamentos': typeof AdminPagamentosRoute
  '/cliente': typeof ClienteRouteWithChildren
  '/cliente/': typeof ClienteIndexRoute
  '/cliente/$id': typeof ClienteIdRoute
  '/cliente/crm': typeof ClienteCRMRoute
  '/cliente/marca': typeof ClienteMarcaRoute
  '/cliente/novo': typeof ClienteNovoRoute
  '/corretor': typeof CorretorRoute
  '/entrar': typeof EntrarRoute
  '/imoveis': typeof ImoveisRoute
  '/imovel/$slug': typeof ImovelSlugRoute
  '/mapa': typeof MapaRoute
  '/painel': typeof PainelRoute
  '/redefinir-senha': typeof RedefinirSenhaRoute
  '/v/$agencySlug': typeof VAgencySlugRouteWithChildren
  '/v/$agencySlug/': typeof VAgencySlugIndexRoute
  '/v/$agencySlug/imovel/$slug': typeof VAgencySlugImovelSlugRoute
}
export interface FileRouteTypes {
  fileRoutesByFullPath: FileRoutesByFullPath
  fullPaths:
    | '/'
    | '/admin'
    | '/admin/'
    | '/admin/$id'
    | '/admin/clientes'
    | '/admin/crm'
    | '/admin/marca'
    | '/admin/novo'
    | '/admin/pagamentos'
    | '/cliente'
    | '/cliente/'
    | '/cliente/$id'
    | '/cliente/crm'
    | '/cliente/marca'
    | '/cliente/novo'
    | '/corretor'
    | '/entrar'
    | '/imoveis'
    | '/imovel/$slug'
    | '/mapa'
    | '/painel'
    | '/redefinir-senha'
    | '/v/$agencySlug'
    | '/v/$agencySlug/'
    | '/v/$agencySlug/imovel/$slug'
  fileRoutesByTo: FileRoutesByTo
  to:
    | '/'
    | '/admin'
    | '/admin/$id'
    | '/admin/clientes'
    | '/admin/crm'
    | '/admin/marca'
    | '/admin/novo'
    | '/admin/pagamentos'
    | '/cliente'
    | '/cliente/$id'
    | '/cliente/crm'
    | '/cliente/marca'
    | '/cliente/novo'
    | '/corretor'
    | '/entrar'
    | '/imoveis'
    | '/imovel/$slug'
    | '/mapa'
    | '/painel'
    | '/redefinir-senha'
    | '/v/$agencySlug'
    | '/v/$agencySlug/imovel/$slug'
  id:
    | '__root__'
    | '/'
    | '/admin'
    | '/admin/'
    | '/admin/$id'
    | '/admin/clientes'
    | '/admin/crm'
    | '/admin/marca'
    | '/admin/novo'
    | '/admin/pagamentos'
    | '/cliente'
    | '/cliente/'
    | '/cliente/$id'
    | '/cliente/crm'
    | '/cliente/marca'
    | '/cliente/novo'
    | '/corretor'
    | '/entrar'
    | '/imoveis'
    | '/imovel/$slug'
    | '/mapa'
    | '/painel'
    | '/redefinir-senha'
    | '/v/$agencySlug'
    | '/v/$agencySlug/'
    | '/v/$agencySlug/imovel/$slug'
  fileRoutesById: FileRoutesById
}

declare module '@tanstack/react-router' {
  interface FileRoutesByPath {
    '/': {
      id: '/'
      path: '/'
      fullPath: '/'
      preLoaderRoute: typeof IndexRouteImport
      parentRoute: typeof rootRouteImport
    }
    '/admin': {
      id: '/admin'
      path: '/admin'
      fullPath: '/admin'
      preLoaderRoute: typeof AdminRouteImport
      parentRoute: typeof rootRouteImport
    }
    '/admin/': {
      id: '/admin/'
      path: '/'
      fullPath: '/admin/'
      preLoaderRoute: typeof AdminIndexRouteImport
      parentRoute: typeof AdminRoute
    }
    '/admin/$id': {
      id: '/admin/$id'
      path: '/$id'
      fullPath: '/admin/$id'
      preLoaderRoute: typeof AdminIdRouteImport
      parentRoute: typeof AdminRoute
    }
    '/admin/clientes': {
      id: '/admin/clientes'
      path: '/clientes'
      fullPath: '/admin/clientes'
      preLoaderRoute: typeof AdminClientesRouteImport
      parentRoute: typeof AdminRoute
    }
    '/admin/crm': {
      id: '/admin/crm'
      path: '/crm'
      fullPath: '/admin/crm'
      preLoaderRoute: typeof AdminCRMRouteImport
      parentRoute: typeof AdminRoute
    }
    '/admin/marca': {
      id: '/admin/marca'
      path: '/marca'
      fullPath: '/admin/marca'
      preLoaderRoute: typeof AdminMarcaRouteImport
      parentRoute: typeof AdminRoute
    }
    '/admin/novo': {
      id: '/admin/novo'
      path: '/novo'
      fullPath: '/admin/novo'
      preLoaderRoute: typeof AdminNovoRouteImport
      parentRoute: typeof AdminRoute
    }
    '/admin/pagamentos': {
      id: '/admin/pagamentos'
      path: '/pagamentos'
      fullPath: '/admin/pagamentos'
      preLoaderRoute: typeof AdminPagamentosRouteImport
      parentRoute: typeof AdminRoute
    }
    '/cliente': {
      id: '/cliente'
      path: '/cliente'
      fullPath: '/cliente'
      preLoaderRoute: typeof ClienteRouteImport
      parentRoute: typeof rootRouteImport
    }
    '/cliente/': {
      id: '/cliente/'
      path: '/'
      fullPath: '/cliente/'
      preLoaderRoute: typeof ClienteIndexRouteImport
      parentRoute: typeof ClienteRoute
    }
    '/cliente/$id': {
      id: '/cliente/$id'
      path: '/$id'
      fullPath: '/cliente/$id'
      preLoaderRoute: typeof ClienteIdRouteImport
      parentRoute: typeof ClienteRoute
    }
    '/cliente/crm': {
      id: '/cliente/crm'
      path: '/crm'
      fullPath: '/cliente/crm'
      preLoaderRoute: typeof ClienteCRMRouteImport
      parentRoute: typeof ClienteRoute
    }
    '/cliente/marca': {
      id: '/cliente/marca'
      path: '/marca'
      fullPath: '/cliente/marca'
      preLoaderRoute: typeof ClienteMarcaRouteImport
      parentRoute: typeof ClienteRoute
    }
    '/cliente/novo': {
      id: '/cliente/novo'
      path: '/novo'
      fullPath: '/cliente/novo'
      preLoaderRoute: typeof ClienteNovoRouteImport
      parentRoute: typeof ClienteRoute
    }
    '/corretor': {
      id: '/corretor'
      path: '/corretor'
      fullPath: '/corretor'
      preLoaderRoute: typeof CorretorRouteImport
      parentRoute: typeof rootRouteImport
    }
    '/entrar': {
      id: '/entrar'
      path: '/entrar'
      fullPath: '/entrar'
      preLoaderRoute: typeof EntrarRouteImport
      parentRoute: typeof rootRouteImport
    }
    '/imoveis': {
      id: '/imoveis'
      path: '/imoveis'
      fullPath: '/imoveis'
      preLoaderRoute: typeof ImoveisRouteImport
      parentRoute: typeof rootRouteImport
    }
    '/imovel/$slug': {
      id: '/imovel/$slug'
      path: '/imovel/$slug'
      fullPath: '/imovel/$slug'
      preLoaderRoute: typeof ImovelSlugRouteImport
      parentRoute: typeof rootRouteImport
    }
    '/mapa': {
      id: '/mapa'
      path: '/mapa'
      fullPath: '/mapa'
      preLoaderRoute: typeof MapaRouteImport
      parentRoute: typeof rootRouteImport
    }
    '/painel': {
      id: '/painel'
      path: '/painel'
      fullPath: '/painel'
      preLoaderRoute: typeof PainelRouteImport
      parentRoute: typeof rootRouteImport
    }
    '/redefinir-senha': {
      id: '/redefinir-senha'
      path: '/redefinir-senha'
      fullPath: '/redefinir-senha'
      preLoaderRoute: typeof RedefinirSenhaRouteImport
      parentRoute: typeof rootRouteImport
    }
    '/v/$agencySlug': {
      id: '/v/$agencySlug'
      path: '/v/$agencySlug'
      fullPath: '/v/$agencySlug'
      preLoaderRoute: typeof VAgencySlugRouteImport
      parentRoute: typeof rootRouteImport
    }
    '/v/$agencySlug/': {
      id: '/v/$agencySlug/'
      path: '/'
      fullPath: '/v/$agencySlug/'
      preLoaderRoute: typeof VAgencySlugIndexRouteImport
      parentRoute: typeof VAgencySlugRoute
    }
    '/v/$agencySlug/imovel/$slug': {
      id: '/v/$agencySlug/imovel/$slug'
      path: '/imovel/$slug'
      fullPath: '/v/$agencySlug/imovel/$slug'
      preLoaderRoute: typeof VAgencySlugImovelSlugRouteImport
      parentRoute: typeof VAgencySlugRoute
    }
  }
}

export interface RootRouteChildren {
  IndexRoute: typeof IndexRoute
  AdminRoute: typeof AdminRouteWithChildren
  ClienteRoute: typeof ClienteRouteWithChildren
  CorretorRoute: typeof CorretorRoute
  EntrarRoute: typeof EntrarRoute
  ImoveisRoute: typeof ImoveisRoute
  ImovelSlugRoute: typeof ImovelSlugRoute
  MapaRoute: typeof MapaRoute
  PainelRoute: typeof PainelRoute
  RedefinirSenhaRoute: typeof RedefinirSenhaRoute
  VAgencySlugRoute: typeof VAgencySlugRouteWithChildren
}
const rootRouteChildren: RootRouteChildren = {
  IndexRoute: IndexRoute,
  AdminRoute: AdminRouteWithChildren,
  ClienteRoute: ClienteRouteWithChildren,
  CorretorRoute: CorretorRoute,
  EntrarRoute: EntrarRoute,
  ImoveisRoute: ImoveisRoute,
  ImovelSlugRoute: ImovelSlugRoute,
  MapaRoute: MapaRoute,
  PainelRoute: PainelRoute,
  RedefinirSenhaRoute: RedefinirSenhaRoute,
  VAgencySlugRoute: VAgencySlugRouteWithChildren,
}
export const routeTree = rootRouteImport
  ._addFileChildren(rootRouteChildren)
  ._addFileTypes<FileRouteTypes>()

import type { getRouter } from './router.tsx'
import type { startInstance } from './start.ts'
declare module '@tanstack/react-start' {
 interface Register {
  ssr: true
  router: Awaited<ReturnType<typeof getRouter>>
  config: Awaited<ReturnType<typeof startInstance.getOptions>>
 }
}
