import React from 'react';
import './TargetStatus.css';

/**
 * 目标状态显示组件 - 实时显示假人状态信息
 * 包括血量条、头盔耐久度和护甲耐久度
 * 用于在模拟过程中直观展示目标当前状态
 *
 * @param {Object} props - 组件属性
 * @param {number} props.targetHp - 目标当前血量
 * @param {number} props.totalHp - 目标最大血量
 * @param {Object|null} props.helmet - 当前头盔对象
 * @param {Object|null} props.armor - 当前护甲对象
 * @param {number|null} props.currentHelmetDurability - 当前头盔耐久度
 * @param {number|null} props.currentArmorDurability - 当前护甲耐久度
 * @returns {JSX.Element} 目标状态显示组件
 */
export function TargetStatus({
  targetHp,
  totalHp,
  helmet,
  armor,
  currentHelmetDurability,
  currentArmorDurability,
}) {
  // 计算血量百分比，用于血量条显示
  const hpPercent = totalHp > 0 ? (Math.max(0, targetHp) / totalHp) * 100 : 0;

  return (
    <div className="target-status-panel">
      <h3>目标状态</h3>

      {/* 血量条显示区域 */}
      <div className="hp-bar-container">
        <div className="hp-bar" style={{ width: `${hpPercent}%` }}></div>
        <div className="hp-text">
          {targetHp.toFixed(1)} / {totalHp}
        </div>
      </div>

      {/* 护甲状态显示区域 */}
      <div className="status-display">
        {/* 头盔耐久度显示 */}
        <div className="status-item">
          <span className="label">当前头盔耐久:</span>
          <span className="value">
            {helmet ? `${currentHelmetDurability?.toFixed(1) || 'N/A'}` : '无'}
          </span>
        </div>

        {/* 护甲耐久度显示 */}
        <div className="status-item">
          <span className="label">当前护甲耐久:</span>
          <span className="value">
            {armor ? `${currentArmorDurability?.toFixed(1) || 'N/A'}` : '无'}
          </span>
        </div>
      </div>
    </div>
  );
}
