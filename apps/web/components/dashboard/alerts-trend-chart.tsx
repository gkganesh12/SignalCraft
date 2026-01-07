'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface AlertsTrendChartProps {
  data: Array<{ hour: string; count: number }>;
}

export function AlertsTrendChart({ data }: AlertsTrendChartProps) {
  // Format hour labels for display
  const formattedData = data.map((item) => ({
    ...item,
    label: item.hour.slice(11, 13) + ':00', // Extract hour from ISO string
  }));

  return (
    <div className="rounded-xl bg-zinc-950 border border-red-900/10 p-6 shadow-sm">
      <h3 className="text-sm font-medium text-zinc-400 mb-4">Alerts Trend (24h)</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={formattedData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: '#71717a' }}
              tickLine={false}
              axisLine={{ stroke: '#27272a' }}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#71717a' }}
              tickLine={false}
              axisLine={{ stroke: '#27272a' }}
              width={40}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#09090b',
                border: '1px solid #27272a',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)',
                color: '#fff'
              }}
              labelStyle={{ color: '#a1a1aa', fontWeight: 600 }}
              itemStyle={{ color: '#fff' }}
            />
            <Line
              type="monotone"
              dataKey="count"
              stroke="#dc2626"
              strokeWidth={2}
              dot={{ fill: '#dc2626', r: 3, strokeWidth: 0 }}
              activeDot={{ r: 5, fill: '#ef4444', stroke: '#7f1d1d', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
