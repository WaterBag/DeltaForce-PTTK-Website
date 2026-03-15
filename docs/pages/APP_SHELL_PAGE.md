# App Shell 页面文档

## 1. 页面职责

App Shell 负责承载全站布局与页面切换，不处理业务计算。

- 入口文件：`frontend/src/App.js`
- 布局容器：`frontend/src/components/layout/Layout.jsx`
- 侧边导航：`frontend/src/components/layout/Sidebar.jsx`

## 2. 核心状态

- `currentView`：当前页面标识
  - `dataQuery`
  - `simulator`
  - `dataLibrary`

## 3. 页面切换流程

1. `Sidebar` 点击菜单项。
2. 调用 `setCurrentView(...)`。
3. `App.renderContent()` 根据 `currentView` 渲染对应页面组件。
4. `Layout` 持续包裹 Header + Sidebar + Main Content。

## 4. 依赖与边界

- 依赖：React 本地状态，不依赖后端接口。
- 边界：不保留“每个页面内部状态”的历史快照，页面切走再切回会按组件逻辑重新初始化。

## 5. 侧边栏信息块

`Sidebar` 还展示固定命中概率信息和备案信息，不参与业务计算链路。

## 6. 测试清单

- 菜单切换是否稳定，无空白页。
- 当前激活菜单样式是否与页面一致。
- 三个页面切换后交互是否正常恢复。
