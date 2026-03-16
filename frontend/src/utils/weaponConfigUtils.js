export function resolveVariantName(mappingOrName, baseWeaponName) {
  if (!mappingOrName) return null;
  if (typeof mappingOrName === 'string') return mappingOrName;
  if (typeof mappingOrName === 'object' && baseWeaponName) {
    return mappingOrName[baseWeaponName] || null;
  }
  return null;
}

export function buildConfiguredWeapon({
  selectedWeapon,
  selectedModIds = [],
  modifications = [],
  weapons = [],
}) {
  if (!selectedWeapon) return null;

  const selectedMods = selectedModIds
    .map((modId) => modifications.find((m) => m.id === modId))
    .filter(Boolean);

  const damageMod = selectedMods.find((mod) => mod?.effects?.damageChange === true);
  const specialRangeMod = selectedMods.find((mod) => mod?.effects?.specialRange === true);

  let baseWeaponProfile = selectedWeapon;
  let rangeWeaponProfile = selectedWeapon;

  if (damageMod) {
    const variantName = resolveVariantName(damageMod?.effects?.dataQueryName, selectedWeapon.name);
    const weaponVariant = weapons.find((w) => w.name === variantName);
    if (weaponVariant) baseWeaponProfile = weaponVariant;
  }

  if (specialRangeMod) {
    const variantName = resolveVariantName(
      specialRangeMod?.effects?.dataQueryName,
      selectedWeapon.name
    );
    const weaponVariant = weapons.find((w) => w.name === variantName);
    if (weaponVariant) rangeWeaponProfile = weaponVariant;
  }

  const finalWeaponStats = {
    ...selectedWeapon,
    damage: baseWeaponProfile.damage ?? selectedWeapon.damage,
    armorDamage: baseWeaponProfile.armorDamage ?? selectedWeapon.armorDamage,
    headMultiplier: baseWeaponProfile.headMultiplier ?? selectedWeapon.headMultiplier,
    chestMultiplier: baseWeaponProfile.chestMultiplier ?? selectedWeapon.chestMultiplier,
    abdomenMultiplier: baseWeaponProfile.abdomenMultiplier ?? selectedWeapon.abdomenMultiplier,
    upperArmMultiplier: baseWeaponProfile.upperArmMultiplier ?? selectedWeapon.upperArmMultiplier,
    lowerArmMultiplier: baseWeaponProfile.lowerArmMultiplier ?? selectedWeapon.lowerArmMultiplier,
    thighMultiplier: baseWeaponProfile.thighMultiplier ?? selectedWeapon.thighMultiplier,
    calfMultiplier: baseWeaponProfile.calfMultiplier ?? selectedWeapon.calfMultiplier,
    range1: rangeWeaponProfile.range1 ?? selectedWeapon.range1,
    range2: rangeWeaponProfile.range2 ?? selectedWeapon.range2,
    range3: rangeWeaponProfile.range3 ?? selectedWeapon.range3,
    range4: rangeWeaponProfile.range4 ?? selectedWeapon.range4,
    range5: rangeWeaponProfile.range5 ?? selectedWeapon.range5,
    decay1: rangeWeaponProfile.decay1 ?? selectedWeapon.decay1,
    decay2: rangeWeaponProfile.decay2 ?? selectedWeapon.decay2,
    decay3: rangeWeaponProfile.decay3 ?? selectedWeapon.decay3,
    decay4: rangeWeaponProfile.decay4 ?? selectedWeapon.decay4,
    decay5: rangeWeaponProfile.decay5 ?? selectedWeapon.decay5,
  };

  let totalFireRateModifier = 0;
  let totalRangeModifier = 0;
  let totalMuzzleVelocityModifier = 0;

  selectedMods.forEach((mod) => {
    if (!mod?.effects) return;
    totalFireRateModifier += mod.effects.fireRateModifier || 0;
    totalRangeModifier += mod.effects.rangeModifier || 0;
    totalMuzzleVelocityModifier += mod.effects.muzzleVelocityModifier || 0;
  });

  finalWeaponStats.fireRate *= 1 + totalFireRateModifier;
  finalWeaponStats.muzzleVelocity *= 1 + totalMuzzleVelocityModifier;

  const applyRangeModifier = (v) => (v === 999 ? 999 : v * (1 + totalRangeModifier));
  finalWeaponStats.range1 = applyRangeModifier(finalWeaponStats.range1);
  finalWeaponStats.range2 = applyRangeModifier(finalWeaponStats.range2);
  finalWeaponStats.range3 = applyRangeModifier(finalWeaponStats.range3);
  finalWeaponStats.range4 = applyRangeModifier(finalWeaponStats.range4);
  finalWeaponStats.range5 = applyRangeModifier(finalWeaponStats.range5);

  return finalWeaponStats;
}
