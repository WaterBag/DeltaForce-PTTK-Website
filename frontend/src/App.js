/**
 * 应用主组件
 * 负责管理应用状态和路由视图切换
 */

import React, { useState } from 'react';
import { Layout } from './components/layout/Layout';
import { DataQuery } from './pages/DataQuery';
import { Simulator } from './pages/Simulator';

/**
 * 主应用组件
 * @returns {JSX.Element} 渲染的应用界面
 */
function App() {
  // 当前视图状态：'dataQuery' 或 'simulator'
  const [currentView, setCurrentView] = useState('dataQuery');

  /**
   * 根据当前视图状态渲染对应的内容组件
   * @returns {JSX.Element} 对应的视图组件
   */
  const renderContent = () => {
    switch (currentView) {
      case 'simulator':
        return <Simulator />;
      case 'dataQuery':
      default:
        return <DataQuery />;
    }
  };

  return (
    <Layout currentView={currentView} setCurrentView={setCurrentView}>
      {renderContent()}
    </Layout>
  );
}

export default App;
