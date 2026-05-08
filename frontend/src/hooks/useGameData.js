import { useEffect, useState } from 'react';
import { weapons as firefightWeapons } from '../assets/data/firefight/weapons';
import { ammos as firefightAmmos } from '../assets/data/firefight/ammos';
import firefightArmors from '../assets/data/firefight/armors';
import firefightHelmets from '../assets/data/firefight/helmets';
import { modifications as firefightModifications } from '../assets/data/firefight/modifications';
import { weapons as battlefieldWeapons } from '../assets/data/battlefield/weapons';
import { DEFAULT_GAME_MODE, getGameModeConfig } from '../config/gameModes';

const DATA_BASE_URL = process.env.REACT_APP_DATA_BASE_URL || '/data';

const fallbackByMode = {
  firefight: {
    weapons: firefightWeapons,
    ammos: firefightAmmos,
    armors: firefightArmors,
    helmets: firefightHelmets,
    modifications: firefightModifications,
  },
  battlefield: {
    weapons: battlefieldWeapons,
    ammos: [],
    armors: [],
    helmets: [],
    modifications: firefightModifications,
  },
};

const cachedGameData = {};
const loadingPromises = {};

const fetchJson = async (url) => {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Request failed: ${url} (${response.status})`);
  }
  return response.json();
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const hydrateImages = (remoteList, localList) => {
  if (!Array.isArray(remoteList)) return remoteList;
  if (!Array.isArray(localList) || localList.length === 0) return remoteList;

  const byId = new Map(localList.map(item => [String(item?.id), item]));
  const byName = new Map(localList.map(item => [item?.name, item]));
  const byCaliber = new Map();
  localList.forEach(item => {
    if (item?.caliber && item?.image && !byCaliber.has(item.caliber)) {
      byCaliber.set(item.caliber, item);
    }
  });

  return remoteList.map(item => {
    const localById = byId.get(String(item?.id));
    const localByName = byName.get(item?.name);
    const localByCaliber = byCaliber.get(item?.caliber);
    const local = localById || localByName || localByCaliber;

    if (!local || !local.image) return item;
    if (item.image) return item;

    return {
      ...item,
      image: local.image,
    };
  });
};

const createEmptyData = (mode) => ({
  weapons: [],
  ammos: [],
  armors: [],
  helmets: [],
  modifications: [],
  ...(fallbackByMode[mode] || fallbackByMode[DEFAULT_GAME_MODE]),
});

const getRemoteDataPath = (modeConfig) => {
  const normalizedBase = DATA_BASE_URL.replace(/\/$/, '');
  return `${normalizedBase}/${modeConfig.id}`;
};

const loadRemoteGameData = async (mode) => {
  const modeConfig = getGameModeConfig(mode);
  const fallbackData = createEmptyData(modeConfig.id);
  const dataPath = getRemoteDataPath(modeConfig);
  const manifest = await fetchJson(`${dataPath}/manifest.json`);

  const loadedFiles = await Promise.all(
    modeConfig.dataFiles.map(async (fileKey) => [
      fileKey,
      await fetchJson(`${dataPath}/${fileKey}.json`),
    ])
  );

  const remoteData = Object.fromEntries(loadedFiles);

  return {
    ...fallbackData,
    manifest,
    ...remoteData,
    weapons: hydrateImages(remoteData.weapons || fallbackData.weapons, fallbackData.weapons),
    ammos: hydrateImages(remoteData.ammos || fallbackData.ammos, fallbackData.ammos),
    armors: hydrateImages(remoteData.armors || fallbackData.armors, fallbackData.armors),
    helmets: hydrateImages(remoteData.helmets || fallbackData.helmets, fallbackData.helmets),
    modifications: Array.isArray(remoteData.modifications) && remoteData.modifications.length > 0
      ? remoteData.modifications
      : fallbackData.modifications,
  };
};

const loadRemoteGameDataWithRetry = async (mode, maxAttempts = 3) => {
  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await loadRemoteGameData(mode);
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) {
        await wait(attempt * 500);
      }
    }
  }

  throw lastError;
};

export function useGameData(mode = DEFAULT_GAME_MODE) {
  const modeConfig = getGameModeConfig(mode);
  const modeId = modeConfig.id;
  const fallbackData = createEmptyData(modeId);

  const [state, setState] = useState({
    data: cachedGameData[modeId] || fallbackData,
    loading: !cachedGameData[modeId],
    source: cachedGameData[modeId] ? 'remote-cache' : 'local-fallback',
    error: null,
  });

  useEffect(() => {
    const latestFallbackData = createEmptyData(modeId);

    if (cachedGameData[modeId]) {
      setState({
        data: cachedGameData[modeId],
        loading: false,
        source: 'remote-cache',
        error: null,
      });
      return;
    }

    setState({
      data: latestFallbackData,
      loading: true,
      source: 'local-fallback',
      error: null,
    });

    if (!loadingPromises[modeId]) {
      loadingPromises[modeId] = loadRemoteGameDataWithRetry(modeId)
        .then((data) => {
          cachedGameData[modeId] = data;
          return data;
        })
        .catch((error) => {
          loadingPromises[modeId] = null;
          console.warn(`Failed to load remote game data for ${modeId}; using local fallback.`, error);
          return null;
        });
    }

    loadingPromises[modeId].then((data) => {
      if (data) {
        setState({
          data,
          loading: false,
          source: 'remote',
          error: null,
        });
      } else {
        setState({
          data: latestFallbackData,
          loading: false,
          source: 'local-fallback',
          error: 'Remote data failed to load; local fallback is in use.',
        });
      }
    });
  }, [modeId]);

  return state;
}
