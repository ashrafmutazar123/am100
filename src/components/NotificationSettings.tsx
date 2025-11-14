import React from 'react';
import { Bell, BellOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNotifications } from '@/hooks/useNotifications';
import { useToast } from '@/hooks/use-toast';

const NotificationSettings: React.FC = () => {
  const { permission, isSupported, requestPermission, sendNotification } = useNotifications();
  const { toast } = useToast();

  const handleEnableNotifications = async () => {
    const result = await requestPermission();
    
    if (result === 'granted') {
      toast({
        title: "Notifications Enabled",
        description: "You'll now receive alerts for sensor thresholds",
      });
      
      // Send test notification
      await sendNotification({
        title: '🌱 Notifications Enabled!',
        body: 'You will now receive real-time alerts from your farm monitoring system.',
        requireInteraction: false
      });
    } else {
      toast({
        title: "Notification Permission Denied",
        description: "Please enable notifications in your browser settings",
        variant: "destructive"
      });
    }
  };

  const handleTestNotification = async () => {
    const success = await sendNotification({
      title: '🚨 Test Alert',
      body: 'EC level is outside acceptable range: 5.2 mS/cm (Max: 4.0 mS/cm)',
      tag: 'test-notification',
      requireInteraction: true,
      data: { type: 'ec_alert', value: 5.2 }
    });

    if (success) {
      toast({
        title: "Test Notification Sent",
        description: "Check your notifications!",
      });
    }
  };

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5" />
            Notifications Not Supported
          </CardTitle>
          <CardDescription>
            Your browser doesn't support push notifications
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Push Notifications
        </CardTitle>
        <CardDescription>
          Receive real-time alerts when sensor values exceed thresholds
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Notification Status</p>
            <p className="text-sm text-muted-foreground">
              {permission === 'granted' && 'Enabled - You will receive alerts'}
              {permission === 'denied' && 'Denied - Enable in browser settings'}
              {permission === 'default' && 'Not enabled - Click to enable'}
            </p>
          </div>
          <Badge 
            variant={permission === 'granted' ? 'default' : 'secondary'}
            className={permission === 'granted' ? 'bg-green-500' : ''}
          >
            {permission === 'granted' ? 'Enabled' : 'Disabled'}
          </Badge>
        </div>

        <div className="flex gap-2">
          {permission !== 'granted' && (
            <Button onClick={handleEnableNotifications} className="flex-1">
              <Bell className="mr-2 h-4 w-4" />
              Enable Notifications
            </Button>
          )}
          
          {permission === 'granted' && (
            <Button onClick={handleTestNotification} variant="outline" className="flex-1">
              Send Test Alert
            </Button>
          )}
        </div>

        <div className="text-xs text-muted-foreground space-y-1">
          <p>✅ Works even when app is closed</p>
          <p>✅ Alerts for EC, Temperature, and Water Level</p>
          <p>✅ Can be dismissed or viewed immediately</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default NotificationSettings;