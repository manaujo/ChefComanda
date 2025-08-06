import { useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

interface UseRealtimeOptions {
  table: string;
  filter?: string;
  onInsert?: (payload: any) => void;
  onUpdate?: (payload: any) => void;
  onDelete?: (payload: any) => void;
}

export const useRealtime = ({
  table,
  filter,
  onInsert,
  onUpdate,
  onDelete
}: UseRealtimeOptions) => {
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    // Create channel
    const channelName = `${table}_${filter || 'all'}_${Date.now()}`;
    const channel = supabase.channel(channelName);

    // Configure postgres changes listener
    let changeConfig: any = {
      event: '*',
      schema: 'public',
      table
    };

    if (filter) {
      changeConfig.filter = filter;
    }

    channel.on('postgres_changes', changeConfig, (payload) => {
      switch (payload.eventType) {
        case 'INSERT':
          onInsert?.(payload);
          break;
        case 'UPDATE':
          onUpdate?.(payload);
          break;
        case 'DELETE':
          onDelete?.(payload);
          break;
      }
    });

    // Subscribe to channel
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log(`Subscribed to ${table} changes`);
      }
    });

    channelRef.current = channel;

    // Cleanup on unmount
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [table, filter, onInsert, onUpdate, onDelete]);

  return {
    unsubscribe: () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    }
  };
};

// Hook específico para mesas
export const useMesasRealtime = (
  restauranteId: string,
  onMesaChange: (mesa: any) => void
) => {
  return useRealtime({
    table: 'mesas',
    filter: `restaurante_id=eq.${restauranteId}`,
    onInsert: (payload) => onMesaChange({ type: 'INSERT', data: payload.new }),
    onUpdate: (payload) => onMesaChange({ type: 'UPDATE', data: payload.new }),
    onDelete: (payload) => onMesaChange({ type: 'DELETE', data: payload.old })
  });
};

// Hook específico para comandas
export const useComandasRealtime = (
  restauranteId: string,
  onComandaChange: (comanda: any) => void
) => {
  return useRealtime({
    table: 'comandas',
    onInsert: (payload) => onComandaChange({ type: 'INSERT', data: payload.new }),
    onUpdate: (payload) => onComandaChange({ type: 'UPDATE', data: payload.new }),
    onDelete: (payload) => onComandaChange({ type: 'DELETE', data: payload.old })
  });
};

// Hook específico para itens de comanda
export const useItensComandaRealtime = (
  onItemChange: (item: any) => void
) => {
  return useRealtime({
    table: 'itens_comanda',
    onInsert: (payload) => onItemChange({ type: 'INSERT', data: payload.new }),
    onUpdate: (payload) => onItemChange({ type: 'UPDATE', data: payload.new }),
    onDelete: (payload) => onItemChange({ type: 'DELETE', data: payload.old })
  });
};

// Hook específico para estoque
export const useEstoqueRealtime = (
  restauranteId: string,
  onEstoqueChange: (insumo: any) => void
) => {
  return useRealtime({
    table: 'insumos',
    filter: `restaurante_id=eq.${restauranteId}`,
    onInsert: (payload) => onEstoqueChange({ type: 'INSERT', data: payload.new }),
    onUpdate: (payload) => onEstoqueChange({ type: 'UPDATE', data: payload.new }),
    onDelete: (payload) => onEstoqueChange({ type: 'DELETE', data: payload.old })
  });
};