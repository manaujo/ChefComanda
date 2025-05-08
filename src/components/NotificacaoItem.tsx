import React from 'react';
import { Bell } from 'lucide-react';

interface NotificacaoItemProps {
  titulo: string;
  descricao: string;
  tempo: string;
  tipo: 'pedido' | 'alerta' | 'ifood';
  icone?: React.ReactNode;
}

const NotificacaoItem: React.FC<NotificacaoItemProps> = ({
  titulo,
  descricao,
  tempo,
  tipo,
  icone,
}) => {
  // Definir cores baseadas no tipo
  const tipoClasses = {
    pedido: 'bg-blue-100 text-blue-500',
    alerta: 'bg-red-100 text-red-500',
    ifood: 'bg-orange-100 text-orange-500',
  };

  return (
    <div className="flex items-start p-4 hover:bg-gray-50 transition-colors cursor-pointer">
      <div className={`p-2 rounded-full mr-3 ${tipoClasses[tipo]}`}>
        {icone || <Bell size={16} />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 truncate">{titulo}</p>
        <p className="text-sm text-gray-500">{descricao}</p>
      </div>
      <div className="text-xs text-gray-400">{tempo}</div>
    </div>
  );
};

export default NotificacaoItem;