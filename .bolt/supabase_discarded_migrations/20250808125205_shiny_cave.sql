/*
  # Corrigir Permissões do Storage para Produtos

  1. Bucket de Storage
    - Criar bucket 'produtos' se não existir
    
  2. Políticas de Segurança
    - Políticas específicas para o bucket produtos
    - Acesso público para leitura
    - Acesso autenticado para upload/edição
    
  3. Correções
    - Remove tentativas de modificar storage.objects diretamente
    - Usa apenas operações permitidas para buckets
*/

-- Inserir bucket produtos se não existir (usando INSERT com ON CONFLICT)
DO $$
BEGIN
  -- Verificar se o bucket já existe
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'produtos'
  ) THEN
    -- Criar o bucket produtos
    INSERT INTO storage.buckets (
      id, 
      name, 
      public, 
      file_size_limit, 
      allowed_mime_types
    ) VALUES (
      'produtos',
      'produtos', 
      true,
      5242880, -- 5MB
      ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
    );
  END IF;
END $$;

-- Criar políticas de storage apenas se não existirem
DO $$
BEGIN
  -- Política para upload de imagens (INSERT)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Authenticated users can upload product images'
  ) THEN
    CREATE POLICY "Authenticated users can upload product images"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'produtos');
  END IF;

  -- Política para atualização de imagens (UPDATE)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Authenticated users can update product images'
  ) THEN
    CREATE POLICY "Authenticated users can update product images"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (bucket_id = 'produtos');
  END IF;

  -- Política para exclusão de imagens (DELETE)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Authenticated users can delete product images'
  ) THEN
    CREATE POLICY "Authenticated users can delete product images"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'produtos');
  END IF;

  -- Política para visualização pública (SELECT)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Public can view product images'
  ) THEN
    CREATE POLICY "Public can view product images"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'produtos');
  END IF;

  -- Política para usuários anônimos visualizarem imagens
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Anonymous can view product images'
  ) THEN
    CREATE POLICY "Anonymous can view product images"
    ON storage.objects FOR SELECT
    TO anon
    USING (bucket_id = 'produtos');
  END IF;
END $$;

-- Verificar se RLS está habilitado na tabela storage.objects
-- (Não tentamos habilitar pois pode não ter permissão)
DO $$
BEGIN
  -- Apenas verificar se RLS está habilitado, não tentar habilitar
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'storage' 
    AND c.relname = 'objects' 
    AND c.relrowsecurity = true
  ) THEN
    -- Log que RLS não está habilitado, mas não falhar
    RAISE NOTICE 'RLS não está habilitado na tabela storage.objects. Isso pode ser normal dependendo da configuração do Supabase.';
  END IF;
END $$;