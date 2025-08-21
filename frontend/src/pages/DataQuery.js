import { useState ,useEffect,useMemo} from 'react';
import { ArmorSelector, HelmetSelector } from '../components/public/ArmorSittings';
import { UniversalSlider } from '../components/public/UniversalSlider';
import { fetchAvailableGuns, fetchGunDetails } from '../api/ttkAPI';
import { TtkChart } from '../components/data_query/TtkChart'; 
import { processChartData } from '../utils/dataProcessor';
import { GunSelector } from '../components/data_query/GunSelector';
import { ModificationModal } from '../components/public/ModificationModal';
import { modifications } from '../assets/data/modifications.js';
import { ComparisonList } from '../components/data_query/ComparisonList.jsx';
import { generateDurabilityValues } from '../utils/numberUtils.js';
import { selectionRules } from '../config/selectionRules.js';
import armors from '../assets/data/armors';
import helmets from '../assets/data/helmets';
import { weapons } from '../assets/data/weapons.js';



import './DataQuery.css'

export function DataQuery(){

    const [selectedHelmet, setSelectedHelmet] = useState(null);
    const [selectedArmor, setSelectedArmor] = useState(null);
    const [helmetDurability, setHelmetDurability] = useState(null);
    const [armorDurability, setArmorDurability] = useState(null);// 用户选择的装备

    const [loading,setLoading] = useState(false);// 查询按钮的加载状态
    const [availableGuns, setAvailableGuns] = useState([]);// 可用枪械列表
    const [currentGunDetails, setCurrentGunDetails] = useState(null);// 当前选中枪械的详细信息
    const [isModelOpen, setIsModelOpen] = useState(false);// 是否打开模型选择器
    const [currentEditingGun, setCurrentEditingGun] = useState(null);// 当前编辑的枪械
    const [comparisonLines, setComparisonLines] = useState([]);
    const [displayedChartData, setDisplayedChartData] = useState([]);//加工后显示在图表上的数据
    const [applyVelocityEffect, setApplyVelocityEffect] = useState(false);//是否应用枪口初速影响
    const [applyTriggerDelay,setApplyTriggerDelay] = useState(false)//是否应用扳机延迟影响
    

    
    useEffect(() => {
        console.log("数据或开关变化，开始处理数据");
        const processedData = processChartData(comparisonLines, applyVelocityEffect, applyTriggerDelay);
        setDisplayedChartData(processedData);
    }, [comparisonLines, applyVelocityEffect, applyTriggerDelay]);

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
                const filteredGuns = data.filter(gunName => baseWeaponNames.has(gunName));
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

    const availableHelmets = useMemo(() => {
        return helmets.filter(h => selectionRules.allowedHelmetIds.includes(h.id));
    }, []); 

    const availableArmors = useMemo(() => {
        return armors.filter(a => selectionRules.allowedArmorIds.includes(a.id));
    }, []);

    const helmetDurabilityValues = useMemo(() => {
        if (!selectedHelmet) return [];
        return generateDurabilityValues(selectedHelmet.durability,15);
    }, [selectedHelmet]);
    
    const armorDurabilityValues = useMemo(() => {
        if (!selectedArmor) return [];
        return generateDurabilityValues(selectedArmor.durability,35);
    }, [selectedArmor]);


    const handleHelmetSelect = (helmet) => {
        setSelectedHelmet(helmet);
        const newValues = generateDurabilityValues(helmet.durability,15);
        setHelmetDurability(newValues[newValues.length - 1]);
        setAvailableGuns([]);
        setComparisonLines([]);
    };

    const handleArmorSelect = (armor) => {
        setSelectedArmor(armor);
        const newValues = generateDurabilityValues(armor.durability,35);
        setArmorDurability(newValues[newValues.length - 1]);
        setAvailableGuns([]);
        setComparisonLines([]);
    };

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

    const handleRemoveComparison = (lineIdToRemove) => {// 删除指定的折线配置
        console.log("删除折线配置:", lineIdToRemove);
        setComparisonLines(prevLines => prevLines.filter(line => line.id !== lineIdToRemove));
    };

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
            alert('获取枪械详情失败，请稍后再试。');
        } finally {
            setLoading(false);
        }
    };


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
                        
                        // 只有两个条件都满足，才返回 true
                        return hasRealEffect;
                    })
                    : []
                }
            />
        </>
    );

}