import React from 'react';
import { Clock, Users } from 'lucide-react';
import { formatarTempo } from '../../utils/formatters';

interface MesaPreviewProps {
  mesa: Mesa;
}

const MesaPreview: React.FC<MesaPreviewProps> = ({ mesa }) => {
  const statusClasses = {
    livre: 'border-green-500 bg-green-50 text-green-700',
    ocupada: 'border-blue-500 bg-blue-50 text-blue-700',
    aguardando: 'border-orange-500 bg-orange-50 text-orange-700',
  };

  return (
    <div 
      className={`rounded-lg border p-3 cursor-pointer transition-all hover:shadow-md ${statusClasses[mesa.status]}`}
    >
      <div className="font-medium">Mesa {mesa.numero}</div>
      
      {mesa.status !== 'livre' && (
        <div className="mt-2 text-xs flex items-center">
          <Clock size={12} className="mr-1" />
          <span>{formatarTempo(mesa.horarioAbertura)}</span>
        </div>
      )}
      
      <div className="mt-1 text-xs flex items-center">
        <Users size={12} className="mr-1" />
        <span>{mesa.capacidade} pessoas</span>
      </div>
    </div>
  );
};

export default MesaPreview;