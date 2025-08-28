/**
 * React应用主入口文件
 * 负责初始化React应用、配置路由和渲染根组件
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom'; 
import App from './App';
import './index.css';

// 创建React应用的根节点
const root = ReactDOM.createRoot(document.getElementById('root'));

// 渲染应用组件
root.render(
  <React.StrictMode>
    {/* 使用BrowserRouter提供路由功能 */}
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
