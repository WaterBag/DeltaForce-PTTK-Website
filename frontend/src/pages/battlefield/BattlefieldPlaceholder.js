import React from 'react';
import { useGameData } from '../../hooks/useGameData';
import './BattlefieldPages.css';

export function BattlefieldPlaceholder({ title, description, nextSteps }) {
  const { data, loading, source } = useGameData('battlefield');
  const weaponCount = data.weapons?.length || 0;
  const modCount = data.modifications?.length || 0;

  return (
    <section className="battlefield-page">
      <div className="battlefield-header">
        <div>
          <p className="battlefield-kicker">战场模式</p>
          <h1>{title}</h1>
        </div>
        <div className="battlefield-data-chip">
          {loading ? '加载中' : `${weaponCount} 武器 / ${modCount} 配件`}
        </div>
      </div>

      <div className="battlefield-empty-panel">
        <div className="battlefield-empty-main">
          <h2>结构已准备，等待战场数据</h2>
          <p>{description}</p>
        </div>
        <div className="battlefield-empty-grid">
          <div>
            <span>数据源</span>
            <strong>/data/battlefield</strong>
          </div>
          <div>
            <span>加载状态</span>
            <strong>{source}</strong>
          </div>
          <div>
            <span>后续接入</span>
            <strong>{nextSteps}</strong>
          </div>
        </div>
      </div>
    </section>
  );
}
