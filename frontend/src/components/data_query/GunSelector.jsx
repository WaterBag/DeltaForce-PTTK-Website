import React from "react";
import './GunSelector.css'
import { weapons } from '../../assets/data/weapons';

/**
 * 武器名称到武器详细信息的映射对象
 * 用于快速通过武器名称查找对应的武器详细信息
 */
const weaponDetailsMap = weapons.reduce((acc, weapon) => {
    acc[weapon.name] = weapon;
    return acc;
}, {});

/**
 * 武器选择器组件
 * 显示可用武器列表，允许用户选择武器进行TTK分析
 * 
 * @param {Object} props - 组件属性
 * @param {string[]} props.guns - 可用武器名称数组
 * @param {Function} props.onGunSelect - 武器选择回调函数，参数为选中的武器名称
 * @returns {JSX.Element} 武器选择器组件
 */
export function GunSelector({ guns, onGunSelect }) {

    // 如果没有可用武器或武器列表为空，显示提示信息
    if (!guns || guns.length === 0) {
        return <div className="comparison-list-empty">请先选择头盔护甲</div>;
    }

    return (
        <div className="gun-selector">
            {
                guns.map(gunName => {
                    const weapon = weaponDetailsMap[gunName];
                    // 如果找不到对应的武器信息，跳过渲染
                    if(!weapon) return null;

                    return(
                        <div 
                            className="gun-list-item" 
                            onClick={() => onGunSelect(weapon.name)} // 点击时传递武器名称
                            key={weapon.id} // 使用武器ID作为唯一键
                        >
                            {/* 武器图片和名称显示 */}
                            <img src={weapon.image} alt={weapon.name} className="gun-item-image" />
                            <span className="gun-item-name">{weapon.name}</span>
                        </div>
                    )
                })
            }
        </div>
    );
}
