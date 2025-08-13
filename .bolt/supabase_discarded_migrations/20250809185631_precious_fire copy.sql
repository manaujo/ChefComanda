/*
  # Criar Tabela de Categorias

  1. Nova Tabela
    - `categorias` - Categorias de produtos
      - `id` (uuid, primary key)
      - `restaurante_id` (uuid, foreign key)
      - `nome` (text, nome da categoria)
      - `descricao` (text, descrição opcional)
      - `ativa` (boolean, se a categoria está ativa)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Segurança
    - Enable RLS na tabela `categorias`
    - Política para proprietários do restaurante gerenciarem categorias

  3. Índices
    - Índice para restaurante_id
    - Índice para nome
*/

-- Criar tabela de categorias
CREATE TABLE IF NOT EXISTS categorias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurante_id uuid REFERENCES restaurantes(id) ON DELETE CASCADE,
  nome text NOT NULL,
  descricao text,
  ativa boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(restaurante_id, nome)
);

-- Habilitar RLS
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;

-- Política para proprietários do restaurante gerenciarem categorias
CREATE POLICY "Restaurant owners can manage categorias"
  ON categorias FOR ALL
  TO authenticated
  USING (
    restaurante_id IN (
      SELECT id FROM restaurantes WHERE user_id = auth.uid()
    )
  );

-- Trigger para atualizar updated_at
CREATE TRIGGER update_categorias_updated_at
  BEFORE UPDATE ON categorias
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_categorias_restaurante_id ON categorias(restaurante_id);
CREATE INDEX IF NOT EXISTS idx_categorias_nome ON categorias(nome);
CREATE INDEX IF NOT EXISTS idx_categorias_ativa ON categorias(ativa);

-- Inserir categorias padrão para restaurantes existentes
DO $$
DECLARE
  restaurante_record RECORD;
  categorias_padrao text[] := ARRAY[
    'Entradas',
    'Pratos Principais', 
    'Sobremesas',
    'Bebidas',
    'Lanches'
  ];
  categoria_nome text;
BEGIN
  -- Para cada restaurante existente
  FOR restaurante_record IN 
    SELECT id FROM restaurantes
  LOOP
    -- Inserir categorias padrão
    FOREACH categoria_nome IN ARRAY categorias_padrao
    LOOP
      INSERT INTO categorias (restaurante_id, nome, ativa)
      VALUES (restaurante_record.id, categoria_nome, true)
      ON CONFLICT (restaurante_id, nome) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;