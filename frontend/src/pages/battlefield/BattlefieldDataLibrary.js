import React, { useMemo, useState } from 'react';
import { useGameData } from '../../hooks/useGameData';
import {
  BATTLEFIELD_WEAPON_TYPE_LABELS,
  calculateBattlefieldDamage,
  formatBattlefieldRangeBands,
} from '../../utils/battlefieldUtils';
import './BattlefieldPages.css';

const SORT_OPTIONS = [
  { value: 'name', label: '名称' },
  { value: 'damage', label: '基础伤害' },
  { value: 'fireRate', label: '射速' },
  { value: 'muzzleVelocity', label: '初速' },
  { value: 'dps', label: '胸部DPS' },
];
const EMPTY_WEAPONS = [];

export function BattlefieldDataLibrary() {
  const { data } = useGameData('battlefield');
  const weapons = data.weapons || EMPTY_WEAPONS;
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');

  const typeOptions = useMemo(() => {
    const types = Array.from(new Set(weapons.map((weapon) => weapon.weaponType).filter(Boolean)));
    return ['all', ...types];
  }, [weapons]);

  const filteredWeapons = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return weapons
      .filter((weapon) => (
        (!keyword || weapon.name.toLowerCase().includes(keyword)) &&
        (typeFilter === 'all' || weapon.weaponType === typeFilter)
      ))
      .map((weapon) => ({
        ...weapon,
        dps: calculateBattlefieldDamage(weapon, 'chest', 0) * (Number(weapon.fireRate) || 0) / 60,
      }))
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
        case 'name':
        default:
          return a.name.localeCompare(b.name, 'zh-CN');
        }
      });
  }, [weapons, search, typeFilter, sortBy]);

  return (
    <section className="battlefield-page dense">
      <div className="battlefield-header compact">
        <div>
          <p className="battlefield-kicker">战场模式</p>
          <h1>数据图鉴</h1>
        </div>
        <div className="battlefield-data-chip">{filteredWeapons.length} / {weapons.length}</div>
      </div>

      <div className="battlefield-library-toolbar">
        <label>
          <span>搜索</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="输入武器名称" />
        </label>
        <label>
          <span>类型</span>
          <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
            {typeOptions.map((type) => (
              <option key={type} value={type}>{BATTLEFIELD_WEAPON_TYPE_LABELS[type] || type}</option>
            ))}
          </select>
        </label>
        <label>
          <span>排序</span>
          <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="battlefield-weapon-list">
        {filteredWeapons.map((weapon) => (
          <article key={weapon.id} className="battlefield-weapon-row">
            <div className="battlefield-weapon-main">
              <img src={weapon.image} alt={weapon.name} />
              <div>
                <h2>{weapon.name}</h2>
                <span>{BATTLEFIELD_WEAPON_TYPE_LABELS[weapon.weaponType] || weapon.weaponType}</span>
              </div>
            </div>
            <div className="battlefield-stat-matrix">
              <div><span>伤害</span><strong>{weapon.damage}</strong></div>
              <div><span>射速</span><strong>{weapon.fireRate}</strong></div>
              <div><span>初速</span><strong>{weapon.muzzleVelocity}</strong></div>
              <div><span>胸DPS</span><strong>{weapon.dps.toFixed(1)}</strong></div>
              <div><span>头部</span><strong>{calculateBattlefieldDamage(weapon, 'head', 0).toFixed(1)}</strong></div>
              <div><span>胸部</span><strong>{calculateBattlefieldDamage(weapon, 'chest', 0).toFixed(1)}</strong></div>
              <div><span>腹部</span><strong>{calculateBattlefieldDamage(weapon, 'abdomen', 0).toFixed(1)}</strong></div>
            </div>
            <div className="battlefield-range-list compact-ranges">
              {formatBattlefieldRangeBands(weapon).map((band) => (
                <div key={band.rangeLabel}>
                  <span>{band.rangeLabel}</span>
                  <strong>{Math.round(band.decay * 100)}%</strong>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
