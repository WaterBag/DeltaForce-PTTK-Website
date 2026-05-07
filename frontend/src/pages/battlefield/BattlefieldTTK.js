import React from 'react';
import { BattlefieldPlaceholder } from './BattlefieldPlaceholder';

export function BattlefieldTTK() {
  return (
    <BattlefieldPlaceholder
      title="TTK"
      description="战场没有甲弹对抗，这里后续会用武器伤害、距离衰减和部位概率直接计算期望击杀时间。"
      nextSteps="武器伤害模型"
    />
  );
}
