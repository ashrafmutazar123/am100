import { useState, useEffect } from 'react';
import DashboardHeader from '@/components/DashboardHeader';
import ECMonitorCard from '@/components/ECMonitorCard';
import WaterLevelCard from '@/components/WaterLevelCard';

import { Button } from '@/components/ui/button';
import { RefreshCw, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRealtimeSensorData } from '@/hooks/useRealtimeSensorData';
import { useSensorConfig } from '@/hooks/useSensorConfig';

const Dashboard = () => {
  const { ecMin, ecMax, tankMax, loading: configLoading, save: saveConfig } = useSensorConfig();
  const [tankHeightMm, setTankHeightMm] = useState(320);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [ecThreshold, setECThreshold] = useState({ min: 1.2, max: 2.0 });
  const { toast } = useToast();
  
  // Hydrate local state from config
  useEffect(() => {
    setECThreshold({ min: ecMin, max: ecMax });
    setTankHeightMm(tankMax);
  }, [ecMin, ecMax, tankMax]);
  
  // Use real-time data from Supabase
  const { data: sensorData, loading, error, isConnected } = useRealtimeSensorData(50);
  
  // Get current values from latest sensor reading with unit conversions
  const currentEC = sensorData && sensorData.length > 0 ? sensorData[0].ec_val / 1000 : 0; // Convert µS/cm to mS/cm
  const waterLevelMm = sensorData && sensorData.length > 0 ? sensorData[0].waterlevel : 0; // mmH2O
  const waterLevel = Math.min(100, Math.max(0, (waterLevelMm / tankHeightMm) * 100)); // Convert to percentage
  
  // Check if system is online based on data freshness (5 minutes threshold)
  const isOnline = isConnected && sensorData && sensorData.length > 0 && 
    (new Date().getTime() - new Date(sensorData[0].updated_at).getTime()) < 5 * 60 * 1000; // 5 minutes in milliseconds


  // Update last update time when new data arrives
  useEffect(() => {
    if (sensorData && sensorData.length > 0) {
      setLastUpdate(new Date(sensorData[0].updated_at));
    }
  }, [sensorData]);

  // Periodic check for data freshness (every minute)
  useEffect(() => {
    const interval = setInterval(() => {
      // Force re-render to update online status
      setLastUpdate(new Date());
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, []);


  const handleRefresh = async () => {
    setIsRefreshing(true);
    
    // Refresh data by updating last update time
    setLastUpdate(new Date());
    setIsRefreshing(false);
    
    toast({
      title: "Data refreshed",
      description: "Latest sensor readings have been updated.",
    });
  };

  const handleDownload = () => {
    if (!sensorData || sensorData.length === 0) {
      toast({
        title: "No data available",
        description: "No sensor data to export.",
        variant: "destructive",
      });
      return;
    }

    // Create CSV data from real sensor data
    const csvData = [
      ['Timestamp', 'EC (µS/cm)', 'EC (mS/cm)', 'Water Level (mmH2O)', 'Water Level (%)', 'Water Temperature (°C)'],
      ...sensorData.map((reading) => [
        new Date(reading.updated_at).toISOString(),
        reading.ec_val.toFixed(0), // Raw µS/cm value
        (reading.ec_val / 1000).toFixed(2), // Converted mS/cm value
        reading.waterlevel.toFixed(0), // Raw mmH2O value
        Math.min(100, Math.max(0, (reading.waterlevel / tankHeightMm) * 100)).toFixed(1), // Converted percentage
        reading.watertemp.toFixed(1)
      ])
    ];
    
    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hydroponic-data-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast({
      title: "Download complete",
      description: "Data exported successfully as CSV file.",
    });
  };

  const handleThresholdUpdate = async (newRange: { min: number; max: number }) => {
    setECThreshold(newRange);
    await saveConfig({ ecMin: newRange.min, ecMax: newRange.max, tankMax: tankHeightMm })
  };

  const handleTankHeightChange = async (newHeight: number) => {
    setTankHeightMm(newHeight);
    await saveConfig({ ecMin: ecThreshold.min, ecMax: ecThreshold.max, tankMax: newHeight })
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 p-4 sm:p-6 font-sans
      relative overflow-hidden">
      {/* Sophisticated background gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 via-transparent to-cyan-50/30"></div>
      <div className="absolute inset-0 bg-gradient-to-tl from-slate-50/20 via-transparent to-blue-50/20"></div>
      
      <div className="relative z-10 max-w-7xl mx-auto space-y-8">
        <DashboardHeader
          farmName="GreenGrow NFT Farm"
          lastUpdate={lastUpdate}
          isOnline={isOnline}
        />
        
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
          />
          
          <WaterLevelCard
            tankHeightMm={tankHeightMm}
            lowThreshold={25}
            onTankHeightChange={handleTankHeightChange}
          />
        </div>

        {/* Footer */}
        <footer className="text-center pt-12 pb-6 border-t border-gray-100 mt-12">
          <div className="flex flex-col items-center gap-2">
            <p className="text-base font-semibold text-gray-700 drop-shadow-sm">
              Powered by REDtone
            </p>
            <p className="text-sm font-medium text-gray-500">
              Fertilizer Monitoring System
            </p>
            <div className="flex items-center gap-2 mt-2">
              <div className="w-2 h-2 bg-primary rounded-full"></div>
              <div className="w-2 h-2 bg-secondary rounded-full"></div>
              <div className="w-2 h-2 bg-accent rounded-full"></div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Dashboard;