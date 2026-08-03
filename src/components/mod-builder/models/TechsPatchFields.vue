<template>
  <div class="space-y-4">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <fieldset class="fieldset">
        <legend class="fieldset-legend">科技标识符 (Key)</legend>
        <input v-model="form.key" class="input input-sm w-full" placeholder="$new_tech" />
      </fieldset>

      <fieldset class="fieldset">
        <legend class="fieldset-legend">显示名称</legend>
        <input v-model="form.name" class="input input-sm w-full" />
      </fieldset>

      <fieldset class="fieldset">
        <legend class="fieldset-legend">研发时间 (秒)</legend>
        <input type="number" v-model.number="form.timeRequired" class="input input-sm w-full" />
      </fieldset>

      <fieldset class="fieldset">
        <legend class="fieldset-legend">时代里程碑 (Milestone)</legend>
        <SearchableSelect
          v-model="form.milestone"
          clearable
          :options="lookup.milestones.value"
          placeholder="选择里程碑点..."
        />
      </fieldset>

      <fieldset class="fieldset md:col-span-2">
        <legend class="fieldset-legend">前置科技要求</legend>
        <SearchableSelect
          v-model="form.requiredTechs"
          multiple
          :options="lookup.techs.value"
          placeholder="选择前置科技..."
        />
      </fieldset>
    </div>

    <fieldset class="fieldset">
      <legend class="fieldset-legend">科技介绍</legend>
      <textarea v-model="form.description" class="textarea textarea-sm w-full" rows="2"></textarea>
    </fieldset>

    <fieldset class="fieldset">
      <legend class="fieldset-legend">研发消耗 (required_items)</legend>
      <div class="space-y-2">
        <div
          v-for="(item, idx) in form.requiredItems"
          :key="`tech-required-${idx}`"
          class="rounded-box border border-base-300 p-3 grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_auto] gap-2 items-end"
        >
          <fieldset class="fieldset">
            <legend class="fieldset-legend text-xs">物品 Key (支持可替代项多选)</legend>
            <SearchableSelect
              v-model="item.keys"
              multiple
              :options="lookup.items.value"
              placeholder="选择物品..."
            />
          </fieldset>
          <fieldset class="fieldset">
            <legend class="fieldset-legend text-xs">数量</legend>
            <input v-model.number="item.quantity" type="number" min="1" class="input input-sm w-full" />
          </fieldset>
          <fieldset class="fieldset">
            <legend class="fieldset-legend text-xs">耐久消耗 use</legend>
            <input v-model="item.useText" type="number" min="0" class="input input-sm w-full" placeholder="可选" />
          </fieldset>
          <button class="btn btn-xs btn-error btn-soft" @click="removeRequiredItem(idx)">
            <Icon icon="tabler:trash" />
            删除
          </button>
        </div>

        <button class="btn btn-xs" @click="addRequiredItem">
          <Icon icon="tabler:plus" />
          添加消耗项
        </button>
      </div>
    </fieldset>

    <fieldset class="fieldset">
      <legend class="fieldset-legend">高级属性 (JSON)</legend>
      <textarea v-model="form.extraJson" class="textarea textarea-sm w-full font-mono text-xs" rows="4" placeholder='{"unlock_hint":"..."}'></textarea>
      <p class="fieldset-label text-xs">用于不在表单中的扩展字段，避免重复填写 required_items。</p>
    </fieldset>

    <div v-if="jsonError" class="alert alert-warning alert-soft text-xs">
      <Icon icon="tabler:alert-circle" />
      <span>JSON 格式错误：{{ jsonError }}</span>
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

interface TechRequiredItemFormRow {
  keys: string[]
  quantity: number
  useText: string
}

const form = reactive({
  key: '',
  name: '',
  description: '',
  timeRequired: undefined as number | undefined,
  milestone: '',
  requiredTechs: [] as string[],
  requiredItems: [] as TechRequiredItemFormRow[],
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
  form.key = String(value.key ?? '')
  form.name = String(value.name ?? '')
  form.description = String(value.description ?? '')
  form.timeRequired = typeof value.time_required === 'number' ? value.time_required : undefined
  form.milestone = String(value.milestone ?? '')
  form.requiredTechs = Array.isArray(value.required_techs) ? [...value.required_techs].map(String) : []
  form.requiredItems = Array.isArray(value.required_items)
    ? value.required_items.map(entry => {
      const item = (entry || {}) as Record<string, unknown>
      const use = item.use
      return {
        keys: Array.isArray(item.key) ? item.key.map(String) : item.key ? [String(item.key)] : [],
        quantity: typeof item.quantity === 'number' && Number.isFinite(item.quantity) ? item.quantity : 1,
        useText: typeof use === 'number' && Number.isFinite(use) ? String(use) : '',
      }
    })
    : []
  form.extraJson = ''
  syncingFromModel.value = false
}

function parseOptionalNumber(raw: string): number | undefined {
  const text = raw.trim()
  if (!text) return undefined
  const num = Number(text)
  return Number.isFinite(num) ? num : undefined
}

function buildSingleOrArray(keys: string[]): string | string[] | undefined {
  const cleanKeys = keys.map(String).map(item => item.trim()).filter(Boolean)
  if (cleanKeys.length === 0) return undefined
  if (cleanKeys.length === 1) return cleanKeys[0]
  return cleanKeys
}

function addRequiredItem(): void {
  form.requiredItems.push({ keys: [], quantity: 1, useText: '' })
}

function removeRequiredItem(index: number): void {
  form.requiredItems.splice(index, 1)
}

function buildValue(): Record<string, unknown> {
  const value: Record<string, unknown> = {}
  if (form.key.trim()) value.key = form.key.trim()
  if (form.name.trim()) value.name = form.name.trim()
  if (form.description.trim()) value.description = form.description.trim()
  if (typeof form.timeRequired === 'number' && Number.isFinite(form.timeRequired)) value.time_required = form.timeRequired
  if (form.milestone.trim()) value.milestone = form.milestone.trim()

  if (form.requiredTechs.length > 0) value.required_techs = [...form.requiredTechs]

  const requiredItems = form.requiredItems
    .map(item => {
      const key = buildSingleOrArray(item.keys)
      if (!key) return null

      const row: Record<string, unknown> = {
        key,
        quantity: typeof item.quantity === 'number' && Number.isFinite(item.quantity) ? item.quantity : 1,
      }

      const use = parseOptionalNumber(item.useText)
      if (typeof use === 'number') row.use = use
      return row
    })
    .filter((item): item is Record<string, unknown> => Boolean(item))

  if (requiredItems.length > 0) {
    value.required_items = requiredItems
  }

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
