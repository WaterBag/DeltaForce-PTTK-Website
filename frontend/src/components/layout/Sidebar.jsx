import React from 'react';
import './Sidebar.css';

/**
 * 侧边栏组件 - 显示导航菜单和受击概率信息
 * 提供应用导航功能并展示游戏中不同部位的受击概率统计
 * @param {Object} props - 组件属性
 * @param {string} props.currentView - 当前视图 ('dataQuery' 或 'simulator')
 * @param {Function} props.setCurrentView - 设置当前视图的函数
 * @returns {JSX.Element} 侧边栏组件
 */
export function Sidebar({ currentView, setCurrentView }) {
  // 受击概率数据 - 基于游戏统计的命中分布
  const hitProbabilities = {
    head: 0.1724, // 头部受击概率 (17.24%)
    chest: 0.3046, // 胸部受击概率 (30.46%)
    abdomen: 0.1897, // 腹部受击概率 (18.97%)
    limbs: 0.3333, // 四肢受击概率 (33.33%)
    totalHits: 348, // 总受击次数
  };

  return (
    <aside className="app-sidebar">
      <nav className="sidebar-nav">
        <ul>
          <li
            className={`nav-item ${currentView === 'dataQuery' ? 'active' : ''}`}
            onClick={() => setCurrentView('dataQuery')}
          >
            概率TTK折线图
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

      {/* 概率信息显示区域 - 放在sidebar底部 */}
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

      {/* ICP备案信息 - 放在最底部 */}
      <div className="icp-info">桂ICP备2025070376号</div>
    </aside>
  );
}
