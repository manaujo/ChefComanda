/**
 * Formata um valor numérico para moeda brasileira (BRL)
 */
export const formatarDinheiro = (valor: number): string => {
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
};

/**
 * Formata um timestamp para exibir o tempo desde a abertura
 */
export const formatarTempo = (timestamp: string): string => {
  const dataHora = new Date(timestamp);
  const agora = new Date();
  
  const diferencaMs = agora.getTime() - dataHora.getTime();
  const diferencaMinutos = Math.floor(diferencaMs / (1000 * 60));
  
  if (diferencaMinutos < 1) {
    return 'Agora mesmo';
  } else if (diferencaMinutos < 60) {
    return `${diferencaMinutos} min`;
  } else {
    const horas = Math.floor(diferencaMinutos / 60);
    const minutos = diferencaMinutos % 60;
    
    if (minutos === 0) {
      return `${horas}h`;
    } else {
      return `${horas}h ${minutos}min`;
    }
  }
};

/**
 * Formata o status do pedido para exibição
 */
export const formatarStatusPedido = (status: string): string => {
  const statusMap: Record<string, string> = {
    'pendente': 'Pendente',
    'preparando': 'Preparando',
    'pronto': 'Pronto',
    'entregue': 'Entregue',
    'cancelado': 'Cancelado'
  };
  
  return statusMap[status] || status;
};