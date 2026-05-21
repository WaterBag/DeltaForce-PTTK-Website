import React from 'react';
import './Header.css';
import BilibiliIcon from '../../assets/images/others/BilibiliIcon.png';
import { GAME_MODE_OPTIONS } from '../../config/gameModes';

export function Header({ currentMode, setCurrentMode }) {
  return (
    <header className="header">
      <div className="logo-wrap">
        <div className="logo">三角洲行动 枪械击杀用时查询</div>
        <div className="data-tag">当前数据：S9季中更新</div>
      </div>
      <div className="mode-switch" role="tablist" aria-label="游戏模式">
        {GAME_MODE_OPTIONS.map((mode) => (
          <button
            key={mode.id}
            type="button"
            className={`mode-switch-btn ${currentMode === mode.id ? 'active' : ''}`}
            onClick={() => setCurrentMode(mode.id)}
          >
            {mode.shortLabel}
          </button>
        ))}
      </div>
      <nav className="nav">
        <ul></ul>
      </nav>
      <a
        href="https://space.bilibili.com/22070515?spm_id_from=333.1007.0.0"
        target="_blank"
        rel="noopener noreferrer"
        className="bilibili-link"
      >
        <img src={BilibiliIcon} alt="Bilibili" className="nav-icon" />
        <span>作者主页</span>
      </a>
    </header>
  );
}
