<template>
  <div class="space-y-4">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <fieldset class="fieldset">
        <legend class="fieldset-legend">背景提示标识符 (ID)</legend>
        <input v-model="form.id" class="input input-sm w-full" placeholder="$tip_new" />
      </fieldset>

      <fieldset class="fieldset">
        <legend class="fieldset-legend">显示时机：绑定时代 (可选)</legend>
        <SearchableSelect
          v-model="form.era"
          clearable
          :options="lookup.eras.value"
          placeholder="选择时代..."
        />
      </fieldset>

      <fieldset class="fieldset md:col-span-2">
        <legend class="fieldset-legend">触发条件：关联物品 (可选)</legend>
        <SearchableSelect
          v-model="form.item"
          clearable
          :options="lookup.items.value"
          placeholder="选择物品..."
        />
      </fieldset>
    </div>

    <fieldset class="fieldset">
      <legend class="fieldset-legend">提示文本内容</legend>
      <textarea v-model="form.content" class="textarea textarea-sm w-full" rows="3" placeholder="在此输入给玩家的提示文字..."></textarea>
    </fieldset>

    <fieldset class="fieldset">
      <legend class="fieldset-legend">高级配置/其他属性 (JSON)</legend>
      <textarea v-model="form.extraJson" class="textarea textarea-sm w-full font-mono text-xs" rows="3" placeholder='{"extra":"field"}'></textarea>
    </fieldset>

    <div v-if="jsonError" class="alert alert-warning alert-soft text-xs">
      <Icon icon="tabler:alert-circle" />
      <span>JSON 配置异常：{{ jsonError }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, reactive, ref, watch } from 'vue'
import SearchableSelect from '@/components/SearchableSelect.vue'
import type { BuilderPatchOperation } from '@/views/mods/builder/types'

const _props = defineProps<{ op: BuilderPatchOperation }>()
const model = defineModel<Record<string, unknown>>({ required: true })
const lookup = inject<any>('builder-lookup')

const form = reactive({
  id: '',
  content: '',
  era: '',
  item: '',
  extraJson: '',
})
const syncingFromModel = ref(false)
const lastSnapshot = ref('')

function snapshot(value: Record<string, unknown>): string {
  return JSON.stringify(value)
}

const jsonError = computed(() => {
  const raw = form.extraJson.trim()
  if (!raw) return ''
  try {
    JSON.parse(raw)
    return ''
  } catch (error) {
    return (error as Error).message
  }
})

function applyFromValue(value: Record<string, unknown>): void {
  syncingFromModel.value = true
  form.id = String(value.id ?? '')
  form.content = String(value.content ?? '')
  form.era = String(value.era ?? '')
  form.item = String(value.item ?? '')
  form.extraJson = ''
  syncingFromModel.value = false
}

function buildValue(): Record<string, unknown> {
  const value: Record<string, unknown> = {}
  if (form.id.trim()) value.id = form.id.trim()
  if (form.content.trim()) value.content = form.content.trim()
  if (form.era.trim()) value.era = form.era.trim()
  if (form.item.trim()) value.item = form.item.trim()

  if (form.extraJson.trim()) {
    try {
      Object.assign(value, JSON.parse(form.extraJson) as Record<string, unknown>)
    } catch {
      // ignore invalid json
    }
  }

  return value
}

watch(
  model,
  value => {
    const next = (value || {}) as Record<string, unknown>
    const nextSnapshot = snapshot(next)
    if (nextSnapshot === lastSnapshot.value) return
    lastSnapshot.value = nextSnapshot
    applyFromValue(next)
  },
  { immediate: true, deep: true },
)

watch(
  form,
  () => {
    if (syncingFromModel.value) return
    const next = buildValue()
    const nextSnapshot = snapshot(next)
    if (nextSnapshot === lastSnapshot.value) return
    lastSnapshot.value = nextSnapshot
    model.value = next
  },
  { deep: true },
)
</script>
