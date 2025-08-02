import { weapons } from '../assets/data/weapons';

// weaponInfoMap 的创建逻辑保持不变，它能完美适配您的新 weapons.js 格式
const weaponInfoMap = weapons.reduce((acc, weapon) => {
    acc[weapon.name] = weapon;
    return acc;
}, {});

/**
 * 【新增】辅助函数：根据武器信息和数据库最大距离，动态查找有效的射程终点
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
export const processChartData = (rawData, applyEffect, applyTriggerDelay) => {
    if (!rawData) return rawData;

    return rawData.map(line => {
        // --- 准备工作：获取所需信息 ---
        const gunName = line.name.split(' - ')[0];
        const weaponInfo = weaponInfoMap[gunName];

         if (!weaponInfo) {
            console.error(`【严重错误】武器信息未找到! 数据库枪名: "${gunName}". 请检查 weapons.js 中是否存在完全匹配的 name。`);
            return { ...line, data: [] };
        }
        console.log(`  ✅ 成功找到武器信息 for "${gunName}".`);

        if (!line.data || line.data.length === 0) {
            console.warn(`  ⚠️ 警告: 曲线 "${line.name}" 从API接收到的原始数据为空，无法处理。`);
            return { ...line, data: [] };
        }

        // --- 核心逻辑第一步：动态计算终点 ---
        // 找到数据库返回数据中的最大距离
        const maxDbDistance = Math.max(...line.data.map(p => p.distance));
        // 调用辅助函数，计算出真正的显示终点
        const effectiveMaxRange = findEffectiveRange(weaponInfo, maxDbDistance);

        // 使用 Math.min 来确保最大射程不会超过 100
        const finalMaxRange = Math.min(effectiveMaxRange, 100);

        // --- 核心逻辑第二步：阶梯化展开 ---
        const stepData = expandStepData(line.data, finalMaxRange);

        let processedData = stepData;

        // --- 第一个效果：枪口初速 ---
        if (applyEffect) {
        console.log(`  - 开关开启，为 ${line.name} 应用枪口初速效果...`);
        const muzzleVelocity = weaponInfo.muzzleVelocity;
        if (muzzleVelocity && typeof muzzleVelocity === 'number') {
            processedData = processedData.map(point => ({
            ...point,
            pttk: point.pttk + (point.distance / muzzleVelocity)*1000
            }));
        }
        }

        // --- 第二个效果：扳机延迟 ---
        if (applyTriggerDelay) {
        console.log(`  - 开关开启，为 ${line.name} 应用扳机延迟...`);
        // 从 weaponInfo 中获取扳机延迟，如果不存在，则默认为 0
        const triggerDelay = weaponInfo.triggerDelay || 0; 

        if (triggerDelay > 0) {
            console.log(`  ✅ 找到扳机延迟: ${triggerDelay} ms.`);
            processedData = processedData.map(point => ({
            ...point,
            pttk: point.pttk + triggerDelay
            }));
        }
        }

        // 返回经过所有效果叠加后的最终数据
        return { ...line, data: processedData };
    });
};