// React核心库
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';

// 组件导入
import { ArmorSelector, HelmetSelector } from '../components/public/ArmorSittings';
import { UniversalSlider } from '../components/public/UniversalSlider';
import { TtkChart } from '../components/data_query/TtkChart';
import { GunSelector } from '../components/data_query/GunSelector';
import { ModificationModal } from '../components/public/ModificationModal';
import { ComparisonList } from '../components/data_query/ComparisonList.jsx';
import { Alert } from '../components/public/Alert';
import { ConfirmDialog } from '../components/public/ConfirmDialog';
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

import './DataQuery.css';

/**
 * 数据查询页面组件 - 用于武器TTK（Time to Kill）数据查询和对比
 * 提供护甲配置、武器选择、配件改装和图表显示功能
 * @returns {JSX.Element} 数据查询页面组件
 */
export function DataQuery() {
  // 辅助：解析配件的 btkQueryName（可能为对象映射）
  const resolveBtkQueryName = useCallback((mod, baseGunName) => {
    const v = mod?.effects?.btkQueryName;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      return v[baseGunName];
    }
    return v;
  }, []);
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
  const [loading, setLoading] = useState(false);
  /** @type {[string[], Function]} 可用枪械名称列表 */
  const [availableGuns, setAvailableGuns] = useState([]);
  /** @type {[Object|null, Function]} 当前选中枪械的详细信息映射 */
  const [currentGunDetails, setCurrentGunDetails] = useState(null);

  // 模态框和编辑状态
  /** @type {[boolean, Function]} 配件选择模态框显示状态 */
  const [isModelOpen, setIsModelOpen] = useState(false);
  /** @type {[string|null, Function]} 当前正在编辑的枪械名称 */
  const [currentEditingGun, setCurrentEditingGun] = useState(null);
  
  // 护甲切换确认对话框状态
  /** @type {[boolean, Function]} 确认对话框显示状态 */
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  /** @type {[Object|null, Function]} 确认对话框配置 */
  const [confirmDialogConfig, setConfirmDialogConfig] = useState(null);
  /** @type {[Object|null, Function]} 切换前的护甲配置(用于取消恢复) */
  const [previousArmorConfig, setPreviousArmorConfig] = useState(null);

  // 图表数据状态
  /** @type {[Array, Function]} 对比线配置数组 */
  const [comparisonLines, setComparisonLines] = useState([]);
  /** @type {[Array, Function]} 处理后显示在图表上的数据 */
  const [displayedChartData, setDisplayedChartData] = useState([]);

  // 图表效果开关状态
  /** @type {[boolean, Function]} 是否应用枪口初速影响 */
  const [applyVelocityEffect, setApplyVelocityEffect] = useState(false);
  /** @type {[boolean, Function]} 是否应用扳机延迟影响 */
  const [applyTriggerDelay, setApplyTriggerDelay] = useState(false);

  // 使用 ref 跟踪护甲配置的前一个值 (包含ID用于检测护甲切换)
  const prevArmorConfigRef = useRef({
    helmetId: null,
    helmetDurability: null,
    armorId: null,
    armorDurability: null,
  });

  // 使用 ref 跟踪是否正在刷新数据，避免重复刷新
  const isRefreshingRef = useRef(false);
  
  // 使用 ref 标记是否正在恢复护甲配置(取消切换时)
  const isRestoringArmorRef = useRef(false);
  
  // 使用 ref 存储当前的对比线数据，用于刷新时访问
  const comparisonLinesRef = useRef([]);

  // 同步 comparisonLines 到 ref
  useEffect(() => {
    comparisonLinesRef.current = comparisonLines;
  }, [comparisonLines]);

  /**
   * 处理图表数据变化的副作用
   * 当对比线、枪口初速影响或扳机延迟影响发生变化时，重新处理并更新图表数据
   */
  useEffect(() => {
    const processedData = processChartData(comparisonLines, applyVelocityEffect, applyTriggerDelay);
    setDisplayedChartData(processedData);
  }, [comparisonLines, applyVelocityEffect, applyTriggerDelay]);

  /**
   * 重新查询已有对比列表中的武器配置（使用新的护甲耐久值）
   */
  const refreshComparisonLines = useCallback(async () => {
    if (isRefreshingRef.current) {
      return;
    }

    if (!selectedHelmet || !selectedArmor || helmetDurability === null || armorDurability === null) {
      return;
    }

    isRefreshingRef.current = true;
    setLoading(true);
    
    try {
      // 从 ref 中获取当前的对比线数据
      const currentLines = comparisonLinesRef.current.filter(line => !line.isSimulated);

      if (currentLines.length === 0) {
        isRefreshingRef.current = false;
        setLoading(false);
        return;
      }

      // 为每个对比线重新查询数据
      const refreshPromises = currentLines.map(async (line) => {
        try {
          // 检查当前配置是否使用了伤害变更配件
          const usedDamageMod = line.mods
            .map(modId => modifications.find(m => m.id === modId))
            .find(mod => mod && mod.effects && mod.effects.damageChange);

          // 确定要查询的枪械名称
          const queryGunName = usedDamageMod 
            ? resolveBtkQueryName(usedDamageMod, line.gunName)
            : line.gunName;

          // 重新查询BTK数据
          const gunDetails = await fetchGunDetails({
            gunName: queryGunName,
            helmetLevel: selectedHelmet.level,
            armorLevel: selectedArmor.level,
            helmetDurability,
            armorDurability,
            chestProtection: selectedArmor.chest,
            stomachProtection: selectedArmor.abdomen,
            armProtection: selectedArmor.upperArm,
          });

          // 检查返回的数据结构
          if (!gunDetails || !gunDetails.allDataPoints) {
            console.error('刷新失败 - API返回数据格式错误:', line.gunName, line.bulletName);
            return line;
          }

          // 直接使用 API 返回的原始数据格式
          const shouldUsePrevious = line.dataVersion === 'previous' && gunDetails?.hasPrevious;
          const chosenPoints = shouldUsePrevious
            ? gunDetails.previousAllDataPoints
            : gunDetails.allDataPoints;

          return {
            ...line,
            btkDataPoints: chosenPoints,
            dataVersion: shouldUsePrevious ? 'previous' : 'latest',
          };
        } catch (err) {
          console.error('刷新单个配置失败:', line.gunName, line.bulletName, err);
          return line;
        }
      });

      const refreshedLines = await Promise.all(refreshPromises);
      
      // 保留模拟数据,只更新后端查询的数据
      setComparisonLines(prevLines => {
        const simulatedLines = prevLines.filter(line => line.isSimulated);
        return [...refreshedLines, ...simulatedLines];
      });

    } catch (error) {
      console.error('刷新对比列表失败:', error);
      showError('刷新数据失败,请稍后再试。');
    } finally {
      isRefreshingRef.current = false;
      setLoading(false);
    }
  }, [selectedHelmet, selectedArmor, helmetDurability, armorDurability, showError]);

  /**
   * 预查询后端配置数据(不修改状态)
   * 用于护甲切换时检查哪些配置会失败
   * @returns {Promise<Object>} 返回 {successLines, failedLines, successCount, failedCount}
   */
  const preCheckComparisonLines = useCallback(async () => {
    if (!selectedHelmet || !selectedArmor || helmetDurability === null || armorDurability === null) {
      return { successLines: [], failedLines: [], successCount: 0, failedCount: 0 };
    }

    const currentLines = comparisonLinesRef.current.filter(line => !line.isSimulated);

    if (currentLines.length === 0) {
      return { successLines: [], failedLines: [], successCount: 0, failedCount: 0 };
    }

    let successCount = 0;
    let failedCount = 0;
    const successLines = [];
    const failedLines = [];

    // 为每个对比线查询数据
    const checkPromises = currentLines.map(async (line) => {
      try {
        // 检查当前配置是否使用了伤害变更配件
        const usedDamageMod = line.mods
          .map(modId => modifications.find(m => m.id === modId))
          .find(mod => mod && mod.effects && mod.effects.damageChange);

        // 确定要查询的枪械名称
        const queryGunName = usedDamageMod 
          ? resolveBtkQueryName(usedDamageMod, line.gunName)
          : line.gunName;

        // 查询BTK数据
        const gunDetails = await fetchGunDetails({
          gunName: queryGunName,
          helmetLevel: selectedHelmet.level,
          armorLevel: selectedArmor.level,
          helmetDurability,
          armorDurability,
          chestProtection: selectedArmor.chest,
          stomachProtection: selectedArmor.abdomen,
          armProtection: selectedArmor.upperArm,
        });

        const shouldUsePrevious = line.dataVersion === 'previous' && gunDetails?.hasPrevious;
        const chosenPoints = shouldUsePrevious
          ? gunDetails.previousAllDataPoints
          : gunDetails.allDataPoints;

        // 严格检查数据有效性
        if (!gunDetails || !chosenPoints || chosenPoints.length === 0) {
          failedCount++;
          failedLines.push(line);
          return null;
        }

        const hasMatchingBullet = chosenPoints.some(
          (point) => point.bullet_name === line.bulletName
        );

        if (!hasMatchingBullet) {
          failedCount++;
          failedLines.push(line);
          return null;
        }

        const validDataPoints = chosenPoints.filter((point) => {
          if (!point.btk_data) return false;
          if (typeof point.btk_data === 'string') {
            try {
              const parsed = JSON.parse(point.btk_data);
              return Array.isArray(parsed) && parsed.length > 0;
            } catch {
              return false;
            }
          }
          return Array.isArray(point.btk_data) && point.btk_data.length > 0;
        });

        if (validDataPoints.length === 0) {
          failedCount++;
          failedLines.push(line);
          return null;
        }

        successCount++;
        const updatedLine = {
          ...line,
          btkDataPoints: validDataPoints,
          dataVersion: shouldUsePrevious ? 'previous' : 'latest',
        };
        successLines.push(updatedLine);
        return updatedLine;
      } catch (err) {
        failedCount++;
        failedLines.push(line);
        return null;
      }
    });

    await Promise.all(checkPromises);

    return { successLines, failedLines, successCount, failedCount };
  }, [selectedHelmet, selectedArmor, helmetDurability, armorDurability]);

  /**
   * 重新查询已有对比列表中的武器配置(带失败移除处理)
   * 用于护甲切换场景,如果查询失败则移除该配置
   * @returns {Promise<Object>} 返回 {success: number, failed: number} 统计信息
   */
  const refreshComparisonLinesWithCheck = useCallback(async () => {
    if (isRefreshingRef.current) {
      return { success: 0, failed: 0 };
    }

    if (!selectedHelmet || !selectedArmor || helmetDurability === null || armorDurability === null) {
      return { success: 0, failed: 0 };
    }

    isRefreshingRef.current = true;
    setLoading(true);
    
    let successCount = 0;
    let failedCount = 0;

    try {
      // 从 ref 中获取当前的对比线数据
      const currentLines = comparisonLinesRef.current.filter(line => !line.isSimulated);

      if (currentLines.length === 0) {
        isRefreshingRef.current = false;
        setLoading(false);
        return { success: 0, failed: 0 };
      }

      // 为每个对比线重新查询数据
      const refreshPromises = currentLines.map(async (line) => {
        try {
          // 检查当前配置是否使用了伤害变更配件
          const usedDamageMod = line.mods
            .map(modId => modifications.find(m => m.id === modId))
            .find(mod => mod && mod.effects && mod.effects.damageChange);

          // 确定要查询的枪械名称
          const queryGunName = usedDamageMod 
            ? usedDamageMod.effects.btkQueryName 
            : line.gunName;

          // 重新查询BTK数据
          const gunDetails = await fetchGunDetails({
            gunName: queryGunName,
            helmetLevel: selectedHelmet.level,
            armorLevel: selectedArmor.level,
            helmetDurability,
            armorDurability,
            chestProtection: selectedArmor.chest,
            stomachProtection: selectedArmor.abdomen,
            armProtection: selectedArmor.upperArm,
          });

          const shouldUsePrevious = line.dataVersion === 'previous' && gunDetails?.hasPrevious;
          const chosenPoints = shouldUsePrevious
            ? gunDetails.previousAllDataPoints
            : gunDetails.allDataPoints;

          // 严格检查返回的数据结构和有效性
          if (!gunDetails || !chosenPoints || chosenPoints.length === 0) {
            console.warn('配置无数据(空响应):', line.gunName, line.bulletName);
            failedCount++;
            return null; // 返回 null 表示需要移除
          }

          // 检查返回的数据点是否包含当前使用的子弹
          const hasMatchingBullet = chosenPoints.some(
            point => point.bullet_name === line.bulletName
          );

          if (!hasMatchingBullet) {
            console.warn('配置无数据(子弹不匹配):', line.gunName, line.bulletName, '可用子弹:', chosenPoints.map(p => p.bullet_name));
            failedCount++;
            return null; // 子弹不匹配,移除该配置
          }

          // 检查数据点的有效性
          const validDataPoints = chosenPoints.filter(point => {
            // 确保 btk_data 存在且有效
            if (!point.btk_data) return false;
            
            // 如果 btk_data 是字符串,尝试解析
            if (typeof point.btk_data === 'string') {
              try {
                const parsed = JSON.parse(point.btk_data);
                return Array.isArray(parsed) && parsed.length > 0;
              } catch {
                return false;
              }
            }
            
            // 如果是数组,检查是否非空
            return Array.isArray(point.btk_data) && point.btk_data.length > 0;
          });

          if (validDataPoints.length === 0) {
            console.warn('配置无有效数据点:', line.gunName, line.bulletName);
            failedCount++;
            return null; // 无有效数据点,移除该配置
          }

          successCount++;
          // 使用验证后的有效数据点
          return {
            ...line,
            btkDataPoints: validDataPoints,
            dataVersion: shouldUsePrevious ? 'previous' : 'latest',
          };
        } catch (err) {
          console.error('查询失败:', line.gunName, line.bulletName, err);
          failedCount++;
          return null; // 查询失败,返回 null 表示需要移除
        }
      });

      const refreshedLines = await Promise.all(refreshPromises);
      
      // 过滤掉失败的配置(null值),保留模拟数据
      setComparisonLines(prevLines => {
        const simulatedLines = prevLines.filter(line => line.isSimulated);
        const validLines = refreshedLines.filter(line => line !== null);
        return [...validLines, ...simulatedLines];
      });

      return { success: successCount, failed: failedCount };

    } catch (error) {
      console.error('刷新对比列表失败:', error);
      showError('刷新数据失败,请稍后再试。');
      return { success: successCount, failed: failedCount };
    } finally {
      isRefreshingRef.current = false;
      setLoading(false);
    }
  }, [selectedHelmet, selectedArmor, helmetDurability, armorDurability, showError]);

  /**
   * 查询可用武器列表
   */
  const queryAvailableGuns = useCallback(async () => {
    if (!selectedHelmet || !selectedArmor || helmetDurability === null || armorDurability === null) {
      return;
    }

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
        armProtection: selectedArmor.upperArm,
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
      console.error('查询可用枪械失败:', error);
      showError('查询枪械列表失败,请检查网络连接或稍后再试。');
    } finally {
      setLoading(false);
    }
  }, [selectedHelmet, selectedArmor, helmetDurability, armorDurability, showError]);

  /**
   * 自动查询可用枪械的副作用
   * 当护甲和头盔配置发生变化时,自动查询可用的枪械列表
   */
  useEffect(() => {
    // 只有当所有必需的选项都被选择后,才执行查询
    if (selectedHelmet && selectedArmor && helmetDurability !== null && armorDurability !== null) {
      
      // 检查护甲配置的变化类型
      const prevConfig = prevArmorConfigRef.current;
      
      // 检测护甲/头盔本身是否切换
      const isArmorSwitched = 
        prevConfig.helmetId !== null && 
        prevConfig.armorId !== null &&
        (prevConfig.helmetId !== selectedHelmet.id || 
         prevConfig.armorId !== selectedArmor.id);
      
      // 检测仅耐久值改变(护甲和头盔本身没有改变)
      const isDurabilityOnlyChange = 
        !isArmorSwitched &&
        prevConfig.helmetId === selectedHelmet.id &&
        prevConfig.armorId === selectedArmor.id &&
        prevConfig.helmetDurability !== null && 
        prevConfig.armorDurability !== null &&
        (prevConfig.helmetDurability !== helmetDurability || 
         prevConfig.armorDurability !== armorDurability);

      // 检查是否正在恢复护甲配置(取消切换)
      if (isRestoringArmorRef.current) {
        // 恢复操作,跳过护甲切换检测
        isRestoringArmorRef.current = false; // 重置标志
        
        // 更新 ref 为恢复后的值
        prevArmorConfigRef.current = {
          helmetId: selectedHelmet.id,
          helmetDurability,
          armorId: selectedArmor.id,
          armorDurability,
        };
        
        // 不执行任何操作,保持对比列表和武器列表不变
        return;
      }

      if (isArmorSwitched) {
        // 护甲切换场景 - 先预查询后端数据,检查是否有失败
        const simulatedLines = comparisonLinesRef.current.filter(line => line.isSimulated);
        const backendLines = comparisonLinesRef.current.filter(line => !line.isSimulated);
        
        if (simulatedLines.length > 0) {
          // 有模拟数据,必须弹窗确认
          setPreviousArmorConfig({
            helmetId: prevConfig.helmetId,
            helmetDurability: prevConfig.helmetDurability,
            armorId: prevConfig.armorId,
            armorDurability: prevConfig.armorDurability,
          });
          
          setConfirmDialogConfig({
            simulatedLines,
            backendLines,
          });
          setShowConfirmDialog(true);
        } else if (backendLines.length > 0) {
          // 只有后端数据,先预查询
          (async () => {
            setLoading(true);
            const { successLines, failedLines, successCount, failedCount } = await preCheckComparisonLines();
            setLoading(false);
            
            if (failedCount > 0) {
              // 有失败的配置,弹窗让用户确认
              setPreviousArmorConfig({
                helmetId: prevConfig.helmetId,
                helmetDurability: prevConfig.helmetDurability,
                armorId: prevConfig.armorId,
                armorDurability: prevConfig.armorDurability,
              });
              
              // 保存查询结果,供确认时使用
              setConfirmDialogConfig({
                simulatedLines: [],
                backendLines,
                preQueryResult: { successLines, failedLines, successCount, failedCount },
              });
              setShowConfirmDialog(true);
            } else {
              // 全部成功,直接应用结果
              setComparisonLines(prevLines => {
                const simulated = prevLines.filter(line => line.isSimulated);
                return [...successLines, ...simulated];
              });
              queryAvailableGuns();
            }
          })();
        } else {
          // 没有对比数据,直接查询武器列表
          queryAvailableGuns();
        }
        
        // 更新 ref 为当前值
        prevArmorConfigRef.current = {
          helmetId: selectedHelmet.id,
          helmetDurability,
          armorId: selectedArmor.id,
          armorDurability,
        };
      } else if (isDurabilityOnlyChange) {
        // 耐久值改变场景 - 自动刷新
        setComparisonLines(prevLines => {
          const hasSimulatedData = prevLines.some(line => line.isSimulated === true);
          const hasBackendData = prevLines.some(line => !line.isSimulated);
          
          if (hasSimulatedData) {
            // 有模拟数据时显示警告
            showError('⚠️ 检测到自定义模拟数据,更改护甲耐久后模拟数据可能不准确,建议重新添加。');
          }
          
          if (hasBackendData) {
            // 有后端数据时,重新查询这些配置
            refreshComparisonLines();
          }
          
          return prevLines; // 保持列表不变,refreshComparisonLines 会异步更新
        });
        
        // 更新可用武器列表
        queryAvailableGuns();
        
        // 更新 ref 为当前值
        prevArmorConfigRef.current = {
          helmetId: selectedHelmet.id,
          helmetDurability,
          armorId: selectedArmor.id,
          armorDurability,
        };
      } else {
        // 首次设置,直接查询武器列表
        queryAvailableGuns();
        
        // 更新 ref 为当前值
        prevArmorConfigRef.current = {
          helmetId: selectedHelmet.id,
          helmetDurability,
          armorId: selectedArmor.id,
          armorDurability,
        };
      }
    } else {
      // 如果有任何一个选项被重置为null,就清空武器列表
      setAvailableGuns([]);
      // 重置 ref
      prevArmorConfigRef.current = {
        helmetId: null,
        helmetDurability: null,
        armorId: null,
        armorDurability: null,
      };
    }
  }, [selectedHelmet, selectedArmor, helmetDurability, armorDurability, showError, refreshComparisonLines, queryAvailableGuns, preCheckComparisonLines]);

  /**
   * 处理确认对话框 - 确认切换护甲
   */
  const handleConfirmArmorSwitch = useCallback(async () => {
    const preQueryResult = confirmDialogConfig?.preQueryResult;
    
    setShowConfirmDialog(false);
    setPreviousArmorConfig(null); // 清空保存的旧配置
    
    if (preQueryResult) {
      // 使用预查询的结果
      const { successLines, failedCount, successCount } = preQueryResult;
      
      setComparisonLines(prevLines => {
        const simulatedLines = prevLines.filter(line => line.isSimulated);
        return [...successLines, ...simulatedLines];
      });
      
      // 显示刷新结果提示
      if (failedCount > 0) {
        showError(`护甲切换完成,已移除 ${failedCount} 个无数据配置,成功刷新 ${successCount} 个配置。`);
      }
    } else {
      // 没有预查询结果(有模拟数据的情况),执行完整刷新
      const { success, failed } = await refreshComparisonLinesWithCheck();
      
      // 显示刷新结果提示
      if (failed > 0) {
        showError(`护甲切换完成,已移除 ${failed} 个无数据配置,成功刷新 ${success} 个配置。`);
      }
    }
    
    setConfirmDialogConfig(null);
    
    // 更新可用武器列表
    await queryAvailableGuns();
  }, [confirmDialogConfig, refreshComparisonLinesWithCheck, queryAvailableGuns, showError]);

  /**
   * 处理确认对话框 - 取消切换护甲
   */
  const handleCancelArmorSwitch = useCallback(() => {
    setShowConfirmDialog(false);
    setConfirmDialogConfig(null);
    
    // 恢复到之前的护甲配置
    if (previousArmorConfig) {
      const prevHelmet = helmets.find(h => h.id === previousArmorConfig.helmetId);
      const prevArmor = armors.find(a => a.id === previousArmorConfig.armorId);
      
      if (prevHelmet && prevArmor) {
        // 设置标志，跳过护甲切换检测
        isRestoringArmorRef.current = true;
        
        setSelectedHelmet(prevHelmet);
        setSelectedArmor(prevArmor);
        setHelmetDurability(previousArmorConfig.helmetDurability);
        setArmorDurability(previousArmorConfig.armorDurability);
      }
      
      // 清空保存的旧配置
      setPreviousArmorConfig(null);
    }
  }, [previousArmorConfig]);

  /**
   * 可用的头盔列表,根据选择规则过滤
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
   * 处理命中率改变事件
   * @param {string} lineId - 对比线ID
   * @param {number} newHitRate - 新的命中率 (0-1之间)
   */
  

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
    // 护甲切换的处理逻辑已移至 useEffect 中
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
    // 护甲切换的处理逻辑已移至 useEffect 中
  };

  /**
   * 处理添加对比线事件
   * @param {Object} config - 配置对象，包含枪械名称、子弹名称和配件列表
   * @param {Array} btkDataPoints - BTK数据点数组
   */
  const handleAddComparison = (config, btkDataPoints) => {
    const { gunName, bulletName, mods, hitRate = 1.0, dataVersion = 'latest' } = config;

    const modNames = mods.map(modId => {
      const mod = modifications.find(m => m.id === modId);
      return mod ? mod.name : '未知配件';
    });

    const uniqueId = `${gunName}-${bulletName}-${dataVersion}-${mods.join('_')}-${Date.now()}`;
    const versionSuffix = dataVersion === 'previous' ? ' [上版本]' : '';
    const displayName = `${gunName} - ${bulletName} (${mods.length > 0 ? modNames.join(', ') : '无改装'})${versionSuffix}`;

    const newLine = {
      id: uniqueId,
      displayName: displayName,
      gunName: gunName,
      bulletName: bulletName,
      mods: mods,
      btkDataPoints: btkDataPoints,
      hitRate: hitRate, // 添加命中率字段
      dataVersion: dataVersion, // 'latest' | 'previous'
      isSimulated: false, // 这些是后端查询数据，不是模拟数据
    };

    setComparisonLines(prevLines => [...prevLines, newLine]);

    handleModelClose(); // 关闭模型选择器
  };

  /**
   * 处理删除对比线事件
   * @param {string} lineIdToRemove - 要删除的对比线ID
   */
  const handleRemoveComparison = lineIdToRemove => {
    setComparisonLines(prevLines => prevLines.filter(line => line.id !== lineIdToRemove));
  };

  /**
   * 处理枪械选择事件
   * @param {string} gunName - 选中的枪械名称
   */
  const handleGunSelect = async gunName => {
    setLoading(true);

    try {
      // 1. 找出这把基础武器【所有】的“伤害变更型”配件
      const damageMods = modifications.filter(
        mod => mod.appliesTo.includes(gunName) && mod.effects.damageChange
      );

      // 2. 构建一个需要请求的所有“枪械变体”的名字列表
      const gunVariantsToFetch = [
        gunName, // a. 永远包含基础武器本身
        // b. 按当前基础武器解析每个 damageChange 配件的变体名
        ...damageMods
          .map(mod => resolveBtkQueryName(mod, gunName))
          .filter(Boolean),
      ];

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
          armProtection: selectedArmor.upperArm,
        })
      );
      const results = await Promise.all(promises);

      // 4. 将返回的数据，整合成一个以“枪名”为键的“数据字典”
      const gunDetailsMap = {};
      gunVariantsToFetch.forEach((variantName, index) => {
        gunDetailsMap[variantName] = results[index];
      });

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
    setIsModelOpen(false);
    setCurrentEditingGun(null);
    setCurrentGunDetails(null);
  };

  return (
    <>
      <div className="data-query-layout">
        {/* ▼▼▼ 左侧的“设置”面板 ▼▼▼ */}
        <div className="sittings-panel">
          {/* 1. 护甲配置区 */}
          <div className="config-section armor-config">
            <div className="armor-selector-item">
              <HelmetSelector
                options={availableHelmets}
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
            <div className="armor-selector-item">
              <ArmorSelector
                options={availableArmors}
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
          <div className="config-section interactive-section">
            {/* 左栏：可用武器列表 */}
            <div className="interactive-column guns-column">
              <h4>可用武器 {loading && ' (查询中...)'}</h4>
              <div className="gun-selector-container">
                <GunSelector guns={availableGuns} onGunSelect={handleGunSelect} />
              </div>
            </div>
            {/* 右栏：已添加的对比列表 */}
            <div className="interactive-column comparison-column">
              <h4>对比列表</h4>
              <div className="comparison-list-container">
                <ComparisonList 
                  lines={displayedChartData} 
                  onRemoveLine={handleRemoveComparison}
                />
              </div>
            </div>
          </div>

          {/* 3. 图表控制区 */}
          <div className="config-section chart-controls">
            <h4>图表选项</h4>
            <div className="effect-toggle">
              <input
                type="checkbox"
                id="velocity-effect"
                checked={applyVelocityEffect}
                onChange={e => setApplyVelocityEffect(e.target.checked)}
              />
              <label htmlFor="velocity-effect">应用枪口初速影响</label>
            </div>

            <div className="effect-toggle">
              <input
                type="checkbox"
                id="trigger-delay-effect"
                checked={applyTriggerDelay}
                onChange={e => setApplyTriggerDelay(e.target.checked)}
              />
              <label htmlFor="trigger-delay-effect">应用扳机延迟影响</label>
            </div>
          </div>
        </div>

        {/* ▼▼▼ 右侧的“结果”面板 (只放图表) ▼▼▼ */}
        <div className="results-panel">
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
          currentEditingGun
            ? modifications.filter(mod => {
              // 条件1：配件必须适用于当前武器 (保持不变)
              const isApplicable = mod.appliesTo.includes(currentEditingGun);
              if (!isApplicable) return false;

              // 条件2：配件必须有实际效果
              if (!mod.effects) return false; // 安全检查：确保 effects 对象存在

              // a. 获取所有效果的值，组成一个数组
              const effectValues = Object.values(mod.effects);
              // 例子: [0.3, -50, true, 'M7-变体']

              // b. 检查这个数组中，是否有【至少一个】是【数字且不为0】
              const hasRealEffect = effectValues.some(
                value => typeof value === 'number' && value !== 0
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

      {/* 护甲切换确认对话框 */}
      <ConfirmDialog
        isOpen={showConfirmDialog}
        config={confirmDialogConfig}
        onConfirm={handleConfirmArmorSwitch}
        onCancel={handleCancelArmorSwitch}
      />
    </>
  );
}
