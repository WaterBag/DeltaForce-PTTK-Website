import React, { useState , useMemo , useEffect} from 'react';
import { WeaponSelector} from '../components/simulator/Selectors';
import { AmmoSelector } from '../components/public/AmmoSelector';
import { Alert } from '../components/public/Alert';
import { useAlert } from '../hooks/useAlert';
import './Simulator.css';
import { ArmorSelector, HelmetSelector } from '../components/public/ArmorSittings';
import { UniversalSlider } from '../components/public/UniversalSlider';
import helmets from '../assets/data/helmets';
import armors from '../assets/data/armors';
import { weapons } from '../assets/data/weapons';
import { ammos } from '../assets/data/ammos';
import { modifications } from '../assets/data/modifications';
import { generateDurabilityValues } from '../utils/numberUtils';
import { DamageDecayChart } from '../components/simulator/DamageDecayChart';
import { TargetDummy } from '../components/simulator/TargetDummy';
import { calculateSingleHit } from '../utils/simulationUtils';
import { TargetStatus } from '../components/simulator/TargetStatus'; // 导入新组件

/**
 * 模拟器页面组件 - 用于武器和护甲配置的交互式模拟
 * 提供武器、弹药、护甲和头盔的选择和配置功能
 * @returns {JSX.Element} 模拟器页面组件
 */
