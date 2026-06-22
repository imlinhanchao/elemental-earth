<template>
  <div class="card bg-base-200">
    <div class="card-body p-3">
      <h3 class="font-bold text-sm">{{ title }} <span class="badge badge-sm">{{ items.length }}</span></h3>
      <div v-if="items.length === 0" class="text-xs text-base-content/40">（未生成）</div>
      <div v-for="item in items" :key="item.key" class="border-t border-base-300 pt-2 mt-2 first:border-0 first:pt-0 first:mt-0">
        <div class="flex justify-between items-start">
          <div>
            <span class="font-medium text-sm">{{ item.name }}</span>
            <span class="text-xs text-base-content/40 ml-2">{{ item.key }}</span>
          </div>
          <button class="btn btn-xs btn-primary" @click="saveOne(item)">💾 保存</button>
        </div>
        <p class="text-xs text-base-content/60 mt-1">{{ item.description }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAdminStore } from '@/stores/modules/admin'

const props = defineProps<{
  title: string
  items: any[]
  type: string
}>()

const admin = useAdminStore()

async function saveOne(item: any) {
  try {
    const res = await admin.apiFetch(`/api/${props.type}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    })
    const json = await res.json()
    if (!res.ok) { alert(json.error || '保存失败'); return }
    alert(`✅ ${item.key} 已保存`)
  } catch (e) {
    alert('保存失败: ' + (e as Error).message)
  }
}
</script>
