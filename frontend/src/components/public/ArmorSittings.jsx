import armors from '../../assets/data/armors';
import helmets from '../../assets/data/helmets';
import { GenericSelector } from '../public/GenericSelector';
import { getProtectionLevelClass } from '../../utils/styleUtils';
import './ArmorSittings.css';

/**
 * 头盔选择器组件 - 基于GenericSelector封装的专用头盔选择器
 * 提供头盔选择功能，显示头盔图片和名称
 *
 * @param {Object} props - 组件属性
 * @param {Object|null} props.selectedHelmet - 当前选中的头盔对象
 * @param {Function} props.onSelect - 头盔选择回调函数
 * @param {Array} props.options - 可用的头盔选项数组
 * @returns {JSX.Element} 头盔选择器组件
 */
export const HelmetSelector = ({ selectedHelmet, onSelect, options }) => {
  return (
    <GenericSelector
      options={options}
      selectedOption={selectedHelmet}
      onSelect={onSelect}
      placeholder="选择头盔"
      className="helmet-selector"
      searchable={false}
      renderOption={helmet => (
        <>
          <img src={helmet.image} alt={helmet.name} className="helmet-option-image" />
          <span className={`helmet-option-name ${getProtectionLevelClass(helmet.level)}`}>
            {helmet.name}
          </span>
        </>
      )}
      renderSelected={helmet => (
        <>
          <img src={helmet.image} alt={helmet.name} className="helmet-option-image" />
          <span className={`helmet-option-name ${getProtectionLevelClass(helmet.level)}`}>
            {helmet.name}
          </span>
        </>
      )}
    />
  );
};

/**
 * 护甲选择器组件 - 基于GenericSelector封装的专用护甲选择器
 * 提供护甲选择功能，显示护甲图片和名称
 *
 * @param {Object} props - 组件属性
 * @param {Object|null} props.selectedArmor - 当前选中的护甲对象
 * @param {Function} props.onSelect - 护甲选择回调函数
 * @param {Array} props.options - 可用的护甲选项数组
 * @returns {JSX.Element} 护甲选择器组件
 */
export const ArmorSelector = ({ selectedArmor, onSelect, options }) => {
  return (
    <GenericSelector
      options={options}
      selectedOption={selectedArmor}
      onSelect={onSelect}
      placeholder="选择护甲"
      className="armor-selector"
      searchable={false}
      renderOption={armor => (
        <>
          <img src={armor.image} alt={armor.name} className="helmet-option-image" />
          <span className={`helmet-option-name ${getProtectionLevelClass(armor.level)}`}>
            {armor.name}
          </span>
        </>
      )}
      renderSelected={armor => (
        <>
          <img src={armor.image} alt={armor.name} className="armor-option-image" />
          <span className={`armor-option-name ${getProtectionLevelClass(armor.level)}`}>
            {armor.name}
          </span>
        </>
      )}
    />
  );
};
