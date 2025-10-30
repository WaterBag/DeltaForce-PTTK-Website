import React, { useEffect, useState } from 'react';
import './TtkChart.css'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

/**
 * 图表颜色配置数组
 * 用于为不同的TTK曲线分配不同的颜色，确保视觉区分度
 */
export const COLORS = [
  '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', 
  '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf',
  '#aec7e8', '#ffbb78', '#98df8a', '#ff9896', '#c5b0d5'
];

/**
 * 自定义工具提示组件
 * 显示鼠标悬停时的详细TTK信息，包括距离和各武器的TTK值
 * 
 * @param {Object} props - 组件属性
 * @param {boolean} props.active - 是否激活显示工具提示
 * @param {Array} props.payload - 包含所有曲线数据的数组
 * @param {number} props.label - 当前悬停点的X轴值（距离）
 * @returns {JSX.Element|null} 自定义工具提示组件或null
 */
const CustomTooltip = ({ active, payload, label }) => {
  // 只有在鼠标悬停且有数据时才渲染
  if (active && payload && payload.length) {
    // 按TTK值从小到大排序，便于阅读
    const sortedPayload = [...payload].sort((a, b) => a.value - b.value);

    return (
      <div className="custom-tooltip">
        <p className="tooltip-label">{`距离: ${label} m`}</p>
        <ul className="tooltip-list">
          {sortedPayload.map((entry, index) => {
            //解析武器名和配件
            const name = entry.name;
            const attachmentIndex = name.indexOf('(');

            const weaponName = attachmentIndex > -1 ? name.substring(0, attachmentIndex).trim() : name;
            const attachments = attachmentIndex > -1 ? name.substring(attachmentIndex) : null;

            return (
              <li key={`item-${index}`} className="tooltip-list-item">
                <span className="tooltip-color-indicator" style={{ backgroundColor: entry.color }} />
                <div className="tooltip-name-container">
                  <span className="tooltip-name">{weaponName}:</span>
                  {attachments && <span className="tooltip-attachments">{attachments}</span>}
                </div>
                <span className="tooltip-value" style={{ color: entry.color }}>
                  {Math.round(entry.value)} ms
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  // 如果鼠标没悬停，就什么也不渲染
  return null;
};


/**
 * TTK图表组件 - 显示武器TTK对比曲线
 * 使用Recharts库绘制时间到击杀（TTK）的折线图，支持多武器对比
 * 
 * @param {Object} props - 组件属性
 * @param {Array} props.data - 图表数据数组，包含各武器的TTK数据
 * @returns {JSX.Element} TTK图表组件
 */
export function TtkChart({ data }) {
    // 响应式状态管理 - 检测是否为移动设备
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

    /**
     * 监听窗口大小变化，更新响应式状态
     * 用于在不同屏幕尺寸下调整图表布局和样式
     */
    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768);
        };

        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    // 数据处理：将线性数据转换为Recharts所需的格式
    let chartPoints = [];
    const isEmpty = !data || data.length === 0;

    if (!isEmpty) {
        // 格式化数据：将每条线的数据按距离合并
        const formattedData = {};
        data.forEach(line => {
            line.data.forEach(point => {
                if (!formattedData[point.distance]) {
                    formattedData[point.distance] = { distance: point.distance };
                }
                formattedData[point.distance][line.name] = point.pttk;
            });
        });
        // 按距离排序并转换为数组
        chartPoints = Object.values(formattedData).sort((a, b) => a.distance - b.distance);
    }
    
    return (
        <ResponsiveContainer width="100%" height="100%">
            <LineChart 
                data={chartPoints} 
                margin={isMobile ? { top: 10, right: 10, left: 0, bottom: 40 } : { top: 20, right: 30, left: 0, bottom: 60 }}
            >
                {/* 图表网格线 */}
                <CartesianGrid strokeDasharray="3 3" />
                
                {/* X轴 - 距离轴 */}
                <XAxis 
                    dataKey="distance" 
                    type="number" 
                    stroke='#5e6c84'
                    tick={{fontSize: isMobile ? 10 : 12}}
                    label={{ value: "距离 (米)", position: 'insideBottom', offset: 0, fill:'#5e6c84', fontSize: isMobile ? 10 : 12}} 
                    domain={isEmpty ? [0, 100] : ['dataMin', 'dataMax']} // 为空时定义默认范围
                />
                
                {/* Y轴 - TTK轴 */}
                <YAxis 
                  stroke='#5e6c84'
                  tick={{fontSize: isMobile ? 10 : 12}}
                  label={{ value: "TTK (毫秒)", angle: -90, position: 'insideLeft', offset: 25, fill:'#5e6c84', fontSize: isMobile ? 10 : 12 }}
                  domain={isEmpty ? [0, 500] : [dataMin => Math.max(0, dataMin - 30), dataMax => dataMax + 30]} // 为空时定义默认范围
                  tickFormatter={(tick) => Math.round(tick)} // 格式化刻度值为整数
                />
                
                {/* 自定义工具提示 */}
                <Tooltip 
                    content={<CustomTooltip />}
                    cursor={{ stroke: '#0052cc', strokeWidth: 1, strokeDasharray: '3 3' }} // 悬停时的垂直虚线光标
                />
                
                {/* 图例 */}
                <Legend 
                    verticalAlign="bottom" 
                    height={isMobile ? 24 : 36} 
                    wrapperStyle={{ 
                        paddingTop: isMobile ? '10px' : '20px',
                        fontSize: isMobile ? '10px' : '12px'
                    }} 
                />
                
                {/* 绘制各武器的TTK曲线 */}
                {!isEmpty && data.map((line, index) => (
                    <Line 
                        key={line.id} 
                        type="monotone" 
                        dataKey={line.name} 
                        stroke={line.color} 
                        strokeWidth={2.5} 
                        dot={false} 
                        activeDot={{ r: 5, strokeWidth: 2 }} // 激活点的样式
                    />
                ))}

                {/* 空状态提示 */}
                {isEmpty && (
                    <text x="53%" y="43%" textAnchor="middle" dominantBaseline="middle" fill="#999" fontSize="1.2em">
                        请先添加武器配置以进行对比
                    </text>
                )}
            </LineChart>
        </ResponsiveContainer>
    );
}
