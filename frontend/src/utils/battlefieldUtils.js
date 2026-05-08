import { buildConfiguredWeapon } from './weaponConfigUtils';

function normalizeWeaponName(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/[\s\-_\u2010-\u2015]/g, '');
}

function matchesWeaponName(a, b) {
  if (!a || !b) return false;
  return a === b || normalizeWeaponName(a) === normalizeWeaponName(b);
}

function variantReferenceMatches(value, weapon) {
  const names = [weapon?.name, weapon?.sourceName].filter(Boolean);

  if (typeof value === 'string') {
    return names.some((name) => matchesWeaponName(value, name));
  }

  if (Array.isArray(value)) {
    return value.some((item) => variantReferenceMatches(item, weapon));
  }

  if (value && typeof value === 'object') {
    return Object.values(value).some((item) => variantReferenceMatches(item, weapon));
  }

  return false;
}

export const BATTLEFIELD_HIT_PARTS = [
  { key: 'head', label: '头部', multiplierKey: 'headMultiplier' },
  { key: 'chest', label: '胸部', multiplierKey: 'chestMultiplier' },
  { key: 'abdomen', label: '腹部', multiplierKey: 'abdomenMultiplier' },
  { key: 'upperArm', label: '大臂', multiplierKey: 'upperArmMultiplier' },
  { key: 'lowerArm', label: '小臂', multiplierKey: 'lowerArmMultiplier' },
  { key: 'thigh', label: '大腿', multiplierKey: 'thighMultiplier' },
  { key: 'calf', label: '小腿', multiplierKey: 'calfMultiplier' },
];

export const BATTLEFIELD_DEFAULT_HIT_PROBABILITIES = {
  head: 0.1724,
  chest: 0.3046,
  abdomen: 0.1897,
  upperArm: 0.0833,
  lowerArm: 0.0833,
  thigh: 0.0833,
  calf: 0.0831,
};

export const BATTLEFIELD_WEAPON_TYPE_LABELS = {
  all: '全部类型',
  smg: '冲锋枪',
  rifle: '步枪',
  lmg: '机枪',
  marksman: '射手步枪',
  sniper: '狙击枪',
  shotgun: '霰弹枪',
  pistol: '手枪',
};

function getBattlefieldDecayMultipliers(weapon) {
  const decayValues = [weapon?.decay1, weapon?.decay2, weapon?.decay3, weapon?.decay4, weapon?.decay5]
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));

  if (decayValues.length > 0) {
    return decayValues;
  }

  return Array.isArray(weapon?.decayMultipliers) ? weapon.decayMultipliers : [1];
}

function formatRangeNumber(value) {
  const number = Number(value) || 0;
  return Number.isInteger(number) ? String(number) : number.toFixed(1);
}

export function normalizeBattlefieldProbabilities(probabilities = {}) {
  const entries = BATTLEFIELD_HIT_PARTS.map((part) => [
    part.key,
    Math.max(0, Number(probabilities[part.key] ?? BATTLEFIELD_DEFAULT_HIT_PROBABILITIES[part.key]) || 0),
  ]);
  const total = entries.reduce((sum, [, value]) => sum + value, 0);
  if (total <= 0) return { ...BATTLEFIELD_DEFAULT_HIT_PROBABILITIES };
  return Object.fromEntries(entries.map(([key, value]) => [key, value / total]));
}

export function getBattlefieldDecay(weapon, distance) {
  const numericDistance = Math.max(0, Number(distance) || 0);
  if (numericDistance <= Number(weapon?.range1)) return Number(weapon?.decay1) || 1;
  if (numericDistance <= Number(weapon?.range2)) return Number(weapon?.decay2) || 1;
  if (numericDistance <= Number(weapon?.range3)) return Number(weapon?.decay3) || 1;
  if (numericDistance <= Number(weapon?.range4)) return Number(weapon?.decay4) || 1;
  return Number(weapon?.decay5) || 1;
}

export function getBattlefieldSegmentDistances(weapon, maxDistance = 100) {
  if (!weapon) return [0, maxDistance];

  const toPositiveRange = (value) => {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : null;
  };

  const ranges = [weapon.range1, weapon.range2, weapon.range3, weapon.range4, weapon.range5]
    .map(toPositiveRange);
  const points = [
    0,
    ...ranges.map((range) => (range == null ? null : range + 1)),
    maxDistance,
  ]
    .filter((value) => Number.isFinite(value) && value >= 0 && value <= maxDistance)
    .map((value) => Math.round(value));

  return [...new Set(points)].sort((a, b) => a - b);
}

