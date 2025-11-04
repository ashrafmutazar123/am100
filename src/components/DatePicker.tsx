import { Button } from '@/components/ui/button';

interface DatePickerProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onQuickSelect?: (days: number) => void;
  showQuickSelect?: boolean;
}

export const DatePicker = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onQuickSelect,
  showQuickSelect = true,
}: DatePickerProps) => {
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6 py-4">
      {/* Quick Select Buttons */}
      {showQuickSelect && onQuickSelect && (
        <div>
          <label className="text-sm font-semibold text-slate-700 mb-3 block">
            Quick Select
          </label>
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onQuickSelect(0)}
              className="hover:bg-teal-50 hover:border-teal-300 transition-all"
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onQuickSelect(7)}
              className="hover:bg-teal-50 hover:border-teal-300 transition-all"
            >
              7 Days
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onQuickSelect(30)}
              className="hover:bg-teal-50 hover:border-teal-300 transition-all"
            >
              30 Days
            </Button>
          </div>
        </div>
      )}

      {/* Date Range Inputs */}
      <div className="space-y-4">
        <div>
          <label className="text-sm font-semibold text-slate-700 mb-2 block">
            Start Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            max={today}
            className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 focus:border-teal-500 
              focus:ring-2 focus:ring-teal-200 outline-none transition-all text-slate-700 font-medium"
          />
        </div>

        <div>
          <label className="text-sm font-semibold text-slate-700 mb-2 block">
            End Date
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            min={startDate}
            max={today}
            className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 focus:border-teal-500 
              focus:ring-2 focus:ring-teal-200 outline-none transition-all text-slate-700 font-medium"
          />
        </div>
      </div>

      {/* Selected Range Preview */}
      {startDate && endDate && (
        <div className="bg-gradient-to-r from-teal-50 to-cyan-50 rounded-lg p-4 border border-teal-200">
          <p className="text-sm font-semibold text-slate-700 mb-1">Selected Range:</p>
          <p className="text-base font-bold text-teal-700">
            {new Date(startDate).toLocaleDateString('en-MY', { 
              day: '2-digit', 
              month: 'short', 
              year: 'numeric' 
            })}
            {' → '}
            {new Date(endDate).toLocaleDateString('en-MY', { 
              day: '2-digit', 
              month: 'short', 
              year: 'numeric' 
            })}
          </p>
        </div>
      )}
    </div>
  );
};
