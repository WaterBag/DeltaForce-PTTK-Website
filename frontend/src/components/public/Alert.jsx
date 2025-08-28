import React from 'react';
import './Alert.css';

/**
 * 自定义Alert组件 - 用于替换原生alert，提供更美观的提示样式
 * @param {Object} props - 组件属性
 * @param {boolean} props.isOpen - 是否显示alert
 * @param {string} props.message - 提示消息内容
 * @param {string} props.type - alert类型：'info', 'warning', 'error', 'success'
 * @param {Function} props.onClose - 关闭alert的回调函数
 * @param {number} props.autoClose - 自动关闭时间（毫秒），0表示不自动关闭
 * @returns {JSX.Element} Alert组件
 */
export function Alert({ isOpen, message, type = 'info', onClose, autoClose = 3000 }) {
  // 自动关闭逻辑
  autoClose = 300000
  React.useEffect(() => {
    if (isOpen && autoClose > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, autoClose);
      
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoClose, onClose]);

  if (!isOpen) return null;

  // 根据类型设置样式类
  const alertClass = `alert alert-${type}`;

  return (
    <div className="alert-overlay">
      <div className={alertClass}>
        <div className="alert-content">
          <div className="alert-icon">
            {getIcon(type)}
          </div>
          <div className="alert-message">
            {message}
          </div>
          <button className="alert-close" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// 根据类型获取对应的图标
function getIcon(type) {
  switch (type) {
    case 'success':
      return (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M16.6667 5L7.50004 14.1667L3.33337 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    case 'warning':
      return (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M10 6.66667V10M10 13.3333H10.0083M18.3333 10C18.3333 14.6024 14.6024 18.3333 10 18.3333C5.39765 18.3333 1.66671 14.6024 1.66671 10C1.66671 5.39763 5.39765 1.66667 10 1.66667C14.6024 1.66667 18.3333 5.39763 18.3333 10Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      );
    case 'error':
      return (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M10 6.66667V10M10 13.3333H10.0083M18.3333 10C18.3333 14.6024 14.6024 18.3333 10 18.3333C5.39765 18.3333 1.66671 14.6024 1.66671 10C1.66671 5.39763 5.39765 1.66667 10 1.66667C14.6024 1.66667 18.3333 5.39763 18.3333 10Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      );
    case 'info':
    default:
      return (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M10 6.66667V10M10 13.3333H10.0083M18.3333 10C18.3333 14.6024 14.6024 18.3333 10 18.3333C5.39765 18.3333 1.66671 14.6024 1.66671 10C1.66671 5.39763 5.39765 1.66667 10 1.66667C14.6024 1.66667 18.3333 5.39763 18.3333 10Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      );
  }
}
