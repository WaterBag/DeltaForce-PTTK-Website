/**
 * TTK (Time to Kill) API路由模块
 * 提供武器伤害计算相关的API接口
 */

const express = require('express');
const db = require('../config/db');
const { asyncHandler } = require('../middleware/errorHandler');
const router = express.Router();

/**
 * POST /api/ttk/available-guns
 * 根据防护装备参数查询可用的枪械列表
 * @param {Object} req.body - 请求体包含防护装备参数
 * @returns {Array} 可用枪械名称数组
 */
router.post('/available-guns', asyncHandler(async (req, res) => {
    console.log("收到请求枪械参数:", req.body);
    const {
        helmetLevel,
        armorLevel,
        helmetDurability,
        armorDurability,
        chestProtection,
        stomachProtection,
        armProtection
    } = req.body;

    const [rows] = await db.query(
        `SELECT DISTINCT gun_name
        FROM btk_list_results
        WHERE helmet_protection_grade = ?
            AND armor_protection_grade = ?
            AND helmet_durability = ?
            AND armor_durability = ?
            AND protects_chest = ?
            AND protects_abdominal = ?
            AND protects_upper_arm = ?`,
        [helmetLevel, armorLevel, helmetDurability, armorDurability, chestProtection, stomachProtection, armProtection]
    );
    const gunNames = rows.map(row => row.gun_name);
    console.log("查询到可用枪械:", gunNames);
    res.json(gunNames);
}));

/**
 * POST /api/ttk/gun-details
 * 根据枪械名称和防护装备参数查询枪械详细信息和可用子弹
 * @param {Object} req.body - 请求体包含枪械名称和防护装备参数
 * @returns {Object} 包含可用子弹列表和所有数据点的响应对象
 */
router.post('/gun-details', asyncHandler(async (req, res) => {
    console.log("收到请求枪械和子弹参数:", req.body);
    const {
        gunName,
        helmetLevel,
        armorLevel,
        helmetDurability,
        armorDurability,
        chestProtection,
        stomachProtection,
        armProtection
    } = req.body;
    const gun_name = gunName;

    const whereSql = `
        FROM btk_list_results
        WHERE gun_name = ?
            AND helmet_protection_grade = ?
            AND armor_protection_grade = ?
            AND helmet_durability = ?
            AND armor_durability = ?
            AND protects_chest = ?
            AND protects_abdominal = ?
            AND protects_upper_arm = ?
    `;

    const whereParams = [
        gun_name,
        helmetLevel,
        armorLevel,
        helmetDurability,
        armorDurability,
        chestProtection,
        stomachProtection,
        armProtection,
    ];

    // 0) 兼容字段名：created_at / create_at
    const [timeColRows] = await db.query(
        `SELECT COLUMN_NAME
         FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'btk_list_results'
           AND COLUMN_NAME IN ('created_at', 'create_at')
         LIMIT 1`
    );

    const timeColumn = timeColRows && timeColRows.length > 0 ? timeColRows[0].COLUMN_NAME : null;

    // 如果找不到时间列，则退化为旧行为：只返回最新(allDataPoints)一套（无法区分次新）
    if (!timeColumn) {
        const [legacyRows] = await db.query(
            `SELECT DISTINCT bullet_name, distance, btk_data
             ${whereSql}
             ORDER BY bullet_name ASC, distance ASC`,
            whereParams
        );

        const availableBullets = [...new Set(legacyRows.map(row => row.bullet_name))];
        res.json({
            availableBullets,
            allDataPoints: legacyRows,
            latestCreatedAt: null,
            hasPrevious: false,
            previousAvailableBullets: [],
            previousAllDataPoints: [],
            previousCreatedAt: null,
        });
        return;
    }

    // 1) 拉取该枪+护甲条件下的所有数据点
    // 版本判定规则（按你的定义）：
    // - 不同子弹的时间不同不代表不同版本
    // - 只有在“相同 bullet_name + 其它条件一致”时，出现“数据内容不同且时间不同”，才视为新旧两个版本
    const [allRows] = await db.query(
        `SELECT bullet_name, distance, btk_data, \`${timeColumn}\` AS created_at
         ${whereSql}
         ORDER BY bullet_name ASC, \`${timeColumn}\` DESC, distance ASC`,
        whereParams
    );

    if (!allRows || allRows.length === 0) {
        res.json({
            availableBullets: [],
            allDataPoints: [],
            latestCreatedAt: null,
            hasPrevious: false,
            previousAvailableBullets: [],
            previousAllDataPoints: [],
            previousCreatedAt: null,
            latestCreatedAtByBullet: {},
            previousCreatedAtByBullet: {},
        });
        return;
    }

    const normalizeBtkData = (btkData) => {
        if (btkData == null) return null;
        try {
            const parsed = typeof btkData === 'string' ? JSON.parse(btkData) : btkData;
            if (!Array.isArray(parsed)) return String(btkData);
            const sorted = [...parsed].sort((a, b) => {
                const ab = Number(a?.btk) || 0;
                const bb = Number(b?.btk) || 0;
                if (ab !== bb) return ab - bb;
                const ap = Number(a?.probability) || 0;
                const bp = Number(b?.probability) || 0;
                return ap - bp;
            });
            return JSON.stringify(sorted);
        } catch {
            return String(btkData);
        }
    };

    const toTs = (v) => {
        if (v instanceof Date) return v.getTime();
        const d = new Date(v);
        const t = d.getTime();
        return Number.isFinite(t) ? t : 0;
    };

    const toIsoOrString = (v) => {
        if (v instanceof Date) return v.toISOString();
        const d = new Date(v);
        const t = d.getTime();
        return Number.isFinite(t) ? d.toISOString() : String(v);
    };

    // bullet -> createdKey -> { ts, createdAtRaw, rows: [] }
    const bulletMap = new Map();
    for (const row of allRows) {
        const bullet = row.bullet_name;
        const createdKey = toIsoOrString(row.created_at);
        const ts = toTs(row.created_at);

        if (!bulletMap.has(bullet)) bulletMap.set(bullet, new Map());
        const byTime = bulletMap.get(bullet);
        if (!byTime.has(createdKey)) {
            byTime.set(createdKey, { ts, createdAtRaw: row.created_at, rows: [] });
        }
        byTime.get(createdKey).rows.push(row);
    }

    const latestPoints = [];
    const previousPoints = [];
    const latestCreatedAtByBullet = {};
    const previousCreatedAtByBullet = {};
    let hasPrevious = false;

    // 逐子弹计算“版本”：相同内容的连续时间戳合并
    for (const [bullet, timeMap] of bulletMap.entries()) {
        const snapshots = Array.from(timeMap.entries()).map(([createdKey, v]) => {
            const sortedRows = [...v.rows].sort((a, b) => a.distance - b.distance);
            const signature = JSON.stringify(
                sortedRows.map(r => ({
                    d: r.distance,
                    b: normalizeBtkData(r.btk_data),
                }))
            );
            return {
                createdKey,
                ts: v.ts,
                createdAtRaw: v.createdAtRaw,
                rows: sortedRows,
                signature,
            };
        });

        snapshots.sort((a, b) => b.ts - a.ts);

        const versions = [];
        for (const snap of snapshots) {
            if (versions.length === 0 || versions[versions.length - 1].signature !== snap.signature) {
                versions.push(snap);
            }
            if (versions.length >= 2) {
                // 已经拿到最新+次新版本即可（更老的无需处理）
                break;
            }
        }

        const latest = versions[0];
        const prev = versions[1] || null;

        latestCreatedAtByBullet[bullet] = toIsoOrString(latest.createdAtRaw);
        latestPoints.push(...latest.rows);

        if (prev) {
            hasPrevious = true;
            previousCreatedAtByBullet[bullet] = toIsoOrString(prev.createdAtRaw);
            previousPoints.push(...prev.rows);
        } else {
            // 没有次新版本：次新集合沿用最新，保证“整套数据”按子弹齐全
            previousCreatedAtByBullet[bullet] = toIsoOrString(latest.createdAtRaw);
            previousPoints.push(...latest.rows);
        }
    }

    const availableBullets = Array.from(bulletMap.keys());
    const responseData = {
        // 兼容字段：默认仍返回“最新数据”（按子弹聚合后的最新版本集合）
        availableBullets,
        allDataPoints: latestPoints,

        // 新增：提供“次新数据”（按子弹聚合后的次新版本集合）
        latestCreatedAt: null,
        hasPrevious,
        previousAvailableBullets: availableBullets,
        previousAllDataPoints: previousPoints,
        previousCreatedAt: null,
        latestCreatedAtByBullet,
        previousCreatedAtByBullet,
    };

    console.log(
        "查询到按子弹聚合后的数据点(最新/次新):",
        latestPoints.length,
        "/",
        previousPoints.length,
        "hasPrevious=",
        hasPrevious
    );
    res.json(responseData);
}));

