# 数据单一来源与远程同步执行步骤

## 目标
- 建立单一数据源（SSOT），避免 Website / Calculator / Data-Editor 三份数据漂移。
- 由 Data-Editor 发布标准 JSON 数据。
- Calculator 在实验室服务器上自动从腾讯云拉取数据，失败时使用本地缓存回退。

## 目录约定
- 编辑源数据（可编辑）：`DeltaForce-Data-Editor/backend/src_data`
- 发布数据（只读分发）：`DeltaForce-Data-Editor/backend/published_data`
- 计算器本地数据缓存：`DeltaForce-PTTK-Caculator/game_data`

## 第 1 步：发布端（Data-Editor）
1. 新增发布脚本，读取 `src_data` 中核心数据：
   - weapons.js
   - ammos.js
   - armors.js
   - helmets.js
   - modifications.js
2. 转换为标准 JSON 并输出到 `published_data`。
3. 生成 `manifest.json`：
   - `version`
   - `generatedAt`
   - `files.{name}.sha256`
   - `files.{name}.size`
   - `files.{name}.records`
4. 后端提供只读下载接口：
   - `GET /api/published/manifest`
   - `GET /api/published/:name`

## 第 2 步：发布到腾讯云
1. 将 `published_data` 上传到腾讯云对象存储（COS）或网站后端静态目录。
2. 固定访问地址，例如：
   - `https://your-domain/data/manifest.json`
   - `https://your-domain/data/weapons.json`

## 第 3 步：拉取端（Calculator）
1. 新增远程同步模块：
   - 读取远端 `manifest.json`
   - 对比本地版本
   - 新版本才下载 JSON 文件
   - 校验 sha256
   - 原子替换本地 `game_data`
2. 拉取失败时：
   - 打日志
   - 不中断计算流程
   - 回退继续使用本地旧数据

## 第 4 步：运行配置
在 Calculator `.env` 配置：
- `DATA_SYNC_ENABLED=true`
- `DATA_SYNC_MANIFEST_URL=https://your-domain/data/manifest.json`
- `DATA_SYNC_BASE_URL=https://your-domain/data`
- `DATA_SYNC_TIMEOUT=20`

## 第 5 步：上线顺序
1. 先在本地跑发布脚本并检查 `manifest` 与 JSON。
2. 启动 Data-Editor 后端，验证发布接口可访问。
3. 配置 Calculator 拉取地址，先手动触发运行一次。
4. 观察日志确认版本更新成功。
5. 再切到定时任务或常规运行。

## 回滚策略
- 保留上一版 `game_data` 本地缓存。
- 远程下载/校验失败时不覆盖旧文件。
- 通过替换远端 `manifest` 回退到稳定版本。
