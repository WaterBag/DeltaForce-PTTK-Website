import { API_BASE_URL } from './config';

/**
 * 根据护甲和头盔配置获取可用枪械列表
 * @param {Object} params - 配置参数对象
 * @param {number} params.helmetLevel - 头盔防护等级
 * @param {number} params.armorLevel - 护甲防护等级  
 * @param {number} params.helmetDurability - 头盔耐久度值
 * @param {number} params.armorDurability - 护甲耐久度值
 * @param {number} params.chestProtection - 胸部防护值
 * @param {number} params.stomachProtection - 腹部防护值
 * @param {number} params.armProtection - 手臂防护值
 * @returns {Promise<string[]>} 可用枪械名称数组
 * @throws {Error} 当必需参数缺失或请求失败时抛出错误
 */
export async function fetchAvailableGuns({
  helmetLevel,
  armorLevel,
  helmetDurability,
  armorDurability,
  chestProtection,
  stomachProtection,
  armProtection
}) {
  // 验证必需参数
  if (
    helmetLevel == null || armorLevel == null ||
    helmetDurability == null || armorDurability == null
  ) {
    throw new Error("fetchAvailableGuns 参数不完整");
  }
  
  const response = await fetch(`${API_BASE_URL}/api/ttk/available-guns`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      helmetLevel,
      armorLevel,
      helmetDurability,
      armorDurability,
      chestProtection,
      stomachProtection,
      armProtection
    })
  });

  if (!response.ok) {
    throw new Error(`请求可用枪械失败: ${response.status}`);
  }

  return await response.json();
}

/**
 * 获取指定枪械的详细数据
 * @param {Object} params - 配置参数对象
 * @param {string} params.gunName - 枪械名称
 * @param {number} params.helmetLevel - 头盔防护等级
 * @param {number} params.armorLevel - 护甲防护等级
 * @param {number} params.helmetDurability - 头盔耐久度值
 * @param {number} params.armorDurability - 护甲耐久度值
 * @param {number} params.chestProtection - 胸部防护值
 * @param {number} params.stomachProtection - 腹部防护值
 * @param {number} params.armProtection - 手臂防护值
 * @returns {Promise<Object>} 枪械详细数据对象
 * @throws {Error} 当必需参数缺失或请求失败时抛出错误
 */
export async function fetchGunDetails({
  gunName,
  helmetLevel,
  armorLevel,
  helmetDurability,
  armorDurability,
  chestProtection,
  stomachProtection,
  armProtection
}) {
  // 验证必需参数
  if (!gunName ||
    helmetLevel == null || armorLevel == null ||
    helmetDurability == null || armorDurability == null
  ) {
    throw new Error("fetchGunDetails 参数不完整");
  }
  
  const response = await fetch(`${API_BASE_URL}/api/ttk/gun-details`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      gunName,
      helmetLevel,
      armorLevel,
      helmetDurability,
      armorDurability,
      chestProtection,
      stomachProtection,
      armProtection
    })
  });

  if (!response.ok) {
    throw new Error(`请求枪械详情失败: ${response.status}`);
  }

  return await response.json();
}

