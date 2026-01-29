import React from 'react';
import './WeaponList.css';
import { RangeDecayChart } from './RangeDecayChart';
import { WeaponModPanel } from './WeaponModPanel';
import { ModifiedWeaponStats } from './ModifiedWeaponStats';
import { modifications } from '../../assets/data/modifications';

/**
 * 武器列表组件
 * 显示所有武器的详细属性列表
 * @param {Object} props - 组件属性
 * @param {Array} props.weapons - 武器数据数组
 * @param {Function} props.onCaliberClick - 口径点击回调函数
 * @returns {JSX.Element} 武器列表组件
 */
export function WeaponList({ weapons, onCaliberClick }) {
  // expandedWeaponId: 当前展开的武器卡片 id（用于显示配件面板/对比面板）
  const [expandedWeaponId, setExpandedWeaponId] = React.useState(null);
  // weaponMods: { [weaponId]: string[] }，记录每把武器在图鉴里选择的配件 id 列表
  const [weaponMods, setWeaponMods] = React.useState({});

  /**
   * 查找武器对应的配件并获取射程修正值
   * @param {Object} weapon - 武器对象
   * @returns {number} 射程修正值（如0.3表示+30%）
   */
  const getRangeModifier = (weapon) => {
    if (!weapon.isModification) return 0;
    
    // mod: 指向该变体武器的变体配件（用于拿到 rangeModifier 展示）
    const mod = modifications.find(m => {
      if (typeof m.effects?.dataQueryName === 'string') {
        return m.effects.dataQueryName === weapon.name;
      } else if (typeof m.effects?.dataQueryName === 'object') {
        return Object.values(m.effects.dataQueryName).includes(weapon.name);
      }
      return false;
    });
    
    return mod?.effects?.rangeModifier || 0;
  };

  /**
   * 获取应用配件修改器后的武器属性（仅用于变体武器的卡片显示）
   * @param {Object} weapon - 武器对象
   * @returns {Object} 应用修改器后的武器属性
   */
  const getDisplayWeaponStats = (weapon) => {
    // 如果不是变体武器,直接返回原始属性
    if (!weapon.isModification) {
      // fireRate/armorDamage/damage: 做 Number() 兜底，避免数据字段为字符串/空值导致 NaN
      const fireRate = Number(weapon.fireRate) || 0;
      const armorDamage = Number(weapon.armorDamage) || 0;
      const damage = Number(weapon.damage) || 0;
      return {
        ...weapon,
        armorDPS: weapon.armorDPS ?? (armorDamage * fireRate) / 60,
        fleshDPS: weapon.fleshDPS ?? (damage * fireRate) / 60,
      };
    }

    // mod: 该变体武器对应的变体配件（其 effects.* 作为“变体的基础修改器”）
    const mod = modifications.find(m => {
      if (typeof m.effects?.dataQueryName === 'string') {
        return m.effects.dataQueryName === weapon.name;
      } else if (typeof m.effects?.dataQueryName === 'object') {
        return Object.values(m.effects.dataQueryName).includes(weapon.name);
      }
      return false;
    });

    if (!mod || !mod.effects) {
      return weapon;
    }

    // Minimal Variant 回退：变体缺字段时，从其基础武器补齐
    const baseName = mod?.appliesTo?.[0];
    const baseWeapon = baseName ? weapons.find(w => w.name === baseName) : null;
    // mergedWeapon: Minimal Variant 回退后的完整字段对象（基础字段 + 变体覆写字段）
    const mergedWeapon = baseWeapon ? { ...baseWeapon, ...weapon } : weapon;

    // 应用配件修改器
    // fireRateModifier/muzzleVelocityModifier: 该变体配件提供的基础百分比修正
    const fireRateModifier = mod.effects.fireRateModifier || 0;
    const muzzleVelocityModifier = mod.effects.muzzleVelocityModifier || 0;

    // 计算修改后的属性
    // modifiedFireRate/modifiedMuzzleVelocity: 应用变体配件基础修正后的展示值
    const modifiedFireRate = (Number(mergedWeapon.fireRate) || 0) * (1 + fireRateModifier);
    const modifiedMuzzleVelocity = (Number(mergedWeapon.muzzleVelocity) || 0) * (1 + muzzleVelocityModifier);
    // modifiedArmorDPS/modifiedFleshDPS: 基于修改后射速计算的 DPS（/60 把 RPM 转为 RPS）
    const modifiedArmorDPS = ((Number(mergedWeapon.armorDamage) || 0) * modifiedFireRate) / 60;
    const modifiedFleshDPS = ((Number(mergedWeapon.damage) || 0) * modifiedFireRate) / 60;

    return {
      ...mergedWeapon,
      fireRate: modifiedFireRate,
      muzzleVelocity: modifiedMuzzleVelocity,
      armorDPS: modifiedArmorDPS,
      fleshDPS: modifiedFleshDPS,
    };
  };

  /**
   * 根据名称长度计算字体大小
   * @param {string} name - 武器名称
   * @returns {string} 字体大小CSS值
   */
  const getFontSize = (name) => {
    const length = name.length;
    if (length <= 10) return '16px';
    if (length <= 15) return '14px';
    if (length <= 20) return '13px';
    return '12px';
  };

  /**
   * 切换武器展开状态
   */
  const toggleWeaponExpanded = (weaponId) => {
    setExpandedWeaponId(prev => prev === weaponId ? null : weaponId);
  };

  /**
   * 处理配件变化
   */
  const handleModsChange = (weaponId, mods) => {
    setWeaponMods(prev => ({
      ...prev,
      [weaponId]: mods
    }));
  };
  if (!weapons || weapons.length === 0) {
    return (
      <div className="empty-list">
        <p>未找到匹配的武器</p>
      </div>
    );
  }

  return (
    <div className="weapon-list-container">
      <div className="weapon-list">
        {weapons.map((weapon) => {
          // isExpanded: 当前卡片是否展开
          const isExpanded = expandedWeaponId === weapon.id;
          // selectedMods: 当前武器在图鉴里选择的配件 id 列表
          const selectedMods = weaponMods[weapon.id] || [];
          // displayWeapon: 用于卡片展示/图表的“补齐字段 + 应用变体基础修改器”的武器对象
          const displayWeapon = getDisplayWeaponStats(weapon);
          
          return (
            <div key={weapon.id} className={`weapon-item-wrapper ${isExpanded ? 'expanded' : ''}`}>
              <div 
                className="weapon-item"
                onClick={() => toggleWeaponExpanded(weapon.id)}
              >
                {/* 武器图片和名称 */}
                <div className="weapon-basic-info">
                  {weapon.image ? (
                    <img src={weapon.image} alt={weapon.name} className="weapon-image" />
                  ) : null}
                  <div className="weapon-name-section">
                    <span className="weapon-name" style={{ fontSize: getFontSize(weapon.name) }}>
                      {weapon.name}
                    </span>
                    <div className="weapon-meta">
                      <button 
                        className="weapon-caliber"
                        onClick={(e) => { e.stopPropagation(); onCaliberClick(displayWeapon.caliber); }}
                        title="点击查看该口径的弹药"
                      >
                        {displayWeapon.caliber}
                      </button>
                      {displayWeapon.triggerDelay && displayWeapon.triggerDelay > 0 && (
                        <span className="trigger-delay">扳机延迟 {displayWeapon.triggerDelay} ms</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 武器属性 */}
                <div className="weapon-stats">
                  <div className="stat-item">
                    <span className="stat-label">甲伤</span>
                    <span className="stat-value">{(Number(displayWeapon.armorDamage) || 0).toFixed(1)}</span>
                    <span className="stat-label-secondary">每秒甲伤</span>
                    <span className="stat-value-secondary">{(Number(displayWeapon.armorDPS) || 0).toFixed(1)}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">肉伤</span>
                    <span className="stat-value">{(Number(displayWeapon.damage) || 0).toFixed(1)}</span>
                    <span className="stat-label-secondary">每秒肉伤</span>
                    <span className="stat-value-secondary">{(Number(displayWeapon.fleshDPS) || 0).toFixed(1)}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">射速</span>
                    <span className="stat-value">{Math.round(displayWeapon.fireRate)} RPM</span>
                    <span className="stat-label-secondary stat-label-dark">初速</span>
                    <span className="stat-value-secondary stat-value-dark">{Math.round(displayWeapon.muzzleVelocity)} m/s</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">头部</span>
                    <span className="stat-value">{((Number(displayWeapon.damage) || 0) * (Number(displayWeapon.headMultiplier) || 0)).toFixed(1)} (×{(Number(displayWeapon.headMultiplier) || 0).toFixed(1)})</span>
                    <span className="stat-label-secondary stat-label-dark">胸部</span>
                    <span className="stat-value-secondary stat-value-dark">{((Number(displayWeapon.damage) || 0) * (Number(displayWeapon.chestMultiplier) || 0)).toFixed(1)} (×{(Number(displayWeapon.chestMultiplier) || 0).toFixed(1)})</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">腹部</span>
                    <span className="stat-value">{((Number(displayWeapon.damage) || 0) * (Number(displayWeapon.abdomenMultiplier) || 0)).toFixed(1)} (×{(Number(displayWeapon.abdomenMultiplier) || 0).toFixed(1)})</span>
                    <span className="stat-label-secondary stat-label-dark">手部</span>
                    <span className="stat-value-secondary stat-value-dark">{((Number(displayWeapon.damage) || 0) * (Number(displayWeapon.upperArmMultiplier) || 0)).toFixed(1)} (×{(Number(displayWeapon.upperArmMultiplier) || 0).toFixed(1)})</span>
                  </div>
                </div>

                {/* 射程衰减图 */}
                <div className="weapon-chart">
                  <RangeDecayChart weapon={displayWeapon} rangeModifier={getRangeModifier(weapon)} />
                </div>
                
                {/* 展开指示器 */}
                <div className="expand-indicator">
                  <span className={`arrow ${isExpanded ? 'up' : 'down'}`}>▼</span>
                </div>
              </div>
              
              {/* 展开的配件面板 */}
              {isExpanded && (
                <div className="weapon-expanded-content">
                  <div className="expanded-left-section">
                    <WeaponModPanel 
                      weapon={weapon}
                      selectedMods={selectedMods}
                      onModsChange={(mods) => handleModsChange(weapon.id, mods)}
                    />
                  </div>
                  <div className="expanded-middle-section">
                    <ModifiedWeaponStats 
                      weapon={weapon}
                      selectedMods={selectedMods}
                      showOnlyStats={true}
                    />
                  </div>
                  <div className="expanded-right-section">
                    <ModifiedWeaponStats 
                      weapon={weapon}
                      selectedMods={selectedMods}
                      showOnlyChart={true}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
