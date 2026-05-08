import React, { useEffect, useMemo, useState } from 'react';
import { TargetDummy } from '../../components/simulator/TargetDummy';
import { WeaponSelector } from '../../components/simulator/Selectors';
import { useGameData } from '../../hooks/useGameData';
import {
  BATTLEFIELD_HIT_PARTS,
  buildBattlefieldConfiguredWeapon,
  calculateBattlefieldDamage,
  formatBattlefieldRangeBands,
  getBattlefieldApplicableMods,
  getBattlefieldWeaponSummary,
  isBattlefieldVariantWeapon,
} from '../../utils/battlefieldUtils';
import {
  buildModsById,
  computeUnlockedSlots,
  inferBaseUnlockedSlots,
  isModSelectable,
  mergeUnlockedSlots,
  toggleModSelection,
} from '../../utils/modSelectionUtils';
import './BattlefieldPages.css';

const EMPTY_WEAPONS = [];
const EMPTY_MODS = [];
const DEFAULT_WEAPON_NAMES = ['腾龙', 'M7'];

function formatNumber(value, digits = 1) {
  const number = Number(value) || 0;
  return number.toFixed(digits).replace(/\.0$/, '');
}

function formatModEffects(mod) {
  const effects = mod?.effects || {};
  const items = [];

  if (effects.rangeModifier) items.push(`射程 ${effects.rangeModifier > 0 ? '+' : ''}${Math.round(effects.rangeModifier * 100)}%`);
  if (effects.fireRateModifier) items.push(`射速 ${effects.fireRateModifier > 0 ? '+' : ''}${Math.round(effects.fireRateModifier * 100)}%`);
  if (effects.muzzleVelocityModifier) items.push(`初速 ${effects.muzzleVelocityModifier > 0 ? '+' : ''}${Math.round(effects.muzzleVelocityModifier * 100)}%`);
  if (effects.damageChange) items.push('改写伤害档位');
  if (effects.specialRange) items.push('改写衰减档位');
  if (effects.unlockSlots || effects.unlock_slots) items.push('解锁槽位');

  return items.length ? items.join(' / ') : '仅用于槽位互斥';
}

