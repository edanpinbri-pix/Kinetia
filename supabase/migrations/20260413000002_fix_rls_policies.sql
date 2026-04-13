-- Fix RLS policies missing WITH CHECK clause (blocks INSERT)

-- training_jobs
drop policy if exists "Users can manage own training jobs" on public.training_jobs;
create policy "Users can manage own training jobs"
  on public.training_jobs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- presets
drop policy if exists "Users can manage own presets" on public.presets;
create policy "Users can manage own presets"
  on public.presets for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- projects
drop policy if exists "Users can manage own projects" on public.projects;
create policy "Users can manage own projects"
  on public.projects for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- project_layer_mappings
drop policy if exists "Users can manage own layer mappings" on public.project_layer_mappings;
create policy "Users can manage own layer mappings"
  on public.project_layer_mappings for all
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_id and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = project_id and p.user_id = auth.uid()
    )
  );

-- export_packages
drop policy if exists "Users can manage own exports" on public.export_packages;
create policy "Users can manage own exports"
  on public.export_packages for all
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_id and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = project_id and p.user_id = auth.uid()
    )
  );
