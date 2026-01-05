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
    <div className="rounded-xl bg-white/80 backdrop-blur-sm border border-gray-200/50 p-6 shadow-sm">
      <h3 className="text-sm font-medium text-gray-500 mb-4">Alerts Trend (24h)</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={formattedData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: '#6b7280' }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#6b7280' }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
              width={40}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
              }}
              labelStyle={{ color: '#374151', fontWeight: 600 }}
            />
            <Line
              type="monotone"
              dataKey="count"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: '#3b82f6', r: 3 }}
              activeDot={{ r: 5, fill: '#2563eb' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
