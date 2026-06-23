<template>
  <div class="max-w-3xl mx-auto p-4">
    <div class="flex items-center gap-3 mb-4">
      <button class="btn btn-ghost btn-xs" @click="$router.push('/admin/dashboard')">← 返回</button>
      <h2 class="text-lg font-bold">🤖 AI 内容生成器</h2>
    </div>
    <p class="text-sm text-base-content/60 mb-4">
      输入一种材料、矿物或元素的名称，AI 将根据化学、矿物学知识自动生成游戏数据。
    </p>

    <div class="flex gap-2 mb-4">
      <input v-model="prompt" type="text" class="input input-bordered flex-1" placeholder="例如：铁、赤铁矿、硫酸…" @keyup.enter="generate" :disabled="loading" />
      <button class="btn btn-primary" :disabled="loading || !prompt" @click="generate">
        {{ loading ? '⏳ 生成中…' : '🚀 生成' }}
      </button>
    </div>

    <div v-if="error" class="alert alert-error text-sm mb-4">{{ error }}</div>

    <div v-if="result" class="space-y-4">
      <div class="flex gap-2">
        <button class="btn btn-success btn-sm" @click="saveAll">💾 保存全部</button>
        <button class="btn btn-ghost btn-sm" @click="result = null">🗑 清空</button>
      </div>

      <ResultSection title="🧪 物品" :items="result.items" type="items" />
      <ResultSection title="⚡ 行动" :items="result.actions" type="actions" />
      <ResultSection title="🔬 科技" :items="result.techs" type="techs" />
      <ResultSection title="🧫 实验操作" :items="result.labs" type="labs" />
      <ResultSection title="📜 配方" :items="result.formulas" type="formulas" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAdminStore } from '@/stores/modules/admin'
import ResultSection from './ResultSection.vue'

const admin = useAdminStore()
const prompt = ref('')
const loading = ref(false)
const error = ref('')
const result = ref<any>(null)

async function generate() {
  if (!prompt.value || loading.value) return
  loading.value = true
  error.value = ''
  result.value = null
  try {
    const res = await admin.apiFetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: prompt.value }),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || '生成失败')
    result.value = json.data
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    loading.value = false
  }
}

async function saveAll() {
  if (!result.value) return
  const types = ['items', 'actions', 'techs', 'labs', 'formulas']
  let ok = 0, fail = 0
  for (const type of types) {
    for (const record of (result.value[type] || [])) {
      try {
        const res = await admin.apiFetch(`/api/${type}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(record),
        })
        if (res.ok) ok++; else fail++
      } catch { fail++ }
    }
  }
  alert(`保存完成：成功 ${ok} 项${fail ? `，失败 ${fail} 项` : ''}`)
}
</script>
