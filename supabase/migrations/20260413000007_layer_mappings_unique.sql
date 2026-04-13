-- Add unique constraint required for upsert onConflict
alter table public.project_layer_mappings
  add constraint project_layer_mappings_project_layer_unique
  unique (project_id, layer_id);
