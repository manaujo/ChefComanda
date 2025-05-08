import React from 'react';
import { TrendingUp } from 'lucide-react';
import { formatarDinheiro } from '../utils/formatters';

interface ProdutoPopularProps {
  produto: ProdutoPopular;
}

const ProdutoPopular: React.FC<ProdutoPopularProps> = ({ produto }) => {
  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-medium text-gray-900">{produto.nome}</h3>
        <div className="bg-blue-100 text-blue-600 text-xs font-medium px-2 py-0.5 rounded">
          {produto.categoria}
        </div>
      </div>
      
      <div className="mt-2 flex items-center text-sm text-gray-500">
        <span className="mr-2">Vendidos hoje:</span>
        <span className="font-semibold text-gray-900">{produto.vendidos}</span>
      </div>
      
      <div className="mt-2 flex items-center text-sm text-gray-500">
        <span className="mr-2">Valor unitário:</span>
        <span className="font-semibold text-gray-900">{formatarDinheiro(produto.preco)}</span>
      </div>
      
      <div className="mt-3 flex items-center">
        <div className="flex-1 bg-gray-200 rounded-full h-2">
          <div 
            className="bg-green-500 h-2 rounded-full" 
            style={{ width: `${Math.min(100, produto.percentual)}%` }}
          ></div>
        </div>
        <div className="ml-3 flex items-center text-xs text-green-600">
          <TrendingUp size={12} className="mr-1" />
          <span>{produto.percentual}%</span>
        </div>
      </div>
    </div>
  );
};

export default ProdutoPopular;