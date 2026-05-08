import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { WeaponSelector } from '../../components/simulator/Selectors';
import { UniversalSlider } from '../../components/public/UniversalSlider';
import { useGameData } from '../../hooks/useGameData';
import {
  BATTLEFIELD_DEFAULT_HIT_PROBABILITIES,
  buildBattlefieldConfiguredWeapon,
  getBattlefieldApplicableMods,
  getBattlefieldSegmentDistances,
  isBattlefieldVariantWeapon,
  runBattlefieldMonteCarlo,
} from '../../utils/battlefieldUtils';
import {
  buildModsById,
  computeUnlockedSlots,
  inferBaseUnlockedSlots,
  isModSelectable,
  mergeUnlockedSlots,
  toggleModSelection,
} from '../../utils/modSelectionUtils';
import {
  TTK_CONFIG_COLORS,
  cloneConfigResult,
  getAvailableConfigColor,
  getConfigColor,
  getModNames,
  getNextConfigId,
  loadTtkCache,
  resolveCachedItem,
  resolveCachedModIds,
  saveTtkCache,
  withConfigColor,
} from '../../utils/ttkConfigState';
import '../firefight/TTKSimulator.css';
import './BattlefieldPages.css';

const EMPTY_ARRAY = [];
const DEFAULT_WEAPON_NAMES = ['腾龙', 'M7'];

const createConfig = (id) => ({
  id,
  name: `方案 ${id}`,
  color: null,
  selectedWeapon: null,
  selectedMods: [],
  distance: 10,
  initialHp: 100,
  trialCount: 5000,
  hitProbabilities: { ...BATTLEFIELD_DEFAULT_HIT_PROBABILITIES },
  running: false,
  progress: 0,
  lineRunning: false,
  lineProgress: 0,
  result: null,
});

function getDefaultWeapon(weapons) {
  return DEFAULT_WEAPON_NAMES
    .map((name) => weapons.find((weapon) => weapon?.name === name || weapon?.sourceName === name))
    .find(Boolean) || weapons[0] || null;
}

const PROBABILITY_FIELDS = [
  { key: 'head', label: '头部', sites: ['head'] },
  { key: 'chest', label: '胸部', sites: ['chest'] },
  { key: 'abdomen', label: '腹部', sites: ['abdomen'] },
  { key: 'limbs', label: '四肢', sites: ['upperArm', 'lowerArm', 'thigh', 'calf'] },
];
const PROBABILITY_SUM_WARN_EPSILON = 0.0005;
const TRIAL_PRESETS = [1000, 5000, 10000];
const PROBABILITY_PRESETS = [
  {
    key: 'default',
    label: '默认记录',
    values: { head: 0.1724, chest: 0.3046, abdomen: 0.1897, limbs: 0.3333 },
  },
  {
    key: 'even',
    label: '均匀命中',
    values: { head: 0.25, chest: 0.25, abdomen: 0.25, limbs: 0.25 },
  },
  {
    key: 'center',
    label: '偏躯干',
    values: { head: 0.08, chest: 0.44, abdomen: 0.28, limbs: 0.2 },
  },
  {
    key: 'head-only',
    label: '仅头部',
    values: { head: 1, chest: 0, abdomen: 0, limbs: 0 },
  },
  {
    key: 'chest-only',
    label: '仅胸部',
    values: { head: 0, chest: 1, abdomen: 0, limbs: 0 },
  },
  {
    key: 'abdomen-only',
    label: '仅腹部',
    values: { head: 0, chest: 0, abdomen: 1, limbs: 0 },
  },
];

const BAR_COLORS = TTK_CONFIG_COLORS;
const BATTLEFIELD_TTK_CACHE_KEY = 'dfttk.battlefield.ttk.v2';
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

const getProbabilityDrafts = (hitProbabilities) => {
  const drafts = {};
  PROBABILITY_FIELDS.forEach((field) => {
    drafts[field.key] = getDisplayProbability(hitProbabilities, field.sites).toFixed(4);
  });
  return drafts;
};

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

  for (let distance = 0; distance <= maxDistance; distance += 1) {
    while (idx + 1 < sorted.length && distance >= sorted[idx + 1].distance) {
      idx += 1;
    }
    dense.push({
      distance,
      avgTtk: sorted[idx].avgTtk,
      avgBtk: sorted[idx].avgBtk,
      btkDistribution: sorted[idx].btkDistribution,
      ttkDistribution: sorted[idx].ttkDistribution,
    });
  }

  return dense;
};

