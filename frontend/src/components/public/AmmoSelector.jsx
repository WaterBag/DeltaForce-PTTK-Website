import { GenericSelector } from "./GenericSelector";
import { getRarityClass } from "../../utils/styleUtils"
import './AmmoSelector.css'

/**
 * 弹药选择器组件 - 基于GenericSelector封装的专用弹药选择器
 * 提供弹药选择功能，显示弹药图片、名称和口径
 * 支持根据弹药稀有度显示不同颜色样式
 * 
 * @param {Object} props - 组件属性
 * @param {Array} props.options - 可用的弹药选项数组
 * @param {Object|null} props.selectedAmmo - 当前选中的弹药对象
 * @param {Function} props.onSelect - 弹药选择回调函数
 * @param {string} props.placeholder - 未选择时的占位文本
 * @param {string} props.emptyOptionsMessage - 无可用选项时的提示文本
 * @returns {JSX.Element} 弹药选择器组件
 */
export const AmmoSelector = ({options, selectedAmmo, onSelect, placeholder, emptyOptionsMessage}) => {
  
  return (
    <GenericSelector
        options={options}
        selectedOption={selectedAmmo}
        onSelect={onSelect}
        placeholder={placeholder}
        emptyOptionsMessage={emptyOptionsMessage}
        searchable = {false}
        className='ammo-selector'
        renderSelected={(ammo) => (
            <div className="selected-content-wrapper">
                <img src={ammo.image} alt={ammo.name} className={`ammo-option-image ${getRarityClass(ammo.rarity)}`} />
                <div className="selected-ammo-text">
                    <span className="selected-ammo-name">{ammo.name}</span>
                    <span className="selected-ammo-caliber">{ammo.caliber}</span>
                </div>
            </div>
            )}
            renderOption={(ammo) => (
                <>
                    <img src={ammo.image} alt={ammo.name} className={`ammo-option-image ${getRarityClass(ammo.rarity)}`} />
                    <div className="option-text-wrapper">
                            <span className="option-ammo-name">{ammo.name}</span>
                            <span className="option-ammo-caliber">{ammo.caliber}</span>
                        </div>
                        <div className='ammo-option-info'>
                    </div>
                </>
            )}
    />
  )
}
