import React, { useMemo, useState } from 'react';
import { useGameData } from '../../hooks/useGameData';
import {
  BATTLEFIELD_WEAPON_TYPE_LABELS,
  buildBattlefieldConfiguredWeapon,
  formatBattlefieldRangeBands,
  getBattlefieldApplicableMods,
  getBattlefieldWeaponSummary,
} from '../../utils/battlefieldUtils';
import {
  buildModsById,
  computeUnlockedSlots,
  inferBaseUnlockedSlots,
  isModSelectable,
  mergeUnlockedSlots,
  toggleModSelection,
} from '../../utils/modSelectionUtils';
import '../firefight/DataLibrary.css';
import '../../components/data_library/WeaponList.css';
import './BattlefieldPages.css';

const EMPTY_WEAPONS = [];
const EMPTY_MODS = [];
const SORT_OPTIONS = [
  { value: 'name', label: '名称' },
  { value: 'damage', label: '基础伤害' },
  { value: 'fireRate', label: '射速' },
  { value: 'muzzleVelocity', label: '初速' },
  { value: 'dps', label: '胸部 DPS' },
  { value: 'headDamage', label: '头部伤害' },
];

const CLASS_OPTIONS = [
  { value: 'all', label: '全部职业' },
  { value: 'assault', label: '突击' },
  { value: 'support', label: '支援' },
  { value: 'recon', label: '侦察' },
  { value: 'engineer', label: '工程' },
];

const CLASS_WEAPON_NAMES = {
  assault: [
    '腾龙', 'AR57', 'M7', 'PTR', 'PTR-32', 'CAR-15', 'AKM', 'AKS-74U', 'M16A4',
    'AS VAL', 'AS-Val', 'M4A1', 'K416', 'K437', 'KC17', 'AK12', 'QBZ95', 'QBZ95-1', 'SG552',
  ],
  support: [
    'CAR-15', 'AKS-74U', 'M16A4', 'MP5', 'QCQ171', 'SR-3M', '勇士', '野牛',
    'SMG45', 'SMG-45', 'Vector', 'MP7', 'P90', 'UZI',
  ],
  recon: [
    'M7', 'MK47', 'SCAR-H', 'AKS-74U', 'G3', 'CAR-15', 'M16A4', 'AS VAL', 'AS-Val',
    'AK12', 'QBZ95', 'QBZ95-1', 'AUG',
  ],
  engineer: [
    'PTR', 'PTR-32', 'CAR-15', 'AKS-74U', 'M16A4', 'SCAR-H', 'K416', 'AUG', 'SG552',
    'M14', 'PKM', 'M249', 'QJB201', 'M250',
  ],
};

function normalizeName(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/[\s\-_\u2010-\u2015]/g, '');
}

const CLASS_WEAPON_SETS = Object.fromEntries(
  Object.entries(CLASS_WEAPON_NAMES).map(([className, names]) => [
    className,
    new Set(names.map(normalizeName)),
  ])
);

