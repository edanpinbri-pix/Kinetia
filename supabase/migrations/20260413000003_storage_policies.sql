-- Storage RLS policies for kinetia-uploads bucket

-- Authenticated users can upload to their own folder (videos/{user_id}/*)
create policy "Authenticated users can upload videos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'kinetia-uploads'
    and (storage.foldername(name))[1] = 'videos'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

-- Authenticated users can read their own uploads
create policy "Users can read own uploads"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'kinetia-uploads'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

-- Authenticated users can delete their own uploads
create policy "Users can delete own uploads"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'kinetia-uploads'
    and (storage.foldername(name))[2] = auth.uid()::text
  );
