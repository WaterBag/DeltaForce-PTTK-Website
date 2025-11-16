import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import './RangeDecayChartFull.css';

/**
 * 射程衰减完整尺寸折线图组件
 * 用于展开面板中显示，尺寸更大，细节更丰富
 * @param {Object} props - 组件属性
 * @param {Object} props.weapon - 武器数据对象
 * @param {number} props.rangeModifier - 射程修正值（如0.3表示+30%）
 * @returns {JSX.Element} 射程衰减图组件
 */
export function RangeDecayChartFull({ weapon, rangeModifier = 0 }) {
  // 构建图表数据 - 阶梯状衰减
  const chartData = React.useMemo(() => {
    if (!weapon) return [];

    const data = [];
    
    // 收集所有有效的射程段，应用rangeModifier
    const ranges = [
      { range: weapon.range1, decay: weapon.decay1 },
      { range: weapon.range2, decay: weapon.decay2 },
      { range: weapon.range3, decay: weapon.decay3 },
      { range: weapon.range4, decay: weapon.decay4 },
      { range: weapon.range5, decay: weapon.decay5 },
    ]
      .filter(item => item.range > 0) // 过滤掉range为0的无效段
      .map(item => ({
        // 应用射程修正，超过500或999（无限远）都显示为无限
        range: (item.range >= 500 || item.range === 999) ? 999 : Math.round(item.range * (1 + rangeModifier)),
        decay: item.decay
      }));
    
    // 第一段：从0开始，伤害100%
    data.push({ distance: 0, decay: 100 });
    
    // 为每个射程段添加数据点
    ranges.forEach((item, index) => {
      if (item.range === 999) {
        // 999表示无限远，使用特殊标记
        data.push({ distance: '∞', decay: item.decay * 100 });
      } else {
        // 在射程点处，伤害变为该段的衰减值
        data.push({ distance: item.range, decay: item.decay * 100 });
      }
    });
    
    return data;
  }, [weapon, rangeModifier]);

  if (!weapon) return null;

  return (
    <div className="range-decay-chart-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 10, right: 20, bottom: 15, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis 
            dataKey="distance" 
            stroke="#666"
            tick={{ fill: '#666', fontSize: 13 }}
            label={{ value: '距离(m)', position: 'insideBottom', offset: -5, fill: '#555', fontSize: 13, fontWeight: 500 }}
          />
          <YAxis 
            stroke="#666"
            tick={{ fill: '#666', fontSize: 13 }}
            domain={[0, 100]}
            width={50}
            label={{ value: '伤害%', angle: -90, position: 'insideLeft', fill: '#555', fontSize: 13, fontWeight: 500 }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#ffffff', 
              border: '1px solid #ddd',
              borderRadius: '6px',
              fontSize: '13px',
              padding: '8px 12px',
              boxShadow: '0 3px 12px rgba(0,0,0,0.15)'
            }}
            labelStyle={{ color: '#4a9eff', fontWeight: '600', marginBottom: '4px' }}
            itemStyle={{ color: '#333' }}
            formatter={(value) => [`${value.toFixed(1)}%`, '伤害']}
            labelFormatter={(label) => label === '∞' ? '距离: ∞' : `距离: ${label}m`}
          />
          <Line 
            type="stepBefore"
            dataKey="decay" 
            stroke="#4a9eff" 
            strokeWidth={3}
            dot={false}
            activeDot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
