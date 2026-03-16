import { calculateSingleHit } from './simulationUtils';

const DEFAULT_HIT_PROBABILITIES = {
  head: 0.1724,
  chest: 0.3046,
  abdomen: 0.1897,
  upperArm: 0.0833,
  lowerArm: 0.0833,
  thigh: 0.0833,
  calf: 0.0831,
};

function normalizeHitProbabilities(hitProbabilities = {}) {
  const merged = { ...DEFAULT_HIT_PROBABILITIES, ...hitProbabilities };
  const entries = Object.entries(merged).map(([site, value]) => [site, Math.max(0, Number(value) || 0)]);
  const total = entries.reduce((sum, [, value]) => sum + value, 0);
  if (total <= 0) return DEFAULT_HIT_PROBABILITIES;

  return Object.fromEntries(entries.map(([site, value]) => [site, value / total]));
}

function createHitSampler(hitProbabilities) {
  const normalized = normalizeHitProbabilities(hitProbabilities);
  const cumulative = [];
  let running = 0;

  Object.entries(normalized).forEach(([site, probability]) => {
    running += probability;
    cumulative.push([site, running]);
  });

  return () => {
    const r = Math.random();
    for (let i = 0; i < cumulative.length; i += 1) {
      if (r <= cumulative[i][1]) return cumulative[i][0];
    }
    return cumulative[cumulative.length - 1][0];
  };
}

export function runSingleTrial({
  configuredWeapon,
  ammo,
  helmet,
  armor,
  helmetDurability,
  armorDurability,
  distance,
  initialHp,
  hitProbabilities,
  maxShots = 300,
}) {
  if (!configuredWeapon || !ammo || !helmet || !armor) {
    throw new Error('runSingleTrial 缺少必要参数');
  }

  const pickHitSite = createHitSampler(hitProbabilities);
  let hp = Number(initialHp) || 100;
  let currentHelmetDurability = Number(helmetDurability) || 0;
  let currentArmorDurability = Number(armorDurability) || 0;
  let shots = 0;

  while (hp > 0 && shots < maxShots) {
    const hitSite = pickHitSite();
    const result = calculateSingleHit(
      configuredWeapon,
      ammo,
      helmet,
      armor,
      currentHelmetDurability,
      currentArmorDurability,
      hitSite,
      distance
    );

    hp -= result.healthDamage;
    currentHelmetDurability = result.newHelmetDurability;
    currentArmorDurability = result.newArmorDurability;
    shots += 1;
  }

  const btk = shots;
  const fireRate = Number(configuredWeapon.fireRate) || 0;
  const ttk = btk > 1 && fireRate > 0 ? ((btk - 1) * 60000) / fireRate : 0;

  return { btk, ttk };
}

function mapToDistribution(countMap, totalCount) {
  return Object.entries(countMap)
    .map(([key, count]) => ({
      key: Number(key),
      probability: totalCount > 0 ? count / totalCount : 0,
      count,
    }))
    .sort((a, b) => a.key - b.key);
}

export async function runMonteCarlo({
  trials,
  chunkSize = 1000,
  onProgress,
  ...trialConfig
}) {
  const n = Math.max(1, Number(trials) || 1);
  const btkCounts = {};
  const ttkCounts = {};
  let totalBtk = 0;
  let totalTtk = 0;

  for (let i = 0; i < n; i += 1) {
    const { btk, ttk } = runSingleTrial(trialConfig);
    const ttkMs = Math.round(ttk);

    btkCounts[btk] = (btkCounts[btk] || 0) + 1;
    ttkCounts[ttkMs] = (ttkCounts[ttkMs] || 0) + 1;

    totalBtk += btk;
    totalTtk += ttk;

    if ((i + 1) % chunkSize === 0) {
      if (onProgress) onProgress((i + 1) / n);
      // 让出主线程，避免前端卡死
      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  if (onProgress) onProgress(1);

  const btkDistribution = mapToDistribution(btkCounts, n).map((item) => ({
    btk: item.key,
    probability: item.probability,
    count: item.count,
  }));

  const ttkDistribution = mapToDistribution(ttkCounts, n).map((item) => ({
    ttk: item.key,
    probability: item.probability,
    count: item.count,
  }));

  return {
    trialCount: n,
    avgBtk: totalBtk / n,
    avgTtk: totalTtk / n,
    btkDistribution,
    ttkDistribution,
    btkDistributionJson: JSON.stringify(
      btkDistribution.map(({ btk, probability }) => ({ btk, probability }))
    ),
  };
}

export { DEFAULT_HIT_PROBABILITIES, normalizeHitProbabilities };