/**
 * POST /api/ttk/combinations
 * 查询特定防护装备下的所有枪械和子弹组合
 * @param {Object} req.body - 请求体包含防护装备参数
 * @returns {Array} 枪械和子弹组合的数组
 */
router.post('/combinations', asyncHandler(async (req, res) => {
    console.log("收到请求参数:", req.body);
    const {
        helmetLevel,
        armorLevel,
        helmetDurability,
        armorDurability,
        chestProtection,
        stomachProtection,
        armProtection
    } = req.body;

    const [rows] = await db.query(
        `SELECT DISTINCT gun_name, bullet_name
        FROM btk_list_results
        WHERE helmet_protection_grade = ?
            AND armor_protection_grade = ?
            AND helmet_durability = ?
            AND armor_durability = ?
            AND protects_chest = ?
            AND protects_abdominal = ?
            AND protects_upper_arm = ?`,
        [helmetLevel, armorLevel, helmetDurability, armorDurability, chestProtection, stomachProtection, armProtection]
    );
    res.json(rows);
}));

/**
 * POST /api/ttk/ttk-curve
 * 查询特定武器和子弹组合的TTK曲线数据
 * @param {Object} req.body - 请求体包含武器、子弹和防护装备参数
 * @returns {Array} 按距离排序的BTK数据数组
 */
router.post('/ttk-curve', asyncHandler(async (req, res) => {
    const {
        weaponName,
        ammoName,
        helmetLevel,
        helmetDurability,
        armorLevel,
        armorDurability,
        chestProtection,
        stomachProtection,
        armProtection
    } = req.body;

    const [rows] = await db.query(
        `SELECT DISTINCT distance, btk_data
        FROM btk_list_results
        WHERE gun_name = ?
            AND bullet_name = ?
            AND helmet_protection_grade = ?
            AND armor_protection_grade = ?
            AND helmet_durability = ?
            AND armor_durability = ?
            AND protects_chest = ?
            AND protects_abdominal = ?
            AND protects_upper_arm = ?
        ORDER BY distance ASC`,
        [weaponName, ammoName, helmetLevel, armorLevel, helmetDurability, armorDurability, chestProtection, stomachProtection, armProtection]
    );

    if (rows.length === 0) {
        console.warn('注意: 为以下组合查询到的数据为空:', { weaponName, ammoName });
    }

    res.json(rows);
}));

// 导出路由模块
module.exports = router;
