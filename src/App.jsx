import React, { Suspense, lazy, useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, ShieldAlert, Globe, Server, LayoutDashboard, Network, BarChart2, Bell, Shield, CheckCircle2, AlertTriangle, XCircle, Info, ChevronUp, ChevronDown, Menu } from 'lucide-react';
import './App.css';

const TrafficCharts = lazy(() => import('./components/TrafficCharts.jsx'));
const NetworkLogsTable = lazy(() => import('./components/NetworkLogsTable.jsx'));

// Mock Data replaced with derived dynamic data
const SidebarItem = ({ icon: Icon, label, active, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-colors text-left ${active ? 'bg-[#2B3549] text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
  >
    <Icon className="w-5 h-5" />
    <span className="font-medium text-sm">{label}</span>
  </button>
);

const fadeUp = { hidden: { opacity: 0, y: 15 }, visible: { opacity: 1, y: 0 } };

function App() {
  const [connections, setConnections] = useState([]);
  const [devices, setDevices] = useState([]);
  const [internet, setInternet] = useState({ latencyMs: null, downKbps: 0, upKbps: 0 });
  const [bandwidthHistory, setBandwidthHistory] = useState(
    Array.from({ length: 20 }).map(() => ({ time: '00:00', inbound: 1, outbound: 1 }))
  );
  
  const [stats, setStats] = useState({
    avgLatency: 0,
    currentInbound: 0,
    currentOutbound: 0
  });

  const [activePage, setActivePage] = useState('dashboard'); // 'dashboard' | 'servers' | 'network' | 'analytics' | 'alerts' | 'security'
  const [selectedServer, setSelectedServer] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const kategoriData = useMemo(() => {
    let ws = 0, db = 0, ssh = 0, ftp = 0, others = 0;
    connections.forEach(c => {
      const p = parseInt(c.port);
      if ([80, 443, 8080, 8443].includes(p)) ws++;
      else if ([3306, 5432, 27017, 1433].includes(p)) db++;
      else if ([22, 3389, 23].includes(p)) ssh++;
      else if ([20, 21, 22].includes(p)) ftp++; // SFTP is 22 too
      else others++;
    });

    return [
      { name: 'Web Services (HTTP/S)', total: ws, online: ws, warning: 0, offline: 0 },
      { name: 'Database Apps', total: db, online: db, warning: 0, offline: 0 },
      { name: 'Secure Shell / Admin', total: ssh, online: ssh, warning: 0, offline: 0 },
      { name: 'File Transfer (FTP)', total: ftp, online: ftp, warning: 0, offline: 0 },
      { name: 'Other Protocols', total: others, online: others, warning: 0, offline: 0 }
    ];
  }, [connections]);

  const lokasiData = useMemo(() => {
    // Prefer connection-based hosts; fall back to devices if there are no active connections
    if (connections.length > 0) {
      const ips = {};
      connections.forEach(c => {
        if (!c.destination) return;
        ips[c.destination] = (ips[c.destination] || 0) + 1;
      });
      return Object.entries(ips)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([ip, count]) => ({
          name: ip,
          type: 'Active Node',
          addr: 'Network Host',
          servers: count,
          online: count
        }));
    }

    if (devices.length > 0) {
      return devices.slice(0, 6).map(dev => ({
        name: dev.ip || 'Unknown host',
        type: dev.type || 'Discovered Device',
        addr: dev.mac || 'N/A',
        servers: 1,
        online: 1
      }));
    }

    return [];
  }, [connections, devices]);

  const alertsData = useMemo(() => {
    if (connections.length === 0) return [
      { type: 'success', text: 'All tasks completed successfully', subtext: 'All Nodes • Normal operation', icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-400/20' }
    ];

    const items = [
      { type: 'warning', text: `Detected ${connections.length} active connections`, subtext: `Last updated ${new Date().toLocaleTimeString()}`, icon: Activity, color: 'text-indigo-400', bg: 'bg-indigo-400/20' }
    ];

    if (internet.latencyMs != null) {
      items.push({
        type: 'info',
        text: `Internet latency ~${internet.latencyMs.toFixed ? internet.latencyMs.toFixed(0) : internet.latencyMs} ms`,
        subtext: 'Ping to 8.8.8.8',
        icon: Globe,
        color: 'text-blue-400',
        bg: 'bg-blue-400/20'
      });
    }

    return items;
  }, [connections, internet]);

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:3001');
    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'NETWORK_UPDATE') {
          if (payload.connections) setConnections(payload.connections);
          if (payload.devices) setDevices(payload.devices);
          if (payload.internet) setInternet(payload.internet);
          if (payload.bandwidth) {
            const inM = (payload.bandwidth.inbound || 0) / 1024;
            const outM = (payload.bandwidth.outbound || 0) / 1024;
            setStats(s => {
              const avgLatency = payload.internet?.latencyMs ?? s.avgLatency;
              return { ...s, currentInbound: inM, currentOutbound: outM, avgLatency };
            });
            setBandwidthHistory(prev => {
              const newData = [...prev.slice(1)];
              newData.push({ time: payload.bandwidth.time || new Date().toLocaleTimeString().slice(0,5), inbound: inM, outbound: outM });
              return newData;
            });
          }
        }
      } catch(err) { console.error(err); }
    };
    return () => ws.close();
  }, []);

  const serverSummary = useMemo(() => {
    const map = {};
    connections.forEach((c) => {
      if (!c.destination) return;
      const key = c.destination;
      if (!map[key]) {
        map[key] = {
          ip: key,
          total: 0,
          ports: new Set(),
          lastSeen: c.timestamp || new Date().toISOString(),
        };
      }
      map[key].total += 1;
      if (c.port) map[key].ports.add(c.port);
      map[key].lastSeen = c.timestamp || map[key].lastSeen;
    });

    return Object.values(map)
      .sort((a, b) => b.total - a.total)
      .slice(0, 12)
      .map((s) => ({
        ...s,
        ports: Array.from(s.ports).slice(0, 5),
      }));
  }, [connections]);

  const filteredConnections = useMemo(() => {
    if (!selectedServer) return connections;
    return connections.filter((c) => c.destination === selectedServer);
  }, [connections, selectedServer]);

  const securitySummary = useMemo(() => {
    let adminConns = 0;
    let insecureConns = 0;
    let total = connections.length;

    connections.forEach((c) => {
      const p = parseInt(c.port, 10) || 0;
      if ([22, 23, 3389].includes(p)) adminConns += 1;
      if ([21, 23, 445].includes(p)) insecureConns += 1;
    });

    return { adminConns, insecureConns, total };
  }, [connections]);

  const hasScrollableDevices = devices.length > 3;

  const pageTitles = {
    dashboard: 'Dashboard Overview',
    servers: 'Servers Overview',
    network: 'Network Monitoring',
    analytics: 'Analytics Overview',
    alerts: 'Alerts Center',
    security: 'Security Overview',
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 flex font-sans overflow-hidden relative">
      <div className="app-bg-overlay" />
      <div className="noise-layer" />

      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-800 hidden lg:flex lg:flex-col bg-[#0D1525]">
        <div className="p-6 border-b border-slate-800/50 flex items-center gap-3">
          <div className="bg-indigo-500 p-2 rounded-lg shadow-lg shadow-indigo-500/20"><Activity className="w-6 h-6 text-white" /></div>
          <div><h1 className="text-xl font-bold text-white tracking-tight leading-none">NetMonitor</h1></div>
        </div>
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          <SidebarItem icon={LayoutDashboard} label="Dashboard" active={activePage === 'dashboard'} onClick={() => setActivePage('dashboard')} />
          <SidebarItem icon={Server} label="Servers" active={activePage === 'servers'} onClick={() => { setActivePage('servers'); setSelectedServer(null); }} />
          <SidebarItem icon={Network} label="Network" active={activePage === 'network'} onClick={() => setActivePage('network')} />
          <SidebarItem icon={BarChart2} label="Analytics" active={activePage === 'analytics'} onClick={() => setActivePage('analytics')} />
          <SidebarItem icon={Bell} label="Alerts" active={activePage === 'alerts'} onClick={() => setActivePage('alerts')} />
          <SidebarItem icon={Shield} label="Security" active={activePage === 'security'} onClick={() => setActivePage('security')} />
        </div>
        <div className="p-4 border-t border-slate-800/50">
          <div className="bg-emerald-500/5 border border-emerald-500/10 px-4 py-3 rounded-xl flex items-center gap-3">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-[pulse_2s_ease-in-out_infinite]" />
            <div className="text-xs">
              <span className="block text-emerald-400 font-semibold mb-0.5">System Status</span>
              <span className="text-slate-400">All systems operational</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Page*/}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* Header */}
        <header className="h-20 bg-[#0D1525]/80 backdrop-blur-md border-b border-slate-800/50 px-8 flex items-center justify-between sticky top-0 z-10 shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-white">{pageTitles[activePage] || 'Dashboard Overview'}</h2>
            <div className="text-sm text-slate-400 flex items-center gap-2 mt-1">Last updated: <span className="text-slate-300">{new Date().toLocaleTimeString()}</span></div>
          </div>
          <button
            type="button"
            className="lg:hidden inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-700/60 bg-[#162137] hover:bg-[#1E2B45] text-slate-200 transition-colors shadow-sm"
            onClick={() => setIsSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>
        </header>

        {/* Mobile Sidebar */}
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.div
              className="fixed inset-0 z-40 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div
                className="absolute inset-0 bg-black/40"
                onClick={() => setIsSidebarOpen(false)}
              />
              <motion.aside
                className="relative bg-[#0D1525] w-64 h-full border-r border-slate-800 flex flex-col shadow-xl"
                initial={{ x: -260 }}
                animate={{ x: 0 }}
                exit={{ x: -260 }}
                transition={{ type: 'tween', duration: 0.2 }}
              >
                <div className="p-6 border-b border-slate-800/50 flex items-center gap-3">
                  <div className="bg-indigo-500 p-2 rounded-lg shadow-lg shadow-indigo-500/20"><Activity className="w-6 h-6 text-white" /></div>
                  <div>
                    <h1 className="text-xl font-bold text-white tracking-tight leading-none">NetMonitor</h1>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
                  <SidebarItem icon={LayoutDashboard} label="Dashboard" active={activePage === 'dashboard'} onClick={() => { setActivePage('dashboard'); setSelectedServer(null); setIsSidebarOpen(false); }} />
                  <SidebarItem icon={Server} label="Servers" active={activePage === 'servers'} onClick={() => { setActivePage('servers'); setIsSidebarOpen(false); }} />
                  <SidebarItem icon={Network} label="Network" active={activePage === 'network'} onClick={() => { setActivePage('network'); setSelectedServer(null); setIsSidebarOpen(false); }} />
                  <SidebarItem icon={BarChart2} label="Analytics" active={activePage === 'analytics'} onClick={() => { setActivePage('analytics'); setSelectedServer(null); setIsSidebarOpen(false); }} />
                  <SidebarItem icon={Bell} label="Alerts" active={activePage === 'alerts'} onClick={() => { setActivePage('alerts'); setSelectedServer(null); setIsSidebarOpen(false); }} />
                  <SidebarItem icon={Shield} label="Security" active={activePage === 'security'} onClick={() => { setActivePage('security'); setSelectedServer(null); setIsSidebarOpen(false); }} />
                </div>
              </motion.aside>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 pb-12">

          {activePage === 'dashboard' && (
            <>
          
          {/* Stat Cards */}
          <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.06 } } }} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            
            {/* Uptime */}
            <motion.div variants={fadeUp} transition={{ duration: 0.35 }} className="bg-[#0D1525]/95 border border-slate-800/60 p-5 rounded-2xl shadow-sm card-glow backdrop-blur-sm">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2.5 bg-emerald-500/10 rounded-lg text-emerald-400"><Activity className="w-5 h-5" /></div>
                <span className="flex items-center gap-1 text-xs font-medium text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-md"><ChevronUp className="w-3 h-3"/> +0.2% from last month</span>
              </div>
              <h3 className="text-slate-400 text-sm font-medium mb-1">Network Uptime</h3>
              <div className="flex items-baseline gap-2"><span className="text-3xl font-bold text-white">99.8%</span><span className="text-xs text-slate-500">Last 30 days</span></div>
            </motion.div>

            {/* Servers */}
            <motion.div variants={fadeUp} transition={{ duration: 0.35, delay: 0.02 }} className="bg-[#0D1525]/95 border border-slate-800/60 p-5 rounded-2xl shadow-sm card-glow backdrop-blur-sm">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2.5 bg-indigo-500/10 rounded-lg text-indigo-400"><Server className="w-5 h-5" /></div>
              </div>
              <h3 className="text-slate-400 text-sm font-medium mb-1">Total Active Connections</h3>
              <div className="flex items-baseline gap-2"><span className="text-3xl font-bold text-white">{connections.length}</span><span className="text-xs text-amber-500 font-medium">0 warning, 0 offline</span></div>
            </motion.div>

            {/* Bandwidth */}
            <motion.div variants={fadeUp} transition={{ duration: 0.35, delay: 0.04 }} className="bg-[#0D1525]/95 border border-slate-800/60 p-5 rounded-2xl shadow-sm card-glow backdrop-blur-sm">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2.5 bg-blue-500/10 rounded-lg text-blue-400"><Globe className="w-5 h-5" /></div>
              </div>
              <h3 className="text-slate-400 text-sm font-medium mb-1">Bandwidth Usage</h3>
              <div className="flex items-baseline gap-2"><span className="text-xl font-bold text-white">↓{stats.currentInbound.toFixed(1)} / ↑{stats.currentOutbound.toFixed(1)}</span><span className="text-xs text-slate-500">Mbps</span></div>
              <p className="text-xs text-slate-500 mt-1">(Download/Upload)</p>
            </motion.div>

            {/* Latency */}
            <motion.div variants={fadeUp} transition={{ duration: 0.35, delay: 0.06 }} className="bg-[#0D1525]/95 border border-slate-800/60 p-5 rounded-2xl shadow-sm card-glow backdrop-blur-sm">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2.5 bg-purple-500/10 rounded-lg text-purple-400"><Network className="w-5 h-5" /></div>
                <span className="flex items-center gap-1 text-xs font-medium text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-md"><ChevronDown className="w-3 h-3"/> Good</span>
              </div>
              <h3 className="text-slate-400 text-sm font-medium mb-1">Avg Latency</h3>
              <div className="flex items-baseline gap-2"><span className="text-3xl font-bold text-white">{stats.avgLatency}ms</span><span className="text-xs text-slate-500">Average response time</span></div>
            </motion.div>

          </motion.div>

          {/* Status per Protocol Category */}
          <div className="bg-[#0D1525] border border-slate-800/60 rounded-2xl shadow-sm p-6 overflow-hidden flex flex-col">
            <h3 className="text-lg font-semibold text-white mb-5">Status per Protocol Category</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
              {kategoriData.map((kat) => (
                <div key={kat.name} className="bg-[#162137]/60 border border-slate-700/50 rounded-xl p-4 shadow-sm hover:bg-[#162137] transition-all">
                  <h4 className="text-sm font-medium text-slate-300 mb-4 truncate" title={kat.name}>{kat.name}</h4>
                  <div className="flex flex-col gap-2.5 text-xs">
                    <div className="flex justify-between text-slate-400">Total: <span className="font-semibold text-slate-200 bg-slate-800 px-1.5 rounded">{kat.total}</span></div>
                    <div className="flex justify-between text-emerald-400">Online: <span className="font-semibold">{kat.online}</span></div>
                    {(kat.warning > 0) && <div className="flex justify-between text-amber-400">Warning: <span className="font-semibold">{kat.warning}</span></div>}
                    {kat.offline > 0 && <div className="flex justify-between text-rose-400">Offline: <span className="font-semibold">{kat.offline}</span></div>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chart Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-[#0D1525] border border-slate-800/60 rounded-2xl shadow-sm p-6 min-h-[350px] flex flex-col relative overflow-hidden">
               <h3 className="text-lg font-semibold text-white mb-1">Bandwidth Usage</h3>
               <p className="text-xs text-slate-400 mb-4">Download / Upload (Mbps)</p>
               <div className="flex-1 mt-4 relative z-10 w-full h-[250px]">
                 <Suspense fallback={<div className="h-full flex items-center justify-center text-slate-500 text-sm animate-pulse">Loading Chart...</div>}>
                   <TrafficCharts data={bandwidthHistory} />
                 </Suspense>
               </div>
            </div>
            <div className="bg-[#0D1525] border border-slate-800/60 rounded-2xl shadow-sm p-6 min-h-[350px] flex flex-col relative overflow-hidden">
               <h3 className="text-lg font-semibold text-white mb-1">Network Latency</h3>
               <p className="text-xs text-slate-400 mb-4">Response Time (ms)</p>
               <div className="flex-1 mt-4 relative z-10 w-full h-[250px] opacity-80 mix-blend-screen hue-rotate-180">
                 <Suspense fallback={<div className="h-full flex items-center justify-center text-slate-500 text-sm animate-pulse">Loading Chart...</div>}>
                   <TrafficCharts data={bandwidthHistory.map(d => ({time: d.time, inbound: stats.avgLatency * 1.5, outbound: stats.avgLatency * 1.1}))} />
                 </Suspense>
               </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Server */}
            <div className="flex flex-col gap-4 min-h-100">
              {/* Connected Devices */}
              <div className="bg-[#0D1525] border border-slate-800/60 rounded-2xl shadow-sm p-6 overflow-hidden flex flex-col flex-1">
                <h3 className="text-lg font-semibold text-white mb-5 shrink-0">Connected Devices</h3>
                <div className={`${hasScrollableDevices ? 'overflow-y-auto custom-scrollbar' : 'overflow-y-visible'} pr-2 space-y-3 flex-1`}>
                  {devices && devices.length > 0 ? (
                    devices.slice(0, 50).map((dev, i) => (
                      <div key={`${dev.ip}-${dev.mac}-${i}`} className="bg-[#162137]/40 border border-slate-700/40 p-4 rounded-xl flex items-center justify-between gap-4 hover:bg-[#162137]/80 transition-colors">
                        <div className="min-w-0">
                          <h4 className="text-sm font-semibold text-slate-200 truncate pr-2">{dev.ip || 'Unknown IP'}</h4>
                          <div className="text-xs text-slate-400 mt-2 flex flex-col gap-1">
                            <span className="truncate">MAC: {dev.mac || 'N/A'}</span>
                            <span className="truncate">Type: {dev.type || 'unknown'}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-slate-500">No devices detected yet. Waiting for ARP data...</div>
                  )}
                </div>
              </div>

              {/* Active Subnets/Hosts */}
              <div className="bg-[#0D1525] border border-slate-800/60 rounded-2xl shadow-sm p-6 overflow-hidden flex flex-col flex-1">
                <h3 className="text-lg font-semibold text-white mb-5 shrink-0">Top Active Subnets/Hosts</h3>
                <div className="overflow-y-auto pr-2 space-y-3 flex-1 custom-scrollbar">
                  {lokasiData.map((loc, i) => (
                    <div key={i} className="bg-[#162137]/40 border border-slate-700/40 p-4 rounded-xl flex items-center justify-between gap-4 hover:bg-[#162137]/80 transition-colors">
                      <div className="min-w-0">
                        <h4 className="text-sm font-semibold text-slate-200 truncate pr-2">{loc.name}</h4>
                        <div className="text-xs text-slate-400 mt-2 flex items-center gap-2 truncate">
                          <span className="bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-md font-medium shrink-0">{loc.type}</span> 
                          <span className="truncate">{loc.addr}</span>
                        </div>
                      </div>
                      <div className="text-right whitespace-nowrap pl-2 shrink-0">
                        <div className="text-sm font-bold text-slate-200">{loc.servers} Conns</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent Alerts */}
            <div className="bg-[#0D1525] border border-slate-800/60 rounded-2xl shadow-sm p-6 overflow-hidden flex flex-col min-h-100">
              <h3 className="text-lg font-semibold text-white mb-5 shrink-0">Live Network Anomalies</h3>
              <div className="overflow-y-auto pr-2 space-y-3 flex-1 custom-scrollbar">
                {alertsData.map((alert, i) => (
                  <div key={i} className="flex gap-4 p-4 rounded-xl border border-slate-700/40 bg-[#162137]/40 hover:bg-[#162137]/80 transition-colors items-start">
                    <div className={`p-2.5 rounded-xl shrink-0 ${alert.bg} ${alert.color}`}>
                      <alert.icon className="w-5 h-5" />
                    </div>
                    <div className="pt-0.5 min-w-0">
                      <h4 className="text-sm font-medium text-slate-200 mb-1 leading-snug pr-2 truncate">{alert.text}</h4>
                      <p className="text-xs text-slate-500 font-medium">{alert.subtext}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Network Traffic */}
          <div className="bg-[#0D1525] border border-slate-800/60 rounded-2xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-white mb-5">Network Traffic</h3>
            <div className="w-full relative">
              <Suspense fallback={<div className="p-12 text-center text-slate-500 animate-pulse text-sm">Loading network feeds...</div>}>
                <NetworkLogsTable logs={connections.length > 0 ? connections : []} />
              </Suspense>
            </div>
          </div>

          </>
          )}

          {activePage === 'servers' && (
            <>
              <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.05 } } }} className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <motion.div variants={fadeUp} className="bg-[#0D1525] border border-slate-800/60 p-5 rounded-2xl shadow-sm col-span-1 xl:col-span-1">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-1">Servers</h3>
                      <p className="text-xs text-slate-400">Grouped by destination host from active connections.</p>
                    </div>
                    {selectedServer && (
                      <button
                        type="button"
                        onClick={() => setSelectedServer(null)}
                        className="text-xs text-sky-400 hover:text-sky-300"
                      >
                        Clear filter
                      </button>
                    )}
                  </div>
                  <div className="space-y-3 max-h-[420px] overflow-y-auto pr-2 custom-scrollbar">
                    {serverSummary.length === 0 && (
                      <p className="text-xs text-slate-500">No active server connections yet. Generate some traffic to see hosts.</p>
                    )}
                    {serverSummary.map((srv) => (
                      <button
                        key={srv.ip}
                        type="button"
                        onClick={() => setSelectedServer(srv.ip)}
                        className={`w-full text-left bg-[#162137]/40 border border-slate-700/40 p-4 rounded-xl hover:bg-[#162137]/80 transition-colors ${selectedServer === srv.ip ? 'border-sky-500/60 ring-1 ring-sky-500/40' : ''}`}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="min-w-0">
                            <h4 className="text-sm font-semibold text-slate-200 truncate pr-2">{srv.ip}</h4>
                            <p className="text-xs text-slate-500 mt-1 truncate">Ports: {srv.ports.length > 0 ? srv.ports.join(', ') : 'N/A'}</p>
                          </div>
                          <div className="text-right whitespace-nowrap pl-2 shrink-0">
                            <div className="text-sm font-bold text-slate-200">{srv.total} conns</div>
                            <div className="text-[11px] text-slate-500 mt-0.5">Last: {srv.lastSeen?.slice(11, 19) || '-'}</div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </motion.div>

                <motion.div variants={fadeUp} className="bg-[#0D1525] border border-slate-800/60 p-5 rounded-2xl shadow-sm col-span-1 xl:col-span-2 flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">Server Traffic</h3>
                    <p className="text-xs text-slate-400">
                      {selectedServer ? `Showing connections to ${selectedServer}` : 'Showing all active connections'}
                    </p>
                  </div>
                  <div className="flex-1 w-full relative">
                    <Suspense fallback={<div className="p-12 text-center text-slate-500 animate-pulse text-sm">Loading server traffic...</div>}>
                      <NetworkLogsTable logs={filteredConnections.length > 0 ? filteredConnections : []} />
                    </Suspense>
                  </div>
                </motion.div>
              </motion.div>
            </>
          )}

          {activePage === 'network' && (
            <>
              <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.05 } } }} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <motion.div variants={fadeUp} className="bg-[#0D1525] border border-slate-800/60 p-5 rounded-2xl shadow-sm">
                  <h3 className="text-sm font-medium text-slate-400 mb-1">Active Connections</h3>
                  <div className="text-3xl font-bold text-white mb-1">{connections.length}</div>
                  <p className="text-xs text-slate-500">TCP sessions observed on this host</p>
                </motion.div>
                <motion.div variants={fadeUp} className="bg-[#0D1525] border border-slate-800/60 p-5 rounded-2xl shadow-sm">
                  <h3 className="text-sm font-medium text-slate-400 mb-1">Unique Servers</h3>
                  <div className="text-3xl font-bold text-white mb-1">{new Set(connections.map(c => c.destination)).size}</div>
                  <p className="text-xs text-slate-500">Distinct destination hosts</p>
                </motion.div>
                <motion.div variants={fadeUp} className="bg-[#0D1525] border border-slate-800/60 p-5 rounded-2xl shadow-sm">
                  <h3 className="text-sm font-medium text-slate-400 mb-1">Discovered Devices</h3>
                  <div className="text-3xl font-bold text-white mb-1">{devices.length}</div>
                  <p className="text-xs text-slate-500">From local ARP table</p>
                </motion.div>
              </motion.div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-[#0D1525] border border-slate-800/60 rounded-2xl shadow-sm p-6 min-h-[320px] flex flex-col">
                  <h3 className="text-lg font-semibold text-white mb-1">Live Bandwidth</h3>
                  <p className="text-xs text-slate-400 mb-4">Download / Upload (Mbps)</p>
                  <div className="flex-1 mt-2 w-full h-[240px]">
                    <Suspense fallback={<div className="h-full flex items-center justify-center text-slate-500 text-sm animate-pulse">Loading chart...</div>}>
                      <TrafficCharts data={bandwidthHistory} />
                    </Suspense>
                  </div>
                </div>
                <div className="bg-[#0D1525] border border-slate-800/60 rounded-2xl shadow-sm p-6 min-h-[320px] flex flex-col">
                  <h3 className="text-lg font-semibold text-white mb-1">Network Traffic</h3>
                  <p className="text-xs text-slate-400 mb-4">All connections from this host</p>
                  <div className="flex-1 w-full relative">
                    <Suspense fallback={<div className="p-12 text-center text-slate-500 animate-pulse text-sm">Loading traffic...</div>}>
                      <NetworkLogsTable logs={connections.length > 0 ? connections : []} />
                    </Suspense>
                  </div>
                </div>
              </div>
            </>
          )}

          {activePage === 'analytics' && (
            <>
              <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.05 } } }} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <motion.div variants={fadeUp} className="bg-[#0D1525] border border-slate-800/60 p-5 rounded-2xl shadow-sm">
                  <h3 className="text-sm font-medium text-slate-400 mb-1">Total Connections Seen</h3>
                  <div className="text-3xl font-bold text-white mb-1">{connections.length}</div>
                  <p className="text-xs text-slate-500">Current snapshot of active flows</p>
                </motion.div>
                <motion.div variants={fadeUp} className="bg-[#0D1525] border border-slate-800/60 p-5 rounded-2xl shadow-sm">
                  <h3 className="text-sm font-medium text-slate-400 mb-1">Peak Download (window)</h3>
                  <div className="text-3xl font-bold text-white mb-1">{Math.max(...bandwidthHistory.map(b => b.inbound || 0)).toFixed(1)} Mbps</div>
                  <p className="text-xs text-slate-500">Highest inbound in the last samples</p>
                </motion.div>
                <motion.div variants={fadeUp} className="bg-[#0D1525] border border-slate-800/60 p-5 rounded-2xl shadow-sm">
                  <h3 className="text-sm font-medium text-slate-400 mb-1">Peak Upload (window)</h3>
                  <div className="text-3xl font-bold text-white mb-1">{Math.max(...bandwidthHistory.map(b => b.outbound || 0)).toFixed(1)} Mbps</div>
                  <p className="text-xs text-slate-500">Highest outbound in the last samples</p>
                </motion.div>
              </motion.div>

              <div className="bg-[#0D1525] border border-slate-800/60 rounded-2xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-white mb-5">Protocol Categories</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4">
                  {kategoriData.map((kat) => (
                    <div key={kat.name} className="bg-[#162137]/60 border border-slate-700/50 rounded-xl p-4 shadow-sm">
                      <h4 className="text-sm font-medium text-slate-300 mb-2 truncate" title={kat.name}>{kat.name}</h4>
                      <div className="text-xs text-slate-400 space-y-1">
                        <div className="flex justify-between"><span>Total</span><span className="font-semibold text-slate-100">{kat.total}</span></div>
                        <div className="flex justify-between"><span>Online</span><span className="font-semibold text-emerald-400">{kat.online}</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {activePage === 'alerts' && (
            <>
              <div className="bg-[#0D1525] border border-slate-800/60 rounded-2xl shadow-sm p-6 flex flex-col min-h-[360px]">
                <h3 className="text-lg font-semibold text-white mb-4">Alerts & Events</h3>
                <p className="text-xs text-slate-400 mb-4">Live conditions based on current network state.</p>
                <div className="overflow-y-auto pr-2 space-y-3 flex-1 custom-scrollbar">
                  {alertsData.map((alert, i) => (
                    <div key={i} className="flex gap-4 p-4 rounded-xl border border-slate-700/40 bg-[#162137]/40 hover:bg-[#162137]/80 transition-colors items-start">
                      <div className={`p-2.5 rounded-xl shrink-0 ${alert.bg} ${alert.color}`}>
                        <alert.icon className="w-5 h-5" />
                      </div>
                      <div className="pt-0.5 min-w-0">
                        <h4 className="text-sm font-medium text-slate-200 mb-1 leading-snug pr-2 truncate">{alert.text}</h4>
                        <p className="text-xs text-slate-500 font-medium">{alert.subtext}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {activePage === 'security' && (
            <>
              <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.05 } } }} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <motion.div variants={fadeUp} className="bg-[#0D1525] border border-slate-800/60 p-5 rounded-2xl shadow-sm">
                  <h3 className="text-sm font-medium text-slate-400 mb-1">Admin / Remote Access</h3>
                  <div className="text-3xl font-bold text-white mb-1">{securitySummary.adminConns}</div>
                  <p className="text-xs text-slate-500">Connections on ports 22, 23, 3389</p>
                </motion.div>
                <motion.div variants={fadeUp} className="bg-[#0D1525] border border-slate-800/60 p-5 rounded-2xl shadow-sm">
                  <h3 className="text-sm font-medium text-slate-400 mb-1">Insecure Services</h3>
                  <div className="text-3xl font-bold text-white mb-1">{securitySummary.insecureConns}</div>
                  <p className="text-xs text-slate-500">FTP/Telnet/SMB style ports detected</p>
                </motion.div>
                <motion.div variants={fadeUp} className="bg-[#0D1525] border border-slate-800/60 p-5 rounded-2xl shadow-sm">
                  <h3 className="text-sm font-medium text-slate-400 mb-1">Total Observed Flows</h3>
                  <div className="text-3xl font-bold text-white mb-1">{securitySummary.total}</div>
                  <p className="text-xs text-slate-500">Current active connections</p>
                </motion.div>
              </motion.div>

              <div className="bg-[#0D1525] border border-slate-800/60 rounded-2xl shadow-sm p-6 flex flex-col min-h-[320px]">
                <h3 className="text-lg font-semibold text-white mb-4">Security Notes</h3>
                <ul className="text-xs text-slate-400 space-y-2">
                  <li>
                    • Monitor admin ports (SSH/RDP/Telnet). Any unexpected entries in "Admin / Remote Access" should be reviewed.
                  </li>
                  <li>
                    • "Insecure Services" counts connections on classic clear-text or file-sharing ports. Consider migrating these to more secure alternatives.
                  </li>
                  <li>
                    • Combine this view with the Servers and Network pages to understand which hosts expose sensitive services.
                  </li>
                </ul>
              </div>
            </>
          )}

        </div>
      </main>
    </div>
  );
}

export default App;
