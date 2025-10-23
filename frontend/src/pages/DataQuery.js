// React核心库
import { useState ,useEffect,useMemo} from 'react';

// 组件导入
import { ArmorSelector, HelmetSelector } from '../components/public/ArmorSittings';
import { UniversalSlider } from '../components/public/UniversalSlider';
import { TtkChart } from '../components/data_query/TtkChart'; 
import { GunSelector } from '../components/data_query/GunSelector';
import { ModificationModal } from '../components/public/ModificationModal';
import { ComparisonList } from '../components/data_query/ComparisonList.jsx';
import { Alert } from '../components/public/Alert';
import { useAlert } from '../hooks/useAlert';

// API函数
import { fetchAvailableGuns, fetchGunDetails } from '../api/ttkAPI';

// 工具函数
import { processChartData } from '../utils/dataProcessor';
import { generateDurabilityValues } from '../utils/numberUtils.js';

// 配置和规则
import { selectionRules } from '../config/selectionRules.js';

// 静态数据
import { modifications } from '../assets/data/modifications.js';
import armors from '../assets/data/armors';
import helmets from '../assets/data/helmets';
import { weapons } from '../assets/data/weapons.js';

// 样式文件



import './DataQuery.css'

/**
 * 数据查询页面组件 - 用于武器TTK（Time to Kill）数据查询和对比
 * 提供护甲配置、武器选择、配件改装和图表显示功能
 * @returns {JSX.Element} 数据查询页面组件
 */
