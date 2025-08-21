import React from "react";
import './GunSelector.css'
import { weapons } from '../../assets/data/weapons';

const weaponDetailsMap = weapons.reduce((acc, weapon) => {
    acc[weapon.name] = weapon;
    return acc;
}, {});

export function GunSelector({ guns, onGunSelect }) {

    return (
        <div className="gun-selector">
            {
                guns.map(gunName => {
                    const weapon = weaponDetailsMap[gunName];
                    if(!weapon) return null;

                    return(
                        <div 
                            className="gun-list-item" 
                            onClick={() => onGunSelect(weapon.name)} // 传递的依然是名字
                            key={weapon.id} // key 使用唯一的 weapon.id
                        >
                        {/* 6. 使用 weapon 对象里的 image 和 name 来渲染 */}
                        <img src={weapon.image} alt={weapon.name} className="gun-item-image" />
                        <span className="gun-item-name">{weapon.name}</span>
                    </div>
                    )
                })
            }
        </div>
    );
}