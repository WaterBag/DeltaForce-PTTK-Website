import React, { useState, useMemo } from 'react';
import './DataLibrary.css';
import { weapons } from '../assets/data/weapons';
import { ammos } from '../assets/data/ammos';
import { WeaponList } from '../components/data_library/WeaponList';
import { AmmoList } from '../components/data_library/AmmoList';

/**
 * 数据图鉴页面组件 - 显示所有静态游戏数据
 * 提供武器和弹药的详细属性查看功能
 * @returns {JSX.Element} 数据图鉴页面组件
 */
export function DataLibrary() {
  // 当前激活的Tab：'weapons' 或 'ammos'
  const [activeTab, setActiveTab] = useState('weapons');
  
  // 武器列表状态
  const [weaponSearchText, setWeaponSearchText] = useState('');
  const [weaponCaliberFilter, setWeaponCaliberFilter] = useState('all');
  const [weaponSortBy, setWeaponSortBy] = useState('name'); // name, armorDPS, fleshDPS, fireRate, etc.
  
  // 弹药列表状态
  const [ammoSearchText, setAmmoSearchText] = useState('');
  const [ammoCaliberFilter, setAmmoCaliberFilter] = useState('all');
  const [ammoSortBy, setAmmoSortBy] = useState('name');

  /**
   * 获取所有可用口径列表
   */
  const availableCalibers = useMemo(() => {
    const calibers = new Set();
    weapons.forEach(w => calibers.add(w.caliber));
    return ['all', ...Array.from(calibers).sort()];
  }, []);

  /**
   * 计算武器的DPS值
   * 显示weapons数组中的所有武器（包括基础武器和变体武器）
   * 排除霰弹枪
   */
  const weaponsWithDPS = useMemo(() => {
    // 霰弹枪列表
    const shotguns = ['725双管', 'M870', 'S12K', 'M1014'];
    
    return weapons
      .filter(w => !shotguns.includes(w.name)) // 排除霰弹枪
      .map(weapon => ({
        ...weapon,
        armorDPS: weapon.armorDamage * (weapon.fireRate / 60),
        fleshDPS: weapon.damage * (weapon.fireRate / 60),
      }));
  }, []);

  /**
   * 过滤和排序武器列表
   */
  const filteredWeapons = useMemo(() => {
    let filtered = weaponsWithDPS;

    // 搜索过滤
    if (weaponSearchText) {
      filtered = filtered.filter(w =>
        w.name.toLowerCase().includes(weaponSearchText.toLowerCase())
      );
    }

    // 口径过滤
    if (weaponCaliberFilter !== 'all') {
      filtered = filtered.filter(w => w.caliber === weaponCaliberFilter);
    }

    // 排序
    filtered = [...filtered].sort((a, b) => {
      switch (weaponSortBy) {
        case 'name':
          return a.name.localeCompare(b.name, 'zh-CN');
        case 'armorDamage':
          return b.armorDamage - a.armorDamage;
        case 'damage':
          return b.damage - a.damage;
        case 'fireRate':
          return b.fireRate - a.fireRate;
        case 'muzzleVelocity':
          return b.muzzleVelocity - a.muzzleVelocity;
        case 'armorDPS':
          return b.armorDPS - a.armorDPS;
        case 'fleshDPS':
          return b.fleshDPS - a.fleshDPS;
        default:
          return 0;
      }
    });

    return filtered;
  }, [weaponsWithDPS, weaponSearchText, weaponCaliberFilter, weaponSortBy]);

  /**
   * 过滤和排序弹药列表
   */
  const filteredAmmos = useMemo(() => {
    let filtered = ammos;

    // 搜索过滤
    if (ammoSearchText) {
      filtered = filtered.filter(a =>
        a.name.toLowerCase().includes(ammoSearchText.toLowerCase())
      );
    }

    // 口径过滤
    if (ammoCaliberFilter !== 'all') {
      filtered = filtered.filter(a => a.caliber === ammoCaliberFilter);
    }

    // 排序
    filtered = [...filtered].sort((a, b) => {
      switch (ammoSortBy) {
        case 'name':
          return a.name.localeCompare(b.name, 'zh-CN');
        case 'penetration':
          return b.penetration - a.penetration;
        case 'fleshDamageCoeff':
          return b.fleshDamageCoeff - a.fleshDamageCoeff;
        default:
          return 0;
      }
    });

    return filtered;
  }, [ammoSearchText, ammoCaliberFilter, ammoSortBy]);

  /**
   * 处理口径点击 - 跳转到弹药Tab并筛选
   */
  const handleCaliberClick = (caliber) => {
    setActiveTab('ammos');
    setAmmoCaliberFilter(caliber);
  };

  return (
    <div className="data-library-container">
      {/* Tab切换栏 */}
      <div className="data-library-tabs">
        <button
          className={`tab-button ${activeTab === 'weapons' ? 'active' : ''}`}
          onClick={() => setActiveTab('weapons')}
        >
          武器
        </button>
        <button
          className={`tab-button ${activeTab === 'ammos' ? 'active' : ''}`}
          onClick={() => setActiveTab('ammos')}
        >
          弹药
        </button>
      </div>

      {/* 武器Tab内容 */}
      {activeTab === 'weapons' && (
        <div className="tab-content">
          {/* 筛选和排序工具栏 */}
          <div className="filter-toolbar">
            <div className="filter-group">
              <label>搜索：</label>
              <input
                type="text"
                placeholder="输入武器名称..."
                value={weaponSearchText}
                onChange={(e) => setWeaponSearchText(e.target.value)}
                className="search-input"
              />
            </div>
            <div className="filter-group">
              <label>口径：</label>
              <select
                value={weaponCaliberFilter}
                onChange={(e) => setWeaponCaliberFilter(e.target.value)}
                className="filter-select"
              >
                {availableCalibers.map(cal => (
                  <option key={cal} value={cal}>
                    {cal === 'all' ? '全部' : cal}
                  </option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <label>排序：</label>
              <select
                value={weaponSortBy}
                onChange={(e) => setWeaponSortBy(e.target.value)}
                className="filter-select"
              >
                <option value="name">名称</option>
                <option value="armorDamage">甲伤</option>
                <option value="damage">肉伤</option>
                <option value="fireRate">射速</option>
                <option value="muzzleVelocity">枪口初速</option>
                <option value="armorDPS">每秒甲伤</option>
                <option value="fleshDPS">每秒肉伤</option>
              </select>
            </div>
            <div className="result-count">
              共 {filteredWeapons.length} 把武器 | 点击卡片可展开配件配置
            </div>
          </div>

          {/* 武器列表 */}
          <WeaponList 
            weapons={filteredWeapons} 
            onCaliberClick={handleCaliberClick}
          />
        </div>
      )}

      {/* 弹药Tab内容 */}
      {activeTab === 'ammos' && (
        <div className="tab-content">
          {/* 筛选和排序工具栏 */}
          <div className="filter-toolbar">
            <div className="filter-group">
              <label>搜索：</label>
              <input
                type="text"
                placeholder="输入弹药名称..."
                value={ammoSearchText}
                onChange={(e) => setAmmoSearchText(e.target.value)}
                className="search-input"
              />
            </div>
            <div className="filter-group">
              <label>口径：</label>
              <select
                value={ammoCaliberFilter}
                onChange={(e) => setAmmoCaliberFilter(e.target.value)}
                className="filter-select"
              >
                {availableCalibers.map(cal => (
                  <option key={cal} value={cal}>
                    {cal === 'all' ? '全部' : cal}
                  </option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <label>排序：</label>
              <select
                value={ammoSortBy}
                onChange={(e) => setAmmoSortBy(e.target.value)}
                className="filter-select"
              >
                <option value="name">名称</option>
                <option value="penetration">穿透等级</option>
                <option value="fleshDamageCoeff">肉伤系数</option>
              </select>
            </div>
            <div className="result-count">
              共 {filteredAmmos.length} 种弹药
            </div>
          </div>

          {/* 弹药列表 */}
          <AmmoList ammos={filteredAmmos} />
        </div>
      )}
    </div>
  );
}
