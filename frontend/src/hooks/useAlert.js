import { useState, useCallback } from 'react';

/**
 * 自定义hook，用于管理alert状态
 * @returns {Object} alert状态和控制函数
 */
export function useAlert() {
  const [alertState, setAlertState] = useState({
    isOpen: false,
    message: '',
    type: 'info',
    autoClose: 3000
  });

  /**
   * 显示alert
   * @param {string} message - 提示消息
   * @param {string} type - alert类型：'info', 'warning', 'error', 'success'
   * @param {number} autoClose - 自动关闭时间（毫秒），0表示不自动关闭
   */
  const showAlert = useCallback((message, type = 'info', autoClose = 3000) => {
    setAlertState({
      isOpen: true,
      message,
      type,
      autoClose
    });
  }, []);

  /**
   * 关闭alert
   */
  const closeAlert = useCallback(() => {
    setAlertState(prev => ({ ...prev, isOpen: false }));
  }, []);

  /**
   * 显示信息提示
   * @param {string} message - 提示消息
   * @param {number} autoClose - 自动关闭时间
   */
  const showInfo = useCallback((message, autoClose = 3000) => {
    showAlert(message, 'info', autoClose);
  }, [showAlert]);

  /**
   * 显示警告提示
   * @param {string} message - 提示消息
   * @param {number} autoClose - 自动关闭时间
   */
  const showWarning = useCallback((message, autoClose = 3000) => {
    showAlert(message, 'warning', autoClose);
  }, [showAlert]);

  /**
   * 显示错误提示
   * @param {string} message - 提示消息
   * @param {number} autoClose - 自动关闭时间
   */
  const showError = useCallback((message, autoClose = 3000) => {
    showAlert(message, 'error', autoClose);
  }, [showAlert]);

  /**
   * 显示成功提示
   * @param {string} message - 提示消息
   * @param {number} autoClose - 自动关闭时间
   */
  const showSuccess = useCallback((message, autoClose = 3000) => {
    showAlert(message, 'success', autoClose);
  }, [showAlert]);

  return {
    alertState,
    showAlert,
    closeAlert,
    showInfo,
    showWarning,
    showError,
    showSuccess
  };
}
