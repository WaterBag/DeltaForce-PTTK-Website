import { React, useState, useMemo, useEffect } from 'react';
import './ModificationModal.css';
import { BtkDistributionChart } from './BtkDistributionChart';
import { AmmoSelector } from './AmmoSelector.jsx';
import { UniversalSlider } from './UniversalSlider';
import { weapons } from '../../assets/data/weapons';
import { ammos } from '../../assets/data/ammos';
import { buildModsById, computeUnlockedSlots, isModSelectable, toggleModSelection } from '../../utils/modSelectionUtils';

// weaponInfoMap: { [weaponName]: weapon }，用于快速从枪名取口径/基础属性
const weaponInfoMap = weapons.reduce((acc, weapon) => {
  acc[weapon.name] = weapon;
  return acc;
}, {});

// 生成命中率可选值：30%, 35%, 40%, ..., 95%, 100%
// HIT_RATE_VALUES: 命中率滑条可选离散值（整数百分比）
const HIT_RATE_VALUES = [];
for (let i = 30; i <= 100; i += 5) {
  HIT_RATE_VALUES.push(i);
}

export function ModificationModal({
  isOpen,
  onClose,
  gunName,
  gunDetailsMap,
  onAddComparison,
  availableMods,
}) {
  // selectedBullet: 当前弹窗选中的弹药对象
  const [selectedBullet, setSelectedBullet] = useState(null);
  // selectedMods: 当前弹窗选中的配件 id 列表
  const [selectedMods, setSelectedMods] = useState([]);
  // usePreviousData: 是否切换显示“上版本”数据（如果该变体支持）
  const [usePreviousData, setUsePreviousData] = useState(false);
  // hoveredMod: 当前鼠标悬停的配件对象（用于 tooltip 详情展示）
  const [hoveredMod, setHoveredMod] = useState(null);
  // tooltipPosition: tooltip 的屏幕坐标
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  // hitRatePercent: 命中率百分比整数（30-100），用于期望 BTK/TTK 调整
  const [hitRatePercent, setHitRatePercent] = useState(100); // 存储百分比整数 (30-100)

  // modsById: { [id]: mod }，用于快速取配件对象
  const modsById = useMemo(() => buildModsById(availableMods || []), [availableMods]);
  // unlockedSlots: 当前已选配件解锁出来的槽位集合（用于 requiresSlots 禁用状态）
  const unlockedSlots = useMemo(
    () => computeUnlockedSlots(selectedMods, modsById),
    [selectedMods, modsById]
  );

  // 从localStorage加载记忆的命中率
  useEffect(() => {
    const savedHitRate = localStorage.getItem('defaultHitRate');
    if (savedHitRate) {
      const parsedHitRate = parseFloat(savedHitRate);
      if (parsedHitRate >= 0.3 && parsedHitRate <= 1.0) {
        setHitRatePercent(Math.round(parsedHitRate * 100));
      }
    }
  }, []);

  // 保存命中率到localStorage
  const handleHitRateChange = (newHitRatePercent) => {
    setHitRatePercent(newHitRatePercent);
    localStorage.setItem('defaultHitRate', (newHitRatePercent / 100).toString());
  };

  // groupedMods: { [slotTypeName]: Mod[] }，用于按配件槽位分类渲染
  const groupedMods = useMemo(() => {
    if (!availableMods) return {}; // 如果没有配件，返回一个空对象

    // 使用 reduce 来进行分组
    return availableMods.reduce((groups, mod) => {
      // 我们只根据配件的【第一个】type来进行分组
      const type = mod.type[0] || '未分类';

      // 如果这个分组的“抽屉”还不存在，就先创建一个
      if (!groups[type]) {
        groups[type] = [];
      }

      // 把当前这个配件，放进对应的“抽屉”里
      groups[type].push(mod);

      // 返回更新后的“抽屉柜”
      return groups;
    }, {}); // 从一个空的“抽屉柜” (对象) 开始
  }, [availableMods]); // 依赖于可选配件列表的变化

  // 根据已选配件，动态决定当前应该使用哪个枪械变体的数据
  const currentVariantName = useMemo(() => {
    // damageMod: 变体配件（damageChange）决定后端查询/显示哪把“变体武器”
    const damageMod = selectedMods
      .map(id => availableMods.find(m => m.id === id))
      .find(mod => mod?.effects.damageChange);

    if (!damageMod) return gunName;
    const v = damageMod.effects.btkQueryName;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      return v[gunName];
    }
    return v;
  }, [selectedMods, availableMods, gunName]);

  // currentVariantDetails: 当前变体在 gunDetailsMap 中对应的详情（含 bullets/dataPoints/previous 版本等）
  const currentVariantDetails = gunDetailsMap ? gunDetailsMap[currentVariantName] : null; // 【数据源切换】从 gunDetails 这个“数据字典”中，取出当前变体的数据

  // 当切换到没有“次新数据”的变体时，自动回退到“最新数据”
  useEffect(() => {
    if (!currentVariantDetails?.hasPrevious && usePreviousData) {
      setUsePreviousData(false);
    }
  }, [currentVariantName]);

  // isPreviousEnabled: 当前变体是否支持“上版本数据”切换
  const isPreviousEnabled = !!currentVariantDetails?.hasPrevious;
  // activeDetails: 当前用于渲染/计算的数据源（latest 或 previous）
  const activeDetails = useMemo(() => {
    if (usePreviousData && isPreviousEnabled) {
      return {
        availableBullets: currentVariantDetails.previousAvailableBullets,
        allDataPoints: currentVariantDetails.previousAllDataPoints,
        createdAt: currentVariantDetails.previousCreatedAt,
        dataVersion: 'previous',
      };
    }

    return {
      availableBullets: currentVariantDetails?.availableBullets,
      allDataPoints: currentVariantDetails?.allDataPoints,
      createdAt: currentVariantDetails?.latestCreatedAt,
      dataVersion: 'latest',
    };
  }, [usePreviousData, isPreviousEnabled, currentVariantDetails]);

  // bulletOptions: 当前变体 + 当前数据版本下“可选弹药”列表（还会按口径过滤）
  const bulletOptions = useMemo(() => {
    // 【实时联动】后续的所有 useMemo，都依赖于这个【动态切换】的数据源

    if (!activeDetails || !activeDetails.availableBullets) {
      return [];
    }

    // availableBulletNames: 后端返回的该变体可用子弹名列表
    const availableBulletNames = activeDetails.availableBullets;

    // weaponInfo: 基础枪信息（用于取口径）
    const weaponInfo = weaponInfoMap[gunName]; //根据枪械名找到口径
    if (!weaponInfo) return [];
    // weaponCaliber: 当前枪的口径
    const weaponCaliber = weaponInfo.caliber;

    return ammos.filter(
      (
        ammo // 4. 用【口径】和【可用弹药名】，去我们的“弹药总列表”中，进行精确查找
      ) => ammo.caliber === weaponCaliber && availableBulletNames.includes(ammo.name)
    );
  }, [activeDetails, gunName]);

  // 仅在“当前已选弹药在新数据源/变体下不可用”时才清空
  useEffect(() => {
    if (!selectedBullet) return;
    const stillAvailable = bulletOptions.some(opt => opt.name === selectedBullet.name);
    if (!stillAvailable) {
      setSelectedBullet(null);
    }
  }, [bulletOptions, selectedBullet]);

  // firstRangeBtkData: 当前选中弹药在“最近距离点”的 btk 分布（用于一段射程分布图）
  const firstRangeBtkData = useMemo(() => {
    if (!activeDetails || !activeDetails.allDataPoints || !selectedBullet) {
      return null;
    }
    // 1. 先筛选出所有属于当前选中子弹的数据点
    const bulletPoints = activeDetails.allDataPoints.filter(
      p => p.bullet_name === selectedBullet.name
    );
    // 2. 如果没有该子弹的数据，返回null
    if (bulletPoints.length === 0) return null;
    // 3. 在这些点中，找到 distance 最小的那个
    return bulletPoints.reduce((minDistPoint, currentPoint) => {
      return currentPoint.distance < minDistPoint.distance ? currentPoint : minDistPoint;
    });
  }, [activeDetails, selectedBullet]);

  const handleModChange = (modId, isSelected) => {
    // 使用通用工具处理互斥槽位/解锁槽位/级联移除
    setSelectedMods(prevSelectedIds =>
      toggleModSelection({
        modId,
        isSelected,
        selectedModIds: prevSelectedIds,
        availableMods: availableMods || [],
      })
    );
  };

  if (!isOpen) return null;
  else
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <header className="modal-header">
            <h2>{gunName} 配件配置</h2>
            <button className="close-button" onClick={onClose}>
              &times;
            </button>
          </header>

          <main className="modal-body">
            <div className="mod-section">
              <h3>弹药选择</h3>
              <AmmoSelector
                options={bulletOptions}
                selectedAmmo={selectedBullet}
                onSelect={setSelectedBullet}
                placeholder={'请选择弹药'}
              />
            </div>

            <div className="mod-section">
              <h3>一段射程BTK分布</h3>
              <BtkDistributionChart
                btkData={firstRangeBtkData ? firstRangeBtkData.btk_data : null}
              />
            </div>

            <div className="mod-section">
              <h3>命中率设置</h3>
              <UniversalSlider
                label="命中率"
                values={HIT_RATE_VALUES}
                value={hitRatePercent}
                onChange={handleHitRateChange}
                isDisabled={false}
                className="hit-rate-universal-slider"
              />
            </div>

            {(() => {
              const otherOptionItems = [];

              if (isPreviousEnabled) {
                otherOptionItems.push(
                  <label
                    key="usePreviousData"
                    style={{ display: 'flex', gap: '8px', alignItems: 'center' }}
                  >
                    <input
                      type="checkbox"
                      checked={usePreviousData}
                      onChange={(e) => setUsePreviousData(e.target.checked)}
                    />
                    显示上版本数据
                  </label>
                );
              }

              if (otherOptionItems.length === 0) return null;

              return (
                <div className="mod-section">
                  <h3>其他选项</h3>
                  <div
                    style={{
                      display: 'flex',
                      gap: '12px',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                    }}
                  >
                    {otherOptionItems}
                  </div>
                </div>
              );
            })()}

            <div className="mod-section">
              {Object.keys(groupedMods).map(type => (
                <div key={type} className="mod-group">
                  <h4 className="mod-group-title">{type}</h4>

                  <div className="mod-options-grid">
                    {groupedMods[type].map(mod => (
                      // ▼▼▼ 【核心修正】▼▼▼
                      // 1. 将 <label> 改为 <div>，因为它不再与 input 关联
                      <div
                        key={mod.id}
                        // 2. 根据 selectedMods 中是否包含 mod.id，动态添加 'selected' 类
                        className={`mod-option ${selectedMods.includes(mod.id) ? 'selected' : ''} ${
                          isModSelectable(mod, unlockedSlots) ? '' : 'disabled'
                        }`}
                        // 3. 将点击事件直接绑定在 div 上
                        onClick={() => {
                          if (!isModSelectable(mod, unlockedSlots)) return;
                          // 4. 在点击时，手动切换选择状态
                          const isCurrentlySelected = selectedMods.includes(mod.id);
                          handleModChange(mod.id, !isCurrentlySelected);
                        }}
                        // 6. 添加鼠标悬停事件
                        onMouseEnter={e => {
                          setHoveredMod(mod);
                          // 获取鼠标位置
                          const rect = e.currentTarget.getBoundingClientRect();
                          setTooltipPosition({
                            x: rect.right + 10,
                            y: rect.top,
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
              ))}

              {/*如果一个配件都没有，显示提示 */}
              {(!availableMods || availableMods.length === 0) && <p>该武器暂无可选配件。</p>}
            </div>
          </main>

          <footer className="modal-footer">
            <button
              className="add-comparison-button"
              disabled={!selectedBullet}
              onClick={() => {
                onAddComparison(
                  {
                    gunName: gunName,
                    bulletName: selectedBullet.name,
                    mods: selectedMods,
                    hitRate: hitRatePercent / 100, // 转换为0-1之间的小数
                    dataVersion: activeDetails.dataVersion,
                  },
                  activeDetails.allDataPoints
                );
              }}
            >
              添加至对比 ({hitRatePercent}% 命中率)
            </button>
          </footer>

          {/* 配件效果提示 */}
          {hoveredMod && (
            <div
              className="mod-tooltip"
              style={{
                left: `${tooltipPosition.x}px`,
                top: `${tooltipPosition.y}px`,
              }}
            >
              <h4>{hoveredMod.name}</h4>
              <div className="mod-effects">
                {hoveredMod.effects.rangeModifier !== 0 && (
                  <div className="effect-item">
                    <span className="effect-label">射程:</span>
                    <span
                      className={`effect-value ${hoveredMod.effects.rangeModifier > 0 ? 'positive' : 'negative'}`}
                    >
                      {hoveredMod.effects.rangeModifier > 0 ? '+' : ''}
                      {Math.round(hoveredMod.effects.rangeModifier * 100)}%
                    </span>
                  </div>
                )}
                {hoveredMod.effects.fireRateModifier !== 0 && (
                  <div className="effect-item">
                    <span className="effect-label">射速:</span>
                    <span
                      className={`effect-value ${hoveredMod.effects.fireRateModifier > 0 ? 'positive' : 'negative'}`}
                    >
                      {hoveredMod.effects.fireRateModifier > 0 ? '+' : ''}
                      {Math.round(hoveredMod.effects.fireRateModifier * 100)}%
                    </span>
                  </div>
                )}
                {hoveredMod.effects.muzzleVelocityModifier !== 0 && (
                  <div className="effect-item">
                    <span className="effect-label">初速:</span>
                    <span
                      className={`effect-value ${hoveredMod.effects.muzzleVelocityModifier > 0 ? 'positive' : 'negative'}`}
                    >
                      {hoveredMod.effects.muzzleVelocityModifier > 0 ? '+' : ''}
                      {Math.round(hoveredMod.effects.muzzleVelocityModifier * 100)}%
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
      </div>
    );
}
