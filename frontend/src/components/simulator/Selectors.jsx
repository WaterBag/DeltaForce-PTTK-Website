import { GenericSelector } from '../public/GenericSelector.jsx';
import './Selectors.css'; // 样式文件
import { weapons } from '../../assets/data/weapons';
import { ammos } from '../../assets/data/ammos';

/**
 * 武器选择器组件 - 基于GenericSelector封装的专用武器选择器
 * 提供武器选择功能，显示武器图片和名称
 * 过滤掉变体武器，只显示基础武器选项
 * 
 * @param {Object} props - 组件属性
 * @param {Object|null} props.selectedWeapon - 当前选中的武器对象
 * @param {Function} props.onSelect - 武器选择回调函数
 * @returns {JSX.Element} 武器选择器组件
 */
export const WeaponSelector = ({ selectedWeapon, onSelect }) => {
  // 过滤武器列表，只选择不是变体的武器 (isModification 不为 true)
  const selectableWeapons = weapons.filter(weapon => !weapon.isModification);
  
  return (
    <GenericSelector
      options={selectableWeapons}
      selectedOption={selectedWeapon}
      onSelect={onSelect}
      placeholder="选择武器"
      className="weapon-selector"
      renderSelected={(weapon) => (
        <>
          <img src={weapon.image} alt={weapon.name} className="weapon-option-image" />
          <span className="weapon-option-name">{weapon.name}</span>
        </>
      )}
    />
  );
};
