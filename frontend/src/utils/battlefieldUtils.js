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
  pistol: '手枪',
};

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
  const starts = Array.isArray(weapon?.rangeStarts) ? weapon.rangeStarts : [0];
  const decays = Array.isArray(weapon?.decayMultipliers) ? weapon.decayMultipliers : [1];
  const numericDistance = Math.max(0, Number(distance) || 0);
  let activeDecay = decays[0] ?? 1;

  for (let index = 0; index < starts.length; index += 1) {
    if (numericDistance >= Number(starts[index])) {
      activeDecay = decays[index] ?? activeDecay;
    }
  }

  return activeDecay;
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

export function calculateBattlefieldTtk({
  weapon,
  distance,
  hp,
  probabilities = BATTLEFIELD_DEFAULT_HIT_PROBABILITIES,
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
  const triggerDelay = Number(weapon.triggerDelay) || 0;
  const ttk = btk > 1 && fireRate > 0 ? ((btk - 1) * 60000) / fireRate + triggerDelay : triggerDelay;

  return {
    expectedDamage,
    btk,
    ttk,
    partRows,
    normalizedProbabilities,
  };
}

export function formatBattlefieldRangeBands(weapon) {
  const starts = Array.isArray(weapon?.rangeStarts) ? weapon.rangeStarts : [0];
  const decays = Array.isArray(weapon?.decayMultipliers) ? weapon.decayMultipliers : [1];
  return starts.map((start, index) => {
    const nextStart = starts[index + 1];
    const rangeLabel = nextStart == null ? `${start}m+` : `${start}-${nextStart}m`;
    return {
      rangeLabel,
      decay: decays[index] ?? 1,
    };
  });
}
