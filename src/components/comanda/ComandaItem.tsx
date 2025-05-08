import React from 'react';
import { formatarDinheiro } from '../../utils/formatters';

interface ComandaItemProps {
  item: ItemComanda;
  onRemove: () => void;
}

const ComandaItem: React.FC<ComandaItemProps> = ({ item }) => {
  const valorTotal = item.preco * item.quantidade;
  
  return (
    <div className="py-4 flex justify-between items-center">
      <div className="flex-1">
        <div className="flex items-start">
          <span className="font-medium">{item.quantidade}x</span>
          <div className="ml-3">
            <h4 className="font-medium">{item.nome}</h4>
            <p className="text-sm text-gray-500">{item.observacao || 'Sem observações'}</p>
            <div className="mt-1 text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded inline-block">
              {item.categoria}
            </div>
            <div className={`mt-1 text-xs px-2 py-1 rounded inline-block ml-2 ${
              item.status === 'pendente' ? 'bg-yellow-100 text-yellow-800' :
              item.status === 'preparando' ? 'bg-blue-100 text-blue-800' :
              item.status === 'pronto' ? 'bg-green-100 text-green-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex items-center">
        <div className="text-right">
          <p className="text-gray-500 text-sm">{formatarDinheiro(item.preco)} un</p>
          <p className="font-medium">{formatarDinheiro(valorTotal)}</p>
        </div>
      </div>
    </div>
  );
};

export default ComandaItem;