import React, { useMemo, useState, useEffect, useRef } from 'react';
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
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  LineChart,
  Line,
  Legend,
} from 'recharts';
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

const createConfig = (id, defaultDistance = 10) => ({
  id,
  name: `方案 ${id}`,
  selectedWeapon: null,
  selectedAmmo: null,
  selectedHelmet: null,
  selectedArmor: null,
  helmetDurability: 0,
  armorDurability: 0,
  selectedMods: [],
  distance: defaultDistance,
  initialHp: 100,
  trialCount: 5000,
  hitProbabilities: { ...DEFAULT_HIT_PROBABILITIES },
  chartMode: 'ttk',
  running: false,
  progress: 0,
  lineRunning: false,
  lineProgress: 0,
  result: null,
});

const PROBABILITY_FIELDS = [
  { key: 'head', label: '头部', sites: ['head'] },
  { key: 'chest', label: '胸部', sites: ['chest'] },
  { key: 'abdomen', label: '腹部', sites: ['abdomen'] },
  { key: 'upperArm', label: '上臂', sites: ['upperArm'] },
  { key: 'limbs', label: '其余四肢(下臂+大腿+小腿)', sites: ['lowerArm', 'thigh', 'calf'] },
];

const getDisplayProbability = (hitProbabilities, sites) => {
  return sites.reduce((sum, site) => sum + (Number(hitProbabilities?.[site]) || 0), 0);
};

const setGroupedProbability = (hitProbabilities, sites, value) => {
  const normalized = Math.max(0, Number(value) || 0);
  if (sites.length === 1) {
    return { ...hitProbabilities, [sites[0]]: normalized };
  }

  const perSite = normalized / sites.length;
  const next = { ...hitProbabilities };
  sites.forEach((site) => {
    next[site] = perSite;
  });
  return next;
};