function ChartTooltip({ active, label, payload, rows, metric }) {
  if (!active || !payload?.length) return null;

  const entries = payload
    .map((entry) => {
      const row = rows.find((item) => String(item.id) === String(entry.dataKey));
      return row ? { entry, row } : null;
    })
    .filter(Boolean);

  if (!entries.length) return null;

  return (
    <div className="compare-tooltip chart-detail-tooltip battlefield-chart-tooltip">
      <div className="compare-tooltip-title">距离 {label}m</div>
      <div className="chart-tooltip-table">
        {entries.map(({ entry, row }) => (
          <div key={row.id} className="chart-tooltip-row battlefield-tooltip-row">
            <span className="chart-tooltip-dot" style={{ backgroundColor: entry.color || row.color }} />
            <strong title={row.weaponName}>{row.weaponName}</strong>
            <span className="chart-tooltip-mods" title={row.modSummary || '无配件'}>
              {row.modSummary || '无配件'}
            </span>
            <span className="chart-tooltip-value">
              {metric === 'ttk' ? `${Math.round(entry.value)}ms` : Number(entry.value).toFixed(2)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ComparisonLineChart({ rows, metric, applyVelocityEffect, isMobile }) {
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

  const readyRows = rows.filter((row) => Array.isArray(row.distanceSeries) && row.distanceSeries.length > 0);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={lineData} margin={isMobile ? { top: 24, right: 8, left: 0, bottom: 8 } : { top: 52, right: 18, left: 8, bottom: 22 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#d8e2df" />
        <XAxis
          dataKey="distance"
          domain={[0, 100]}
          type="number"
          tickCount={isMobile ? 6 : 11}
          tick={{ fontSize: isMobile ? 11 : 12 }}
          interval="preserveStartEnd"
        />
        <YAxis
          tickFormatter={(value) => (metric === 'ttk' ? `${Math.round(value)}ms` : Number(value).toFixed(1))}
          domain={metric === 'ttk' ? ['dataMin - 60', 'dataMax + 60'] : ['dataMin - 1', 'dataMax + 1']}
          tick={{ fontSize: isMobile ? 11 : 12 }}
          width={isMobile ? 40 : 56}
        />
        <Tooltip content={<ChartTooltip rows={readyRows} metric={metric} />} />
        <Legend verticalAlign={isMobile ? 'bottom' : 'top'} align="center" height={isMobile ? 26 : 36} wrapperStyle={{ fontSize: isMobile ? 11 : 12 }} />
        {readyRows.map((row, index) => (
          <Line
            key={row.id}
            type={applyVelocityEffect ? 'linear' : 'stepAfter'}
            dataKey={row.id}
            name={row.weaponName}
            stroke={row.color || BAR_COLORS[index % BAR_COLORS.length]}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

function PreviewSegmentPicker({ id, value, options, open, onToggle, onClose, onChange }) {
  const selected = options?.[value] || options?.[0];

  return (
    <div
      className={`preview-segment-picker ${open ? 'open' : ''}`}
      onClick={(event) => event.stopPropagation()}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          onClose();
        }
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          onClose();
        }
      }}
    >
      <button
        type="button"
        className="preview-segment-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-menu`}
        onClick={onToggle}
      >
        <span>{selected?.label || '选择距离段'}</span>
        <span className="preview-segment-arrow" aria-hidden="true">v</span>
      </button>
      {open && (
        <ul id={`${id}-menu`} className="preview-segment-menu" role="listbox">
          {(options || []).map((option, index) => (
            <li key={`${option.label}-${index}`}>
              <button
                type="button"
                className={`preview-segment-option ${index === value ? 'selected' : ''}`}
                role="option"
                aria-selected={index === value}
                onClick={() => {
                  onChange(index);
                  onClose();
                }}
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ModTooltip({ mod, position }) {
  if (!mod) return null;

  const rangeModifier = Number(mod?.effects?.rangeModifier) || 0;
  const fireRateModifier = Number(mod?.effects?.fireRateModifier) || 0;
  const muzzleVelocityModifier = Number(mod?.effects?.muzzleVelocityModifier) || 0;
  const hasAnyEffect = rangeModifier !== 0
    || fireRateModifier !== 0
    || muzzleVelocityModifier !== 0
    || mod?.effects?.damageChange === true
    || mod?.effects?.specialRange === true;

  return (
    <div className="mod-tooltip mod-tooltip-ttk" style={{ left: `${position.x}px`, top: `${position.y}px` }}>
      <h4>{mod.name}</h4>
      <div className="mod-effects">
        {rangeModifier !== 0 && (
          <div className="effect-item">
            <span className="effect-label">射程:</span>
            <span className={`effect-value ${rangeModifier > 0 ? 'positive' : 'negative'}`}>
              {rangeModifier > 0 ? '+' : ''}{Math.round(rangeModifier * 100)}%
            </span>
          </div>
        )}
        {fireRateModifier !== 0 && (
          <div className="effect-item">
            <span className="effect-label">射速:</span>
            <span className={`effect-value ${fireRateModifier > 0 ? 'positive' : 'negative'}`}>
              {fireRateModifier > 0 ? '+' : ''}{Math.round(fireRateModifier * 100)}%
            </span>
          </div>
        )}
        {muzzleVelocityModifier !== 0 && (
          <div className="effect-item">
            <span className="effect-label">初速:</span>
            <span className={`effect-value ${muzzleVelocityModifier > 0 ? 'positive' : 'negative'}`}>
              {muzzleVelocityModifier > 0 ? '+' : ''}{Math.round(muzzleVelocityModifier * 100)}%
            </span>
          </div>
        )}
        {mod?.effects?.damageChange === true && (
          <div className="effect-item">
            <span className="effect-label">伤害:</span>
            <span className="effect-value special">改变伤害曲线</span>
          </div>
        )}
        {mod?.effects?.specialRange === true && (
          <div className="effect-item">
            <span className="effect-label">射程:</span>
            <span className="effect-value special">使用特殊射程</span>
          </div>
        )}
        {!hasAnyEffect && <div className="effect-item muted">无 TTK 相关效果</div>}
      </div>
    </div>
  );
}

function BattlefieldGunConfigCard({
  cfg,
  weapons,
  modifications,
  allWeapons,
  onChange,
  onRun,
  onRemove,
  showRemoveButton = true,
  headerActions = null,
}) {
  const [missingFields, setMissingFields] = useState({});
  const [probDrafts, setProbDrafts] = useState(getProbabilityDrafts(cfg.hitProbabilities));
  const [hoveredMod, setHoveredMod] = useState(null);
  const [modTooltipPos, setModTooltipPos] = useState({ x: 0, y: 0 });

  const configuredWeapon = useMemo(() => buildBattlefieldConfiguredWeapon({
    selectedWeapon: cfg.selectedWeapon,
    selectedModIds: cfg.selectedMods,
    modifications,
    weapons: allWeapons,
  }), [cfg.selectedWeapon, cfg.selectedMods, modifications, allWeapons]);

  const availableMods = useMemo(() => getBattlefieldApplicableMods(cfg.selectedWeapon, modifications), [cfg.selectedWeapon, modifications]);
  const modsById = useMemo(() => buildModsById(availableMods || []), [availableMods]);
  const baseUnlockedSlots = useMemo(() => inferBaseUnlockedSlots(availableMods || []), [availableMods]);
  const unlockedSlots = useMemo(
    () => computeUnlockedSlots(cfg.selectedMods, modsById),
    [cfg.selectedMods, modsById]
  );
  const effectiveUnlockedSlots = useMemo(
    () => mergeUnlockedSlots(baseUnlockedSlots, unlockedSlots),
    [baseUnlockedSlots, unlockedSlots]
  );

  const groupedMods = useMemo(() => {
    return availableMods
      .filter((mod) => cfg.selectedMods.includes(mod.id) || isModSelectable(mod, effectiveUnlockedSlots))
      .reduce((groups, mod) => {
        const type = mod.type?.[0] || '未分类';
        if (!groups[type]) groups[type] = [];
        groups[type].push(mod);
        return groups;
      }, {});
  }, [availableMods, cfg.selectedMods, effectiveUnlockedSlots]);

  useEffect(() => {
    setMissingFields((prev) => ({
      ...prev,
      selectedWeapon: prev.selectedWeapon ? !cfg.selectedWeapon : false,
    }));
  }, [cfg.selectedWeapon]);

  useEffect(() => {
    setProbDrafts(getProbabilityDrafts(cfg.hitProbabilities));
  }, [cfg.hitProbabilities]);

  const validateRequired = () => {
    const nextMissing = {
      selectedWeapon: !cfg.selectedWeapon,
    };
    setMissingFields(nextMissing);
    return !Object.values(nextMissing).some(Boolean);
  };

  const buildNormalizedHitProbabilities = () => {
    const values = PROBABILITY_FIELDS.map((field) => Math.max(0, Number(probDrafts[field.key]) || 0));
    const sum = values.reduce((a, b) => a + b, 0);
    if (sum <= 0) return null;

    const normalized = values.map((value) => value / sum);
    let nextHit = { ...cfg.hitProbabilities };
    PROBABILITY_FIELDS.forEach((field, index) => {
      nextHit = setGroupedProbability(nextHit, field.sites, normalized[index]);
    });
    return nextHit;
  };

  const handleRun = () => {
    if (!validateRequired()) return;
    setMissingFields({});
    const normalizedHitProbabilities = buildNormalizedHitProbabilities();
    if (normalizedHitProbabilities) {
      onChange({ hitProbabilities: normalizedHitProbabilities });
    }
    onRun(normalizedHitProbabilities || cfg.hitProbabilities);
  };

  const commitProbability = (fieldKey, rawValue) => {
    const field = PROBABILITY_FIELDS.find((item) => item.key === fieldKey);
    if (!field) return;
    const numeric = Math.max(0, Number(rawValue) || 0);
    onChange({
      hitProbabilities: setGroupedProbability(cfg.hitProbabilities, field.sites, numeric),
    });
  };

  const handleProbabilityKeyDown = (event, fieldKey, index) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      const inputs = Array.from(document.querySelectorAll('.prob-item input'));
      const next = inputs[index + 1];
      if (next) next.focus();
      return;
    }

    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      const step = event.shiftKey ? 0.001 : 0.01;
      const current = Number(probDrafts[fieldKey]) || 0;
      const nextValue = event.key === 'ArrowUp' ? current + step : Math.max(0, current - step);
      const text = nextValue.toFixed(4);
      setProbDrafts((prev) => ({ ...prev, [fieldKey]: text }));
      commitProbability(fieldKey, text);
    }
  };

  const normalizeProbabilities = () => {
    const nextHit = buildNormalizedHitProbabilities();
    if (!nextHit) return;
    onChange({ hitProbabilities: nextHit });
  };

  const applyProbabilityPreset = (preset) => {
    let nextHit = { ...cfg.hitProbabilities };
    PROBABILITY_FIELDS.forEach((field) => {
      nextHit = setGroupedProbability(nextHit, field.sites, preset.values[field.key]);
    });
    onChange({ hitProbabilities: nextHit });
  };

  const probabilitySum = PROBABILITY_FIELDS.reduce((sum, field) => (
    sum + (Math.max(0, Number(probDrafts[field.key]) || 0))
  ), 0);

  return (
    <section className="ttk-card ttk-card-flat">
      <div className="ttk-card-header">
        <h3>{configuredWeapon?.name || cfg.selectedWeapon?.name || cfg.name}</h3>
        <div className="modal-head-actions">
          {showRemoveButton && <button type="button" className="ttk-btn danger" onClick={onRemove}>移除</button>}
          {headerActions}
        </div>
      </div>

      <div className="ttk-grid selector-grid battlefield-config-top-grid">
        <div className="field-card grouped-card">
          <div className="field-section-label">武器</div>
          <div className="sub-grid one-col">
            <div className={`option-slot ${missingFields.selectedWeapon ? 'missing' : ''}`}>
              <WeaponSelector
                options={weapons}
                selectedWeapon={cfg.selectedWeapon}
                onSelect={(weapon) => onChange({ selectedWeapon: weapon, selectedMods: [], result: null })}
              />
            </div>
          </div>
        </div>

        <div className="run-config-wrap battlefield-run-inline">
          <div className="field-section-label">模拟参数</div>
          <div className="run-row-73">
            <div className="run-left">
              <div className="ttk-line">
                <div className="trial-input-wrap">
                  <label htmlFor={`trial-${cfg.id}`}>模拟次数 N</label>
                  <input
                    id={`trial-${cfg.id}`}
                    type="number"
                    min={100}
                    max={100000}
                    step={100}
                    value={cfg.trialCount}
                    onChange={(event) => onChange({ trialCount: Math.max(100, Math.min(100000, Number(event.target.value) || 100)) })}
                  />
                </div>
                <div className="trial-presets" aria-label="模拟次数预设">
                  {TRIAL_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      className={`tiny-btn ${cfg.trialCount === preset ? 'active' : ''}`}
                      onClick={() => onChange({ trialCount: preset })}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
                <div className={`trial-tip ${cfg.trialCount > 10000 ? 'warn' : ''}`}>模拟次数过高可能导致卡顿，建议保持在10000以下</div>
              </div>
            </div>
            <div className="run-right">
              <UniversalSlider
                label="初始血量"
                values={Array.from({ length: 100 }, (_, index) => index + 1)}
                value={Math.min(cfg.initialHp, 100)}
                onChange={(initialHp) => onChange({ initialHp: Math.min(initialHp, 100) })}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="probabilities-wrap">
        <div className="prob-head-row">
          <div className="probabilities-title">部位概率分布</div>
          <div className="prob-footer">
            <div className="prob-preset-group" aria-label="部位概率预设">
              {PROBABILITY_PRESETS.map((preset) => (
                <button
                  key={preset.key}
                  type="button"
                  className="tiny-btn"
                  onClick={() => applyProbabilityPreset(preset)}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <span className={`prob-sum ${Math.abs(probabilitySum - 1) > PROBABILITY_SUM_WARN_EPSILON ? 'warn' : ''}`}>总和：{probabilitySum.toFixed(4)}</span>
            <button type="button" className="ttk-btn" onClick={normalizeProbabilities}>归一化到 1.0000</button>
          </div>
        </div>
        <div className="probabilities battlefield-probabilities">
          {PROBABILITY_FIELDS.map((field, index) => (
            <label key={field.key} className={`prob-item prob-${field.key}`} htmlFor={`${cfg.id}-${field.key}`}>
              <span className="prob-label-row">{field.label}</span>
              <input
                id={`${cfg.id}-${field.key}`}
                type="number"
                min={0}
                step={0.01}
                value={probDrafts[field.key] ?? ''}
                onChange={(event) => setProbDrafts((prev) => ({ ...prev, [field.key]: event.target.value }))}
                onBlur={(event) => {
                  const fixed = (Math.max(0, Number(event.target.value) || 0)).toFixed(4);
                  setProbDrafts((prev) => ({ ...prev, [field.key]: fixed }));
                  commitProbability(field.key, fixed);
                }}
                onKeyDown={(event) => handleProbabilityKeyDown(event, field.key, index)}
              />
            </label>
          ))}
        </div>
      </div>

      {cfg.selectedWeapon && Object.keys(groupedMods).length > 0 && (
        <div className="mods">
          {Object.entries(groupedMods).map(([group, mods]) => (
            <div key={group} className="mod-group">
              <h4>{group}</h4>
              <div className="mod-chips">
                {mods.map((mod) => {
                  const selected = cfg.selectedMods.includes(mod.id);
                  const disabled = !selected && !isModSelectable(mod, effectiveUnlockedSlots);
                  return (
                    <button
                      key={mod.id}
                      type="button"
                      disabled={disabled}
                      className={`mod-chip ${selected ? 'selected' : ''}`}
                      onMouseEnter={(event) => {
                        const rect = event.currentTarget.getBoundingClientRect();
                        setModTooltipPos({
                          x: Math.min(rect.right + 10, window.innerWidth - 280),
                          y: Math.max(10, rect.top),
                        });
                        setHoveredMod(mod);
                      }}
                      onMouseLeave={() => setHoveredMod(null)}
                      onClick={() => {
                        const next = toggleModSelection({
                          modId: mod.id,
                          isSelected: !selected,
                          selectedModIds: cfg.selectedMods,
                          availableMods,
                          baseUnlockedSlots,
                        });
                        onChange({ selectedMods: next, result: null });
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
      )}

      <div className="ttk-actions">
        <button type="button" className="ttk-btn primary run-btn" onClick={handleRun} disabled={cfg.running}>
          {cfg.running ? `计算中 ${Math.round((cfg.progress || 0) * 100)}%` : '运行方案'}
        </button>
      </div>

      <ModTooltip mod={hoveredMod} position={modTooltipPos} />
    </section>
  );
}

export function BattlefieldTTK() {
  const { data } = useGameData('battlefield');
  const weapons = data?.weapons || EMPTY_ARRAY;
  const modifications = data?.modifications || EMPTY_ARRAY;

  const [configs, setConfigs] = useState([]);
  const [selectedConfigId, setSelectedConfigId] = useState(null);
  const [editingConfigId, setEditingConfigId] = useState(null);
  const [compareMetric, setCompareMetric] = useState('ttk');
  const [applyVelocityEffect, setApplyVelocityEffect] = useState(false);
  const [applyTriggerDelay, setApplyTriggerDelay] = useState(false);
  const [hoveredConfigId, setHoveredConfigId] = useState(null);
  const [hoverPreviewPos, setHoverPreviewPos] = useState(null);
  const [previewMetric, setPreviewMetric] = useState('ttk');
  const [previewSegmentByConfig, setPreviewSegmentByConfig] = useState({});
  const [openPreviewSelectId, setOpenPreviewSelectId] = useState(null);
  const [isMobileViewport, setIsMobileViewport] = useState(
    () => (typeof window !== 'undefined' ? window.innerWidth <= 768 : false)
  );
  const previewCloseTimerRef = useRef(null);
  const cacheHydratedRef = useRef(false);

  const selectableWeapons = useMemo(
    () => (weapons || []).filter((weapon) => !isBattlefieldVariantWeapon(weapon, modifications)),
    [weapons, modifications]
  );
  const defaultWeapon = useMemo(() => getDefaultWeapon(selectableWeapons), [selectableWeapons]);

  useEffect(() => {
    if (cacheHydratedRef.current) return;
    if (!weapons.length || !modifications.length) return;

    const cached = loadTtkCache(BATTLEFIELD_TTK_CACHE_KEY);
    cacheHydratedRef.current = true;
    if (!cached) return;

    const restoredConfigs = [];
    (Array.isArray(cached.configs) ? cached.configs : []).forEach((cfg) => {
      const restored = withConfigColor({
        ...createConfig(cfg.id),
        ...cfg,
        selectedWeapon: resolveCachedItem(cfg.selectedWeapon, selectableWeapons),
        selectedMods: resolveCachedModIds(cfg.selectedMods, modifications),
        hitProbabilities: { ...BATTLEFIELD_DEFAULT_HIT_PROBABILITIES, ...(cfg.hitProbabilities || {}) },
        running: false,
        lineRunning: false,
        progress: cfg.result ? 1 : 0,
        lineProgress: cfg.result?.distanceSeries ? 1 : 0,
      }, restoredConfigs);
      if (restored.result && !restored.selectedWeapon) {
        return;
      }
      restoredConfigs.push(restored);
    });

    setConfigs(restoredConfigs);
    setSelectedConfigId(restoredConfigs.some((cfg) => cfg.id === cached.selectedConfigId)
      ? cached.selectedConfigId
      : (restoredConfigs[0]?.id ?? null));
    setEditingConfigId(null);
    setCompareMetric(cached.compareMetric || 'ttk');
    setApplyVelocityEffect(Boolean(cached.applyVelocityEffect));
    setApplyTriggerDelay(Boolean(cached.applyTriggerDelay));
    setPreviewMetric(cached.previewMetric || 'ttk');
    setPreviewSegmentByConfig(cached.previewSegmentByConfig || {});
  }, [weapons, selectableWeapons, modifications]);

  useEffect(() => {
    if (!cacheHydratedRef.current) return;
    saveTtkCache(BATTLEFIELD_TTK_CACHE_KEY, {
      configs,
      selectedConfigId,
      compareMetric,
      applyVelocityEffect,
      applyTriggerDelay,
      previewMetric,
      previewSegmentByConfig,
    });
  }, [
    configs,
    selectedConfigId,
    compareMetric,
    applyVelocityEffect,
    applyTriggerDelay,
    previewMetric,
    previewSegmentByConfig,
  ]);

  useEffect(() => () => {
    if (previewCloseTimerRef.current) {
      clearTimeout(previewCloseTimerRef.current);
      previewCloseTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const nextMobile = window.innerWidth <= 768;
      setIsMobileViewport(nextMobile);
      if (nextMobile) {
        clearHoverPreviewCloseTimer();
        setHoveredConfigId(null);
        setHoverPreviewPos(null);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!isMobileViewport || !selectedConfigId) return;
    setPreviewSegmentByConfig((prev) => ({ ...prev, [selectedConfigId]: prev[selectedConfigId] ?? 0 }));
  }, [isMobileViewport, selectedConfigId]);

  const updateConfig = (id, patch) => {
    setConfigs((prev) => prev.map((cfg) => (cfg.id === id ? { ...cfg, ...patch } : cfg)));
  };

  const createDefaultConfig = (nextId, color) => ({
    ...createConfig(nextId),
    color,
    selectedWeapon: defaultWeapon,
  });

  const cloneConfigForAdd = (base, nextId, color) => ({
    ...createConfig(nextId),
    color,
    selectedWeapon: base.selectedWeapon,
    selectedMods: [...(base.selectedMods || [])],
    distance: base.distance,
    initialHp: base.initialHp,
    trialCount: base.trialCount,
    hitProbabilities: { ...(base.hitProbabilities || BATTLEFIELD_DEFAULT_HIT_PROBABILITIES) },
    result: cloneConfigResult(base.result),
    progress: base.result ? 1 : 0,
    lineProgress: base.result?.distanceSeries ? 1 : 0,
  });

  const canCloneConfig = (cfg) => Boolean(cfg?.selectedWeapon);

  const addConfig = () => {
    const nextId = getNextConfigId(configs);
    const color = getAvailableConfigColor(configs);
    const baseConfig = configs[configs.length - 1];
    const nextConfig = canCloneConfig(baseConfig)
      ? cloneConfigForAdd(baseConfig, nextId, color)
      : createDefaultConfig(nextId, color);

    setConfigs((prev) => [...prev, nextConfig]);
    setSelectedConfigId(nextId);
    setEditingConfigId(nextId);
  };

  const clearConfigs = () => {
    setConfigs([]);
    setSelectedConfigId(null);
    setEditingConfigId(null);
    setHoveredConfigId(null);
    setHoverPreviewPos(null);
    setPreviewSegmentByConfig({});
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

  const isBlankManualConfig = (cfg) => Boolean(cfg)
    && !cfg.selectedWeapon
    && (!cfg.selectedMods || cfg.selectedMods.length === 0);

  const closeEditingConfig = (id = editingConfigId) => {
    const cfg = configs.find((item) => item.id === id);
    if (isBlankManualConfig(cfg)) {
      removeConfig(id);
      return;
    }
    setEditingConfigId(null);
  };

  const runDistanceSweep = async (cfg, configuredWeapon) => {
    updateConfig(cfg.id, { lineRunning: true, lineProgress: 0 });
    const distanceSeries = [];
    const distances = getBattlefieldSegmentDistances(configuredWeapon, 100);

    for (let i = 0; i < distances.length; i += 1) {
      const distance = distances[i];
      const res = await runBattlefieldMonteCarlo({
        weapon: configuredWeapon,
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
        btkDistribution: res.btkDistribution,
        ttkDistribution: res.ttkDistribution,
      });

      updateConfig(cfg.id, { lineProgress: (i + 1) / distances.length });
    }

    return distanceSeries;
  };

  const runConfig = async (cfg) => {
    if (!cfg.selectedWeapon) return;

    const configuredWeapon = buildBattlefieldConfiguredWeapon({
      selectedWeapon: cfg.selectedWeapon,
      selectedModIds: cfg.selectedMods,
      modifications,
      weapons,
    });

    if (!configuredWeapon) return;

    updateConfig(cfg.id, { running: true, progress: 0, result: null, lineRunning: false, lineProgress: 0 });

    const result = await runBattlefieldMonteCarlo({
      weapon: configuredWeapon,
      distance: cfg.distance,
      initialHp: Math.min(cfg.initialHp, 100),
      hitProbabilities: cfg.hitProbabilities,
      trials: cfg.trialCount,
      chunkSize: 2000,
      onProgress: (progress) => updateConfig(cfg.id, { progress }),
    });

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
        const configuredWeapon = buildBattlefieldConfiguredWeapon({
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
        const adjustedSeries = denseBaseSeries.map((point) => ({
          ...point,
          avgTtk: applyTtkEffects({
            baseTtk: point.avgTtk,
            distance: point.distance,
            configuredWeapon,
            applyVelocityEffect,
            applyTriggerDelay,
          }),
        }));

        const segmentDistances = getBattlefieldSegmentDistances(configuredWeapon, 100);
        const modSummary = getModNames(cfg.selectedMods || [], modifications).label;

        return {
          id: cfg.id,
          name: cfg.name,
          color: getConfigColor(cfg),
          weaponName: configuredWeapon?.name || cfg.selectedWeapon?.name || '-',
          weaponImage: configuredWeapon?.image || cfg.selectedWeapon?.image,
          modSummary,
          avgBtk: cfg.result.avgBtk,
          avgTtk: adjustedAvgTtk,
          trialCount: cfg.result.trialCount,
          distanceSeries: adjustedSeries,
          segmentOptions: segmentDistances.map((distance, index) => ({ label: `第${index + 1}段`, distance })),
        };
      })
      .sort((a, b) => a.avgTtk - b.avgTtk)
      .map((row, index) => ({ ...row, rank: index + 1 }));
  }, [configs, applyVelocityEffect, applyTriggerDelay, modifications, weapons]);

  const selectedConfig = configs.find((cfg) => cfg.id === selectedConfigId) || configs[0] || null;
  const editingConfig = configs.find((cfg) => cfg.id === editingConfigId) || null;

  const getPreviewDistribution = (row, distance) => {
    const point = (row.distanceSeries || [])[Math.max(0, Math.min(100, Number(distance) || 0))];
    if (!point) return [];

    if (previewMetric === 'btk') {
      return (point.btkDistribution || []).slice(0, 8).map((item) => ({
        label: `BTK ${item.btk}`,
        prob: item.probability,
      }));
    }

    return (point.ttkDistribution || []).slice(0, 8).map((item) => ({
      label: `${Math.round(item.ttk)}ms`,
      prob: item.probability,
    }));
  };

  const clearHoverPreviewCloseTimer = () => {
    if (previewCloseTimerRef.current) {
      clearTimeout(previewCloseTimerRef.current);
      previewCloseTimerRef.current = null;
    }
  };

  const scheduleHoverPreviewClose = () => {
    clearHoverPreviewCloseTimer();
    previewCloseTimerRef.current = setTimeout(() => {
      setHoveredConfigId(null);
      setHoverPreviewPos(null);
    }, 120);
  };

  const openHoverPreview = (cfgId, rect) => {
    clearHoverPreviewCloseTimer();
    const floatWidth = 240;
    const floatHeight = 260;
    const offset = 12;
    const top = Math.max(12, Math.min(rect.top, window.innerHeight - floatHeight - 12));
    const left = Math.max(12, Math.min(rect.right + offset, window.innerWidth - floatWidth - 12));
    setHoveredConfigId(cfgId);
    setHoverPreviewPos({ top, left });
    setPreviewSegmentByConfig((prev) => ({ ...prev, [cfgId]: prev[cfgId] ?? 0 }));
  };

  const hoveredRow = hoveredConfigId ? comparisonRows.find((row) => row.id === hoveredConfigId) : null;
  const hoveredSegIdx = hoveredConfigId ? (previewSegmentByConfig[hoveredConfigId] ?? 0) : 0;
  const hoveredSeg = hoveredRow?.segmentOptions?.[hoveredSegIdx] || hoveredRow?.segmentOptions?.[0];
  const hoveredPreviewDist = hoveredRow ? getPreviewDistribution(hoveredRow, hoveredSeg?.distance ?? 0) : [];
  const mobilePreviewConfigId = isMobileViewport ? selectedConfig?.id : null;
  const mobilePreviewRow = mobilePreviewConfigId ? comparisonRows.find((row) => row.id === mobilePreviewConfigId) : null;
  const mobilePreviewSegIdx = mobilePreviewConfigId ? (previewSegmentByConfig[mobilePreviewConfigId] ?? 0) : 0;
  const mobilePreviewSeg = mobilePreviewRow?.segmentOptions?.[mobilePreviewSegIdx] || mobilePreviewRow?.segmentOptions?.[0];
  const mobilePreviewDist = mobilePreviewRow ? getPreviewDistribution(mobilePreviewRow, mobilePreviewSeg?.distance ?? 0) : [];
  const lineColorByConfigId = useMemo(
    () => configs.reduce((acc, cfg, index) => ({ ...acc, [cfg.id]: getConfigColor(cfg, index) }), {}),
    [configs]
  );

  return (
    <div className="ttk-page battlefield-ttk-page">
      <div className="ttk-main">
        <aside className="ttk-left-panel">
          <section className="ttk-compare">
            <div className="ttk-left-head">
              <h3>方案列表</h3>
              <div className="left-head-actions">
                <button type="button" className="ttk-btn" onClick={clearConfigs} disabled={configs.length === 0}>清除列表</button>
                <button type="button" className="ttk-btn primary" onClick={addConfig}>添加配置</button>
              </div>
            </div>

            <div className="config-list">
              {configs.length === 0 && (
                <div className="config-empty-state">
                  <div className="config-empty-title">还没有方案</div>
                  <div className="config-empty-copy">从一套默认配置开始，稍后再按需要微调。</div>
                  <div className="config-empty-actions single">
                    <button type="button" className="ttk-btn primary" onClick={addConfig}>添加配置</button>
                  </div>
                </div>
              )}
              {configs.map((cfg, index) => {
                const row = comparisonRows.find((item) => item.id === cfg.id);
                const badgeColor = lineColorByConfigId[cfg.id] || '#94a3b8';
                const missingConfigParts = [
                  !cfg.selectedWeapon ? '武器' : null,
                ].filter(Boolean);
                const isIncompleteConfig = missingConfigParts.length > 0;
                const statusText = cfg.running
                  ? `计算中 ${Math.round((cfg.progress || 0) * 100)}%`
                  : row
                    ? `${Math.round(row.avgTtk)}ms / ${row.avgBtk.toFixed(2)}发`
                    : isIncompleteConfig
                      ? `缺少${missingConfigParts.join('/')}`
                      : '未运行';

                return (
                  <div
                    key={cfg.id}
                    role="button"
                    tabIndex={0}
                    className={`config-item rich ${selectedConfig?.id === cfg.id ? 'active' : ''}`}
                    onMouseEnter={(event) => {
                      if (isMobileViewport || !row) return;
                      const rect = event.currentTarget.getBoundingClientRect();
                      openHoverPreview(cfg.id, rect);
                    }}
                    onMouseLeave={() => {
                      if (isMobileViewport) return;
                      scheduleHoverPreviewClose();
                    }}
                    onClick={() => {
                      setSelectedConfigId(cfg.id);
                      setEditingConfigId(cfg.id);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setSelectedConfigId(cfg.id);
                        setEditingConfigId(cfg.id);
                      }
                    }}
                  >
                    <button
                      type="button"
                      className="config-remove-btn"
                      aria-label={`删除 ${row?.weaponName || cfg.selectedWeapon?.name || cfg.name}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        removeConfig(cfg.id);
                      }}
                    >
                      ×
                    </button>
                    <div className="config-item-layout">
                      <span className="config-badge color" style={{ backgroundColor: badgeColor }} aria-label={`方案颜色 ${index + 1}`} />
                      {row?.weaponImage || cfg.selectedWeapon?.image
                        ? <img src={row?.weaponImage || cfg.selectedWeapon?.image} alt={row?.weaponName || cfg.selectedWeapon?.name} className="config-weapon-image" />
                        : <span className="config-weapon-image placeholder" aria-hidden="true">?</span>}
                      <div className="config-item-lines">
                        <div className="config-line-one">
                          <span className="config-item-title">{row?.weaponName || cfg.selectedWeapon?.name || cfg.name}</span>
                          <span className="config-item-meta">{cfg.selectedWeapon ? `${(cfg.selectedMods || []).length} 配件` : '待选择'}</span>
                        </div>
                        <div className={`config-item-stats ${isIncompleteConfig ? 'incomplete' : 'quality-lines'}`}>
                          <span className={`config-result-chip ${isIncompleteConfig ? 'missing' : ''}`}>{statusText}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {isMobileViewport && mobilePreviewRow && (
              <div className="config-preview-mobile">
                <div className="preview-controls">
                  <button type="button" className={`tiny-btn ${previewMetric === 'ttk' ? 'active' : ''}`} onClick={() => setPreviewMetric('ttk')}>TTK</button>
                  <button type="button" className={`tiny-btn ${previewMetric === 'btk' ? 'active' : ''}`} onClick={() => setPreviewMetric('btk')}>BTK</button>
                  <PreviewSegmentPicker
                    id={`mobile-preview-${mobilePreviewConfigId}`}
                    value={mobilePreviewSegIdx}
                    options={mobilePreviewRow.segmentOptions || []}
                    open={openPreviewSelectId === `mobile-preview-${mobilePreviewConfigId}`}
                    onToggle={() => setOpenPreviewSelectId((prev) => (prev === `mobile-preview-${mobilePreviewConfigId}` ? null : `mobile-preview-${mobilePreviewConfigId}`))}
                    onClose={() => setOpenPreviewSelectId(null)}
                    onChange={(index) => setPreviewSegmentByConfig((prev) => ({ ...prev, [mobilePreviewConfigId]: index }))}
                  />
                </div>
                <div className="preview-bars">
                  {mobilePreviewDist.map((item) => (
                    <div key={item.label} className="preview-bar-row">
                      <span>{item.label}</span>
                      <div className="preview-bar-track"><div className="preview-bar-fill" style={{ width: `${Math.max(2, item.prob * 100)}%` }} /></div>
                      <span>{(item.prob * 100).toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </aside>

        <section className="ttk-right-chart">
          <div className="ttk-compare chart-fill-wrap">
            <div className="chart-panel-head">
              <div>
                <h3>对比曲线</h3>
                <p>{comparisonRows.length > 0 ? `已运行 ${comparisonRows.length} 个方案` : '运行方案后会生成距离曲线'}</p>
              </div>
              <div className="chart-panel-actions">
                <div className="chart-toggle">
                  <button type="button" className={`ttk-btn ${compareMetric === 'ttk' ? 'primary' : ''}`} onClick={() => setCompareMetric('ttk')}>TTK</button>
                  <button type="button" className={`ttk-btn ${compareMetric === 'btk' ? 'primary' : ''}`} onClick={() => setCompareMetric('btk')}>BTK</button>
                </div>
                <div className="chart-toggle">
                  <button type="button" className={`ttk-btn ${applyTriggerDelay ? 'primary' : ''}`} onClick={() => setApplyTriggerDelay((value) => !value)}>
                    扳机延迟
                  </button>
                  <button type="button" className={`ttk-btn ${applyVelocityEffect ? 'primary' : ''}`} onClick={() => setApplyVelocityEffect((value) => !value)}>
                    枪口初速
                  </button>
                </div>
              </div>
            </div>
            {comparisonRows.length === 0 ? (
              <div className="compare-empty-plain">
                <p className="compare-empty-main">先准备并运行一个方案</p>
                <p className="compare-empty-tip">先添加一套方案，再调整武器、配件和命中概率。</p>
                <div className="compare-empty-actions">
                  <button type="button" className="ttk-btn" onClick={clearConfigs} disabled={configs.length === 0}>清除列表</button>
                  <button type="button" className="ttk-btn primary" onClick={addConfig}>添加配置</button>
                </div>
              </div>
            ) : (
              <div className="chart-canvas">
                <ComparisonLineChart rows={comparisonRows} metric={compareMetric} applyVelocityEffect={applyVelocityEffect} isMobile={isMobileViewport} />
              </div>
            )}

            {configs.some((cfg) => cfg.lineRunning) && (
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

      {!isMobileViewport && hoveredRow && hoverPreviewPos && createPortal(
        <div
          className="config-hover-float"
          style={{ top: hoverPreviewPos.top, left: hoverPreviewPos.left }}
          onMouseEnter={clearHoverPreviewCloseTimer}
          onMouseLeave={scheduleHoverPreviewClose}
        >
          <div className="preview-controls">
            <button type="button" className={`tiny-btn ${previewMetric === 'ttk' ? 'active' : ''}`} onClick={(event) => { event.stopPropagation(); setPreviewMetric('ttk'); }}>TTK</button>
            <button type="button" className={`tiny-btn ${previewMetric === 'btk' ? 'active' : ''}`} onClick={(event) => { event.stopPropagation(); setPreviewMetric('btk'); }}>BTK</button>
            <PreviewSegmentPicker
              id={`hover-preview-${hoveredConfigId}`}
              value={hoveredSegIdx}
              options={hoveredRow.segmentOptions || []}
              open={openPreviewSelectId === `hover-preview-${hoveredConfigId}`}
              onToggle={() => setOpenPreviewSelectId((prev) => (prev === `hover-preview-${hoveredConfigId}` ? null : `hover-preview-${hoveredConfigId}`))}
              onClose={() => setOpenPreviewSelectId(null)}
              onChange={(index) => setPreviewSegmentByConfig((prev) => ({ ...prev, [hoveredConfigId]: index }))}
            />
          </div>
          <div className="preview-bars">
            {hoveredPreviewDist.map((item) => (
              <div key={item.label} className="preview-bar-row">
                <span>{item.label}</span>
                <div className="preview-bar-track"><div className="preview-bar-fill" style={{ width: `${Math.max(2, item.prob * 100)}%` }} /></div>
                <span>{(item.prob * 100).toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>,
        document.body
      )}

      {editingConfig && (
        <div className="ttk-modal-overlay" onClick={() => closeEditingConfig(editingConfig.id)}>
          <div className="ttk-modal-content" onClick={(event) => event.stopPropagation()}>
            <BattlefieldGunConfigCard
              cfg={editingConfig}
              weapons={selectableWeapons}
              allWeapons={weapons}
              modifications={modifications}
              onChange={(patch) => updateConfig(editingConfig.id, patch)}
              onRun={(normalizedHitProbabilities) => {
                setEditingConfigId(null);
                runConfig(
                  normalizedHitProbabilities
                    ? { ...editingConfig, hitProbabilities: normalizedHitProbabilities }
                    : editingConfig,
                );
              }}
              showRemoveButton={false}
              headerActions={<button type="button" className="ttk-btn" onClick={() => closeEditingConfig(editingConfig.id)}>关闭</button>}
            />
          </div>
        </div>
      )}
    </div>
  );
}
