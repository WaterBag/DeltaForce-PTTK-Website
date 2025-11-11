import './GenericSelector.css'; // 样式文件
import React, { useState, useRef, useEffect } from 'react';

/**
 * 通用选择器组件 - 可复用的下拉选择器组件
 * 支持搜索、自定义渲染、图片显示等功能
 * 用于武器、弹药、护甲等各类选择场景
 *
 * @param {Object} props - 组件属性
 * @param {Array} props.options - 可选选项数组
 * @param {Object|null} props.selectedOption - 当前选中的选项对象
 * @param {Function} props.onSelect - 选择变化时的回调函数
 * @param {string} props.placeholder - 未选择时的占位文本，默认为"请选择"
 * @param {string} props.emptyOptionsMessage - 无可用选项的占位文本，默认为"无可用选项"
 * @param {Function} props.renderOption - 自定义选项渲染函数
 * @param {Function} props.renderSelected - 自定义选中项渲染函数
 * @param {boolean} props.searchable - 是否启用搜索功能，默认为true
 * @param {string} props.className - 自定义CSS类名
 * @returns {JSX.Element} 通用选择器组件
 */
export const GenericSelector = ({
  options,
  selectedOption,
  onSelect,
  placeholder = '请选择',
  emptyOptionsMessage = '无可用选项',
  renderOption,
  renderSelected,
  searchable = true,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false); // 下拉框是否展开状态
  const [searchTerm, setSearchTerm] = useState(''); // 搜索关键词
  const dropdownRef = useRef(null); // 引用DOM元素

  // 点击外部区域关闭下拉框的副作用
  useEffect(() => {
    const handleClickOutside = event => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  //判断是否有选项 无则禁用
  const isDisabled = !options || options.length === 0;

  const handleTriggerClick = () => {
    // 只有在不被禁用的情况下，才允许打开/关闭菜单
    if (!isDisabled) {
      setIsOpen(!isOpen);
    }
  };

  // 根据搜索关键词过滤选项
  const filteredOptions = (options || []).filter(option =>
    option?.name?.toLowerCase().includes(searchTerm.toLocaleLowerCase())
  );

  /**
   * 处理选项选择事件
   * @param {Object} option - 被选中的选项对象
   */
  const handleSelect = option => {
    onSelect(option);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div className={`generic-selector-container ${className}`} ref={dropdownRef}>
      {/* 触发按钮 - 显示当前选中项或占位符 */}
      <div className="selector-trigger" onClick={handleTriggerClick}>
        {selectedOption ? (
          renderSelected ? (
            renderSelected(selectedOption)
          ) : (
            <>
              {selectedOption.image && (
                <img
                  src={selectedOption.image}
                  alt={selectedOption.name}
                  className="option-image"
                />
              )}
              <span className="option-name">{selectedOption.name}</span>
            </>
          )
        ) : isDisabled ? (
          // 如果【没有】已选项，并且组件被【禁用】，就显示 emptyOptionsMessage
          <span className="placeholder disabled-message">{emptyOptionsMessage}</span>
        ) : (
          <span className="placeholder">{placeholder}</span>
        )}
      </div>

      {/* 下拉菜单 - 仅在展开时显示 */}
      {!isDisabled && isOpen && (
        <div className="dropdown-menu">
          {/* 搜索框 - 仅在启用搜索时显示 */}
          {searchable && (
            <div className="search-container">
              <input
                type="text"
                placeholder="搜索..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="search-input"
                autoFocus
              />
            </div>
          )}

          {/* 选项列表 */}
          <div className="options-list">
            {filteredOptions.length > 0 ? (
              filteredOptions.map(option => (
                <div
                  key={option.id}
                  className={`option-item ${selectedOption?.id === option.id ? 'selected' : ''}`}
                  onClick={() => handleSelect(option)}
                >
                  {renderOption ? (
                    renderOption(option)
                  ) : (
                    <>
                      {option.image && (
                        <img src={option.image} alt={option.name} className="option-image" />
                      )}
                      <div className="option-info">
                        <span className="option-name">{option.name}</span>
                        {option.description && (
                          <span className="option-description">{option.description}</span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))
            ) : (
              <div className="no-results">未找到匹配项</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
