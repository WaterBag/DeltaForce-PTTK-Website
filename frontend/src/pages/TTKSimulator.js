import React, { useMemo, useState, useEffect } from 'react';
import { WeaponSelector } from '../components/simulator/Selectors';
import { AmmoSelector } from '../components/public/AmmoSelector';
import { ArmorSelector, HelmetSelector } from '../components/public/ArmorSittings';
import { UniversalSlider } from '../components/public/UniversalSlider';
import { BtkDistributionChart } from '../components/public/BtkDistributionChart';
import { TtkDistributionChart } from '../components/public/TtkDistributionChart';
import { useGameData } from '../hooks/useGameData';
import { generateDurabilityValues } from '../utils/numberUtils';
import {
  buildModsById,
  computeUnlockedSlots,
  isModSelectable,
  toggleModSelection,
} from '../utils/modSelectionUtils';
import { buildConfiguredWeapon } from '../utils/weaponConfigUtils';
import { DEFAULT_HIT_PROBABILITIES, runMonteCarlo } from '../utils/ttkMonteCarlo';
import './TTKSimulator.css';

const pickMaxDurabilityByLevel = (items, level) => {
  const candidates = (items || []).filter((item) => item.level === level && item.durability > 0);
  if (!candidates.length) return null;
  return candidates.reduce((best, current) =>
    (current.durability > best.durability ? current : best)
  );
};

const pickDefaultAmmo = (options) => {
  if (!options || options.length === 0) return null;
  return options.find((ammo) => ammo.penetration === 5)
    || options.find((ammo) => ammo.penetration === 4)
    || options[0]
    || null;
};

const createConfig = (id) => ({
  id,
  name: `方案 ${id}`,
  selectedWeapon: null,
  selectedAmmo: null,
  selectedHelmet: null,
  selectedArmor: null,
  helmetDurability: 0,
  armorDurability: 0,
  selectedMods: [],
  distance: 10,
  initialHp: 100,
  trialCount: 5000,
  hitProbabilities: { ...DEFAULT_HIT_PROBABILITIES },
  running: false,
  progress: 0,
  result: null,
});

