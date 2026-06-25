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
      <div class="flex gap-2 items-center">
        <button class="btn btn-success btn-sm" @click="saveAll">💾 保存已选 ({{ totalChecked }})</button>
        <button class="btn btn-ghost btn-xs" @click="toggleAll(true)">全选</button>
        <button class="btn btn-ghost btn-xs" @click="toggleAll(false)">全不选</button>
        <button class="btn btn-ghost btn-sm" @click="result = null">🗑 清空</button>
      </div>

      <ResultSection title="🧪 物品" :items="result.items" type="items" :checked="checkStates.items" @edit="openEditor" />
      <ResultSection title="⚡ 行动" :items="result.actions" type="actions" :checked="checkStates.actions" @edit="openEditor" />
      <ResultSection title="🔬 科技" :items="result.techs" type="techs" :checked="checkStates.techs" @edit="openEditor" />
      <ResultSection title="🧫 实验操作" :items="result.labs" type="labs" :checked="checkStates.labs" @edit="openEditor" />
      <ResultSection title="📜 配方" :items="result.formulas" type="formulas" :checked="checkStates.formulas" @edit="openEditor" />

      <!-- 修改建议 -->
      <div v-if="result.modifications?.length" class="card bg-base-200 border border-warning/30">
        <div class="card-body p-3">
          <h3 class="font-bold text-sm">🔄 修改建议 <span class="badge badge-sm">{{ result.modifications.length }}</span></h3>
          <div v-for="(mod, idx) in (result.modifications as any[])" :key="idx"
            class="flex items-center gap-2 border-t border-base-300 pt-2 mt-2 first:border-0 first:pt-0 first:mt-0">
            <input type="checkbox" class="checkbox checkbox-xs" v-model="modChecked[idx]" />
            <div class="flex-1 text-xs">
              <span class="font-medium">{{ mod.type }}/{{ mod.key }}</span>
              <span class="badge badge-ghost badge-xs ml-1">{{ mod.action }}</span>
              <code class="block text-[10px] opacity-60 mt-0.5">{{ JSON.stringify(mod.data) }}</code>
            </div>
          </div>
        </div>
      </div>
    </div>

    <DataEditorModal
      :type="editorType"
      :item="editorItem"
      :visible="editorVisible"
      @save="onEditorSave"
      @close="editorVisible = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useAdminStore } from '@/stores/modules/admin'
import ResultSection from './ResultSection.vue'
import DataEditorModal from '@/components/DataEditorModal.vue'

const admin = useAdminStore()
const prompt = ref('')
const loading = ref(false)
const error = ref('')
const result = ref<any>(null)

// ─── 勾选状态 ──────────────────────────────────────────────
const checkStates = reactive<Record<string, boolean[]>>({
  items: [], actions: [], techs: [], labs: [], formulas: [],
})
const modChecked = ref<boolean[]>([])

function initChecks(data: any) {
  for (const type of ['items','actions','techs','labs','formulas']) {
    checkStates[type] = (data[type] || []).map(() => true)
  }
  modChecked.value = (data.modifications || []).map(() => true)
}

function toggleAll(v: boolean) {
  for (const type of ['items','actions','techs','labs','formulas']) {
    checkStates[type] = checkStates[type].map(() => v)
  }
}

const totalChecked = computed(() => {
  let n = 0
  for (const type of ['items','actions','techs','labs','formulas']) {
    n += checkStates[type].filter(Boolean).length
  }
  return n
})

// ─── 生成 ──────────────────────────────────────────────────
async function generate() {
  if (!prompt.value || loading.value) return
  loading.value = true; error.value = ''; result.value = null
  try {
    const res = await admin.apiFetch('/api/generate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: prompt.value }),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || '生成失败')
    result.value = json.data
    initChecks(json.data)
  } catch (e) { error.value = (e as Error).message }
  finally { loading.value = false }
}

// ─── 编辑器 ──────────────────────────────────────────────────
const editorVisible = ref(false)
const editorType = ref('')
const editorItem = ref<any>(null)
const editorIdx = ref(-1)

function openEditor(type: string, idx: number) {
  if (!result.value) return
  editorType.value = type
  editorIdx.value = idx
  editorItem.value = { ...result.value[type][idx] }
  editorVisible.value = true
}

function onEditorSave(data: any) {
  if (!result.value || editorIdx.value < 0) return
  result.value[editorType.value][editorIdx.value] = data
}

// ─── 保存 ──────────────────────────────────────────────────
async function saveAll() {
  if (!result.value) return
  const types = ['items', 'actions', 'techs', 'labs', 'formulas']
  let ok = 0, fail = 0

  // 保存新数据
  for (const type of types) {
    for (let i = 0; i < (result.value[type] || []).length; i++) {
      if (!checkStates[type][i]) continue
      try {
        const res = await admin.apiFetch(`/api/${type}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(result.value[type][i]),
        })
        if (res.ok) ok++; else fail++
      } catch { fail++ }
    }
  }

  // 应用修改
  for (let i = 0; i < (result.value.modifications || []).length; i++) {
    if (!modChecked.value[i]) continue
    const mod = result.value.modifications[i]
    try {
      if (mod.action === 'add_reward') {
        // 先获取当前数据
        const getRes = await admin.apiFetch(`/api/${mod.type}/${mod.key}`)
        if (!getRes.ok) { fail++; continue }
        const record = await getRes.json()
        if (!record.rewards) record.rewards = []
        record.rewards.push(mod.data)
        const putRes = await admin.apiFetch(`/api/${mod.type}/${mod.key}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(record),
        })
        if (putRes.ok) ok++; else fail++
      } else if (mod.action === 'update') {
        const getRes = await admin.apiFetch(`/api/${mod.type}/${mod.key}`)
        if (!getRes.ok) { fail++; continue }
        const record = await getRes.json()
        Object.assign(record, mod.data)
        const putRes = await admin.apiFetch(`/api/${mod.type}/${mod.key}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(record),
        })
        if (putRes.ok) ok++; else fail++
      } else {
        fail++
      }
    } catch { fail++ }
  }

  alert(`保存完成：成功 ${ok} 项${fail ? `，失败 ${fail} 项` : ''}`)
}
</script>
