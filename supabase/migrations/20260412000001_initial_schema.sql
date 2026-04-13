-- ─── Kinetia — Initial Schema ─────────────────────────────────────────────────
-- Uses Supabase Auth for users (auth.users table is managed by Supabase)

-- ─── Enums ────────────────────────────────────────────────────────────────────
create type project_status      as enum ('draft', 'processing', 'ready', 'exported');
create type training_job_status as enum ('queued', 'processing', 'completed', 'failed');
create type export_status       as enum ('pending', 'building', 'ready', 'failed');
create type source_file_type    as enum ('psd', 'ai', 'svg');

-- ─── Profiles ────────────────────────────────────────────────────────────────
-- Extends auth.users with display info
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  name       text not null default '',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create profile on signup
create function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── Presets ─────────────────────────────────────────────────────────────────
create table public.presets (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  name         text not null,
  category     text not null default 'custom',
  tags         text[] not null default '{}',
  micro_json   jsonb not null,
  thumbnail_url text not null default '',
  confidence   real not null default 0,
  duration     integer not null default 0,
  is_public    boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.presets enable row level security;

create policy "Users can manage own presets"
  on public.presets for all
  using (auth.uid() = user_id);

create policy "Public presets visible to all"
  on public.presets for select
  using (is_public = true);

create index presets_user_id_idx  on public.presets(user_id);
create index presets_category_idx on public.presets(category);

-- ─── Projects ────────────────────────────────────────────────────────────────
create table public.projects (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  name             text not null,
  status           project_status not null default 'draft',
  source_file_url  text not null,
  source_file_type source_file_type not null,
  layer_tree       jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

alter table public.projects enable row level security;

create policy "Users can manage own projects"
  on public.projects for all
  using (auth.uid() = user_id);

create index projects_user_id_idx on public.projects(user_id);

-- ─── Project Layer Mappings ───────────────────────────────────────────────────
create table public.project_layer_mappings (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  layer_id    text not null,
  preset_id   uuid references public.presets(id) on delete set null,
  layer_type  text not null,
  overrides   jsonb not null default '{}',
  order_index integer not null default 0
);

alter table public.project_layer_mappings enable row level security;

create policy "Users can manage own layer mappings"
  on public.project_layer_mappings for all
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_id and p.user_id = auth.uid()
    )
  );

create index layer_mappings_project_idx on public.project_layer_mappings(project_id);

-- ─── Training Jobs ────────────────────────────────────────────────────────────
create table public.training_jobs (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  video_url        text not null,
  status           training_job_status not null default 'queued',
  progress         real not null default 0,
  result_preset_id uuid references public.presets(id) on delete set null,
  error_message    text,
  created_at       timestamptz not null default now(),
  completed_at     timestamptz
);

alter table public.training_jobs enable row level security;

create policy "Users can manage own training jobs"
  on public.training_jobs for all
  using (auth.uid() = user_id);

create index training_jobs_user_id_idx on public.training_jobs(user_id);

-- ─── Export Packages ──────────────────────────────────────────────────────────
create table public.export_packages (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid not null references public.projects(id) on delete cascade,
  package_url    text not null default '',
  ae_project_url text,
  status         export_status not null default 'pending',
  created_at     timestamptz not null default now()
);

alter table public.export_packages enable row level security;

create policy "Users can manage own exports"
  on public.export_packages for all
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_id and p.user_id = auth.uid()
    )
  );

-- ─── Realtime — enable for training_jobs (progress updates) ──────────────────
alter publication supabase_realtime add table public.training_jobs;
alter publication supabase_realtime add table public.presets;
