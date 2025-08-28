import React from "react"; 
import './Header.css';
import BilibiliIcon from '../../assets/images/others/BilibiliIcon.png'

/**
 * 头部组件 - 显示应用标题和导航链接
 * 包含应用logo和外部链接（Bilibili作者主页）
 * @returns {JSX.Element} 头部组件
 */
export function Header() {
    return (
        <header className="header">
            <div className="logo">DeltaForce TTK</div>
            <nav className="nav">
                <ul>
                    
                </ul>
            </nav>
            <a 
                href={'https://space.bilibili.com/22070515?spm_id_from=333.1007.0.0'} 
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
