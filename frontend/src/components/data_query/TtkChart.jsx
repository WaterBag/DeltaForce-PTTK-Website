import React from 'react';

import './TtkChart.css'

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

export const COLORS = [
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

    const sortedPayload = [...payload].sort((a, b) => a.value - b.value);

    return (
      <div className="custom-tooltip">
        <p className="tooltip-label">{`距离: ${label} m`}</p>
        <ul className="tooltip-list">
          {sortedPayload.map((entry, index) => (
            <li key={`item-${index}`} className="tooltip-list-item">
              <span className="tooltip-color-indicator" style={{ backgroundColor: entry.color }} />
              <span className="tooltip-name">{entry.name}:</span>
              <span className="tooltip-value" style={{ color: entry.color }}>
                {Math.round(entry.value)} ms
              </span>
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

    let chartPoints = [];
    const isEmpty = !data || data.length === 0;

    if (!isEmpty) {
        const formattedData = {};
        data.forEach(line => {
            line.data.forEach(point => {
                if (!formattedData[point.distance]) {
                    formattedData[point.distance] = { distance: point.distance };
                }
                formattedData[point.distance][line.name] = point.pttk;
            });
        });
        chartPoints = Object.values(formattedData).sort((a, b) => a.distance - b.distance);
    }
    
    return (
        <ResponsiveContainer width="100%" height="80%">
            <LineChart 
                data={chartPoints} 
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                    dataKey="distance" 
                    type="number" 
                    stroke='#5e6c84'
                    tick={{fontSize:12}}
                    label={{ value: "距离 (米)", position: 'insideBottom', offset: 0 ,fill:'#5e6c84'}} 
                    domain={isEmpty ? [0, 100] : ['dataMin', 'dataMax']}// 为空时，定义一个 0-100m 的默认范围
                />
                <YAxis 
                  stroke='#5e6c84'
                  tick={{fontSize:12}}
                  label={{ value: "TTK (毫秒)", angle: -90, position: 'insideLeft' ,fill:'#5e6c84' }}
                  domain={isEmpty ? [0, 500] : [dataMin => Math.max(0, dataMin - 30), dataMax => dataMax + 30]}// 为空时，定义一个 0-500ms 的默认范围
                  tickFormatter={(tick) => Math.round(tick)}
                />
                <Tooltip 
                    content={<CustomTooltip />}
                    cursor={{ stroke: '#0052cc', strokeWidth: 1, strokeDasharray: '3 3' }}// 当悬停时，显示一条垂直的虚线光标
                />
                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ paddingTop: '20px' }} />
                
                {!isEmpty && data.map((line, index) => (
                    <Line 
                        key={line.id} 
                        type="monotone" 
                        dataKey={line.name} 
                        stroke={line.color} 
                        strokeWidth={2.5} 
                        dot={false} 
                        activeDot={{ r: 5, strokeWidth: 2 }} 
                    />
                ))}

                {isEmpty && (
                    <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" fill="#999" fontSize="1.2em">
                        请先添加武器配置以进行对比
                    </text>
                )}
            </LineChart>
        </ResponsiveContainer>
    );
}