import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  XAxis,
  YAxis,
  Bar,
  CartesianGrid,
  LabelList,
} from 'recharts';

const renderCustomBarLabel = ({ x, y, width, value }) => {
  const percentValue = `${(value * 100).toFixed(0)}%`;
  return (
    <text
      x={x + width / 2}
      y={y}
      dy={-4}
      fill="#666"
      fontSize={10}
      textAnchor="middle"
    >
      {percentValue}
    </text>
  );
};

export function TtkDistributionChart({ ttkData = [] }) {
  const isEmpty = !ttkData || ttkData.length === 0;
  const yAxisMax = isEmpty ? 1 : Math.max(...ttkData.map((d) => d.probability)) * 1.2;
  const formatPercent = (tick) => `${(tick * 100).toFixed(0)}%`;

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={ttkData} margin={{ top: 23, right: 20, left: 0, bottom: 25 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="ttk" interval={0} label={{ value: '击杀期望TTK (ms)', position: 'insideBottom', dy: 15 }} />
        <YAxis tickFormatter={formatPercent} domain={[0, yAxisMax]} width={40} />

        {!isEmpty && (
          <Bar dataKey="probability" fill="#27ae60" animationDuration={500}>
            <LabelList content={renderCustomBarLabel} />
          </Bar>
        )}

        {isEmpty && (
          <text x="43%" y="45%" fill="#999" fontSize="1em" fontFamily="inherit">
            请先运行模拟
          </text>
        )}
      </BarChart>
    </ResponsiveContainer>
  );
}
