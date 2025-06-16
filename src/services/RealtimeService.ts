import { supabase } from './supabase';
import NotificationService from './NotificationService';

class RealtimeService {
  private static instance: RealtimeService;
  private channels: Map<string, any> = new Map();

  private constructor() {}

  static getInstance(): RealtimeService {
    if (!RealtimeService.instance) {
      RealtimeService.instance = new RealtimeService();
    }
    return RealtimeService.instance;
  }

  // Subscribe to table changes for real-time updates
  subscribeToTableChanges(restaurantId: string, callback: (payload: any) => void) {
    const channelName = `mesas_${restaurantId}`;
    
    if (this.channels.has(channelName)) {
      return () => this.unsubscribe(channelName);
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mesas',
          filter: `restaurante_id=eq.${restaurantId}`
        },
        callback
      )
      .subscribe();

    this.channels.set(channelName, channel);

    return () => this.unsubscribe(channelName);
  }

  // Subscribe to order changes
  subscribeToOrderChanges(restaurantId: string, callback: (payload: any) => void) {
    const channelName = `comandas_${restaurantId}`;
    
    if (this.channels.has(channelName)) {
      return () => this.unsubscribe(channelName);
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comandas'
        },
        callback
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'itens_comanda'
        },
        callback
      )
      .subscribe();

    this.channels.set(channelName, channel);

    return () => this.unsubscribe(channelName);
  }

  // Subscribe to inventory changes
  subscribeToInventoryChanges(restaurantId: string, callback: (payload: any) => void) {
    const channelName = `inventory_${restaurantId}`;
    
    if (this.channels.has(channelName)) {
      return () => this.unsubscribe(channelName);
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'insumos',
          filter: `restaurante_id=eq.${restaurantId}`
        },
        (payload) => {
          callback(payload);
          
          // Check for low stock and send notifications
          if (payload.eventType === 'UPDATE' && payload.new) {
            const { nome, quantidade, quantidade_minima } = payload.new;
            if (quantidade <= quantidade_minima) {
              NotificationService.sendStockAlert(
                restaurantId,
                nome,
                quantidade,
                quantidade_minima
              );
            }
          }
        }
      )
      .subscribe();

    this.channels.set(channelName, channel);

    return () => this.unsubscribe(channelName);
  }

  // Subscribe to cash register changes
  subscribeToCashRegisterChanges(restaurantId: string, callback: (payload: any) => void) {
    const channelName = `caixa_${restaurantId}`;
    
    if (this.channels.has(channelName)) {
      return () => this.unsubscribe(channelName);
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'caixas',
          filter: `restaurante_id=eq.${restaurantId}`
        },
        callback
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'movimentacoes_caixa'
        },
        callback
      )
      .subscribe();

    this.channels.set(channelName, channel);

    return () => this.unsubscribe(channelName);
  }

  // Unsubscribe from a channel
  private unsubscribe(channelName: string) {
    const channel = this.channels.get(channelName);
    if (channel) {
      supabase.removeChannel(channel);
      this.channels.delete(channelName);
    }
  }

  // Unsubscribe from all channels
  unsubscribeAll() {
    this.channels.forEach((channel, channelName) => {
      supabase.removeChannel(channel);
    });
    this.channels.clear();
  }

  // Send real-time broadcast message
  async sendBroadcast(channel: string, event: string, payload: any) {
    try {
      await supabase.channel(channel).send({
        type: 'broadcast',
        event,
        payload
      });
    } catch (error) {
      console.error('Error sending broadcast:', error);
    }
  }
}

export default RealtimeService.getInstance();