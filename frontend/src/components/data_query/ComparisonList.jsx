import React from 'react';
import './ComparisonList.css';
import { getRarityClass } from '../../utils/styleUtils';
import { weapons } from '../../assets/data/weapons.js';
import { ammos } from '../../assets/data/ammos.js';
import { modifications } from '../../assets/data/modifications.js';

/**
 * 武器信息映射表 - 将武器名称映射到对应的武器信息对象
 * 用于快速查找武器属性，如口径、稀有度等
 */
const weaponInfoMap = weapons.reduce((acc, w) => {
  acc[w.name] = w;
  return acc;
}, {});

/**
 * 弹药信息映射表 - 将口径和弹药名称组合为键，映射到对应的弹药信息对象
 * 用于快速查找弹药属性，如稀有度、伤害等
 */
const ammoInfoMap = ammos.reduce((acc, a) => {
  const key = `${a.caliber}-${a.name}`;
  acc[key] = a;
  return acc;
}, {});

/**
 * 对比列表组件 - 显示已添加的武器配置对比项
 * 提供颜色指示、弹药稀有度显示、配件数量提示和删除功能
 *
 * @param {Object} props - 组件属性
 * @param {Array} props.lines - 对比线配置数组
 * @param {Function} props.onRemoveLine - 删除对比线的回调函数
 * @returns {JSX.Element} 对比列表组件
 */
export function ComparisonList({ lines, onRemoveLine }) {
  // 空状态处理：如果没有对比线，显示提示信息
  if (!lines || lines.length === 0) {
    return <div className="comparison-list-empty">请从左侧可用武器中添加配置进行对比</div>;
  }

  return (
    <ul className="comparison-list">
      {lines.map(line => {
        // 根据武器名称查找武器信息
        const weapon = weaponInfoMap[line.gunName];
        const weaponCaliber = weapon ? weapon.caliber : '';

        // 根据口径和弹药名称构造唯一键，查找弹药信息
        const ammoKey = `${weaponCaliber}-${line.bulletName}`;
        const ammo = ammoInfoMap[ammoKey];
        const ammoRarity = ammo ? ammo.rarity : '';

        // 查找配件的真实名称，用于悬停提示
        const modNames = (line.mods || []).map(
          modId => modifications.find(m => m.id === modId)?.name || modId
        );

        return (
          <li key={line.id} className="comparison-list-item">
            {/* 颜色指示器 - 与图表中的曲线颜色对应 */}
            <span className="color-indicator" style={{ backgroundColor: line.color }}></span>

            {/* 对比项名称显示 */}
            <span className="comparison-line-name">
              {line.gunName}-{/* 弹药名称，根据稀有度应用样式 */}
              <span className={getRarityClass(ammoRarity)}>{line.bulletName}</span>
              {/* 配件数量指示器 - 鼠标悬停显示配件详情 */}
              {line.mods && line.mods.length > 0 && (
                <span className="mods-indicator" title={modNames.join(', ')}>
                  (+{line.mods.length})
                </span>
              )}
            </span>

            {/* 删除按钮 */}
            <button
              className="remove-button"
              onClick={() => onRemoveLine(line.id)}
              aria-label="删除此对比项"
            >
              &times;
            </button>
          </li>
        );
      })}
    </ul>
  );
}
