/* eslint-disable no-restricted-globals */

const DEFAULT_HIT_PROBABILITIES = {
  head: 0.1724,
  chest: 0.3046,
  abdomen: 0.1897,
  upperArm: 0.0833,
  lowerArm: 0.0833,
  thigh: 0.0833,
  calf: 0.0831,
};

function getDecay(gun, distance) {
  if (!gun) return 1.0;
  if (distance <= gun.range1) return gun.decay1;
  if (distance <= gun.range2) return gun.decay2;
  if (distance <= gun.range3) return gun.decay3;
  if (distance <= gun.range4) return gun.decay4;
  return gun.decay5;
}

function calculateSingleHit(gun, ammo, helmet, armor, currentHelmetDurability, currentArmorDurability, hitSite, distance) {
  const isHeadshot = hitSite === 'head';
  const targetArmorPiece = isHeadshot ? helmet : armor;
  let currentDurability = isHeadshot ? currentHelmetDurability : currentArmorDurability;
  const armorLevel = targetArmorPiece?.level || 0;

  let partMultiplier = 1.0;
  switch (hitSite) {
  case 'head': partMultiplier = gun.headMultiplier; break;
  case 'chest': partMultiplier = gun.chestMultiplier; break;
  case 'abdomen': partMultiplier = gun.abdomenMultiplier; break;
  case 'upperArm': partMultiplier = gun.upperArmMultiplier; break;
  case 'lowerArm': partMultiplier = gun.lowerArmMultiplier; break;
  case 'thigh': partMultiplier = gun.thighMultiplier; break;
  case 'calf': partMultiplier = gun.calfMultiplier; break;
  default: partMultiplier = 1.0;
  }

  const trueDamage = gun.damage * partMultiplier * (ammo?.fleshDamageCoeff || 1);
  const decay = getDecay(gun, distance);

  let penetrateRate = 0;
  if (armorLevel > 0 && currentDurability > 0) {
    if (ammo.penetration > armorLevel + 1) penetrateRate = 1.0;
    else if (ammo.penetration === armorLevel + 1) penetrateRate = ammo.secondaryPenetration;
    else if (ammo.penetration === armorLevel) penetrateRate = ammo.sameLevelPenetration;
  } else {
    penetrateRate = 1.0;
  }

  let isProtected = false;
  if (targetArmorPiece && currentDurability > 0) {
    if (isHeadshot) isProtected = true;
    else if (hitSite === 'chest' && armor.chest) isProtected = true;
    else if (hitSite === 'abdomen' && armor.abdomen) isProtected = true;
    else if (hitSite === 'upperArm' && armor.upperArm) isProtected = true;
  }

  if (!isProtected) {
    const finalHealthDamage = trueDamage * decay;
    return {
      healthDamage: finalHealthDamage,
      newHelmetDurability: currentHelmetDurability,
      newArmorDurability: currentArmorDurability,
    };
  }

  const armorDamageCoeff = ammo[`armor${armorLevel}`] || 1;
  const armorDamage = gun.armorDamage * armorDamageCoeff * decay;
  let finalHealthDamage = 0;

  if (armorDamage >= currentDurability) {
    const damageReductionRatio = currentDurability / armorDamage;
    const directDamage = trueDamage * (1 - damageReductionRatio);
    const bluntDamage = trueDamage * damageReductionRatio * penetrateRate;
    finalHealthDamage = (directDamage + bluntDamage) * decay;
    currentDurability = 0;
  } else {
    finalHealthDamage = trueDamage * penetrateRate * decay;
    currentDurability -= armorDamage;
  }

  return {
    healthDamage: finalHealthDamage,
    newHelmetDurability: isHeadshot ? currentDurability : currentHelmetDurability,
    newArmorDurability: !isHeadshot ? currentDurability : currentArmorDurability,
  };
}

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

function runSingleTrial(cfg) {
  const { configuredWeapon, ammo, helmet, armor, helmetDurability, armorDurability, distance, initialHp, hitProbabilities, maxShots = 300 } = cfg;
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
    .map(([key, count]) => ({ key: Number(key), probability: totalCount > 0 ? count / totalCount : 0, count }))
    .sort((a, b) => a.key - b.key);
}

self.onmessage = (event) => {
  const { requestId, payload } = event.data || {};
  if (!payload) return;

  const { trials, chunkSize = 2000, ...trialConfig } = payload;
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
      self.postMessage({ type: 'progress', requestId, progress: (i + 1) / n });
    }
  }

  const btkDistribution = mapToDistribution(btkCounts, n).map((item) => ({ btk: item.key, probability: item.probability, count: item.count }));
  const ttkDistribution = mapToDistribution(ttkCounts, n).map((item) => ({ ttk: item.key, probability: item.probability, count: item.count }));

  self.postMessage({
    type: 'done',
    requestId,
    result: {
      trialCount: n,
      avgBtk: totalBtk / n,
      avgTtk: totalTtk / n,
      btkDistribution,
      ttkDistribution,
      btkDistributionJson: JSON.stringify(btkDistribution.map(({ btk, probability }) => ({ btk, probability })),
      ),
    },
  });
};
