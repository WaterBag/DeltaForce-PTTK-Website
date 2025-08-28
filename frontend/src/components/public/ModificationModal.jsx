import {React, useState, useMemo} from "react";
import './ModificationModal.css';
import { BtkDistributionChart } from "./BtkDistributionChart";
import { AmmoSelector } from "./AmmoSelector.jsx";
import { weapons } from "../../assets/data/weapons";
import { ammos } from "../../assets/data/ammos";

const weaponInfoMap = weapons.reduce((acc, weapon) => {
    acc[weapon.name] = weapon;
    return acc;
}, {});

export function ModificationModal({ isOpen, onClose, gunName, gunDetailsMap, onAddComparison, availableMods }) {

    const [selectedBullet, setSelectedBullet] = useState(null);
    const [selectedMods, setSelectedMods] = useState([]);
    const [hoveredMod, setHoveredMod] = useState(null);
    const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

    const groupedMods = useMemo(() => {
        if (!availableMods) return {}; // 如果没有配件，返回一个空对象

        // 使用 reduce 来进行分组
        return availableMods.reduce((groups, mod) => {
            // 我们只根据配件的【第一个】type来进行分组
            const type = mod.type[0] || '未分类'; 

            // 如果这个分组的“抽屉”还不存在，就先创建一个
            if (!groups[type]) {
                groups[type] = [];
            }

            // 把当前这个配件，放进对应的“抽屉”里
            groups[type].push(mod);

            // 返回更新后的“抽屉柜”
            return groups;
        }, {}); // 从一个空的“抽屉柜” (对象) 开始

    }, [availableMods]); // 依赖于可选配件列表的变化

    // 根据已选配件，动态决定当前应该使用哪个枪械变体的数据
    const currentVariantName = useMemo(() => {
        const damageMod = selectedMods
            .map(id => availableMods.find(m => m.id === id))
            .find(mod => mod?.effects.damageChange);
        
        return damageMod ? damageMod.effects.btkQueryName : gunName;
    }, [selectedMods, availableMods, gunName]);

    const currentVariantDetails = gunDetailsMap ? gunDetailsMap[currentVariantName] : null;// 【数据源切换】从 gunDetails 这个“数据字典”中，取出当前变体的数据

    const bulletOptions = useMemo(() => {// 【实时联动】后续的所有 useMemo，都依赖于这个【动态切换】的数据源

        if (!currentVariantDetails || !currentVariantDetails.availableBullets) {// 1. 【安全检查】我们只检查 currentVariantDetails 和它内部的 availableBullets
            return [];
        }
        
        const availableBulletNames = currentVariantDetails.availableBullets;//后端API已经为我们准备好了干净、去重的 availableBullets 数组

        const weaponInfo = weaponInfoMap[gunName];//根据枪械名找到口径
        if (!weaponInfo) return [];
        const weaponCaliber = weaponInfo.caliber;
        
        return ammos.filter(ammo => // 4. 用【口径】和【可用弹药名】，去我们的“弹药总列表”中，进行精确查找
            ammo.caliber === weaponCaliber && availableBulletNames.includes(ammo.name)
        );

    }, [currentVariantDetails, gunName]); 

    console.log(bulletOptions);

    const firstRangeBtkData = useMemo(() => {
        if (!currentVariantDetails || !currentVariantDetails.allDataPoints || !selectedBullet) {
            return null;
        }
        // 1. 先筛选出所有属于当前选中子弹的数据点
        const bulletPoints = currentVariantDetails.allDataPoints.filter(p => p.bullet_name === selectedBullet.name);
        // 2. 如果没有该子弹的数据，返回null
        if (bulletPoints.length === 0) return null;
        // 3. 在这些点中，找到 distance 最小的那个
        return bulletPoints.reduce((minDistPoint, currentPoint) => {
            return currentPoint.distance < minDistPoint.distance ? currentPoint : minDistPoint;
        });
    }, [currentVariantDetails, selectedBullet]);

    const handleModChange = (modId, isSelected) => {
        // modId: 用户刚刚操作的那个配件的ID
        // isSelected: 这个配件现在是否被选中
        if (!isSelected) {
            // 如果取消选择，直接从 selectedMods 中移除
            setSelectedMods(selectedMods.filter(id => id !== modId));
            return;
        }
        
        // 如果是选择操作，先检查是否已经有同类型的配件被选中
        const mod = availableMods.find(m => m.id === modId);
        if (!mod || !mod.type) return; // 安全检查：确保 mod 和 mod.type 存在

        const newModSlots = mod.type//获取配件占用的所有槽位

        setSelectedMods(prevSelectedIds => {
            // a. 先从之前的已选列表中，过滤掉所有与新配件冲突的旧配件
            const nonConflictingMods = prevSelectedIds.filter(oldModId => {
                const oldMod = availableMods.find(m => m.id === oldModId);
                if (!oldMod) return false; // 如果找不到旧配件信息，也移除

                // 检查 oldMod.type 和 newModSlots 这两个数组，是否有任何一个共同的元素
                const hasConflict = oldMod.type.some(slot => newModSlots.includes(slot));
                
                // 如果没有冲突，就保留这个旧配件
                return !hasConflict;
            });
        
            // b. 最后，将【新勾选】的配件ID，添加到这个不冲突的列表末尾
            return [...nonConflictingMods, modId];
        });
    };


    if(!isOpen) return null;
    else
    return(
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <header className="modal-header">
                    <h2>{gunName} 配件配置</h2>
                    <button className="close-button" onClick={onClose}>&times;</button>
                </header>

                <main className="modal-body">
                    <div className="mod-section">
                        <h3>弹药选择</h3>
                        <AmmoSelector
                            options={bulletOptions} 
                            selectedAmmo={selectedBullet}
                            onSelect={setSelectedBullet}
                            placeholder={"请选择弹药"}
                        />
                    </div>

                    <div className="mod-section">
                        <h3>一段射程BTK分布</h3>
                        <BtkDistributionChart btkData={firstRangeBtkData ? firstRangeBtkData.btk_data : null} />
                    </div>

                    <div className="mod-section">
                        {Object.keys(groupedMods).map(type => (
                            <div key={type} className="mod-group">
                                <h4 className="mod-group-title">{type}</h4>
                                
                                <div className="mod-options-grid">
                                    {groupedMods[type].map(mod => (
                                        // ▼▼▼ 【核心修正】▼▼▼
                                        // 1. 将 <label> 改为 <div>，因为它不再与 input 关联
                                        <div
                                            key={mod.id}
                                            // 2. 根据 selectedMods 中是否包含 mod.id，动态添加 'selected' 类
                                            className={`mod-option ${selectedMods.includes(mod.id) ? 'selected' : ''}`}
                                            // 3. 将点击事件直接绑定在 div 上
                                            onClick={() => {
                                                // 4. 在点击时，手动切换选择状态
                                                const isCurrentlySelected = selectedMods.includes(mod.id);
                                                handleModChange(mod.id, !isCurrentlySelected);
                                            }}
                                            // 6. 添加鼠标悬停事件
                                            onMouseEnter={(e) => {
                                                setHoveredMod(mod);
                                                // 获取鼠标位置
                                                const rect = e.currentTarget.getBoundingClientRect();
                                                setTooltipPosition({
                                                    x: rect.right + 10,
                                                    y: rect.top
                                                });
                                            }}
                                            onMouseLeave={() => setHoveredMod(null)}
                                        >
                                            {/* 5. 移除 <input type="checkbox"> */}
                                            <span>{mod.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}

                        {/*如果一个配件都没有，显示提示 */}
                        {(!availableMods || availableMods.length === 0) && (
                            <p>该武器暂无可选配件。</p>
                        )}
                    </div>

                    
                </main>

                <footer className="modal-footer">
                    <button className="add-comparison-button" disabled={!selectedBullet} onClick={() => {
                        onAddComparison({
                            gunName: gunName,
                            bulletName: selectedBullet.name,
                            mods: selectedMods,
                        }, currentVariantDetails.allDataPoints);
                    }}>
                        添加至对比
                    </button>
                </footer>

                {/* 配件效果提示 */}
                {hoveredMod && (
                    <div 
                        className="mod-tooltip"
                        style={{
                            left: `${tooltipPosition.x}px`,
                            top: `${tooltipPosition.y}px`
                        }}
                    >
                        <h4>{hoveredMod.name}</h4>
                        <div className="mod-effects">
                            {hoveredMod.effects.rangeModifier !== 0 && (
                                <div className="effect-item">
                                    <span className="effect-label">射程:</span>
                                    <span className={`effect-value ${hoveredMod.effects.rangeModifier > 0 ? 'positive' : 'negative'}`}>
                                        {hoveredMod.effects.rangeModifier > 0 ? '+' : ''}{Math.round(hoveredMod.effects.rangeModifier * 100)}%
                                    </span>
                                </div>
                            )}
                            {hoveredMod.effects.fireRateModifier !== 0 && (
                                <div className="effect-item">
                                    <span className="effect-label">射速:</span>
                                    <span className={`effect-value ${hoveredMod.effects.fireRateModifier > 0 ? 'positive' : 'negative'}`}>
                                        {hoveredMod.effects.fireRateModifier > 0 ? '+' : ''}{Math.round(hoveredMod.effects.fireRateModifier * 100)}%
                                    </span>
                                </div>
                            )}
                            {hoveredMod.effects.muzzleVelocityModifier !== 0 && (
                                <div className="effect-item">
                                    <span className="effect-label">初速:</span>
                                    <span className={`effect-value ${hoveredMod.effects.muzzleVelocityModifier > 0 ? 'positive' : 'negative'}`}>
                                        {hoveredMod.effects.muzzleVelocityModifier > 0 ? '+' : ''}{Math.round(hoveredMod.effects.muzzleVelocityModifier * 100)}%
                                    </span>
                                </div>
                            )}
                            {hoveredMod.effects.damageChange && (
                                <div className="effect-item">
                                    <span className="effect-label">伤害:</span>
                                    <span className="effect-value special">改变伤害曲线</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
};
