import { useState, useEffect } from 'react';
import { fetchSensorConfig, upsertSensorConfig, SensorConfig } from '@/lib/supabase';
import DashboardHeader from '@/components/DashboardHeader';
import ECMonitorCard from '@/components/ECMonitorCard';
import WaterLevelCard from '@/components/WaterLevelCard';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Download, Wifi, WifiOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMqttSensorData } from '@/hooks/useMQTTSensorData';

const Dashboard = () => {
  const [tankHeightMm, setTankHeightMm] = useState(200);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [ecThreshold, setECThreshold] = useState({ min: 1.2, max: 4.0 });
  const [waterlevelMin, setWaterlevelMin] = useState(50);
  const [waterlevelMax, setWaterlevelMax] = useState(200);
  const { toast } = useToast();
  
  // Use MQTT data from broker
  const { dataHistory, isConnected, error } = useMqttSensorData();

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
    setTimeout(() => {
      setIsRefreshing(false);
      toast({
        title: "Refreshed",
        description: "Dashboard updated with latest data.",
      });
    }, 500);
  };

  const handleDownload = () => {
    if (dataHistory.length === 0) {
      toast({
        title: "No data available",
        description: "No sensor data to export.",
        variant: "destructive",
      });
      return;
    }

    // Create CSV data
    const csvData = [
      ['Timestamp', 'EC (µS/cm)', 'EC (mS/cm)', 'Water Level (mmH2O)', 'Water Level (%)', 'Water Temperature (°C)'],
      ...dataHistory.map((reading) => [
        new Date(reading.updated_at).toISOString(),
        reading.ec_val.toFixed(0),
        (reading.ec_val / 1000).toFixed(2),
        reading.waterlevel.toFixed(0),
        Math.min(100, Math.max(0, (reading.waterlevel / tankHeightMm) * 100)).toFixed(1),
        reading.watertemp.toFixed(1)
      ])
    ];
    
    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sensor-data-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast({
      title: "Download complete",
      description: "Data exported successfully.",
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 p-4 sm:p-6 font-sans relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 via-transparent to-cyan-50/30"></div>
      <div className="absolute inset-0 bg-gradient-to-tl from-slate-50/20 via-transparent to-blue-50/20"></div>
      
      <div className="relative z-10 max-w-7xl mx-auto space-y-8">
        <DashboardHeader
          farmName="GreenGrow NFT Farm"
          lastUpdate={lastUpdate}
          isOnline={isOnline}
        />
        
        {/* MQTT Status Indicator */}
        <div className="flex justify-center">
          <Badge variant="outline" className="flex items-center gap-2 px-4 py-2 text-sm">
            {isConnected ? (
              <>
                <Wifi className="h-4 w-4 text-green-600" />
                <span className="font-medium">MQTT Connected</span>
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              </>
            ) : (
              <>
                <WifiOff className="h-4 w-4 text-red-600" />
                <span className="font-medium">MQTT Disconnected</span>
                <div className="w-2 h-2 rounded-full bg-red-500" />
              </>
            )}
          </Badge>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
            <p className="text-red-800 font-medium">⚠️ {error}</p>
          </div>
        )}
        
        {/* Action buttons */}
        <div className="flex flex-wrap gap-5 justify-end">
          <Button
            variant="outline"
            size="lg"
            onClick={handleDownload}
            className="bg-gradient-to-r from-white via-slate-50 to-white backdrop-blur-sm border-slate-200 
              shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 hover:bg-slate-50 
              hover:border-emerald-300 px-6 py-3 text-base font-semibold text-slate-700"
          >
            <Download className="h-5 w-5 mr-3" />
            Export Data
          </Button>

          <Button
            variant="default"
            size="lg"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-600 shadow-lg hover:shadow-xl 
              transition-all duration-200 hover:scale-105 hover:from-emerald-700 hover:via-emerald-600 hover:to-emerald-700
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

        {/* Footer */}
        <footer className="text-center pt-12 pb-6 border-t border-gray-100 mt-12">
          <div className="flex flex-col items-center gap-2">
            <p className="text-base font-semibold text-gray-700 drop-shadow-sm">
              Powered by REDtone
            </p>
            <p className="text-sm font-medium text-gray-500">
              © 2025 Fertilizer Monitoring System
            </p>
            <div className="flex items-center gap-2 mt-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Dashboard;