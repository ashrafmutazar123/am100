import { useState } from 'react';
import { Waves, AlertTriangle, Settings, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useRealtimeSensorData } from '@/hooks/useRealtimeSensorData';
import { SensorMetric } from '@/lib/supabase';

interface WaterLevelCardProps {
  tankHeightMm?: number; // maximum tank height in mm
  lowThreshold?: number; // percentage below which level is considered low
  onTankHeightChange?: (newHeight: number) => void; // callback for height changes
}

const WaterLevelCard = ({ 
  tankHeightMm = 320, 
  lowThreshold = 20, 
  onTankHeightChange 
}: WaterLevelCardProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [heightInput, setHeightInput] = useState(tankHeightMm.toString());
  const { toast } = useToast();
  
  // Fetch real-time data from Supabase
  const { data: sensorData, loading, error, isConnected } = useRealtimeSensorData(1);
  
  // Refetch function for error state
  const refetch = () => {
    window.location.reload(); // Simple refresh for now
  };
  
  // Get current water level (latest reading) - convert from mmH2O to percentage
  const waterLevelMm = sensorData && sensorData.length > 0 ? sensorData[0].waterlevel : 0;
  const level = Math.min(100, Math.max(0, (waterLevelMm / tankHeightMm) * 100)); // Convert mmH2O to percentage

  const isLow = level < lowThreshold;
  const isCritical = level < 10;
  
  // Calculate actual water height in mm
  const currentWaterHeight = Math.round((level / 100) * tankHeightMm);
  
  const getStatusColor = () => {
    if (isCritical) return 'destructive';
    if (isLow) return 'warning';
    return 'success';
  };

  const getStatusLabel = () => {
    if (isCritical) return 'Critical';
    if (isLow) return 'Low';
    return 'Normal';
  };

  const handleSaveTankHeight = () => {
    const newHeight = parseFloat(heightInput);
    
    // Validation
    if (isNaN(newHeight) || newHeight <= 0) {
      toast({
        title: "Invalid input",
        description: "Please enter a valid positive number for tank height.",
        variant: "destructive",
      });
      return;
    }

    if (newHeight < 100 || newHeight > 2000) {
      toast({
        title: "Out of range",
        description: "Tank height must be between 100mm and 2000mm for safety.",
        variant: "destructive",
      });
      return;
    }

    onTankHeightChange?.(newHeight);
    setIsDialogOpen(false);
    toast({
      title: "Tank height updated",
      description: `Maximum tank height set to ${newHeight}mm`,
    });
  };

  const handleDialogOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (open) {
      // Reset input when opening
      setHeightInput(tankHeightMm.toString());
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
                <Waves className="h-6 w-6 text-emerald-600" />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-semibold text-slate-800">Water Level</span>
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
            <p className="text-slate-500">Loading water level data from sensors...</p>
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
                <span className="text-lg font-semibold text-slate-800">Water Level</span>
                <span className="text-sm font-medium text-red-500 mt-0.5">Error loading data</span>
              </div>
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <AlertTriangle className="h-8 w-8 text-red-400 mx-auto mb-4" />
            <p className="text-red-500 mb-4">Failed to load water level data</p>
            <Button onClick={refetch} variant="outline" className="border-red-200 text-red-600 hover:bg-red-50">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-xl hover:shadow-2xl border border-slate-200/60 bg-white backdrop-blur-sm 
      transition-all duration-300 ease-in-out transform hover:scale-[1.02] hover:-translate-y-1
      hover:shadow-blue-500/10 rounded-2xl overflow-hidden relative group">
      {/* Sophisticated background overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 via-slate-50/20 to-cyan-50/30"></div>
      
      <CardHeader className="pb-6 bg-gradient-to-r from-slate-50/80 via-blue-50/40 to-slate-50/80 
        border-b border-slate-100 relative z-10">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-3 tracking-tight">
            <div className="p-3 bg-gradient-to-br from-emerald-100 via-green-100 to-emerald-100 rounded-xl 
              border border-emerald-200/50 shadow-lg">
              <Waves className="h-6 w-6 text-emerald-600" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-semibold text-slate-800">Water Level</span>
              <span className="text-sm font-medium text-slate-500 mt-0.5">Sump Tank Monitoring</span>
            </div>
          </CardTitle>
          <Badge 
            variant={getStatusColor() === 'success' ? 'default' : 'destructive'}
            className={`
              ${getStatusColor() === 'success' ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg hover:shadow-emerald-500/30' : ''}
              ${getStatusColor() === 'warning' ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg hover:shadow-amber-500/30' : ''}
              ${getStatusColor() === 'destructive' ? 'bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-lg hover:shadow-red-500/30' : ''}
              font-semibold px-4 py-2 rounded-full text-sm
              transition-all duration-200 hover:scale-105 border-0
            `}
          >
            {getStatusLabel()}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6 relative z-10">
        <div className="flex items-baseline gap-3">
          <span className="text-4xl font-bold text-slate-900">
            {level.toFixed(1)}%
          </span>
          <span className="text-lg font-medium text-slate-600">
            ({waterLevelMm.toFixed(0)}mmH₂O / {tankHeightMm}mm)
            </span>
          {isLow && (
            <AlertTriangle className="h-6 w-6 text-amber-500 ml-2 animate-pulse" />
          )}
        </div>
        
                {/* Simple Tank Visualization - Clickable */}
        <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
          <DialogTrigger asChild>
            <div className="relative cursor-pointer group/tank">
              <div className="w-full h-48 bg-gray-200 rounded-lg border-2 border-gray-300 relative overflow-hidden
                hover:border-blue-400 transition-colors duration-200">
                

                
                {/* Water fill */}
                <div 
                  className="absolute bottom-0 left-0 right-0 bg-blue-500 transition-all duration-1000 ease-out"
                  style={{ height: `${level}%` }}
                />
                
                {/* Level markers */}
                <div className="absolute inset-0 flex flex-col justify-between py-2">
                  {[100, 75, 50, 25, 0].map((mark) => (
                    <div key={mark} className="flex items-center justify-between px-2">
                      <div className="w-2 h-px bg-gray-600" />
                      <span className="text-xs bg-transparent px-1 text-gray-700">
                        {mark}%
                      </span>
                      <div className="w-2 h-px bg-gray-600" />
                    </div>
                  ))}
                </div>
                
                {/* Current level indicator */}
                <div 
                  className="absolute left-0 right-0 h-px bg-red-600 z-10"
                  style={{ bottom: `${level}%` }}
                >
                  <div className="absolute -right-1 w-2 h-2 bg-red-600 rounded-full border border-white" />
                </div>
              </div>
          

        </div>
          </DialogTrigger>

          {/* Professional Tank Configuration Dialog */}
          <DialogContent className="sm:max-w-lg shadow-2xl border-slate-200 bg-white rounded-2xl">
            <DialogHeader className="pb-6">
              <DialogTitle className="flex items-center gap-3 text-xl font-bold text-slate-900">
                <div className="p-3 bg-gradient-to-br from-emerald-100 via-green-100 to-emerald-100 rounded-xl 
                  border border-emerald-200/50 shadow-lg">
                  <Settings className="h-6 w-6 text-emerald-600" />
                </div>
                <div className="flex flex-col">
                  <span className="text-lg font-semibold text-slate-800">Tank Configuration</span>
                  <span className="text-sm font-medium text-slate-500 mt-0.5">Configure maximum tank height</span>
                </div>
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6 py-4">
              <div className="space-y-3">
                <Label htmlFor="tank-height" className="text-base font-semibold text-slate-700">
                  Maximum Tank Height (mm)
                </Label>
                <Input
                  id="tank-height"
                  type="number"
                  step="10"
                  min="100"
                  max="2000"
                  value={heightInput}
                  onChange={(e) => setHeightInput(e.target.value)}
                  placeholder="320"
                  className="text-lg py-3 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20"
                />
                <p className="text-sm text-slate-500 font-medium">
                  Current: {tankHeightMm}mm • Valid range: 100-2000mm
                </p>
              </div>
              
              <div className="p-5 bg-gradient-to-r from-slate-50 to-emerald-50/50 rounded-xl border border-slate-200">
                <h4 className="font-bold text-slate-800 mb-3 text-lg">Current Status</h4>
                <div className="grid grid-cols-1 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="font-medium text-slate-600">Water Level:</span>
                    <span className="font-bold text-slate-800">{level.toFixed(1)}% ({waterLevelMm.toFixed(0)}mmH₂O)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-slate-600">Tank Height:</span>
                    <span className="font-bold text-slate-800">{tankHeightMm}mm</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-slate-600">Free Space:</span>
                    <span className="font-bold text-slate-800">{tankHeightMm - waterLevelMm}mm</span>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)} 
                  className="flex-1 py-3 border-slate-200 text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveTankHeight} 
                  className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800
                    text-white shadow-lg hover:shadow-xl transition-all duration-200 border-0"
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        
        <div className="text-sm text-slate-500 font-medium border-t border-slate-100 pt-4">
          <div className="flex justify-between">
            <span>Low threshold: {lowThreshold}%</span>
            <span>Critical: 10%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WaterLevelCard;