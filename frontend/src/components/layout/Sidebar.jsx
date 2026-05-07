import React from 'react';
import './Sidebar.css';
import { getGameModeConfig } from '../../config/gameModes';

export function Sidebar({ currentMode, currentView, setCurrentView }) {
  const modeConfig = getGameModeConfig(currentMode);
  const hitProbabilities = {
    head: 0.1724,
    chest: 0.3046,
    abdomen: 0.1897,
    limbs: 0.3333,
    totalHits: 348,
  };

  return (
    <aside className="app-sidebar">
      <nav className="sidebar-nav" aria-label={`${modeConfig.label}导航`}>
        <ul>
          {modeConfig.views.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className={`nav-item ${currentView === item.id ? 'active' : ''}`}
                onClick={() => setCurrentView(item.id)}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {currentMode === 'firefight' && (
        <div className="probability-info">
          <h4>当前使用部位概率</h4>
          <div className="probability-row">
            <div className="probability-item">
              <span className="label">头部:</span>
              <span className="value">{(hitProbabilities.head * 100).toFixed(2)}%</span>
            </div>
            <div className="probability-item">
              <span className="label">胸部:</span>
              <span className="value">{(hitProbabilities.chest * 100).toFixed(2)}%</span>
            </div>
          </div>
          <div className="probability-row">
            <div className="probability-item">
              <span className="label">腹部:</span>
              <span className="value">{(hitProbabilities.abdomen * 100).toFixed(2)}%</span>
            </div>
            <div className="probability-item">
              <span className="label">四肢:</span>
              <span className="value">{(hitProbabilities.limbs * 100).toFixed(2)}%</span>
            </div>
          </div>
          <div className="probability-total">共 {hitProbabilities.totalHits} 次受击记录</div>
        </div>
      )}

      <div className="icp-info">桂ICP备2025070376号</div>
    </aside>
  );
}