export function DataQuery(){

    // Alert hook
    const { alertState, showError, closeAlert } = useAlert();

    // 护甲配置相关状态
    /** @type {[Object|null, Function]} 当前选中的头盔对象 */
    const [selectedHelmet, setSelectedHelmet] = useState(null);
    /** @type {[Object|null, Function]} 当前选中的护甲对象 */
    const [selectedArmor, setSelectedArmor] = useState(null);
    /** @type {[number|null, Function]} 当前头盔耐久度值 */
    const [helmetDurability, setHelmetDurability] = useState(null);
    /** @type {[number|null, Function]} 当前护甲耐久度值 */
    const [armorDurability, setArmorDurability] = useState(null);

    // 数据加载和查询状态
    /** @type {[boolean, Function]} 数据加载状态 */
    const [loading,setLoading] = useState(false);
    /** @type {[string[], Function]} 可用枪械名称列表 */
    const [availableGuns, setAvailableGuns] = useState([]);
    /** @type {[Object|null, Function]} 当前选中枪械的详细信息映射 */
    const [currentGunDetails, setCurrentGunDetails] = useState(null);

    // 模态框和编辑状态
    /** @type {[boolean, Function]} 配件选择模态框显示状态 */
    const [isModelOpen, setIsModelOpen] = useState(false);
    /** @type {[string|null, Function]} 当前正在编辑的枪械名称 */
    const [currentEditingGun, setCurrentEditingGun] = useState(null);

    // 图表数据状态
    /** @type {[Array, Function]} 对比线配置数组 */
    const [comparisonLines, setComparisonLines] = useState([]);
    /** @type {[Array, Function]} 处理后显示在图表上的数据 */
    const [displayedChartData, setDisplayedChartData] = useState([]);

    // 图表效果开关状态
    /** @type {[boolean, Function]} 是否应用枪口初速影响 */
    const [applyVelocityEffect, setApplyVelocityEffect] = useState(false);
    /** @type {[boolean, Function]} 是否应用扳机延迟影响 */
    const [applyTriggerDelay,setApplyTriggerDelay] = useState(false)
    

    
    /**
     * 处理图表数据变化的副作用
     * 当对比线、枪口初速影响或扳机延迟影响发生变化时，重新处理并更新图表数据
     */
    useEffect(() => {
        console.log("数据或开关变化，开始处理数据");
        const processedData = processChartData(comparisonLines, applyVelocityEffect, applyTriggerDelay);
        setDisplayedChartData(processedData);
    }, [comparisonLines, applyVelocityEffect, applyTriggerDelay]);

    /**
     * 自动查询可用枪械的副作用
     * 当护甲和头盔配置发生变化时，自动查询可用的枪械列表
     */
    useEffect(() => { //自动查询可用枪械

        const queryGuns = async () => {
            setLoading(true);
            setAvailableGuns([]); // 清空旧结果
            try {
                const data = await fetchAvailableGuns({
                    helmetLevel: selectedHelmet.level,
                    armorLevel: selectedArmor.level,
                    helmetDurability,
                    armorDurability,
                    chestProtection: selectedArmor.chest,
                    stomachProtection: selectedArmor.abdomen,
                    armProtection: selectedArmor.upperArm
                });
                const baseWeaponNames = new Set(weapons.map(w => w.name));
                const filteredGuns = data.filter(gunName => {
                  // 先检查是否在基础武器列表中
                  if (!baseWeaponNames.has(gunName)) return false;
                  
                  // 再检查对应的武器id是否为4位数
                  const weapon = weapons.find(w => w.name === gunName);
                  return weapon && weapon.id.length === 4;
                });
                setAvailableGuns(filteredGuns);
            } catch (error) {
                console.error('自动查询可用枪械失败:', error);
            } finally {
                setLoading(false);
            }
        };

        // 只有当所有必需的选项都被选择后，才执行查询
        if (selectedHelmet && selectedArmor && helmetDurability !== null && armorDurability !== null) {
            console.log("依赖项已满足，开始自动查询...");
            queryGuns();
        } else {
            // 如果有任何一个选项被重置为null，就清空武器列表
            setAvailableGuns([]);
        }

    }, [selectedHelmet, selectedArmor, helmetDurability, armorDurability]);

    /**
     * 可用的头盔列表，根据选择规则过滤
     */
    const availableHelmets = useMemo(() => {
        return helmets.filter(h => selectionRules.allowedHelmetIds.includes(h.id));
    }, []); 

    /**
     * 可用的护甲列表，根据选择规则过滤
     */
    const availableArmors = useMemo(() => {
        return armors.filter(a => selectionRules.allowedArmorIds.includes(a.id));
    }, []);

    /**
     * 头盔耐久度可选值列表，基于所选头盔的最大耐久度生成
     */
    const helmetDurabilityValues = useMemo(() => {
        if (selectedHelmet && selectedHelmet.durability > 0) {
            return generateDurabilityValues(selectedHelmet.durability, 15);
        }
        return [0];
    }, [selectedHelmet]);
    
    /**
     * 护甲耐久度可选值列表，基于所选护甲的最大耐久度生成
     */
    const armorDurabilityValues = useMemo(() => {
        if (selectedArmor && selectedArmor.durability > 0) {
            return generateDurabilityValues(selectedArmor.durability, 35);
        }
        return [0];
    }, [selectedArmor]);


    /**
     * 处理头盔选择事件
     * @param {Object} helmet - 选中的头盔对象
     */
    const handleHelmetSelect = (helmet) => {
        setSelectedHelmet(helmet);
        if (helmet && helmet.durability > 0) {
            const newValues = generateDurabilityValues(helmet.durability, 15);
            setHelmetDurability(newValues[newValues.length - 1]);
        } else {
            setHelmetDurability(0);
        }
        setAvailableGuns([]);
        setComparisonLines([]);
    };

    /**
     * 处理护甲选择事件
     * @param {Object} armor - 选中的护甲对象
     */
    const handleArmorSelect = (armor) => {
        setSelectedArmor(armor);
        if (armor && armor.durability > 0) {
            const newValues = generateDurabilityValues(armor.durability, 35);
            setArmorDurability(newValues[newValues.length - 1]);
        } else {
            setArmorDurability(0);
        }
        setAvailableGuns([]);
        setComparisonLines([]);
    };

    /**
     * 处理添加对比线事件
     * @param {Object} config - 配置对象，包含枪械名称、子弹名称和配件列表
     * @param {Array} btkDataPoints - BTK数据点数组
     */
    const handleAddComparison = (config, btkDataPoints) => {
        console.log("添加新折线配置:", config);

        const { gunName, bulletName, mods} = config;

        const modNames = mods.map(modId => {
            const mod = modifications.find(m => m.id === modId);
            return mod ? mod.name : '未知配件';
        });

        const uniqueId = `${gunName}-${bulletName}-${mods.join('_')}-${Date.now()}`;
        const displayName = `${gunName} - ${bulletName} (${mods.length > 0 ? modNames.join(', ') : '无改装'})`;


        const newLine = {
            id: uniqueId,
            displayName: displayName,
            gunName: gunName,
            bulletName: bulletName,
            mods: mods,
            btkDataPoints: btkDataPoints
        };

        setComparisonLines(prevLines => [...prevLines, newLine]);

        handleModelClose(); // 关闭模型选择器

    };

    /**
     * 处理删除对比线事件
     * @param {string} lineIdToRemove - 要删除的对比线ID
     */
    const handleRemoveComparison = (lineIdToRemove) => {// 删除指定的折线配置
        console.log("删除折线配置:", lineIdToRemove);
        setComparisonLines(prevLines => prevLines.filter(line => line.id !== lineIdToRemove));
    };

    /**
     * 处理枪械选择事件
     * @param {string} gunName - 选中的枪械名称
     */
    const handleGunSelect = async (gunName) => {
        console.log("选择了枪械:", gunName);
        setLoading(true);

        try {
            // 1. 找出这把基础武器【所有】的“伤害变更型”配件
            const damageMods = modifications.filter(mod => 
                mod.appliesTo.includes(gunName) && mod.effects.damageChange
            );

            // 2. 构建一个需要请求的所有“枪械变体”的名字列表
            const gunVariantsToFetch = [
                gunName, // a. 永远包含基础武器本身
                ...damageMods.map(mod => mod.effects.btkQueryName) // b. 包含所有变体的名字
            ];
            
            console.log("需要预加载BTK数据的枪械变体:", gunVariantsToFetch);

            // 3. 【并行】地为所有变体请求BTK数据
            const promises = gunVariantsToFetch.map(variantName => 
                fetchGunDetails({
                    gunName: variantName,
                    helmetLevel: selectedHelmet.level,
                    armorLevel: selectedArmor.level,
                    helmetDurability,
                    armorDurability,
                    chestProtection: selectedArmor.chest,
                    stomachProtection: selectedArmor.abdomen,
                    armProtection: selectedArmor.upperArm
                })
            );
            const results = await Promise.all(promises);

            // 4. 将返回的数据，整合成一个以“枪名”为键的“数据字典”
            const gunDetailsMap = {};
            gunVariantsToFetch.forEach((variantName, index) => {
                gunDetailsMap[variantName] = results[index];
            });

            console.log("已加载的所有变体BTK数据:", gunDetailsMap);

            // 5. 将【整个数据字典】存入State，并打开悬浮窗
            setCurrentGunDetails(gunDetailsMap);
            setCurrentEditingGun(gunName);
            setIsModelOpen(true);

        } catch (error) {
            console.error('获取枪械详情失败:', error);
            showError('获取枪械详情失败，请稍后再试。');
        } finally {
            setLoading(false);
        }
    };


    /**
     * 处理模型关闭事件
     * 关闭配件选择模态框并重置相关状态
     */
    const handleModelClose = () => {
        console.log("关闭模型选择器");
        setIsModelOpen(false);
        setCurrentEditingGun(null);
        setCurrentGunDetails(null);
    }

    return(
        <>
            <div className='data-query-layout'>
                {/* ▼▼▼ 左侧的“设置”面板 ▼▼▼ */}
                <div className='sittings-panel'>
                    
                    {/* 1. 护甲配置区 */}
                    <div className='config-section armor-config'>
                        <div className='armor-selector-item'>
                            <HelmetSelector
                                options = {availableHelmets}
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
                        </div>
                        <div className='armor-selector-item'>
                            <ArmorSelector
                                options = {availableArmors}
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
                    </div>

                    {/* 2. 交互区 (分为左右两栏) */}
                    <div className='config-section interactive-section'>
                        {/* 左栏：可用武器列表 */}
                        <div className='interactive-column guns-column'>
                            <h4>可用武器 {loading && ' (查询中...)'}</h4>
                            <div className='gun-selector-container'>
                                <GunSelector
                                    guns={availableGuns}
                                    onGunSelect={handleGunSelect} 
                                />
                            </div>
                        </div>
                        {/* 右栏：已添加的对比列表 */}
                        <div className='interactive-column comparison-column'>
                            <h4>对比列表</h4>
                            <div className='comparison-list-container'>
                                <ComparisonList 
                                    lines={displayedChartData}
                                    onRemoveLine={handleRemoveComparison}
                                />
                            </div>
                        </div>
                    </div>

                    {/* 3. 图表控制区 */}
                    <div className='config-section chart-controls'>
                        <h4>图表选项</h4>
                        <div className="effect-toggle">
                            <input 
                                type="checkbox"
                                id="velocity-effect"
                                checked={applyVelocityEffect}
                                onChange={(e) => setApplyVelocityEffect(e.target.checked)}
                            />
                            <label htmlFor="velocity-effect">应用枪口初速影响</label>
                        </div>

                        <div className="effect-toggle">
                            <input 
                                type="checkbox"
                                id="trigger-delay-effect"
                                checked={applyTriggerDelay}
                                onChange={(e) => setApplyTriggerDelay(e.target.checked)}
                            />
                            <label htmlFor="trigger-delay-effect">应用扳机延迟影响</label>
                        </div>
                    </div>
                </div>

                {/* ▼▼▼ 右侧的“结果”面板 (只放图表) ▼▼▼ */}
                <div className='results-panel'>
                    <TtkChart data={displayedChartData} />
                </div>
            </div>

            {/* Modal 保持在最外层，不受布局影响 */}
            <ModificationModal 
                key={currentEditingGun} 
                isOpen={isModelOpen} 
                onClose={handleModelClose} 
                gunName={currentEditingGun} 
                gunDetailsMap={currentGunDetails}
                onAddComparison={handleAddComparison}
                availableMods={
                    currentEditingGun ? modifications.filter(mod => {
                        // 条件1：配件必须适用于当前武器 (保持不变)
                        const isApplicable = mod.appliesTo.includes(currentEditingGun);
                        if (!isApplicable) return false;

                        // 条件2：配件必须有实际效果
                        if (!mod.effects) return false; // 安全检查：确保 effects 对象存在

                        // a. 获取所有效果的值，组成一个数组
                        const effectValues = Object.values(mod.effects); 
                        // 例子: [0.3, -50, true, 'M7-变体']

                        // b. 检查这个数组中，是否有【至少一个】是【数字且不为0】
                        const hasRealEffect = effectValues.some(value => 
                            typeof value === 'number' && value !== 0
                        );
                        
                        const hasDamageChange = mod.effects.damageChange === true;

                        return hasRealEffect || hasDamageChange;
                    })
                    : []
                }
            />
            
            {/* 自定义Alert组件 */}
            <Alert
                isOpen={alertState.isOpen}
                message={alertState.message}
                type={alertState.type}
                onClose={closeAlert}
                autoClose={alertState.autoClose}
            />
        </>
    );

}
