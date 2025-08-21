import { weapons } from '../assets/data/weapons';
import { modifications as allModifications } from '../assets/data/modifications.js';
import { COLORS } from '../components/data_query/TtkChart.jsx';

/**
 * 计算基础ttk数据
 */
const EbtkCalculator = (btkDataJsonString) => {
    try {
        const btkData = JSON.parse(btkDataJsonString);
        const Ebtk = btkData.reduce((sum,current) =>sum + current.btk * current.probability, 0);
        return Ebtk;
    }catch(error) {
        console.error("TTK计算器错误:", error);
        return null;
    }
}

// weaponInfoMap 的创建逻辑保持不变，它能完美适配您的新 weapons.js 格式
const weaponInfoMap = weapons.reduce((acc, weapon) => {
    acc[weapon.name] = weapon;
    return acc;
}, {});

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
           return weaponInfo[`range${i-1}`];
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


// expandStepData 函数的逻辑完全复用我们上一版的，因为它已经很完美了，只需要给它传入正确的maxRange即可
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


// processChartData 主函数，负责调度一切
export const processChartData = (comparisonLines, applyEffect, applyTriggerDelay) => {
    if (!comparisonLines || comparisonLines.length === 0) {
        console.warn("⚠️ 警告: 没有可用的比较线数据，返回空数组。");
        return [];
    }

    return comparisonLines.map((lineConfig ,index)=> {
        // --- 准备工作：获取所需信息 ---
        const { gunName, bulletName, mods, btkDataPoints, displayName } = lineConfig;
        const weaponInfo = weaponInfoMap[gunName];


        if (!weaponInfo) {
            console.error(`【严重错误】武器信息未找到! 数据库枪名: "${gunName}". 请检查 weapons.js 中是否存在完全匹配的 name。`);
            return { ...lineConfig, data: [] };
        }
        console.log(`  ✅ 成功找到武器信息 for "${gunName}".`);

        if (!lineConfig.btkDataPoints || lineConfig.btkDataPoints.length === 0) {
            console.warn(`  ⚠️ 警告: 曲线 "${lineConfig.name}" 从API接收到的原始数据为空，无法处理。`);
            return { ...lineConfig, data: [] };
        }
        
        if (!weaponInfo) return null;

        // 初始化“效果累加器”
        let totalFireRateModifier = 0;
        let totalRangeModifier = 0;
        let totalMuzzleVelocityModifier = 0;

        // 遍历配件，只进行“累加”操作
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
                }
            });
        }

        // 最终计算
        const modifiedWeaponInfo = {
            ...weaponInfo, // 先复制所有原始属性
            
            // 计算最终射速
            fireRate: weaponInfo.fireRate * ( 1+totalFireRateModifier),
            
            // 计算最终枪口初速
            muzzleVelocity: weaponInfo.muzzleVelocity * (1 + totalMuzzleVelocityModifier),
            
            //计算最终的各个射程档位
            range1: weaponInfo.range1 ? weaponInfo.range1 * (1 + totalRangeModifier) : 0,
            range2: weaponInfo.range2 ? weaponInfo.range2 * (1 + totalRangeModifier) : 0,
            range3: weaponInfo.range3 ? weaponInfo.range3 * (1 + totalRangeModifier) : 0,
            range4: weaponInfo.range4 ? weaponInfo.range4 * (1 + totalRangeModifier) : 0,
            range5: weaponInfo.range5 ? weaponInfo.range5 * (1 + totalRangeModifier) : 0,
        };

        const { fireRate } = modifiedWeaponInfo; // 从【改装后】的武器信息中获取射速
        if (!fireRate || fireRate <= 0) {
            console.error(`【严重错误】武器 "${gunName}" (可能被改装后) 的射速信息无效。`);
            return null;
        }

        const bulletBtkPoints = btkDataPoints.filter(p => p.bullet_name === bulletName);
        
        //确保数据点是按原始距离排序的
        const sortedBtkDataPoints = [...bulletBtkPoints].sort((a, b) => a.distance - b.distance);

        const sparseTtkData = sortedBtkDataPoints.map((point, index) => {
            const eBtk = EbtkCalculator(point.btk_data);
            if (eBtk === null) return null;
            
            const baseTtk = (eBtk - 1) * (60 / fireRate) * 1000;
            
            //根据索引，从改装后的武器信息中，获取新的射程
            let correctDistance;
            if (index === 0) {
                // 第一个数据点 (index 0)，其跳变点在 0 米处
                correctDistance = 0;
            } else {
                // 第二个点 (index 1) 及以后，其跳变点由【上一个】射程档位决定
                const rangeKey = `range${index}`; 
                correctDistance = modifiedWeaponInfo[rangeKey];
            }
            
            if (correctDistance === null || correctDistance === undefined || correctDistance < 0) {
                return null; // 如果找不到对应的射程分界，则该点无效
            }
            
            return { distance: correctDistance, pttk: baseTtk };
        }).filter(Boolean); // 过滤掉所有无效的数据点
        
        console.log(`  - 曲线 "${lineConfig.name}" 的稀疏TTK数据:`, sparseTtkData);

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
            console.log(`  - 开关开启，为 ${lineConfig.name} 应用枪口初速效果...`);
            const { muzzleVelocity } = modifiedWeaponInfo;
            if (muzzleVelocity && muzzleVelocity > 0) {
                processedData = processedData.map(point => ({...point, pttk: point.pttk + (point.distance / muzzleVelocity) * 1000}));
            }
        }

        // --- 第二个效果：扳机延迟 ---
        if (applyTriggerDelay) {
            console.log(`  - 开关开启，为 ${lineConfig.name} 应用扳机延迟...`);
            // 从 weaponInfo 中获取扳机延迟，如果不存在，则默认为 0
            const { triggerDelay = 0 } = modifiedWeaponInfo;
            if (triggerDelay > 0) {
                    processedData = processedData.map(point => ({...point, pttk: point.pttk + triggerDelay}));
            }
        }

        // 返回经过所有效果叠加后的最终数据
        console.log('--- [探头 1] dataProcessor 最终出厂数据 ---', { name:displayName, data: processedData });
        return { 
            id:lineConfig.id,
            gunName:gunName,
            bulletName:bulletName,
            name:displayName, 
            data: processedData,
            color: COLORS[index % COLORS.length] //用于已选枪械显示
        };
    }).filter(Boolean); //过滤掉所有处理失败的线
    
};