# API 契约（Frontend <-> Backend）

本文档定义前端与后端 API 的稳定契约，供 AI 在改动时做字段校验与兼容性检查。

## 1. 基础信息

- 开发环境基址：`http://localhost:3001`
- 生产环境基址：同域相对路径（前端 `API_BASE_URL=''`）
- 路由前缀：`/api/ttk`
- Content-Type：`application/json`

## 2. 通用请求参数（护甲维度）

以下字段在多个接口复用，字段名必须保持一致：

- `helmetLevel` number：头盔等级
- `armorLevel` number：护甲等级
- `helmetDurability` number：头盔耐久
- `armorDurability` number：护甲耐久
- `chestProtection` number(0/1)：胸部是否保护
- `stomachProtection` number(0/1)：腹部是否保护
- `armProtection` number(0/1)：上臂是否保护

## 3. 接口明细

### 3.1 `POST /api/ttk/available-guns`

用途：按护甲配置筛出可查询枪械列表。

请求体：
```json
{
  "helmetLevel": 5,
  "armorLevel": 5,
  "helmetDurability": 50,
  "armorDurability": 80,
  "chestProtection": 1,
  "stomachProtection": 1,
  "armProtection": 0
}
```

成功响应：
```json
["M4A1", "AKM", "SCAR-H"]
```

失败响应：见“错误响应格式”章节。

---

### 3.2 `POST /api/ttk/gun-details`

用途：按“枪械 + 护甲参数”返回可用子弹与距离点数据，并支持 latest/previous 版本。

请求体：
```json
{
  "gunName": "M4A1",
  "helmetLevel": 5,
  "armorLevel": 5,
  "helmetDurability": 50,
  "armorDurability": 80,
  "chestProtection": 1,
  "stomachProtection": 1,
  "armProtection": 0
}
```

成功响应（完整形态）：
```json
{
  "availableBullets": ["M855A1", "M995"],
  "allDataPoints": [
    { "bullet_name": "M855A1", "distance": 0, "btk_data": "[...]" }
  ],
  "latestCreatedAt": null,
  "hasPrevious": true,
  "previousAvailableBullets": ["M855A1", "M995"],
  "previousAllDataPoints": [
    { "bullet_name": "M855A1", "distance": 0, "btk_data": "[...]" }
  ],
  "previousCreatedAt": null,
  "latestCreatedAtByBullet": {
    "M855A1": "2026-03-15T10:00:00.000Z"
  },
  "previousCreatedAtByBullet": {
    "M855A1": "2026-03-10T10:00:00.000Z"
  }
}
```

字段说明：
- `allDataPoints`：默认给“最新版本”的点集（向后兼容老前端）
- `hasPrevious`：是否存在“上一版本”数据
- `previousAllDataPoints`：上一版本点集；若无上一版，后端会用 latest 填充，保证结构完整
- `latestCreatedAtByBullet/previousCreatedAtByBullet`：按子弹维度的时间戳映射

版本逻辑（后端实现约束）：
- 同一枪同一护甲条件下，以 `bullet_name + btk_data 内容签名` 识别版本差异
- 仅“内容变化且时间不同”才分为新旧版本
- 若数据表缺少 `created_at/create_at` 字段，退化为单版本返回

---

### 3.3 `POST /api/ttk/combinations`

用途：按护甲配置返回 `gun_name + bullet_name` 组合（辅助接口）。

请求体：同 `available-guns`。

成功响应：
```json
[
  { "gun_name": "M4A1", "bullet_name": "M855A1" }
]
```

---

### 3.4 `POST /api/ttk/ttk-curve`

用途：按指定武器子弹与护甲参数返回距离曲线点。

请求体：
```json
{
  "weaponName": "M4A1",
  "ammoName": "M855A1",
  "helmetLevel": 5,
  "helmetDurability": 50,
  "armorLevel": 5,
  "armorDurability": 80,
  "chestProtection": 1,
  "stomachProtection": 1,
  "armProtection": 0
}
```

成功响应：
```json
[
  { "distance": 0, "btk_data": "[...]" },
  { "distance": 10, "btk_data": "[...]" }
]
```

## 4. 错误响应格式（统一）

后端全局错误中间件返回：

```json
{
  "success": false,
  "message": "错误信息",
  "error": {
    "status": 500,
    "path": "/api/ttk/gun-details",
    "timestamp": "2026-03-15T12:00:00.000Z"
  }
}
```

开发环境下还可能包含：
- `error.stack`

## 5. 前端调用约束

- 调用文件：`frontend/src/api/ttkAPI.js`
- 若关键参数缺失，前端函数会先抛错，不发请求
- `DataQuery` 使用 `dataVersion` (`latest|previous`) 决定取 `allDataPoints` 或 `previousAllDataPoints`
- 配件导致变体时，`gunName` 必须先经映射解析（`btkQueryName` 可能是对象）

## 6. 高风险不兼容变更清单

以下改动会直接破坏线上逻辑，禁止无迁移发布：

- 改动请求字段名（如 `armProtection` 改成 `upperArmProtection`）
- 删除 `allDataPoints` 或将其改为非数组
- 删除 `hasPrevious/previousAllDataPoints`（会破坏版本切换）
- 修改 `btk_data` 数据类型但不更新前端解析逻辑
- `gun_name` 命名与前端枪名不一致（变体映射链会失效）
