create type public.app_role as enum ('admin','user');
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "Users read own roles" on public.user_roles for select to authenticated using (auth.uid() = user_id);

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create table public.agencies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  whatsapp text,
  email text,
  created_at timestamptz not null default now()
);
grant select on public.agencies to anon, authenticated;
grant insert, update, delete on public.agencies to authenticated;
grant all on public.agencies to service_role;
alter table public.agencies enable row level security;
create policy "Agencies public read" on public.agencies for select to anon, authenticated using (true);
create policy "Admins manage agencies" on public.agencies for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

insert into public.agencies (name, slug) values ('CASAS', 'casas');

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete restrict,
  slug text not null unique,
  title text not null,
  description text not null default '',
  property_type text not null check (property_type in ('casa','apartamento','terreno')),
  purpose text not null check (purpose in ('venda','locacao')),
  status text not null default 'disponivel' check (status in ('disponivel','reservado','vendido','alugado')),
  price numeric(14,2) not null check (price >= 0),
  bedrooms int not null default 0 check (bedrooms >= 0),
  suites int not null default 0 check (suites >= 0),
  bathrooms int not null default 0 check (bathrooms >= 0),
  parking int not null default 0 check (parking >= 0),
  built_area numeric(10,2),
  land_area numeric(10,2),
  address text,
  show_address boolean not null default false,
  cep text,
  neighborhood text not null,
  city text not null,
  state text not null check (char_length(state) = 2),
  latitude double precision,
  longitude double precision,
  features text[] not null default '{}',
  featured boolean not null default false,
  published boolean not null default false,
  cover_image_url text,
  whatsapp text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.properties (published, city);
grant select on public.properties to anon, authenticated;
grant insert, update, delete on public.properties to authenticated;
grant all on public.properties to service_role;
alter table public.properties enable row level security;
create policy "Public read published" on public.properties for select to anon, authenticated using (published = true);
create policy "Admins read all" on public.properties for select to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "Admins insert" on public.properties for insert to authenticated with check (public.has_role(auth.uid(),'admin'));
create policy "Admins update" on public.properties for update to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "Admins delete" on public.properties for delete to authenticated using (public.has_role(auth.uid(),'admin'));

create or replace function public.touch_updated_at() returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;
create trigger properties_touch before update on public.properties for each row execute function public.touch_updated_at();

create table public.property_images (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  url text not null,
  storage_path text,
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index on public.property_images (property_id, position);
grant select on public.property_images to anon, authenticated;
grant insert, update, delete on public.property_images to authenticated;
grant all on public.property_images to service_role;
alter table public.property_images enable row level security;
create policy "Public read images of published" on public.property_images for select to anon, authenticated
  using (exists (select 1 from public.properties p where p.id = property_id and p.published = true));
create policy "Admins read images" on public.property_images for select to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "Admins write images" on public.property_images for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create policy "Public read property photos" on storage.objects for select using (bucket_id = 'property-images');
create policy "Admins upload property photos" on storage.objects for insert to authenticated with check (bucket_id = 'property-images' and public.has_role(auth.uid(),'admin'));
create policy "Admins update property photos" on storage.objects for update to authenticated using (bucket_id = 'property-images' and public.has_role(auth.uid(),'admin'));
create policy "Admins delete property photos" on storage.objects for delete to authenticated using (bucket_id = 'property-images' and public.has_role(auth.uid(),'admin'));