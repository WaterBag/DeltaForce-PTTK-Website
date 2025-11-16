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
  const [expandedWeaponId, setExpandedWeaponId] = React.useState(null);
  const [weaponMods, setWeaponMods] = React.useState({});

  /**
   * 查找武器对应的配件并获取射程修正值
   * @param {Object} weapon - 武器对象
   * @returns {number} 射程修正值（如0.3表示+30%）
   */
  const getRangeModifier = (weapon) => {
    if (!weapon.isModification) return 0;
    
    // 根据武器名称查找对应的配件
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
      return weapon;
    }

    // 查找对应的配件
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

    // 应用配件修改器
    const fireRateModifier = mod.effects.fireRateModifier || 0;
    const muzzleVelocityModifier = mod.effects.muzzleVelocityModifier || 0;

    // 计算修改后的属性
    const modifiedFireRate = weapon.fireRate * (1 + fireRateModifier);
    const modifiedMuzzleVelocity = weapon.muzzleVelocity * (1 + muzzleVelocityModifier);
    const modifiedArmorDPS = (weapon.armorDamage * modifiedFireRate) / 60;
    const modifiedFleshDPS = (weapon.damage * modifiedFireRate) / 60;

    return {
      ...weapon,
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
          const isExpanded = expandedWeaponId === weapon.id;
          const selectedMods = weaponMods[weapon.id] || [];
          const displayWeapon = getDisplayWeaponStats(weapon);
          
          return (
            <div key={weapon.id} className={`weapon-item-wrapper ${isExpanded ? 'expanded' : ''}`}>
              <div 
                className="weapon-item"
                onClick={() => toggleWeaponExpanded(weapon.id)}
              >
                {/* 武器图片和名称 */}
                <div className="weapon-basic-info">
                  <img 
                    src={weapon.image} 
                    alt={weapon.name} 
                    className="weapon-image"
                  />
                  <div className="weapon-name-section">
                    <span className="weapon-name" style={{ fontSize: getFontSize(weapon.name) }}>
                      {weapon.name}
                    </span>
                    <div className="weapon-meta">
                      <button 
                        className="weapon-caliber"
                        onClick={(e) => { e.stopPropagation(); onCaliberClick(weapon.caliber); }}
                        title="点击查看该口径的弹药"
                      >
                        {weapon.caliber}
                      </button>
                      {weapon.triggerDelay && weapon.triggerDelay > 0 && (
                        <span className="trigger-delay">扳机延迟 {weapon.triggerDelay} ms</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 武器属性 */}
                <div className="weapon-stats">
                  <div className="stat-item">
                    <span className="stat-label">甲伤</span>
                    <span className="stat-value">{weapon.armorDamage.toFixed(1)}</span>
                    <span className="stat-label-secondary">每秒甲伤</span>
                    <span className="stat-value-secondary">{displayWeapon.armorDPS.toFixed(1)}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">肉伤</span>
                    <span className="stat-value">{weapon.damage.toFixed(1)}</span>
                    <span className="stat-label-secondary">每秒肉伤</span>
                    <span className="stat-value-secondary">{displayWeapon.fleshDPS.toFixed(1)}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">射速</span>
                    <span className="stat-value">{Math.round(displayWeapon.fireRate)} RPM</span>
                    <span className="stat-label-secondary stat-label-dark">初速</span>
                    <span className="stat-value-secondary stat-value-dark">{Math.round(displayWeapon.muzzleVelocity)} m/s</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">头部</span>
                    <span className="stat-value">{(weapon.damage * weapon.headMultiplier).toFixed(1)} (×{weapon.headMultiplier.toFixed(1)})</span>
                    <span className="stat-label-secondary stat-label-dark">胸部</span>
                    <span className="stat-value-secondary stat-value-dark">{(weapon.damage * weapon.chestMultiplier).toFixed(1)} (×{weapon.chestMultiplier.toFixed(1)})</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">腹部</span>
                    <span className="stat-value">{(weapon.damage * weapon.abdomenMultiplier).toFixed(1)} (×{weapon.abdomenMultiplier.toFixed(1)})</span>
                    <span className="stat-label-secondary stat-label-dark">手部</span>
                    <span className="stat-value-secondary stat-value-dark">{(weapon.damage * weapon.upperArmMultiplier).toFixed(1)} (×{weapon.upperArmMultiplier.toFixed(1)})</span>
                  </div>
                </div>

                {/* 射程衰减图 */}
                <div className="weapon-chart">
                  <RangeDecayChart weapon={weapon} rangeModifier={getRangeModifier(weapon)} />
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
