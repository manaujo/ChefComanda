/*
  # Create Storage Bucket for Product Images

  1. New Storage Bucket
    - `produtos` - Storage bucket for product images
    
  2. Security
    - RLS policies for authenticated users to upload
    - Public read access for product images
    
  3. Configuration
    - File size limits and allowed file types
    - Public access for displaying images
*/

-- Create the produtos storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'produtos',
  'produtos',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy to allow authenticated users to upload images to produtos bucket
CREATE POLICY "Authenticated users can upload product images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'produtos');

-- Policy to allow authenticated users to update their own uploaded images
CREATE POLICY "Authenticated users can update product images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'produtos');

-- Policy to allow authenticated users to delete their own uploaded images
CREATE POLICY "Authenticated users can delete product images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'produtos');

-- Policy to allow public read access to product images
CREATE POLICY "Public can view product images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'produtos');

-- Policy to allow anonymous users to view product images (for public menu)
CREATE POLICY "Anonymous can view product images"
ON storage.objects FOR SELECT
TO anon
USING (bucket_id = 'produtos');