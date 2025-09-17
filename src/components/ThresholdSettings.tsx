import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings, Save, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ThresholdRange {
  min: number;
  max: number;
}

interface ThresholdSettingsProps {
  currentRange: ThresholdRange;
  onRangeUpdate: (range: ThresholdRange) => void;
  unit: string;
}

const ThresholdSettings = ({ currentRange, onRangeUpdate, unit }: ThresholdSettingsProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [minValue, setMinValue] = useState(currentRange.min.toString());
  const [maxValue, setMaxValue] = useState(currentRange.max.toString());
  const { toast } = useToast();

  const handleSave = () => {
    const min = parseFloat(minValue);
    const max = parseFloat(maxValue);

    // Validation
    if (isNaN(min) || isNaN(max)) {
      toast({
        title: "Invalid input",
        description: "Please enter valid numbers for both minimum and maximum values.",
        variant: "destructive",
      });
      return;
    }

    if (min >= max) {
      toast({
        title: "Invalid range",
        description: "Minimum value must be less than maximum value.",
        variant: "destructive",
      });
      return;
    }

    if (min < 0.5 || max > 3.0) {
      toast({
        title: "Out of range",
        description: "Values must be between 0.5 and 3.0 mS/cm for safety.",
        variant: "destructive",
      });
      return;
    }

    onRangeUpdate({ min, max });
    setIsOpen(false);
    toast({
      title: "Threshold updated",
      description: `EC range set to ${min} - ${max} ${unit}`,
    });
  };

  const handleReset = () => {
    const defaultRange = { min: 1.2, max: 2.0 };
    setMinValue(defaultRange.min.toString());
    setMaxValue(defaultRange.max.toString());
    onRangeUpdate(defaultRange);
    toast({
      title: "Threshold reset",
      description: `EC range reset to default (${defaultRange.min} - ${defaultRange.max} ${unit})`,
    });
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      // Reset form values when opening
      setMinValue(currentRange.min.toString());
      setMaxValue(currentRange.max.toString());
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="lg" className="bg-gradient-to-r from-white via-slate-50 to-white 
          backdrop-blur-sm border-slate-200 shadow-lg hover:shadow-xl 
          transition-all duration-200 hover:scale-105 hover:bg-slate-50 hover:border-emerald-300
          px-6 py-3 text-base font-semibold text-slate-700">
          <Settings className="h-5 w-5 mr-3" />
          Threshold
        </Button>
      </DialogTrigger>
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
                max="2.9"
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
                max="3.0"
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
                <span className="font-bold text-slate-800">{currentRange.min} - {currentRange.max} {unit}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-slate-600">Safe Range:</span>
                <span className="font-bold text-slate-800">0.5 - 3.0 {unit}</span>
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

export default ThresholdSettings;