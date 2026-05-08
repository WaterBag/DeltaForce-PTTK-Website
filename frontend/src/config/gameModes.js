export const DEFAULT_GAME_MODE = 'firefight';

export const GAME_MODES = {
  firefight: {
    id: 'firefight',
    label: '烽火行动',
    shortLabel: '烽火',
    dataPath: '/data/firefight',
    dataFiles: ['weapons', 'ammos', 'armors', 'helmets', 'modifications'],
    defaultView: 'ttkSimulator',
    defaultPath: '/firefight/ttk',
    views: [
      { id: 'ttkSimulator', label: 'TTK折线图', path: '/firefight/ttk' },
      { id: 'simulator', label: '伤害模拟器', path: '/firefight/simulator' },
      { id: 'dataLibrary', label: '数据图鉴', path: '/firefight/library' },
    ],
  },
  battlefield: {
    id: 'battlefield',
    label: '战场模式',
    shortLabel: '战场',
    dataPath: '/data/battlefield',
    dataFiles: ['weapons', 'modifications'],
    defaultView: 'ttk',
    defaultPath: '/battlefield/ttk',
    views: [
      { id: 'ttk', label: 'TTK折线图', path: '/battlefield/ttk' },
      { id: 'simulator', label: '伤害模拟器', path: '/battlefield/simulator' },
      { id: 'dataLibrary', label: '数据图鉴', path: '/battlefield/library' },
    ],
  },
};

export const GAME_MODE_OPTIONS = Object.values(GAME_MODES);

export function getGameModeConfig(mode) {
  return GAME_MODES[mode] || GAME_MODES[DEFAULT_GAME_MODE];
}

export const ROUTE_ENTRIES = Object.values(GAME_MODES).flatMap((mode) =>
  mode.views.map((view) => ({
    modeId: mode.id,
    viewId: view.id,
    path: view.path,
    mode,
    view,
  }))
);

function normalizePath(pathname) {
  if (!pathname || pathname === '/') {
    return '/';
  }
  return pathname.replace(/\/+$/, '');
}

export function getRouteByPath(pathname) {
  const normalizedPath = normalizePath(pathname);
  return ROUTE_ENTRIES.find((entry) => entry.path === normalizedPath);
}

export function getRouteByModeView(modeId, viewId) {
  const mode = getGameModeConfig(modeId);
  return ROUTE_ENTRIES.find((entry) => entry.modeId === mode.id && entry.viewId === viewId);
}
