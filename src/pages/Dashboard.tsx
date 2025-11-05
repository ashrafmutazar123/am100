import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { fetchSensorConfig, upsertSensorConfig, SensorConfig } from '@/lib/supabase';
import Sidebar from '@/components/Sidebar';
import DashboardHeader from '@/components/DashboardHeader';
import ECMonitorCard from '@/components/ECMonitorCard';
import WaterLevelCard from '@/components/WaterLevelCard';
import { DatePicker } from '@/components/DatePicker';
import LoadingAnimation from '@/components/LoadingAnimation';
import InstallPrompt from '@/components/InstallPrompt';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Download, Wifi, WifiOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMqttSensorData } from '@/hooks/useMQTTSensorData';

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

  return (
    <>
      {/* Loading Animation Overlay */}
      <LoadingAnimation isVisible={showLoadingAnimation} duration={1000} />
      
      {/* PWA Install Prompt */}
      <InstallPrompt />
      
      {/* Sidebar Navigation */}
      <Sidebar 
        activeItem="dashboard"
        onNavigate={(item) => console.log('Navigate to:', item)}
      />
      
      <div className="min-h-screen p-4 sm:p-6 font-sans relative overflow-hidden" style={{ backgroundColor: '#eef5f9' }}>
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-blue-50/20"></div>
        <div className="absolute inset-0 bg-gradient-to-tl from-transparent via-transparent to-white/10"></div>
        
        <div className="relative z-10 max-w-7xl mx-auto space-y-8">
          <DashboardHeader
            farmName="GreenGrow NFT Farm"
            lastUpdate={lastUpdate}
            isOnline={isOnline}
          />
        
        {/* MQTT Status Indicator - Teal theme */}
        <div className="flex justify-center">
          <Badge variant="outline" className="flex items-center gap-2 px-4 py-2 text-sm bg-white/80 backdrop-blur-sm">
            {isConnected ? (
              <>
                <Wifi className="h-4 w-4 text-teal-600" />
                <span className="font-medium">MQTT Connected</span>
                <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
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
        
        {/* Action buttons - Teal theme */}
        <div className="flex flex-wrap gap-5 justify-end">
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