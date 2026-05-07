import React, { useMemo, useState } from 'react';
import { useGameData } from '../../hooks/useGameData';
import {
  BATTLEFIELD_HIT_PARTS,
  BATTLEFIELD_WEAPON_TYPE_LABELS,
  calculateBattlefieldDamage,
  getBattlefieldPartRows,
} from '../../utils/battlefieldUtils';
import './BattlefieldPages.css';

const EMPTY_WEAPONS = [];

export function BattlefieldSimulator() {
  const { data } = useGameData('battlefield');
  const weapons = data.weapons || EMPTY_WEAPONS;
  const [selectedWeaponId, setSelectedWeaponId] = useState('');
  const [distance, setDistance] = useState(30);
  const [initialHp, setInitialHp] = useState(100);
  const [targetHp, setTargetHp] = useState(100);
  const [hitPart, setHitPart] = useState('chest');
  const [log, setLog] = useState([]);

  const selectedWeapon = useMemo(() => (
    weapons.find((weapon) => weapon.id === selectedWeaponId) || weapons[0] || null
  ), [weapons, selectedWeaponId]);

  const partRows = useMemo(() => getBattlefieldPartRows(selectedWeapon, distance), [selectedWeapon, distance]);
  const currentDamage = calculateBattlefieldDamage(selectedWeapon, hitPart, distance);

  const resetTarget = () => {
    setTargetHp(Number(initialHp) || 100);
    setLog([]);
  };

  const applyHit = () => {
    if (!selectedWeapon) return;
    const part = BATTLEFIELD_HIT_PARTS.find((item) => item.key === hitPart);
    const nextHp = Math.max(0, targetHp - currentDamage);
    setTargetHp(nextHp);
    setLog((current) => [
      {
        id: Date.now(),
        text: `${selectedWeapon.name} 命中${part?.label || ''}，造成 ${currentDamage.toFixed(1)} 伤害`,
      },
      ...current,
    ].slice(0, 8));
  };

  return (
    <section className="battlefield-page">
      <div className="battlefield-header compact">
        <div>
          <p className="battlefield-kicker">战场模式</p>
          <h1>伤害模拟器</h1>
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
              <input type="number" min="1" value={initialHp} onChange={(event) => setInitialHp(Number(event.target.value))} />
            </label>
            <label>
              <span>部位</span>
              <select value={hitPart} onChange={(event) => setHitPart(event.target.value)}>
                {BATTLEFIELD_HIT_PARTS.map((part) => (
                  <option key={part.key} value={part.key}>{part.label}</option>
                ))}
              </select>
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
                <span>{currentDamage.toFixed(1)} 当前伤害</span>
                <span>{selectedWeapon.fireRate} RPM</span>
              </div>
            </div>
          )}

          <div className="battlefield-actions">
            <button type="button" className="primary" onClick={applyHit}>命中一次</button>
            <button type="button" onClick={resetTarget}>重置</button>
          </div>

          <div className="battlefield-table compact-table">
            <div className="battlefield-table-row head">
              <span>部位</span>
              <span>倍率</span>
              <span>伤害</span>
            </div>
            {partRows.map((part) => (
              <div key={part.key} className={`battlefield-table-row ${hitPart === part.key ? 'selected' : ''}`}>
                <span>{part.label}</span>
                <span>{part.multiplier.toFixed(3).replace(/0+$/, '').replace(/\.$/, '')}</span>
                <span>{part.damage.toFixed(1)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="battlefield-panel result">
          <div className="battlefield-hp-block">
            <span>目标血量</span>
            <strong>{targetHp.toFixed(1)} / {Number(initialHp) || 100}</strong>
            <div>
              <i style={{ width: `${Math.max(0, Math.min(100, targetHp / (Number(initialHp) || 100) * 100))}%` }} />
            </div>
          </div>

          <div className="battlefield-log">
            {log.length === 0 ? (
              <p>等待命中</p>
            ) : log.map((item) => (
              <div key={item.id}>{item.text}</div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
