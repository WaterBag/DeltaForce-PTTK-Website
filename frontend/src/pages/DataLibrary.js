/* eslint-disable indent */
import React, { useState, useMemo } from 'react';
import './DataLibrary.css';
import { weapons } from '../assets/data/weapons';
import { ammos } from '../assets/data/ammos';
import { WeaponList } from '../components/data_library/WeaponList';
import { AmmoList } from '../components/data_library/AmmoList';
import { modifications } from '../assets/data/modifications';

/**
 * 数据图鉴页面组件 - 显示所有静态游戏数据
 * 提供武器和弹药的详细属性查看功能
 * @returns {JSX.Element} 数据图鉴页面组件
 */
export function DataLibrary() {
  // 当前激活的Tab：'weapons' 或 'ammos'
  const [activeTab, setActiveTab] = useState('weapons');
  
  // 武器列表状态
  // weaponSearchText: 武器名称搜索关键字（大小写不敏感）
  const [weaponSearchText, setWeaponSearchText] = useState('');
  // weaponCaliberFilter: 武器口径筛选（'all' 表示不筛选）
  const [weaponCaliberFilter, setWeaponCaliberFilter] = useState('all');
  // weaponSortBy: 武器排序字段（name/armorDPS/fleshDPS/fireRate...）
  const [weaponSortBy, setWeaponSortBy] = useState('name'); // name, armorDPS, fleshDPS, fireRate, etc.
  
  // 弹药列表状态
  // ammoSearchText: 弹药名称搜索关键字
  const [ammoSearchText, setAmmoSearchText] = useState('');
  // ammoCaliberFilter: 弹药口径筛选
  const [ammoCaliberFilter, setAmmoCaliberFilter] = useState('all');
  // ammoSortBy: 弹药排序字段
  const [ammoSortBy, setAmmoSortBy] = useState('name');

  /**
   * 获取所有可用口径列表
   */
  const availableCalibers = useMemo(() => {
    // calibers: 用 Set 去重收集所有武器口径
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
    // shotguns: 霰弹枪列表（图鉴 DPS 口径/机制不同，当前选择排除）
    const shotguns = ['725双管', 'M870', 'S12K', 'M1014'];

    // weaponByName: 用于 O(1) 通过 name 查找武器对象
    const weaponByName = new Map(weapons.map(w => [w.name, w]));

    // findBaseWeaponForVariant: 通过“指向变体武器的变体配件”反推基础武器
    // 用于 Minimal Variant 回退：变体条目只写差异字段，其余从基础武器补齐
    const findBaseWeaponForVariant = (variantWeapon) => {
      if (!variantWeapon?.isModification) return null;

      // mod: 指向该变体武器的变体配件（effects.dataQueryName 包含 variantWeapon.name）
      const mod = modifications.find(m => {
        const v = m?.effects?.dataQueryName;
        if (typeof v === 'string') return v === variantWeapon.name;
        if (v && typeof v === 'object' && !Array.isArray(v)) {
          return Object.values(v).includes(variantWeapon.name);
        }
        return false;
      });

      // baseName: 约定 appliesTo[0] 为基础武器名
      const baseName = mod?.appliesTo?.[0];
      if (!baseName) return null;
      return weaponByName.get(baseName) || null;
    };
    
    return weapons
      .filter(w => !shotguns.includes(w.name)) // 排除霰弹枪
      .map(weapon => {
        // Minimal Variant 回退：变体只写差异字段，其余字段从基础武器补齐
        // baseWeapon: 变体对应的基础武器（如果 weapon 本身不是变体则为 null）
        const baseWeapon = findBaseWeaponForVariant(weapon);
        // merged: 合并后的展示/计算对象（基础字段 + 变体覆写字段）
        const merged = baseWeapon ? { ...baseWeapon, ...weapon } : weapon;

        // 数值字段统一做 Number() 兜底，避免字符串/空值导致 NaN
        const fireRate = Number(merged.fireRate) || 0;
        const armorDamage = Number(merged.armorDamage) || 0;
        const damage = Number(merged.damage) || 0;

        return {
          ...merged,
          armorDPS: armorDamage * (fireRate / 60),
          fleshDPS: damage * (fireRate / 60),
        };
      });
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
    // sort: 返回新的数组，避免直接排序 state/memo 的引用
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
