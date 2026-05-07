import React, { useMemo, useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { WeaponSelector } from '../../components/simulator/Selectors';
import { AmmoSelector } from '../../components/public/AmmoSelector';
import { ArmorSelector, HelmetSelector } from '../../components/public/ArmorSittings';
import { UniversalSlider } from '../../components/public/UniversalSlider';
import { BtkDistributionChart } from '../../components/public/BtkDistributionChart';
import { TtkDistributionChart } from '../../components/public/TtkDistributionChart';
import { useGameData } from '../../hooks/useGameData';
import { generateDurabilityValues } from '../../utils/numberUtils';
import {
  buildModsById,
  computeUnlockedSlots,
  inferBaseUnlockedSlots,
  isModSelectable,
  mergeUnlockedSlots,
  toggleModSelection,
} from '../../utils/modSelectionUtils';
import { buildConfiguredWeapon } from '../../utils/weaponConfigUtils';
import { DEFAULT_HIT_PROBABILITIES, runMonteCarlo } from '../../utils/ttkMonteCarlo';
import { getRarityClass, getProtectionLevelClass } from '../../utils/styleUtils';
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import './TTKSimulator.css';

const EMPTY_ARRAY = [];

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
  { key: 'limbs', label: '其余四肢', sites: ['lowerArm', 'thigh', 'calf'] },
];
const PROBABILITY_SUM_WARN_EPSILON = 0.0005;
const TRIAL_PRESETS = [1000, 5000, 10000];
const PROBABILITY_PRESETS = [
  {
    key: 'default',
    label: '默认记录',
    values: { head: 0.1724, chest: 0.3046, abdomen: 0.1897, upperArm: 0.12, limbs: 0.2133 },
  },
  {
    key: 'even',
    label: '均匀命中',
    values: { head: 0.25, chest: 0.25, abdomen: 0.25, upperArm: 0.0625, limbs: 0.1875 },
  },
  {
    key: 'center',
    label: '偏躯干',
    values: { head: 0.08, chest: 0.44, abdomen: 0.28, upperArm: 0.08, limbs: 0.12 },
  },
  {
    key: 'head-only',
    label: '仅头部',
    values: { head: 1, chest: 0, abdomen: 0, upperArm: 0, limbs: 0 },
  },
  {
    key: 'chest-only',
    label: '仅胸部',
    values: { head: 0, chest: 1, abdomen: 0, upperArm: 0, limbs: 0 },
  },
  {
    key: 'abdomen-only',
    label: '仅腹部',
    values: { head: 0, chest: 0, abdomen: 1, upperArm: 0, limbs: 0 },
  },
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

const getProbabilityDrafts = (hitProbabilities) => {
  const drafts = {};
  PROBABILITY_FIELDS.forEach((field) => {
    drafts[field.key] = getDisplayProbability(hitProbabilities, field.sites).toFixed(4);
  });
  return drafts;
};

const BAR_COLORS = [
  '#2F6F73', '#7A6FBE', '#C17C3A', '#4F7F52', '#8A5A68', '#587A9C',
  '#B7791F', '#3E6B45', '#9A6A5B', '#536F8F', '#8B7A3D', '#6F5C86',
  '#2D7B8A', '#A45F3D', '#5F7863', '#9B5C7A', '#6E7F3F', '#4D6674',
  '#8E7047', '#3D7469', '#7C675E', '#5E6FA3', '#A06565', '#6F8248',
];
const RECHARTS_TOOLTIP_CONTENT_STYLE = {
  background: 'rgba(255, 255, 255, 0.84)',
  color: '#162321',
  borderRadius: '8px',
  border: '1px solid #d8e2df',
  boxShadow: '0 4px 12px rgba(22, 35, 33, 0.14)',
};
const CUSTOM_CALIBER = '独特口径';
const CUSTOM_WEAPON_FIELDS = [
  { key: 'name', label: '枪械名称', type: 'text' },
  { key: 'damage', label: '基础伤害', type: 'number', step: '0.01' },
  { key: 'armorDamage', label: '护甲伤害', type: 'number', step: '0.01' },
  { key: 'fireRate', label: '射速(RPM)', type: 'number', step: '0.01' },
  { key: 'muzzleVelocity', label: '枪口初速', type: 'number', step: '0.01' },
  { key: 'triggerDelay', label: '扳机延迟(ms)', type: 'number', step: '0.01' },
  { key: 'headMultiplier', label: '头部倍率', type: 'number', step: '0.01' },
  { key: 'chestMultiplier', label: '胸部倍率', type: 'number', step: '0.01' },
  { key: 'abdomenMultiplier', label: '腹部倍率', type: 'number', step: '0.01' },
  { key: 'upperArmMultiplier', label: '上臂倍率', type: 'number', step: '0.01' },
  { key: 'lowerArmMultiplier', label: '下臂倍率', type: 'number', step: '0.01' },
  { key: 'thighMultiplier', label: '大腿倍率', type: 'number', step: '0.01' },
  { key: 'calfMultiplier', label: '小腿倍率', type: 'number', step: '0.01' },
];
const CUSTOM_WEAPON_DECAY_FIELDS = [
  { key: 'decay1', label: '第1段伤害系数', type: 'number', step: '0.0001' },
  { key: 'decay2', label: '第2段伤害系数', type: 'number', step: '0.0001' },
  { key: 'decay3', label: '第3段伤害系数', type: 'number', step: '0.0001' },
  { key: 'decay4', label: '第4段伤害系数', type: 'number', step: '0.0001' },
  { key: 'decay5', label: '第5段伤害系数', type: 'number', step: '0.0001' },
];
const CUSTOM_AMMO_FIELDS = [
  { key: 'name', label: '子弹名称', type: 'text' },
  { key: 'penetration', label: '穿透等级', type: 'number', step: '1' },
  { key: 'sameLevelPenetration', label: '同级穿透率', type: 'number', step: '0.0001' },
  { key: 'secondaryPenetration', label: '次级穿透率', type: 'number', step: '0.0001' },
  { key: 'fleshDamageCoeff', label: '肉伤系数', type: 'number', step: '0.0001' },
  { key: 'armor1', label: '护甲系数1', type: 'number', step: '0.0001' },
  { key: 'armor2', label: '护甲系数2', type: 'number', step: '0.0001' },
  { key: 'armor3', label: '护甲系数3', type: 'number', step: '0.0001' },
  { key: 'armor4', label: '护甲系数4', type: 'number', step: '0.0001' },
  { key: 'armor5', label: '护甲系数5', type: 'number', step: '0.0001' },
  { key: 'armor6', label: '护甲系数6', type: 'number', step: '0.0001' },
];

const createEmptyCustomWeaponDraft = () => ({
  templateId: '',
  inheritTemplateNameImage: false,
  name: '自定义枪械',
  caliber: CUSTOM_CALIBER,
  rangeSegmentCount: 5,
  damage: 30,
  armorDamage: 30,
  fireRate: 600,
  muzzleVelocity: 700,
  triggerDelay: 0,
  headMultiplier: 1.7,
  chestMultiplier: 1.0,
  abdomenMultiplier: 1.0,
  upperArmMultiplier: 1.0,
  lowerArmMultiplier: 1.0,
  thighMultiplier: 1.0,
  calfMultiplier: 1.0,
  range1: 10,
  range2: 20,
  range3: 35,
  range4: 50,
  range5: 100,
  decay1: 1,
  decay2: 0.9,
  decay3: 0.8,
  decay4: 0.7,
  decay5: 0.6,
});

const createEmptyCustomAmmoDraft = () => ({
  templateId: '',
  inheritTemplateNameImage: false,
  name: '自定义子弹',
  caliber: CUSTOM_CALIBER,
  penetration: 4,
  sameLevelPenetration: 0.5,
  secondaryPenetration: 0.75,
  fleshDamageCoeff: 1,
  armor1: 1,
  armor2: 1,
  armor3: 1,
  armor4: 1,
  armor5: 1,
  armor6: 1,
  rarity: 'white',
  description: '自定义子弹',
  image: '',
});

const toNumberOr = (value, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const getUniqueName = (rawBaseName, existingNames) => {
  const baseName = String(rawBaseName || '').trim() || '自定义';
  if (!existingNames.includes(baseName)) return baseName;
  let suffix = 1;
  while (existingNames.includes(`${baseName}${suffix}`)) {
    suffix += 1;
  }
  return `${baseName}${suffix}`;
};

const getNextSequentialName = (prefix, existingNames = []) => {
  const reg = new RegExp(`^${prefix}(\\d+)$`);
  let maxNo = 0;
  existingNames.forEach((name) => {
    const text = String(name || '').trim();
    const m = text.match(reg);
    if (m) {
      const n = Number(m[1]);
      if (Number.isFinite(n)) maxNo = Math.max(maxNo, n);
    }
  });
  return `${prefix}${maxNo + 1}`;
};

const resolvePenetrationRarity = (penetration) => {
  const p = Number(penetration) || 0;
  if (p >= 6) return 'red';
  if (p >= 5) return 'orange';
  if (p >= 4) return 'purple';
  if (p >= 3) return 'blue';
  if (p >= 2) return 'green';
  return 'white';
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

  for (let d = 0; d <= maxDistance; d += 1) {
    while (idx + 1 < sorted.length && d >= sorted[idx + 1].distance) {
      idx += 1;
    }
    dense.push({
      distance: d,
      avgTtk: sorted[idx].avgTtk,
      avgBtk: sorted[idx].avgBtk,
      btkDistribution: sorted[idx].btkDistribution,
      ttkDistribution: sorted[idx].ttkDistribution,
    });
  }

  return dense;
};

const getSegmentDistances = (configuredWeapon, maxDistance = 100) => {
  if (!configuredWeapon) return [0, maxDistance];

  const toPositiveRange = (value) => {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : null;
  };

  const r1 = toPositiveRange(configuredWeapon.range1);
  const r2 = toPositiveRange(configuredWeapon.range2);
  const r3 = toPositiveRange(configuredWeapon.range3);
  const r4 = toPositiveRange(configuredWeapon.range4);
  const r5 = toPositiveRange(configuredWeapon.range5);

  // 閲囨牱鈥滃悇娈佃捣鐐光€濓細0 娈?+ (rangeN + 1)
  // 采样各段起点：0段 + (rangeN + 1)，因为 <= rangeN 仍属于上一段
  const points = [
    0,
    r1 == null ? null : r1 + 1,
    r2 == null ? null : r2 + 1,
    r3 == null ? null : r3 + 1,
    r4 == null ? null : r4 + 1,
    r5 == null ? null : r5 + 1,
    maxDistance,
  ]
    .filter((v) => Number.isFinite(v) && v >= 0 && v <= maxDistance)
    .map((v) => Math.round(v));

  return [...new Set(points)].sort((a, b) => a - b);
};

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

  const readyRows = rows.filter((r) => Array.isArray(r.distanceSeries) && r.distanceSeries.length > 0);

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
          tickFormatter={(v) => (metric === 'ttk' ? `${Math.round(v)}ms` : Number(v).toFixed(1))}
          domain={metric === 'ttk' ? ['dataMin - 60', 'dataMax + 60'] : ['dataMin - 1', 'dataMax + 1']}
          tick={{ fontSize: isMobile ? 11 : 12 }}
          width={isMobile ? 40 : 56}
        />
        <Tooltip
          formatter={(value) => (metric === 'ttk' ? `${Math.round(value)} ms` : Number(value).toFixed(2))}
          labelFormatter={(label) => `距离 ${label}m`}
          contentStyle={RECHARTS_TOOLTIP_CONTENT_STYLE}
        />
        <Legend verticalAlign={isMobile ? 'bottom' : 'top'} align="center" height={isMobile ? 26 : 36} wrapperStyle={{ fontSize: isMobile ? 11 : 12 }} />
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

function PreviewSegmentPicker({ id, value, options, open, onToggle, onClose, onChange }) {
  const selected = options?.[value] || options?.[0];

  return (
    <div
      className={`preview-segment-picker ${open ? 'open' : ''}`}
      onClick={(e) => e.stopPropagation()}
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
        <span className="preview-segment-arrow" aria-hidden="true">⌄</span>
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

function CustomWeaponModal({
  open,
  weaponTemplates,
  ammoTemplates,
  draftWeapon,
  draftAmmo,
  onClose,
  onChangeWeaponField,
  onChangeAmmoField,
  onApplyWeaponTemplate,
  onApplyAmmoTemplate,
  onSave,
}) {
  if (!open) return null;

  return createPortal(
    <div className="ttk-modal-overlay custom-modal-overlay-top" onClick={onClose}>
      <div className="ttk-modal-content custom-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="ttk-modal-head">
          <h3>自定义枪械/子弹</h3>
          <span className="custom-modal-subtitle">可基于模板快速填充并继续微调参数</span>
        </div>
        <div className="custom-modal-body">
          <div className="custom-grid">
            <section className="custom-section">
              <div className="custom-section-head">
                <h4>枪械模板与参数</h4>
                <select
                  value={draftWeapon.templateId || ''}
                  onChange={(e) => onApplyWeaponTemplate(e.target.value)}
                >
                  <option value="">选择枪械模板</option>
                  {weaponTemplates.map((weapon) => (
                    <option key={weapon.id} value={weapon.id}>{weapon.name}</option>
                  ))}
                </select>
              </div>
              <div className="custom-fields-grid">
                {CUSTOM_WEAPON_FIELDS.map((field) => (
                  <label key={field.key} className="custom-field">
                    <span>{field.label}</span>
                    <input
                      type={field.type}
                      step={field.step}
                      value={draftWeapon[field.key]}
                      onChange={(e) => onChangeWeaponField(field.key, e.target.value)}
                    />
                  </label>
                ))}
              </div>
              <div className="custom-section-subtitle">射程分段</div>
              <div className="custom-fields-grid">
                <label className="custom-field">
                  <span>射程段数</span>
                  <select
                    value={draftWeapon.rangeSegmentCount}
                    onChange={(e) => onChangeWeaponField('rangeSegmentCount', Number(e.target.value))}
                  >
                    <option value={1}>1段</option>
                    <option value={2}>2段</option>
                    <option value={3}>3段</option>
                    <option value={4}>4段</option>
                    <option value={5}>5段</option>
                  </select>
                </label>
                {Array.from({ length: Number(draftWeapon.rangeSegmentCount) || 1 }).map((_, idx) => {
                  const segNo = idx + 1;
                  const rangeKey = `range${segNo}`;
                  const isLast = segNo === Number(draftWeapon.rangeSegmentCount);
                  return (
                    <label key={rangeKey} className="custom-field">
                      <span>{`第${segNo}段射程上限`}</span>
                      <input
                        type="number"
                        step="0.01"
                        value={isLast ? 999 : draftWeapon[rangeKey]}
                        disabled={isLast}
                        onChange={(e) => onChangeWeaponField(rangeKey, e.target.value)}
                      />
                    </label>
                  );
                })}
              </div>
              <div className="custom-section-subtitle">分段伤害系数</div>
              <div className="custom-fields-grid">
                {Array.from({ length: Number(draftWeapon.rangeSegmentCount) || 1 }).map((_, idx) => {
                  const field = CUSTOM_WEAPON_DECAY_FIELDS[idx];
                  return (
                    <label key={field.key} className="custom-field">
                      <span>{field.label}</span>
                      <input
                        type={field.type}
                        step={field.step}
                        value={draftWeapon[field.key]}
                        onChange={(e) => onChangeWeaponField(field.key, e.target.value)}
                      />
                    </label>
                  );
                })}
              </div>
            </section>
            <section className="custom-section">
              <div className="custom-section-head">
                <h4>子弹模板与参数</h4>
                <select
                  value={draftAmmo.templateId || ''}
                  onChange={(e) => onApplyAmmoTemplate(e.target.value)}
                >
                  <option value="">选择子弹模板</option>
                  {ammoTemplates.map((ammo) => (
                    <option key={ammo.id} value={ammo.id}>{`${ammo.name}（${ammo.caliber || '-'}）`}</option>
                  ))}
                </select>
              </div>
              <div className="custom-fields-grid">
                {CUSTOM_AMMO_FIELDS.map((field) => (
                  <label key={field.key} className="custom-field">
                    <span>{field.label}</span>
                    <input
                      type={field.type}
                      step={field.step}
                      value={draftAmmo[field.key]}
                      onChange={(e) => onChangeAmmoField(field.key, e.target.value)}
                    />
                  </label>
                ))}
              </div>
            </section>
          </div>
        </div>
        <div className="custom-modal-footer">
          <button type="button" className="ttk-btn" onClick={onClose}>取消</button>
          <button type="button" className="ttk-btn primary" onClick={onSave}>保存</button>
        </div>
      </div>
    </div>,
    document.body
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
  onRequestCreateCustom,
  showResult = true,
  showRemoveButton = true,
  headerActions = null,
}) {
  const [missingFields, setMissingFields] = useState({});
  const [probDrafts, setProbDrafts] = useState(getProbabilityDrafts(cfg.hitProbabilities));
  const [hoveredMod, setHoveredMod] = useState(null);
  const [modTooltipPos, setModTooltipPos] = useState({ x: 0, y: 0 });

  const availableAmmos = useMemo(() => {
    if (!cfg.selectedWeapon) return [];
    if (cfg.selectedWeapon.isCustom) {
      return cfg.selectedAmmo ? [cfg.selectedAmmo] : [];
    }
    return (ammos || [])
      .filter((ammo) => !ammo.isCustom)
      .filter((ammo) => ammo.caliber === cfg.selectedWeapon.caliber)
      .slice()
      .sort((a, b) => (b?.penetration ?? -1) - (a?.penetration ?? -1));
  }, [cfg.selectedWeapon, cfg.selectedAmmo, ammos]);

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
      const hasRealEffect = effectValues.some((v) => {
        const n = Number(v);
        return Number.isFinite(n) && n !== 0;
      });
      const hasDamageChange = mod.effects.damageChange === true;
      const unlockSlotsRaw = mod.effects.unlockSlots ?? mod.effects.unlock_slots;
      const hasUnlockSlots = Array.isArray(unlockSlotsRaw)
        ? unlockSlotsRaw.length > 0
        : typeof unlockSlotsRaw === 'string' && unlockSlotsRaw.trim().length > 0;
      return hasRealEffect || hasDamageChange || hasUnlockSlots;
    });
  }, [cfg.selectedWeapon, modifications]);

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

  useEffect(() => {
    setProbDrafts(getProbabilityDrafts(cfg.hitProbabilities));
  }, [cfg.hitProbabilities]);

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

  const buildNormalizedHitProbabilities = () => {
    const values = PROBABILITY_FIELDS.map((f) => Math.max(0, Number(probDrafts[f.key]) || 0));
    const sum = values.reduce((a, b) => a + b, 0);
    if (sum <= 0) return null;

    const normalized = values.map((v) => v / sum);
    let nextHit = { ...cfg.hitProbabilities };
    PROBABILITY_FIELDS.forEach((f, i) => {
      nextHit = setGroupedProbability(nextHit, f.sites, normalized[i]);
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
    const field = PROBABILITY_FIELDS.find((f) => f.key === fieldKey);
    if (!field) return;
    const numeric = Math.max(0, Number(rawValue) || 0);
    onChange({
      hitProbabilities: setGroupedProbability(cfg.hitProbabilities, field.sites, numeric),
    });
  };

  const handleProbabilityKeyDown = (e, fieldKey, idx) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const inputs = Array.from(document.querySelectorAll('.prob-item input'));
      const next = inputs[idx + 1];
      if (next) next.focus();
      return;
    }

    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      const step = e.shiftKey ? 0.001 : 0.01;
      const current = Number(probDrafts[fieldKey]) || 0;
      const nextValue = e.key === 'ArrowUp' ? current + step : Math.max(0, current - step);
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

  const probabilitySum = PROBABILITY_FIELDS.reduce((sum, f) => sum + (Math.max(0, Number(probDrafts[f.key]) || 0)), 0);

  return (
    <section className={`ttk-card ${showResult ? '' : 'ttk-card-flat'}`}>
      <div className="ttk-card-header">
        <h3>{cfg.selectedWeapon?.name || cfg.name}</h3>
        <div className="modal-head-actions">
          {showRemoveButton && <button type="button" className="ttk-btn danger" onClick={onRemove}>移除</button>}
          {headerActions}
        </div>
      </div>

      <div className="ttk-grid selector-grid">
        <div className="field-card grouped-card">
          <div className="field-section-label">武器与弹药</div>
          <div className="sub-grid one-col">
            <div className={`option-slot ${missingFields.selectedWeapon ? 'missing' : ''}`}>
              <WeaponSelector
                options={weapons}
                selectedWeapon={cfg.selectedWeapon}
                onCreateCustom={onRequestCreateCustom}
                onSelect={(weapon) => onChange({ selectedWeapon: weapon, selectedMods: [] })}
              />
            </div>
            <div className={`option-slot ${missingFields.selectedAmmo ? 'missing' : ''}`}>
              <AmmoSelector
                options={availableAmmos}
                selectedAmmo={cfg.selectedAmmo}
                onSelect={(ammo) => onChange({ selectedAmmo: ammo })}
                placeholder="閫夋嫨寮硅嵂"
                emptyOptionsMessage="请先选择武器"
              />
            </div>
          </div>
        </div>

        <div className="field-card grouped-card">
          <div className="field-section-label">目标防具</div>
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

      <div className="run-config-wrap">
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
                  onChange={(e) => onChange({ trialCount: Math.max(100, Math.min(100000, Number(e.target.value) || 100)) })}
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
              values={Array.from({ length: 100 }, (_, i) => i + 1)}
              value={Math.min(cfg.initialHp, 100)}
              onChange={(initialHp) => onChange({ initialHp: Math.min(initialHp, 100) })}
            />
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
        <div className="probabilities">
          {PROBABILITY_FIELDS.map((field, idx) => (
            <label key={field.key} className={`prob-item prob-${field.key}`} htmlFor={`${cfg.id}-${field.key}`}>
              <span className="prob-label-row">{field.label}</span>
              <input
                id={`${cfg.id}-${field.key}`}
                type="number"
                min={0}
                step={0.01}
                value={probDrafts[field.key] ?? ''}
                onChange={(e) => setProbDrafts((prev) => ({ ...prev, [field.key]: e.target.value }))}
                onBlur={(e) => {
                  const fixed = (Math.max(0, Number(e.target.value) || 0)).toFixed(4);
                  setProbDrafts((prev) => ({ ...prev, [field.key]: fixed }));
                  commitProbability(field.key, fixed);
                }}
                onKeyDown={(e) => handleProbabilityKeyDown(e, field.key, idx)}
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
                      onMouseEnter={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
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
      )}
      {hoveredMod && (
        <div className="mod-tooltip mod-tooltip-ttk" style={{ left: `${modTooltipPos.x}px`, top: `${modTooltipPos.y}px` }}>
          <h4>{hoveredMod.name}</h4>
          <div className="mod-effects">
            {(Number(hoveredMod?.effects?.rangeModifier) || 0) !== 0 && (
              <div className="effect-item">
                <span className="effect-label">射程:</span>
                <span className={`effect-value ${(Number(hoveredMod.effects.rangeModifier) || 0) > 0 ? 'positive' : 'negative'}`}>
                  {(Number(hoveredMod.effects.rangeModifier) || 0) > 0 ? '+' : ''}
                  {Math.round((Number(hoveredMod.effects.rangeModifier) || 0) * 100)}%
                </span>
              </div>
            )}
            {(Number(hoveredMod?.effects?.fireRateModifier) || 0) !== 0 && (
              <div className="effect-item">
                <span className="effect-label">射速:</span>
                <span className={`effect-value ${(Number(hoveredMod.effects.fireRateModifier) || 0) > 0 ? 'positive' : 'negative'}`}>
                  {(Number(hoveredMod.effects.fireRateModifier) || 0) > 0 ? '+' : ''}
                  {Math.round((Number(hoveredMod.effects.fireRateModifier) || 0) * 100)}%
                </span>
              </div>
            )}
            {(Number(hoveredMod?.effects?.muzzleVelocityModifier) || 0) !== 0 && (
              <div className="effect-item">
                <span className="effect-label">初速:</span>
                <span className={`effect-value ${(Number(hoveredMod.effects.muzzleVelocityModifier) || 0) > 0 ? 'positive' : 'negative'}`}>
                  {(Number(hoveredMod.effects.muzzleVelocityModifier) || 0) > 0 ? '+' : ''}
                  {Math.round((Number(hoveredMod.effects.muzzleVelocityModifier) || 0) * 100)}%
                </span>
              </div>
            )}
            {hoveredMod?.effects?.damageChange === true && (
              <div className="effect-item">
                <span className="effect-label">伤害:</span>
                <span className="effect-value special">改变伤害曲线</span>
              </div>
            )}
            {!(
              (Number(hoveredMod?.effects?.rangeModifier) || 0) !== 0
              || (Number(hoveredMod?.effects?.fireRateModifier) || 0) !== 0
              || (Number(hoveredMod?.effects?.muzzleVelocityModifier) || 0) !== 0
              || hoveredMod?.effects?.damageChange === true
            ) && (
              <div className="effect-item">
                <span className="effect-value">无直接数值效果</span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="ttk-actions">
        <button type="button" className="ttk-btn primary" onClick={handleRun} disabled={cfg.running}>
          {cfg.running ? `计算中 ${Math.round(cfg.progress * 100)}%` : '开始模拟'}
        </button>
      </div>

      {showResult && cfg.result && (
        <div className="ttk-result">
          <div className="summary">
            <div>骞冲潎BTK: {cfg.result.avgBtk.toFixed(2)}</div>
            <div>骞冲潎TTK: {Math.round(cfg.result.avgTtk)} ms</div>
            <div>鏍锋湰鏁? {cfg.result.trialCount}</div>
            <div>鐞嗚灏勯€? {Math.round(cfg.result.fireRate || 0)} RPM</div>
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
  const weapons = data?.weapons || EMPTY_ARRAY;
  const ammos = data?.ammos || EMPTY_ARRAY;
  const helmets = data?.helmets || EMPTY_ARRAY;
  const armors = data?.armors || EMPTY_ARRAY;
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
  const [customWeapons, setCustomWeapons] = useState([]);
  const [customAmmos, setCustomAmmos] = useState([]);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customTargetConfigId, setCustomTargetConfigId] = useState(null);
  const [editingCustomPairId, setEditingCustomPairId] = useState(null);
  const [customWeaponDraft, setCustomWeaponDraft] = useState(createEmptyCustomWeaponDraft());
  const [customAmmoDraft, setCustomAmmoDraft] = useState(createEmptyCustomAmmoDraft());
  const [isMobileViewport, setIsMobileViewport] = useState(
    () => (typeof window !== 'undefined' ? window.innerWidth <= 768 : false)
  );
  const workerRef = useRef(null);
  const requestSeedRef = useRef(0);
  const previewCloseTimerRef = useRef(null);

  const weaponTemplates = useMemo(
    () => (weapons || []).filter((weapon) => !weapon.isModification && !weapon.isCustom),
    [weapons]
  );
  const ammoTemplates = useMemo(
    () => (ammos || []).filter((ammo) => !ammo.isCustom),
    [ammos]
  );
  const selectableWeapons = useMemo(
    () => [...weaponTemplates],
    [weaponTemplates]
  );
  const selectableAmmos = useMemo(
    () => [...ammoTemplates],
    [ammoTemplates]
  );

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
    if (previewCloseTimerRef.current) {
      clearTimeout(previewCloseTimerRef.current);
      previewCloseTimerRef.current = null;
    }
  }, []);

  const addConfig = () => {
    const nextId = (configs.length ? Math.max(...configs.map((c) => c.id)) : 0) + 1;

    let nextConfig = createConfig(nextId);
    if (configs.length > 0) {
      const base = configs[configs.length - 1];
      let inheritedWeapon = base.selectedWeapon;
      let inheritedAmmo = base.selectedAmmo;
      if (base.selectedWeapon?.isCustom && base.selectedAmmo?.isCustom) {
        const inheritedPairId = `custom-pair-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const nextWeaponName = getNextSequentialName(
          '自定义枪械',
          (customWeapons || []).map((item) => item.name)
        );
        const nextAmmoName = getNextSequentialName(
          '自定义子弹',
          (customAmmos || []).map((item) => item.name)
        );
        inheritedWeapon = {
          ...base.selectedWeapon,
          id: `custom-weapon-${inheritedPairId}`,
          customPairId: inheritedPairId,
          name: nextWeaponName,
        };
        inheritedAmmo = {
          ...base.selectedAmmo,
          id: `custom-ammo-${inheritedPairId}`,
          customPairId: inheritedPairId,
          name: nextAmmoName,
        };
        setCustomWeapons((prev) => [...prev, inheritedWeapon]);
        setCustomAmmos((prev) => [...prev, inheritedAmmo]);
      }
      nextConfig = {
        ...nextConfig,
        selectedWeapon: inheritedWeapon,
        selectedAmmo: inheritedAmmo,
        selectedHelmet: base.selectedHelmet,
        selectedArmor: base.selectedArmor,
        helmetDurability: base.helmetDurability,
        armorDurability: base.armorDurability,
        selectedMods: [...(base.selectedMods || [])],
        distance: base.distance,
        initialHp: base.initialHp,
        trialCount: base.trialCount,
        hitProbabilities: { ...(base.hitProbabilities || DEFAULT_HIT_PROBABILITIES) },
      };
    }

    setConfigs((prev) => [...prev, nextConfig]);
    setSelectedConfigId(nextId);
    setEditingConfigId(nextId);
  };

  const addStarterConfig = () => {
    const nextId = (configs.length ? Math.max(...configs.map((c) => c.id)) : 0) + 1;
    const defaultHelmet = pickMaxDurabilityByLevel(helmets, 5) || helmets[0] || null;
    const defaultArmor = pickMaxDurabilityByLevel(armors, 5) || armors[0] || null;
    const rifleTemplates = weaponTemplates.filter((weapon) => {
      const id = Number(weapon.id);
      return Number.isFinite(id) && id >= 3000 && id < 4000 && !weapon.isModification;
    });
    const defaultWeapon = rifleTemplates.reduce((latest, weapon) => (
      !latest || Number(weapon.id) > Number(latest.id) ? weapon : latest
    ), null)
      || weaponTemplates[0]
      || null;
    const defaultAmmo = defaultWeapon
      ? pickDefaultAmmo(ammoTemplates.filter((ammo) => ammo.caliber === defaultWeapon.caliber))
      : null;

    const nextConfig = {
      ...createConfig(nextId),
      selectedWeapon: defaultWeapon,
      selectedAmmo: defaultAmmo,
      selectedHelmet: defaultHelmet,
      selectedArmor: defaultArmor,
      helmetDurability: defaultHelmet?.durability || 0,
      armorDurability: defaultArmor?.durability || 0,
    };

    setConfigs((prev) => [...prev, nextConfig]);
    setSelectedConfigId(nextId);
    setEditingConfigId(nextId);
  };

  const openCustomModal = (targetConfigId = null, currentWeapon = null, currentAmmo = null) => {
    setCustomTargetConfigId(targetConfigId);
    if (currentWeapon?.isCustom && currentWeapon.customPairId) {
      const currentPairId = currentWeapon.customPairId;
      const existingWeapon = currentWeapon || customWeapons.find((item) => item.customPairId === currentPairId);
      const existingAmmo = currentAmmo || customAmmos.find((item) => item.customPairId === currentPairId);
      if (existingWeapon && existingAmmo) {
        setEditingCustomPairId(currentPairId);
        setCustomWeaponDraft({
          templateId: existingWeapon.sourceTemplateId || '',
          inheritTemplateNameImage: Boolean(existingWeapon.inheritTemplateNameImage),
          name: existingWeapon.name || '自定义枪械',
          caliber: CUSTOM_CALIBER,
          rangeSegmentCount: (() => {
            for (let i = 1; i <= 5; i += 1) {
              const rv = Number(existingWeapon[`range${i}`]);
              if (Number.isFinite(rv) && rv >= 999) return i;
            }
            return 5;
          })(),
          damage: toNumberOr(existingWeapon.damage, 30),
          armorDamage: toNumberOr(existingWeapon.armorDamage, 30),
          fireRate: toNumberOr(existingWeapon.fireRate, 600),
          muzzleVelocity: toNumberOr(existingWeapon.muzzleVelocity, 700),
          triggerDelay: toNumberOr(existingWeapon.triggerDelay, 0),
          headMultiplier: toNumberOr(existingWeapon.headMultiplier, 1.7),
          chestMultiplier: toNumberOr(existingWeapon.chestMultiplier, 1),
          abdomenMultiplier: toNumberOr(existingWeapon.abdomenMultiplier, 1),
          upperArmMultiplier: toNumberOr(existingWeapon.upperArmMultiplier, 1),
          lowerArmMultiplier: toNumberOr(existingWeapon.lowerArmMultiplier, 1),
          thighMultiplier: toNumberOr(existingWeapon.thighMultiplier, 1),
          calfMultiplier: toNumberOr(existingWeapon.calfMultiplier, 1),
          range1: toNumberOr(existingWeapon.range1, 10),
          range2: toNumberOr(existingWeapon.range2, 20),
          range3: toNumberOr(existingWeapon.range3, 35),
          range4: toNumberOr(existingWeapon.range4, 50),
          range5: toNumberOr(existingWeapon.range5, 999),
          decay1: toNumberOr(existingWeapon.decay1, 1),
          decay2: toNumberOr(existingWeapon.decay2, 0.9),
          decay3: toNumberOr(existingWeapon.decay3, 0.8),
          decay4: toNumberOr(existingWeapon.decay4, 0.7),
          decay5: toNumberOr(existingWeapon.decay5, 0.6),
        });
        setCustomAmmoDraft({
          templateId: existingAmmo.sourceTemplateId || '',
          inheritTemplateNameImage: Boolean(existingAmmo.inheritTemplateNameImage),
          name: existingAmmo.name || '自定义子弹',
          caliber: CUSTOM_CALIBER,
          penetration: toNumberOr(existingAmmo.penetration, 4),
          sameLevelPenetration: toNumberOr(existingAmmo.sameLevelPenetration, 0.5),
          secondaryPenetration: toNumberOr(existingAmmo.secondaryPenetration, 0.75),
          fleshDamageCoeff: toNumberOr(existingAmmo.fleshDamageCoeff, 1),
          armor1: toNumberOr(existingAmmo.armor1, 1),
          armor2: toNumberOr(existingAmmo.armor2, 1),
          armor3: toNumberOr(existingAmmo.armor3, 1),
          armor4: toNumberOr(existingAmmo.armor4, 1),
          armor5: toNumberOr(existingAmmo.armor5, 1),
          armor6: toNumberOr(existingAmmo.armor6, 1),
          rarity: existingAmmo.rarity || 'white',
          description: existingAmmo.description || '自定义子弹',
          image: '',
        });
        setShowCustomModal(true);
        return;
      }
    }
    setEditingCustomPairId(null);
    setCustomWeaponDraft({
      ...createEmptyCustomWeaponDraft(),
      name: getNextSequentialName('自定义枪械', (customWeapons || []).map((item) => item.name)),
    });
    setCustomAmmoDraft({
      ...createEmptyCustomAmmoDraft(),
      name: getNextSequentialName('自定义子弹', (customAmmos || []).map((item) => item.name)),
    });
    setShowCustomModal(true);
  };

  const applyWeaponTemplate = (templateId) => {
    const template = weaponTemplates.find((item) => String(item.id) === String(templateId));
    if (!template) {
      setCustomWeaponDraft((prev) => ({ ...prev, templateId: '', inheritTemplateNameImage: false }));
      return;
    }
    setCustomWeaponDraft((prev) => {
      const next = { ...prev, templateId, inheritTemplateNameImage: true };
      CUSTOM_WEAPON_FIELDS.forEach((field) => {
        if (field.key === 'name') return;
        if (field.type === 'number') {
          next[field.key] = toNumberOr(template[field.key], next[field.key]);
        } else {
          next[field.key] = template[field.key] ?? next[field.key];
        }
      });
      for (let i = 1; i <= 5; i += 1) {
        next[`range${i}`] = toNumberOr(template[`range${i}`], next[`range${i}`]);
        next[`decay${i}`] = toNumberOr(template[`decay${i}`], next[`decay${i}`]);
      }
      let segmentCount = 5;
      for (let i = 1; i <= 5; i += 1) {
        const rangeValue = Number(template[`range${i}`]);
        if (Number.isFinite(rangeValue) && rangeValue >= 999) {
          segmentCount = i;
          break;
        }
      }
      next.rangeSegmentCount = segmentCount;
      return next;
    });
  };

  const applyAmmoTemplate = (templateId) => {
    const template = ammoTemplates.find((item) => String(item.id) === String(templateId));
    if (!template) {
      setCustomAmmoDraft((prev) => ({ ...prev, templateId: '', inheritTemplateNameImage: false }));
      return;
    }
    setCustomAmmoDraft((prev) => {
      const next = { ...prev, templateId, inheritTemplateNameImage: true };
      CUSTOM_AMMO_FIELDS.forEach((field) => {
        if (field.key === 'name') return;
        if (field.type === 'number') {
          next[field.key] = toNumberOr(template[field.key], next[field.key]);
        } else {
          next[field.key] = template[field.key] ?? next[field.key];
        }
      });
      next.rarity = template.rarity || prev.rarity || 'white';
      next.description = template.description || prev.description || '自定义子弹';
      next.image = '';
      return next;
    });
  };

  const saveCustomPair = () => {
    const requestedWeaponName = String(customWeaponDraft.name || '').trim();
    const requestedAmmoName = String(customAmmoDraft.name || '').trim();
    const caliber = CUSTOM_CALIBER;
    if (!requestedWeaponName || !requestedAmmoName) {
      window.alert('请至少填写枪械名称和子弹名称。');
      return;
    }

    const isEditingCustom = Boolean(editingCustomPairId);
    const existingWeaponForEdit = isEditingCustom
      ? customWeapons.find((item) => item.customPairId === editingCustomPairId)
      : null;
    const existingAmmoForEdit = isEditingCustom
      ? customAmmos.find((item) => item.customPairId === editingCustomPairId)
      : null;

    const pairId = editingCustomPairId || `custom-pair-${Date.now()}`;
    const weaponTemplate = weaponTemplates.find((item) => String(item.id) === String(customWeaponDraft.templateId));
    const ammoTemplate = ammoTemplates.find((item) => String(item.id) === String(customAmmoDraft.templateId));
    const rangeSegmentCount = Math.max(1, Math.min(5, Number(customWeaponDraft.rangeSegmentCount) || 1));
    const selectedSegmentDecay = toNumberOr(customWeaponDraft[`decay${rangeSegmentCount}`], 1);

    const finalRange = {};
    const finalDecay = {};
    for (let i = 1; i <= 5; i += 1) {
      finalRange[`range${i}`] = i < rangeSegmentCount
        ? toNumberOr(customWeaponDraft[`range${i}`], i * 10)
        : 999;
      finalDecay[`decay${i}`] = i <= rangeSegmentCount
        ? toNumberOr(customWeaponDraft[`decay${i}`], selectedSegmentDecay)
        : selectedSegmentDecay;
    }

    const shouldInheritWeaponNameImage = Boolean(weaponTemplate) && Boolean(customWeaponDraft.inheritTemplateNameImage);
    const shouldInheritAmmoNameImage = Boolean(ammoTemplate) && Boolean(customAmmoDraft.inheritTemplateNameImage);

    const weaponName = shouldInheritWeaponNameImage
      ? (weaponTemplate?.name || requestedWeaponName || '自定义枪械')
      : getUniqueName(
        requestedWeaponName,
        (customWeapons || [])
          .filter((item) => item.customPairId !== editingCustomPairId)
          .map((item) => item.name)
      );
    const ammoName = shouldInheritAmmoNameImage
      ? (ammoTemplate?.name || requestedAmmoName || '自定义子弹')
      : getUniqueName(
        requestedAmmoName,
        (customAmmos || [])
          .filter((item) => item.customPairId !== editingCustomPairId)
          .map((item) => item.name)
      );

    const customWeapon = {
      ...(weaponTemplate || {}),
      id: existingWeaponForEdit?.id || `custom-weapon-${pairId}`,
      isCustom: true,
      customPairId: pairId,
      sourceTemplateId: weaponTemplate?.id ?? null,
      inheritTemplateNameImage: shouldInheritWeaponNameImage,
      isModification: false,
      name: weaponName,
      caliber,
      image: shouldInheritWeaponNameImage ? (weaponTemplate?.image || '') : '',
      damage: toNumberOr(customWeaponDraft.damage, 30),
      armorDamage: toNumberOr(customWeaponDraft.armorDamage, 30),
      fireRate: toNumberOr(customWeaponDraft.fireRate, 600),
      muzzleVelocity: toNumberOr(customWeaponDraft.muzzleVelocity, 700),
      triggerDelay: toNumberOr(customWeaponDraft.triggerDelay, 0),
      headMultiplier: toNumberOr(customWeaponDraft.headMultiplier, 1.7),
      chestMultiplier: toNumberOr(customWeaponDraft.chestMultiplier, 1.0),
      abdomenMultiplier: toNumberOr(customWeaponDraft.abdomenMultiplier, 1.0),
      upperArmMultiplier: toNumberOr(customWeaponDraft.upperArmMultiplier, 1.0),
      lowerArmMultiplier: toNumberOr(customWeaponDraft.lowerArmMultiplier, 1.0),
      thighMultiplier: toNumberOr(customWeaponDraft.thighMultiplier, 1.0),
      calfMultiplier: toNumberOr(customWeaponDraft.calfMultiplier, 1.0),
      ...finalRange,
      ...finalDecay,
    };

    const customAmmo = {
      ...(ammoTemplate || {}),
      id: existingAmmoForEdit?.id || `custom-ammo-${pairId}`,
      isCustom: true,
      customPairId: pairId,
      sourceTemplateId: ammoTemplate?.id ?? null,
      inheritTemplateNameImage: shouldInheritAmmoNameImage,
      name: ammoName,
      caliber,
      image: shouldInheritAmmoNameImage
        ? (ammoTemplate?.image || '')
        : (existingAmmoForEdit?.image || ''),
      penetration: toNumberOr(customAmmoDraft.penetration, 4),
      rarity: resolvePenetrationRarity(toNumberOr(customAmmoDraft.penetration, 4)),
      description: '',
      sameLevelPenetration: toNumberOr(customAmmoDraft.sameLevelPenetration, 0.5),
      secondaryPenetration: toNumberOr(customAmmoDraft.secondaryPenetration, 0.75),
      fleshDamageCoeff: toNumberOr(customAmmoDraft.fleshDamageCoeff, 1),
      armor1: toNumberOr(customAmmoDraft.armor1, 1),
      armor2: toNumberOr(customAmmoDraft.armor2, 1),
      armor3: toNumberOr(customAmmoDraft.armor3, 1),
      armor4: toNumberOr(customAmmoDraft.armor4, 1),
      armor5: toNumberOr(customAmmoDraft.armor5, 1),
      armor6: toNumberOr(customAmmoDraft.armor6, 1),
    };

    setCustomWeapons((prev) => (
      isEditingCustom
        ? prev.map((item) => (item.customPairId === pairId ? customWeapon : item))
        : [...prev, customWeapon]
    ));
    setCustomAmmos((prev) => (
      isEditingCustom
        ? prev.map((item) => (item.customPairId === pairId ? customAmmo : item))
        : [...prev, customAmmo]
    ));

    const fallbackConfigId = selectedConfigId || configs[0]?.id || null;
    const targetConfigId = customTargetConfigId || fallbackConfigId;
    if (targetConfigId != null) {
      updateConfig(targetConfigId, {
        selectedWeapon: customWeapon,
        selectedAmmo: customAmmo,
        selectedMods: [],
      });
      setSelectedConfigId(targetConfigId);
      setEditingConfigId(targetConfigId);
    }

    setShowCustomModal(false);
    setCustomTargetConfigId(null);
    setEditingCustomPairId(null);
  };

  const updateConfig = (id, patch) => {
    setConfigs((prev) => prev.map((cfg) => (cfg.id === id ? { ...cfg, ...patch } : cfg)));
  };

  const handleConfigChange = (id, patch) => {
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

  const isBlankManualConfig = (cfg) => Boolean(cfg)
    && !cfg.selectedWeapon
    && !cfg.selectedAmmo
    && (!cfg.selectedMods || cfg.selectedMods.length === 0);

  const closeEditingConfig = (id = editingConfigId) => {
    const cfg = configs.find((item) => item.id === id);
    if (isBlankManualConfig(cfg)) {
      removeConfig(id);
      return;
    }
    setEditingConfigId(null);
  };

  const runMonteCarloWithWorker = (cfgId, payload) => new Promise((resolve, reject) => {
    try {
      if (!workerRef.current) {
        workerRef.current = new Worker(new URL('../../workers/ttkMonteCarloWorker.js', import.meta.url));
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
        btkDistribution: res.btkDistribution,
        ttkDistribution: res.ttkDistribution,
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

        const segmentDistances = getSegmentDistances(configuredWeapon, 100);

        return {
          id: cfg.id,
          name: cfg.name,
          weaponName: cfg.selectedWeapon?.name || '-',
          weaponImage: cfg.selectedWeapon?.image,
          ammoName: cfg.selectedAmmo?.name || '-',
          ammoRarity: cfg.selectedAmmo?.rarity,
          helmetLevel: cfg.selectedHelmet?.level,
          armorLevel: cfg.selectedArmor?.level,
          helmetDurability: cfg.helmetDurability,
          armorDurability: cfg.armorDurability,
          avgBtk: cfg.result.avgBtk,
          avgTtk: adjustedAvgTtk,
          trialCount: cfg.result.trialCount,
          distanceSeries: adjustedSeries,
          segmentOptions: segmentDistances.map((distance, i) => ({ label: `第${i + 1}段`, distance })),
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
      return (point.btkDistribution || []).slice(0, 8).map((d) => ({
        label: `BTK ${d.btk}`,
        prob: d.probability,
      }));
    }

    return (point.ttkDistribution || []).slice(0, 8).map((d) => ({
      label: `${Math.round(d.ttk)}ms`,
      prob: d.probability,
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

  const hoveredRow = hoveredConfigId ? comparisonRows.find((r) => r.id === hoveredConfigId) : null;
  const hoveredSegIdx = hoveredConfigId ? (previewSegmentByConfig[hoveredConfigId] ?? 0) : 0;
  const hoveredSeg = hoveredRow?.segmentOptions?.[hoveredSegIdx] || hoveredRow?.segmentOptions?.[0];
  const hoveredPreviewDist = hoveredRow ? getPreviewDistribution(hoveredRow, hoveredSeg?.distance ?? 0) : [];
  const mobilePreviewConfigId = isMobileViewport ? selectedConfig?.id : null;
  const mobilePreviewRow = mobilePreviewConfigId ? comparisonRows.find((r) => r.id === mobilePreviewConfigId) : null;
  const mobilePreviewSegIdx = mobilePreviewConfigId ? (previewSegmentByConfig[mobilePreviewConfigId] ?? 0) : 0;
  const mobilePreviewSeg = mobilePreviewRow?.segmentOptions?.[mobilePreviewSegIdx] || mobilePreviewRow?.segmentOptions?.[0];
  const mobilePreviewDist = mobilePreviewRow ? getPreviewDistribution(mobilePreviewRow, mobilePreviewSeg?.distance ?? 0) : [];
  const lineColorByConfigId = useMemo(
    () => comparisonRows.reduce((acc, row, i) => ({ ...acc, [row.id]: BAR_COLORS[i % BAR_COLORS.length] }), {}),
    [comparisonRows]
  );

  return (
    <div className="ttk-page">
      <div className="ttk-main">
        <aside className="ttk-left-panel">
          <section className="ttk-compare">
            <div className="ttk-left-head">
              <h3>方案列表</h3>
              <div className="left-head-actions">
                <button type="button" className="ttk-btn" onClick={addStarterConfig}>快速填充</button>
                <button type="button" className="ttk-btn primary" onClick={addConfig}>添加配置</button>
              </div>
            </div>

            <div className="config-list">
              {configs.length === 0 && (
                <div className="config-empty-state">
                  <div className="config-empty-title">还没有方案</div>
                  <div className="config-empty-copy">从一套默认配置开始，稍后再按需要微调。</div>
                  <div className="config-empty-actions single">
                    <button type="button" className="ttk-btn primary" onClick={addStarterConfig}>快速填充方案</button>
                  </div>
                </div>
              )}
              {configs.map((cfg, idx) => {
                const row = comparisonRows.find((r) => r.id === cfg.id);
                const badgeColor = lineColorByConfigId[cfg.id] || '#94a3b8';
                const missingConfigParts = [
                  !cfg.selectedWeapon ? '武器' : null,
                  !cfg.selectedAmmo ? '弹药' : null,
                  !cfg.selectedHelmet ? '头盔' : null,
                  !cfg.selectedArmor ? '护甲' : null,
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
                  <button
                    key={cfg.id}
                    type="button"
                    className={`config-item rich ${selectedConfig?.id === cfg.id ? 'active' : ''}`}
                    onMouseEnter={(e) => {
                      if (isMobileViewport || !row) return;
                      const rect = e.currentTarget.getBoundingClientRect();
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
                  >
                    <div className="config-item-layout">
                      <span className="config-badge color" style={{ backgroundColor: badgeColor }} aria-label={`方案颜色 ${idx + 1}`} />
                      {cfg.selectedWeapon?.image
                        ? <img src={cfg.selectedWeapon.image} alt={cfg.selectedWeapon?.name} className="config-weapon-image" />
                        : <span className="config-weapon-image placeholder" aria-hidden="true">?</span>}
                      <div className="config-item-lines">
                        <div className="config-line-one">
                          <span className="config-item-title">{cfg.selectedWeapon?.name || cfg.name}</span>
                          <span className={`config-item-meta ${getRarityClass(cfg.selectedAmmo?.rarity)}`}>
                            {cfg.selectedAmmo?.name || (cfg.selectedWeapon ? '未选弹药' : '待选择')}
                          </span>
                        </div>
                        {isIncompleteConfig ? (
                          <div className="config-item-stats incomplete">
                            <span className="config-result-chip missing">{statusText}</span>
                          </div>
                        ) : (
                          <div className="config-item-stats quality-lines">
                            <span className={getProtectionLevelClass(cfg.selectedHelmet?.level)}>头：{Math.round(cfg.helmetDurability || 0)}</span>
                            <span className={getProtectionLevelClass(cfg.selectedArmor?.level)}>甲：{Math.round(cfg.armorDurability || 0)}</span>
                            <span className="config-result-chip">{statusText}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
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
                  {mobilePreviewDist.map((d) => (
                    <div key={d.label} className="preview-bar-row">
                      <span>{d.label}</span>
                      <div className="preview-bar-track"><div className="preview-bar-fill" style={{ width: `${Math.max(2, d.prob * 100)}%` }} /></div>
                      <span>{(d.prob * 100).toFixed(1)}%</span>
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
                  <button type="button" className={`ttk-btn ${applyTriggerDelay ? 'primary' : ''}`} onClick={() => setApplyTriggerDelay((v) => !v)}>
                    扳机延迟
                  </button>
                  <button type="button" className={`ttk-btn ${applyVelocityEffect ? 'primary' : ''}`} onClick={() => setApplyVelocityEffect((v) => !v)}>
                    枪口初速
                  </button>
                </div>
              </div>
            </div>
            {comparisonRows.length === 0 ? (
              <div className="compare-empty-plain">
                <p className="compare-empty-main">先准备并运行一个方案</p>
                <p className="compare-empty-tip">先添加一个方案，再调整弹药、防具、配件和命中概率。</p>
                <div className="compare-empty-actions">
                  <button type="button" className="ttk-btn" onClick={addStarterConfig}>快速填充</button>
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
            <button type="button" className={`tiny-btn ${previewMetric === 'ttk' ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); setPreviewMetric('ttk'); }}>TTK</button>
            <button type="button" className={`tiny-btn ${previewMetric === 'btk' ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); setPreviewMetric('btk'); }}>BTK</button>
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
            {hoveredPreviewDist.map((d) => (
              <div key={d.label} className="preview-bar-row">
                <span>{d.label}</span>
                <div className="preview-bar-track"><div className="preview-bar-fill" style={{ width: `${Math.max(2, d.prob * 100)}%` }} /></div>
                <span>{(d.prob * 100).toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>,
        document.body
      )}

      <CustomWeaponModal
        open={showCustomModal}
        weaponTemplates={weaponTemplates}
        ammoTemplates={ammoTemplates}
        draftWeapon={customWeaponDraft}
        draftAmmo={customAmmoDraft}
        onClose={() => {
          setShowCustomModal(false);
          setCustomTargetConfigId(null);
          setEditingCustomPairId(null);
        }}
        onChangeWeaponField={(key, value) => setCustomWeaponDraft((prev) => ({ ...prev, [key]: value, inheritTemplateNameImage: false }))}
        onChangeAmmoField={(key, value) => setCustomAmmoDraft((prev) => ({ ...prev, [key]: value, inheritTemplateNameImage: false }))}
        onApplyWeaponTemplate={applyWeaponTemplate}
        onApplyAmmoTemplate={applyAmmoTemplate}
        onSave={saveCustomPair}
      />

      {editingConfig && (
        <div className="ttk-modal-overlay" onClick={() => closeEditingConfig(editingConfig.id)}>
          <div className="ttk-modal-content" onClick={(e) => e.stopPropagation()}>
            <GunConfigCard
              cfg={editingConfig}
              weapons={selectableWeapons}
              ammos={selectableAmmos}
              helmets={helmets}
              armors={armors}
              modifications={modifications}
              onChange={(patch) => handleConfigChange(editingConfig.id, patch)}
              onRequestCreateCustom={(currentWeapon) => openCustomModal(editingConfig.id, currentWeapon, editingConfig.selectedAmmo)}
              onRun={(normalizedHitProbabilities) => {
                setEditingConfigId(null);
                runConfig(
                  normalizedHitProbabilities
                    ? { ...editingConfig, hitProbabilities: normalizedHitProbabilities }
                    : editingConfig,
                );
              }}
              onRemove={() => {
                setEditingConfigId(null);
                removeConfig(editingConfig.id);
              }}
              showResult={false}
              showRemoveButton
              headerActions={<button type="button" className="ttk-btn" onClick={() => closeEditingConfig(editingConfig.id)}>关闭</button>}
            />
          </div>
        </div>
      )}
    </div>
  );
}



