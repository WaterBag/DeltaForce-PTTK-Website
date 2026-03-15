import { useEffect, useState } from 'react';
import { weapons as localWeapons } from '../assets/data/weapons';
import { ammos as localAmmos } from '../assets/data/ammos';
import localArmors from '../assets/data/armors';
import localHelmets from '../assets/data/helmets';
import { modifications as localModifications } from '../assets/data/modifications';

const DATA_BASE_URL = process.env.REACT_APP_DATA_BASE_URL || '/data';

const fallbackData = {
  weapons: localWeapons,
  ammos: localAmmos,
  armors: localArmors,
  helmets: localHelmets,
  modifications: localModifications,
};

let cachedGameData = null;
let loadingPromise = null;

const fetchJson = async (url) => {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`请求失败: ${url} (${response.status})`);
  }
  return response.json();
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const hydrateImages = (remoteList, localList) => {
  if (!Array.isArray(remoteList)) return remoteList;
  if (!Array.isArray(localList) || localList.length === 0) return remoteList;

  const byId = new Map(localList.map(item => [String(item?.id), item]));
  const byName = new Map(localList.map(item => [item?.name, item]));

  return remoteList.map(item => {
    const localById = byId.get(String(item?.id));
    const localByName = byName.get(item?.name);
    const local = localById || localByName;

    if (!local || !local.image) return item;
    if (item.image) return item;

    return {
      ...item,
      image: local.image,
    };
  });
};

const loadRemoteGameData = async () => {
  const manifest = await fetchJson(`${DATA_BASE_URL}/manifest.json`);

  const [weapons, ammos, armors, helmets, modifications] = await Promise.all([
    fetchJson(`${DATA_BASE_URL}/weapons.json`),
    fetchJson(`${DATA_BASE_URL}/ammos.json`),
    fetchJson(`${DATA_BASE_URL}/armors.json`),
    fetchJson(`${DATA_BASE_URL}/helmets.json`),
    fetchJson(`${DATA_BASE_URL}/modifications.json`),
  ]);

  return {
    ...fallbackData,
    manifest,
    weapons: hydrateImages(weapons, localWeapons),
    ammos: hydrateImages(ammos, localAmmos),
    armors: hydrateImages(armors, localArmors),
    helmets: hydrateImages(helmets, localHelmets),
    modifications,
  };
};

const loadRemoteGameDataWithRetry = async (maxAttempts = 3) => {
  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await loadRemoteGameData();
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) {
        await wait(attempt * 500);
      }
    }
  }

  throw lastError;
};

export function useGameData() {
  const [state, setState] = useState({
    data: cachedGameData || fallbackData,
    loading: !cachedGameData,
    source: cachedGameData ? 'remote-cache' : 'local-fallback',
    error: null,
  });

  useEffect(() => {
    if (cachedGameData) {
      return;
    }

    if (!loadingPromise) {
      loadingPromise = loadRemoteGameDataWithRetry()
        .then((data) => {
          cachedGameData = data;
          return data;
        })
        .catch((error) => {
          // Allow future mounts to retry after transient fetch failures.
          loadingPromise = null;
          console.warn('加载远程游戏数据失败，使用本地静态数据兜底:', error);
          return null;
        });
    }

    loadingPromise.then((data) => {
      if (data) {
        setState({
          data,
          loading: false,
          source: 'remote',
          error: null,
        });
      } else {
        setState({
          data: fallbackData,
          loading: false,
          source: 'local-fallback',
          error: '远程数据加载失败，已回退本地静态数据。',
        });
      }
    });
  }, []);

  return state;
}