function GunConfigCard({
  cfg,
  weapons,
  ammos,
  helmets,
  armors,
  modifications,
  onChange,
  onRun,
  onRemove,
}) {
  const availableAmmos = useMemo(() => {
    if (!cfg.selectedWeapon) return [];
    return (ammos || [])
      .filter((ammo) => ammo.caliber === cfg.selectedWeapon.caliber)
      .slice()
      .sort((a, b) => (b?.penetration ?? -1) - (a?.penetration ?? -1));
  }, [cfg.selectedWeapon, ammos]);

  useEffect(() => {
    if (!cfg.selectedWeapon || availableAmmos.length === 0) {
      if (cfg.selectedAmmo) onChange({ selectedAmmo: null });
      return;
    }
    const stillAvailable = cfg.selectedAmmo
      && availableAmmos.some((ammo) => ammo.id === cfg.selectedAmmo.id);
    if (!stillAvailable) {
      onChange({ selectedAmmo: pickDefaultAmmo(availableAmmos) });
    }
  }, [cfg.selectedWeapon, availableAmmos, cfg.selectedAmmo, onChange]);

  const availableMods = useMemo(() => {
    if (!cfg.selectedWeapon) return [];
    return (modifications || []).filter((mod) => {
      if (!mod.appliesTo?.includes(cfg.selectedWeapon.name)) return false;
      if (!mod.effects) return false;
      const effectValues = Object.values(mod.effects);
      const hasRealEffect = effectValues.some((v) => typeof v === 'number' && v !== 0);
      const hasDamageChange = mod.effects.damageChange === true;
      const hasUnlockSlots = Array.isArray(mod.effects.unlockSlots) && mod.effects.unlockSlots.length > 0;
      return hasRealEffect || hasDamageChange || hasUnlockSlots;
    });
  }, [cfg.selectedWeapon, modifications]);

  const modsById = useMemo(() => buildModsById(availableMods || []), [availableMods]);
  const unlockedSlots = useMemo(
    () => computeUnlockedSlots(cfg.selectedMods, modsById),
    [cfg.selectedMods, modsById]
  );

  const groupedMods = useMemo(() => {
    return availableMods.reduce((groups, mod) => {
      const type = mod.type?.[0] || '未分类';
      if (!groups[type]) groups[type] = [];
      groups[type].push(mod);
      return groups;
    }, {});
  }, [availableMods]);

  const helmetDurabilityValues = useMemo(() => {
    if (!cfg.selectedHelmet || cfg.selectedHelmet.durability <= 0) return [];
    return generateDurabilityValues(cfg.selectedHelmet.durability, 0, 1);
  }, [cfg.selectedHelmet]);

  const armorDurabilityValues = useMemo(() => {
    if (!cfg.selectedArmor || cfg.selectedArmor.durability <= 0) return [];
    return generateDurabilityValues(cfg.selectedArmor.durability, 0, 1);
  }, [cfg.selectedArmor]);

  return (
    <section className="ttk-card">
      <div className="ttk-card-header">
        <h3>{cfg.name}</h3>
        <button type="button" className="ttk-btn danger" onClick={onRemove}>移除</button>
      </div>

      <div className="ttk-grid">
        <WeaponSelector
          selectedWeapon={cfg.selectedWeapon}
          onSelect={(weapon) => onChange({ selectedWeapon: weapon, selectedMods: [] })}
        />
        <AmmoSelector
          options={availableAmmos}
          selectedAmmo={cfg.selectedAmmo}
          onSelect={(ammo) => onChange({ selectedAmmo: ammo })}
          placeholder="选择弹药"
          emptyOptionsMessage="请先选择武器"
        />
        <HelmetSelector
          options={helmets}
          selectedHelmet={cfg.selectedHelmet}
          onSelect={(helmet) => onChange({ selectedHelmet: helmet, helmetDurability: helmet.durability })}
        />
        <ArmorSelector
          options={armors}
          selectedArmor={cfg.selectedArmor}
          onSelect={(armor) => onChange({ selectedArmor: armor, armorDurability: armor.durability })}
        />
      </div>

      <div className="ttk-grid sliders">
        <UniversalSlider
          label="距离(米)"
          values={Array.from({ length: 301 }, (_, i) => i)}
          value={cfg.distance}
          onChange={(distance) => onChange({ distance })}
        />
        <UniversalSlider
          label="初始血量"
          values={Array.from({ length: 300 }, (_, i) => i + 1)}
          value={cfg.initialHp}
          onChange={(initialHp) => onChange({ initialHp })}
        />
        <UniversalSlider
          label="头盔耐久"
          values={helmetDurabilityValues}
          value={cfg.helmetDurability}
          onChange={(helmetDurability) => onChange({ helmetDurability })}
          isDisabled={!cfg.selectedHelmet}
        />
        <UniversalSlider
          label="护甲耐久"
          values={armorDurabilityValues}
          value={cfg.armorDurability}
          onChange={(armorDurability) => onChange({ armorDurability })}
          isDisabled={!cfg.selectedArmor}
        />
      </div>

      <div className="ttk-line">
        <label htmlFor={`trial-${cfg.id}`}>模拟次数 N</label>
        <input
          id={`trial-${cfg.id}`}
          type="number"
          min={100}
          max={100000}
          step={100}
          value={cfg.trialCount}
          onChange={(e) => onChange({ trialCount: Math.max(100, Math.min(100000, Number(e.target.value) || 100)) })}
        />
      </div>

      <div className="probabilities">
        {Object.keys(DEFAULT_HIT_PROBABILITIES).map((site) => (
          <label key={site} className="prob-item" htmlFor={`${cfg.id}-${site}`}>
            <span>{site}</span>
            <input
              id={`${cfg.id}-${site}`}
              type="number"
              min={0}
              step={0.01}
              value={cfg.hitProbabilities[site] ?? 0}
              onChange={(e) => onChange({
                hitProbabilities: {
                  ...cfg.hitProbabilities,
                  [site]: Number(e.target.value) || 0,
                },
              })}
            />
          </label>
        ))}
      </div>

      <div className="mods">
        {Object.entries(groupedMods).map(([group, mods]) => (
          <div key={group} className="mod-group">
            <h4>{group}</h4>
            <div className="mod-chips">
              {mods.map((mod) => {
                const selected = cfg.selectedMods.includes(mod.id);
                const disabled = !selected && !isModSelectable(mod, unlockedSlots);
                return (
                  <button
                    key={mod.id}
                    type="button"
                    disabled={disabled}
                    className={`mod-chip ${selected ? 'selected' : ''}`}
                    onClick={() => {
                      const next = toggleModSelection({
                        modId: mod.id,
                        isSelected: !selected,
                        selectedModIds: cfg.selectedMods,
                        availableMods,
                        baseUnlockedSlots: new Set(),
                      });
                      onChange({ selectedMods: next });
                    }}
                  >
                    {mod.name}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="ttk-actions">
        <button type="button" className="ttk-btn primary" onClick={onRun} disabled={cfg.running}>
          {cfg.running ? `计算中 ${Math.round(cfg.progress * 100)}%` : '开始模拟'}
        </button>
      </div>

      {cfg.result && (
        <div className="ttk-result">
          <div className="summary">
            <div>平均BTK: {cfg.result.avgBtk.toFixed(2)}</div>
            <div>平均TTK: {Math.round(cfg.result.avgTtk)} ms</div>
            <div>样本数: {cfg.result.trialCount}</div>
            <div>理论射速: {Math.round(cfg.result.fireRate || 0)} RPM</div>
          </div>
          <div className="chart-grid">
            <div className="chart-box">
              <h4>BTK 概率分布</h4>
              <BtkDistributionChart btkData={cfg.result.btkDistributionJson} />
            </div>
            <div className="chart-box">
              <h4>TTK 概率分布</h4>
              <TtkDistributionChart ttkData={cfg.result.ttkDistribution} />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export function TTKSimulator() {
  const { data } = useGameData();
  const weapons = data?.weapons || [];
  const ammos = data?.ammos || [];
  const helmets = data?.helmets || [];
  const armors = data?.armors || [];
  const modifications = data?.modifications || [];

  const [configs, setConfigs] = useState([createConfig(1)]);

  useEffect(() => {
    if (!helmets.length || !armors.length) return;
    const defaultHelmet = pickMaxDurabilityByLevel(helmets, 5);
    const defaultArmor = pickMaxDurabilityByLevel(armors, 5);

    setConfigs((prev) => prev.map((cfg) => {
      if (cfg.selectedHelmet && cfg.selectedArmor) return cfg;
      return {
        ...cfg,
        selectedHelmet: cfg.selectedHelmet || defaultHelmet,
        selectedArmor: cfg.selectedArmor || defaultArmor,
        helmetDurability: cfg.selectedHelmet ? cfg.helmetDurability : (defaultHelmet?.durability || 0),
        armorDurability: cfg.selectedArmor ? cfg.armorDurability : (defaultArmor?.durability || 0),
      };
    }));
  }, [helmets, armors]);

  const addConfig = () => {
    setConfigs((prev) => [...prev, createConfig(prev.length + 1)]);
  };

  const updateConfig = (id, patch) => {
    setConfigs((prev) => prev.map((cfg) => (cfg.id === id ? { ...cfg, ...patch } : cfg)));
  };

  const removeConfig = (id) => {
    setConfigs((prev) => prev.length <= 1 ? prev : prev.filter((cfg) => cfg.id !== id));
  };

  const runConfig = async (cfg) => {
    if (!cfg.selectedWeapon || !cfg.selectedAmmo || !cfg.selectedHelmet || !cfg.selectedArmor) return;

    const configuredWeapon = buildConfiguredWeapon({
      selectedWeapon: cfg.selectedWeapon,
      selectedModIds: cfg.selectedMods,
      modifications,
      weapons,
    });

    if (!configuredWeapon) return;

    updateConfig(cfg.id, { running: true, progress: 0, result: null });

    const result = await runMonteCarlo({
      configuredWeapon,
      ammo: cfg.selectedAmmo,
      helmet: cfg.selectedHelmet,
      armor: cfg.selectedArmor,
      helmetDurability: cfg.helmetDurability,
      armorDurability: cfg.armorDurability,
      distance: cfg.distance,
      initialHp: cfg.initialHp,
      hitProbabilities: cfg.hitProbabilities,
      trials: cfg.trialCount,
      chunkSize: 1000,
      onProgress: (progress) => updateConfig(cfg.id, { progress }),
    });

    updateConfig(cfg.id, {
      running: false,
      progress: 1,
      result: {
        ...result,
        fireRate: configuredWeapon.fireRate,
      },
    });
  };

  return (
    <div className="ttk-page">
      <div className="ttk-topbar">
        <h2>Monte Carlo TTK 模拟器（多枪独立条件对比）</h2>
        <button type="button" className="ttk-btn primary" onClick={addConfig}>新增对比枪</button>
      </div>

      {configs.map((cfg) => (
        <GunConfigCard
          key={cfg.id}
          cfg={cfg}
          weapons={weapons}
          ammos={ammos}
          helmets={helmets}
          armors={armors}
          modifications={modifications}
          onChange={(patch) => updateConfig(cfg.id, patch)}
          onRun={() => runConfig(cfg)}
          onRemove={() => removeConfig(cfg.id)}
        />
      ))}
    </div>
  );
}
