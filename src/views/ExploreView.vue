<template>
  <div>
    <h1 class="text-2xl font-bold mb-4">发现 🔍</h1>
    <p class="text-base-content/70 mb-6">浏览和探索所有元素内容。</p>

    <div class="form-control mb-4">
      <label class="input input-bordered flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input v-model="search" type="text" class="grow" placeholder="搜索元素..." />
      </label>
    </div>

    <div class="overflow-x-auto">
      <table class="table table-zebra w-full">
        <thead>
          <tr>
            <th>编号</th>
            <th>符号</th>
            <th>名称</th>
            <th>类别</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in filteredItems" :key="item.id">
            <td>{{ item.id }}</td>
            <td><span class="badge badge-outline font-mono">{{ item.symbol }}</span></td>
            <td>{{ item.name }}</td>
            <td><span class="badge" :class="item.badgeClass">{{ item.category }}</span></td>
            <td>
              <button class="btn btn-xs btn-ghost">详情</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const search = ref('')

const items = [
  { id: 1, symbol: 'H', name: '氢', category: '非金属', badgeClass: 'badge-info' },
  { id: 2, symbol: 'He', name: '氦', category: '稀有气体', badgeClass: 'badge-ghost' },
  { id: 3, symbol: 'Li', name: '锂', category: '碱金属', badgeClass: 'badge-primary' },
  { id: 4, symbol: 'Be', name: '铍', category: '碱土金属', badgeClass: 'badge-secondary' },
  { id: 6, symbol: 'C', name: '碳', category: '非金属', badgeClass: 'badge-info' },
  { id: 8, symbol: 'O', name: '氧', category: '非金属', badgeClass: 'badge-info' },
  { id: 26, symbol: 'Fe', name: '铁', category: '过渡金属', badgeClass: 'badge-warning' },
  { id: 79, symbol: 'Au', name: '金', category: '过渡金属', badgeClass: 'badge-warning' },
]

const filteredItems = computed(() =>
  items.filter(
    (i) =>
      i.name.includes(search.value) ||
      i.symbol.toLowerCase().includes(search.value.toLowerCase()) ||
      i.category.includes(search.value)
  )
)
</script>
