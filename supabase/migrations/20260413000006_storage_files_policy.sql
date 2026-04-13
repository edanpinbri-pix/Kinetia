-- Allow authenticated users to upload design files (PSD/AI) to files/{user_id}/*
create policy "Authenticated users can upload files"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'kinetia-uploads'
    and (storage.foldername(name))[1] = 'files'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

create policy "Users can read own files"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'kinetia-uploads'
    and (storage.foldername(name))[1] = 'files'
    and (storage.foldername(name))[2] = auth.uid()::text
  );
