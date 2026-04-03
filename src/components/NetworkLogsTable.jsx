import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, ShieldAlert, Globe, Server, Activity, ArrowRightLeft, CheckCircle2, XCircle } from 'lucide-react';

const formatBytes = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const getProtocolName = (port, defaultProto) => {
  const map = {
    443: 'HTTPS',
    80: 'HTTP',
    3306: 'MySQL',
    22: 'SSH',
    53: 'DNS',
    3389: 'RDP',
    21: 'FTP',
    25: 'FTP'
  };
  return map[port] || defaultProto || 'TCP';
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const rowVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: { opacity: 1, x: 0 }
};

export default function NetworkLogsTable({ logs = [] }) {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const displayLogs = logs.map((log, i) => ({
    id: log.id || i,
    source: log.source + (log.source.includes(':') ? '' : `:${log.port}`),
    destination: log.destination + (log.destination.includes(':') ? '' : `:${log.port}`),
    protocol: getProtocolName(log.port, log.protocol),
    packets: log.packets || Math.floor((typeof log.id === 'string' ? log.id.length : i * 987) % 15000) + 100,
    bytes: log.size || (1024 * (Math.floor((log.size || i * 543) % 500) + 10)),
    status: log.status === 'blocked' ? 'closed' : 'active'
  }));

  const filteredLogs = displayLogs.filter(log => {
    if (filter !== 'all' && log.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return log.source.toLowerCase().includes(q) || 
             log.destination.toLowerCase().includes(q) ||
             log.protocol.toLowerCase().includes(q);
    }
    return true;
  }).slice(0, 15); // Show top performance

  return (
    <div className="w-full text-sm">
      <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={() => setFilter('all')} 
            className={`px-4 py-2 rounded-lg font-medium transition-colors border ${filter === 'all' ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' : 'bg-[#162137]/50 text-slate-400 border-transparent hover:bg-[#162137]'}`}
          >
            All Connections
          </button>
          <button 
             onClick={() => setFilter('active')} 
             className={`px-4 py-2 rounded-lg font-medium transition-colors border ${filter === 'active' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-[#162137]/50 text-slate-400 border-transparent hover:bg-[#162137]'}`}
          >
            Active
          </button>
          <button 
             onClick={() => setFilter('closed')} 
             className={`px-4 py-2 rounded-lg font-medium transition-colors border ${filter === 'closed' ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : 'bg-[#162137]/50 text-slate-400 border-transparent hover:bg-[#162137]'}`}
          >
            Closed
          </button>
        </div>
        <div className="relative w-full sm:w-72">
          <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
            <Globe className="text-slate-500 w-4 h-4" />
          </div>
          <input 
            type="text" 
            placeholder="Search IP, Port" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#162137]/50 border border-slate-700/50 rounded-lg pl-10 pr-4 py-2 text-slate-200 focus:outline-none focus:border-indigo-500/50 focus:bg-[#162137] transition-all"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse whitespace-normal md:whitespace-nowrap text-xs sm:text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400">
              <th className="py-4 font-medium px-4">Source</th>
              <th className="py-4 font-medium px-4">Destination</th>
              <th className="py-4 font-medium px-4 w-20">Protocol</th>
              <th className="py-4 font-medium px-4 text-right w-20">Packets</th>
              <th className="py-4 font-medium px-4 text-right w-24">Bytes</th>
              <th className="py-4 font-medium px-4 text-center w-24">Status</th>
            </tr>
          </thead>
          <motion.tbody initial="hidden" animate="visible" variants={containerVariants}>
            {filteredLogs.map((log) => (
              <motion.tr 
                key={log.id} 
                variants={rowVariants}
                className="border-b border-slate-800/50 hover:bg-[#162137]/40 transition-colors group"
              >
                <td className="py-2 px-3 sm:py-3 sm:px-4 text-slate-300 font-mono tracking-tight break-all md:break-normal">{log.source}</td>
                <td className="py-2 px-3 sm:py-3 sm:px-4 text-slate-300 font-mono tracking-tight break-all md:break-normal">{log.destination}</td>
                <td className="py-3 px-4 w-20">
                  <span className="bg-slate-800 text-slate-300 px-2 py-1 rounded text-xs font-semibold border border-slate-700/50 block w-fit">
                    {log.protocol}
                  </span>
                </td>
                <td className="py-2 px-3 sm:py-3 sm:px-4 text-right text-slate-300 w-20">{log.packets.toLocaleString()}</td>
                <td className="py-2 px-3 sm:py-3 sm:px-4 text-right text-slate-300 w-24">{formatBytes(log.bytes)}</td>
                <td className="py-2 px-3 sm:py-3 sm:px-4 relative flex justify-start sm:justify-center w-24">
                  {log.status === 'active' ? (
                    <span className="flex items-center gap-1.5 text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full text-xs font-medium border border-emerald-500/20">
                      <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full shadow-[0_0_8px_rgba(52,211,153,0.8)]" /> Active
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-full text-xs font-medium border border-slate-700/50">
                      <div className="w-1.5 h-1.5 bg-rose-400 rounded-full" /> Closed
                    </span>
                  )}
                </td>
              </motion.tr>
            ))}
            {filteredLogs.length === 0 && (
              <tr>
                <td colSpan="6" className="py-12 text-center text-slate-500">
                  No matching network traffic found.
                </td>
              </tr>
            )}
          </motion.tbody>
        </table>
      </div>
    </div>
  );
}
