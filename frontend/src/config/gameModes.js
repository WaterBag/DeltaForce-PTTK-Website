export const DEFAULT_GAME_MODE = 'firefight';

export const GAME_MODES = {
  firefight: {
    id: 'firefight',
    label: '烽火行动',
    shortLabel: '烽火',
    dataPath: '/data/firefight',
    dataFiles: ['weapons', 'ammos', 'armors', 'helmets', 'modifications'],
    defaultView: 'ttkSimulator',
    views: [
      { id: 'ttkSimulator', label: '模拟TTK' },
      { id: 'dataQuery', label: '查询TTK' },
      { id: 'simulator', label: '伤害模拟器' },
      { id: 'dataLibrary', label: '数据图鉴' },
    ],
  },
  battlefield: {
    id: 'battlefield',
    label: '战场模式',
    shortLabel: '战场',
    dataPath: '/data/battlefield',
    dataFiles: ['weapons', 'modifications'],
    defaultView: 'ttk',
    views: [
      { id: 'ttk', label: 'TTK' },
      { id: 'simulator', label: '伤害模拟器' },
      { id: 'dataLibrary', label: '数据图鉴' },
    ],
  },
};

export const GAME_MODE_OPTIONS = Object.values(GAME_MODES);

export function getGameModeConfig(mode) {
  return GAME_MODES[mode] || GAME_MODES[DEFAULT_GAME_MODE];
}
