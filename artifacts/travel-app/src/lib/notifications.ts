// iOS Push Notification Service for Capacitor
// This handles native push notifications on iOS devices

interface NotificationPermission {
  granted: boolean;
  denied: boolean;
}

interface PushNotificationToken {
  token: string;
}

// TODO: When Capacitor is installed, uncomment these imports
// import { PushNotifications } from '@capacitor/push-notifications';
// import { LocalNotifications } from '@capacitor/local-notifications';

export class NotificationService {
  private static instance: NotificationService;
  private token: string | null = null;

  private constructor() {}

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async requestPermissions(): Promise<boolean> {
    try {
      // TODO: Replace with actual Capacitor implementation when installed
      // For now, use browser Notification API as fallback
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        console.log('Notification permission:', permission);
        return permission === 'granted';
      }

      /* Capacitor iOS implementation:
      const result = await PushNotifications.requestPermissions();
      return result.receive === 'granted';
      */
      
      return true; // Fallback for development
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  async checkPermissions(): Promise<NotificationPermission> {
    try {
      // Browser fallback
      if ('Notification' in window) {
        return {
          granted: Notification.permission === 'granted',
          denied: Notification.permission === 'denied',
        };
      }

      /* Capacitor iOS implementation:
      const result = await PushNotifications.checkPermissions();
      return {
        granted: result.receive === 'granted',
        denied: result.receive === 'denied',
      };
      */

      return { granted: false, denied: false };
    } catch (error) {
      console.error('Error checking permissions:', error);
      return { granted: false, denied: false };
    }
  }

  async registerForPushNotifications(): Promise<string | null> {
    try {
      const hasPermission = await this.requestPermissions();
      
      if (!hasPermission) {
        console.log('Push notification permission not granted');
        return null;
      }

      /* Capacitor iOS implementation:
      await PushNotifications.register();
      
      // Listen for registration success
      await PushNotifications.addListener('registration', (token: PushNotificationToken) => {
        console.log('Push registration success, token:', token.token);
        this.token = token.token;
        // TODO: Send token to your backend server
        this.sendTokenToServer(token.token);
      });

      // Listen for registration errors
      await PushNotifications.addListener('registrationError', (error: any) => {
        console.error('Push registration error:', error);
      });

      // Listen for push notifications received
      await PushNotifications.addListener('pushNotificationReceived', (notification: any) => {
        console.log('Push notification received:', notification);
        this.handleNotificationReceived(notification);
      });

      // Listen for push notification actions
      await PushNotifications.addListener('pushNotificationActionPerformed', (notification: any) => {
        console.log('Push notification action performed:', notification);
        this.handleNotificationAction(notification);
      });
      */

      console.log('Push notifications registered (development mode)');
      return 'dev-token-' + Date.now();
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      return null;
    }
  }

  async scheduleLocalNotification(
    title: string,
    body: string,
    scheduledTime: Date,
    id?: number
  ): Promise<void> {
    try {
      /* Capacitor implementation:
      await LocalNotifications.schedule({
        notifications: [
          {
            title,
            body,
            id: id || Date.now(),
            schedule: { at: scheduledTime },
            sound: 'default',
            attachments: undefined,
            actionTypeId: '',
            extra: null
          }
        ]
      });
      */

      console.log(`Local notification scheduled: ${title} at ${scheduledTime}`);
      
      // Browser fallback for development
      if ('Notification' in window && Notification.permission === 'granted') {
        const timeUntil = scheduledTime.getTime() - Date.now();
        if (timeUntil > 0) {
          setTimeout(() => {
            new Notification(title, { body });
          }, timeUntil);
        }
      }
    } catch (error) {
      console.error('Error scheduling local notification:', error);
    }
  }

  async cancelNotification(id: number): Promise<void> {
    try {
      /* Capacitor implementation:
      await LocalNotifications.cancel({ notifications: [{ id }] });
      */
      console.log(`Notification ${id} cancelled`);
    } catch (error) {
      console.error('Error cancelling notification:', error);
    }
  }

  async cancelAllNotifications(): Promise<void> {
    try {
      /* Capacitor implementation:
      await LocalNotifications.cancel({ notifications: [] });
      */
      console.log('All notifications cancelled');
    } catch (error) {
      console.error('Error cancelling all notifications:', error);
    }
  }

  private async sendTokenToServer(token: string): Promise<void> {
    try {
      // TODO: Send token to your backend
      const response = await fetch('/api/notifications/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, platform: 'ios' }),
      });
      
      if (response.ok) {
        console.log('Token registered with server');
      }
    } catch (error) {
      console.error('Error sending token to server:', error);
    }
  }

  private handleNotificationReceived(notification: any): void {
    console.log('Handling received notification:', notification);
    // Custom handling when notification is received while app is in foreground
  }

  private handleNotificationAction(notification: any): void {
    console.log('Handling notification action:', notification);
    // Handle when user taps on notification
    // Navigate to relevant screen based on notification data
  }

  getToken(): string | null {
    return this.token;
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance();
