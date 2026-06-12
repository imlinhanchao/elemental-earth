# elemental-earth

Vue 3 前端模板，使用 Vite + TypeScript + Pinia + Vue Router + DaisyUI 构建。

## 功能特性

- **三栏布局**：左侧导航栏、中间内容区、右侧信息面板，均可折叠
- **Header Toolbar**：顶部工具栏，含主题切换、侧边栏开关、用户菜单下拉
- **Tab 标签页导航**：中间栏顶部的标签页切换，路由驱动
- **主题切换**：支持 DaisyUI 浅色 / 深色主题
- **Pinia 状态管理**：全局 UI 状态（主题、侧边栏开关）

## 技术栈

| 依赖 | 版本 |
|------|------|
| Vue 3 | ^3.x |
| TypeScript | ^5.x |
| Vite | ^8.x |
| Pinia | ^3.x |
| Vue Router | ^4.x |
| Tailwind CSS | ^4.x |
| DaisyUI | ^5.x |

## 快速开始

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 类型检查
npm run type-check

# 生产构建（含类型检查）
npm run build

# 预览构建
npm run preview
```

## 目录结构

```
src/
├── layouts/
│   └── DefaultLayout.vue   # 三栏 + header 布局
├── views/
│   ├── HomeView.vue         # 首页
│   ├── ExploreView.vue      # 发现页
│   └── SettingsView.vue     # 设置页
├── router/
│   └── index.ts             # Vue Router 配置
├── stores/
│   └── app.ts               # Pinia 应用状态
├── vite-env.d.ts            # Vite 类型声明
├── App.vue
├── main.ts
└── style.css
```
