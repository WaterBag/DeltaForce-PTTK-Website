/**
 * 数据处理工具模块
 * 负责处理武器数据、计算TTK、应用改装效果等核心业务逻辑
 */

import { COLORS } from '../components/data_query/TtkChart.jsx';

/**
 * 期望击杀时间计算器 - 计算基于概率的期望BTK
 * 
 * 公式：E(BTK) = Σ(BTK × probability)
 * 
 * 命中率调整：
 * - 当命中率 < 100% 时，需要打更多发子弹才能击杀
 * - 例：理论需要5发，80%命中率 → 期望需要 5 / 0.8 = 6.25 发
 * 
 * @param {string} btkDataJsonString - BTK数据的JSON字符串
 * @param {number} hitRate - 命中率 (0-1之间)，默认为1.0（100%命中）
 * @returns {number|null} 计算出的期望BTK值，如果计算失败返回null
 */
const EbtkCalculator = (btkDataJsonString, hitRate = 1.0) => {
  try {
    // btkData: [{btk, probability}] 概率分布数组
    const btkData = JSON.parse(btkDataJsonString);
    // baseEbtk: 理论期望发数（100% 命中）
    const baseEbtk = btkData.reduce((sum, current) => sum + current.btk * current.probability, 0);
    
    // 命中率调整：实际需要的发数 = 理论需要发数 / 命中率
    // adjustedEbtk: 考虑命中率后的期望发数（命中率越低，需要发数越高）
    const adjustedEbtk = baseEbtk / hitRate;
    
    return adjustedEbtk;
  } catch (error) {
    console.error('TTK计算器错误:', error);
    return null;
  }
};

// 将可能为对象映射的变体名解析为字符串
// 允许 effects.dataQueryName/btkQueryName 是：
// - 字符串：直接返回
// - 映射对象：{ 基础武器名: 变体名 }，按 baseGunName 取值
const resolveVariantName = (maybeMapOrString, baseGunName) => {
  // maybeMapOrString: 允许是 string 或 { [baseGunName]: variantName } 映射
  if (maybeMapOrString && typeof maybeMapOrString === 'object' && !Array.isArray(maybeMapOrString)) {
    return maybeMapOrString[baseGunName];
  }
  return maybeMapOrString;
};

/**
 * 辅助函数：根据武器信息和数据库最大距离，动态查找有效的射程终点
 * @param {object} weaponInfo - 单个武器的完整信息对象
 * @param {number} maxDbDistance - 从数据库返回的数据中，最大的那个距离值
 * @returns {number} - 计算出的这条曲线应该显示到的最大距离
 */
const findEffectiveRange = (weaponInfo, maxDbDistance) => {
  // 遍历武器的5个射程档位
  for (let i = 1; i <= 5; i++) {
    const rangeKey = `range${i}`;
    const currentRangeEnd = weaponInfo[rangeKey];

    // 如果这个档位的射程是0或者不存在，说明没有后续档位了，直接使用上一档的终点
    if (!currentRangeEnd) {
      // 如果 i=1 就没有，说明武器数据有问题，返回数据库最大距离
      if (i === 1) return maxDbDistance;
      // 否则返回上一个有效的射程终点
      return weaponInfo[`range${i - 1}`];
    }

    // 检查数据库最大距离是否落在这个射程区间内
    if (maxDbDistance < currentRangeEnd) {
      return currentRangeEnd; // 找到了！返回这个区间的上边界作为终点
    }
  }

  // 如果遍历完所有档位，数据库最大距离仍然比所有档位都大（比如range5不是999的情况）
  // 就返回最后一个有效的射程终点
  return weaponInfo.range5;
};

/**
 * 扩展阶梯数据函数 - 将稀疏的阶梯数据转换为密集的连续数据
 * 用于将只在关键距离点有数据的阶梯函数转换为每个距离点都有数据的连续函数
 * @param {Array} sparseData - 稀疏数据数组，包含{distance, pttk}对象
 * @param {number} maxRange - 最大射程距离
 * @returns {Array} 密集数据数组，包含0到maxRange每个距离点的pttk值
 */