export function calculateBattlefieldDamage(weapon, hitPart, distance) {
  if (!weapon) return 0;
  const part = BATTLEFIELD_HIT_PARTS.find((item) => item.key === hitPart) || BATTLEFIELD_HIT_PARTS[1];
  const baseDamage = Number(weapon.damage) || 0;
  const multiplier = Number(weapon[part.multiplierKey]) || 1;
  const decay = getBattlefieldDecay(weapon, distance);
  return baseDamage * multiplier * decay;
}

export function getBattlefieldPartRows(weapon, distance) {
  return BATTLEFIELD_HIT_PARTS.map((part) => ({
    ...part,
    damage: calculateBattlefieldDamage(weapon, part.key, distance),
    multiplier: Number(weapon?.[part.multiplierKey]) || 1,
  }));
}

export function getBattlefieldApplicableMods(weapon, modifications = []) {
  if (!weapon || !Array.isArray(modifications)) return [];

  return modifications.filter((mod) => {
    if (!Array.isArray(mod?.appliesTo)) return false;
    const appliesToWeapon = mod.appliesTo.some((name) => (
      matchesWeaponName(name, weapon.name) || matchesWeaponName(name, weapon.sourceName)
    ));
    if (!appliesToWeapon || !mod.effects) return false;

    const effects = mod.effects;
    const unlockSlots = effects.unlockSlots ?? effects.unlock_slots;

    return Object.values(effects).some((value) => Number(value) !== 0)
      || effects.damageChange === true
      || effects.specialRange === true
      || (Array.isArray(unlockSlots) ? unlockSlots.length > 0 : Boolean(unlockSlots));
  });
}

export function isBattlefieldVariantWeapon(weapon, modifications = []) {
  if (!weapon || !Array.isArray(modifications)) return false;
  if (weapon.isModification === true) return true;

  return modifications.some((mod) => (
    variantReferenceMatches(mod?.effects?.dataQueryName, weapon) ||
    variantReferenceMatches(mod?.effects?.btkQueryName, weapon)
  ));
}

export function buildBattlefieldConfiguredWeapon({
  selectedWeapon,
  selectedModIds,
  modifications,
  weapons,
}) {
  if (!selectedWeapon) return null;

  return buildConfiguredWeapon({
    selectedWeapon,
    selectedModIds,
    modifications,
    weapons,
  });
}

export function getBattlefieldWeaponSummary(weapon, distance = 0) {
  if (!weapon) {
    return {
      headDamage: 0,
      chestDamage: 0,
      abdomenDamage: 0,
      armDamage: 0,
      legDamage: 0,
      limbDamage: 0,
      dps: 0,
    };
  }

  const chestDamage = calculateBattlefieldDamage(weapon, 'chest', distance);
  const limbDamages = ['upperArm', 'lowerArm', 'thigh', 'calf']
    .map((part) => calculateBattlefieldDamage(weapon, part, distance));
  return {
    headDamage: calculateBattlefieldDamage(weapon, 'head', distance),
    chestDamage,
    abdomenDamage: calculateBattlefieldDamage(weapon, 'abdomen', distance),
    armDamage: calculateBattlefieldDamage(weapon, 'upperArm', distance),
    legDamage: calculateBattlefieldDamage(weapon, 'thigh', distance),
    limbDamage: limbDamages.reduce((sum, damage) => sum + damage, 0) / limbDamages.length,
    dps: chestDamage * (Number(weapon.fireRate) || 0) / 60,
  };
}

