import React from "react";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import './Layout.css';

/**
 * 布局组件 - 应用的主要布局容器
 * 组合Header、Sidebar和主内容区域，提供一致的应用布局
 * @param {Object} props - 组件属性
 * @param {React.ReactNode} props.children - 要渲染的子内容
 * @param {string} props.currentView - 当前视图 ('dataQuery' 或 'simulator')
 * @param {Function} props.setCurrentView - 设置当前视图的函数
 * @returns {JSX.Element} 布局组件
 */
export function Layout({ children, currentView, setCurrentView }) {
    return (
        <div className="app-layout">
            <Header />
            <div className="app-content">
                <Sidebar currentView={currentView} setCurrentView={setCurrentView} />
                <main className="main-content">
                    {children}
                </main>
            </div>
        </div>
    );
}
