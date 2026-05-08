import React from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { Simulator as FirefightSimulator } from './pages/firefight/Simulator';
import { DataLibrary as FirefightDataLibrary } from './pages/firefight/DataLibrary';
import { TTKSimulator } from './pages/firefight/TTKSimulator';
import { BattlefieldTTK } from './pages/battlefield/BattlefieldTTK';
import { BattlefieldSimulator } from './pages/battlefield/BattlefieldSimulator';
import { BattlefieldDataLibrary } from './pages/battlefield/BattlefieldDataLibrary';
import { DEFAULT_GAME_MODE, getGameModeConfig, getRouteByModeView, getRouteByPath } from './config/gameModes';
import { usePageSeo } from './utils/seo';
import { trackBaiduEvent, useBaiduRouteTracking } from './utils/baiduAnalytics';

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentRoute = getRouteByPath(location.pathname);
  const currentMode = currentRoute?.modeId || DEFAULT_GAME_MODE;
  const currentView = currentRoute?.viewId || getGameModeConfig(DEFAULT_GAME_MODE).defaultView;
  usePageSeo(currentRoute?.path || '/firefight/ttk');
  useBaiduRouteTracking();

  const handleModeChange = (mode) => {
    const modeConfig = getGameModeConfig(mode);
    trackBaiduEvent('navigation', 'switch_mode', modeConfig.id);
    navigate(modeConfig.defaultPath);
  };

  const handleViewChange = (view) => {
    const route = getRouteByModeView(currentMode, view);
    if (route) {
      trackBaiduEvent('navigation', 'switch_view', route.path);
      navigate(route.path);
    }
  };

  return (
    <Layout
      currentMode={currentMode}
      setCurrentMode={handleModeChange}
      currentView={currentView}
      setCurrentView={handleViewChange}
    >
      <Routes>
        <Route path="/" element={<Navigate to="/firefight/ttk" replace />} />
        <Route path="/firefight/ttk" element={<TTKSimulator />} />
        <Route path="/firefight/query" element={<Navigate to="/firefight/ttk" replace />} />
        <Route path="/firefight/simulator" element={<FirefightSimulator />} />
        <Route path="/firefight/library" element={<FirefightDataLibrary />} />
        <Route path="/battlefield/ttk" element={<BattlefieldTTK />} />
        <Route path="/battlefield/simulator" element={<BattlefieldSimulator />} />
        <Route path="/battlefield/library" element={<BattlefieldDataLibrary />} />
        <Route path="*" element={<Navigate to="/firefight/ttk" replace />} />
      </Routes>
    </Layout>
  );
}

export default App;
