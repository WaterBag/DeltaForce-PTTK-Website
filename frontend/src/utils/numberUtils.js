/**
 * 根据最大值和最小值，生成一个步长为5的离散【数值数组】
 * @returns {number[]} - 返回一个降序排列的合法耐久度值数组
 */
export function generateDurabilityValues(max, min = 35, step = 5) {
  const values = new Set(); // 使用 Set 自动处理重复
  
  values.add(max); // 永远包含最大值

  let current = Math.floor(max / step) * step;
  while (current >= min) {
    values.add(current);
    current -= step;
  }
  
  // 转换回数组并升序排列
  return Array.from(values).sort((a, b) => a - b);
}