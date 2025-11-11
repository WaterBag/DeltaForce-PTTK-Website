/**
 * @file 伤害计算引擎 - 武器伤害模拟核心模块
 * @description 根据武器、弹药、护甲、距离和命中部位，精确计算单次命中的伤害和效果。
 *              该文件严格遵循 python 版 caculate.py 的核心逻辑，并适配项目中的弹药数据格式。
 *              实现了复杂的护甲穿透、伤害衰减、部位伤害倍率等游戏机制。
 */

/**
 * 根据武器和距离获取伤害衰减系数 - 距离衰减计算
 * 根据武器配置的距离分段和对应的衰减系数，确定当前距离下的伤害衰减比例
 *
 * @param {Object} gun - 最终武器属性对象 (configuredWeapon)，包含距离分段和衰减系数
 * @param {number} distance - 交战距离 (米)
 * @returns {number} 伤害衰减系数 (例如: 1.0, 0.9)，表示伤害保留比例
 */
function getDecay(gun, distance) {
  if (!gun) return 1.0;
  if (distance <= gun.range1) return gun.decay1;
  if (distance <= gun.range2) return gun.decay2;
  if (distance <= gun.range3) return gun.decay3;
  if (distance <= gun.range4) return gun.decay4;
  return gun.decay5;
}

/**
 * 命中部位翻译字典 - 将英文部位标识符转换为中文显示名称
 * 用于生成用户友好的命中日志信息
 */
const hitSiteTranslations = {
  head: '头部',
  chest: '胸部',
  abdomen: '腹部',
  upperArm: '上臂',
  lowerArm: '下臂',
  thigh: '大腿',
  calf: '小腿',
};

/**
 * 专门处理 PD12 双头弹的计算函数 (已正确处理无甲及零耐久情况)
 */
function calculatePD12Damage(
  gun,
  ammo,
  helmet,
  armor,
  currentHelmetDurability,
  currentArmorDurability,
  hitSite,
  distance
) {
  const decay = getDecay(gun, distance);

  // 1. 计算理论肉体伤害基数，以备后用
  let partMultiplier = 1.0;
  switch (hitSite) {
  case 'head':
    partMultiplier = gun.headMultiplier;
    break;
  case 'chest':
    partMultiplier = gun.chestMultiplier;
    break;
  case 'abdomen':
    partMultiplier = gun.abdomenMultiplier;
    break;
  case 'upperArm':
    partMultiplier = gun.upperArmMultiplier;
    break;
  case 'lowerArm':
    partMultiplier = gun.lowerArmMultiplier;
    break;
  case 'thigh':
    partMultiplier = gun.thighMultiplier;
    break;
  case 'calf':
    partMultiplier = gun.calfMultiplier;
    break;
  }
  const trueDamage = 37 * 2 * partMultiplier;

  // 2. 确定生效的护甲和耐久
  const isHeadshot = hitSite === 'head';
  const targetArmorPiece = isHeadshot ? helmet : armor;
  let currentDurability = isHeadshot ? currentHelmetDurability : currentArmorDurability;
  const armorLevel = targetArmorPiece?.level || 0;

  // 3. 【关键】进行精确的部位防护检查
  let isProtected = false;
  if (targetArmorPiece && currentDurability > 0) {
    if (isHeadshot) isProtected = true;
    else if (hitSite === 'chest' && armor.chest) isProtected = true;
    else if (hitSite === 'abdomen' && armor.abdomen) isProtected = true;
    else if (hitSite === 'upperArm' && armor.upperArm) isProtected = true;
  }

  // 4. 根据是否受保护，执行完全不同的逻辑分支
  if (!isProtected) {
    // 分支 A: 命中部位未受保护 -> 造成纯肉体伤害，不伤甲
    const finalHealthDamage = trueDamage * decay;
    return {
      healthDamage: finalHealthDamage,
      newHelmetDurability: currentHelmetDurability, // 护甲耐久不变
      newArmorDurability: currentArmorDurability, // 护甲耐久不变
      logMessage: `命中未受保护的 ${hitSiteTranslations[hitSite] || hitSite}，造成 ${finalHealthDamage.toFixed(1)} [双头弹]伤害。`,
    };
  } else {
    // 分支 B: 命中部位受保护 -> 执行双头弹特殊的钝伤和固定甲伤逻辑

    // a. 计算钝伤系数
    let bluntInjury = 1.0;
    if (armorLevel === 3) bluntInjury = 0.75;
    else if (armorLevel === 4) bluntInjury = 0.5;
    else if (armorLevel === 5) bluntInjury = 0.4;
    else if (armorLevel === 6) bluntInjury = 0.3;

    // b. 甲伤固定为11
    const armorDamage = 11;

    // c. 计算最终伤害
    let finalHealthDamage = 0;
    let logMessage = '';

    if (armorDamage >= currentDurability) {
      finalHealthDamage = trueDamage * bluntInjury * decay;
      logMessage = `命中 ${hitSiteTranslations[hitSite] || hitSite}，击破了护甲 (${targetArmorPiece.name})，造成了最后的 ${finalHealthDamage.toFixed(1)} [双头弹]钝伤。`;
      currentDurability = 0;
    } else {
      currentDurability -= armorDamage;
      finalHealthDamage = trueDamage * bluntInjury * decay;
      logMessage = `命中 ${hitSiteTranslations[hitSite] || hitSite}，造成 ${finalHealthDamage.toFixed(1)} [双头弹]钝伤，护甲 (${targetArmorPiece.name}) 损失了 ${armorDamage} 耐久。`;
    }

    return {
      healthDamage: finalHealthDamage,
      // 根据命中部位更新正确的耐久
      newHelmetDurability: isHeadshot ? currentDurability : currentHelmetDurability,
      newArmorDurability: !isHeadshot ? currentDurability : currentArmorDurability,
      logMessage: logMessage,
    };
  }
}

