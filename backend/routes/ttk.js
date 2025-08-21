const express = require('express');
const db = require('../config/db');
const router = express.Router();

router.post('/available-guns', async (req, res) => {
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

    try {
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
    } catch (err) {
        console.error('查询可用枪械失败', err);
        res.status(500).json({ message: "数据库查询可用枪械失败", error: err.message });
    }
});

router.post('/gun-details',async(req,res) => {
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
    try{
        const [rows] = await db.query(
            `SELECT DISTINCT bullet_name, distance, btk_data
            FROM btk_list_results
            WHERE gun_name = ?
                AND helmet_protection_grade = ?
                AND armor_protection_grade = ?
                AND helmet_durability = ?
                AND armor_durability = ?
                AND protects_chest = ?
                AND protects_abdominal = ?
                AND protects_upper_arm = ?`,
            [gun_name, helmetLevel, armorLevel, helmetDurability, armorDurability, chestProtection, stomachProtection, armProtection]
        );
        console.log("查询到数据:", rows);
        const availableBullets = [...new Set(rows.map(row => row.bullet_name))];
        const responseData = {
            availableBullets: availableBullets,
            allDataPoints: rows
        }
        res.json(responseData);
    }catch(err){
        console.error('查询可用子弹失败', err);
        res.status(500).json({ message: "数据库查询可用子弹失败", error: err.message });
    }
});

router.post('/combinations',async(req,res)=> {
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
    

    try{
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
    }catch(err){
        console.error('查询组合失败',err);
    }
});

router.post('/ttk-curve', async(req,res) => {
        const{
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
    

    try {
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

    }catch(err){
        console.error('查询btk数据失败',err);

        res.status(500).json({ message: "数据库查询btk数据失败", error: err.message });
    }
});
module.exports = router;