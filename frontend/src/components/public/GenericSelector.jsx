import './GenericSelector.css'; // 样式文件
import { weapons } from '../../assets/data/weapons';
import { ammos } from '../../assets/data/ammos';
import React, { useState, useRef, useEffect } from 'react';

export const GenericSelector = ({
    options,                //可选选项
    selectedOption,          //已选选项
    onSelect,               //选择变化时的回调函数
    placeholder = "请选择", //未选择时的占位文本
    renderOption,           //自定义选项渲染函数
    renderSelected,          //自定义选中渲染函数
    searchable = true,      //是否启用搜索功能
    className = ""          //自定义类名
}) => {
    const [isOpen, setIsOpen] = useState(false);        //下拉框是否展开状态
    const [searchTerm, setSearchTerm] = useState('');   //搜索关键词
    const dropdownRef = useRef(null);                   //引用DOM

    //点击外部区域关闭下拉框
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown',handleClickOutside);

        return() => document.removeEventListener('mousedown',handleClickOutside);
    },[])

    const filteredOptions = options.filter(option =>
        option.name.toLowerCase().includes(searchTerm.toLocaleLowerCase())
    )

    const handleSelect = (option) => {
        onSelect(option);
        setIsOpen(false);
        setSearchTerm('');
    };

    return (
    <div 
      className={`generic-selector-container ${className}`} 
      ref={dropdownRef}
    >
      {/* 触发按钮 */}
      <div 
        className="selector-trigger"
        onClick={() => setIsOpen(!isOpen)}
      >
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
        ) : (
          <span className="placeholder">{placeholder}</span>
        )}
      </div>
      
      {/* 下拉菜单 */}
      {isOpen && (
        <div className="dropdown-menu">
          {/* 搜索框 */}
          {searchable && (
            <div className="search-container">
              <input
                type="text"
                placeholder="搜索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
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
                  className={`option-item ${
                    selectedOption?.id === option.id ? 'selected' : ''
                  }`}
                  onClick={() => handleSelect(option)}
                >
                  {renderOption ? (
                    renderOption(option)
                  ) : (
                    <>
                      {option.image && (
                        <img 
                          src={option.image} 
                          alt={option.name} 
                          className="option-image"
                        />
                      )}
                      <div className="option-info">
                        <span className="option-name">{option.name}</span>
                        {option.description && (
                          <span className="option-description">
                            {option.description}
                          </span>
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