/**
 * 伤害计算引擎核心函数 - 单次命中伤害模拟
 * 实现复杂的护甲穿透、伤害衰减、部位伤害倍率等游戏机制
 * 根据武器、弹药、护甲配置精确计算单次命中造成的伤害和护甲耐久度变化
 *
 * @param {Object} gun - 最终武器属性对象，包含伤害、射速、距离衰减等属性
 * @param {Object} ammo - 选中的弹药对象，包含穿透力、护甲伤害系数、肉体伤害系数等属性
 * @param {Object} helmet - 选中的头盔对象，包含防护等级、耐久度等属性
 * @param {Object} armor - 选中的护甲对象，包含防护等级、耐久度、部位覆盖等属性
 * @param {number} currentHelmetDurability - 当前头盔耐久度
 * @param {number} currentArmorDurability - 当前护甲耐久度
 * @param {string} hitSite - 命中部位标识符 ('head', 'chest', 'abdomen', 'upperArm', 'lowerArm', 'thigh', 'calf')
 * @param {number} distance - 交战距离 (米)
 * @returns {Object} 包含详细计算结果的对象，包括：
 *   - healthDamage: 最终造成的血量伤害
 *   - newHelmetDurability: 命中后的头盔耐久度
 *   - newArmorDurability: 命中后的护甲耐久度
 *   - logMessage: 用户友好的命中日志信息
 */
