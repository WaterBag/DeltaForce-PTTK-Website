import React from 'react';
import './AmmoList.css';

const RARITY_META = {
  红: { color: '#d84b4b', label: '红' },
  橙: { color: '#c7832b', label: '橙' },
  紫: { color: '#8b63b5', label: '紫' },
  蓝: { color: '#3d7fa8', label: '蓝' },
  绿: { color: '#4f8a5b', label: '绿' },
  白: { color: '#7a8582', label: '白' },
};

function formatCoeff(value) {
  return `x${(Number(value) || 0).toFixed(2)}`;
}

function ArmorCoeff({ level, value }) {
  return (
    <div className="armor-stat">
      <span className="armor-level">{level}级</span>
      <span className="armor-value">{formatCoeff(value)}</span>
    </div>
  );
}

export function AmmoList({ ammos }) {
  if (!ammos || ammos.length === 0) {
    return (
      <div className="empty-list">
        <p>未找到匹配的弹药</p>
      </div>
    );
  }

  return (
    <div className="ammo-list-container">
      <div className="ammo-grid-header">
        <span>弹药</span>
        <span>穿透 / 肉伤</span>
        <span>护甲系数</span>
      </div>

      <div className="ammo-list">
        {ammos.map((ammo) => {
          const rarity = RARITY_META[ammo.rarity] || { color: '#7a8582', label: ammo.rarity || '-' };

          return (
            <article key={ammo.id} className="ammo-item">
              <div className="ammo-identity">
                <img
                  src={ammo.image}
                  alt={ammo.name}
                  className="ammo-image"
                  style={{ backgroundColor: `${rarity.color}22` }}
                />
                <div className="ammo-name-section">
                  <span className="ammo-name" style={{ color: rarity.color }}>{ammo.name}</span>
                  <span className="ammo-meta">
                    <span className="ammo-caliber">{ammo.caliber}</span>
                    <span className="rarity-pill" style={{ borderColor: rarity.color, color: rarity.color }}>
                      {rarity.label}
                    </span>
                  </span>
                </div>
              </div>

              <div className="ammo-core-stats">
                <div className="ammo-stat">
                  <span className="stat-label">穿透</span>
                  <span className="stat-value">{Number(ammo.penetration) || 0}级</span>
                </div>
                <div className="ammo-stat">
                  <span className="stat-label">肉伤系数</span>
                  <span className="stat-value">{formatCoeff(ammo.fleshDamageCoeff)}</span>
                </div>
              </div>

              <div className="armor-damage-values">
                <ArmorCoeff level={1} value={ammo.armor1} />
                <ArmorCoeff level={2} value={ammo.armor2} />
                <ArmorCoeff level={3} value={ammo.armor3} />
                <ArmorCoeff level={4} value={ammo.armor4} />
                <ArmorCoeff level={5} value={ammo.armor5} />
                <ArmorCoeff level={6} value={ammo.armor6} />
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
