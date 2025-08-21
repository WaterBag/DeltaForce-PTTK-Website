import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { DataQuery } from './pages/DataQuery';

function App() {
  return (
    <Layout> {/* 我们的总布局组件包裹所有页面 */}
      <Routes>
        {/* 定义路由规则 */}
        <Route path="/" element={<DataQuery />} /> 
        {/* 未来可以添加其他路由 */}
        {/* <Route path="/damage-calculator" element={<DamageCalculator />} /> */}
      </Routes>
    </Layout>
  );
}

export default App;