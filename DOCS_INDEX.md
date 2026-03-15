# 文档总索引（项目内）

本文件用于统一整理项目内 Markdown 文档入口，重点服务“AI 快速理解项目”。

## 推荐阅读顺序（AI）

1. [AI_QUICKSTART.md](./AI_QUICKSTART.md)
2. [AI_TASK_PLAYBOOK.md](./AI_TASK_PLAYBOOK.md)
3. [SYSTEM_MAP.md](./SYSTEM_MAP.md)
4. [API_CONTRACTS.md](./API_CONTRACTS.md)
5. [DATA_DICTIONARY.md](./DATA_DICTIONARY.md)
6. [WEBSITE_LOGIC_ARCHIVE.md](./WEBSITE_LOGIC_ARCHIVE.md)
7. [docs/pages/README.md](./docs/pages/README.md)
8. [frontend/docs/data-usage.md](./frontend/docs/data-usage.md)
9. [README.md](./README.md)
10. [DATA_SYNC_EXECUTION_PLAN.md](./DATA_SYNC_EXECUTION_PLAN.md)
11. [CHANGELOG.md](./CHANGELOG.md)

## 文档清单

### AI 导航文档（新增）

- [AI_QUICKSTART.md](./AI_QUICKSTART.md)  
  10 分钟上手：项目目标、运行方式、核心链路、排错入口。
- [AI_TASK_PLAYBOOK.md](./AI_TASK_PLAYBOOK.md)  
  AI 执行任务的标准流程、改动约束、回归模板与交付模板。
- [SYSTEM_MAP.md](./SYSTEM_MAP.md)  
  系统边界、模块关系、关键数据流与故障定位图。
- [API_CONTRACTS.md](./API_CONTRACTS.md)  
  前后端接口契约、请求/响应字段、版本逻辑、错误格式。
- [DATA_DICTIONARY.md](./DATA_DICTIONARY.md)  
  武器/弹药/护甲/头盔/配件字段定义与回退规则。

### 核心逻辑文档（长期维护）

- [WEBSITE_LOGIC_ARCHIVE.md](./WEBSITE_LOGIC_ARCHIVE.md)  
  全站逻辑归档（架构、数据流、关键修复点）。
- [frontend/docs/data-usage.md](./frontend/docs/data-usage.md)  
  前端数据模型与计算链路说明。
- [README.md](./README.md)  
  项目总览与基础启动说明。

### 页面级文档（逐页流程）

- [docs/pages/README.md](./docs/pages/README.md)
- [docs/pages/APP_SHELL_PAGE.md](./docs/pages/APP_SHELL_PAGE.md)
- [docs/pages/DATA_QUERY_PAGE.md](./docs/pages/DATA_QUERY_PAGE.md)
- [docs/pages/SIMULATOR_PAGE.md](./docs/pages/SIMULATOR_PAGE.md)
- [docs/pages/DATA_LIBRARY_PAGE.md](./docs/pages/DATA_LIBRARY_PAGE.md)

### 计划与变更

- [DATA_SYNC_EXECUTION_PLAN.md](./DATA_SYNC_EXECUTION_PLAN.md)
- [CHANGELOG.md](./CHANGELOG.md)

## 维护约定

- 新增文档时，必须同步更新本索引。
- API 字段变更时，必须同步更新 `API_CONTRACTS.md`。
- 数据字段变更时，必须同步更新 `DATA_DICTIONARY.md`。
- 页面行为变更时，优先更新 `docs/pages/*` 与 `WEBSITE_LOGIC_ARCHIVE.md`。
