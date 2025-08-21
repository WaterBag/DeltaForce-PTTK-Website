import React from "react";
import './ComparisonList.css'
import { getRarityClass } from "../../utils/styleUtils"
import { weapons } from '../../assets/data/weapons.js';
import { ammos } from '../../assets/data/ammos.js';
import { modifications } from "../../assets/data/modifications.js";

//一次性字典
const weaponInfoMap = weapons.reduce((acc, w) => { acc[w.name] = w; return acc; }, {});
const ammoInfoMap = ammos.reduce((acc, a) => {
    const key = `${a.caliber}-${a.name}`;
    acc[key] = a;
    return acc;
}, {});

export function ComparisonList({ lines, onRemoveLine }) {
    if (!lines || lines.length === 0) {
        return <div className="comparison-list-empty">请从左侧可用武器中添加配置进行对比</div>;
    }

    return (
        <ul className="comparison-list">
            {lines.map((line) => {
                
                //根据 line.gunName 查找武器口径
                const weapon = weaponInfoMap[line.gunName];
                const weaponCaliber = weapon ? weapon.caliber : '';

                //根据【口径】和 line.bulletName，构造唯一的Key，去查找弹药详情
                const ammoKey = `${weaponCaliber}-${line.bulletName}`;
                const ammo = ammoInfoMap[ammoKey];
                const ammoRarity = ammo ? ammo.rarity : '';

                //查找配件的真实名字，用于悬停提示
                const modNames = (line.mods || []).map(modId => 
                    modifications.find(m => m.id === modId)?.name || modId
                );

                return (
                    <li key={line.id} className="comparison-list-item">
                        {/* 颜色指示器 */}
                        <span 
                            className="color-indicator" 
                            style={{ backgroundColor: line.color }}
                        ></span>
                        
                        {/* 渲染 */}
                        <span className="comparison-line-name">
                            {line.gunName}- 
                            <span className={getRarityClass(ammoRarity)}>
                                {line.bulletName}
                            </span>
                            
                            {(line.mods && line.mods.length > 0) && (
                                <span className="mods-indicator" title={modNames.join(', ')}>
                                    (+{line.mods.length})
                                </span>
                            )}
                        </span>
                        
                        {/* 删除按钮 */}
                        <button 
                            className="remove-button" 
                            onClick={() => onRemoveLine(line.id)}
                        >
                            &times;
                        </button>
                    </li>
                );
            })}
        </ul>
    );
}