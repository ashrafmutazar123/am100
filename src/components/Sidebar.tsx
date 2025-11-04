import { useState } from 'react';
import { 
  LayoutDashboard, 
  BarChart3, 
  Settings, 
  SlidersHorizontal,
  CalendarCheck,
  DollarSign,
  BookOpen,
  FileText,
  Calendar,
  Bell,
  UserCog,
  ChevronDown,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  beta?: boolean;
  hasSubmenu?: boolean;
}

interface SidebarProps {
  projectName?: string;
  activeItem?: string;
  onNavigate?: (itemId: string) => void;
}

const Sidebar = ({ 
  projectName = "",
  activeItem = "dashboard",
  onNavigate 
}: SidebarProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeNav, setActiveNav] = useState(activeItem);

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  ];

  const handleNavClick = (itemId: string) => {
    setActiveNav(itemId);
    onNavigate?.(itemId);
  };

  return (
    <>
      {/* Sidebar */}
      <div 
        className={`fixed left-0 top-0 h-screen bg-gradient-to-b from-[#1a4d3e] to-[#0d2e23] text-white
          transition-all duration-300 ease-in-out z-50 shadow-2xl overflow-hidden flex flex-col
          ${isCollapsed ? 'w-[70px]' : 'w-60'}`}
      >
        {/* Logo Section */}
        <div className="relative flex items-center justify-between px-5 py-5 border-b border-white/10 h-[70px]">
          <div className={`text-2xl font-bold tracking-tight whitespace-nowrap transition-opacity duration-300
            ${isCollapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>
            <span className="text-red-600">RED</span>
            <span className="text-white">tone</span>
          </div>
          
          {/* Enhanced Majestic Toggle Button */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`absolute ${isCollapsed ? '-right-3' : '-right-3'} top-1/2 -translate-y-1/2
              w-10 h-10 rounded-full 
              bg-gradient-to-br from-white via-gray-50 to-gray-100
              shadow-[0_4px_14px_0_rgba(0,0,0,0.25)]
              hover:shadow-[0_6px_20px_0_rgba(0,0,0,0.35)]
              flex items-center justify-center
              transition-all duration-300 
              hover:scale-110 active:scale-95
              text-[#1a4d3e] 
              border-2 border-white/50
              hover:border-white
              backdrop-blur-sm
              group
              z-10`}
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {/* Animated gradient overlay on hover */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-400/0 to-teal-500/0 
              group-hover:from-cyan-400/10 group-hover:to-teal-500/10 transition-all duration-300"></div>
            
            {/* Icon with double chevron for more impact */}
            {isCollapsed ? (
              <ChevronsRight className="h-5 w-5 relative z-10 transition-transform duration-300 group-hover:translate-x-0.5" />
            ) : (
              <ChevronsLeft className="h-5 w-5 relative z-10 transition-transform duration-300 group-hover:-translate-x-0.5" />
            )}
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="py-3 flex-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeNav === item.id;
            
            return (
              <div
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`
                  relative flex items-center px-5 py-3.5 cursor-pointer transition-all duration-200
                  text-sm font-normal text-white/85 hover:bg-white/10 hover:text-white
                  ${isActive ? 'bg-white/15 text-white font-semibold shadow-lg' : ''}
                  ${isCollapsed ? 'justify-center px-0' : ''}
                `}
              >
                {/* Active indicator - enhanced with glow */}
                {isActive && (
                  <>
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-cyan-400 to-teal-500 shadow-lg shadow-cyan-500/50"></div>
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-transparent"></div>
                  </>
                )}
                
                {/* Icon with enhanced styling */}
                <div className={`${isActive ? 'text-cyan-300' : 'text-white/85'} ${isCollapsed ? '' : 'mr-3.5'}`}>
                  <Icon className="h-5 w-5 shrink-0" />
                </div>
                
                {/* Label */}
                <span className={`flex-1 whitespace-nowrap overflow-hidden transition-all duration-300
                  ${isCollapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>
                  {item.label}
                </span>
                
                {/* Beta Badge */}
                {item.beta && !isCollapsed && (
                  <Badge 
                    variant="outline" 
                    className="ml-2 bg-yellow-500/20 text-yellow-300 border-yellow-400/30 text-[10px] px-1.5 py-0.5 font-semibold"
                  >
                    Beta
                  </Badge>
                )}
                
                {/* Submenu Arrow */}
                {item.hasSubmenu && !isCollapsed && (
                  <ChevronRight className="h-4 w-4 ml-auto opacity-60 shrink-0 transition-transform group-hover:translate-x-1" />
                )}
              </div>
            );
          })}
        </nav>
      </div>

      {/* Main Content Spacer */}
      <div className={`transition-all duration-300 ${isCollapsed ? 'ml-[70px]' : 'ml-60'}`} />
    </>
  );
};

export default Sidebar;
