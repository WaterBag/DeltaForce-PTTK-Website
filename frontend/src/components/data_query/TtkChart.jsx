import React from 'react';

import './TtkChart.css'

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const COLORS = [
  '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', 
  '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf',
  '#aec7e8', '#ffbb78', '#98df8a', '#ff9896', '#c5b0d5'
];

const CustomTooltip = ({ active, payload, label }) => {
  // `active` 表示鼠标是否正悬停在图表上
  // `payload` 是一个数组，包含了当前悬停点上所有曲线的数据
  // `label` 是当前悬停点的X轴值（也就是距离）

  // 只有在鼠标悬停时才渲染
  if (active && payload && payload.length) {
    // 【核心排序逻辑】
    // 我们先创建一个 payload 的副本，然后用 sort 方法排序
    const sortedPayload = [...payload].sort((a, b) => a.value - b.value);

    return (
      <div className="custom-tooltip">
        <p className="label">{`距离 : ${label} m`}</p>
        <ul className="tooltip-list">
          {sortedPayload.map((entry, index) => (
            <li key={`item-${index}`} style={{ color: entry.color }}>
              {`${entry.name} : ${entry.value.toFixed(3)}s`}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  // 如果鼠标没悬停，就什么也不渲染
  return null;
};


export function TtkChart({ data }) {
    if (!data || data.length === 0) {
        return <div className="chart-placeholder"><p>请选择组合并点击“生成图表”</p></div>;
    }

    // 将数据格式化为Recharts需要的格式
    const formattedData = {};
    data.forEach(line => {
        line.data.forEach(point => {
            if (!formattedData[point.distance]) {
                formattedData[point.distance] = { distance: point.distance };
            }
            formattedData[point.distance][line.name] = point.pttk;
        });
    });
    const chartPoints = Object.values(formattedData).sort((a, b) => a.distance - b.distance);

    return (
        <ResponsiveContainer width="100%" height={500}>
            <LineChart data={chartPoints} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="distance" type="number" label={{ value: "距离 (米)", position: 'insideBottom', offset: -10 }} domain={['dataMin', 'dataMax']} />
                <YAxis 
                  label={{ value: "TTK (毫秒)", angle: -90, position: 'insideLeft' }}
                  domain={[
                    dataMin => Math.max(0, dataMin - 30), 
                    dataMax => dataMax + 30   
                  ]}
                  tickFormatter={(tick) => Math.round(tick)}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                {data.map((line, index) => (
                    <Line key={line.name} type="monotone" dataKey={line.name} stroke={COLORS[index % COLORS.length]} strokeWidth={2} dot={false} connectNulls />
                ))}
            </LineChart>
        </ResponsiveContainer>
    );
}