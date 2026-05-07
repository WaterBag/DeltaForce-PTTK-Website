import React, { useMemo, useState } from 'react';
import { useGameData } from '../../hooks/useGameData';
import {
  BATTLEFIELD_DEFAULT_HIT_PROBABILITIES,
  BATTLEFIELD_HIT_PARTS,
  BATTLEFIELD_WEAPON_TYPE_LABELS,
  calculateBattlefieldTtk,
  formatBattlefieldRangeBands,
} from '../../utils/battlefieldUtils';
import './BattlefieldPages.css';

const PRESETS = [
  { label: '默认', values: BATTLEFIELD_DEFAULT_HIT_PROBABILITIES },
  { label: '均匀', values: { head: 0.1429, chest: 0.1429, abdomen: 0.1429, upperArm: 0.1429, lowerArm: 0.1429, thigh: 0.1429, calf: 0.1426 } },
  { label: '仅头部', values: { head: 1, chest: 0, abdomen: 0, upperArm: 0, lowerArm: 0, thigh: 0, calf: 0 } },
  { label: '仅胸部', values: { head: 0, chest: 1, abdomen: 0, upperArm: 0, lowerArm: 0, thigh: 0, calf: 0 } },
];
const EMPTY_WEAPONS = [];

export function BattlefieldTTK() {
  const { data } = useGameData('battlefield');
  const weapons = data.weapons || EMPTY_WEAPONS;
  const [selectedWeaponId, setSelectedWeaponId] = useState('');
  const [distance, setDistance] = useState(30);
  const [hp, setHp] = useState(100);
  const [probabilities, setProbabilities] = useState(BATTLEFIELD_DEFAULT_HIT_PROBABILITIES);

  const selectedWeapon = useMemo(() => (
    weapons.find((weapon) => weapon.id === selectedWeaponId) || weapons[0] || null
  ), [weapons, selectedWeaponId]);

  const result = useMemo(() => calculateBattlefieldTtk({
    weapon: selectedWeapon,
    distance,
    hp,
    probabilities,
  }), [selectedWeapon, distance, hp, probabilities]);

  const updateProbability = (key, value) => {
    setProbabilities((current) => ({
      ...current,
      [key]: Math.max(0, Number(value) || 0),
    }));
  };

  return (
    <section className="battlefield-page">
      <div className="battlefield-header compact">
        <div>
          <p className="battlefield-kicker">战场模式</p>
          <h1>TTK</h1>
        </div>
        <div className="battlefield-data-chip">{weapons.length} 武器</div>
      </div>

      <div className="battlefield-workbench">
        <div className="battlefield-panel config">
          <div className="battlefield-control-grid">
            <label>
              <span>武器</span>
              <select value={selectedWeapon?.id || ''} onChange={(event) => setSelectedWeaponId(event.target.value)}>
                {weapons.map((weapon) => (
                  <option key={weapon.id} value={weapon.id}>{weapon.name}</option>
                ))}
              </select>
            </label>
            <label>
              <span>距离</span>
              <input type="number" min="0" value={distance} onChange={(event) => setDistance(Number(event.target.value))} />
            </label>
            <label>
              <span>血量</span>
              <input type="number" min="1" value={hp} onChange={(event) => setHp(Number(event.target.value))} />
            </label>
          </div>

          {selectedWeapon && (
            <div className="battlefield-weapon-strip">
              <img src={selectedWeapon.image} alt={selectedWeapon.name} />
              <div>
                <strong>{selectedWeapon.name}</strong>
                <span>{BATTLEFIELD_WEAPON_TYPE_LABELS[selectedWeapon.weaponType] || selectedWeapon.weaponType}</span>
              </div>
              <div className="battlefield-stat-inline">
                <span>{selectedWeapon.damage} 伤害</span>
                <span>{selectedWeapon.fireRate} RPM</span>
                <span>{selectedWeapon.muzzleVelocity} m/s</span>
              </div>
            </div>
          )}

          <div className="battlefield-prob-head">
            <h2>部位概率</h2>
            <div className="battlefield-preset-row">
              {PRESETS.map((preset) => (
                <button key={preset.label} type="button" onClick={() => setProbabilities(preset.values)}>
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
          <div className="battlefield-prob-grid">
            {BATTLEFIELD_HIT_PARTS.map((part) => (
              <label key={part.key}>
                <span>{part.label}</span>
                <input
                  type="number"
                  min="0"
                  step="0.0001"
                  value={probabilities[part.key]}
                  onChange={(event) => updateProbability(part.key, event.target.value)}
                />
              </label>
            ))}
          </div>
        </div>

        <div className="battlefield-panel result">
          <div className="battlefield-result-grid">
            <div>
              <span>期望TTK</span>
              <strong>{Math.round(result.ttk)}ms</strong>
            </div>
            <div>
              <span>期望发数</span>
              <strong>{result.btk}</strong>
            </div>
            <div>
              <span>每发期望伤害</span>
              <strong>{result.expectedDamage.toFixed(1)}</strong>
            </div>
          </div>

          <div className="battlefield-table">
            <div className="battlefield-table-row head">
              <span>部位</span>
              <span>倍率</span>
              <span>伤害</span>
              <span>概率</span>
            </div>
            {result.partRows.map((part) => (
              <div key={part.key} className="battlefield-table-row">
                <span>{part.label}</span>
                <span>{part.multiplier.toFixed(3).replace(/0+$/, '').replace(/\.$/, '')}</span>
                <span>{part.damage.toFixed(1)}</span>
                <span>{(part.probability * 100).toFixed(1)}%</span>
              </div>
            ))}
          </div>

          {selectedWeapon && (
            <div className="battlefield-range-list">
              {formatBattlefieldRangeBands(selectedWeapon).map((band) => (
                <div key={band.rangeLabel}>
                  <span>{band.rangeLabel}</span>
                  <strong>{Math.round(band.decay * 100)}%</strong>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
