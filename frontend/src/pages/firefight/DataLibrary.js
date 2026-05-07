/* eslint-disable indent */
import React, { useMemo, useState } from 'react';
import './DataLibrary.css';
import { WeaponList } from '../../components/data_library/WeaponList';
import { AmmoList } from '../../components/data_library/AmmoList';
import { useGameData } from '../../hooks/useGameData';

const WEAPON_SORT_OPTIONS = [
  { value: 'name', label: '名称' },
  { value: 'armorDamage', label: '甲伤' },
  { value: 'damage', label: '肉伤' },
  { value: 'fireRate', label: '射速' },
  { value: 'muzzleVelocity', label: '初速' },
  { value: 'armorDPS', label: '每秒甲伤' },
  { value: 'fleshDPS', label: '每秒肉伤' },
];

const AMMO_SORT_OPTIONS = [
  { value: 'name', label: '名称' },
  { value: 'penetration', label: '穿透等级' },
  { value: 'fleshDamageCoeff', label: '肉伤系数' },
];

const WEAPON_TYPE_OPTIONS = [
  { value: 'all', label: '全部类型' },
  { value: 'smg', label: '冲锋枪', prefixes: ['10'] },
  { value: 'pistol', label: '手枪', prefixes: ['20'] },
  { value: 'rifle', label: '步枪', prefixes: ['30'] },
  { value: 'lmg', label: '机枪', prefixes: ['40'] },
  { value: 'shotgun', label: '霰弹枪', prefixes: ['50'] },
  { value: 'marksman', label: '射手步枪', prefixes: ['60'] },
  { value: 'sniper', label: '狙击枪', prefixes: ['70'] },
];

const WEAPON_TYPE_BY_PREFIX = WEAPON_TYPE_OPTIONS.reduce((map, option) => {
  option.prefixes?.forEach((prefix) => {
    map[prefix] = option.value;
  });
  return map;
}, {});

function getWeaponType(weapon) {
  return WEAPON_TYPE_BY_PREFIX[String(weapon?.id || '').slice(0, 2)] || 'unknown';
}

function matchVariantName(value, weaponName) {
  if (typeof value === 'string') return value === weaponName;
  if (Array.isArray(value)) return value.includes(weaponName);
  if (value && typeof value === 'object') return Object.values(value).includes(weaponName);
  return false;
}

