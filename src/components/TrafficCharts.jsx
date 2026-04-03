import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function TrafficCharts({ data = [] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart
        data={data}
        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
      >
        <defs>
          <linearGradient id="colorInbound" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorOutbound" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} opacity={0.7} />
        <XAxis
          dataKey="time"
          stroke="#64748b"
          tick={{ fill: '#64748b', fontSize: 12 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="#64748b"
          tick={{ fill: '#64748b', fontSize: 12 }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#020617',
            border: '1px solid #1e293b',
            borderRadius: 10,
            color: '#e2e8f0',
            boxShadow: '0 18px 45px rgba(15,23,42,0.95)'
          }}
          itemStyle={{ fontWeight: 500, fontSize: 12 }}
          cursor={{ stroke: '#38bdf8', strokeWidth: 1, strokeDasharray: '4 4' }}
        />
        <Area
          type="monotone"
          dataKey="inbound"
          name="Incoming"
          stroke="#3b82f6"
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#colorInbound)"
          animationDuration={700}
          animationBegin={150}
        />
        <Area
          type="monotone"
          dataKey="outbound"
          name="Outgoing"
          stroke="#a855f7"
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#colorOutbound)"
          animationDuration={700}
          animationBegin={250}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}