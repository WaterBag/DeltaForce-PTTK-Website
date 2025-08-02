import React, { useState } from 'react';
import { WeaponSelector, AmmoSelector } from '../components/simulator/Selectors';
import './Simulator.css';
import { ArmorSelector, HelmetSelector } from '../components/public/ArmorSittings';
import { UniversalSlider } from '../components/public/UniversalSlider';


export function Simulator() {
  const [selectedWeapon, setSelectedWeapon] = useState(null);
  const [selectedAmmo, setSelectedAmmo] = useState(null);
  const [selectedHelmet, setSelectedHelmet] = useState(null);
  const [selectedArmor, setSelectedArmor] = useState(null);
  const [selectedAttachment, setSelectedAttachment] = useState(null);
  const [helmetDurability, setHelmetDurability] = useState(null);
  const [armorDurability, setArmorDurability] = useState(null)

  const handleWeaponSelect = (weapon) => {
        setSelectedWeapon(weapon);
        setSelectedAmmo(null);
    };

  

  return (
    <div className="simulator">
      <div class="box">
        <div className='armor-sitting-panel'>
          <div className='helmet-selector-continer'>
              <HelmetSelector
                selectedHelmet={selectedHelmet}
                onSelect={setSelectedHelmet}
              />
              {selectedHelmet && <UniversalSlider
                label="头盔初始耐久"
                min={0}
                max={selectedHelmet.durability}
                value={helmetDurability}
                onChange={setHelmetDurability}
                className="helmet-durability-slider"
              />}
          </div>
          <div className='armor-selector-continer'>
              <ArmorSelector
                selectedArmor={selectedArmor}
                onSelect={setSelectedArmor}
              />
              {selectedArmor && <UniversalSlider
                label="护甲初始耐久"
                min={0}
                max={selectedArmor.durability}
                value={armorDurability}
                onChange={setArmorDurability}
                className="armor-durability-slider"
              />}
          </div>
        </div>
      </div>
      <div class="box"></div>
      <div class="box">
        <div className="selection-panel">
          {/* 武器选择器 */}
          <div className="gun-selector-continer">
            <WeaponSelector 
              selectedWeapon={selectedWeapon}
              onSelect={handleWeaponSelect}
            />
            {selectedWeapon && (
              <div className="weapon-details">
                <h3>{selectedWeapon.name}</h3>
                <p>口径: {selectedWeapon.caliber}</p>
                <p>基础伤害: {selectedWeapon.damage}</p>
                <p>射速: {selectedWeapon.fireRate} RPM</p>
              </div>
            )}
          </div>
          {/* 弹药选择器 */}
          <div className='ammo-selector-continer'>
            <AmmoSelector
              selectedWeapon={selectedWeapon}
              selectedAmmo={selectedAmmo}
              onSelect={setSelectedAmmo}
            />
          </div>
        </div>
        {/* 配置总结 */}
        <div className="summary-panel">
          <h2>当前配置</h2>
          {selectedWeapon ? (
            <>
              <p><strong>武器:</strong> {selectedWeapon.name}</p>
              {selectedAmmo && <p><strong>弹药:</strong> {selectedAmmo.name}</p>}
              {selectedAttachment && <p><strong>配件:</strong> {selectedAttachment.name}</p>}
              
              <button 
                className="reset-button"
                onClick={() => {
                  setSelectedWeapon(null);
                  setSelectedAmmo(null);
                  setSelectedAttachment(null);
                }}
              >
                重置选择
              </button>
            </>
          ) : (
            <p>请先选择武器</p>
          )}
        </div>
      </div>
    </div>
  );
}
