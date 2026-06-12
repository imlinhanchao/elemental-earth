<template>
  <div>
    <h1 class="text-2xl font-bold mb-4">欢迎来到 Elemental Earth 🌍</h1>
    <p class="text-base-content/70 mb-6">这是一个使用 Vue 3 + Pinia + Vue Router + DaisyUI 构建的前端模板。</p>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div class="card bg-base-200 shadow">
        <div class="card-body">
          <h2 class="card-title text-primary">Vue 3</h2>
          <p class="text-sm">渐进式 JavaScript 框架，组合式 API。</p>
        </div>
      </div>
      <div class="card bg-base-200 shadow">
        <div class="card-body">
          <h2 class="card-title text-secondary">Pinia</h2>
          <p class="text-sm">Vue 的官方状态管理库，轻量且灵活。</p>
        </div>
      </div>
      <div class="card bg-base-200 shadow">
        <div class="card-body">
          <h2 class="card-title text-accent">DaisyUI</h2>
          <p class="text-sm">基于 Tailwind CSS 的组件库，开箱即用。</p>
        </div>
      </div>
    </div>

    <div class="alert alert-info">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 shrink-0 stroke-current" fill="none" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span>点击顶部标签栏切换不同页面，左侧侧边栏可收起展开。</span>
    </div>
  </div>
</template>