const expandStepData = (sparseData, maxRange) => {
  if (!sparseData || sparseData.length === 0 || !maxRange) return [];
  const sortedData = [...sparseData].sort((a, b) => a.distance - b.distance);
  const denseData = [];
  let currentPttk = sortedData[0].pttk;
  for (let dist = 0; dist <= maxRange; dist++) {
    for (let i = sortedData.length - 1; i >= 0; i--) {
      if (dist >= sortedData[i].distance) {
        currentPttk = sortedData[i].pttk;
        break;
      }
    }
    denseData.push({ distance: dist, pttk: currentPttk });
  }
  return denseData;
};

/**
 * 处理图表数据主函数 - 处理比较线数据并应用各种效果
 * 负责计算武器改装效果、处理TTK数据、应用枪口初速和扳机延迟效果
 * @param {Array} comparisonLines - 比较线配置数组
 * @param {boolean} applyEffect - 是否应用枪口初速效果
 * @param {boolean} applyTriggerDelay - 是否应用扳机延迟效果
 * @returns {Array} 处理后的图表数据数组
 */
export const processChartData = (
  comparisonLines,
  applyEffect,
  applyTriggerDelay,
  weapons = [],
  allModifications = []
) => {
  if (!comparisonLines || comparisonLines.length === 0) {
    return [];
  }

  // 武器信息映射表 - 将武器名称映射到对应的武器信息对象
  // 用于快速查找武器属性，如射速、射程、枪口初速等
  const weaponInfoMap = weapons.reduce((acc, weapon) => {
    acc[weapon.name] = weapon;
    return acc;
  }, {});

  return comparisonLines
    .map((lineConfig, index) => {
      // --- 准备工作：获取所需信息 ---
      // gunName: 基础枪名（对比线的“基准武器名”）
      // bulletName: 子弹名
      // mods: 已选配件 id 列表
      // btkDataPoints: 后端返回的 BTK 数据点（按距离）
      // hitRate: 命中率（0-1）
      const { gunName, bulletName, mods, btkDataPoints, displayName, hitRate = 1.0 } = lineConfig;
      // weaponInfo: 基础武器信息（来自静态 weapons.js，用于射速/射程/初速等）
      const weaponInfo = weaponInfoMap[gunName];

      if (!weaponInfo) {
        console.error(
          `【严重错误】武器信息未找到! 数据库枪名: "${gunName}". 请检查 weapons.js 中是否存在完全匹配的 name。`
        );
        return { ...lineConfig, data: [] };
      }

      if (!lineConfig.btkDataPoints || lineConfig.btkDataPoints.length === 0) {
        console.warn(`  ⚠️ 警告: 曲线 "${lineConfig.name}" 从API接收到的原始数据为空，无法处理。`);
        return { ...lineConfig, data: [] };
      }

      if (!weaponInfo) return null;

      // --- 步骤 1: 确定基础伤害模型和射程模型 ---
      // 处理特殊配件（如不同口径转换套件）导致的伤害模型和射程模型变更

      // a. 查找是否有名为 "damageChange" 的特殊配件被选中
      //    这类配件会完全改变武器的伤害属性（如口径转换）
      // damageMod: 当前配置中第一个“改变伤害模板”的变体配件
      const damageMod = mods
        ?.map(modId => allModifications.find(m => m.id === modId)) // 将id数组转为配件对象数组
        ?.find(mod => mod?.effects?.damageChange === true); // 找到第一个带 damageChange 的配件

      // b. 查找是否有名为 "specialRange" 的特殊配件被选中
      //    这类配件会使用变体武器的射程数据
      // specialRangeMod: 当前配置中第一个“改变射程模板”的变体配件
      const specialRangeMod = mods
        ?.map(modId => allModifications.find(m => m.id === modId))
        ?.find(mod => mod?.effects?.specialRange === true);

      // c. 决定使用哪个武器作为"基础模板"
      //    默认使用用户选择的原始武器数据
      // baseWeaponProfile: 用于提供伤害/倍率等“伤害模板”的武器数据
      let baseWeaponProfile = weaponInfo;
      // rangeWeaponProfile: 用于提供 range/decay 等“射程模板”的武器数据
      let rangeWeaponProfile = weaponInfo;

      //    如果找到了特殊配件（如口径转换套件）...
      if (damageMod) {
        const variantName = resolveVariantName(damageMod.effects.dataQueryName, gunName);
        // ...就从总武器列表里找到那个变体的数据
        const weaponVariant = weapons.find(w => w.name === variantName);
        if (weaponVariant) {
          // ...并将其设为我们的"基础模板"（使用变体武器的伤害属性）
          baseWeaponProfile = weaponVariant;
        } else {
          console.warn(`未找到名为 "${variantName}" 的武器变体数据!`);
        }
      }

      //    如果找到了specialRange配件...
      if (specialRangeMod) {
        const variantName = resolveVariantName(specialRangeMod.effects.dataQueryName, gunName);
        // ...就从总武器列表里找到那个变体的数据
        const weaponVariant = weapons.find(w => w.name === variantName);
        if (weaponVariant) {
          // ...并将其设为我们的"射程模板"（使用变体武器的射程属性）
          rangeWeaponProfile = weaponVariant;
        } else {
          console.warn(`未找到名为 "${variantName}" 的武器变体数据!`);
        }
      }

      // 初始化"效果累加器"
      // totalFireRateModifier: 射速百分比修正累加
      let totalFireRateModifier = 0;
      // totalRangeModifier: 射程百分比修正累加
      let totalRangeModifier = 0;
      // totalMuzzleVelocityModifier: 初速百分比修正累加
      let totalMuzzleVelocityModifier = 0;
      // totalTriggerDelay: 扳机延迟毫秒数累加（叠加到基础 triggerDelay 上）
      let totalTriggerDelay = 0;

      // 遍历配件，只进行"累加"操作
      if (mods && mods.length > 0) {
        mods.forEach(modId => {
          const mod = allModifications.find(m => m.id === modId);
          if (mod && mod.effects) {
            // 将每个配件的效果值，累加到对应的累加器上
            if (mod.effects.fireRateModifier) {
              totalFireRateModifier += mod.effects.fireRateModifier;
            }
            if (mod.effects.rangeModifier) {
              totalRangeModifier += mod.effects.rangeModifier;
            }
            if (mod.effects.muzzleVelocityModifier) {
              totalMuzzleVelocityModifier += mod.effects.muzzleVelocityModifier;
            }
            // 处理扳机延迟修改配件
            if (mod.effects.changeTriggerDelay && mod.effects.triggerDelay) {
              totalTriggerDelay += mod.effects.triggerDelay;
            }
          }
        });
      }

      // d. 创建一个最终属性对象，它的伤害相关属性来自正确的"基础模板"
      //    射程和射程衰减倍率属性来自"射程模板"，其他属性仍然来自【原始】的 weaponInfo
      //    这种分离确保配件只影响它们应该影响的属性
      // finalWeaponStats: 基于“基础枪 + 变体模板”合成出的武器属性（尚未应用百分比累加器）
      let finalWeaponStats = {
        ...weaponInfo, // 初始继承所有原始武器的属性
        // 用"基础模板"的伤害数据覆盖（处理口径转换等特殊情况）
        // 允许“Minimal Variant”：变体只写差异字段，其余字段回退到原始武器
        damage: baseWeaponProfile.damage ?? weaponInfo.damage,
        armorDamage: baseWeaponProfile.armorDamage ?? weaponInfo.armorDamage,
        headMultiplier: baseWeaponProfile.headMultiplier ?? weaponInfo.headMultiplier,
        abdomenMultiplier: baseWeaponProfile.abdomenMultiplier ?? weaponInfo.abdomenMultiplier,
        upperArmMultiplier: baseWeaponProfile.upperArmMultiplier ?? weaponInfo.upperArmMultiplier,
        lowerArmMultiplier: baseWeaponProfile.lowerArmMultiplier ?? weaponInfo.lowerArmMultiplier,
        thighMultiplier: baseWeaponProfile.thighMultiplier ?? weaponInfo.thighMultiplier,
        calfMultiplier: baseWeaponProfile.calfMultiplier ?? weaponInfo.calfMultiplier,
        // 用"射程模板"的射程和射程衰减倍率数据覆盖（处理specialRange配件）
        range1: rangeWeaponProfile.range1 ?? weaponInfo.range1,
        range2: rangeWeaponProfile.range2 ?? weaponInfo.range2,
        range3: rangeWeaponProfile.range3 ?? weaponInfo.range3,
        range4: rangeWeaponProfile.range4 ?? weaponInfo.range4,
        range5: rangeWeaponProfile.range5 ?? weaponInfo.range5,
        decay1: rangeWeaponProfile.decay1 ?? weaponInfo.decay1,
        decay2: rangeWeaponProfile.decay2 ?? weaponInfo.decay2,
        decay3: rangeWeaponProfile.decay3 ?? weaponInfo.decay3,
        decay4: rangeWeaponProfile.decay4 ?? weaponInfo.decay4,
        decay5: rangeWeaponProfile.decay5 ?? weaponInfo.decay5,
      };

      // 最终计算 - 应用百分比效果
      // modifiedWeaponInfo: 应用全部百分比修正与扳机延迟后的“最终用于曲线计算”的武器属性
      const modifiedWeaponInfo = {
        ...finalWeaponStats, // 使用已经处理过特殊配件的最终属性

        // 计算最终射速
        fireRate: finalWeaponStats.fireRate * (1 + totalFireRateModifier),

        // 计算最终枪口初速
        muzzleVelocity: finalWeaponStats.muzzleVelocity * (1 + totalMuzzleVelocityModifier),

        // 计算最终的扳机延迟（基础值加上配件修改）
        triggerDelay: (finalWeaponStats.triggerDelay || 0) + totalTriggerDelay,

        // 计算最终的各个射程档位（如果 specialRange 配件存在，这些已经是变体武器的射程）
        range1:
          finalWeaponStats.range1 === 999
            ? 999
            : (finalWeaponStats.range1 ? finalWeaponStats.range1 * (1 + totalRangeModifier) : 0),
        range2:
          finalWeaponStats.range2 === 999
            ? 999
            : (finalWeaponStats.range2 ? finalWeaponStats.range2 * (1 + totalRangeModifier) : 0),
        range3:
          finalWeaponStats.range3 === 999
            ? 999
            : (finalWeaponStats.range3 ? finalWeaponStats.range3 * (1 + totalRangeModifier) : 0),
        range4:
          finalWeaponStats.range4 === 999
            ? 999
            : (finalWeaponStats.range4 ? finalWeaponStats.range4 * (1 + totalRangeModifier) : 0),
        range5:
          finalWeaponStats.range5 === 999
            ? 999
            : (finalWeaponStats.range5 ? finalWeaponStats.range5 * (1 + totalRangeModifier) : 0),
      };

      const { fireRate } = modifiedWeaponInfo; // 从【改装后】的武器信息中获取射速
      if (!fireRate || fireRate <= 0) {
        console.error(`【严重错误】武器 "${gunName}" (可能被改装后) 的射速信息无效。`);
        return null;
      }

      const bulletBtkPoints = btkDataPoints.filter(p => p.bullet_name === bulletName);

      // 确保数据点是按原始距离排序的
      const sortedBtkDataPoints = [...bulletBtkPoints].sort((a, b) => a.distance - b.distance);

      // 用于存储期望BTK数据，用于调试输出
      const eBtkDebugData = [];

      // 去重：基于原始距离去重，避免重复的数据点
      const uniqueBtkDataPoints = [];
      const seenDistances = new Set();
      
      for (const point of sortedBtkDataPoints) {
        if (!seenDistances.has(point.distance)) {
          seenDistances.add(point.distance);
          uniqueBtkDataPoints.push(point);
        }
      }

      // 变体射程可能只有 1-3 档；超出档位的 BTK 点需要被“钉”在最后有效射程，避免插入中段
      const rangeValues = [
        modifiedWeaponInfo.range1,
        modifiedWeaponInfo.range2,
        modifiedWeaponInfo.range3,
        modifiedWeaponInfo.range4,
        modifiedWeaponInfo.range5,
      ];
      const lastValidRangeIndex = rangeValues
        .map((v, i) => (v && v > 0 ? i + 1 : null))
        .filter(Boolean)
        .pop();
      const lastValidRange = lastValidRangeIndex
        ? modifiedWeaponInfo[`range${lastValidRangeIndex}`]
        : null;

      const sparseTtkData = uniqueBtkDataPoints
        .map((point, index) => {
          const eBtk = EbtkCalculator(point.btk_data, hitRate);
          if (eBtk === null) return null;

          const baseTtk = (eBtk - 1) * (60 / fireRate) * 1000;

          // 根据索引，从改装后的武器信息中，获取新的射程
          let correctDistance;
          if (index === 0) {
            // 第一个数据点 (index 0)，其跳变点在 0 米处
            correctDistance = 0;
          } else {
            // 第 n 个点 (index = n)，其跳变点由第 n 个射程档位的结束位置决定
            // 例如：index=1 对应 range1 的结束位置
            if (lastValidRangeIndex && index > lastValidRangeIndex) {
              // 变体档位不足：将超出点固定到最后有效射程，避免 56m 等中段插入导致一段 PTTK 异常
              correctDistance = lastValidRange ?? point.distance;
            } else {
              const rangeKey = `range${index}`;
              const rangeValue = modifiedWeaponInfo[rangeKey];
              // 若该档位缺失（0/undefined），回退到最后有效射程，保证单调递增
              correctDistance = rangeValue && rangeValue > 0
                ? rangeValue
                : (lastValidRange ?? point.distance);
            }
          }

          if (correctDistance === null || correctDistance === undefined || correctDistance < 0) {
            return null; // 如果找不到对应的射程分界，则该点无效
          }

          // 收集调试数据
          eBtkDebugData.push({
            索引: index,
            原始距离: `${point.distance}m`,
            修正后距离: `${correctDistance}m`,
            原始BTK数据: point.btk_data,
            期望BTK: eBtk.toFixed(2),
            命中率: `${(hitRate * 100).toFixed(0)}%`,
          });

          return { distance: correctDistance, pttk: baseTtk };
        })
        .filter(Boolean); // 过滤掉所有无效的数据点

      // 输出期望BTK调试信息
      if (eBtkDebugData.length > 0) {
        console.log(`📊 [${displayName}] 期望BTK数据:`);
        console.table(eBtkDebugData);
      }

      if (sparseTtkData.length === 0) {
        console.warn(`⚠️ 警告: 曲线 "${lineConfig.name}" 的所有数据点都无法计算出有效的TTK。`);
        return { ...lineConfig, data: [] };
      }

      // 找到数据库返回数据中的最大距离
      const maxDbDistance = Math.max(...sparseTtkData.map(p => p.distance));
      // 调用辅助函数，计算出真正的显示终点
      const effectiveMaxRange = findEffectiveRange(modifiedWeaponInfo, maxDbDistance);

      // 使用 Math.min 来确保最大射程不会超过 100
      const finalMaxRange = Math.min(effectiveMaxRange, 100);

      // --- 核心逻辑第二步：阶梯化展开 ---
      const stepData = expandStepData(sparseTtkData, finalMaxRange);

      let processedData = stepData;

      // --- 第一个效果：枪口初速 ---
      if (applyEffect) {
        const { muzzleVelocity } = modifiedWeaponInfo;
        if (muzzleVelocity && muzzleVelocity > 0) {
          processedData = processedData.map(point => ({
            ...point,
            pttk: point.pttk + (point.distance / muzzleVelocity) * 1000,
          }));
        }
      }

      // --- 第二个效果：扳机延迟 ---
      if (applyTriggerDelay) {
        // 从 weaponInfo 中获取扳机延迟，如果不存在，则默认为 0
        const { triggerDelay = 0 } = modifiedWeaponInfo;
        if (triggerDelay > 0) {
          processedData = processedData.map(point => ({
            ...point,
            pttk: point.pttk + triggerDelay,
          }));
        }
      }

      // 返回经过所有效果叠加后的最终数据
      return {
        id: lineConfig.id,
        gunName: gunName,
        bulletName: bulletName,
        name: displayName,
        data: processedData,
        color: COLORS[index % COLORS.length], // 用于已选枪械显示
      };
    })
    .filter(Boolean); // 过滤掉所有处理失败的线
};
