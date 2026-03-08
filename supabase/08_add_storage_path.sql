-- Add storage_path column to generated_documents table
-- This allows us to store the relative path in the bucket (e.g. "user_id/timestamp_file.pdf")
-- which is required to generate Signed URLs for private buckets.

ALTER TABLE generated_documents 
ADD COLUMN IF NOT EXISTS storage_path TEXT;

-- Optional: Backfill storage_path from file_url for existing records if possible
-- This assumes standard Supabase URL structure. Use with caution or update manually.
-- UPDATE generated_documents 
-- SET storage_path = split_part(file_url, '/documents/', 2)
-- WHERE storage_path IS NULL AND file_url LIKE '%/documents/%';
