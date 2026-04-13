-- Allow PSD, AI, and other design file types in kinetia-uploads bucket
update storage.buckets
set allowed_mime_types = array[
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'image/vnd.adobe.photoshop',
  'application/pdf',
  'application/postscript',
  'application/illustrator',
  'application/octet-stream'
]
where id = 'kinetia-uploads';