function getLimbMultiplier(weapon) {
  const values = [
    weapon?.upperArmMultiplier,
    weapon?.lowerArmMultiplier,
    weapon?.thighMultiplier,
    weapon?.calfMultiplier,
  ].map((value) => Number(value) || 1);
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function groupMods(mods) {
  return mods.reduce((groups, mod) => {
    const groupName = Array.isArray(mod.type) ? mod.type.join(' / ') : (mod.type || '其他');
    if (!groups[groupName]) groups[groupName] = [];
    groups[groupName].push(mod);
    return groups;
  }, {});
}

function getDefaultWeapon(weapons) {
  return DEFAULT_WEAPON_NAMES
    .map((name) => weapons.find((weapon) => weapon?.name === name || weapon?.sourceName === name))
    .find(Boolean) || weapons[0] || null;
}

export function BattlefieldSimulator() {
  const { data } = useGameData('battlefield');
  const weapons = data.weapons || EMPTY_WEAPONS;
  const modifications = data.modifications || EMPTY_MODS;
  const selectableWeapons = useMemo(
    () => weapons.filter((weapon) => !isBattlefieldVariantWeapon(weapon, modifications)),
    [weapons, modifications]
  );
  const defaultWeapon = useMemo(() => getDefaultWeapon(selectableWeapons), [selectableWeapons]);
  const [selectedWeapon, setSelectedWeapon] = useState(null);
  const [selectedMods, setSelectedMods] = useState([]);
  const [distance, setDistance] = useState(30);
  const [initialHp, setInitialHp] = useState(100);
  const [targetHp, setTargetHp] = useState(100);
  const [hitLog, setHitLog] = useState([]);
  const [hoveredMod, setHoveredMod] = useState(null);
  const [modTooltipPos, setModTooltipPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!selectedWeapon && defaultWeapon) {
      setSelectedWeapon(defaultWeapon);
    }
  }, [selectedWeapon, defaultWeapon]);

  const availableMods = useMemo(
    () => getBattlefieldApplicableMods(selectedWeapon, modifications),
    [selectedWeapon, modifications]
  );
  const groupedMods = useMemo(() => groupMods(availableMods), [availableMods]);
  const modsById = useMemo(() => buildModsById(availableMods), [availableMods]);
  const baseUnlockedSlots = useMemo(() => inferBaseUnlockedSlots(availableMods), [availableMods]);
  const unlockedSlots = useMemo(
    () => computeUnlockedSlots(selectedMods, modsById),
    [selectedMods, modsById]
  );
  const mergedUnlockedSlots = useMemo(
    () => mergeUnlockedSlots(baseUnlockedSlots, unlockedSlots),
    [baseUnlockedSlots, unlockedSlots]
  );

  const configuredWeapon = useMemo(() => buildBattlefieldConfiguredWeapon({
    selectedWeapon,
    selectedModIds: selectedMods,
    modifications,
    weapons,
  }), [selectedWeapon, selectedMods, modifications, weapons]);
  const summary = useMemo(
    () => getBattlefieldWeaponSummary(configuredWeapon, distance),
    [configuredWeapon, distance]
  );
  const rangeBands = useMemo(
    () => formatBattlefieldRangeBands(configuredWeapon),
    [configuredWeapon]
  );

  useEffect(() => {
    setTargetHp(Math.max(1, Number(initialHp) || 100));
    setHitLog([]);
  }, [selectedWeapon, selectedMods, initialHp]);

  const resetTarget = () => {
    const hp = Math.max(1, Number(initialHp) || 100);
    setTargetHp(hp);
    setHitLog([]);
  };

  const handleWeaponSelect = (weapon) => {
    setSelectedWeapon(weapon);
    setSelectedMods([]);
  };

  const handleModToggle = (modId, isSelected) => {
    setSelectedMods((current) => toggleModSelection({
      modId,
      isSelected,
      selectedModIds: current,
      availableMods,
      baseUnlockedSlots,
    }));
  };

  const applyHit = (partKey) => {
    if (!configuredWeapon) return;
    if (targetHp <= 0) return;

    const damage = calculateBattlefieldDamage(configuredWeapon, partKey, distance);
    const part = BATTLEFIELD_HIT_PARTS.find((item) => item.key === partKey);
    const nextHp = Math.max(0, targetHp - damage);
    const hitCount = hitLog.filter((item) => !item.isKill).length + 1;
    const ttk = hitCount > 1 && configuredWeapon.fireRate > 0
      ? ((hitCount - 1) * 60000) / configuredWeapon.fireRate
      : 0;

    const nextEntries = [{
      id: `${Date.now()}-${partKey}`,
      text: `${part?.label || '部位'} 命中，${formatNumber(damage)} 伤害，剩余 ${formatNumber(nextHp)} HP`,
    }];

    if (nextHp <= 0) {
      nextEntries.push({
        id: `${Date.now()}-kill`,
        isKill: true,
        text: `击倒：${hitCount} 发，TTK ${formatNumber(ttk, 0)} ms`,
      });
    }

    setTargetHp(nextHp);
    setHitLog((current) => [...nextEntries, ...current].slice(0, 12));
  };

  const targetHpMax = Math.max(1, Number(initialHp) || 100);
  const hpRatio = Math.max(0, Math.min(100, (targetHp / targetHpMax) * 100));

  return (
    <section className="battlefield-simulator-shell">
      <aside className="battlefield-sim-column">
        <div className="battlefield-panel">
          <div className="battlefield-panel-title">
            <h1>模拟参数</h1>
          </div>

          <div className="battlefield-control-grid battlefield-sim-params">
            <label>
              <span>距离 m</span>
              <input type="number" min="0" value={distance} onChange={(event) => setDistance(Number(event.target.value))} />
            </label>
            <label>
              <span>目标血量</span>
              <input
                type="number"
                min="1"
                value={initialHp}
                onChange={(event) => {
                  const nextHp = Math.max(1, Number(event.target.value) || 100);
                  setInitialHp(nextHp);
                  setTargetHp(nextHp);
                  setHitLog([]);
                }}
              />
            </label>
          </div>

          <div className="battlefield-hp-block battlefield-hp-compact">
            <span>当前目标</span>
            <strong>{formatNumber(targetHp)} / {targetHpMax} HP</strong>
            <div><i style={{ width: `${hpRatio}%` }} /></div>
          </div>

        </div>

        <div className="battlefield-panel battlefield-log battlefield-log-panel">
          {hitLog.length === 0 ? (
            <p>点击中间假人的部位开始模拟射击。</p>
          ) : hitLog.map((item) => (
            <div key={item.id} className={item.isKill ? 'is-kill' : ''}>{item.text}</div>
          ))}
        </div>
      </aside>

      <main className="battlefield-panel battlefield-sim-stage">
        <div className="battlefield-stage-hint">点击假人部位进行模拟射击</div>
        <div className="battlefield-dummy-stage single">
          <TargetDummy onHit={applyHit} />
        </div>
        <button className="reset-simulation-button" onClick={resetTarget}>
          重置假人状态
        </button>
      </main>

      <aside className="battlefield-sim-column">
        <div className="battlefield-panel">
          <div className="battlefield-selector-block">
            <WeaponSelector selectedWeapon={selectedWeapon} onSelect={handleWeaponSelect} options={selectableWeapons} />
          </div>

          <div className="mod-section battlefield-mod-editor compact">
            <h3>可选配件</h3>
            {availableMods.length === 0 ? (
              <p className="battlefield-no-mods">这把枪暂时没有可用配件。</p>
            ) : (
              <div className="battlefield-mod-groups">
                {Object.entries(groupedMods).map(([groupName, mods]) => (
                  <div className="battlefield-mod-group" key={groupName}>
                    <h3>{groupName}</h3>
                    <div className="battlefield-mod-chips">
                      {mods.map((mod) => {
                        const selected = selectedMods.includes(mod.id);
                        const selectable = selected || isModSelectable(mod, mergedUnlockedSlots);
                        return (
                          <button
                            key={mod.id}
                            type="button"
                            className={`battlefield-mod-chip ${selected ? 'selected' : ''}`}
                            disabled={!selectable}
                            onClick={() => handleModToggle(mod.id, !selected)}
                            onMouseEnter={(event) => {
                              setHoveredMod(mod);
                              setModTooltipPos({ x: event.clientX, y: event.clientY });
                            }}
                            onMouseMove={(event) => setModTooltipPos({ x: event.clientX, y: event.clientY })}
                            onMouseLeave={() => setHoveredMod(null)}
                          >
                            {mod.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="battlefield-panel summary-panel">
          <div className="battlefield-final-grid">
            <div><span>基础</span><strong>{formatNumber(configuredWeapon?.damage)}</strong></div>
            <div><span>射速</span><strong>{formatNumber(configuredWeapon?.fireRate, 0)}</strong></div>
            <div><span>初速</span><strong>{formatNumber(configuredWeapon?.muzzleVelocity, 0)} m/s</strong></div>
            <div><span>DPS</span><strong>{formatNumber(summary.dps, 0)}</strong></div>
            <div><span>头部</span><strong>{formatNumber(summary.headDamage)}</strong></div>
            <div><span>头倍率</span><strong>×{formatNumber(configuredWeapon?.headMultiplier, 2)}</strong></div>
            <div><span>胸部</span><strong>{formatNumber(summary.chestDamage)}</strong></div>
            <div><span>胸倍率</span><strong>×{formatNumber(configuredWeapon?.chestMultiplier, 2)}</strong></div>
            <div><span>腹部</span><strong>{formatNumber(summary.abdomenDamage)}</strong></div>
            <div><span>腹倍率</span><strong>×{formatNumber(configuredWeapon?.abdomenMultiplier, 2)}</strong></div>
            <div><span>四肢</span><strong>{formatNumber(summary.limbDamage)}</strong></div>
            <div><span>肢倍率</span><strong>×{formatNumber(getLimbMultiplier(configuredWeapon), 2)}</strong></div>
          </div>
          <div className="battlefield-range-list compact-ranges simulator-ranges">
            {rangeBands.map((band) => (
              <div key={band.rangeLabel}>
                <span>{band.rangeLabel}</span>
                <strong>{Math.round(band.decay * 100)}%</strong>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {hoveredMod && (
        <div className="battlefield-mod-tooltip" style={{ left: modTooltipPos.x + 12, top: modTooltipPos.y + 12 }}>
          <strong>{hoveredMod.name}</strong>
          <span>{formatModEffects(hoveredMod)}</span>
        </div>
      )}
    </section>
  );
}
