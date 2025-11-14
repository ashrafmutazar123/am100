import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { fetchSensorConfig, upsertSensorConfig, SensorConfig } from '@/lib/supabase';
import DashboardHeader from '@/components/DashboardHeader';
import ECMonitorCard from '@/components/ECMonitorCard';
import WaterLevelCard from '@/components/WaterLevelCard';
import { DatePicker } from '@/components/DatePicker';
import LoadingAnimation from '@/components/LoadingAnimation';
import InstallPrompt from '@/components/InstallPrompt';
import RelayControlCard from '@/components/RelayControlCard';
import ScheduleManager from '@/components/Schedule.tsx';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Download, Bell, BellOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMqttSensorData } from '@/hooks/useMQTTSensorData';
import { useNotifications } from '@/hooks/useNotifications';
import mqtt from 'mqtt';

const Dashboard = () => {
  const [tankHeightMm, setTankHeightMm] = useState(200);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showLoadingAnimation, setShowLoadingAnimation] = useState(false);
  const [ecThreshold, setECThreshold] = useState({ min: 1.2, max: 4.0 });
  const [waterlevelMin, setWaterlevelMin] = useState(50);
  const [waterlevelMax, setWaterlevelMax] = useState(200);
  const [exportStart, setExportStart] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString().slice(0, 10);
  });
  const [exportEnd, setExportEnd] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const { toast } = useToast();
  
  // Use MQTT data from broker
  const { dataHistory, isConnected, error } = useMqttSensorData();
  const { permission, requestPermission, sendNotification } = useNotifications();

  // Load config from Supabase on mount
  useEffect(() => {
    fetchSensorConfig().then((config) => {
      if (config) {
        setTankHeightMm(config.tank_max ?? 200);
        setECThreshold({ min: config.ec_min ?? 1.2, max: config.ec_max ?? 4.0 });
        setWaterlevelMin(config.waterlevel_min ?? 50);
        setWaterlevelMax(config.waterlevel_max ?? 200);
      }
    });
  }, []);
  
  // Check if system is online based on data freshness
  const isOnline = isConnected && dataHistory.length > 0 && 
    (new Date().getTime() - new Date(dataHistory[0].updated_at).getTime()) < 2 * 60 * 1000; // 2 minutes threshold

  // Update last update time when new data arrives
  useEffect(() => {
    if (dataHistory.length > 0) {
      const newUpdateTime = new Date(dataHistory[0].updated_at);
      if (newUpdateTime.getTime() !== lastUpdate.getTime()) {
        setLastUpdate(newUpdateTime);
      }
    }
  }, [dataHistory]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setShowLoadingAnimation(true);
    
    setTimeout(() => {
      setIsRefreshing(false);
      setShowLoadingAnimation(false);
      toast({
        title: "Refreshed",
        description: "Dashboard updated with latest data.",
      });
    }, 1000);
  };

  // Format timestamp to DD/MM/YYYY HH:mm:ss
  function formatTimestamp(ts: string) {
    const date = new Date(ts);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }

  const handleDownload = async () => {
    // Use selected date range
    const startDate = new Date(exportStart);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(exportEnd);
    endDate.setHours(23, 59, 59, 999);

    const { supabase } = await import('@/lib/supabase');

    // Get total count of records in range
    const { count, error: countError } = await supabase
      .from('sensor_metrics')
      .select('*', { count: 'exact', head: true })
      .gte('updated_at', startDate.toISOString())
      .lte('updated_at', endDate.toISOString());

    if (countError || !count || count === 0) {
      toast({
        title: "No data available",
        description: "No sensor data found for selected range.",
        variant: "destructive",
      });
      return;
    }

    // Fetch all records in batches of 1000
    let allData: any[] = [];
    const batchSize = 1000;
    for (let from = 0; from < count; from += batchSize) {
      const to = Math.min(from + batchSize - 1, count - 1);
      const { data, error } = await supabase
        .from('sensor_metrics')
        .select('updated_at, ec_val, waterlevel, watertemp')
        .gte('updated_at', startDate.toISOString())
        .lte('updated_at', endDate.toISOString())
        .order('updated_at', { ascending: true })
        .range(from, to);

      if (error) {
        toast({
          title: "Export failed",
          description: error.message,
          variant: "destructive",
        });
        return;
      }
      if (data) allData = allData.concat(data);
    }

    // Build CSV
    const csvData = [
      ['Timestamp', 'EC (mS/cm)', 'Water Level (mmH2O)', 'Water Temperature (°C)'],
      ...allData.map((reading) => [
        formatTimestamp(reading.updated_at),
        (reading.ec_val / 1000).toFixed(2),
        reading.waterlevel.toFixed(0),
        reading.watertemp.toFixed(1)
      ])
    ];
    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sensor-data-${exportStart}_to_${exportEnd}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Download complete",
      description: `Exported ${allData.length} records for selected range.`,
    });
  };

  const handleThresholdUpdate = async (newRange: { min: number; max: number }) => {
    setECThreshold(newRange);
    // Save to Supabase
    await upsertSensorConfig({
      id: 1,
      ec_min: newRange.min,
      ec_max: newRange.max,
      tank_max: tankHeightMm,
      waterlevel_min: waterlevelMin,
      waterlevel_max: waterlevelMax,
    });
    toast({
      title: "Threshold updated",
      description: `EC range set to ${newRange.min} - ${newRange.max} mS/cm`,
    });
  };

  const handleTankHeightChange = async (newHeight: number) => {
    setTankHeightMm(newHeight);
    // Save to Supabase
    await upsertSensorConfig({
      id: 1,
      ec_min: ecThreshold.min,
      ec_max: ecThreshold.max,
      tank_max: newHeight,
      waterlevel_min: waterlevelMin,
      waterlevel_max: waterlevelMax,
    });
    toast({
      title: "Tank height updated",
      description: `Tank height set to ${newHeight} mm`,
    });
  };

  const handleQuickSelect = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    
    setExportStart(start.toISOString().slice(0, 10));
    setExportEnd(end.toISOString().slice(0, 10));
  };

  const handleNotificationToggle = async () => {
    if (!notificationsEnabled) {
      // Turning ON
      const result = await requestPermission();
      if (result === 'granted') {
        setNotificationsEnabled(true);
        toast({
          title: "Notifications Enabled",
          description: "Receive real-time alerts when sensor values exceed thresholds",
        });
        
        // Send welcome notification
        await sendNotification({
          title: '🌱 Notifications Enabled!',
          body: 'You will now receive real-time alerts from your farm monitoring system.',
          requireInteraction: false
        });
      } else {
        toast({
          title: "Permission Denied",
          description: "Please enable notifications in your browser settings",
          variant: "destructive"
        });
      }
    } else {
      // Turning OFF
      setNotificationsEnabled(false);
      toast({
        title: "Notifications Disabled",
        description: "Real-time alerts have been disabled",
      });
    }
  };

  // Handle schedule execution - sends MQTT commands for automated relay control
  const handleScheduleExecute = (relay: string, state: boolean, duration?: number) => {
    // Convert relay1 → R1, relay2 → R2, etc.
    const relayNum = relay.replace('relay', '');
    const command = `R${relayNum}${state ? 'ON' : 'OFF'}`;
    
    // MQTT broker configuration
    const MQTT_BROKER = 'wss://broker.emqx.io:8084/mqtt';
    const MQTT_TOPIC_RELAY = 'dtu/34EAE7F0701C/relay';
    
    // Create MQTT client and publish command
    const client = mqtt.connect(MQTT_BROKER, {
      clientId: `dashboard_schedule_${Math.random().toString(16).slice(2, 10)}`,
      clean: true,
      reconnectPeriod: 0, // Don't reconnect, one-shot command
    });
    
    client.on('connect', () => {
      console.log(`[Schedule] Publishing ${command} to ${MQTT_TOPIC_RELAY}`);
      client.publish(MQTT_TOPIC_RELAY, command, { qos: 1 }, (err) => {
        if (err) {
          console.error('[Schedule] Publish error:', err);
          toast({
            title: "Schedule Command Failed",
            description: `Failed to send ${command}`,
            variant: "destructive"
          });
        } else {
          toast({
            title: "Schedule Executed",
            description: `${command} sent successfully${duration ? ` (auto-off in ${duration}s)` : ''}`,
          });
        }
        client.end();
      });
    });
    
    client.on('error', (err) => {
      console.error('[Schedule] MQTT error:', err);
      toast({
        title: "MQTT Connection Error",
        description: "Failed to connect to broker",
        variant: "destructive"
      });
      client.end();
    });
  };

  // Add notification check function
  const checkAlertsAndNotify = (latestData: any, thresholds: any) => {
    if (!latestData || !notificationsEnabled) return;

    const ec_ms = latestData.ec_val / 1000;
    const temp = latestData.watertemp;
    const level = latestData.waterlevel;

    // EC Alerts
    if (ec_ms < thresholds.ec_min) {
      sendNotification({
        title: '🔻 EC Level LOW',
        body: `EC: ${ec_ms.toFixed(2)} mS/cm (Min: ${thresholds.ec_min} mS/cm)\nNutrient solution may be weak.`,
        tag: 'ec-low',
        data: { type: 'ec', status: 'low', value: ec_ms }
      });
    } else if (ec_ms > thresholds.ec_max) {
      sendNotification({
        title: '🔺 EC Level HIGH',
        body: `EC: ${ec_ms.toFixed(2)} mS/cm (Max: ${thresholds.ec_max} mS/cm)\nNutrient solution may be too concentrated.`,
        tag: 'ec-high',
        data: { type: 'ec', status: 'high', value: ec_ms }
      });
    }

    // Temperature Alerts
    if (temp < thresholds.temp_min) {
      sendNotification({
        title: '🔻 Temperature LOW',
        body: `Water Temp: ${temp}°C (Min: ${thresholds.temp_min}°C)\nMay slow plant growth.`,
        tag: 'temp-low',
        data: { type: 'temperature', status: 'low', value: temp }
      });
    } else if (temp > thresholds.temp_max) {
      sendNotification({
        title: '🔺 Temperature HIGH',
        body: `Water Temp: ${temp}°C (Max: ${thresholds.temp_max}°C)\nMay stress plants.`,
        tag: 'temp-high',
        data: { type: 'temperature', status: 'high', value: temp }
      });
    }

    // Water Level Alerts
    if (level < thresholds.waterlevel_min) {
      sendNotification({
        title: '🚨 Water Level CRITICAL',
        body: `Level: ${level} mmH₂O (Min: ${thresholds.waterlevel_min} mmH₂O)\nRefill reservoir immediately!`,
        tag: 'water-critical',
        requireInteraction: true,
        data: { type: 'waterlevel', status: 'critical', value: level }
      });
    } else if (level > thresholds.waterlevel_max) {
      sendNotification({
        title: '⚠️ Water Level HIGH',
        body: `Level: ${level} mmH₂O (Max: ${thresholds.waterlevel_max} mmH₂O)\nRisk of overflow.`,
        tag: 'water-high',
        data: { type: 'waterlevel', status: 'high', value: level }
      });
    }
  };

  // Add to your existing useEffect where you fetch sensor data
  useEffect(() => {
    if (dataHistory && dataHistory.length > 0) {
      const latestData = dataHistory[0];
      checkAlertsAndNotify(latestData, {
        ec_min: ecThreshold.min,
        ec_max: ecThreshold.max,
        temp_min: 20,
        temp_max: 30,
        waterlevel_min: waterlevelMin,
        waterlevel_max: waterlevelMax
      });
    }
  }, [dataHistory]);

  return (
    <>
      {/* Loading Animation Overlay */}
      <LoadingAnimation isVisible={showLoadingAnimation} duration={1000} />
      
      {/* PWA Install Prompt */}
      <InstallPrompt />
      
      <div className="min-h-screen p-4 sm:p-6 font-sans relative overflow-hidden" style={{ backgroundColor: '#eef5f9' }}>
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-blue-50/20"></div>
        <div className="absolute inset-0 bg-gradient-to-tl from-transparent via-transparent to-white/10"></div>
        
        <div className="relative z-10 max-w-7xl mx-auto space-y-8">
          <DashboardHeader
            farmName="GreenGrow NFT Farm"
            lastUpdate={lastUpdate}
            isOnline={isOnline}
          />

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
            <p className="text-red-800 font-medium">⚠️ {error}</p>
          </div>
        )}
        
        {/* Action buttons - Teal theme */}
        <div className="flex flex-wrap gap-5 justify-end">
          {/* Notification Toggle Button */}
          <Button
            variant="outline"
            size="lg"
            onClick={handleNotificationToggle}
            className={`backdrop-blur-sm border-2 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 px-6 py-3 text-base font-semibold
              ${notificationsEnabled 
                ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-400 text-green-700 hover:from-green-100 hover:to-emerald-100' 
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
          >
            {notificationsEnabled ? (
              <>
                <Bell className="h-5 w-5 mr-3 animate-pulse" />
                Alerts ON
              </>
            ) : (
              <>
                <BellOff className="h-5 w-5 mr-3" />
                Alerts OFF
              </>
            )}
          </Button>

          {/* Schedule Manager Button */}
          <ScheduleManager onScheduleExecute={handleScheduleExecute} />

          {/* Export Data Button triggers dialog */}
          <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="lg"
                className="bg-white backdrop-blur-sm border-slate-200 
                  shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 hover:bg-white 
                  hover:border-teal-300 px-6 py-3 text-base font-semibold text-slate-700"
              >
                <Download className="h-5 w-5 mr-3" />
                Export Data
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-xl bg-white rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                  <Download className="h-6 w-6 text-teal-600" />
                  Select Date Range for Export
                </DialogTitle>
              </DialogHeader>
              
              <DatePicker
                startDate={exportStart}
                endDate={exportEnd}
                onStartDateChange={setExportStart}
                onEndDateChange={setExportEnd}
                onQuickSelect={handleQuickSelect}
                showQuickSelect={true}
              />

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsExportDialogOpen(false)}
                  className="flex-1 hover:bg-slate-100 transition-all"
                >
                  Cancel
                </Button>
                <Button
                  variant="default"
                  onClick={() => {
                    setIsExportDialogOpen(false);
                    handleDownload();
                  }}
                  disabled={!exportStart || !exportEnd}
                  className="flex-1 bg-gradient-to-r from-teal-600 via-teal-500 to-teal-600 
                    hover:from-teal-700 hover:via-teal-600 hover:to-teal-700 
                    disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download CSV
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Button
            variant="default"
            size="lg"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="bg-gradient-to-r from-teal-600 via-teal-500 to-teal-600 shadow-lg hover:shadow-xl 
              transition-all duration-200 hover:scale-105 hover:from-teal-700 hover:via-teal-600 hover:to-teal-700
              px-6 py-3 text-base font-semibold text-white border-0"
          >
            <RefreshCw className={`h-5 w-5 mr-3 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>

        {/* Main monitoring cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <ECMonitorCard
            unit="mS/cm"
            optimalRange={ecThreshold}
            onRangeUpdate={handleThresholdUpdate}
            sensorData={dataHistory}
            loading={false}
            error={error}
            isConnected={isConnected}
          />
          
          <WaterLevelCard
            tankHeightMm={tankHeightMm}
            lowThreshold={25}
            onTankHeightChange={handleTankHeightChange}
            sensorData={dataHistory}
            loading={false}
            error={error}
            isConnected={isConnected}
          />
        </div>

        {/* ✨ NEW: Relay Control Card - Full width below sensor cards */}
        <div className="w-full">
          <RelayControlCard />
        </div>

        {/* Footer - Teal theme */}
        <footer className="text-center pt-12 pb-6 border-t border-gray-100 mt-12">
          <div className="flex flex-col items-center gap-2">
            <p className="text-base font-semibold text-gray-700 drop-shadow-sm">
              Powered by REDtone
            </p>
            <p className="text-sm font-medium text-gray-500">
              © 2025 Fertilizer Monitoring System
            </p>
            <div className="flex items-center gap-2 mt-2">
              <div className="w-2 h-2 bg-teal-500 rounded-full"></div>
              <div className="w-2 h-2 bg-cyan-500 rounded-full"></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            </div>
          </div>
        </footer>
        </div>
      </div>
    </>
  );
};

export default Dashboard;