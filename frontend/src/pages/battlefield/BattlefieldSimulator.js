import React from 'react';
import { BattlefieldPlaceholder } from './BattlefieldPlaceholder';

export function BattlefieldSimulator() {
  return (
    <BattlefieldPlaceholder
      title="伤害模拟器"
      description="这里会保留命中部位、距离、血量和配件配置，去掉烽火里的弹药、头盔和护甲耐久。"
      nextSteps="单发命中模拟"
    />
  );
}
