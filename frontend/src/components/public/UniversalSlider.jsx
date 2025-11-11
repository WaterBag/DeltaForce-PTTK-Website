import './UniversalSlider.css';

/**
 * 通用滑块组件 - 支持离散值选择的滑块控件
 * 将连续的滑块输入转换为预定义的离散值选择
 * 主要用于耐久度、血量等需要精确数值控制的场景
 *
 * @param {Object} props - 组件属性
 * @param {string} props.label - 滑块标签文本
 * @param {Array} props.values - 可选的离散值数组
 * @param {number} props.value - 当前选中的真实值
 * @param {Function} props.onChange - 值变化回调函数
 * @param {boolean} props.isDisabled - 是否禁用滑块
 * @param {string} props.className - 自定义CSS类名
 * @returns {JSX.Element} 通用滑块组件
 */
export const UniversalSlider = ({
  label = '',
  values, // 接收一个"合法值"的数组
  value, // value 现在是真实的值
  onChange, // onChange 现在会返回真实的值
  isDisabled = false,
  className = '',
}) => {
  // 如果没有提供合法值列表，则不渲染

  // --- 核心转换逻辑 ---
  // 1. 从【真实值】找到它在数组中的【索引】
  const currentIndex = values.indexOf(value);

  // 2. 处理滑块的 change 事件，它返回的是【索引】
  const handleChange = e => {
    const newIndex = parseInt(e.target.value, 10);
    // 3. 根据【新索引】，从数组中查出【真实值】
    const newValue = values[newIndex];
    // 4. 将【真实值】传递出去
    if (onChange) {
      onChange(newValue);
    }
  };

  const displayValue = isDisabled ? '--' : value;

  return (
    <div className={`universal-slider ${className} ${isDisabled ? 'disabled' : ''}`}>
      <div className="slider-labelandvalue">
        {label && <span className="slider-label-text">{label}: </span>}
        {/* 始终显示当前选中的真实值 */}
        {value !== undefined && <span className="slider-value-text">{value}</span>}
      </div>
      <input
        type="range"
        // 滑块的范围现在是【索引】的范围
        min={0}
        max={values.length - 1}
        step={1}
        // 滑块的当前位置，是【当前真实值】对应的【索引】
        value={currentIndex > -1 ? currentIndex : 0}
        className="slider-input"
        onChange={handleChange}
      />
    </div>
  );
};
