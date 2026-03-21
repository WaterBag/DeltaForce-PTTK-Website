import React from 'react';
import './Sidebar.css';

export function Sidebar({ currentView, setCurrentView }) {
  const hitProbabilities = {
    head: 0.1724,
    chest: 0.3046,
    abdomen: 0.1897,
    limbs: 0.3333,
    totalHits: 348,
  };

  return (
    <aside className="app-sidebar">
      <nav className="sidebar-nav">
        <ul>
          <li
            className={`nav-item ${currentView === 'ttkSimulator' ? 'active' : ''}`}
            onClick={() => setCurrentView('ttkSimulator')}
          >
            模拟期望击杀时间
          </li>

          <li
            className={`nav-item ${currentView === 'dataQuery' ? 'active' : ''}`}
            onClick={() => setCurrentView('dataQuery')}
          >
            查询期望击杀时间
          </li>

          <li
            className={`nav-item ${currentView === 'simulator' ? 'active' : ''}`}
            onClick={() => setCurrentView('simulator')}
          >
            伤害模拟器
          </li>

          <li
            className={`nav-item ${currentView === 'dataLibrary' ? 'active' : ''}`}
            onClick={() => setCurrentView('dataLibrary')}
          >
            数据图鉴
          </li>
        </ul>
      </nav>

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

      <div className="icp-info">桂ICP备2025070376号</div>
    </aside>
  );
}
