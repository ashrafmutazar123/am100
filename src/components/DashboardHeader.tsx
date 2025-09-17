import { Leaf, Clock, Wifi, WifiOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface DashboardHeaderProps {
  farmName?: string;
  lastUpdate: Date;
  isOnline: boolean;
}

const DashboardHeader = ({ 
  farmName = "Hydroponic Farm", 
  lastUpdate, 
  isOnline
}: DashboardHeaderProps) => {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <header className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 text-white p-6 rounded-2xl mb-6 
      shadow-2xl border border-slate-600/30 backdrop-blur-sm
      transition-all duration-300 hover:shadow-3xl hover:shadow-slate-500/20
      relative overflow-hidden">
      {/* Sophisticated background overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-slate-800/90 via-slate-700/95 to-slate-800/90"></div>
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/10 via-transparent to-emerald-900/10"></div>
      
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-gradient-to-br from-emerald-500/20 via-green-500/15 to-emerald-500/20 
            rounded-xl backdrop-blur-sm border border-emerald-400/30
            shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <Leaf className="h-9 w-9 text-emerald-400" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight drop-shadow-sm text-white">
              {farmName}
            </h1>
            <p className="text-lg font-semibold text-slate-200 drop-shadow-sm mt-1">
              Fertilizer Monitoring Dashboard
            </p>
            <div className="text-sm text-slate-300 font-medium drop-shadow-sm mt-1">
              {formatDate(lastUpdate)}
            </div>
          </div>
        </div>
        
        <div className="flex flex-col sm:items-end gap-3">
          <div className="flex items-center gap-2">
            <Badge 
              variant={isOnline ? 'default' : 'destructive'}
              className={`
                ${isOnline ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg hover:shadow-emerald-500/30' : 'bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-lg hover:shadow-red-500/30'}
                font-semibold px-4 py-2 rounded-full border-0
                transition-all duration-200 hover:scale-105
              `}
            >
              {isOnline ? (
                <>
                  <Wifi className="h-4 w-4 mr-2" />
                  Online
                </>
              ) : (
                <>
                  <WifiOff className="h-4 w-4 mr-2" />
                  Offline
                </>
              )}
            </Badge>
          </div>
        </div>
      </div>
      
      {/* Last update moved to bottom right corner */}
      <div className="absolute bottom-4 right-6">
        <div className="flex items-center gap-2 text-sm text-slate-200 font-medium">
          <div className="p-1.5 bg-slate-600/30 rounded-lg backdrop-blur-sm border border-slate-500/30">
            <Clock className="h-4 w-4 text-slate-300" />
          </div>
          <span className="drop-shadow-sm">
            Last update: {formatTime(lastUpdate)}
          </span>
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;