import React from 'react';
import './WeaponList.css';
import { WeaponModPanel } from './WeaponModPanel';
import { ModifiedWeaponStats } from './ModifiedWeaponStats';
import { modifications } from '../../assets/data/firefight/modifications';

function numberValue(value) {
  return Number(value) || 0;
}

function formatOne(value) {
  return numberValue(value).toFixed(1);
}

function formatInt(value) {
  return Math.round(numberValue(value));
}

function matchVariantName(value, weaponName) {
  if (typeof value === 'string') return value === weaponName;
  if (Array.isArray(value)) return value.includes(weaponName);
  if (value && typeof value === 'object') return Object.values(value).includes(weaponName);
  return false;
}

function formatMultiplier(value) {
  return `${Math.round(numberValue(value) * 100)}%`;
}

function formatRange(range) {
  return range === Infinity ? '∞' : `${range}m`;
}

function buildDecayBands(weapon, rangeModifier = 0) {
  const thresholds = [
    { range: weapon.range1, decay: weapon.decay1 },
    { range: weapon.range2, decay: weapon.decay2 },
    { range: weapon.range3, decay: weapon.decay3 },
    { range: weapon.range4, decay: weapon.decay4 },
    { range: weapon.range5, decay: weapon.decay5 },
  ]
    .filter((item) => numberValue(item.range) > 0)
    .map((item) => {
      const baseRange = numberValue(item.range);
      const range = baseRange >= 500 || baseRange === 999
        ? Infinity
        : Math.round(baseRange * (1 + rangeModifier));
      return {
        range,
        decay: numberValue(item.decay),
      };
    })
    .filter((item, index, arr) => index === 0 || item.range !== arr[index - 1].range);

  if (thresholds.length === 0) {
    return [{ rangeLabel: '全距离', decayLabel: '100%' }];
  }

  const segments = [];
  let start = 0;
  let currentDecay = 1;

  thresholds.forEach((item) => {
    if (item.range !== Infinity && item.range > start) {
      segments.push({
        start,
        end: item.range,
        decay: currentDecay,
      });
      start = item.range;
    }
    currentDecay = item.decay;
  });

  segments.push({
    start,
    end: Infinity,
    decay: currentDecay,
  });

  const mergedSegments = segments.reduce((merged, segment) => {
    const prev = merged[merged.length - 1];
    if (prev && prev.decay === segment.decay && prev.end === segment.start) {
      prev.end = segment.end;
      return merged;
    }
    merged.push({ ...segment });
    return merged;
  }, []);

  return mergedSegments.map((segment) => ({
    rangeLabel: `${formatRange(segment.start)}-${formatRange(segment.end)}`,
    decayLabel: formatMultiplier(segment.decay),
  }));
}

function StatColumn({ label, value, subLabel, subValue, tone = '' }) {
  return (
    <div className={`weapon-stat-col ${tone}`}>
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
      <span className="stat-sub-label">{subLabel}</span>
      <span className="stat-sub-value">{subValue}</span>
    </div>
  );
}

function DecayBands({ weapon, rangeModifier }) {
  const bands = buildDecayBands(weapon, rangeModifier);

  return (
    <div className="weapon-decay-cell" aria-label="射程衰减">
      {bands.map((band) => (
        <div key={`${band.rangeLabel}-${band.decayLabel}`} className="decay-band">
          <span className="decay-range">{band.rangeLabel}</span>
          <span className="decay-value">{band.decayLabel}</span>
        </div>
      ))}
    </div>
  );
}