function formatNumber(value, digits = 1) {
  const number = Number(value) || 0;
  return number.toFixed(digits).replace(/\.0$/, '');
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

function groupMods(mods) {
  return mods.reduce((groups, mod) => {
    const groupName = Array.isArray(mod.type) ? mod.type.join(' / ') : (mod.type || '其他');
    if (!groups[groupName]) groups[groupName] = [];
    groups[groupName].push(mod);
    return groups;
  }, {});
}

function weaponBelongsToClass(weapon, classFilter) {
  if (classFilter === 'all') return true;
  const classSet = CLASS_WEAPON_SETS[classFilter];
  if (!classSet) return true;

  return [
    weapon?.name,
    weapon?.sourceName,
    weapon?.baseSourceName,
  ].some((name) => classSet.has(normalizeName(name)));
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

function BattlefieldWeaponRow({ weapon, weapons, modifications }) {
  const [expanded, setExpanded] = useState(false);
  const [selectedMods, setSelectedMods] = useState([]);

  const availableMods = useMemo(
    () => getBattlefieldApplicableMods(weapon, modifications),
    [weapon, modifications]
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
    selectedWeapon: weapon,
    selectedModIds: selectedMods,
    modifications,
    weapons,
  }), [weapon, selectedMods, modifications, weapons]);
  const baseSummary = useMemo(() => getBattlefieldWeaponSummary(weapon, 0), [weapon]);
  const finalSummary = useMemo(() => getBattlefieldWeaponSummary(configuredWeapon, 0), [configuredWeapon]);
  const rangeBands = useMemo(() => formatBattlefieldRangeBands(configuredWeapon), [configuredWeapon]);
  const baseRangeBands = useMemo(() => formatBattlefieldRangeBands(weapon), [weapon]);

  const handleModToggle = (modId, isSelected) => {
    setSelectedMods((current) => toggleModSelection({
      modId,
      isSelected,
      selectedModIds: current,
      availableMods,
      baseUnlockedSlots,
    }));
  };

  return (
    <article className={`weapon-item-wrapper battlefield-weapon-wrapper ${expanded ? 'expanded' : ''}`}>
      <div
        className="weapon-row battlefield-weapon-row-modern"
        role="button"
        tabIndex={0}
        onClick={() => setExpanded((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setExpanded((value) => !value);
          }
        }}
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
              <span className="weapon-caliber">{BATTLEFIELD_WEAPON_TYPE_LABELS[weapon.weaponType] || weapon.weaponType}</span>
              <span className="trigger-delay">{weapon.caliber}</span>
            </div>
          </div>
        </div>

        <div className="weapon-stat-strip battlefield-library-stat-strip">
          <StatColumn
            label="基础"
            value={formatNumber(weapon.damage)}
            subLabel="DPS"
            subValue={formatNumber(baseSummary.dps, 0)}
            tone="primary"
          />
          <StatColumn
            label="射速"
            value={`${formatNumber(weapon.fireRate, 0)} RPM`}
            subLabel="初速"
            subValue={`${formatNumber(weapon.muzzleVelocity, 0)} m/s`}
          />
          <StatColumn
            label="头部"
            value={formatNumber(baseSummary.headDamage)}
            subLabel="倍率"
            subValue={`${formatNumber(weapon.headMultiplier, 2)}x`}
          />
          <StatColumn
            label="胸部"
            value={formatNumber(baseSummary.chestDamage)}
            subLabel="倍率"
            subValue={`${formatNumber(weapon.chestMultiplier, 2)}x`}
          />
          <StatColumn
            label="腹部"
            value={formatNumber(baseSummary.abdomenDamage)}
            subLabel="倍率"
            subValue={`${formatNumber(weapon.abdomenMultiplier, 2)}x`}
          />
          <StatColumn
            label="四肢"
            value={formatNumber(baseSummary.limbDamage)}
            subLabel="倍率"
            subValue={`${formatNumber(getLimbMultiplier(weapon), 2)}x`}
          />
        </div>

        <div className="weapon-decay-cell">
          {baseRangeBands.map((band) => (
            <div key={band.rangeLabel} className="decay-band">
              <span className="decay-range">{band.rangeLabel}</span>
              <span className="decay-value">{Math.round(band.decay * 100)}%</span>
            </div>
          ))}
        </div>

        <div className="expand-indicator" aria-hidden="true">
          {expanded ? '▲' : '▼'}
        </div>
      </div>

      {expanded && (
        <div className="weapon-expanded-content battlefield-weapon-expanded">
          <section className="expanded-left-section battlefield-rich-mods">
            <div className="battlefield-section-head">
              <div>
                <h2>改枪配置</h2>
              </div>
              <button type="button" onClick={() => setSelectedMods([])}>清空</button>
            </div>
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
          </section>

          <section className="expanded-middle-section battlefield-rich-final">
            <div className="battlefield-section-head">
              <div>
                <h2>最终属性</h2>
                <span>展开行内实时计算</span>
              </div>
            </div>
            <div className="battlefield-final-grid">
              <div><span>基础</span><strong>{formatNumber(configuredWeapon?.damage)}</strong></div>
              <div><span>头部</span><strong>{formatNumber(finalSummary.headDamage)}</strong></div>
              <div><span>胸部</span><strong>{formatNumber(finalSummary.chestDamage)}</strong></div>
              <div><span>腹部</span><strong>{formatNumber(finalSummary.abdomenDamage)}</strong></div>
              <div><span>四肢</span><strong>{formatNumber(finalSummary.limbDamage)}</strong></div>
              <div><span>射速</span><strong>{formatNumber(configuredWeapon?.fireRate, 0)}</strong></div>
              <div><span>初速</span><strong>{formatNumber(configuredWeapon?.muzzleVelocity, 0)} m/s</strong></div>
              <div><span>DPS</span><strong>{formatNumber(finalSummary.dps, 0)}</strong></div>
            </div>
            <div className="battlefield-range-list compact-ranges expanded-ranges">
              {rangeBands.map((band) => (
                <div key={band.rangeLabel}>
                  <span>{band.rangeLabel}</span>
                  <strong>{Math.round(band.decay * 100)}%</strong>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </article>
  );
}

export function BattlefieldDataLibrary() {
  const { data } = useGameData('battlefield');
  const weapons = data.weapons || EMPTY_WEAPONS;
  const modifications = data.modifications || EMPTY_MODS;
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [classFilter, setClassFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');

  const typeOptions = useMemo(() => {
    const types = Array.from(new Set(weapons.map((weapon) => weapon.weaponType).filter(Boolean)));
    return ['all', ...types];
  }, [weapons]);

  const filteredWeapons = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return weapons
      .filter((weapon) => {
        const name = `${weapon.name || ''} ${weapon.sourceName || ''}`.toLowerCase();
        return (!keyword || name.includes(keyword))
          && (typeFilter === 'all' || weapon.weaponType === typeFilter)
          && weaponBelongsToClass(weapon, classFilter);
      })
      .map((weapon) => {
        const summary = getBattlefieldWeaponSummary(weapon, 0);
        return { ...weapon, ...summary };
      })
      .sort((a, b) => {
        switch (sortBy) {
        case 'damage':
          return b.damage - a.damage;
        case 'fireRate':
          return b.fireRate - a.fireRate;
        case 'muzzleVelocity':
          return b.muzzleVelocity - a.muzzleVelocity;
        case 'dps':
          return b.dps - a.dps;
        case 'headDamage':
          return b.headDamage - a.headDamage;
        case 'name':
        default:
          return a.name.localeCompare(b.name, 'zh-CN');
        }
      });
  }, [weapons, search, typeFilter, classFilter, sortBy]);

  return (
    <section className="data-library-container battlefield-library-container">
      <div className="filter-toolbar battlefield-library-filters">
        <div className="filter-search-row">
          <label className="library-search-field">
            <span>搜索</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="输入武器或原型名称"
              className="search-input"
            />
          </label>
        </div>
        <div className="filter-pill-grid battlefield-filter-pill-grid">
          <label className="filter-pill-field">
            <span>类型</span>
            <select className="filter-select" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
              {typeOptions.map((type) => (
                <option key={type} value={type}>{BATTLEFIELD_WEAPON_TYPE_LABELS[type] || type}</option>
              ))}
            </select>
          </label>
          <label className="filter-pill-field">
            <span>职业</span>
            <select className="filter-select" value={classFilter} onChange={(event) => setClassFilter(event.target.value)}>
              {CLASS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label className="filter-pill-field">
            <span>排序</span>
            <select className="filter-select" value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="weapon-list-container battlefield-weapon-list-container">
        <div className="weapon-grid-header battlefield-weapon-grid-header">
          <span>武器</span>
          <span>基础 / 射速 / 部位伤害</span>
          <span>射程衰减</span>
        </div>
        <div className="weapon-list">
          {filteredWeapons.map((weapon) => (
            <BattlefieldWeaponRow
              key={weapon.id}
              weapon={weapon}
              weapons={weapons}
              modifications={modifications}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
