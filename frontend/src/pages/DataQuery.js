import { useState ,useEffect} from 'react';
import { ArmorSelector, HelmetSelector } from '../components/public/ArmorSittings';
import { UniversalSlider } from '../components/public/UniversalSlider';
import { fetchCombinations , fetchTtkCurve } from '../api/ttkAPI'; 
import { TtkChart } from '../components/data_query/TtkChart'; 
import { ComboSelector } from '../components/data_query/ComboSelector';
import { processChartData } from '../utils/dataProcessor';


import './DataQuery.css'

export function DataQuery(){

    const [selectedHelmet, setSelectedHelmet] = useState(null);
    const [selectedArmor, setSelectedArmor] = useState(null);
    const [helmetDurability, setHelmetDurability] = useState(null);
    const [armorDurability, setArmorDurability] = useState(null);// 用户选择的装备

    const [combinations, setCombinations] = useState([]);// 服务器返回的可用组合列表
    const [loading,setLoading] = useState(false);// 查询按钮的加载状态
    const [selectedCombos, setSelectedCombos] = useState([]);//用户在列表中勾选了哪些组合。
    const [rawChartData, setRawChartData] = useState([]);//从服务器获取的、未经处理的原始TTK曲线数据
    const [displayedChartData, setDisplayedChartData] = useState([]);//加工后显示在图表上的数据
    const [applyVelocityEffect, setApplyVelocityEffect] = useState(false);//是否应用枪口初速影响
    const [applyTriggerDelay,setApplyTriggerDelay] = useState(false)//是否应用扳机延迟影响
    
    useEffect(() => {
        console.log("数据或开关变化，开始处理数据");
        const processedData = processChartData(rawChartData, applyVelocityEffect, applyTriggerDelay);
        setDisplayedChartData(processedData);
    }, [rawChartData, applyVelocityEffect, applyTriggerDelay]);

    const handleQuery = async () => {
        console.log("点击了查询按钮");
        console.log("当前头盔选择：", selectedHelmet);
        console.log("当前护甲选择：", selectedArmor);
        console.log("头盔耐久：", helmetDurability);
        console.log("护甲耐久：", armorDurability);
        if (!selectedHelmet || !selectedArmor || helmetDurability == null || armorDurability == null) {
            alert("请完整选择装备与耐久！");
            return;
        }

        setLoading(true);
        setCombinations([]);
        setSelectedCombos([]);
        setRawChartData([]);
        console.log("开始 fetch 请求...");
        try {
            const data = await fetchCombinations({
            helmetLevel: selectedHelmet.level,
            armorLevel: selectedArmor.level,
            helmetDurability,
            armorDurability,
            chestProtection: selectedArmor.chest,
            stomachProtection: selectedArmor.abdomen,
            armProtection: selectedArmor.upperArm
            });

            setCombinations(data);
        } catch (error) {
            console.error('查询组合失败:', error);
            alert('查询失败，请稍后再试。');
        } finally {
            setLoading(false);
        }
    };

    //处理用户勾选/取消勾选组合的逻辑
    const handleComboSelectionChange = (combo,isSelected)=> {
        const comboKey = `${combo.gun_name}-${combo.bullet_name}`;
        if(isSelected){
            setSelectedCombos(prev=>[...prev,combo]);
        } else {
            setSelectedCombos(prev =>
                prev.filter(c=>`${c.gun_name}-${c.bullet_name}`!==comboKey)
            );
        }
    };

    //点击“生成图表”按钮的逻辑
    const handleGenerateChart = async () => {
        if (selectedCombos.length === 0) {
            alert("请至少选择一个枪弹组合！");
            return;
        }
        console.log("开始为已选组合获取TTK数据:", selectedCombos);
        setLoading(true);
        setRawChartData([]); // 先清空旧数据

        try {
            // 创建一个请求数组
            const promises = selectedCombos.map(combo => {
                // 为每个请求创建一个独立的、能自我描述的对象
                return fetchTtkCurve({
                    weaponName: combo.gun_name,
                    ammoName: combo.bullet_name,
                    helmetLevel: selectedHelmet.level,
                    armorLevel: selectedArmor.level,
                    helmetDurability,
                    armorDurability,
                    chestProtection: selectedArmor.chest,
                    stomachProtection: selectedArmor.abdomen,
                    armProtection: selectedArmor.upperArm
                }).then(curveData => {
                    // 【关键】在 then 里面，我们确保返回一个结构正确的对象
                    // 即使 curveData 是空的，这个结构也是完整的
                    return {
                        name: `${combo.gun_name} - ${combo.bullet_name}`,
                        data: curveData || [] // 使用 || [] 来防止 data 为 undefined 或 null
                    };
                });
            });

            // 等待所有请求完成
            const results = await Promise.all(promises);


            console.log("从API获取并处理后的原始数据:", results);

            // 确保我们设置的是一个结构良好的数组
            setRawChartData(results);

        } catch (error) {
            console.error('获取或处理TTK曲线数据时出错:', error);
            alert('获取图表数据时出错，请检查网络或联系管理员。');
            setRawChartData([]); // 出错时也确保清空数据
        } finally {
            setLoading(false);
        }
    };


    return(
        <div className='data-query'>
            <div className='sittings'>
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
                    <button onClick={handleQuery} disabled={loading}>
                        {loading ? "查询中..." : "查询组合"}
                    </button>
                    <div>
                        {combinations.length > 0 && ( // 只有在有组合时才显示列表和后续按钮
                            <>
                                <ComboSelector
                                    combinations={combinations}
                                    selectedCombos={selectedCombos}
                                    onSelectionChange={handleComboSelectionChange} 
                                />
                                
                                <button onClick={handleGenerateChart} disabled={loading}>
                                    {loading ? "生成中..." : "2. 生成图表"}
                                </button>
                                
                                <div className="effect-toggle">
                                    <input 
                                        type="checkbox"
                                        id="velocity-effect"
                                        checked={applyVelocityEffect}
                                        onChange={(e) => setApplyVelocityEffect(e.target.checked)}
                                    />
                                    <label htmlFor="velocity-effect">枪口初速影响</label>
                                </div>

                                <div className="effect-toggle">
                                    <input 
                                        type="checkbox"
                                        id="trigger-delay-effect"
                                        checked={applyTriggerDelay}
                                        onChange={(e) => setApplyTriggerDelay(e.target.checked)}
                                    />
                                    <label htmlFor="trigger-delay-effect">扳机延迟影响</label>
                                </div>
                            </>
                        )}
                        {combinations.length === 0 && !loading && <p>请先查询可用组合</p>}
                    </div>
                </div>
                
            </div>
            <div className='results'>
                <TtkChart data={displayedChartData} />
            </div>
        </div>
    );

}