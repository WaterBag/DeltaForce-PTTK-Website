import React from 'react';
import { BattlefieldPlaceholder } from './BattlefieldPlaceholder';

export function BattlefieldDataLibrary() {
  return (
    <BattlefieldPlaceholder
      title="数据图鉴"
      description="这里会先以武器图鉴为主，按武器类型、名称、伤害、射速、射程和 DPS 做高密度筛选展示。"
      nextSteps="战场武器列表"
    />
  );
}