export function calculateBattlefieldTtk({
  weapon,
  distance,
  hp,
  probabilities = BATTLEFIELD_DEFAULT_HIT_PROBABILITIES,
  includeTriggerDelay = false,
  includeMuzzleVelocity = false,
}) {
  if (!weapon) {
    return {
      expectedDamage: 0,
      btk: 0,
      ttk: 0,
      partRows: [],
      normalizedProbabilities: normalizeBattlefieldProbabilities(probabilities),
    };
  }

  const normalizedProbabilities = normalizeBattlefieldProbabilities(probabilities);
  const partRows = getBattlefieldPartRows(weapon, distance).map((part) => ({
    ...part,
    probability: normalizedProbabilities[part.key] || 0,
  }));
  const expectedDamage = partRows.reduce((sum, part) => sum + part.damage * part.probability, 0);
  const targetHp = Math.max(1, Number(hp) || 100);
  const btk = expectedDamage > 0 ? Math.ceil(targetHp / expectedDamage) : 0;
  const fireRate = Number(weapon.fireRate) || 0;
  const shotIntervalTtk = btk > 1 && fireRate > 0 ? ((btk - 1) * 60000) / fireRate : 0;
  const triggerDelay = includeTriggerDelay ? Math.max(0, Number(weapon.triggerDelay) || 0) : 0;
  const velocityDelay = includeMuzzleVelocity && Number(weapon.muzzleVelocity) > 0
    ? (Math.max(0, Number(distance) || 0) / Number(weapon.muzzleVelocity)) * 1000
    : 0;
  const ttk = shotIntervalTtk + triggerDelay + velocityDelay;

  return {
    expectedDamage,
    btk,
    ttk,
    partRows,
    normalizedProbabilities,
  };
}

function createBattlefieldHitSampler(probabilities) {
  const normalized = normalizeBattlefieldProbabilities(probabilities);
  const cumulative = [];
  let running = 0;

  Object.entries(normalized).forEach(([part, probability]) => {
    running += probability;
    cumulative.push([part, running]);
  });

  return () => {
    const r = Math.random();
    for (let i = 0; i < cumulative.length; i += 1) {
      if (r <= cumulative[i][1]) return cumulative[i][0];
    }
    return cumulative[cumulative.length - 1]?.[0] || 'chest';
  };
}

export function runBattlefieldSingleTrial({
  weapon,
  distance,
  initialHp,
  hitProbabilities,
  maxShots = 300,
}) {
  if (!weapon) {
    throw new Error('runBattlefieldSingleTrial 缺少武器参数');
  }

  const pickHitPart = createBattlefieldHitSampler(hitProbabilities);
  let hp = Number(initialHp) || 100;
  let shots = 0;

  while (hp > 0 && shots < maxShots) {
    const hitPart = pickHitPart();
    hp -= calculateBattlefieldDamage(weapon, hitPart, distance);
    shots += 1;
  }

  const btk = shots;
  const fireRate = Number(weapon.fireRate) || 0;
  const ttk = btk > 1 && fireRate > 0 ? ((btk - 1) * 60000) / fireRate : 0;

  return { btk, ttk };
}

function mapBattlefieldDistribution(countMap, totalCount) {
  return Object.entries(countMap)
    .map(([key, count]) => ({
      key: Number(key),
      probability: totalCount > 0 ? count / totalCount : 0,
      count,
    }))
    .sort((a, b) => a.key - b.key);
}

export async function runBattlefieldMonteCarlo({
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
    const { btk, ttk } = runBattlefieldSingleTrial(trialConfig);
    const ttkMs = Math.round(ttk);

    btkCounts[btk] = (btkCounts[btk] || 0) + 1;
    ttkCounts[ttkMs] = (ttkCounts[ttkMs] || 0) + 1;

    totalBtk += btk;
    totalTtk += ttk;

    if ((i + 1) % chunkSize === 0) {
      if (onProgress) onProgress((i + 1) / n);
      // Let the UI update during large simulations, matching the firefight TTK flow.
      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  if (onProgress) onProgress(1);

  const btkDistribution = mapBattlefieldDistribution(btkCounts, n).map((item) => ({
    btk: item.key,
    probability: item.probability,
    count: item.count,
  }));

  const ttkDistribution = mapBattlefieldDistribution(ttkCounts, n).map((item) => ({
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
  };
}

export function formatBattlefieldRangeBands(weapon) {
  const starts = [0, weapon?.range1, weapon?.range2, weapon?.range3, weapon?.range4]
    .map((value, index) => (index === 0 ? 0 : Number(value) + 1))
    .filter((value) => Number.isFinite(value) && value >= 0);
  const decays = getBattlefieldDecayMultipliers(weapon);
  return starts.map((start, index) => {
    const nextStart = starts[index + 1];
    const rangeLabel = nextStart == null
      ? `${formatRangeNumber(start)}m+`
      : `${formatRangeNumber(start)}-${formatRangeNumber(Math.max(start, nextStart - 1))}m`;
    return {
      rangeLabel,
      decay: decays[index] ?? 1,
    };
  });
}