export function calculateSingleHit(
  gun,
  ammo,
  helmet,
  armor,
  currentHelmetDurability,
  currentArmorDurability,
  hitSite,
  distance
) {
  if (ammo?.name === 'PD12双头弹') {
    // 直接调用新的、逻辑正确的双头弹计算函数
    return calculatePD12Damage(
      gun,
      ammo,
      helmet,
      armor,
      currentHelmetDurability,
      currentArmorDurability,
      hitSite,
      distance
    );
  }

  // ==========================================================================
  // 第一步：准备阶段 - 确定基础数值
  // ==========================================================================

  // 1.1: 确定命中部位的基础信息和生效的护甲/耐久。
  //      头部命中使用头盔防护，其他部位使用护甲防护
  const isHeadshot = hitSite === 'head';
  const targetArmorPiece = isHeadshot ? helmet : armor;
  let currentDurability = isHeadshot ? currentHelmetDurability : currentArmorDurability;
  const armorLevel = targetArmorPiece?.level || 0;

  // 1.2: 确定部位伤害倍率。
  //      不同身体部位有不同的伤害倍率，影响最终伤害计算
  let partMultiplier = 1.0;
  switch (hitSite) {
  case 'head':
    partMultiplier = gun.headMultiplier;
    break; // 头部伤害倍率
  case 'abdomen':
    partMultiplier = gun.abdomenMultiplier;
    break; // 腹部伤害倍率
  case 'upperArm':
    partMultiplier = gun.upperArmMultiplier;
    break; // 上臂伤害倍率
  case 'lowerArm':
    partMultiplier = gun.lowerArmMultiplier;
    break; // 下臂伤害倍率
  case 'thigh':
    partMultiplier = gun.thighMultiplier;
    break; // 大腿伤害倍率
  case 'calf':
    partMultiplier = gun.calfMultiplier;
    break; // 小腿伤害倍率
  default:
    partMultiplier = 1.0; // 胸部默认1.0倍率
  }

  // 1.3: 计算"裸伤" (trueDamage)。
  //      基础伤害 = 武器伤害 × 部位倍率 × 弹药肉体伤害系数
  //      ▼▼▼ 【核心修正】使用 `fleshDamageCoeff` ▼▼▼
  const trueDamage = gun.damage * partMultiplier * (ammo?.fleshDamageCoeff || 1);

  // 1.4: 获取距离衰减系数，供后续步骤使用。
  //      根据交战距离确定伤害衰减比例
  const decay = getDecay(gun, distance);

  // ==========================================================================
  // 第二步：核心判定 - 计算穿透系数 (penetrateRate)
  // ==========================================================================

  let penetrateRate = 0;
  if (armorLevel > 0 && currentDurability > 0) {
    // ▼▼▼ 【核心修正】使用 `penetration`, `secondaryPenetration`, `sameLevelPenetration` ▼▼▼
    // 穿透判定逻辑：
    // 1. 弹药穿透力 > 护甲等级+1: 100%穿透
    // 2. 弹药穿透力 = 护甲等级+1: 使用次级穿透率
    // 3. 弹药穿透力 = 护甲等级: 使用同级穿透率
    if (ammo.penetration > armorLevel + 1) {
      penetrateRate = 1.0; // 完全穿透
    } else if (ammo.penetration === armorLevel + 1) {
      penetrateRate = ammo.secondaryPenetration; // 次级穿透率
    } else if (ammo.penetration === armorLevel) {
      penetrateRate = ammo.sameLevelPenetration; // 同级穿透率
    }
  } else {
    penetrateRate = 1.0; // 无护甲或护甲耐久为0时，100%穿透
  }

  // ==========================================================================
  // 第三步：护甲伤害计算 - 判断是否击破
  // ==========================================================================

  // 3.1: 精确判断护甲是否覆盖该部位。
  //      根据护甲配置和命中部位确定是否受到保护
  let isProtected = false;
  if (targetArmorPiece && currentDurability > 0) {
    if (isHeadshot)
      isProtected = true; // 头部总是受头盔保护
    else if (hitSite === 'chest' && armor.chest)
      isProtected = true; // 胸部保护
    else if (hitSite === 'abdomen' && armor.abdomen)
      isProtected = true; // 腹部保护
    else if (hitSite === 'upperArm' && armor.upperArm) isProtected = true; // 上臂保护
  }

  // 3.2: 如果未受保护，直接计算最终伤害并返回。
  //      命中未受保护部位时，直接造成全额伤害
  if (!isProtected) {
    const finalHealthDamage = trueDamage * decay;
    return {
      healthDamage: finalHealthDamage,
      newHelmetDurability: currentHelmetDurability,
      newArmorDurability: currentArmorDurability,
      logMessage: `命中未受保护的 ${hitSiteTranslations[hitSite] || hitSite}，造成 ${finalHealthDamage.toFixed(1)} 伤害。`,
    };
  }

  // 3.3: 如果受保护，计算理论护甲伤害 (armorDamage)。
  //      根据护甲等级动态获取对应的护甲伤害系数
  //      ▼▼▼ 【核心修正】使用 `armor1` 到 `armor6` 属性动态获取护甲伤害系数 ▼▼▼
  const armorDamageCoeff = ammo[`armor${armorLevel}`] || 1;
  const armorDamage = gun.armorDamage * armorDamageCoeff * decay;

  // ==========================================================================
  // 第四步：最终伤害计算 - 根据情况 A, B, C
  // ==========================================================================

  let finalHealthDamage = 0;
  let armorDamageTaken = armorDamage;
  let logMessage = '';

  // 情况A: 护甲被当场击破 (armorDamage >= currentDurability)
  //        护甲无法完全吸收伤害，部分伤害穿透护甲
  if (armorDamage >= currentDurability) {
    const damageReductionRatio = currentDurability / armorDamage; // 护甲吸收伤害的比例
    const directDamage = trueDamage * (1 - damageReductionRatio); // 直接穿透的伤害
    const bluntDamage = trueDamage * damageReductionRatio * penetrateRate; // 钝伤部分
    finalHealthDamage = (directDamage + bluntDamage) * decay; // 最终伤害 = (直接伤害 + 钝伤) × 距离衰减
    logMessage = `命中 ${hitSiteTranslations[hitSite] || hitSite}，击破了护甲 (${targetArmorPiece.name})，造成 ${finalHealthDamage.toFixed(1)} 混合伤害。护甲损失 ${currentDurability.toFixed(1)} 耐久。`;
    currentDurability = 0; // 护甲耐久归零

    // 情况B: 护甲未被击破 (currentDurability > armorDamage)
    //        护甲完全吸收伤害，只造成穿透伤害
  } else {
    finalHealthDamage = trueDamage * penetrateRate * decay; // 最终伤害 = 裸伤 × 穿透率 × 距离衰减
    currentDurability -= armorDamage; // 减少护甲耐久
    logMessage = `命中 ${hitSiteTranslations[hitSite] || hitSite}，造成 ${finalHealthDamage.toFixed(1)} 穿透伤害。护甲 (${targetArmorPiece.name}) 抵挡了 ${(trueDamage * decay - finalHealthDamage).toFixed(1)} 伤害，损失 ${armorDamageTaken.toFixed(1)} 耐久。`;
  }

  // ==========================================================================
  // 第五步：返回最终结果
  // ==========================================================================

  return {
    healthDamage: finalHealthDamage,
    newHelmetDurability: isHeadshot ? currentDurability : currentHelmetDurability,
    newArmorDurability: !isHeadshot ? currentDurability : currentArmorDurability,
    logMessage: logMessage,
  };
}
