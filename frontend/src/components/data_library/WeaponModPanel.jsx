import React, { useMemo } from 'react';
import './WeaponModPanel.css';
import { modifications } from '../../assets/data/modifications';
import {
  buildModsById,
  computeUnlockedSlots,
  mergeUnlockedSlots,
  isModSelectable,
  toggleModSelection,
} from '../../utils/modSelectionUtils';

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

      // 数据图鉴里不展示“变体配件”（变体武器已作为独立条目展示）
      // 约定：带 damageChange 或 specialRange 的配件属于变体配件
      if (mod.effects?.damageChange === true) return false;
      if (mod.effects?.specialRange === true) return false;

      // 检查配件是否有实际效果
      if (!mod.effects) return false;
      
      const effectValues = Object.values(mod.effects);
      const hasRealEffect = effectValues.some(
        value => typeof value === 'number' && value !== 0
      );

      const hasUnlockSlots = Array.isArray(mod.effects.unlockSlots) && mod.effects.unlockSlots.length > 0;
      
      return hasRealEffect || hasUnlockSlots;
    });
  }, [weapon]);

  // 将可用配件数组映射为 { [id]: mod }，便于 O(1) 取配件数据
  const modsById = useMemo(() => buildModsById(availableMods), [availableMods]);

  // 变体武器（isModification=true）在数据图鉴中作为“已应用某个变体配件”的独立条目。
  // 因为图鉴面板隐藏了变体配件本身，所以需要把该变体配件的 unlockSlots 当作“基础已解锁槽位”。
  const baseUnlockedSlots = useMemo(() => {
    // 仅对“变体武器条目”注入基础解锁槽位；普通武器条目没有此概念
    if (!weapon?.isModification) return new Set();

    // 当前（变体）武器名：例如 “MCX-LT-焰魂枪管”
    const weaponName = weapon?.name;
    if (!weaponName) return new Set();

    // 找到“指向该变体武器”的变体配件（effects.dataQueryName / btkQueryName 指向 weapons.js 的变体条目）
    const unlocker = modifications.find((mod) => {
      // 变体配件在 DataQuery / BTK 查询里切换到的武器名（可能是 string 或 string[]）
      const dataQueryName = mod?.effects?.dataQueryName;
      // 同上：用于 BTK 模式的切换名
      const btkQueryName = mod?.effects?.btkQueryName;

      const matchDataQuery =
        dataQueryName === weaponName ||
        (Array.isArray(dataQueryName) && dataQueryName.includes(weaponName));

      const matchBtkQuery =
        btkQueryName === weaponName ||
        (Array.isArray(btkQueryName) && btkQueryName.includes(weaponName));

      return matchDataQuery || matchBtkQuery;
    });

    // 该变体配件能解锁的槽位列表：例如 ["外罩"]
    const unlockSlots = unlocker?.effects?.unlockSlots;
    if (!Array.isArray(unlockSlots)) return new Set();
    return new Set(unlockSlots.filter(Boolean));
  }, [weapon]);

  const unlockedSlots = useMemo(() => {
    // 由当前已选中的配件解锁出来的槽位
    const unlockedFromSelected = computeUnlockedSlots(selectedMods, modsById);
    // 最终解锁槽位 = 变体武器自带基础解锁槽位 + 已选配件解锁槽位
    return mergeUnlockedSlots(baseUnlockedSlots, unlockedFromSelected);
  }, [selectedMods, modsById, baseUnlockedSlots]);

  /**
   * 将配件按类型分组
   */
  const groupedMods = useMemo(() => {
    // groups: { [slotTypeName]: Mod[] }
    const groups = {};
    availableMods.forEach(mod => {
      // 约定：mod.type 为槽位数组，第一项用于分组展示
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
    // 当前点击的配件对象
    const mod = modsById[modId];
    if (!mod) return;

    // 当前配件是否已被选中
    const isCurrentlySelected = selectedMods.includes(modId);
    // 未解锁槽位则禁用点击
    if (!isCurrentlySelected && !isModSelectable(mod, unlockedSlots)) {
      return;
    }

    const newMods = toggleModSelection({
      modId,
      isSelected: !isCurrentlySelected,
      // 当前已选配件 id 列表
      selectedModIds: selectedMods,
      // 当前武器可用配件列表（用于冲突槽位判断、级联移除等）
      availableMods,
      // 变体武器条目自带的“基础解锁槽位”（例如焰魂枪管解锁外罩槽位）
      baseUnlockedSlots,
    });
    
    // 通知父组件配件变化
    onModsChange(newMods);
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
                  className={`mod-option ${selectedMods.includes(mod.id) ? 'selected' : ''} ${!selectedMods.includes(mod.id) && !isModSelectable(mod, unlockedSlots) ? 'disabled' : ''}`}
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
