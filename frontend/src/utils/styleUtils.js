/**
 * 获取稀有度对应的CSS类名
 * 根据物品的稀有度等级返回相应的CSS类名，用于样式化显示
 * @param {string} rarity - 稀有度字符串，支持'红'、'橙'、'紫'、'蓝'、'绿'、'白'
 * @returns {string} 对应的CSS类名，如果稀有度不匹配则返回空字符串
 */
export const getRarityClass = (rarity) => {
    switch(rarity){
      case '红': return 'rarity-red';      // 红色稀有度
      case '橙': return 'rarity-orange';   // 橙色稀有度
      case '紫': return 'rarity-purple';   // 紫色稀有度
      case '蓝': return 'rarity-blue';     // 蓝色稀有度
      case '绿': return 'rarity-green';    // 绿色稀有度
      case '白': return 'rarity-white';    // 白色稀有度
      default: return '';                  // 未知稀有度，返回空字符串
    }
  }

/**
 * 获取防护等级对应的CSS类名
 * 根据物品的防护等级返回相应的CSS类名，用于样式化显示
 * @param {number} level - 防护等级，0-6
 * @returns {string} 对应的CSS类名，如果等级不匹配则返回空字符串
 */
export const getProtectionLevelClass = (level) => {
    switch(level){
      case 0: return 'level-0';      // 无防护
      case 1: return 'level-1';      // 1级防护
      case 2: return 'level-2';      // 2级防护
      case 3: return 'level-3';      // 3级防护
      case 4: return 'level-4';      // 4级防护
      case 5: return 'level-5';      // 5级防护
      case 6: return 'level-6';      // 6级防护
      default: return '';            // 未知等级，返回空字符串
    }
  }
