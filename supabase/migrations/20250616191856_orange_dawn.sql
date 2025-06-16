/*
  # Storage Setup

  1. New Storage
    - Create buckets for avatars and menu images
    - Set up proper policies for file access

  2. Security
    - Public read access for images
    - Authenticated upload access
*/

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES 
('avatars', 'avatars', true),
('cardapio', 'cardapio', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for avatars bucket
CREATE POLICY "Avatar images are publicly accessible" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar" ON storage.objects
FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own avatar" ON storage.objects
FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Policies for cardapio bucket
CREATE POLICY "Menu images are publicly accessible" ON storage.objects
FOR SELECT USING (bucket_id = 'cardapio');

CREATE POLICY "Restaurant owners can upload menu images" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'cardapio' AND auth.role() = 'authenticated');

CREATE POLICY "Restaurant owners can update menu images" ON storage.objects
FOR UPDATE USING (bucket_id = 'cardapio' AND auth.role() = 'authenticated');

CREATE POLICY "Restaurant owners can delete menu images" ON storage.objects
FOR DELETE USING (bucket_id = 'cardapio' AND auth.role() = 'authenticated');