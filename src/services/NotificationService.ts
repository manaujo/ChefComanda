import { supabase } from './supabase';

export interface NotificationData {
  title: string;
  message: string;
  type: 'order' | 'stock' | 'payment' | 'system';
  userId?: string;
  data?: any;
}

class NotificationService {
  private static instance: NotificationService;

  private constructor() {}

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  // Send notification to specific user
  async sendNotification(notification: NotificationData) {
    try {
      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: notification.userId,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          data: notification.data
        });

      if (error) throw error;

      // Send real-time notification via Supabase realtime
      await supabase.channel('notifications').send({
        type: 'broadcast',
        event: 'new_notification',
        payload: notification
      });

      return true;
    } catch (error) {
      console.error('Error sending notification:', error);
      return false;
    }
  }

  // Send notification to all users in a restaurant
  async sendRestaurantNotification(restaurantId: string, notification: Omit<NotificationData, 'userId'>) {
    try {
      // Get all users for this restaurant
      const { data: users, error } = await supabase
        .from('restaurantes')
        .select('user_id')
        .eq('id', restaurantId);

      if (error) throw error;

      // Send notification to each user
      const promises = users.map(user => 
        this.sendNotification({
          ...notification,
          userId: user.user_id
        })
      );

      await Promise.all(promises);
      return true;
    } catch (error) {
      console.error('Error sending restaurant notification:', error);
      return false;
    }
  }

  // Mark notification as read
  async markAsRead(notificationId: string) {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
  }

  // Get user notifications
  async getUserNotifications(userId: string, limit = 50) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting notifications:', error);
      return [];
    }
  }

  // Subscribe to real-time notifications
  subscribeToNotifications(userId: string, callback: (notification: any) => void) {
    const channel = supabase
      .channel('notifications')
      .on('broadcast', { event: 'new_notification' }, (payload) => {
        if (payload.payload.userId === userId) {
          callback(payload.payload);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  // Stock alert notifications
  async sendStockAlert(restaurantId: string, productName: string, currentStock: number, minStock: number) {
    return this.sendRestaurantNotification(restaurantId, {
      title: 'Estoque Baixo',
      message: `${productName} está com estoque baixo (${currentStock}/${minStock})`,
      type: 'stock',
      data: { productName, currentStock, minStock }
    });
  }

  // New order notifications
  async sendNewOrderNotification(restaurantId: string, tableNumber: number, orderItems: any[]) {
    return this.sendRestaurantNotification(restaurantId, {
      title: 'Novo Pedido',
      message: `Mesa ${tableNumber} fez um novo pedido`,
      type: 'order',
      data: { tableNumber, orderItems }
    });
  }

  // Payment notifications
  async sendPaymentNotification(userId: string, amount: number, method: string) {
    return this.sendNotification({
      userId,
      title: 'Pagamento Recebido',
      message: `Pagamento de R$ ${amount.toFixed(2)} via ${method}`,
      type: 'payment',
      data: { amount, method }
    });
  }
}

export default NotificationService.getInstance();