export function Simulator() {
  // 状态管理
  /** @type {[Object|null, Function]} 当前选中的武器对象 */
  const [selectedWeapon, setSelectedWeapon] = useState(null);
  
  // Alert hook
  const { alertState, showWarning, closeAlert } = useAlert();
  /** @type {[Object|null, Function]} 当前选中的弹药对象 */
  const [selectedAmmo, setSelectedAmmo] = useState(null);
  /** @type {[Object|null, Function]} 当前选中的配件对象 */
  const [selectedMods, setSelectedMods] = useState([]);
  /** @type {[Object|null, Function]} 当前悬停的配件对象 */
  const [hoveredMod, setHoveredMod] = useState(null);
  /** @type {[Object, Function]} 工具提示位置 */
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  /** @type {[Object|null, Function]} 当前选中的头盔对象 */
  const [selectedHelmet, setSelectedHelmet] = useState(null);
  /** @type {[Object|null, Function]} 当前选中的护甲对象 */
  const [selectedArmor, setSelectedArmor] = useState(null);
  /** @type {[number|null, Function]} 初始头盔耐久度值 */
  const [helmetDurability, setHelmetDurability] = useState(null);
  /** @type {[number|null, Function]} 初始护甲耐久度值 */
  const [armorDurability, setArmorDurability] = useState(null);

  /** @type {[number|null, Function]} 当前交战距离 */
  const [distance, setDistance] = useState(10);
  /** @type {[number|null, Function]} 初始血量 */
  const [initialHp, setInitialHp] = useState(100);
  /** @type {[number|null, Function]} 假人目前血量 */
  const [targetHp, setTargetHp] = useState(100);
  /** @type {[number|null, Function]} 当前头盔耐久 */
  const [currentHelmetDurability, setCurrentHelmetDurability] = useState(null);
  /** @type {[number|null, Function]} 当前护甲耐久 */
  const [currentArmorDurability, setCurrentArmorDurability] = useState(null);
  /** @type {[Object|null, Function]} 击中日志 */
  const [hitLog, setHitLog] = useState([]);
  

  // 用于血量滑条的数值列表，生成1到100的整数数组
  const hpValues = useMemo(() => Array.from({ length: 100 }, (_, i) => i + 1), []);

  // 自动重置模拟状态的副作用逻辑
  // 当头盔选择或耐久度变化时，重置头盔耐久度和目标血量
  useEffect(() => {
    setCurrentHelmetDurability(helmetDurability);
    setTargetHp(initialHp);
    setHitLog([]);
  }, [selectedHelmet, helmetDurability]);

  // 当护甲选择或耐久度变化时，重置护甲耐久度和目标血量
  useEffect(() => {
    setCurrentArmorDurability(armorDurability);
    setTargetHp(initialHp);
    setHitLog([]);
  }, [selectedArmor, armorDurability]);

  // 当武器、弹药、配件或初始血量变化时，重置目标血量
  useEffect(() => {
    setTargetHp(initialHp);
    setHitLog([]);
  }, [selectedWeapon, selectedAmmo, selectedMods, initialHp]);

  

  /**
   * 配置武器计算 - 应用所有配件效果后的最终武器属性
   * 处理伤害模型变更和通用属性百分比修正，实现复杂的武器配置系统
   * 支持伤害模型切换和属性百分比叠加，确保配件效果正确应用
   * 
   * @returns {Object|null} 配置后的武器属性对象，包含所有配件效果
   *                       如果未选择武器则返回null
   */
  const configuredWeapon = useMemo(() => {
    if (!selectedWeapon) {
      return null;
    }

    // --- 步骤 1: 确定基础伤害模型 ---
    // 处理特殊配件（如不同口径转换套件）导致的伤害模型变更

    // a. 查找是否有名为 "damageChange" 的特殊配件被选中
    //    这类配件会完全改变武器的伤害属性（如口径转换）
    const damageMod = selectedMods
      .map(modId => modifications.find(m => m.id === modId)) // 将id数组转为配件对象数组
      .find(mod => mod?.effects?.damageChange === true);     // 找到第一个带 damageChange 的配件

    // b. 决定使用哪个武器作为"基础模板"
    //    默认使用用户选择的原始武器数据
    let baseWeaponProfile = selectedWeapon;

    //    如果找到了特殊配件（如口径转换套件）...
    if (damageMod) {
      const variantName = damageMod.effects.dataQueryName;
      // ...就从总武器列表里找到那个变体的数据
      const weaponVariant = weapons.find(w => w.name === variantName);
      if (weaponVariant) {
        // ...并将其设为我们的"基础模板"（使用变体武器的伤害属性）
        baseWeaponProfile = weaponVariant;
      } else {
        console.warn(`未找到名为 "${variantName}" 的武器变体数据!`);
      }
    }

    // c. 创建一个最终属性对象，它的伤害相关属性来自正确的"基础模板"
    //    而其他所有属性（射速、射程等）仍然来自【原始】的 selectedWeapon
    //    这种分离确保配件只影响它们应该影响的属性
    let finalWeaponStats = {
      ...selectedWeapon, // 初始继承所有原始武器的属性
      // 用"基础模板"的伤害数据覆盖（处理口径转换等特殊情况）
      damage: baseWeaponProfile.damage,
      armorDamage: baseWeaponProfile.armorDamage,
      headMultiplier: baseWeaponProfile.headMultiplier,
      abdomenMultiplier: baseWeaponProfile.abdomenMultiplier,
      upperArmMultiplier: baseWeaponProfile.upperArmMultiplier,
      lowerArmMultiplier: baseWeaponProfile.lowerArmMultiplier,
      thighMultiplier: baseWeaponProfile.thighMultiplier,
      calfMultiplier: baseWeaponProfile.calfMultiplier,
    };


    // --- 步骤 2: 应用通用属性修改 (百分比修正) ---

    // a. 初始化效果累加器
    let totalFireRateModifier = 0;
    let totalRangeModifier = 0;
    let totalMuzzleVelocityModifier = 0;

    // b. 遍历【所有】已选配件，累加它们的百分比效果
    selectedMods.forEach(modId => {
      const mod = modifications.find(m => m.id === modId);
      if (mod && mod.effects) {
        totalFireRateModifier += mod.effects.fireRateModifier || 0;
        totalRangeModifier += mod.effects.rangeModifier || 0;
        totalMuzzleVelocityModifier += mod.effects.muzzleVelocityModifier || 0;
      }
    });

    // c. 将累加后的百分比效果应用到最终属性上
    finalWeaponStats.fireRate *= (1 + totalFireRateModifier);
    finalWeaponStats.muzzleVelocity *= (1 + totalMuzzleVelocityModifier);
    finalWeaponStats.range1 *= (1 + totalRangeModifier);
    finalWeaponStats.range2 *= (1 + totalRangeModifier);
    finalWeaponStats.range3 *= (1 + totalRangeModifier);
    finalWeaponStats.range4 *= (1 + totalRangeModifier);
    finalWeaponStats.range5 *= (1 + totalRangeModifier);

    return finalWeaponStats;

  }, [selectedWeapon, selectedMods]);

  /**
   * 处理头盔选择事件
   * @param {Object} helmet - 选中的头盔对象
   */
  const handleHelmetSelect = (helmet) => {
      setSelectedHelmet(helmet);
      setHelmetDurability(helmet.durability);
  };

  /**
   * 处理护甲选择事件
   * @param {Object} armor - 选中的护甲对象
   */
  const handleArmorSelect = (armor) => {
      setSelectedArmor(armor);
      setArmorDurability(armor.durability);
  };

  /**
   * 头盔耐久度可选值列表，基于所选头盔的最大耐久度生成
   */
  const helmetDurabilityValues = useMemo(() => {
    if (!selectedHelmet || selectedHelmet.durability <= 0) {
      return []; // 如果没有选头盔，或者头盔耐久为0，直接返回空数组
    }
    return generateDurabilityValues(selectedHelmet.durability,0,1);
  }, [selectedHelmet]);
      
  /**
   * 护甲耐久度可选值列表，基于所选护甲的最大耐久度生成
   */
  const armorDurabilityValues = useMemo(() => {
    if (!selectedArmor || selectedArmor.durability <= 0) {
      return []; // 如果没有选护甲，或者护甲耐久为0，直接返回空数组
    }
    return generateDurabilityValues(selectedArmor.durability,0,1);
  }, [selectedArmor]);

  /**
   * 处理武器选择事件
   * @param {Object} weapon - 选中的武器对象
   */
  const handleWeaponSelect = (weapon) => {
    setSelectedWeapon(weapon);
    setSelectedAmmo(null); // 更换武器时重置弹药选择
    setSelectedMods([]); 
  };

  /**
   * 处理配件选择事件 - 管理配件选择和冲突检测
   * 自动处理配件槽位冲突，确保同一槽位只能选择一个配件
   * 
   * @param {string} modId - 配件ID
   * @param {boolean} isSelected - 配件是否被选中
   */
  const handleModChange = (modId, isSelected) => {
    const mod = availableMods.find(m => m.id === modId);
    if (!mod?.type) return;
    const newModSlots = mod.type;

    setSelectedMods(prev => {
      if (!isSelected) {
        return prev.filter(id => id !== modId);
      }
      const nonConflictingMods = prev.filter(oldModId => {
        const oldMod = availableMods.find(m => m.id === oldModId);
        if (!oldMod?.type) return false;
        const hasConflict = oldMod.type.some(slot => newModSlots.includes(slot));
        return !hasConflict;
      });
      return [...nonConflictingMods, modId];
    });
  };

  /**
   * 动态计算可用弹药 - 根据所选武器的口径筛选弹药
   * 确保只有与当前武器口径匹配的弹药才会显示
   * 
   * @returns {Array} 可用的弹药选项数组
   */
  const availableAmmos = useMemo(() => {
      if (!selectedWeapon) {// 如果没有选择武器，就直接返回一个空数组
          return [];
      }
      return ammos.filter(ammo => ammo.caliber === selectedWeapon.caliber);// 如果选择了武器，就进行筛选
  }, [selectedWeapon]); //依赖项数组：只有当 selectedWeapon 变化时，才重新计算

  /**
   * 动态计算可用配件 - 根据所选武器筛选适用的配件
   * 过滤掉没有实际效果的配件，只显示真正有影响的配件选项
   * 
   * @returns {Array} 可用的配件选项数组
   */
  const availableMods = useMemo(() => {
    // a. 如果【没有】选择武器，就直接返回一个空数组
    if (!selectedWeapon) {
      return [];
    }

    // b. 如果选择了武器，就用 .filter() 筛选总配件列表
    return modifications.filter(mod => {
      // 条件1：配件必须适用于当前武器 (保持不变)
      const isApplicable = mod.appliesTo.includes(selectedWeapon.name);
      if (!isApplicable) {
        return false;
      }

      // ▼▼▼ 【核心新增区】条件2：配件必须有【实际效果】▼▼▼
      if (!mod.effects) {
        return false; // 安全检查：确保 effects 对象存在
      }

      const effectValues = Object.values(mod.effects); //获取所有效果的值，组成一个数组

      const hasRealEffect = effectValues.some(value => //检查这个数组中，是否有【至少一个】是【数字且不为0】
        typeof value === 'number' && value !== 0
      );
      
      const hasDamageChange = mod.effects.damageChange === true;//检查配件是否改变伤害

      return hasRealEffect || hasDamageChange;//只有两个条件都满足，才返回 true
    });
    

  }, [selectedWeapon]); // <-- 依赖项：只有当 selectedWeapon 变化时，才重新计算

  /**
   * 将可用的配件分组
   */
  const groupedMods = useMemo(() => {
    if (!availableMods) return {};

    return availableMods.reduce((groups, mod) => {
      const type = mod.type[0] || '未分类';
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(mod);
      return groups;
    }, {});

  }, [availableMods]);

  /**
   * 监听目标血量变化 - 自动检测击杀事件
   * 当目标血量降至0或以下时，自动计算并记录击杀信息
   * 包括BTK（击杀所需命中次数）和TTK（击杀所需时间）
   */
  useEffect(() => {
    // 1. 检查是否造成了击杀 (血量小于等于0)
    // 2. 检查是否已经记录过本次击杀 (避免重复添加击杀日志)
    const isAlreadyKilled = hitLog.some(log => log.type === 'kill');

    if (targetHp <= 0 && !isAlreadyKilled) {
      // a. 计算 BTK (Bullets To Kill - 击杀所需子弹数)
      // BTK = 日志中 'hit' 类型的条目数量
      const btk = hitLog.length;

      // b. 计算 TTK (Time To Kill - 击杀所需时间)
      let ttk = 0;
      if (btk > 1 && configuredWeapon?.fireRate > 0) {
        const timeBetweenShots = (60 * 1000) / configuredWeapon.fireRate;
        ttk = (btk - 1) * timeBetweenShots;
      }

      // c. 创建击杀日志
      const killMessage = `造成击杀,BTK: ${btk} | TTK: ${Math.round(ttk)} ms(若枪械无全自动模式则TTK不准确)`;

      // d. 更新日志状态，将击杀日志添加到最前面
      setHitLog(prev => [killMessage, ...prev]);
    }

    // 依赖项数组：当 targetHp 或 configuredWeapon (影响TTK计算) 变化时，执行此 effect
  }, [targetHp, configuredWeapon]); 

  /**
   * 处理命中事件 - 核心模拟逻辑
   * 计算单次命中造成的伤害和护甲耐久度变化
   * 
   * @param {string} hitSite - 命中部位标识符
   */
  const handleHit = (hitSite) => {
    if (!configuredWeapon || !selectedAmmo || !selectedHelmet || !selectedArmor) {
      showWarning("请先选择完整的武器、弹药和护甲配置！");
      return;
    }
    if (targetHp <= 0) {
      showWarning("目标已被击倒，请重置配置或调整初始血量以开始新的模拟。");
      return;
    }
    const result = calculateSingleHit(configuredWeapon, selectedAmmo, selectedHelmet, selectedArmor, currentHelmetDurability, currentArmorDurability, hitSite, distance);
    setTargetHp(prev => prev - result.healthDamage);
    setCurrentHelmetDurability(result.newHelmetDurability);
    setCurrentArmorDurability(result.newArmorDurability);
    setHitLog(prev => [`[${distance}m] ${result.logMessage}`, ...prev].slice(0, 100));
  };

  /**
   * 重置模拟状态 - 恢复假人到初始状态
   * 重置血量、护甲耐久度和命中日志
   */
  const resetSimulation = () => {
    setTargetHp(initialHp);
    setCurrentHelmetDurability(helmetDurability);
    setCurrentArmorDurability(armorDurability);
    setHitLog([]);
  };

  return (
    <div className="simulator-layout">
      {/* 护甲配置面板 */}
      <div className="left-panel">
        <div className='config-section armor-config'>
          <HelmetSelector
            options={helmets}
            selectedHelmet={selectedHelmet}
            onSelect={handleHelmetSelect}
          />
          <UniversalSlider
            label="头盔耐久"
            values={helmetDurabilityValues}
            value={helmetDurability}
            onChange={setHelmetDurability}
            isDisabled={!selectedHelmet}
          />
          <ArmorSelector
            options={armors}
            selectedArmor={selectedArmor}
            onSelect={handleArmorSelect}
          />
          <UniversalSlider
            label="护甲耐久"
            values={armorDurabilityValues}
            value={armorDurability}
            onChange={setArmorDurability}
            isDisabled={!selectedArmor}
          />
        </div>
        <div className="simulation-controls">
          <h3>模拟参数</h3>
          <UniversalSlider label="目标初始血量" values={hpValues} value={initialHp} onChange={setInitialHp} />
          <div className="distance-control">
            <label htmlFor="distance-input">交战距离 (米):</label>
            <input type="number" id="distance-input" value={distance} onChange={(e) => setDistance(Number(e.target.value))} min="0" step="1" />
          </div>
        </div>
        <div className='target-status'>
          <TargetStatus
            targetHp={targetHp}
            totalHp={initialHp}
            helmet={selectedHelmet}
            armor={selectedArmor}
            currentHelmetDurability={currentHelmetDurability}
            currentArmorDurability={currentArmorDurability}
          />
        </div>
        <div className="hit-log-container">
          <h4>命中日志</h4>
          <ul className="hit-log-list">
            {hitLog.length > 0 ? (
              hitLog.map((log, index) => (
                <li key={index}>{log}</li>
              ))
            ) : (
              <li className="empty-log">等待日志</li>
            )}
          </ul>
        </div>
      </div>
      
      
      {/* 占位区域 */}
      <div className="simulator-panel">
        <TargetDummy onHit={handleHit} />
        <button className="reset-simulation-button" onClick={resetSimulation}>
          重置假人状态
        </button>
      </div>
      
      {/* 武器和弹药选择面板 */}
      <div className="right-panel">
        <WeaponSelector
          selectedWeapon={selectedWeapon}
          onSelect={handleWeaponSelect}
        />
        <AmmoSelector
          options={availableAmmos}
          selectedAmmo={selectedAmmo}
          onSelect={setSelectedAmmo}
          // (推荐) 我们可以让 placeholder 也变得更智能
          placeholder="请选择弹药"
          // (推荐) 传递一个自定义的“空状态”消息
          emptyOptionsMessage="请先选择武器"
        />
        <div className="mod-section">
          <h3>可选配件</h3>
          <div className="mod-list-wrapper">
            {selectedWeapon ? (
              availableMods.length > 0 ? (
                Object.keys(groupedMods).map(type => (
                  <div key={type} className="mod-group">
                    <h4 className="mod-group-title">{type}</h4>
                    <div className="mod-options-grid">
                      {groupedMods[type].map(mod => (
                        <div
                          key={mod.id}
                          //根据 selectedMods 中是否包含 mod.id，动态添加 'selected' 类
                          className={`mod-option ${selectedMods.includes(mod.id) ? 'selected' : ''}`}
                          //将点击事件直接绑定在 div 上
                          onClick={() => {
                            //在点击时，手动切换选择状态
                            const isCurrentlySelected = selectedMods.includes(mod.id);
                            handleModChange(mod.id, !isCurrentlySelected);
                          }}
                          // 添加鼠标悬停事件
                          onMouseEnter={(e) => {
                            setHoveredMod(mod);
                            // 获取鼠标位置，将工具提示显示在左边
                            const rect = e.currentTarget.getBoundingClientRect();
                            setTooltipPosition({
                              x: rect.left - 280, // 向左偏移工具提示宽度
                              y: rect.top
                            });
                          }}
                          onMouseLeave={() => setHoveredMod(null)}
                        >
                          {/* 5. 移除 <input type="checkbox"> */}
                          <span>{mod.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="placeholder-text">该武器暂无可选配件。</div>
              )
            ) : (
              <div className="placeholder-text">请先选择武器以查看可用配件</div>
            )}
          </div>
        </div>
        <div className="summary-panel">
          <div className="stats-table">
            <h4>武器最终属性:</h4>
            <table>
              <tbody>
                <tr>
                  <td>肉体伤害</td>
                  <td>{configuredWeapon ? configuredWeapon.damage.toFixed(2) : '—'}</td>
                </tr>
                <tr>
                  <td>护甲伤害</td>
                  <td>{configuredWeapon ? configuredWeapon.armorDamage.toFixed(2) : '—'}</td>
                </tr>
                <tr>
                  <td>射速 (RPM)</td>
                  <td>{configuredWeapon ? Math.round(configuredWeapon.fireRate) : '—'}</td>
                </tr>
                <tr>
                  <td>枪口初速</td>
                  <td>{configuredWeapon ? Math.round(configuredWeapon.muzzleVelocity) : '—'}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <DamageDecayChart weaponData={configuredWeapon} />
          <button
            className="reset-button"
            onClick={() => {
              setSelectedWeapon(null);
              setSelectedAmmo(null);
              setSelectedMods([]); // 确保清空配件
            }}
            // 当没有选择武器时，按钮将被禁用
            disabled={!selectedWeapon}
          >
            重置选择
          </button>
        </div>
      </div>
      
      {/* 自定义Alert组件 */}
      <Alert
        isOpen={alertState.isOpen}
        message={alertState.message}
        type={alertState.type}
        onClose={closeAlert}
        autoClose={alertState.autoClose}
      />

      {/* 配件效果提示 */}
      {hoveredMod && (
        <div 
          className="mod-tooltip"
          style={{
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y}px`
          }}
        >
          <h4>{hoveredMod.name}</h4>
          <div className="mod-effects">
            {hoveredMod.effects.rangeModifier !== 0 && (
              <div className="effect-item">
                <span className="effect-label">射程:</span>
                <span className={`effect-value ${hoveredMod.effects.rangeModifier > 0 ? 'positive' : 'negative'}`}>
                  {hoveredMod.effects.rangeModifier > 0 ? '+' : ''}{Math.round(hoveredMod.effects.rangeModifier * 100)}%
                </span>
              </div>
            )}
            {hoveredMod.effects.fireRateModifier !== 0 && (
              <div className="effect-item">
                <span className="effect-label">射速:</span>
                <span className={`effect-value ${hoveredMod.effects.fireRateModifier > 0 ? 'positive' : 'negative'}`}>
                  {hoveredMod.effects.fireRateModifier > 0 ? '+' : ''}{Math.round(hoveredMod.effects.fireRateModifier * 100)}%
                </span>
              </div>
            )}
            {hoveredMod.effects.muzzleVelocityModifier !== 0 && (
              <div className="effect-item">
                <span className="effect-label">初速:</span>
                <span className={`effect-value ${hoveredMod.effects.muzzleVelocityModifier > 0 ? 'positive' : 'negative'}`}>
                  {hoveredMod.effects.muzzleVelocityModifier > 0 ? '+' : ''}{Math.round(hoveredMod.effects.muzzleVelocityModifier * 100)}%
                </span>
              </div>
            )}
            {hoveredMod.effects.damageChange && (
              <div className="effect-item">
                <span className="effect-label">伤害:</span>
                <span className="effect-value special">改变伤害曲线</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
