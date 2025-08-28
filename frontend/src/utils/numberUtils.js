/**
 * 生成耐久度值数组工具函数
 * 根据最大值和最小值，生成一个指定步长的离散数值数组
 * 主要用于生成护甲和头盔的耐久度选项
 * 
 * @param {number} max - 最大值，必须包含在结果中
 * @param {number} [min=35] - 最小值，默认35
 * @param {number} [step=5] - 步长，默认5
 * @returns {number[]} - 返回一个升序排列的合法耐久度值数组
 * @example
 * generateDurabilityValues(100, 35, 5) // 返回 [35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100]
 */
export function generateDurabilityValues(max, min = 35, step = 5) {
  // 参数验证
  if (max < min) {
    throw new Error('最大值不能小于最小值');
  }
  
  const values = new Set(); // 使用 Set 自动处理重复值
  
  values.add(max); // 永远包含最大值

  // 从最大值向下生成，直到达到最小值
  let current = Math.floor(max / step) * step;
  while (current >= min) {
    values.add(current);
    current -= step;
  }
  
  // 转换回数组并升序排列
  return Array.from(values).sort((a, b) => a - b);
}
