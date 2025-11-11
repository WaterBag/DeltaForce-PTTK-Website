import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Label,
} from 'recharts';
import './DamageDecayChart.css';

// 自定义工具提示，显示更友好的信息
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const displayDistance = typeof label === 'number' ? label.toFixed(2) : label;
    return (
      <div className="custom-decay-tooltip">
        <p>{`距离: ${displayDistance}m`}</p>
        <p>{`伤害倍率: ${(data.decay * 100).toFixed(0)}%`}</p>
      </div>
    );
  }
  return null;
};

/**
 * 武器伤害衰减图表组件 - 可视化武器伤害随距离变化曲线
 * 使用Recharts库绘制阶梯状衰减曲线，显示武器在不同距离下的伤害保留比例
 * 支持动态数据更新和空状态处理
 *
 * @param {Object} props - 组件属性
 * @param {Object|null} props.weaponData - 经过配件计算后的最终武器对象，包含距离分段和衰减系数
 * @returns {JSX.Element} 伤害衰减图表组件
 */
export function DamageDecayChart({ weaponData }) {
  const chartData = useMemo(() => {
    // 如果没有武器数据，直接返回空数组
    if (!weaponData) return [];

    const points = [];

    // 第一个数据点：在距离0时，伤害倍率是 decay1
    if (weaponData.decay1 !== undefined) {
      points.push({ distance: 0, decay: weaponData.decay1 });
    }

    // 定义并添加所有有效的阶跃点
    const segments = [
      { range: weaponData.range1, nextDecay: weaponData.decay2 },
      { range: weaponData.range2, nextDecay: weaponData.decay3 },
      { range: weaponData.range3, nextDecay: weaponData.decay4 },
      { range: weaponData.range4, nextDecay: weaponData.decay5 },
    ];

    segments.forEach(seg => {
      if (seg.range > 0 && seg.range < 999 && seg.nextDecay !== undefined) {
        points.push({ distance: seg.range, decay: seg.nextDecay });
      }
    });

    // ▼▼▼ 【核心修正区 1】▼▼▼
    // 如果存在数据点，就将最后一段线精确延长20米
    if (points.length > 0) {
      const lastPoint = points[points.length - 1];
      const endDistance = (lastPoint.distance + 20).toFixed(0);
      points.push({ distance: endDistance, decay: lastPoint.decay });
    }
    // ▲▲▲ 【修正区 1 结束】▲▲▲

    return points;
  }, [weaponData]);

  // 判断是否为空状态，用于条件渲染
  const isEmpty = !weaponData;

  const yAxisFormatter = tick => `${tick * 100}%`;

  return (
    <div className="decay-chart-container">
      <h4>伤害衰减曲线</h4>
      <ResponsiveContainer width="100%" height={150}>
        <LineChart
          data={chartData} // 当 isEmpty 为 true 时，这里会是一个空数组
          margin={{
            top: 5,
            right: 20,
            left: 10,
            bottom: 20,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="distance"
            type="number"
            // 为空时定义默认范围，确保坐标轴显示
            domain={isEmpty ? [0, 100] : [0, 'dataMax']}
          >
            <Label value="距离 (m)" offset={-15} position="insideBottom" />
          </XAxis>
          <YAxis
            // 默认范围，确保坐标轴显示
            domain={[0, 1]}
            tickFormatter={yAxisFormatter}
            width={40}
          />

          {/* 只有在不为空时才显示工具提示和曲线 */}
          {!isEmpty && (
            <>
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="stepAfter"
                dataKey="decay"
                stroke="#8884d8"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6 }}
              />
            </>
          )}

          {/* 仅在空状态时显示中心文字 */}
          {isEmpty && (
            <text
              x="50%"
              y="50%"
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#999"
              fontSize="1em"
            >
              请先选择枪械
            </text>
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