const BAR_COLORS = ['#2563eb', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const applyTtkEffects = ({
  baseTtk,
  distance,
  configuredWeapon,
  applyVelocityEffect,
  applyTriggerDelay,
}) => {
  let ttk = Number(baseTtk) || 0;
  if (applyVelocityEffect) {
    const v = Number(configuredWeapon?.muzzleVelocity) || 0;
    if (v > 0) ttk += (distance / v) * 1000;
  }
  if (applyTriggerDelay) {
    const t = Number(configuredWeapon?.triggerDelay) || 0;
    if (t > 0) ttk += t;
  }
  return ttk;
};

const expandSegmentSeriesToDense = (segmentSeries = [], maxDistance = 100) => {
  if (!Array.isArray(segmentSeries) || segmentSeries.length === 0) return [];
  const sorted = [...segmentSeries].sort((a, b) => a.distance - b.distance);
  const dense = [];
  let idx = 0;

  for (let d = 0; d <= maxDistance; d += 1) {
    while (idx + 1 < sorted.length && d >= sorted[idx + 1].distance) {
      idx += 1;
    }
    dense.push({
      distance: d,
      avgTtk: sorted[idx].avgTtk,
      avgBtk: sorted[idx].avgBtk,
    });
  }

  return dense;
};

const getSegmentDistances = (configuredWeapon, maxDistance = 100) => {
  if (!configuredWeapon) return [0, maxDistance];

  const r1 = Number(configuredWeapon.range1);
  const r2 = Number(configuredWeapon.range2);
  const r3 = Number(configuredWeapon.range3);
  const r4 = Number(configuredWeapon.range4);
  const r5 = Number(configuredWeapon.range5);

  // 采样“各段起点”：0 段 + (rangeN + 1)
  // 因为衰减判定是 <= rangeN 仍属于上一段
  const points = [
    0,
    r1 + 1,
    r2 + 1,
    r3 + 1,
    r4 + 1,
    r5 + 1,
    maxDistance,
  ]
    .filter((v) => Number.isFinite(v) && v >= 0 && v <= maxDistance)
    .map((v) => Math.round(v));

  return [...new Set(points)].sort((a, b) => a - b);
};

function ComparisonTooltip({ active, payload, metric }) {
  if (!active || !payload || payload.length === 0) return null;
  const data = payload[0]?.payload;
  if (!data) return null;

  return (
    <div className="compare-tooltip">
      <div className="compare-tooltip-title">{data.weaponName}</div>
      <div>方案：{data.name}</div>
      <div>弹药：{data.ammoName}</div>
      <div>平均TTK：{Math.round(data.avgTtk)} ms</div>
      <div>平均BTK：{data.avgBtk.toFixed(2)}</div>
      <div>{metric === 'ttk' ? '当前柱值：TTK' : '当前柱值：BTK'} = {metric === 'ttk' ? `${Math.round(data.avgTtk)} ms` : data.avgBtk.toFixed(2)}</div>
      <div>样本数：{data.trialCount}</div>
    </div>
  );
}

function ComparisonBarChart({ rows, metric }) {
  const dataKey = metric === 'ttk' ? 'avgTtk' : 'avgBtk';
  const yFormatter = metric === 'ttk' ? (v) => `${Math.round(v)}ms` : (v) => Number(v).toFixed(1);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={rows} margin={{ top: 16, right: 18, left: 8, bottom: 40 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis
          dataKey="weaponName"
          angle={-12}
          textAnchor="end"
          height={64}
          interval={0}
          tick={{ fontSize: 12 }}
        />
        <YAxis tickFormatter={yFormatter} />
        <Tooltip content={<ComparisonTooltip metric={metric} />} />
        <Bar dataKey={dataKey} radius={[8, 8, 0, 0]}>
          {rows.map((row, index) => (
            <Cell key={row.id} fill={BAR_COLORS[index % BAR_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function ComparisonLineChart({ rows, metric, applyVelocityEffect }) {
  const lineData = useMemo(() => {
    const byDistance = {};
    rows.forEach((row) => {
      (row.distanceSeries || []).forEach((point) => {
        if (!byDistance[point.distance]) byDistance[point.distance] = { distance: point.distance };
        byDistance[point.distance][row.id] = metric === 'ttk' ? point.avgTtk : point.avgBtk;
      });
    });

    return Object.values(byDistance).sort((a, b) => a.distance - b.distance);
  }, [rows, metric]);

  const readyRows = rows.filter((r) => Array.isArray(r.distanceSeries) && r.distanceSeries.length > 0);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={lineData} margin={{ top: 52, right: 18, left: 8, bottom: 22 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="distance" domain={[0, 100]} type="number" tickCount={11} />
        <YAxis
          tickFormatter={(v) => (metric === 'ttk' ? `${Math.round(v)}ms` : Number(v).toFixed(1))}
          domain={metric === 'ttk' ? ['dataMin - 60', 'dataMax + 60'] : ['dataMin - 1', 'dataMax + 1']}
        />
        <Tooltip formatter={(value) => (metric === 'ttk' ? `${Math.round(value)} ms` : Number(value).toFixed(2))} labelFormatter={(label) => `距离 ${label}m`} />
        <Legend verticalAlign="top" align="center" height={36} />
        {readyRows.map((row, index) => (
          <Line
            key={row.id}
            type={applyVelocityEffect ? 'linear' : 'stepAfter'}
            dataKey={row.id}
            name={`${row.weaponName} (${row.ammoName})`}
            stroke={BAR_COLORS[index % BAR_COLORS.length]}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

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
  showResult = true,
  disableDistance = false,
  showRemoveButton = true,
  headerActions = null,
}) {
  const [missingFields, setMissingFields] = useState({});

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

  useEffect(() => {
    setMissingFields((prev) => ({
      ...prev,
      selectedWeapon: prev.selectedWeapon ? !cfg.selectedWeapon : false,
      selectedAmmo: prev.selectedAmmo ? !cfg.selectedAmmo : false,
      selectedHelmet: prev.selectedHelmet ? !cfg.selectedHelmet : false,
      selectedArmor: prev.selectedArmor ? !cfg.selectedArmor : false,
    }));
  }, [cfg.selectedWeapon, cfg.selectedAmmo, cfg.selectedHelmet, cfg.selectedArmor]);

  const validateRequired = () => {
    const nextMissing = {
      selectedWeapon: !cfg.selectedWeapon,
      selectedAmmo: !cfg.selectedAmmo,
      selectedHelmet: !cfg.selectedHelmet,
      selectedArmor: !cfg.selectedArmor,
    };
    setMissingFields(nextMissing);
    return !Object.values(nextMissing).some(Boolean);
  };

  const handleRun = () => {
    if (!validateRequired()) return;
    setMissingFields({});
    onRun();
  };

  return (
    <section className="ttk-card">
      <div className="ttk-card-header">
        <h3>{cfg.selectedWeapon?.name || cfg.name}</h3>
        <div className="modal-head-actions">
          {showRemoveButton && <button type="button" className="ttk-btn danger" onClick={onRemove}>移除</button>}
          {headerActions}
        </div>
      </div>

      <div className="ttk-grid selector-grid">
        <div className="field-card grouped-card">
          <div className="sub-grid one-col">
            <div className={`option-slot ${missingFields.selectedWeapon ? 'missing' : ''}`}>
              <WeaponSelector
                selectedWeapon={cfg.selectedWeapon}
                onSelect={(weapon) => onChange({ selectedWeapon: weapon, selectedMods: [] })}
              />
            </div>
            <div className={`option-slot ${missingFields.selectedAmmo ? 'missing' : ''}`}>
              <AmmoSelector
                options={availableAmmos}
                selectedAmmo={cfg.selectedAmmo}
                onSelect={(ammo) => onChange({ selectedAmmo: ammo })}
                placeholder="选择弹药"
                emptyOptionsMessage="请先选择武器"
              />
            </div>
          </div>
        </div>

        <div className="field-card grouped-card">
          <div className="sub-grid two-col">
            <div className="selector-col">
              <div className={`option-slot ${missingFields.selectedHelmet ? 'missing' : ''}`}>
                <HelmetSelector
                  options={helmets}
                  selectedHelmet={cfg.selectedHelmet}
                  onSelect={(helmet) => onChange({ selectedHelmet: helmet, helmetDurability: helmet.durability })}
                />
              </div>
              <div className={`option-slot ${missingFields.selectedArmor ? 'missing' : ''}`}>
                <ArmorSelector
                  options={armors}
                  selectedArmor={cfg.selectedArmor}
                  onSelect={(armor) => onChange({ selectedArmor: armor, armorDurability: armor.durability })}
                />
              </div>
            </div>
            <div className="durability-col">
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
          </div>
        </div>
      </div>

      <div className="ttk-grid sliders">
        <UniversalSlider
          label="距离(米)"
          values={Array.from({ length: 301 }, (_, i) => i)}
          value={cfg.distance}
          onChange={(distance) => onChange({ distance })}
          isDisabled={disableDistance}
        />
        <UniversalSlider
          label="初始血量"
          values={Array.from({ length: 100 }, (_, i) => i + 1)}
          value={Math.min(cfg.initialHp, 100)}
          onChange={(initialHp) => onChange({ initialHp: Math.min(initialHp, 100) })}
        />
      </div>

      {disableDistance && (
        <div className="distance-locked-tip">当前为折线图模式，距离按枪械分段射程点自动计算</div>
      )}

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

      <div className="probabilities-wrap">
        <div className="probabilities-title">部位概率分布</div>
        <div className="probabilities">
          {PROBABILITY_FIELDS.map((field) => (
            <label key={field.key} className="prob-item" htmlFor={`${cfg.id}-${field.key}`}>
              <span className="prob-label-row">{field.label}</span>
              <input
                id={`${cfg.id}-${field.key}`}
                type="number"
                min={0}
                step={0.01}
                value={getDisplayProbability(cfg.hitProbabilities, field.sites).toFixed(4)}
                onChange={(e) => onChange({
                  hitProbabilities: setGroupedProbability(cfg.hitProbabilities, field.sites, e.target.value),
                })}
              />
            </label>
          ))}
        </div>
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
        <button type="button" className="ttk-btn primary" onClick={handleRun} disabled={cfg.running}>
          {cfg.running ? `计算中 ${Math.round(cfg.progress * 100)}%` : '开始模拟'}
        </button>
      </div>

      {showResult && cfg.result && (
        <div className="ttk-result">
          <div className="summary">
            <div>平均BTK: {cfg.result.avgBtk.toFixed(2)}</div>
            <div>平均TTK: {Math.round(cfg.result.avgTtk)} ms</div>
            <div>样本数: {cfg.result.trialCount}</div>
            <div>理论射速: {Math.round(cfg.result.fireRate || 0)} RPM</div>
          </div>
          <div className="chart-toggle">
            <button
              type="button"
              className={`ttk-btn ${cfg.chartMode === 'ttk' ? 'primary' : ''}`}
              onClick={() => onChange({ chartMode: 'ttk' })}
            >
              TTK 分布
            </button>
            <button
              type="button"
              className={`ttk-btn ${cfg.chartMode === 'btk' ? 'primary' : ''}`}
              onClick={() => onChange({ chartMode: 'btk' })}
            >
              BTK 分布
            </button>
          </div>

          <div className="chart-grid">
            {cfg.chartMode === 'ttk' ? (
              <div className="chart-box">
                <h4>TTK 概率分布</h4>
                <TtkDistributionChart ttkData={cfg.result.ttkDistribution} />
              </div>
            ) : (
              <div className="chart-box">
                <h4>BTK 概率分布</h4>
                <BtkDistributionChart btkData={cfg.result.btkDistributionJson} />
              </div>
            )}
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

  const [lastDistance, setLastDistance] = useState(10);
  const [configs, setConfigs] = useState([]);
  const [selectedConfigId, setSelectedConfigId] = useState(null);
  const [editingConfigId, setEditingConfigId] = useState(null);
  const [compareMetric, setCompareMetric] = useState('ttk');
  const [compareChartType, setCompareChartType] = useState('line');
  const [applyVelocityEffect, setApplyVelocityEffect] = useState(false);
  const [applyTriggerDelay, setApplyTriggerDelay] = useState(false);
  const workerRef = useRef(null);
  const requestSeedRef = useRef(0);

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

  useEffect(() => () => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
  }, []);

  const addConfig = () => {
    const nextId = (configs.length ? Math.max(...configs.map((c) => c.id)) : 0) + 1;
    setConfigs((prev) => [...prev, createConfig(nextId, lastDistance)]);
    setSelectedConfigId(nextId);
    setEditingConfigId(nextId);
  };

  const updateConfig = (id, patch) => {
    setConfigs((prev) => prev.map((cfg) => (cfg.id === id ? { ...cfg, ...patch } : cfg)));
  };

  const handleConfigChange = (id, patch) => {
    if (Object.prototype.hasOwnProperty.call(patch, 'distance')) {
      setLastDistance(Number(patch.distance) || 0);
    }
    updateConfig(id, patch);
  };

  const removeConfig = (id) => {
    setConfigs((prev) => {
      const next = prev.filter((cfg) => cfg.id !== id);
      if (selectedConfigId === id) {
        setSelectedConfigId(next.length > 0 ? next[0].id : null);
      }
      if (editingConfigId === id) {
        setEditingConfigId(null);
      }
      return next;
    });
  };

  const runMonteCarloWithWorker = (cfgId, payload) => new Promise((resolve, reject) => {
    try {
      if (!workerRef.current) {
        workerRef.current = new Worker(new URL('../workers/ttkMonteCarloWorker.js', import.meta.url));
      }

      const requestId = `${Date.now()}-${requestSeedRef.current++}`;
      const worker = workerRef.current;

      const onMessage = (event) => {
        const msg = event.data || {};
        if (msg.requestId !== requestId) return;

        if (msg.type === 'progress') {
          updateConfig(cfgId, { progress: msg.progress });
          return;
        }

        if (msg.type === 'done') {
          worker.removeEventListener('message', onMessage);
          worker.removeEventListener('error', onError);
          resolve(msg.result);
        }
      };

      const onError = (err) => {
        worker.removeEventListener('message', onMessage);
        worker.removeEventListener('error', onError);
        reject(err);
      };

      worker.addEventListener('message', onMessage);
      worker.addEventListener('error', onError);
      worker.postMessage({ requestId, payload });
    } catch (error) {
      reject(error);
    }
  });

  const runDistanceSweep = async (cfg, configuredWeapon) => {
    updateConfig(cfg.id, { lineRunning: true, lineProgress: 0 });
    const distanceSeries = [];
    const distances = getSegmentDistances(configuredWeapon, 100);

    for (let i = 0; i < distances.length; i += 1) {
      const distance = distances[i];
      const res = await runMonteCarlo({
        configuredWeapon,
        ammo: cfg.selectedAmmo,
        helmet: cfg.selectedHelmet,
        armor: cfg.selectedArmor,
        helmetDurability: cfg.helmetDurability,
        armorDurability: cfg.armorDurability,
        distance,
        initialHp: Math.min(cfg.initialHp, 100),
        hitProbabilities: cfg.hitProbabilities,
        trials: cfg.trialCount,
        chunkSize: 2000,
      });

      distanceSeries.push({
        distance,
        avgTtk: res.avgTtk,
        avgBtk: res.avgBtk,
      });

      updateConfig(cfg.id, { lineProgress: (i + 1) / distances.length });
    }

    return distanceSeries;
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

    updateConfig(cfg.id, { running: true, progress: 0, result: null, lineRunning: false, lineProgress: 0 });

    const payload = {
      configuredWeapon,
      ammo: cfg.selectedAmmo,
      helmet: cfg.selectedHelmet,
      armor: cfg.selectedArmor,
      helmetDurability: cfg.helmetDurability,
      armorDurability: cfg.armorDurability,
      distance: cfg.distance,
      initialHp: Math.min(cfg.initialHp, 100),
      hitProbabilities: cfg.hitProbabilities,
      trials: cfg.trialCount,
      chunkSize: 2000,
    };

    let result;
    try {
      result = await runMonteCarloWithWorker(cfg.id, payload);
    } catch (error) {
      result = await runMonteCarlo({
        ...payload,
        onProgress: (progress) => updateConfig(cfg.id, { progress }),
      });
    }

    const distanceSeries = await runDistanceSweep(cfg, configuredWeapon);

    updateConfig(cfg.id, {
      running: false,
      progress: 1,
      lineRunning: false,
      lineProgress: 1,
      result: {
        ...result,
        fireRate: configuredWeapon.fireRate,
        distanceSeries,
      },
    });
  };

  const comparisonRows = useMemo(() => {
    return configs
      .filter((cfg) => cfg.result)
      .map((cfg) => {
        const configuredWeapon = buildConfiguredWeapon({
          selectedWeapon: cfg.selectedWeapon,
          selectedModIds: cfg.selectedMods,
          modifications,
          weapons,
        });

        const adjustedAvgTtk = applyTtkEffects({
          baseTtk: cfg.result.avgTtk,
          distance: cfg.distance,
          configuredWeapon,
          applyVelocityEffect,
          applyTriggerDelay,
        });

        const denseBaseSeries = expandSegmentSeriesToDense(cfg.result.distanceSeries || [], 100);
        const adjustedSeries = denseBaseSeries.map((p) => ({
          ...p,
          avgTtk: applyTtkEffects({
            baseTtk: p.avgTtk,
            distance: p.distance,
            configuredWeapon,
            applyVelocityEffect,
            applyTriggerDelay,
          }),
        }));

        return {
          id: cfg.id,
          name: cfg.name,
          weaponName: cfg.selectedWeapon?.name || '-',
          ammoName: cfg.selectedAmmo?.name || '-',
          avgBtk: cfg.result.avgBtk,
          avgTtk: adjustedAvgTtk,
          trialCount: cfg.result.trialCount,
          distanceSeries: adjustedSeries,
        };
      })
      .sort((a, b) => a.avgTtk - b.avgTtk)
      .map((row, index) => ({ ...row, rank: index + 1 }));
  }, [configs, applyVelocityEffect, applyTriggerDelay, modifications, weapons]);

  const selectedConfig = configs.find((cfg) => cfg.id === selectedConfigId) || configs[0] || null;
  const editingConfig = configs.find((cfg) => cfg.id === editingConfigId) || null;

  return (
    <div className="ttk-page">
      <div className="ttk-main">
        <aside className="ttk-left-panel">
          <section className="ttk-compare">
            <div className="ttk-left-head">
              <h3>方案列表</h3>
              <button type="button" className="ttk-btn primary" onClick={addConfig}>添加配置</button>
            </div>

            <div className="config-list">
              {configs.map((cfg, idx) => (
                <button
                  key={cfg.id}
                  type="button"
                  className={`config-item ${selectedConfig?.id === cfg.id ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedConfigId(cfg.id);
                    setEditingConfigId(cfg.id);
                  }}
                >
                  <div className="config-item-top">
                    <span className="config-badge">#{idx + 1}</span>
                    <div className="config-item-title">{cfg.selectedWeapon?.name || cfg.name}</div>
                  </div>
                  <div className="config-item-meta">{cfg.selectedAmmo?.name || '未选弹药'}</div>
                  <div className="config-item-stats">
                    <span>EBTK {cfg.result ? cfg.result.avgBtk.toFixed(2) : '--'}</span>
                    <span>ETTK {cfg.result ? `${Math.round(cfg.result.avgTtk)}ms` : '--'}</span>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="ttk-compare options-panel">
            <div className="options-row">
              <div className="option-group">
                <div className="chart-toggle left-options">
                  <button type="button" className={`ttk-btn ${compareMetric === 'ttk' ? 'primary' : ''}`} onClick={() => setCompareMetric('ttk')}>TTK</button>
                  <button type="button" className={`ttk-btn ${compareMetric === 'btk' ? 'primary' : ''}`} onClick={() => setCompareMetric('btk')}>BTK</button>
                </div>
              </div>
              <div className="option-group">
                <div className="chart-toggle left-options">
                  <button type="button" className={`ttk-btn ${compareChartType === 'bar' ? 'primary' : ''}`} onClick={() => setCompareChartType('bar')}>柱状图</button>
                  <button type="button" className={`ttk-btn ${compareChartType === 'line' ? 'primary' : ''}`} onClick={() => setCompareChartType('line')}>折线图</button>
                </div>
              </div>
            </div>
            <div className="effect-options-row">
              <label className="effect-toggle">
                <input type="checkbox" checked={applyTriggerDelay} onChange={(e) => setApplyTriggerDelay(e.target.checked)} />
                启用扳机延迟
              </label>
              <label className="effect-toggle">
                <input type="checkbox" checked={applyVelocityEffect} onChange={(e) => setApplyVelocityEffect(e.target.checked)} />
                启用枪口初速
              </label>
            </div>
          </section>

        </aside>

        <section className="ttk-right-chart">
          <div className="ttk-compare chart-fill-wrap">
            {comparisonRows.length === 0 ? (
              <div className="compare-empty-plain">请先运行至少一个方案，再查看对比图</div>
            ) : (
              <div className="chart-canvas">
                {compareChartType === 'bar' ? (
                  <ComparisonBarChart rows={comparisonRows} metric={compareMetric} />
                ) : (
                  <ComparisonLineChart rows={comparisonRows} metric={compareMetric} applyVelocityEffect={applyVelocityEffect} />
                )}
              </div>
            )}

            {compareChartType === 'line' && configs.some((cfg) => cfg.lineRunning) && (
              <div className="line-calc-status">
                正在按枪械分段射程点计算：
                {configs
                  .filter((cfg) => cfg.lineRunning)
                  .map((cfg) => `${cfg.name} ${Math.round((cfg.lineProgress || 0) * 100)}%`)
                  .join(' / ')}
              </div>
            )}
          </div>
        </section>
      </div>

      {editingConfig && (
        <div className="ttk-modal-overlay" onClick={() => setEditingConfigId(null)}>
          <div className="ttk-modal-content" onClick={(e) => e.stopPropagation()}>
            <GunConfigCard
              cfg={editingConfig}
              weapons={weapons}
              ammos={ammos}
              helmets={helmets}
              armors={armors}
              modifications={modifications}
              onChange={(patch) => handleConfigChange(editingConfig.id, patch)}
              onRun={() => {
                setEditingConfigId(null);
                runConfig(editingConfig);
              }}
              onRemove={() => {
                setEditingConfigId(null);
                removeConfig(editingConfig.id);
              }}
              showResult={false}
              disableDistance={compareChartType === 'line'}
              showRemoveButton
              headerActions={<button type="button" className="ttk-btn" onClick={() => setEditingConfigId(null)}>关闭</button>}
            />
          </div>
        </div>
      )}
    </div>
  );
}