export function WeaponList({ weapons, onCaliberClick }) {
  const [expandedWeaponId, setExpandedWeaponId] = React.useState(null);
  const [weaponMods, setWeaponMods] = React.useState({});

  const getRangeModifier = (weapon) => {
    if (!weapon.isModification) return 0;
    const variantMod = modifications.find((mod) => (
      matchVariantName(mod?.effects?.dataQueryName, weapon.name) ||
      matchVariantName(mod?.effects?.btkQueryName, weapon.name)
    ));
    return variantMod?.effects?.rangeModifier || 0;
  };

  const getDisplayWeaponStats = (weapon) => {
    if (!weapon.isModification) {
      const fireRate = numberValue(weapon.fireRate);
      const armorDamage = numberValue(weapon.armorDamage);
      const damage = numberValue(weapon.damage);
      return {
        ...weapon,
        armorDPS: weapon.armorDPS ?? armorDamage * fireRate / 60,
        fleshDPS: weapon.fleshDPS ?? damage * fireRate / 60,
      };
    }

    const variantMod = modifications.find((mod) => (
      matchVariantName(mod?.effects?.dataQueryName, weapon.name) ||
      matchVariantName(mod?.effects?.btkQueryName, weapon.name)
    ));

    if (!variantMod?.effects) return weapon;

    const baseName = variantMod?.appliesTo?.[0];
    const baseWeapon = baseName ? weapons.find((item) => item.name === baseName) : null;
    const mergedWeapon = baseWeapon ? { ...baseWeapon, ...weapon } : weapon;
    const fireRate = numberValue(mergedWeapon.fireRate) * (1 + (variantMod.effects.fireRateModifier || 0));
    const muzzleVelocity = numberValue(mergedWeapon.muzzleVelocity) * (1 + (variantMod.effects.muzzleVelocityModifier || 0));

    return {
      ...mergedWeapon,
      fireRate,
      muzzleVelocity,
      armorDPS: numberValue(mergedWeapon.armorDamage) * fireRate / 60,
      fleshDPS: numberValue(mergedWeapon.damage) * fireRate / 60,
    };
  };

  const toggleWeaponExpanded = (weaponId) => {
    setExpandedWeaponId((prev) => (prev === weaponId ? null : weaponId));
  };

  const handleRowKeyDown = (event, weaponId) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggleWeaponExpanded(weaponId);
    }
  };

  const handleModsChange = (weaponId, mods) => {
    setWeaponMods((prev) => ({
      ...prev,
      [weaponId]: mods,
    }));
  };

  if (!weapons || weapons.length === 0) {
    return (
      <div className="empty-list">
        <p>未找到匹配的武器</p>
      </div>
    );
  }

  return (
    <div className="weapon-list-container">
      <div className="weapon-grid-header">
        <span>武器</span>
        <span>甲伤 / 肉伤 / 射速 / 部位倍率</span>
        <span>射程衰减</span>
      </div>

      <div className="weapon-list">
        {weapons.map((weapon) => {
          const isExpanded = expandedWeaponId === weapon.id;
          const selectedMods = weaponMods[weapon.id] || [];
          const rangeModifier = getRangeModifier(weapon);
          const displayWeapon = getDisplayWeaponStats(weapon);
          const headDamage = numberValue(displayWeapon.damage) * numberValue(displayWeapon.headMultiplier);
          const chestDamage = numberValue(displayWeapon.damage) * numberValue(displayWeapon.chestMultiplier);
          const abdomenDamage = numberValue(displayWeapon.damage) * numberValue(displayWeapon.abdomenMultiplier);
          const armDamage = numberValue(displayWeapon.damage) * numberValue(displayWeapon.upperArmMultiplier);

          return (
            <article key={weapon.id} className={`weapon-item-wrapper ${isExpanded ? 'expanded' : ''}`}>
              <div
                className="weapon-row"
                role="button"
                tabIndex={0}
                onClick={() => toggleWeaponExpanded(weapon.id)}
                onKeyDown={(event) => handleRowKeyDown(event, weapon.id)}
              >
                <div className="weapon-identity">
                  {weapon.image ? (
                    <img src={weapon.image} alt={weapon.name} className="weapon-image" />
                  ) : (
                    <div className="weapon-image empty" />
                  )}
                  <div className="weapon-name-section">
                    <span className="weapon-name">{weapon.name}</span>
                    <div className="weapon-meta">
                      <button
                        type="button"
                        className="weapon-caliber"
                        onClick={(event) => {
                          event.stopPropagation();
                          onCaliberClick(displayWeapon.caliber);
                        }}
                        title="查看同口径弹药"
                      >
                        {displayWeapon.caliber}
                      </button>
                      {numberValue(displayWeapon.triggerDelay) > 0 && (
                        <span className="trigger-delay">扳机 {formatInt(displayWeapon.triggerDelay)}ms</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="weapon-stat-strip">
                  <StatColumn
                    label="甲伤"
                    value={formatOne(displayWeapon.armorDamage)}
                    subLabel="每秒"
                    subValue={formatOne(displayWeapon.armorDPS)}
                    tone="primary"
                  />
                  <StatColumn
                    label="肉伤"
                    value={formatOne(displayWeapon.damage)}
                    subLabel="每秒"
                    subValue={formatOne(displayWeapon.fleshDPS)}
                    tone="primary"
                  />
                  <StatColumn
                    label="射速"
                    value={`${formatInt(displayWeapon.fireRate)} RPM`}
                    subLabel="初速"
                    subValue={`${formatInt(displayWeapon.muzzleVelocity)} m/s`}
                  />
                  <StatColumn
                    label="头部"
                    value={`${formatOne(headDamage)} (${numberValue(displayWeapon.headMultiplier).toFixed(1)}x)`}
                    subLabel="胸部"
                    subValue={`${formatOne(chestDamage)} (${numberValue(displayWeapon.chestMultiplier).toFixed(1)}x)`}
                  />
                  <StatColumn
                    label="腹部"
                    value={`${formatOne(abdomenDamage)} (${numberValue(displayWeapon.abdomenMultiplier).toFixed(1)}x)`}
                    subLabel="手臂"
                    subValue={`${formatOne(armDamage)} (${numberValue(displayWeapon.upperArmMultiplier).toFixed(1)}x)`}
                  />
                </div>

                <DecayBands weapon={displayWeapon} rangeModifier={rangeModifier} />

                <div className="expand-indicator" aria-hidden="true">
                  {isExpanded ? '▲' : '▼'}
                </div>
              </div>

              {isExpanded && (
                <div className="weapon-expanded-content">
                  <div className="expanded-left-section">
                    <WeaponModPanel
                      weapon={weapon}
                      selectedMods={selectedMods}
                      onModsChange={(mods) => handleModsChange(weapon.id, mods)}
                    />
                  </div>
                  <div className="expanded-middle-section">
                    <ModifiedWeaponStats
                      weapon={weapon}
                      selectedMods={selectedMods}
                      showOnlyStats={true}
                    />
                  </div>
                  <div className="expanded-right-section">
                    <ModifiedWeaponStats
                      weapon={weapon}
                      selectedMods={selectedMods}
                      showOnlyChart={true}
                    />
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
