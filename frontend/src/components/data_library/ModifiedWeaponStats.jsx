import React, { useMemo } from 'react';
import './ModifiedWeaponStats.css';
import { modifications } from '../../assets/data/modifications';
import { weapons } from '../../assets/data/weapons';
import { RangeDecayChartFull } from './RangeDecayChartFull';

/**
 * 应用配件后的武器属性显示组件
 * @param {Object} props - 组件属性
 * @param {Object} props.weapon - 原始武器对象
 * @param {Array} props.selectedMods - 选中的配件ID数组
 * @param {Boolean} props.showOnlyStats - 只显示射速初速
 * @param {Boolean} props.showOnlyChart - 只显示射程图
 * @returns {JSX.Element} 修改后属性组件
 */
export function ModifiedWeaponStats({ weapon, selectedMods, showOnlyStats = false, showOnlyChart = false }) {
  /**
   * 计算应用配件后的武器属性
   */
  const modifiedStats = useMemo(() => {
    if (!weapon) {
      return null;
    }
    
    // 首先确定基础数据和基础修改器
    // 如果是变体武器,需要先应用其对应配件的修改器作为基准
    let baseFireRate = weapon.fireRate;
    let baseMuzzleVelocity = weapon.muzzleVelocity;
    let baseRange1 = weapon.range1;
    let baseRange2 = weapon.range2;
    let baseRange3 = weapon.range3;
    let baseRange4 = weapon.range4;
    let baseRange5 = weapon.range5;
    let baseDecay1 = weapon.decay1;
    let baseDecay2 = weapon.decay2;
    let baseDecay3 = weapon.decay3;
    let baseDecay4 = weapon.decay4;
    let baseDecay5 = weapon.decay5;
    
    let baseFireRateModifier = 0;
    let baseMuzzleVelocityModifier = 0;
    let baseRangeModifier = 0;

    // 如果是变体武器,查找其对应的配件并应用基础修改器
    if (weapon.isModification) {
      const variantMod = modifications.find(m => {
        if (typeof m.effects?.dataQueryName === 'string') {
          return m.effects.dataQueryName === weapon.name;
        } else if (typeof m.effects?.dataQueryName === 'object') {
          return Object.values(m.effects.dataQueryName).includes(weapon.name);
        }
        return false;
      });

      if (variantMod && variantMod.effects) {
        baseFireRateModifier = variantMod.effects.fireRateModifier || 0;
        baseMuzzleVelocityModifier = variantMod.effects.muzzleVelocityModifier || 0;
        baseRangeModifier = variantMod.effects.rangeModifier || 0;
        
        // 应用基础修改器
        baseFireRate *= (1 + baseFireRateModifier);
        baseMuzzleVelocity *= (1 + baseMuzzleVelocityModifier);
        baseRange1 *= (1 + baseRangeModifier);
        baseRange2 *= (1 + baseRangeModifier);
        baseRange3 *= (1 + baseRangeModifier);
        baseRange4 *= (1 + baseRangeModifier);
        baseRange5 *= (1 + baseRangeModifier);
      }
    }
    
    // 如果没有选择额外配件,返回基础属性(对于变体武器,这已经包含了其对应配件的效果)
    if (!selectedMods || selectedMods.length === 0) {
      return {
        fireRate: baseFireRate,
        muzzleVelocity: baseMuzzleVelocity,
        range1: baseRange1,
        range2: baseRange2,
        range3: baseRange3,
        range4: baseRange4,
        range5: baseRange5,
        decay1: baseDecay1,
        decay2: baseDecay2,
        decay3: baseDecay3,
        decay4: baseDecay4,
        decay5: baseDecay5,
        fireRateChange: baseFireRateModifier,
        muzzleVelocityChange: baseMuzzleVelocityModifier,
        rangeChange: baseRangeModifier,
      };
    }

    // 有选择额外配件,需要在基础上叠加这些配件的效果
    // 累加所有选择的配件的百分比效果
    let totalFireRateModifier = baseFireRateModifier;
    let totalRangeModifier = baseRangeModifier;
    let totalMuzzleVelocityModifier = baseMuzzleVelocityModifier;

    selectedMods.forEach(modId => {
      const mod = modifications.find(m => m.id === modId);
      if (mod && mod.effects) {
        totalFireRateModifier += mod.effects.fireRateModifier || 0;
        totalRangeModifier += mod.effects.rangeModifier || 0;
        totalMuzzleVelocityModifier += mod.effects.muzzleVelocityModifier || 0;
      }
    });

    // 从原始武器数据应用所有累积的修改器
    const finalFireRate = weapon.fireRate * (1 + totalFireRateModifier);
    const finalMuzzleVelocity = weapon.muzzleVelocity * (1 + totalMuzzleVelocityModifier);
    const finalRange1 = weapon.range1 * (1 + totalRangeModifier);
    const finalRange2 = weapon.range2 * (1 + totalRangeModifier);
    const finalRange3 = weapon.range3 * (1 + totalRangeModifier);
    const finalRange4 = weapon.range4 * (1 + totalRangeModifier);
    const finalRange5 = weapon.range5 * (1 + totalRangeModifier);

    return {
      fireRate: finalFireRate,
      muzzleVelocity: finalMuzzleVelocity,
      range1: finalRange1,
      range2: finalRange2,
      range3: finalRange3,
      range4: finalRange4,
      range5: finalRange5,
      decay1: weapon.decay1,
      decay2: weapon.decay2,
      decay3: weapon.decay3,
      decay4: weapon.decay4,
      decay5: weapon.decay5,
      fireRateChange: totalFireRateModifier,
      muzzleVelocityChange: totalMuzzleVelocityModifier,
      rangeChange: totalRangeModifier,
    };
  }, [weapon, selectedMods]);

  if (!modifiedStats) {
    return null;
  }

  /**
   * 格式化变化百分比
   */
  const formatChange = (value) => {
    if (value === 0) return '';
    const percentage = (value * 100).toFixed(0);
    return value > 0 ? `+${percentage}%` : `${percentage}%`;
  };

  /**
   * 获取变化的CSS类名
   */
  const getChangeClass = (value) => {
    if (value > 0) return 'stat-increase';
    if (value < 0) return 'stat-decrease';
    return '';
  };

  // 构造用于图表的武器对象
  const chartWeapon = {
    ...weapon,
    range1: modifiedStats.range1,
    range2: modifiedStats.range2,
    range3: modifiedStats.range3,
    range4: modifiedStats.range4,
    range5: modifiedStats.range5,
    decay1: modifiedStats.decay1,
    decay2: modifiedStats.decay2,
    decay3: modifiedStats.decay3,
    decay4: modifiedStats.decay4,
    decay5: modifiedStats.decay5,
  };

  // 只显示射速和初速
  if (showOnlyStats) {
    // 计算每10m距离的飞行时间(ms)
    const timePerTenMeters = (10000 / modifiedStats.muzzleVelocity).toFixed(1);
    
    // 计算每秒伤害
    const armorDPS = (weapon.armorDamage * modifiedStats.fireRate / 60).toFixed(1);
    const fleshDPS = (weapon.damage * modifiedStats.fireRate / 60).toFixed(1);
    
    return (
      <div className="modified-weapon-stats">
        <div className="modified-stats-grid">
          <div className="modified-stat-item">
            <span className="stat-label">射速</span>
            <span className={`stat-value ${getChangeClass(modifiedStats.fireRateChange)}`}>
              {Math.round(modifiedStats.fireRate)} RPM
              {modifiedStats.fireRateChange !== 0 && (
                <span className="stat-change">{formatChange(modifiedStats.fireRateChange)}</span>
              )}
            </span>
          </div>
          
          <div className="modified-stat-item">
            <span className="stat-label">初速</span>
            <span className={`stat-value ${getChangeClass(modifiedStats.muzzleVelocityChange)}`}>
              {Math.round(modifiedStats.muzzleVelocity)} m/s
              {modifiedStats.muzzleVelocityChange !== 0 && (
                <span className="stat-change">{formatChange(modifiedStats.muzzleVelocityChange)}</span>
              )}
            </span>
          </div>
          
          <div className="modified-stat-item">
            <span className="stat-label">每秒甲伤</span>
            <span className={`stat-value ${getChangeClass(modifiedStats.fireRateChange)}`}>
              {armorDPS}
              {modifiedStats.fireRateChange !== 0 && (
                <span className="stat-change">{formatChange(modifiedStats.fireRateChange)}</span>
              )}
            </span>
          </div>
          
          <div className="modified-stat-item">
            <span className="stat-label">每秒肉伤</span>
            <span className={`stat-value ${getChangeClass(modifiedStats.fireRateChange)}`}>
              {fleshDPS}
              {modifiedStats.fireRateChange !== 0 && (
                <span className="stat-change">{formatChange(modifiedStats.fireRateChange)}</span>
              )}
            </span>
          </div>
          
          <div className="modified-stat-item">
            <span className="stat-label">初速影响</span>
            <span className="stat-value stat-value-small">
              每10m增加{timePerTenMeters}ms
            </span>
          </div>
        </div>
      </div>
    );
  }

  // 只显示射程图
  if (showOnlyChart) {
    return (
      <div className="modified-weapon-stats">
        <div className="modified-stats-grid">
          <div className="modified-stat-item stat-item-chart">
            <span className="stat-label">射程衰减</span>
            <div className="stat-chart-container">
              <RangeDecayChartFull weapon={chartWeapon} rangeModifier={0} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 显示全部（默认）
  return (
    <div className="modified-weapon-stats">
      <div className="modified-stats-grid">
        <div className="modified-stat-item">
          <span className="stat-label">射速</span>
          <span className={`stat-value ${getChangeClass(modifiedStats.fireRateChange)}`}>
            {Math.round(modifiedStats.fireRate)} RPM
            {modifiedStats.fireRateChange !== 0 && (
              <span className="stat-change">{formatChange(modifiedStats.fireRateChange)}</span>
            )}
          </span>
        </div>
        
        <div className="modified-stat-item">
          <span className="stat-label">初速</span>
          <span className={`stat-value ${getChangeClass(modifiedStats.muzzleVelocityChange)}`}>
            {Math.round(modifiedStats.muzzleVelocity)} m/s
            {modifiedStats.muzzleVelocityChange !== 0 && (
              <span className="stat-change">{formatChange(modifiedStats.muzzleVelocityChange)}</span>
            )}
          </span>
        </div>
        
        <div className="modified-stat-item stat-item-chart">
          <span className="stat-label">射程</span>
          <div className="stat-chart-container">
            <RangeDecayChartFull weapon={chartWeapon} rangeModifier={0} />
          </div>
        </div>
      </div>
    </div>
  );
}