function LibrarySelect({ id, value, options, isOpen, onChange, onToggle, onClose }) {
  const selectedOption = options.find((option) => option.value === value) || options[0];

  return (
    <div
      className={`library-select ${isOpen ? 'open' : ''}`}
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
        className="library-select-button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={`${id}-menu`}
        onClick={onToggle}
      >
        <span className="library-select-value">{selectedOption?.label}</span>
        <span className="library-select-arrow" aria-hidden="true">⌄</span>
      </button>
      {isOpen && (
        <ul id={`${id}-menu`} className="library-select-menu" role="listbox">
          {options.map((option) => (
            <li key={option.value}>
              <button
                type="button"
                className={`library-select-option ${option.value === value ? 'selected' : ''}`}
                role="option"
                aria-selected={option.value === value}
                onClick={() => {
                  onChange(option.value);
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

export function DataLibrary() {
  const { data: gameData } = useGameData();
  const { weapons, ammos, modifications } = gameData;
  const [activeTab, setActiveTab] = useState('weapons');
  const [weaponSearchText, setWeaponSearchText] = useState('');
  const [weaponCaliberFilter, setWeaponCaliberFilter] = useState('all');
  const [weaponTypeFilter, setWeaponTypeFilter] = useState('all');
  const [weaponSortBy, setWeaponSortBy] = useState('name');
  const [ammoSearchText, setAmmoSearchText] = useState('');
  const [ammoCaliberFilter, setAmmoCaliberFilter] = useState('all');
  const [ammoSortBy, setAmmoSortBy] = useState('name');
  const [openSelectId, setOpenSelectId] = useState(null);

  const weaponCalibers = useMemo(() => (
    ['all', ...Array.from(new Set(weapons.map((weapon) => weapon.caliber).filter(Boolean))).sort()]
  ), [weapons]);

  const ammoCalibers = useMemo(() => (
    ['all', ...Array.from(new Set(ammos.map((ammo) => ammo.caliber).filter(Boolean))).sort()]
  ), [ammos]);

  const weaponsWithDPS = useMemo(() => {
    const shotguns = ['725双管', 'M870', 'S12K', 'M1014'];
    const weaponByName = new Map(weapons.map((weapon) => [weapon.name, weapon]));

    const findBaseWeaponForVariant = (variantWeapon) => {
      if (!variantWeapon?.isModification) return null;
      const variantMod = modifications.find((mod) => (
        matchVariantName(mod?.effects?.dataQueryName, variantWeapon.name) ||
        matchVariantName(mod?.effects?.btkQueryName, variantWeapon.name)
      ));
      const baseName = variantMod?.appliesTo?.[0];
      return baseName ? weaponByName.get(baseName) || null : null;
    };

    return weapons
      .filter((weapon) => !shotguns.includes(weapon.name))
      .map((weapon) => {
        const baseWeapon = findBaseWeaponForVariant(weapon);
        const merged = baseWeapon ? { ...baseWeapon, ...weapon } : weapon;
        const fireRate = Number(merged.fireRate) || 0;
        const armorDamage = Number(merged.armorDamage) || 0;
        const damage = Number(merged.damage) || 0;
        return {
          ...merged,
          armorDPS: armorDamage * fireRate / 60,
          fleshDPS: damage * fireRate / 60,
        };
      });
  }, [weapons, modifications]);

  const availableWeaponTypeOptions = useMemo(() => {
    const visibleTypes = new Set(weaponsWithDPS.map(getWeaponType));
    return WEAPON_TYPE_OPTIONS.filter((option) => option.value === 'all' || visibleTypes.has(option.value));
  }, [weaponsWithDPS]);

  const filteredWeapons = useMemo(() => {
    let nextWeapons = weaponsWithDPS;
    const keyword = weaponSearchText.trim().toLowerCase();
    if (keyword) {
      nextWeapons = nextWeapons.filter((weapon) => weapon.name.toLowerCase().includes(keyword));
    }
    if (weaponCaliberFilter !== 'all') {
      nextWeapons = nextWeapons.filter((weapon) => weapon.caliber === weaponCaliberFilter);
    }
    if (weaponTypeFilter !== 'all') {
      nextWeapons = nextWeapons.filter((weapon) => getWeaponType(weapon) === weaponTypeFilter);
    }

    return [...nextWeapons].sort((a, b) => {
      switch (weaponSortBy) {
      case 'name':
        return a.name.localeCompare(b.name, 'zh-CN');
      case 'armorDamage':
        return (Number(b.armorDamage) || 0) - (Number(a.armorDamage) || 0);
      case 'damage':
        return (Number(b.damage) || 0) - (Number(a.damage) || 0);
      case 'fireRate':
        return (Number(b.fireRate) || 0) - (Number(a.fireRate) || 0);
      case 'muzzleVelocity':
        return (Number(b.muzzleVelocity) || 0) - (Number(a.muzzleVelocity) || 0);
      case 'armorDPS':
        return (Number(b.armorDPS) || 0) - (Number(a.armorDPS) || 0);
      case 'fleshDPS':
        return (Number(b.fleshDPS) || 0) - (Number(a.fleshDPS) || 0);
      default:
        return 0;
      }
    });
  }, [weaponsWithDPS, weaponSearchText, weaponCaliberFilter, weaponTypeFilter, weaponSortBy]);

  const filteredAmmos = useMemo(() => {
    let nextAmmos = ammos;
    const keyword = ammoSearchText.trim().toLowerCase();
    if (keyword) {
      nextAmmos = nextAmmos.filter((ammo) => ammo.name.toLowerCase().includes(keyword));
    }
    if (ammoCaliberFilter !== 'all') {
      nextAmmos = nextAmmos.filter((ammo) => ammo.caliber === ammoCaliberFilter);
    }

    return [...nextAmmos].sort((a, b) => {
      switch (ammoSortBy) {
      case 'name':
        return a.name.localeCompare(b.name, 'zh-CN');
      case 'penetration':
        return (Number(b.penetration) || 0) - (Number(a.penetration) || 0);
      case 'fleshDamageCoeff':
        return (Number(b.fleshDamageCoeff) || 0) - (Number(a.fleshDamageCoeff) || 0);
      default:
        return 0;
      }
    });
  }, [ammos, ammoSearchText, ammoCaliberFilter, ammoSortBy]);

  const handleCaliberClick = (caliber) => {
    setActiveTab('ammos');
    setAmmoCaliberFilter(caliber);
  };

  const activeCount = activeTab === 'weapons' ? filteredWeapons.length : filteredAmmos.length;
  const activeTotal = activeTab === 'weapons' ? weaponsWithDPS.length : ammos.length;
  const renderLibrarySelect = (id, value, onChange, options) => (
    <LibrarySelect
      id={id}
      value={value}
      options={options}
      isOpen={openSelectId === id}
      onChange={onChange}
      onToggle={() => setOpenSelectId((current) => (current === id ? null : id))}
      onClose={() => setOpenSelectId(null)}
    />
  );

  return (
    <section className="data-library-container">
      <div className="library-topbar">
        <div className="data-library-tabs" role="tablist" aria-label="数据图鉴分类">
          <button
            type="button"
            className={`tab-button ${activeTab === 'weapons' ? 'active' : ''}`}
            onClick={() => setActiveTab('weapons')}
          >
            武器
          </button>
          <button
            type="button"
            className={`tab-button ${activeTab === 'ammos' ? 'active' : ''}`}
            onClick={() => setActiveTab('ammos')}
          >
            弹药
          </button>
        </div>
        <div className="library-count">
          {activeCount} / {activeTotal}
        </div>
      </div>

      {activeTab === 'weapons' && (
        <div className="tab-content">
          <div className="filter-toolbar">
            <div className="filter-search-row">
              <label className="library-search-field">
                <span>搜索</span>
                <input
                  type="text"
                  placeholder="输入武器名称..."
                  value={weaponSearchText}
                  onChange={(e) => setWeaponSearchText(e.target.value)}
                  className="search-input"
                />
              </label>
            </div>
            <div className="filter-pill-grid weapon-filter-pill-grid">
              <div className="filter-pill-field">
                <span>子弹</span>
                {renderLibrarySelect(
                  'weapon-caliber',
                  weaponCaliberFilter,
                  setWeaponCaliberFilter,
                  weaponCalibers.map((caliber) => ({
                    value: caliber,
                    label: caliber === 'all' ? '全部子弹' : caliber,
                  })),
                )}
              </div>
              <div className="filter-pill-field">
                <span>类型</span>
                {renderLibrarySelect('weapon-type', weaponTypeFilter, setWeaponTypeFilter, availableWeaponTypeOptions)}
              </div>
              <div className="filter-pill-field">
                <span>排序</span>
                {renderLibrarySelect('weapon-sort', weaponSortBy, setWeaponSortBy, WEAPON_SORT_OPTIONS)}
              </div>
            </div>
          </div>

          <WeaponList
            weapons={filteredWeapons}
            onCaliberClick={handleCaliberClick}
          />
        </div>
      )}

      {activeTab === 'ammos' && (
        <div className="tab-content">
          <div className="filter-toolbar">
            <div className="filter-search-row">
              <label className="library-search-field">
                <span>搜索</span>
                <input
                  type="text"
                  placeholder="输入弹药名称..."
                  value={ammoSearchText}
                  onChange={(e) => setAmmoSearchText(e.target.value)}
                  className="search-input"
                />
              </label>
            </div>
            <div className="filter-pill-grid ammo-filter-pill-grid">
              <div className="filter-pill-field">
                <span>子弹</span>
                {renderLibrarySelect(
                  'ammo-caliber',
                  ammoCaliberFilter,
                  setAmmoCaliberFilter,
                  ammoCalibers.map((caliber) => ({
                    value: caliber,
                    label: caliber === 'all' ? '全部子弹' : caliber,
                  })),
                )}
              </div>
              <div className="filter-pill-field">
                <span>排序</span>
                {renderLibrarySelect('ammo-sort', ammoSortBy, setAmmoSortBy, AMMO_SORT_OPTIONS)}
              </div>
            </div>
          </div>

          <AmmoList ammos={filteredAmmos} />
        </div>
      )}
    </section>
  );
}
