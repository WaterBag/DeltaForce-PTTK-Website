/**
 * 游戏常量配置文件
 * 包含伤害计算所需的基础常数和系数
 * 
 * 这些常量与后端Python计算器（calculate.py）中的参数保持同步
 * 
 * 注意：PD12双头弹的特殊性仅在前端模拟计算（第三阶段）时需要处理
 * 当前阶段（查询模式）中，PD12 数据已由后端完整计算，无需前端特殊处理
 */

/**
 * 玩家基础血量
 * 击杀标准：当玩家累积伤害 >= 100 HP 时死亡
 */
export const PLAYER_HP = 100;

/**
 * 默认部位命中概率
 * 
 * 说明：
 * - 这些概率代表在随机射击时的平均命中分布
 * - 总和必须 = 1.0
 * - 在前端模拟中可被用户自定义
 * 
 * 数据来源：游戏内部的伤害计算配置
 */
export const DEFAULT_HIT_PROBABILITIES = {
    head: 0.1724,      // 头部 17.24%
    chest: 0.3046,     // 胸部 30.46%
    abdomen: 0.1897,   // 腹部 18.97%
    upperArm: 0.1111,  // 上臂 11.11%
    limbs: 0.2222      // 其他四肢（前臂+大腿+小腿）22.22%
};

/**
 * PD12双头弹钝伤系数
 * 
 * 【重要】此信息仅在前端模拟计算（第三阶段）时使用
 * 
 * PD12 特殊性说明：
 * - PD12 的伤害与穿透等级无关，只造成钝伤
 * - 对玩家伤害 = 武器基础伤害 × 0.66（钝伤系数）
 * - 钝伤系数 0.66 反映了双头弹两发的平均伤害
 * - 护甲耐久度影响甲伤，不影响人员伤害
 * 
 * 在当前查询模式中：
 * - 后端数据库已经根据 66% 钝伤系数计算了 BTK 数据
 * - 前端无需特殊处理，直接使用后端数据即可
 * - 只需应用命中率调整
 */
export const PD12_BLUNT_DAMAGE_COEFFICIENTS = {
    3: 0.75,  // 3级护甲：75%钝伤（参考值，PD12不使用分级系数）
    4: 0.50,  // 4级护甲：50%钝伤（参考值，PD12不使用分级系数）
    5: 0.40,  // 5级护甲：40%钝伤（参考值，PD12不使用分级系数）
    6: 0.30,  // 6级护甲：30%钝伤（参考值，PD12不使用分级系数）
};/**
 * 部位命中索引映射
 * 用于在数组中查找部位的伤害倍率
 */
export const HIT_PARTS = {
    HEAD: 0,
    CHEST: 1,
    ABDOMEN: 2,
    UPPER_ARM: 3,
    LIMBS: 4  // 合并的四肢（前臂、大腿、小腿）
};

/**
 * 护甲部位防护字段映射
 * 用于检查护甲是否保护了特定部位
 */
export const ARMOR_PROTECTION_FIELDS = {
    chest: 'chest',           // 胸部
    abdomen: 'abdomen',       // 腹部
    upperArm: 'upperArm',     // 上臂/肩部
    forearm: 'forearm',       // 前臂
    thigh: 'thigh',           // 大腿
    calf: 'calf'              // 小腿
};

/**
 * 部位到护甲防护字段的映射
 * 用于根据命中部位查找对应的护甲防护字段
 */
export const HIT_PART_TO_ARMOR_FIELD = {
    0: 'head',        // 头部 -> 只有头盔防护（由helmet处理）
    1: 'chest',       // 胸部 -> 护甲胸部防护
    2: 'abdomen',     // 腹部 -> 护甲腹部防护
    3: 'upperArm',    // 上臂 -> 护甲肩部防护
    4: 'limbs'        // 四肢 -> 需要单独处理各肢体
};

/**
 * 穿透系数说明
 * 
 * ⚠️ 特殊情况：PD12双头弹（仅在第三阶段前端模拟时需要理解）
 * 
 * 穿透等级与护甲等级的关系（适用于除PD12外的所有弹药）：
 * 
 * 1. penetrate > armorLevel + 1
 *    → 完全穿透，造成 100% 伤害
 * 
 * 2. penetrate == armorLevel + 1
 *    → 次级穿透，造成 secondaryPenetration% 伤害
 * 
 * 3. penetrate == armorLevel
 *    → 同级失穿，只造成甲伤，无人员伤害（0%）
 * 
 * 4. penetrate < armorLevel
 *    → 穿透失败，只造成甲伤，无人员伤害（0%）
 * 
 * 特例：当护甲耐久度 <= 0 时
 *    → 护甲已摧毁，视为 penetrate > armorLevel + 1，造成 100% 伤害
 */
export const PENETRATION_EXPLANATION = {
    full: "完全穿透 (穿透等级 > 护甲等级+1)",
    secondary: "次级穿透 (穿透等级 = 护甲等级+1)",
    sameLevelFailed: "同级失穿 (穿透等级 = 护甲等级，只甲伤)",
    penetrationFailed: "穿透失败 (穿透等级 < 护甲等级，只甲伤)",
    pd12Special: "PD12特殊 (不受穿透等级限制，恒定钝伤)"
};
