import React from 'react';
import './TargetDummy.css';
import mannequinImage from '../../assets/images/simulator/mannequin.png';

/**
 * 目标假人组件 - 交互式人体模型UI
 * 显示假人图片并提供不同身体部位的点击交互
 * 用于模拟武器命中不同身体部位的效果
 *
 * @param {Object} props - 组件属性
 * @param {Function} props.onHit - 命中事件回调函数，接收命中部位参数
 * @returns {JSX.Element} 目标假人组件
 */
export function TargetDummy({ onHit }) {
  return (
    <div className="image-dummy-container">
      {/* 假人基础图片 */}
      <img src={mannequinImage} alt="Target Dummy" className="dummy-image" />

      {/* 覆盖在图片上方的、经过精确裁剪的可点击区域 */}
      {/* 头部点击区域 */}
      <div className="dummy-part head" onClick={() => onHit('head')} title="头部"></div>
      {/* 胸部点击区域 */}
      <div className="dummy-part chest" onClick={() => onHit('chest')} title="胸部"></div>
      {/* 腹部点击区域 */}
      <div className="dummy-part abdomen" onClick={() => onHit('abdomen')} title="腹部"></div>
      {/* 左上臂点击区域 */}
      <div className="dummy-part l-upper-arm" onClick={() => onHit('upperArm')} title="上臂"></div>
      {/* 右上臂点击区域 */}
      <div className="dummy-part r-upper-arm" onClick={() => onHit('upperArm')} title="上臂"></div>
      {/* 左下臂点击区域 */}
      <div className="dummy-part l-lower-arm" onClick={() => onHit('lowerArm')} title="下臂"></div>
      {/* 右下臂点击区域 */}
      <div className="dummy-part r-lower-arm" onClick={() => onHit('lowerArm')} title="下臂"></div>
      {/* 左大腿点击区域 */}
      <div className="dummy-part l-thigh" onClick={() => onHit('thigh')} title="大腿"></div>
      {/* 右大腿点击区域 */}
      <div className="dummy-part r-thigh" onClick={() => onHit('thigh')} title="大腿"></div>
      {/* 左小腿点击区域 */}
      <div className="dummy-part l-calf" onClick={() => onHit('calf')} title="小腿"></div>
      {/* 右小腿点击区域 */}
      <div className="dummy-part r-calf" onClick={() => onHit('calf')} title="小腿"></div>
    </div>
  );
}
