import React from 'react';
import './AmmoList.css';

/**
 * 弹药列表组件
 * 显示所有弹药的详细属性列表
 * @param {Object} props - 组件属性
 * @param {Array} props.ammos - 弹药数据数组
 * @returns {JSX.Element} 弹药列表组件
 */
export function AmmoList({ ammos }) {
  /**
   * 根据稀有度返回对应的颜色和emoji
   */
  const getRarityDisplay = (rarity) => {
    const rarityMap = {
      '红': { color: '#ff4444', emoji: '🔴' },
      '橙': { color: '#ff9800', emoji: '🟠' },
      '紫': { color: '#9c27b0', emoji: '🟣' },
      '蓝': { color: '#2196f3', emoji: '🔵' },
      '绿': { color: '#4caf50', emoji: '🟢' },
      '白': { color: '#e0e0e0', emoji: '⚪' },
    };
    return rarityMap[rarity] || { color: '#888', emoji: '⚫' };
  };

  if (!ammos || ammos.length === 0) {
    return (
      <div className="empty-list">
        <p>未找到匹配的弹药</p>
      </div>
    );
  }

  return (
    <div className="ammo-list-container">
      <div className="ammo-list">
        {ammos.map((ammo) => {
          const rarityDisplay = getRarityDisplay(ammo.rarity);
          
          return (
            <div key={ammo.id} className="ammo-item">
              {/* 弹药图片和基本信息 */}
              <div className="ammo-basic-info">
                <img 
                  src={ammo.image} 
                  alt={ammo.name} 
                  className="ammo-image"
                  style={{ backgroundColor: `${rarityDisplay.color}26` }}
                />
                <div className="ammo-name-section">
                  <span className="ammo-name" style={{ color: rarityDisplay.color }}>{ammo.name}</span>
                  <span className="ammo-caliber">{ammo.caliber}</span>
                </div>
              </div>

              {/* 核心属性 */}
              <div className="ammo-core-stats">
                <div className="stat-item">
                  <span className="stat-label">穿透</span>
                  <span className="stat-value">{ammo.penetration}级</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">肉伤系数</span>
                  <span className="stat-value">×{ammo.fleshDamageCoeff.toFixed(2)}</span>
                </div>
              </div>

              {/* 对护甲伤害系数（简洁版） */}
              <div className="ammo-armor-damage">
                <span className="armor-damage-label">对护甲伤害：</span>
                <div className="armor-damage-values">
                  <div className="armor-stat">
                    <span className="armor-level">1级</span>
                    <span className="armor-value">×{ammo.armor1.toFixed(2)}</span>
                  </div>
                  <div className="armor-stat">
                    <span className="armor-level">2级</span>
                    <span className="armor-value">×{ammo.armor2.toFixed(2)}</span>
                  </div>
                  <div className="armor-stat">
                    <span className="armor-level">3级</span>
                    <span className="armor-value">×{ammo.armor3.toFixed(2)}</span>
                  </div>
                  <div className="armor-stat">
                    <span className="armor-level">4级</span>
                    <span className="armor-value">×{ammo.armor4.toFixed(2)}</span>
                  </div>
                  <div className="armor-stat">
                    <span className="armor-level">5级</span>
                    <span className="armor-value">×{ammo.armor5.toFixed(2)}</span>
                  </div>
                  <div className="armor-stat">
                    <span className="armor-level">6级</span>
                    <span className="armor-value">×{ammo.armor6.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
