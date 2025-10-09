import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { Activity, AlertTriangle, Volume2, Settings, Save, RotateCcw, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useRef, useState } from 'react';
import { useRealtimeSensorData } from '@/hooks/useRealtimeSensorData';
import { SensorMetric } from '@/lib/supabase';

interface ECData {
  time: string;
  value: number;
}

interface ECMonitorCardProps {
  unit?: 'mS/cm' | 'µS/cm';
  optimalRange?: { min: number; max: number };
  onAlarmAcknowledge?: () => void;
  onRangeUpdate?: (newRange: { min: number; max: number }) => void;
}

const ECMonitorCard = ({ 
  unit = 'mS/cm', 
  optimalRange = { min: 1.2, max: 2.0 }, 
  onAlarmAcknowledge, 
  onRangeUpdate 
}: ECMonitorCardProps) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [minValue, setMinValue] = useState(optimalRange.min.toString());
  const [maxValue, setMaxValue] = useState(optimalRange.max.toString());
  const { toast } = useToast();
  
  // Fetch real-time data from Supabase
  const { data: sensorData, loading, error, isConnected } = useRealtimeSensorData(50);
  
  // Refetch function for error state
  const refetch = () => {
    window.location.reload(); // Simple refresh for now
  };
  
  // Process data for chart - convert from µS/cm to mS/cm
  const chartData: ECData[] = sensorData ? sensorData.map((item: SensorMetric) => ({
    time: new Date(item.updated_at).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit'
    }),
    value: item.ec_val / 1000 // Convert µS/cm to mS/cm
  })).reverse() : [];
  
  // Get current EC value (latest reading) - convert from µS/cm to mS/cm
  const currentEC = sensorData && sensorData.length > 0 ? sensorData[0].ec_val / 1000 : 0;

  const getStatus = () => {
    if (currentEC < optimalRange.min) return { status: 'low', color: 'destructive', label: 'Low', isAlarm: true };
    if (currentEC > optimalRange.max) return { status: 'high', color: 'warning', label: 'High', isAlarm: true };
    return { status: 'normal', color: 'success', label: 'Normal', isAlarm: false };
  };

  const status = getStatus();

  // Create alarm beep sound effect
  useEffect(() => {
    if (status.isAlarm && !audioRef.current) {
      // Create a simple beep sound using Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const createBeep = () => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800; // High pitch beep
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.2);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.2);
      };

      // Play beep every 3 seconds when in alarm state
      const interval = setInterval(() => {
        if (status.isAlarm) {
          createBeep();
        }
      }, 3000);

      // Initial beep
      createBeep();

      return () => clearInterval(interval);
    }
  }, [status.isAlarm]);

  // Threshold dialog functions
  const handleSave = () => {
    const newMin = parseFloat(minValue);
    const newMax = parseFloat(maxValue);
    
    if (isNaN(newMin) || isNaN(newMax)) {
      toast({
        title: "Invalid input",
        description: "Please enter valid numbers for both thresholds.",
        variant: "destructive",
      });
      return;
    }

    if (newMin >= newMax) {
      toast({
        title: "Invalid range",
        description: "Minimum threshold must be less than maximum threshold.",
        variant: "destructive",
      });
      return;
    }

    if (newMin < 0.5 || newMax > 4.0) {
      toast({
        title: "Out of safe range",
        description: "Thresholds must be between 0.5 and 4.0 mS/cm for safety.",
        variant: "destructive",
      });
      return;
    }

    onRangeUpdate?.({ min: newMin, max: newMax });
    setIsDialogOpen(false);
    toast({
      title: "Thresholds updated",
      description: `EC range set to ${newMin.toFixed(1)} - ${newMax.toFixed(1)} ${unit}`,
    });
  };

  const handleReset = () => {
    setMinValue("1.2");
    setMaxValue("2.0");
  };

  const handleDialogOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (open) {
      // Reset inputs when opening
      setMinValue(optimalRange.min.toString());
      setMaxValue(optimalRange.max.toString());
    }
  };

  // Show loading state
  if (loading) {
    return (
      <Card className="shadow-xl border border-slate-200/60 bg-white backdrop-blur-sm rounded-2xl overflow-hidden">
        <CardHeader className="pb-6 bg-gradient-to-r from-slate-50/80 via-blue-50/40 to-slate-50/80 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-3 tracking-tight">
              <div className="p-3 bg-gradient-to-br from-emerald-100 via-green-100 to-emerald-100 rounded-xl border border-emerald-200/50 shadow-lg">
                <Activity className="h-6 w-6 text-emerald-600" />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-semibold text-slate-800">Electrical Conductivity (EC) Level</span>
                <span className="text-sm font-medium text-slate-500 mt-0.5">Loading sensor data...</span>
              </div>
            </CardTitle>
            <div className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400 mx-auto mb-4" />
            <p className="text-slate-500">Loading EC data from sensors...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show error state
  if (error) {
    return (
      <Card className="shadow-xl border border-red-200/60 bg-white backdrop-blur-sm rounded-2xl overflow-hidden">
        <CardHeader className="pb-6 bg-gradient-to-r from-red-50/80 via-red-50/40 to-red-50/80 border-b border-red-100">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-3 tracking-tight">
              <div className="p-3 bg-gradient-to-br from-red-100 via-red-100 to-red-100 rounded-xl border border-red-200/50 shadow-lg">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-semibold text-slate-800">Electrical Conductivity (EC) Level</span>
                <span className="text-sm font-medium text-red-500 mt-0.5">Error loading data</span>
              </div>
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <AlertTriangle className="h-8 w-8 text-red-400 mx-auto mb-4" />
            <p className="text-red-500 mb-4">Failed to load EC data</p>
            <Button onClick={refetch} variant="outline" className="border-red-200 text-red-600 hover:bg-red-50">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
      <DialogTrigger asChild>
        <Card className={`
          shadow-xl hover:shadow-2xl border border-slate-200/60 bg-white backdrop-blur-sm 
          transition-all duration-300 ease-in-out transform hover:scale-[1.02] hover:-translate-y-1
          ${status.isAlarm ? 'ring-2 ring-red-500/50 animate-pulse shadow-red-500/20' : 'hover:shadow-blue-500/10'}
          rounded-2xl overflow-hidden relative group cursor-pointer
        `}>
      {/* Sophisticated background overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 via-slate-50/20 to-cyan-50/30"></div>
      
      <CardHeader className="pb-6 bg-gradient-to-r from-slate-50/80 via-blue-50/40 to-slate-50/80 
        border-b border-slate-100 relative z-10">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-3 tracking-tight">
            <div className="p-3 bg-gradient-to-br from-emerald-100 via-green-100 to-emerald-100 rounded-xl 
              border border-emerald-200/50 shadow-lg">
              <Activity className="h-6 w-6 text-emerald-600" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-semibold text-slate-800">Electrical Conductivity (EC) Level</span>
              <span className="text-sm font-medium text-slate-500 mt-0.5">Real-time EC Monitoring & Analysis</span>
            </div>
            {status.isAlarm && (
              <div className="flex items-center gap-1 ml-2">
                <AlertTriangle className="h-4 w-4 text-destructive animate-bounce" />
                <Volume2 className="h-4 w-4 text-destructive animate-pulse" />
              </div>
            )}
          </CardTitle>
          <Badge 
            variant={status.color === 'success' ? 'default' : 'destructive'}
            className={`
              ${status.color === 'success' ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg hover:shadow-emerald-500/30' : ''}
              ${status.color === 'warning' ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg hover:shadow-amber-500/30' : ''}
              ${status.color === 'destructive' ? 'bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-lg hover:shadow-red-500/30' : ''}
              font-semibold px-4 py-2 rounded-full text-sm border-0
              ${status.isAlarm ? 'animate-pulse' : ''}
              transition-all duration-200 hover:scale-105
            `}
          >
            {status.label}
          </Badge>
        </div>

        {/* Alarm acknowledgment section */}
        {status.isAlarm && onAlarmAcknowledge && (
          <div className="mt-4 p-3 bg-destructive/5 border border-destructive/20 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <span className="text-sm font-medium text-destructive">
                  EC Alert: Value outside acceptable range
                </span>
              </div>
              <button
                onClick={onAlarmAcknowledge}
                className="text-xs px-2 py-1 bg-destructive text-white rounded hover:bg-destructive/90 transition-colors"
              >
                Acknowledge
              </button>
            </div>
            <p className="text-xs text-destructive/80 mt-1">
              Current: {currentEC.toFixed(2)} {unit} | Range: {optimalRange.min} - {optimalRange.max} {unit}
            </p>
          </div>
        )}
      </CardHeader>
      
      <CardContent className="space-y-6 relative z-10">
        <div className="flex items-baseline gap-3">
          <span className="text-4xl font-bold text-slate-900">
            {currentEC.toFixed(2)}
          </span>
          <span className="text-lg font-medium text-slate-600">{unit}</span>
        </div>
        
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 30, left: 5, bottom: 5 }}>
              <XAxis 
                dataKey="time" 
                axisLine={{ stroke: '#E2E8F0', strokeWidth: 1 }}
                tickLine={false}
                tick={{ fontSize: 11, fill: '#64748B' }}
                interval={4}
                minTickGap={10}
                tickFormatter={(value, index) => {
                  // Show every 3rd tick (every 3 minutes)
                  if (index % 3 === 0) {
                    return value;
                  }
                  return '';
                }}
              />
              <YAxis 
                domain={[optimalRange.min - 0.5, optimalRange.max + 0.5]}
                axisLine={{ stroke: '#E2E8F0', strokeWidth: 1 }}
                tickLine={false}
                tick={{ fontSize: 11, fill: '#64748B' }}
                tickFormatter={(value) => {
                  // Hide the lowest value label
                  const minValue = optimalRange.min - 0.5;
                  if (Math.abs(value - minValue) < 0.01) return '';
                  return value.toFixed(2);
                }}
                ticks={(() => {
                  const min = optimalRange.min - 0.5;
                  const max = optimalRange.max + 0.5;
                  const ticks = [];
                  for (let i = min; i <= max; i += 0.5) {
                    ticks.push(Math.round(i * 10) / 10); // Round to avoid floating point issues
                  }
                  return ticks;
                })()}
                width={45}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #CBD5E1',
                  borderRadius: '12px',
                  fontSize: '12px',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                }}
                formatter={(value: number) => [value.toFixed(2), 'EC Level']}
                labelFormatter={(label) => `Time: ${label}`}
              />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="#10B981"
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 5, fill: '#10B981', stroke: '#059669', strokeWidth: 2 }}
              />
              {/* Subtle pulsing dot at the end */}
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="transparent"
                strokeWidth={0}
                dot={(props: any) => {
                  const { cx, cy, index } = props;
                  if (index === chartData.length - 1) {
                    return (
                      <circle 
                        cx={cx} 
                        cy={cy} 
                        r={4} 
                        fill="#10B981" 
                        stroke="#059669" 
                        strokeWidth={1}
                        className="animate-pulse opacity-80"
                      />
                    );
                  }
                  return null;
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        <div className="text-sm text-slate-500 font-medium border-t border-slate-100 pt-4">
          <div className="flex justify-between">
            <span>Optimal range: {optimalRange.min} - {optimalRange.max} {unit}</span>
            <span>Data points: {chartData.length}</span>
          </div>
        </div>
      </CardContent>
    </Card>
      </DialogTrigger>

      {/* Threshold Configuration Dialog */}
      <DialogContent className="sm:max-w-lg shadow-2xl border-slate-200 bg-white rounded-2xl">
        <DialogHeader className="pb-6">
          <DialogTitle className="flex items-center gap-3 text-xl font-bold text-slate-900">
            <div className="p-3 bg-gradient-to-br from-emerald-100 via-green-100 to-emerald-100 rounded-xl 
              border border-emerald-200/50 shadow-lg">
              <Settings className="h-6 w-6 text-emerald-600" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-semibold text-slate-800">EC Threshold Settings</span>
              <span className="text-sm font-medium text-slate-500 mt-0.5">Configure monitoring parameters</span>
            </div>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <Label htmlFor="min-threshold" className="text-base font-semibold text-slate-700">
                Minimum ({unit})
              </Label>
              <Input
                id="min-threshold"
                type="number"
                step="0.1"
                min="0.5"
                max="3.9"
                value={minValue}
                onChange={(e) => setMinValue(e.target.value)}
                placeholder="1.2"
                className="text-lg py-3 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20"
              />
            </div>
            
            <div className="space-y-3">
              <Label htmlFor="max-threshold" className="text-base font-semibold text-slate-700">
                Maximum ({unit})
              </Label>
              <Input
                id="max-threshold"
                type="number"
                step="0.1"
                min="0.6"
                max="4.0"
                value={maxValue}
                onChange={(e) => setMaxValue(e.target.value)}
                placeholder="2.0"
                className="text-lg py-3 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20"
              />
            </div>
          </div>
          
          <div className="p-5 bg-gradient-to-r from-slate-50 to-emerald-50/50 rounded-xl border border-slate-200">
            <h4 className="font-bold text-slate-800 mb-3 text-lg">Current Status</h4>
            <div className="grid grid-cols-1 gap-2 text-sm">
              <div className="flex justify-between">
                <span className="font-medium text-slate-600">Current Range:</span>
                <span className="font-bold text-slate-800">{optimalRange.min} - {optimalRange.max} {unit}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-slate-600">Safe Range:</span>
                <span className="font-bold text-slate-800">0.5 - 4.0 {unit}</span>
              </div>
            </div>
          </div>
          
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={handleReset} 
              className="flex-1 py-3 border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset to Default
            </Button>
            
            <Button 
              onClick={handleSave} 
              className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800
                text-white shadow-lg hover:shadow-xl transition-all duration-200 border-0"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ECMonitorCard;