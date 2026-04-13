-- Make source_file_url and source_file_type nullable for new projects
alter table public.projects
  alter column source_file_url  drop not null,
  alter column source_file_type drop not null;
