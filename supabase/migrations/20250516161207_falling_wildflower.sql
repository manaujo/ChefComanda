/*
  # Online Menu Schema

  1. New Tables
    - `cardapio_online`
      - Stores menu items for each restaurant
      - Links to restaurants table
      - Includes ordering and visibility controls
    
  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated access
*/

-- Create online menu items table
CREATE TABLE IF NOT EXISTS cardapio_online (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurante_id uuid REFERENCES restaurantes NOT NULL,
  nome text NOT NULL,
  descricao text,
  preco decimal(10,2) NOT NULL,
  categoria text NOT NULL,
  imagem_url text,
  ordem int DEFAULT 0,
  ativo boolean DEFAULT true,
  disponivel_online boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE cardapio_online ENABLE ROW LEVEL SECURITY;

-- Policies for online menu items
CREATE POLICY "Users can view restaurant menu items"
  ON cardapio_online FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM restaurantes
      WHERE restaurantes.id = cardapio_online.restaurante_id
      AND restaurantes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage restaurant menu items"
  ON cardapio_online FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM restaurantes
      WHERE restaurantes.id = cardapio_online.restaurante_id
      AND restaurantes.user_id = auth.uid()
    )
  );

-- Create index for ordering
CREATE INDEX cardapio_online_ordem_idx ON cardapio_online (restaurante_id, ordem);