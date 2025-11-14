import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Trash2, Power } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { fetchSchedules, createSchedule, deleteSchedule } from '@/lib/supabase';

interface Schedule {
  id: string;
  name: string;
  hour: string;
  minute: string;
  ampm: string;
  relay: string;
  state: 'on' | 'off';
  duration: number; // seconds (only for ON schedules)
  days: string[];
  enabled: boolean;
}

interface ScheduleManagerProps {
  onScheduleExecute?: (relay: string, state: boolean, duration?: number) => void;
}

const ScheduleManager: React.FC<ScheduleManagerProps> = ({ onScheduleExecute }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const { toast } = useToast();

  // Form state
  const [scheduleName, setScheduleName] = useState('');
  const [hour, setHour] = useState('08');
  const [minute, setMinute] = useState('00');
  const [ampm, setAmpm] = useState('AM');
  const [selectedRelay, setSelectedRelay] = useState('relay1');
  const [state, setState] = useState<'on' | 'off'>('on');
  const [duration, setDuration] = useState(20);
  const [selectedDays, setSelectedDays] = useState<string[]>(['monday', 'tuesday', 'wednesday', 'thursday', 'friday']);

  const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  // Load schedules from Supabase
  useEffect(() => {
    loadSchedules();
  }, []);

  const loadSchedules = async () => {
    console.log('📅 Loading schedules from Supabase...');
    const data = await fetchSchedules();
    console.log('📅 Loaded schedules:', data);
    setSchedules(data.map(s => ({
      id: s.id,
      name: s.name,
      hour: s.hour.toString().padStart(2, '0'),
      minute: s.minute.toString().padStart(2, '0'),
      ampm: s.ampm || 'AM',
      relay: s.relay,
      state: s.state as 'on' | 'off',
      duration: s.duration,
      days: s.days,
      enabled: s.enabled
    })));
  };

  // Check schedules every second
  useEffect(() => {
    const interval = setInterval(() => {
      checkSchedules();
    }, 1000);

    return () => clearInterval(interval);
  }, [schedules]);

  const checkSchedules = () => {
    const now = new Date();
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentSecond = now.getSeconds();

    schedules.forEach(schedule => {
      if (!schedule.enabled) return;
      if (!schedule.days.includes(currentDay)) return;

      // Convert schedule time to 24-hour format
      let scheduleHour = parseInt(schedule.hour);
      if (schedule.ampm === 'PM' && scheduleHour !== 12) {
        scheduleHour += 12;
      } else if (schedule.ampm === 'AM' && scheduleHour === 12) {
        scheduleHour = 0;
      }

      const scheduleMinute = parseInt(schedule.minute);

      // Check if it's time to execute (within the same second)
      if (currentHour === scheduleHour && 
          currentMinute === scheduleMinute && 
          currentSecond === 0) {
        
        executeSchedule(schedule);
      }
    });
  };

  const executeSchedule = (schedule: Schedule) => {
    console.log(`🕐 Executing schedule: ${schedule.name}`);
    
    toast({
      title: "Schedule Triggered",
      description: `${schedule.name} - ${schedule.relay.toUpperCase()} turning ${schedule.state.toUpperCase()}`,
    });

    if (onScheduleExecute) {
      onScheduleExecute(schedule.relay, schedule.state === 'on', schedule.state === 'on' ? schedule.duration : undefined);
    }

    // If state is ON with duration, schedule auto-off
    if (schedule.state === 'on' && schedule.duration > 0 && onScheduleExecute) {
      setTimeout(() => {
        console.log(`🕐 Auto-turning OFF ${schedule.relay} after ${schedule.duration} seconds`);
        toast({
          title: "Schedule Auto-Off",
          description: `${schedule.relay.toUpperCase()} turned OFF after ${schedule.duration}s`,
        });
        onScheduleExecute(schedule.relay, false);
      }, schedule.duration * 1000);
    }
  };

  const handleSaveSchedule = async () => {
    if (!scheduleName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter a schedule name",
        variant: "destructive"
      });
      return;
    }

    if (selectedDays.length === 0) {
      toast({
        title: "Days Required",
        description: "Please select at least one day",
        variant: "destructive"
      });
      return;
    }

    console.log('💾 Saving schedule to Supabase...');
    const scheduleData = {
      name: scheduleName,
      hour: parseInt(hour),
      minute: parseInt(minute),
      ampm,
      relay: selectedRelay,
      state,
      duration: state === 'on' ? duration : 0,
      days: selectedDays,
      enabled: true
    };
    console.log('💾 Schedule data:', scheduleData);

    // Save to Supabase
    const newSchedule = await createSchedule(scheduleData);
    console.log('💾 Create schedule result:', newSchedule);

    if (newSchedule) {
      toast({
        title: "Schedule Created",
        description: `${scheduleName} will run at ${hour}:${minute} ${ampm}`,
      });

      // Reload schedules from database
      await loadSchedules();

      // Reset form
      setScheduleName('');
      setHour('08');
      setMinute('00');
      setAmpm('AM');
      setSelectedRelay('relay1');
      setState('on');
      setDuration(20);
      setSelectedDays(['monday', 'tuesday', 'wednesday', 'thursday', 'friday']);
    } else {
      toast({
        title: "Error",
        description: "Failed to create schedule. Check browser console for details.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    const success = await deleteSchedule(id);
    
    if (success) {
      toast({
        title: "Schedule Deleted",
        description: "Schedule removed successfully",
      });
      // Reload schedules from database
      await loadSchedules();
    } else {
      toast({
        title: "Error",
        description: "Failed to delete schedule",
        variant: "destructive"
      });
    }
  };

  const toggleDaySelection = (day: string) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter(d => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const getRelayLabel = (relay: string) => {
    return relay.replace('relay', 'Relay ');
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="lg"
          className="bg-white backdrop-blur-sm border-slate-200 
            shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 hover:bg-white 
            hover:border-purple-300 px-6 py-3 text-base font-semibold text-slate-700"
        >
          <Calendar className="h-5 w-5 mr-3" />
          Schedule
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-4xl bg-white rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Calendar className="h-6 w-6 text-purple-600" />
            Schedule
          </DialogTitle>
        </DialogHeader>

        {/* Create New Schedule Form */}
        <div className="space-y-4 p-4 bg-purple-50 rounded-xl border border-purple-200">
          <h3 className="font-bold text-lg text-purple-800">Create New Schedule</h3>

          {/* Schedule Name */}
          <div>
            <Label htmlFor="schedule-name">Schedule Name *</Label>
            <Input
              id="schedule-name"
              placeholder="Morning Schedule"
              value={scheduleName}
              onChange={(e) => setScheduleName(e.target.value)}
              className="mt-1"
            />
          </div>

          {/* Time Selection */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="hour">Hour *</Label>
              <Select value={hour} onValueChange={setHour}>
                <SelectTrigger id="hour" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => {
                    const h = (i + 1).toString().padStart(2, '0');
                    return <SelectItem key={h} value={h}>{h}</SelectItem>;
                  })}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="minute">Minute *</Label>
              <Select value={minute} onValueChange={setMinute}>
                <SelectTrigger id="minute" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 60 }, (_, i) => {
                    const m = i.toString().padStart(2, '0');
                    return <SelectItem key={m} value={m}>{m}</SelectItem>;
                  })}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="ampm">AM/PM *</Label>
              <Select value={ampm} onValueChange={setAmpm}>
                <SelectTrigger id="ampm" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AM">AM</SelectItem>
                  <SelectItem value="PM">PM</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Relay & State Selection */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="relay">Relay *</Label>
              <Select value={selectedRelay} onValueChange={setSelectedRelay}>
                <SelectTrigger id="relay" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relay1">Relay 1</SelectItem>
                  <SelectItem value="relay2">Relay 2</SelectItem>
                  <SelectItem value="relay3">Relay 3</SelectItem>
                  <SelectItem value="relay4">Relay 4</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="state">State *</Label>
              <Select value={state} onValueChange={(v) => setState(v as 'on' | 'off')}>
                <SelectTrigger id="state" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="on">On</SelectItem>
                  <SelectItem value="off">Off</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Duration (only for ON state) */}
          {state === 'on' && (
            <div>
              <Label htmlFor="duration">Duration (seconds) - Auto Turn Off After</Label>
              <Input
                id="duration"
                type="number"
                min="1"
                max="3600"
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value) || 20)}
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Relay will automatically turn OFF after {duration} seconds
              </p>
            </div>
          )}

          {/* Days of Week */}
          <div>
            <Label>Days of Week:</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {daysOfWeek.map(day => (
                <div key={day} className="flex items-center space-x-2">
                  <Checkbox
                    id={day}
                    checked={selectedDays.includes(day)}
                    onCheckedChange={() => toggleDaySelection(day)}
                  />
                  <label
                    htmlFor={day}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 capitalize"
                  >
                    {day.slice(0, 3)}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <Button onClick={handleSaveSchedule} className="w-full bg-purple-600 hover:bg-purple-700">
            <Calendar className="h-4 w-4 mr-2" />
            Save Schedule
          </Button>
        </div>

        {/* Active Schedules List */}
        <div className="space-y-3">
          <h3 className="font-bold text-lg text-slate-800">Active Schedules</h3>

          {schedules.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No schedules created yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {schedules.map(schedule => (
                <Card key={schedule.id} className={`border-2 ${schedule.enabled ? 'border-purple-200 bg-purple-50' : 'border-gray-200 bg-gray-50'}`}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-bold text-blue-600">{schedule.name}</h4>
                        <p className="text-sm text-gray-600">
                          <Clock className="h-3 w-3 inline mr-1" />
                          Time: {schedule.hour}:{schedule.minute} {schedule.ampm}
                        </p>
                        <p className="text-sm text-gray-600">
                          State: <Badge variant={schedule.state === 'on' ? 'default' : 'secondary'}>
                            {schedule.state.toUpperCase()}
                          </Badge>
                        </p>
                        <p className="text-sm text-gray-600">
                          Relays: {getRelayLabel(schedule.relay)}
                        </p>
                        {schedule.state === 'on' && schedule.duration > 0 && (
                          <p className="text-sm text-orange-600 font-medium">
                            <Power className="h-3 w-3 inline mr-1" />
                            Auto-off after {schedule.duration}s
                          </p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          Days: {schedule.days.map(d => d.slice(0, 3)).join(', ')}
                        </p>
                      </div>

                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteSchedule(schedule.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ScheduleManager;
