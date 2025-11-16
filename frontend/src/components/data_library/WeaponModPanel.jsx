import React, { useMemo } from 'react';
import './WeaponModPanel.css';
import { modifications } from '../../assets/data/modifications';

/**
 * 武器配件面板组件
 * 显示可用配件并允许选择应用
 * @param {Object} props - 组件属性
 * @param {Object} props.weapon - 武器对象
 * @param {Array} props.selectedMods - 当前选中的配件ID数组
 * @param {Function} props.onModsChange - 配件变化回调
 * @returns {JSX.Element} 配件面板组件
 */
export function WeaponModPanel({ weapon, selectedMods = [], onModsChange }) {

  /**
   * 获取武器可用的配件列表
   */
  const availableMods = useMemo(() => {
    if (!weapon) return [];
    
    return modifications.filter(mod => {
      // 检查配件是否适用于当前武器
      const isApplicable = mod.appliesTo.includes(weapon.name);
      if (!isApplicable) return false;

      // 排除变体武器配件(带有damageChange标记的配件)
      if (mod.effects?.damageChange === true) return false;

      // 检查配件是否有实际效果
      if (!mod.effects) return false;
      
      const effectValues = Object.values(mod.effects);
      const hasRealEffect = effectValues.some(
        value => typeof value === 'number' && value !== 0
      );
      
      return hasRealEffect;
    });
  }, [weapon]);

  /**
   * 将配件按类型分组
   */
  const groupedMods = useMemo(() => {
    const groups = {};
    availableMods.forEach(mod => {
      const type = mod.type[0] || '未分类';
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(mod);
    });
    return groups;
  }, [availableMods]);

  /**
   * 处理配件选择
   */
  const handleModToggle = (modId) => {
    const mod = availableMods.find(m => m.id === modId);
    if (!mod?.type) return;
    
    const newModSlots = mod.type;
    
    let newMods;
    const isCurrentlySelected = selectedMods.includes(modId);
    
    if (isCurrentlySelected) {
      // 取消选择
      newMods = selectedMods.filter(id => id !== modId);
    } else {
      // 选择新配件，移除冲突的配件
      const nonConflictingMods = selectedMods.filter(oldModId => {
        const oldMod = availableMods.find(m => m.id === oldModId);
        if (!oldMod?.type) return false;
        const hasConflict = oldMod.type.some(slot => newModSlots.includes(slot));
        return !hasConflict;
      });
      newMods = [...nonConflictingMods, modId];
    }
    
    // 通知父组件配件变化
    onModsChange(newMods);
  };

  /**
   * 重置所有配件选择
   */
  const handleReset = () => {
    onModsChange([]);
  };

  if (availableMods.length === 0) {
    return (
      <div className="weapon-mod-panel">
        <div className="no-mods-message">该武器暂无可用配件</div>
      </div>
    );
  }

  return (
    <div className="weapon-mod-panel">
      <div className="mod-groups">
        {Object.keys(groupedMods).map(type => (
          <div key={type} className="mod-group">
            <div className="mod-group-title">{type}</div>
            <div className="mod-options">
              {groupedMods[type].map(mod => (
                <div
                  key={mod.id}
                  className={`mod-option ${selectedMods.includes(mod.id) ? 'selected' : ''}`}
                  onClick={() => handleModToggle(mod.id)}
                >
                  {mod.name}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
