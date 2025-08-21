import React, { useMemo } from 'react';
import { ResponsiveContainer, BarChart, XAxis, YAxis, Bar, CartesianGrid, LabelList } from 'recharts';

const renderCustomBarLabel = ({ x, y, width, value }) => {
  // x, y, width 是 recharts 自动传给我们的、这个柱子的几何信息
  // value 是这个柱子的原始数值 (e.g., 0.253)

  const percentValue = `${(value * 100).toFixed(0)}%`; // 格式化为百分比字符串

  return (
    // 我们用一个 <text> SVG元素来渲染标签
    <text 
      x={x + width / 2} // 水平位置：柱子的中点
      y={y}             // 垂直位置：柱子的顶端
      dy={-4}           // 垂直微调：在顶端的基础上，再往上移4个像素
      fill="#666" 
      fontSize={10} 
      textAnchor="middle"
    >
      {percentValue}
    </text>
  );
};

export function BtkDistributionChart({ btkData }) {
    
    // ▼▼▼ 核心修正区：我们将 useMemo 的职责【最小化】▼▼▼
    
    // 1. 第一个 useMemo：只负责【数据解析和排序】
    const chartData = useMemo(() => {
        if (!btkData) return [];
        try {
            const parsedData = JSON.parse(btkData);
            return Array.isArray(parsedData) ? parsedData.sort((a, b) => a.btk - b.btk) : [];
        } catch (e) {
            return [];
        }
    }, [btkData]);

    // 2. 第二个 useMemo：只负责【期望值计算】
    const expectedBtk = useMemo(() => {
        if (!chartData || chartData.length === 0) return null;
        const eBtk = chartData.reduce((sum, item) => sum + (item.btk * item.probability), 0);
        return eBtk.toFixed(2);
    }, [chartData]);

    // ▲▲▲ 修正结束 ▲▲▲

    // 3. 将简单的【视图逻辑】，直接放在渲染主体中
    const isEmpty = chartData.length === 0;
    const formatPercent = (tick) => `${(tick * 100).toFixed(0)}%`;
    const yAxisMax = isEmpty ? 1 : Math.max(...chartData.map(d => d.probability)) * 1.2;

    return (
        <ResponsiveContainer width="100%" height={180}>
            <BarChart 
                data={chartData} 
                margin={{ top: 23, right: 20, left: 0, bottom: 25 }}
            >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                    dataKey="btk" 
                    interval={0}
                    label={{ 
                        value: `击杀期望枪数 (EBTK): ${isEmpty ? 'N/A' : expectedBtk}`, 
                        // ...
                    position:'insideBottom',
                    dy:15
                    }} 
                />
                <YAxis 
                    tickFormatter={formatPercent}
                    domain={[0, yAxisMax]}
                    width={40}
                />
                
                {!isEmpty && (
                    <Bar dataKey="probability" fill="#3498db" animationDuration={500}>
                        <LabelList content={renderCustomBarLabel} />
                    </Bar>
                )}

                {isEmpty && (
                    <text 
                        x="44%" y="45%" 
                        fill="#999" 
                        fontSize="1em" 
                        fontFamily="inherit"
                    >
                        请选择弹药
                    </text>
                )}
            </BarChart>
        </ResponsiveContainer>
    );
}