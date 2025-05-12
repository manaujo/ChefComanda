import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { ChefHat, Coffee } from 'lucide-react';
import { useRestaurante } from '../contexts/RestauranteContext';
import { formatarDinheiro } from '../utils/formatters';

const CardapioPublico: React.FC = () => {
  const { produtos, categorias } = useRestaurante();
  const [searchParams] = useSearchParams();
  const mesaNumero = searchParams.get('mesa');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Simulate loading state
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Coffee className="w-12 h-12 mx-auto mb-4 text-blue-500 animate-spin" />
          <p className="text-gray-600">Carregando cardápio...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <ChefHat className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Cardápio Indisponível
          </h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Cardápio Digital
              </h1>
              <p className="text-gray-600 mt-1">
                Restaurante Nome
              </p>
            </div>
            {mesaNumero && (
              <div className="bg-blue-100 px-4 py-2 rounded-full">
                <p className="text-blue-800 font-medium">
                  Mesa {mesaNumero}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Menu Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="space-y-12">
          {categorias.map((categoria) => {
            const produtosDaCategoria = produtos.filter(
              p => p.categoria === categoria && p.disponivel
            );

            if (produtosDaCategoria.length === 0) return null;

            return (
              <div key={categoria} className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 pb-2 border-b">
                  {categoria}
                </h2>
                <div className="grid gap-6">
                  {produtosDaCategoria.map((produto) => (
                    <div
                      key={produto.id}
                      className="bg-white rounded-lg shadow-sm p-4 flex justify-between items-start"
                    >
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-gray-900">
                          {produto.nome}
                        </h3>
                        <p className="text-gray-600 mt-1">
                          {produto.descricao}
                        </p>
                      </div>
                      <div className="ml-4">
                        <p className="text-lg font-medium text-blue-600">
                          {formatarDinheiro(produto.preco)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CardapioPublico;