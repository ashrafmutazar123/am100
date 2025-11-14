import { useState, useEffect, useRef } from 'react';

export interface AppNotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
  data?: any;
}

const NOTIFICATION_COOLDOWN_MS = 5 * 60 * 1000;

export const useNotifications = () => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);

  // Store last sent time for each tag
  const lastSentRef = useRef<{ [tag: string]: number }>({});

  useEffect(() => {
    setIsSupported('Notification' in window && 'serviceWorker' in navigator);
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async (): Promise<NotificationPermission> => {
    if (!isSupported) {
      console.warn('Notifications not supported');
      return 'denied';
    }
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return 'denied';
    }
  };

  const sendNotification = async (options: AppNotificationOptions): Promise<boolean> => {
    if (!isSupported) {
      console.warn('Notifications not supported');
      return false;
    }

    // Cooldown logic
    const tag = options.tag || 'farm-alert';
    const now = Date.now();
    const lastSent = lastSentRef.current[tag] || 0;
    if (now - lastSent < NOTIFICATION_COOLDOWN_MS) {
      // Too soon, skip notification
      console.log(`⏳ Notification "${tag}" skipped due to cooldown.`);
      return false;
    }
    lastSentRef.current[tag] = now;

    // Request permission if not granted
    if (permission !== 'granted') {
      const newPermission = await requestPermission();
      if (newPermission !== 'granted') {
        return false;
      }
    }

    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(options.title, {
          body: options.body,
          icon: options.icon || '/am100/organic.gif',
          badge: options.badge || '/am100/organic.gif',
          tag,
          requireInteraction: options.requireInteraction ?? true,
          data: options.data,
          actions: [
            { action: 'view', title: 'View Dashboard' },
            { action: 'dismiss', title: 'Dismiss' }
          ],
          ...('vibrate' in navigator && { vibrate: [200, 100, 200] })
        } as NotificationOptions);
        console.log('📬 Notification sent:', options.title);
        return true;
      }
    } catch (error) {
      console.error('Error sending notification:', error);
      return false;
    }
    return false;
  };

  return {
    permission,
    isSupported,
    requestPermission,
    sendNotification
  };
};