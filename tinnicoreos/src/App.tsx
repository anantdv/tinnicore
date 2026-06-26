import { useState, useEffect } from 'react';
import {
  Activity,
  Network,
  Shield,
  Layers,
  Sliders,
  Settings,
  Users as UsersIcon,
  BookOpen,
  Cpu,
  HardDrive,
  Wifi,
  Search,
  RefreshCw,
  Plus,
  AlertTriangle,
  Server,
  Layers2,
  Clock,
  Grid,
  Globe,
  Radio,
  FileCheck,
  Upload,
  ChevronRight,
  Bell,
  Smartphone,
  Key
} from 'lucide-react';

// Custom Type declarations
interface Alert {
  id: number;
  type: 'warning' | 'error' | 'success' | 'info';
  message: string;
  time: string;
}

interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  phone: string;
  plan: string;
  status: 'Online' | 'Offline' | 'Expired' | 'Disabled';
  usage: { used: number; total: number };
  sessions: number;
  ip: string;
  lastSeen: string;
}

export default function App() {
  const [currentTab, setCurrentTab] = useState<'overview' | 'users'>('overview');
  const [currentTime, setCurrentTime] = useState('');
  
  // States for user interactive filtering
  const [userSearch, setUserSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [planFilter, setPlanFilter] = useState('All');

  // Clock ticks
  useEffect(() => {
    const updateTime = () => {
      const date = new Date();
      setCurrentTime(date.toLocaleTimeString() + ' | ' + date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Static stats
  const activeAlerts: Alert[] = [
    { id: 1, type: 'error', message: 'High bandwidth usage on WAN 1', time: '2m ago' },
    { id: 2, type: 'warning', message: 'RADIUS server latency high', time: '8m ago' },
    { id: 3, type: 'success', message: 'New device connected', time: '15m ago' },
    { id: 4, type: 'info', message: 'Voucher limit reached', time: '32m ago' },
    { id: 5, type: 'error', message: 'Unusual login attempt blocked', time: '1h ago' }
  ];

  // User Grid Data
  const initialUsers: User[] = [
    { id: '1', name: 'John Smith', username: 'johnsmith', email: 'john.smith@email.com', phone: '+1 555 123 4567', plan: 'Premium 50Mbps', status: 'Online', usage: { used: 12.45, total: 50 }, sessions: 1, ip: '192.168.10.23', lastSeen: '10:42:10 AM, May 20, 2025' },
    { id: '2', name: 'Maria Garcia', username: 'mariagarcia', email: 'maria.garcia@email.com', phone: '+1 555 987 6543', plan: 'Standard 20Mbps', status: 'Online', usage: { used: 5.23, total: 20 }, sessions: 1, ip: '192.168.10.24', lastSeen: '10:41:55 AM, May 20, 2025' },
    { id: '3', name: 'David Wilson', username: 'dwilson', email: 'david.wilson@email.com', phone: '+1 555 456 7890', plan: 'Basic 10Mbps', status: 'Online', usage: { used: 1.12, total: 10 }, sessions: 1, ip: '192.168.10.25', lastSeen: '10:41:32 AM, May 20, 2025' },
    { id: '4', name: 'Sarah Johnson', username: 'sarahj', email: 'sarah.johnson@email.com', phone: '+1 555 321 0987', plan: 'Premium 50Mbps', status: 'Offline', usage: { used: 8.75, total: 50 }, sessions: 0, ip: '-', lastSeen: '9:18:44 AM, May 20, 2025' },
    { id: '5', name: 'Michael Brown', username: 'mbrown', email: 'michael.brown@email.com', phone: '+1 555 654 3210', plan: 'Standard 20Mbps', status: 'Expired', usage: { used: 20.00, total: 20 }, sessions: 0, ip: '-', lastSeen: 'Yesterday, 11:23:10 PM' },
    { id: '6', name: 'Emily Davis', username: 'edavis', email: 'emily.davis@email.com', phone: '+1 555 789 0123', plan: 'Basic 10Mbps', status: 'Disabled', usage: { used: 0, total: 10 }, sessions: 0, ip: '-', lastSeen: '-' },
    { id: '7', name: 'Robert Martinez', username: 'rmartinez', email: 'robert.martinez@email.com', phone: '+1 555 147 2580', plan: 'Premium 50Mbps', status: 'Online', usage: { used: 18.34, total: 50 }, sessions: 2, ip: '192.168.10.26', lastSeen: '10:42:01 AM, May 20, 2025' },
    { id: '8', name: 'Lisa Anderson', username: 'landerson', email: 'lisa.anderson@email.com', phone: '+1 555 369 8520', plan: 'Standard 20Mbps', status: 'Online', usage: { used: 3.66, total: 20 }, sessions: 1, ip: '192.168.10.27', lastSeen: '10:41:12 AM, May 20, 2025' }
  ];

  // Filters calculation
  const filteredUsers = initialUsers.filter(user => {
    const query = userSearch.toLowerCase();
    const matchesSearch = user.name.toLowerCase().includes(query) || 
                          user.username.toLowerCase().includes(query) || 
                          user.email.toLowerCase().includes(query) || 
                          user.ip.includes(query) || 
                          user.phone.includes(query);
    
    const matchesStatus = statusFilter === 'All' || user.status === statusFilter;
    const matchesPlan = planFilter === 'All' || user.plan.toLowerCase().includes(planFilter.toLowerCase());

    return matchesSearch && matchesStatus && matchesPlan;
  });

  return (
    <div className="min-h-screen bg-[#02050a] text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white">
      {/* Top Banner Status Bar */}
      <header className="border-b border-[#0f223d] bg-[#040a15] px-6 py-3 flex items-center justify-between z-10">
        <div className="flex items-center gap-6">
          {/* Logo Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-700 flex items-center justify-center shadow-lg shadow-blue-500/20 border border-blue-400/30">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-wider text-white">TINNICORE</h1>
              <p className="text-[10px] text-blue-400 font-semibold tracking-widest uppercase">Network. Secure. Connect.</p>
            </div>
          </div>

          {/* Quick System Telemetry Badges */}
          <div className="hidden md:flex items-center gap-4 border-l border-[#0f223d] pl-6 text-xs text-slate-400">
            <div className="flex items-center gap-2 bg-[#081223] px-3 py-1.5 rounded-md border border-blue-900/40">
              <div className="w-2 h-2 rounded-full bg-emerald-500 pulse-glow"></div>
              <span>SYSTEM: <strong className="text-emerald-400 font-semibold uppercase">Online</strong></span>
            </div>
            
            <div className="flex items-center gap-2">
              <Cpu className="w-3.5 h-3.5 text-blue-400" />
              <span>CPU: <strong className="text-slate-200">23%</strong></span>
            </div>

            <div className="flex items-center gap-2">
              <HardDrive className="w-3.5 h-3.5 text-indigo-400" />
              <span>RAM: <strong className="text-slate-200">41%</strong></span>
            </div>

            <div className="flex items-center gap-2">
              <Server className="w-3.5 h-3.5 text-teal-400" />
              <span>TEMP: <strong className="text-slate-200">48°C</strong></span>
            </div>

            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>UPTIME: <strong className="text-slate-200">7D 14H 22M</strong></span>
            </div>
          </div>
        </div>

        {/* User profile & controls */}
        <div className="flex items-center gap-4">
          <div className="text-xs text-slate-400 font-mono bg-[#071329] border border-[#0d274c] px-3 py-1.5 rounded">
            {currentTime || "10:42:31 AM | May 20, 2025"}
          </div>

          <button className="relative p-2 rounded-lg bg-[#071329] border border-[#0d274c] hover:bg-[#0c2041] transition group">
            <Bell className="w-4 h-4 text-slate-300" />
            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-blue-500 rounded-full border border-[#02050a] pulse-glow"></span>
          </button>

          <button className="p-2 rounded-lg bg-[#071329] border border-[#0d274c] hover:bg-[#0c2041] transition">
            <Settings className="w-4 h-4 text-slate-300" />
          </button>

          <div className="flex items-center gap-2.5 border-l border-[#0f223d] pl-4">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-sm font-bold text-white shadow-inner">
              AD
            </div>
            <div className="hidden lg:block text-left">
              <p className="text-xs font-semibold text-white leading-tight">admin</p>
              <p className="text-[10px] text-blue-400 leading-none">Super Administrator</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Body Layout */}
      <div className="flex-1 flex flex-row overflow-hidden">
        {/* Navigation Sidebar */}
        <aside className="w-64 bg-[#030914] border-r border-[#0f223d] flex flex-col justify-between py-4 select-none shrink-0 overflow-y-auto">
          <div>
            {/* Command Center */}
            <div className="px-4 mb-5">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Command Center</p>
              <div className="space-y-1">
                <button
                  onClick={() => setCurrentTab('overview')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition ${
                    currentTab === 'overview'
                      ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                      : 'text-slate-400 hover:bg-[#071329] hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Grid className="w-4 h-4" />
                    <span>Overview</span>
                  </div>
                  {currentTab === 'overview' && <ChevronRight className="w-3 h-3" />}
                </button>
                <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:bg-[#071329] hover:text-slate-200 transition">
                  <Network className="w-4 h-4" />
                  <span>Network Map</span>
                </button>
                <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:bg-[#071329] hover:text-slate-200 transition">
                  <Bell className="w-4 h-4" />
                  <span>Events</span>
                </button>
              </div>
            </div>

            {/* Network Section */}
            <div className="px-4 mb-5">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Network</p>
              <div className="space-y-1">
                <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:bg-[#071329] hover:text-slate-200 transition">
                  <Sliders className="w-4 h-4" />
                  <span>Interfaces</span>
                </button>
                <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:bg-[#071329] hover:text-slate-200 transition">
                  <Wifi className="w-4 h-4" />
                  <span>WAN</span>
                </button>
                <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:bg-[#071329] hover:text-slate-200 transition">
                  <Layers className="w-4 h-4" />
                  <span>VLAN</span>
                </button>
                <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:bg-[#071329] hover:text-slate-200 transition">
                  <Network className="w-4 h-4" />
                  <span>Routing</span>
                </button>
                <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:bg-[#071329] hover:text-slate-200 transition">
                  <Globe className="w-4 h-4" />
                  <span>DHCP & DNS</span>
                </button>
              </div>
            </div>

            {/* Access Control Section */}
            <div className="px-4 mb-5">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Access Control</p>
              <div className="space-y-1">
                <button
                  onClick={() => setCurrentTab('users')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition ${
                    currentTab === 'users'
                      ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                      : 'text-slate-400 hover:bg-[#071329] hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <UsersIcon className="w-4 h-4" />
                    <span>Users</span>
                  </div>
                  {currentTab === 'users' && <ChevronRight className="w-3 h-3" />}
                </button>
                <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:bg-[#071329] hover:text-slate-200 transition">
                  <Clock className="w-4 h-4" />
                  <span>Sessions</span>
                </button>
                <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:bg-[#071329] hover:text-slate-200 transition">
                  <BookOpen className="w-4 h-4" />
                  <span>Plans</span>
                </button>
                <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:bg-[#071329] hover:text-slate-200 transition">
                  <Key className="w-4 h-4" />
                  <span>Voucher</span>
                </button>
                <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:bg-[#071329] hover:text-slate-200 transition">
                  <Smartphone className="w-4 h-4" />
                  <span>Captive Portal</span>
                </button>
                <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:bg-[#071329] hover:text-slate-200 transition">
                  <Radio className="w-4 h-4" />
                  <span>RADIUS</span>
                </button>
              </div>
            </div>

            {/* Security Section */}
            <div className="px-4 mb-5">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Security</p>
              <div className="space-y-1">
                <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:bg-[#071329] hover:text-slate-200 transition">
                  <Shield className="w-4 h-4" />
                  <span>Firewall</span>
                </button>
                <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:bg-[#071329] hover:text-slate-200 transition">
                  <Layers2 className="w-4 h-4" />
                  <span>NAT</span>
                </button>
                <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:bg-[#071329] hover:text-slate-200 transition">
                  <FileCheck className="w-4 h-4" />
                  <span>Policies</span>
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Device Summary Badge */}
          <div className="mx-4 p-3 rounded-lg bg-slate-900/50 border border-slate-800 flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-blue-500/10 flex items-center justify-center">
              <Server className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h4 className="text-[11px] font-semibold text-white">TINNICORE 150</h4>
              <p className="text-[10px] text-emerald-400 font-mono">TNC150-000102</p>
              <p className="text-[9px] text-slate-500">OS: v1.2.8</p>
            </div>
          </div>
        </aside>

        {/* Content Page Window */}
        <main className="flex-1 bg-[#02050a] overflow-y-auto p-6 space-y-6">
          {currentTab === 'overview' ? (
            /* ==============================================================
               TAB 1: OVERVIEW DASHBOARD VIEW
               ============================================================== */
            <div className="space-y-6 animate-fadeIn">
              {/* Dashboard Hero Grid Section */}
              <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
                {/* Visual Site Map Core Unit */}
                <div className="xl:col-span-2 glass-panel rounded-xl p-6 flex flex-col justify-between border border-[#0d274c] relative overflow-hidden min-h-[420px]">
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,149,255,0.05)_0%,transparent_70%)] pointer-events-none"></div>
                  
                  <div className="flex justify-between items-start z-10">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Tinnicore OS Core Topology</h3>
                      <p className="text-xs text-blue-400">Total sites linked & client connections overview</p>
                    </div>
                    <span className="text-[10px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded">
                      Live
                    </span>
                  </div>

                  {/* Connected Branches Diagram */}
                  <div className="my-auto py-8 relative flex items-center justify-center">
                    {/* Ring background animation */}
                    <div className="absolute w-56 h-56 rounded-full border border-blue-500/10 animate-spin" style={{ animationDuration: '40s' }}></div>
                    <div className="absolute w-40 h-40 rounded-full border border-dashed border-blue-500/20 animate-spin" style={{ animationDuration: '20s' }}></div>

                    {/* Central Device */}
                    <div className="relative z-10 w-24 h-24 rounded-full bg-slate-900 border-2 border-blue-500/40 flex flex-col items-center justify-center shadow-lg shadow-blue-500/20">
                      <Server className="w-8 h-8 text-blue-400 mb-1" />
                      <span className="text-[9px] font-bold text-white tracking-widest">TINNICORE</span>
                    </div>

                    {/* Connected Orbit Nodes */}
                    <div className="absolute top-2 left-6 bg-[#081223]/90 border border-blue-500/30 rounded-lg p-2 text-center w-24">
                      <p className="text-[10px] font-bold text-white uppercase">Hotels</p>
                      <p className="text-xs text-blue-400 font-mono font-bold">12 Sites</p>
                      <p className="text-[9px] text-emerald-400 font-semibold">1,248 Users</p>
                    </div>

                    <div className="absolute top-2 right-6 bg-[#081223]/90 border border-blue-500/30 rounded-lg p-2 text-center w-24">
                      <p className="text-[10px] font-bold text-white uppercase">Campuses</p>
                      <p className="text-xs text-blue-400 font-mono font-bold">8 Sites</p>
                      <p className="text-[9px] text-emerald-400 font-semibold">732 Users</p>
                    </div>

                    <div className="absolute bottom-2 left-6 bg-[#081223]/90 border border-blue-500/30 rounded-lg p-2 text-center w-24">
                      <p className="text-[10px] font-bold text-white uppercase">Branch Sites</p>
                      <p className="text-xs text-blue-400 font-mono font-bold">24 Sites</p>
                      <p className="text-[9px] text-emerald-400 font-semibold">1,845 Users</p>
                    </div>

                    <div className="absolute bottom-2 right-6 bg-[#081223]/90 border border-blue-500/30 rounded-lg p-2 text-center w-24">
                      <p className="text-[10px] font-bold text-white uppercase">Remote Sites</p>
                      <p className="text-xs text-blue-400 font-mono font-bold">15 Sites</p>
                      <p className="text-[9px] text-emerald-400 font-semibold">532 Users</p>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-xs border-t border-[#0f223d] pt-4 z-10">
                    <div className="flex items-center gap-2 text-slate-400">
                      <Globe className="w-3.5 h-3.5 text-blue-400" />
                      <span>WAN Gateway Status:</span>
                      <span className="text-emerald-400 font-bold font-mono">100% ONLINE</span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      LATENCY: 12ms
                    </div>
                  </div>
                </div>

                {/* Right Side: Health Meters & Alerts Panel */}
                <div className="xl:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* System Health Score Widget */}
                  <div className="glass-panel rounded-xl p-5 flex flex-col justify-between border border-[#0d274c]">
                    <div className="flex justify-between items-center">
                      <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">System Health</h3>
                      <Activity className="w-4 h-4 text-emerald-500" />
                    </div>

                    <div className="py-4 flex items-center justify-around">
                      {/* Big Circle Score */}
                      <div className="relative w-28 h-28 rounded-full border-4 border-slate-800 flex items-center justify-center">
                        {/* Fake active circle border */}
                        <div className="absolute inset-0 rounded-full border-4 border-blue-500/60 border-t-transparent animate-spin" style={{ animationDuration: '3s' }}></div>
                        <div className="text-center">
                          <p className="text-3xl font-extrabold text-white">92</p>
                          <p className="text-[9px] text-slate-400 uppercase font-bold">/100</p>
                        </div>
                      </div>

                      {/* Small inline list */}
                      <div className="space-y-1.5 text-[11px] text-slate-300 font-mono">
                        <div>CPU: <span className="text-blue-400 font-bold">23%</span></div>
                        <div>RAM: <span className="text-indigo-400 font-bold">41%</span></div>
                        <div>DISK: <span className="text-emerald-400 font-bold">37%</span></div>
                        <div>TEMP: <span className="text-amber-500 font-bold">48°C</span></div>
                      </div>
                    </div>

                    <p className="text-[10px] text-slate-500 text-center leading-relaxed">
                      All critical systems reporting nominal parameters. Next automatic security audit in 4 hours.
                    </p>
                  </div>

                  {/* Active Network Alerts Feed */}
                  <div className="glass-panel rounded-xl p-5 flex flex-col justify-between border border-[#0d274c]">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Active Alerts</h3>
                      <span className="text-[9px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded">
                        Critical
                      </span>
                    </div>

                    <div className="flex-1 space-y-2 overflow-y-auto max-h-48 pr-1">
                      {activeAlerts.map(alert => (
                        <div key={alert.id} className="flex gap-2.5 p-2 rounded bg-slate-900/60 border border-slate-800/80 items-start">
                          <AlertTriangle className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${
                            alert.type === 'error' ? 'text-red-500' : 'text-amber-500'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] text-slate-300 font-medium leading-tight truncate">{alert.message}</p>
                            <span className="text-[9px] text-slate-500 font-mono">{alert.time}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bandwidth Graphs & WAN Status Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Live Bandwidth Monitor */}
                <div className="lg:col-span-2 glass-panel rounded-xl p-5 border border-[#0d274c] flex flex-col justify-between">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Bandwidth Overview</h3>
                      <p className="text-[10px] text-slate-500">Live internet throughput usage data</p>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-mono">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded bg-blue-500"></span>
                        <span className="text-slate-300">Download</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded bg-indigo-500"></span>
                        <span className="text-slate-300">Upload</span>
                      </div>
                    </div>
                  </div>

                  {/* Fake SVG line chart demonstrating beautiful curves */}
                  <div className="h-44 w-full relative bg-slate-950/60 rounded-lg border border-slate-900/60 p-2 overflow-hidden flex items-end">
                    <div className="absolute inset-0 grid grid-rows-4 grid-cols-6 pointer-events-none">
                      {Array.from({ length: 24 }).map((_, i) => (
                        <div key={i} className="border-t border-r border-slate-900/20"></div>
                      ))}
                    </div>
                    
                    <svg className="w-full h-full" viewBox="0 0 100 40" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#0095ff" stopOpacity="0.4" />
                          <stop offset="100%" stopColor="#0095ff" stopOpacity="0" />
                        </linearGradient>
                        <linearGradient id="indigoGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
                          <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      
                      {/* Download Area & Path */}
                      <path d="M0,40 Q10,15 25,25 T50,8 T75,28 T100,12 L100,40 L0,40" fill="url(#blueGrad)" />
                      <path d="M0,40 Q10,15 25,25 T50,8 T75,28 T100,12" fill="none" stroke="#0095ff" strokeWidth="1.2" />

                      {/* Upload Area & Path */}
                      <path d="M0,40 Q12,28 30,30 T60,20 T80,32 T100,22 L100,40 L0,40" fill="url(#indigoGrad)" />
                      <path d="M0,40 Q12,28 30,30 T60,20 T80,32 T100,22" fill="none" stroke="#6366f1" strokeWidth="1" />
                    </svg>

                    <div className="absolute bottom-2 left-2 bg-[#040a15]/90 border border-[#0d274c] p-2 rounded text-left">
                      <p className="text-[9px] text-slate-400 font-bold uppercase">Download</p>
                      <p className="text-sm font-extrabold text-blue-400">1.26 Gbps</p>
                      <p className="text-[8px] text-emerald-400 font-semibold font-mono">▲ 12.5% vs yesterday</p>
                    </div>

                    <div className="absolute bottom-2 right-2 bg-[#040a15]/90 border border-[#0d274c] p-2 rounded text-right">
                      <p className="text-[9px] text-slate-400 font-bold uppercase">Upload</p>
                      <p className="text-sm font-extrabold text-indigo-400">437 Mbps</p>
                      <p className="text-[8px] text-emerald-400 font-semibold font-mono">▲ 9.3% vs yesterday</p>
                    </div>
                  </div>
                </div>

                {/* WAN Link Health Status Panel */}
                <div className="glass-panel rounded-xl p-5 border border-[#0d274c] flex flex-col justify-between">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">WAN Interfaces</h3>
                    <button className="text-[10px] text-blue-400 font-medium hover:underline flex items-center gap-1">
                      Refresh <RefreshCw className="w-2.5 h-2.5" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    {/* WAN 1 */}
                    <div className="flex items-center justify-between p-2.5 rounded bg-slate-950/60 border border-slate-900">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                        <div>
                          <p className="text-[11px] font-bold text-white">WAN 1 - ISP 1</p>
                          <p className="text-[9px] text-slate-500 font-mono">Primary Link</p>
                        </div>
                      </div>
                      <div className="text-right text-[10px] font-mono">
                        <span className="text-emerald-400 font-bold block">Online</span>
                        <span className="text-slate-400 text-[9px]">12ms latency</span>
                      </div>
                    </div>

                    {/* WAN 2 */}
                    <div className="flex items-center justify-between p-2.5 rounded bg-slate-950/60 border border-slate-900">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                        <div>
                          <p className="text-[11px] font-bold text-white">WAN 2 - ISP 2</p>
                          <p className="text-[9px] text-slate-500 font-mono">Failover Enabled</p>
                        </div>
                      </div>
                      <div className="text-right text-[10px] font-mono">
                        <span className="text-emerald-400 font-bold block">Online</span>
                        <span className="text-slate-400 text-[9px]">18ms latency</span>
                      </div>
                    </div>

                    {/* WAN 3 */}
                    <div className="flex items-center justify-between p-2.5 rounded bg-slate-950/60 border border-slate-900">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                        <div>
                          <p className="text-[11px] font-bold text-white">WAN 3 - LTE</p>
                          <p className="text-[9px] text-slate-500 font-mono">Backup Cellular</p>
                        </div>
                      </div>
                      <div className="text-right text-[10px] font-mono">
                        <span className="text-emerald-400 font-bold block">Online</span>
                        <span className="text-slate-400 text-[9px]">25ms latency</span>
                      </div>
                    </div>

                    {/* WAN 4 */}
                    <div className="flex items-center justify-between p-2.5 rounded bg-slate-950/60 border border-slate-900">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-slate-500"></div>
                        <div>
                          <p className="text-[11px] font-bold text-slate-400">WAN 4 - Backup</p>
                          <p className="text-[9px] text-slate-600 font-mono">Unused</p>
                        </div>
                      </div>
                      <div className="text-right text-[10px] font-mono">
                        <span className="text-slate-500 font-bold block">Standby</span>
                        <span className="text-slate-600 text-[9px]">-</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Lower Section: Applications, Sites, Device details, Licensing */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Top Applications by Volume */}
                <div className="glass-panel rounded-xl p-5 border border-[#0d274c] flex flex-col justify-between">
                  <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">Top Applications</h3>
                  
                  <div className="space-y-2.5">
                    <div>
                      <div className="flex justify-between text-[11px] mb-1 font-mono">
                        <span className="text-slate-300">Web Browsing</span>
                        <span className="text-blue-400">542 GB (35%)</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: '35%' }}></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] mb-1 font-mono">
                        <span className="text-slate-300">Streaming</span>
                        <span className="text-indigo-400">275 GB (18%)</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: '18%' }}></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] mb-1 font-mono">
                        <span className="text-slate-300">Social Media</span>
                        <span className="text-teal-400">187 GB (12%)</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                        <div className="h-full bg-teal-500 rounded-full" style={{ width: '12%' }}></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] mb-1 font-mono">
                        <span className="text-slate-300">File Sharing</span>
                        <span className="text-pink-400">156 GB (10%)</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                        <div className="h-full bg-pink-500 rounded-full" style={{ width: '10%' }}></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Data Usage by Site (Doughnut Chart view) */}
                <div className="glass-panel rounded-xl p-5 border border-[#0d274c] flex flex-col justify-between">
                  <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Usage by Site</h3>
                  
                  <div className="flex items-center gap-3">
                    {/* Ring graphics */}
                    <div className="relative w-24 h-24 rounded-full border-[6px] border-slate-900 flex items-center justify-center font-mono">
                      {/* Simulated circular fill segment */}
                      <div className="absolute inset-0 rounded-full border-[6px] border-indigo-500 border-b-transparent border-l-transparent"></div>
                      <div className="text-center">
                        <span className="text-xs font-extrabold text-white block">2.45</span>
                        <span className="text-[8px] text-slate-400 uppercase">TB Total</span>
                      </div>
                    </div>

                    <div className="flex-1 space-y-1 text-[10px] font-mono">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">🏨 Hotels</span>
                        <span className="text-indigo-400 font-bold">1.25 TB</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">🏫 Campuses</span>
                        <span className="text-teal-400 font-bold">652 GB</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">🏢 Branch</span>
                        <span className="text-blue-400 font-bold">352 GB</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">📡 Remote</span>
                        <span className="text-pink-400 font-bold">196 GB</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Device Info */}
                <div className="glass-panel rounded-xl p-5 border border-[#0d274c] flex flex-col justify-between">
                  <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">Device Information</h3>
                  
                  <div className="space-y-1.5 text-[11px] font-mono text-slate-400">
                    <div className="flex justify-between border-b border-slate-900 pb-1">
                      <span>Model:</span>
                      <strong className="text-white">Tinnicore 150</strong>
                    </div>
                    <div className="flex justify-between border-b border-slate-900 pb-1">
                      <span>Serial Number:</span>
                      <strong className="text-white">TNC150-000102</strong>
                    </div>
                    <div className="flex justify-between border-b border-slate-900 pb-1">
                      <span>Firmware:</span>
                      <strong className="text-blue-400">v1.2.8</strong>
                    </div>
                    <div className="flex justify-between border-b border-slate-900 pb-1">
                      <span>OS Version:</span>
                      <strong className="text-white">Tinnicore OS 1.2.8</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>CPU details:</span>
                      <strong className="text-slate-300">4 Cores</strong>
                    </div>
                  </div>
                </div>

                {/* License Status Widget */}
                <div className="glass-panel rounded-xl p-5 border border-[#0d274c] flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">License Status</h3>
                    <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                      Active
                    </span>
                  </div>

                  <div className="py-2.5 text-center">
                    <Shield className="w-10 h-10 text-emerald-400 mx-auto mb-2 pulse-glow" />
                    <p className="text-[11px] text-slate-300 font-semibold font-mono">ADVGate Premium Enterprise</p>
                    <p className="text-[9px] text-slate-500">Expires on: <span className="text-slate-300 font-mono">2027-06-21</span></p>
                  </div>

                  <button className="w-full py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-lg transition shadow-md shadow-blue-500/10 border border-blue-500/20">
                    Manage License
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* ==============================================================
               TAB 2: USERS MANAGEMENT ACCESS CONTROL
               ============================================================== */
            <div className="space-y-6 animate-fadeIn">
              {/* User Metric Counters */}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="glass-panel rounded-xl p-4 border border-[#0d274c]">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Total Users</p>
                  <p className="text-2xl font-extrabold text-white font-mono">1,248</p>
                  <span className="text-[9px] text-emerald-400 font-semibold font-mono">▲ 12.3% vs last month</span>
                </div>

                <div className="glass-panel rounded-xl p-4 border border-[#0d274c]">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Active Users</p>
                  <p className="text-2xl font-extrabold text-emerald-400 font-mono">732</p>
                  <span className="text-[9px] text-emerald-400 font-semibold font-mono">▲ 8.7% vs last month</span>
                </div>

                <div className="glass-panel rounded-xl p-4 border border-[#0d274c]">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Disabled Users</p>
                  <p className="text-2xl font-extrabold text-red-400 font-mono">45</p>
                  <span className="text-[9px] text-red-400 font-semibold font-mono">▼ 4.2% vs last month</span>
                </div>

                <div className="glass-panel rounded-xl p-4 border border-[#0d274c]">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Expired Users</p>
                  <p className="text-2xl font-extrabold text-amber-500 font-mono">31</p>
                  <span className="text-[9px] text-red-400 font-semibold font-mono">▼ 11.3% vs last month</span>
                </div>

                <div className="col-span-2 lg:col-span-1 glass-panel rounded-xl p-4 border border-[#0d274c] bg-blue-950/20">
                  <p className="text-[10px] text-blue-400 font-bold uppercase tracking-wider mb-1">Online Now</p>
                  <p className="text-2xl font-extrabold text-white font-mono flex items-center gap-2">
                    386
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 pulse-glow"></span>
                  </p>
                  <span className="text-[9px] text-blue-400 font-semibold">Active hotspot sessions</span>
                </div>
              </div>

              {/* Advanced Interactive Filters Section */}
              <div className="glass-panel rounded-xl p-4 border border-[#0d274c] flex flex-wrap gap-4 items-center justify-between">
                <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
                  {/* Search input */}
                  <div className="relative flex-1 min-w-[220px]">
                    <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search users by name, email, phone, IP or MAC..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 rounded-lg bg-slate-950 border border-[#0f223d] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
                    />
                  </div>

                  {/* Status Dropdown */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">Status:</span>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="bg-slate-950 border border-[#0f223d] rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
                    >
                      <option value="All">All Statuses</option>
                      <option value="Online">Online</option>
                      <option value="Offline">Offline</option>
                      <option value="Expired">Expired</option>
                      <option value="Disabled">Disabled</option>
                    </select>
                  </div>

                  {/* Plan Dropdown */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">Plan:</span>
                    <select
                      value={planFilter}
                      onChange={(e) => setPlanFilter(e.target.value)}
                      className="bg-slate-950 border border-[#0f223d] rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
                    >
                      <option value="All">All Plans</option>
                      <option value="Premium">Premium</option>
                      <option value="Standard">Standard</option>
                      <option value="Basic">Basic</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-blue-500/10">
                    <Plus className="w-3.5 h-3.5" /> Add User
                  </button>
                  <button className="px-3.5 py-2 bg-[#081223] border border-[#0f223d] hover:bg-[#0c2041] text-slate-300 rounded-lg text-xs font-semibold transition">
                    Export List
                  </button>
                </div>
              </div>

              {/* Data Table Grid */}
              <div className="glass-panel rounded-xl border border-[#0d274c] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[#0f223d] bg-slate-900/40 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="p-4">User</th>
                        <th className="p-4">Contact</th>
                        <th className="p-4">Plan</th>
                        <th className="p-4">Status</th>
                        <th className="p-4">Quota Usage</th>
                        <th className="p-4">Sessions</th>
                        <th className="p-4">IP Address</th>
                        <th className="p-4">Last Seen</th>
                        <th className="p-4 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#0f223d] text-xs font-mono">
                      {filteredUsers.length > 0 ? (
                        filteredUsers.map(user => (
                          <tr key={user.id} className="hover:bg-slate-900/30 transition">
                            <td className="p-4">
                              <div>
                                <p className="font-bold text-white font-sans">{user.name}</p>
                                <p className="text-[10px] text-slate-500">@{user.username}</p>
                              </div>
                            </td>
                            <td className="p-4 text-slate-300">
                              <p className="font-sans">{user.email}</p>
                              <p className="text-[10px] text-slate-500">{user.phone}</p>
                            </td>
                            <td className="p-4">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                user.plan.includes('Premium') ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                                user.plan.includes('Standard') ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' :
                                'bg-slate-800 text-slate-400 border border-slate-700'
                              }`}>
                                {user.plan}
                              </span>
                            </td>
                            <td className="p-4">
                              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold font-sans ${
                                user.status === 'Online' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                user.status === 'Offline' ? 'bg-slate-800 text-slate-400' :
                                user.status === 'Expired' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                'bg-red-500/10 text-red-400 border border-red-500/20'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${
                                  user.status === 'Online' ? 'bg-emerald-400 animate-pulse' :
                                  user.status === 'Offline' ? 'bg-slate-500' :
                                  user.status === 'Expired' ? 'bg-amber-400' :
                                  'bg-red-400'
                                }`}></span>
                                {user.status}
                              </span>
                            </td>
                            <td className="p-4">
                              <div className="w-28">
                                <div className="flex justify-between text-[9px] text-slate-400 mb-1">
                                  <span>{user.usage.used} GB</span>
                                  <span>{user.usage.total} GB</span>
                                </div>
                                <div className="w-full h-1 bg-slate-950 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${
                                      (user.usage.used / user.usage.total) >= 1 ? 'bg-red-500' : 'bg-blue-500'
                                    }`}
                                    style={{ width: `${Math.min((user.usage.used / user.usage.total) * 100, 100)}%` }}
                                  ></div>
                                </div>
                              </div>
                            </td>
                            <td className="p-4 text-slate-300 font-bold">{user.sessions}</td>
                            <td className="p-4 text-slate-400 font-bold">{user.ip}</td>
                            <td className="p-4 text-slate-500 text-[10px] font-sans">{user.lastSeen}</td>
                            <td className="p-4 text-center">
                              <button className="px-2 py-1 bg-[#081223] border border-[#0f223d] hover:bg-[#0c2041] rounded text-[10px] text-blue-400 font-bold transition">
                                Manage
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={9} className="p-8 text-center text-slate-500 font-sans">
                            No matching users found for current filters.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Table Pagination Footer */}
                <div className="p-4 border-t border-[#0f223d] bg-slate-900/20 flex items-center justify-between text-xs text-slate-400">
                  <p>Showing 1 to {filteredUsers.length} of {filteredUsers.length} entries</p>
                  <div className="flex gap-1.5">
                    <button className="px-2.5 py-1 bg-[#081223] border border-[#0f223d] rounded text-[10px] font-semibold text-slate-400 cursor-not-allowed">Previous</button>
                    <button className="px-2.5 py-1 bg-blue-600 border border-blue-500/20 rounded text-[10px] font-bold text-white">1</button>
                    <button className="px-2.5 py-1 bg-[#081223] border border-[#0f223d] rounded text-[10px] font-semibold text-slate-400 cursor-not-allowed">Next</button>
                  </div>
                </div>
              </div>

              {/* Lower Auxiliary Panels */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* User Status Distribution Graph */}
                <div className="glass-panel rounded-xl p-5 border border-[#0d274c]">
                  <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-4">Status Distribution</h3>
                  <div className="flex items-center justify-around gap-4">
                    <div className="relative w-28 h-28 rounded-full border-[8px] border-slate-950 flex items-center justify-center font-mono">
                      <div className="absolute inset-0 rounded-full border-[8px] border-emerald-500 border-b-transparent border-l-transparent"></div>
                      <div className="text-center">
                        <span className="text-lg font-extrabold text-white">1,248</span>
                        <span className="text-[8px] text-slate-500 uppercase block">Total</span>
                      </div>
                    </div>

                    <div className="space-y-1 text-[11px] font-mono text-slate-400">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                        <span>Online: <strong>732</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-slate-500"></span>
                        <span>Offline: <strong>386</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                        <span>Expired: <strong>31</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-400"></span>
                        <span>Disabled: <strong>45</strong></span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Top User Groups */}
                <div className="glass-panel rounded-xl p-5 border border-[#0d274c]">
                  <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-4">Top User Groups</h3>
                  <div className="space-y-3 font-mono text-[11px] text-slate-400">
                    <div className="flex justify-between items-center border-b border-slate-950 pb-2">
                      <span className="text-slate-300 font-sans">🎓 Guests</span>
                      <strong className="text-white">632 (51%)</strong>
                    </div>
                    <div className="flex justify-between items-center border-b border-slate-950 pb-2">
                      <span className="text-slate-300 font-sans">👥 Staff Members</span>
                      <strong className="text-white">342 (27%)</strong>
                    </div>
                    <div className="flex justify-between items-center border-b border-slate-950 pb-2">
                      <span className="text-slate-300 font-sans">🏫 Students</span>
                      <strong className="text-white">156 (12%)</strong>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-300 font-sans">⭐ VIP Access</span>
                      <strong className="text-white">78 (6%)</strong>
                    </div>
                  </div>
                </div>

                {/* Operations & Diagnostics */}
                <div className="glass-panel rounded-xl p-5 border border-[#0d274c] flex flex-col justify-between">
                  <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">Quick Operations</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <button className="p-3 bg-[#081223] border border-[#0f223d] hover:bg-[#0c2041] rounded-lg text-center transition">
                      <Plus className="w-5.5 h-5.5 text-blue-400 mx-auto mb-1.5" />
                      <span className="text-[10px] text-slate-300 font-bold block">Add User</span>
                    </button>
                    <button className="p-3 bg-[#081223] border border-[#0f223d] hover:bg-[#0c2041] rounded-lg text-center transition">
                      <Upload className="w-5.5 h-5.5 text-indigo-400 mx-auto mb-1.5" />
                      <span className="text-[10px] text-slate-300 font-bold block">Import Users</span>
                    </button>
                    <button className="p-3 bg-[#081223] border border-[#0f223d] hover:bg-[#0c2041] rounded-lg text-center transition">
                      <UsersIcon className="w-5.5 h-5.5 text-teal-400 mx-auto mb-1.5" />
                      <span className="text-[10px] text-slate-300 font-bold block">User Groups</span>
                    </button>
                    <button className="p-3 bg-[#081223] border border-[#0f223d] hover:bg-[#0c2041] rounded-lg text-center transition">
                      <Clock className="w-5.5 h-5.5 text-amber-400 mx-auto mb-1.5" />
                      <span className="text-[10px] text-slate-300 font-bold block">Bulk Actions</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
