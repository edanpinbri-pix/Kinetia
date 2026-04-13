-- Increase kinetia-uploads bucket file size limit to 500MB
update storage.buckets
set file_size_limit = 524288000
where id = 'kinetia-uploads';
