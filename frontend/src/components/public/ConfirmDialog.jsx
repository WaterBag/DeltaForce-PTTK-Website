import React from 'react';
import './ConfirmDialog.css';

/**
 * 确认对话框组件
 * 用于切换护甲/头盔时的确认提示
 * 
 * @param {Object} props - 组件属性
 * @param {boolean} props.isOpen - 是否显示对话框
 * @param {Object} props.config - 对话框配置
 * @param {Array} props.config.simulatedLines - 模拟数据配置列表
 * @param {Array} props.config.backendLines - 后端数据配置列表
 * @param {Object} props.config.preQueryResult - 预查询结果 {successLines, failedLines, successCount, failedCount}
 * @param {Function} props.onConfirm - 确认回调
 * @param {Function} props.onCancel - 取消回调
 * @returns {JSX.Element|null} 确认对话框组件
 */
export function ConfirmDialog({ isOpen, config, onConfirm, onCancel }) {
  if (!isOpen || !config) return null;

  const { simulatedLines = [], backendLines = [], preQueryResult } = config;

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-container confirm-dialog" onClick={(e) => e.stopPropagation()}>
        {/* 标题 */}
        <div className="modal-header">
          <h2>切换护甲确认</h2>
          <button className="close-button" onClick={onCancel}>×</button>
        </div>

        {/* 内容 */}
        <div className="modal-body">
          {/* 模拟数据警告 */}
          {simulatedLines.length > 0 && (
            <div className="warning-section">
              <h3>【自定义模拟配置】</h3>
              <p>当前存在 {simulatedLines.length} 个自定义配置：</p>
              <ul className="config-list">
                {simulatedLines.map((line) => (
                  <li key={line.id}>
                    <span className="config-name">
                      {line.displayName || `${line.gunName} - ${line.bulletName}`}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="warning-text">
                这些配置基于旧护甲设置，需要重新模拟。<br/>
                <strong>（重新模拟功能暂未实现，当前将保留旧数据）</strong>
              </p>
            </div>
          )}

          {/* 后端数据信息 */}
          {backendLines.length > 0 && (
            <div className="info-section">
              <h3>查询数据配置</h3>
              
              {preQueryResult ? (
                // 有预查询结果,显示详细信息
                <>
                  {preQueryResult.successCount > 0 && (
                    <>
                      <p className="info-text">
                        {preQueryResult.successCount} 个配置可以成功刷新
                      </p>
                      <ul className="config-list success-list">
                        {preQueryResult.successLines.map((line) => (
                          <li key={line.id}>
                            <span className="config-name success">
                              {line.displayName || `${line.gunName} - ${line.bulletName}`}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                  
                  {preQueryResult.failedCount > 0 && (
                    <>
                      <p className="warning-text" style={{ marginTop: preQueryResult.successCount > 0 ? '16px' : '0' }}>
                        {preQueryResult.failedCount} 个配置将被移除(无数据)
                      </p>
                      <ul className="config-list failed-list">
                        {preQueryResult.failedLines.map((line) => (
                          <li key={line.id}>
                            <span className="config-name failed">
                              {line.displayName || `${line.gunName} - ${line.bulletName}`}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </>
              ) : (
                // 没有预查询结果(有模拟数据的情况)
                <>
                  <p>{backendLines.length} 个配置将尝试刷新</p>
                  <p className="info-text">
                    无数据的配置将被自动移除
                  </p>
                </>
              )}
            </div>
          )}

          {/* 如果没有任何配置 */}
          {simulatedLines.length === 0 && backendLines.length === 0 && (
            <div className="info-section">
              <p>当前没有对比配置，可以直接切换。</p>
            </div>
          )}
        </div>

        {/* 按钮 */}
        <div className="modal-footer">
          <button className="cancel-button" onClick={onCancel}>
            取消
          </button>
          <button className="confirm-button" onClick={onConfirm}>
            确认切换
          </button>
        </div>
      </div>
    </div>
  );
}
