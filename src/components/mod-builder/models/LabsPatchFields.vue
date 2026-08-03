<template>
  <div class="space-y-4">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <fieldset class="fieldset">
        <legend class="fieldset-legend">实验操作标识符 (Key)</legend>
        <input v-model="form.key" class="input input-sm w-full" placeholder="$new_lab" />
      </fieldset>

      <fieldset class="fieldset">
        <legend class="fieldset-legend">显示名称</legend>
        <input v-model="form.name" class="input input-sm w-full" />
      </fieldset>

      <fieldset class="fieldset">
        <legend class="fieldset-legend">操作耗时 (秒)</legend>
        <input type="number" v-model.number="form.timeRequired" class="input input-sm w-full" />
      </fieldset>

      <fieldset class="fieldset">
        <legend class="fieldset-legend">里程碑点 (Milestone)</legend>
        <SearchableSelect
          v-model="form.milestone"
          clearable
          :options="lookup.milestones.value"
          placeholder="选择里程碑点..."
        />
      </fieldset>

      <fieldset class="fieldset">
        <legend class="fieldset-legend">能源与资源需求</legend>
        <div class="flex flex-wrap gap-4">
          <label class="label cursor-pointer justify-start gap-2">
            <input type="checkbox" class="checkbox checkbox-sm checkbox-primary" v-model="form.isChain" />
            <span class="label-text">支持链式操作 (is_chain)</span>
          </label>
          <label class="label cursor-pointer justify-start gap-2">
            <input type="checkbox" class="toggle toggle-sm toggle-warning" :checked="form.requiresBurning === 'true'" @change="form.requiresBurning = ($event.target as any).checked ? 'true' : 'false'" />
            <span class="label-text">需要火源</span>
          </label>
          <label class="label cursor-pointer justify-start gap-2">
            <input type="checkbox" class="toggle toggle-sm toggle-info" :checked="form.requiresElectricity === 'true'" @change="form.requiresElectricity = ($event.target as any).checked ? 'true' : 'false'" />
            <span class="label-text">需要电力</span>
          </label>
        </div>
      </fieldset>

      <fieldset class="fieldset md:col-span-2">
        <legend class="fieldset-legend">所需前置科技</legend>
        <SearchableSelect
          v-model="form.requiredTechs"
          multiple
          :options="lookup.techs.value"
          placeholder="选择前置科技..."
        />
      </fieldset>

      <fieldset class="fieldset md:col-span-2">
        <legend class="fieldset-legend">允许附加的链式操作</legend>
        <SearchableSelect
          v-model="form.chainOps"
          multiple
          :options="lookup.labs.value"
          placeholder="选择附加链式操作..."
        />
      </fieldset>
    </div>

    <fieldset class="fieldset">
      <legend class="fieldset-legend">实验描述</legend>
      <textarea v-model="form.description" class="textarea textarea-sm w-full" rows="2"></textarea>
    </fieldset>

    <fieldset class="fieldset">
      <legend class="fieldset-legend">所需实验载体/容器 (required_item)</legend>
      <div class="space-y-2">
        <div
          v-for="(item, idx) in form.requiredItems"
          :key="`lab-required-${idx}`"
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
          添加需求项
        </button>
      </div>
    </fieldset>

    <fieldset class="fieldset">
      <legend class="fieldset-legend">高级配置/其他属性 (JSON)</legend>
      <textarea v-model="form.extraJson" class="textarea textarea-sm w-full font-mono text-xs" rows="3"></textarea>
    </fieldset>

    <div v-if="jsonErrors.length" class="alert alert-warning alert-soft text-xs">
      <Icon icon="tabler:alert-circle" />
      <span>配置异常：{{ jsonErrors.join('；') }}</span>
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

interface LabRequiredItemFormRow {
  keys: string[]
  quantity: number
  useText: string
}

const form = reactive({
  key: '',
  name: '',
  description: '',
  timeRequired: undefined as number | undefined,
  requiresBurning: '',
  requiresElectricity: '',
  requiredTechs: [] as string[],
  chainOps: [] as string[],
  isChain: false,
  milestone: '',
  requiredItems: [] as LabRequiredItemFormRow[],
  extraJson: '',
})
const syncingFromModel = ref(false)
const lastSnapshot = ref('')

function snapshot(value: Record<string, unknown>): string {
  return JSON.stringify(value)
}

function parseError(raw: string): string {
  if (!raw.trim()) return ''
  try {
    JSON.parse(raw)
    return ''
  } catch (error) {
    return (error as Error).message
  }
}

const jsonErrors = computed(() => {
  const rows = [
    ['advanced', parseError(form.extraJson)],
  ].filter(([, err]) => err)

  return rows.map(([name, err]) => `${name}: ${err}`)
})

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

function applyFromValue(value: Record<string, unknown>): void {
  syncingFromModel.value = true
  form.key = String(value.key ?? '')
  form.name = String(value.name ?? '')
  form.description = String(value.description ?? '')
  form.timeRequired = typeof value.time_required === 'number' ? value.time_required : undefined
  form.requiresBurning = typeof value.requires_burning === 'boolean' ? String(value.requires_burning) : ''
  form.requiresElectricity = typeof value.requires_electricity === 'boolean' ? String(value.requires_electricity) : ''
  form.requiredTechs = Array.isArray(value.required_techs) ? [...value.required_techs].map(String) : []
  form.chainOps = Array.isArray(value.chain_operations) ? [...value.chain_operations].map(String) : []
  form.isChain = Boolean(value.is_chain)
  form.milestone = String(value.milestone ?? '')
  form.requiredItems = Array.isArray(value.required_item)
    ? value.required_item.map(entry => {
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

function buildValue(): Record<string, unknown> {
  const value: Record<string, unknown> = {}
  if (form.key.trim()) value.key = form.key.trim()
  if (form.name.trim()) value.name = form.name.trim()
  if (form.description.trim()) value.description = form.description.trim()
  if (typeof form.timeRequired === 'number') value.time_required = form.timeRequired
  if (form.requiresBurning === 'true') value.requires_burning = true
  if (form.requiresBurning === 'false') value.requires_burning = false
  if (form.requiresElectricity === 'true') value.requires_electricity = true
  if (form.requiresElectricity === 'false') value.requires_electricity = false
  if (form.milestone.trim()) value.milestone = form.milestone.trim()
  if (form.isChain) value.is_chain = true

  if (form.requiredTechs.length > 0) value.required_techs = [...form.requiredTechs]
  if (form.chainOps.length > 0) value.chain_operations = [...form.chainOps]

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
    value.required_item = requiredItems
  }

  if (form.extraJson.trim()) {
    try {
      Object.assign(value, JSON.parse(form.extraJson) as Record<string, unknown>)
    } catch {
      // ignore
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
