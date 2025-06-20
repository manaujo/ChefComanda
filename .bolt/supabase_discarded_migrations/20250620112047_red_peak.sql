/*
  # Configuração do Storage

  1. Buckets
    - avatars (para fotos de perfil)
    - cardapio (para imagens do cardápio)
    - documentos (para documentos da empresa)

  2. Políticas
    - Acesso público para leitura de imagens
    - Upload restrito para usuários autenticados
*/

-- Criar buckets de storage
INSERT INTO storage.buckets (id, name, public) VALUES 
('avatars', 'avatars', true),
('cardapio', 'cardapio', true),
('documentos', 'documentos', false)
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- POLÍTICAS PARA BUCKET AVATARS
-- =============================================

-- Permitir visualização pública de avatares
CREATE POLICY "Avatar images are publicly accessible" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

-- Permitir upload de avatar próprio
CREATE POLICY "Users can upload their own avatar" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Permitir atualização de avatar próprio
CREATE POLICY "Users can update their own avatar" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Permitir exclusão de avatar próprio
CREATE POLICY "Users can delete their own avatar" ON storage.objects
FOR DELETE USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- =============================================
-- POLÍTICAS PARA BUCKET CARDAPIO
-- =============================================

-- Permitir visualização pública de imagens do cardápio
CREATE POLICY "Menu images are publicly accessible" ON storage.objects
FOR SELECT USING (bucket_id = 'cardapio');

-- Permitir upload de imagens do cardápio para donos de restaurante
CREATE POLICY "Restaurant owners can upload menu images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'cardapio' 
  AND auth.role() = 'authenticated'
);

-- Permitir atualização de imagens do cardápio
CREATE POLICY "Restaurant owners can update menu images" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'cardapio' 
  AND auth.role() = 'authenticated'
);

-- Permitir exclusão de imagens do cardápio
CREATE POLICY "Restaurant owners can delete menu images" ON storage.objects
FOR DELETE USING (
  bucket_id = 'cardapio' 
  AND auth.role() = 'authenticated'
);

-- =============================================
-- POLÍTICAS PARA BUCKET DOCUMENTOS
-- =============================================

-- Permitir visualização de documentos próprios
CREATE POLICY "Users can view own documents" ON storage.objects
FOR SELECT USING (
  bucket_id = 'documentos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Permitir upload de documentos próprios
CREATE POLICY "Users can upload own documents" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'documentos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Permitir atualização de documentos próprios
CREATE POLICY "Users can update own documents" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'documentos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Permitir exclusão de documentos próprios
CREATE POLICY "Users can delete own documents" ON storage.objects
FOR DELETE USING (
  bucket_id = 'documentos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);