import React, { useEffect, useState } from 'react';
import { Layout } from './components/layout/Layout';
import { DataQuery } from './pages/firefight/DataQuery';
import { Simulator as FirefightSimulator } from './pages/firefight/Simulator';
import { DataLibrary as FirefightDataLibrary } from './pages/firefight/DataLibrary';
import { TTKSimulator } from './pages/firefight/TTKSimulator';
import { BattlefieldTTK } from './pages/battlefield/BattlefieldTTK';
import { BattlefieldSimulator } from './pages/battlefield/BattlefieldSimulator';
import { BattlefieldDataLibrary } from './pages/battlefield/BattlefieldDataLibrary';
import { DEFAULT_GAME_MODE, getGameModeConfig } from './config/gameModes';

function App() {
  const [currentMode, setCurrentMode] = useState(DEFAULT_GAME_MODE);
  const [currentView, setCurrentView] = useState(getGameModeConfig(DEFAULT_GAME_MODE).defaultView);

  useEffect(() => {
    const modeConfig = getGameModeConfig(currentMode);
    if (!modeConfig.views.some((view) => view.id === currentView)) {
      setCurrentView(modeConfig.defaultView);
    }
  }, [currentMode, currentView]);

  const handleModeChange = (mode) => {
    const modeConfig = getGameModeConfig(mode);
    setCurrentMode(modeConfig.id);
    setCurrentView(modeConfig.defaultView);
  };

  const renderFirefightContent = () => {
    switch (currentView) {
    case 'simulator':
      return <FirefightSimulator />;
    case 'dataLibrary':
      return <FirefightDataLibrary />;
    case 'ttkSimulator':
      return <TTKSimulator />;
    case 'dataQuery':
    default:
      return <DataQuery />;
    }
  };

  const renderBattlefieldContent = () => {
    switch (currentView) {
    case 'simulator':
      return <BattlefieldSimulator />;
    case 'dataLibrary':
      return <BattlefieldDataLibrary />;
    case 'ttk':
    default:
      return <BattlefieldTTK />;
    }
  };

  const renderContent = () => {
    if (currentMode === 'battlefield') {
      return renderBattlefieldContent();
    }
    return renderFirefightContent();
  };

  return (
    <Layout
      currentMode={currentMode}
      setCurrentMode={handleModeChange}
      currentView={currentView}
      setCurrentView={setCurrentView}
    >
      {renderContent()}
    </Layout>
  );
}

export default App;
