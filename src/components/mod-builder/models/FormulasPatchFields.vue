<template>
  <div class="space-y-4">
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <fieldset class="fieldset">
        <legend class="fieldset-legend">配方标识符 (Key)</legend>
        <input v-model="form.key" class="input input-sm w-full" placeholder="$new_formula" />
      </fieldset>

      <fieldset class="fieldset">
        <legend class="fieldset-legend">显示名称</legend>
        <input v-model="form.name" class="input input-sm w-full" />
      </fieldset>

      <fieldset class="fieldset">
        <legend class="fieldset-legend">所需载体/容器</legend>
        <SearchableSelect
          v-model="form.requiredContainer"
          clearable
          :options="lookup.items.value"
          placeholder="选择载体/容器..."
        />
      </fieldset>

      <fieldset class="fieldset">
        <legend class="fieldset-legend">实验操作类型</legend>
        <SearchableSelect
          v-model="form.requiredActionKey"
          clearable
          :options="lookup.actions.value"
          placeholder="选择实验操作..."
        />
      </fieldset>

      <fieldset class="fieldset">
        <legend class="fieldset-legend">操作次数</legend>
        <div class="join w-full">
          <input type="number" v-model.number="form.requiredActionMin" class="input input-sm join-item w-1/2" placeholder="最小值" />
        </div>
      </fieldset>

      <fieldset class="fieldset">
        <legend class="fieldset-legend">时代要求</legend>
        <SearchableSelect
          v-model="form.requiredEra"
          clearable
          :options="lookup.eras.value"
          placeholder="选择要求时代..."
        />
      </fieldset>

      <fieldset class="fieldset">
        <legend class="fieldset-legend">耗电量 (power_consumption)</legend>
        <input type="number" step="0.01" v-model.number="form.powerConsumption" class="input input-sm w-full" />
      </fieldset>

      <fieldset class="fieldset md:col-span-2">
        <legend class="fieldset-legend">所需前置科技</legend>
        <SearchableSelect
          v-model="form.requiredTechs"
          multiple
          :options="lookup.techs.value"
          placeholder="选择前置科技..."
          class="w-full"
        />
      </fieldset>
    </div>

    <fieldset class="fieldset">
      <legend class="fieldset-legend">研究描述 (已知结论)</legend>
      <textarea v-model="form.description" class="textarea textarea-sm w-full" rows="2"></textarea>
    </fieldset>

    <fieldset class="fieldset">
      <legend class="fieldset-legend">未知结论时的碎片描述 (fragment_description)</legend>
      <textarea v-model="form.fragmentDescription" class="textarea textarea-sm w-full" rows="2"></textarea>
    </fieldset>

    <fieldset class="fieldset">
      <legend class="fieldset-legend">反应底物/材料需求 (required_items)</legend>
      <div class="space-y-2">
        <div
          v-for="(item, idx) in form.requiredItems"
          :key="`formula-required-${idx}`"
          class="rounded-box border border-base-300 p-3 grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_auto_auto] gap-2 items-end"
        >
          <fieldset class="fieldset">
            <legend class="fieldset-legend text-xs">物品 Key (支持可替代项多选)</legend>
            <SearchableSelect
              v-model="item.keys"
              multiple
              :options="lookup.items.value"
              placeholder="选择底物..."
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
          <label class="label cursor-pointer justify-start gap-2">
            <input v-model="item.isMain" type="checkbox" class="checkbox checkbox-sm" />
            <span class="label-text text-xs">主反应物</span>
          </label>
          <button class="btn btn-xs btn-error btn-soft" @click="removeRequiredItem(idx)">
            <Icon icon="tabler:trash" />
            删除
          </button>
        </div>

        <button class="btn btn-xs" @click="addRequiredItem">
          <Icon icon="tabler:plus" />
          添加底物
        </button>
      </div>
    </fieldset>

    <fieldset class="fieldset">
      <legend class="fieldset-legend">反应产物 (products)</legend>
      <div class="space-y-2">
        <div
          v-for="(product, idx) in form.products"
          :key="`formula-product-${idx}`"
          class="rounded-box border border-base-300 p-3 grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 items-end"
        >
          <fieldset class="fieldset">
            <legend class="fieldset-legend text-xs">产物 Key</legend>
            <SearchableSelect
              v-model="product.key"
              clearable
              :options="lookup.items.value"
              placeholder="选择产物..."
            />
          </fieldset>
          <fieldset class="fieldset">
            <legend class="fieldset-legend text-xs">倍数 multiple</legend>
            <input v-model.number="product.multiple" type="number" min="0" class="input input-sm w-full" />
          </fieldset>
          <fieldset class="fieldset">
            <legend class="fieldset-legend text-xs">required_chain_operation</legend>
            <input v-model="product.requiredChainOperation" class="input input-sm w-full" placeholder="可选" />
          </fieldset>
          <fieldset class="fieldset">
            <legend class="fieldset-legend text-xs">required_item (可替代项多选)</legend>
            <SearchableSelect
              v-model="product.requiredItems"
              multiple
              :options="lookup.items.value"
              placeholder="选择触发物品..."
            />
          </fieldset>
          <button class="btn btn-xs btn-error btn-soft" @click="removeProduct(idx)">
            <Icon icon="tabler:trash" />
            删除
          </button>
        </div>

        <button class="btn btn-xs" @click="addProduct">
          <Icon icon="tabler:plus" />
          添加产物
        </button>
      </div>
    </fieldset>

    <fieldset class="fieldset">
      <legend class="fieldset-legend">高级属性/附加字段 (JSON)</legend>
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

interface FormulaRequiredItemFormRow {
  keys: string[]
  quantity: number
  useText: string
  isMain: boolean
}

interface FormulaProductFormRow {
  key: string
  multiple: number
  requiredChainOperation: string
  requiredItems: string[]
}

const form = reactive({
  key: '',
  name: '',
  description: '',
  timeRequired: undefined as number | undefined,
  requiredContainer: '',
  requiredActionKey: '',
  requiredActionMin: undefined as number | undefined,
  requiredActionMax: undefined as number | undefined,
  requiredTechs: [] as string[],
  requiredEra: '',
  requiredItems: [] as FormulaRequiredItemFormRow[],
  products: [] as FormulaProductFormRow[],
  fragmentDescription: '',
  powerConsumption: undefined as number | undefined,
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
  form.requiredItems.push({ keys: [], quantity: 1, useText: '', isMain: false })
}

function removeRequiredItem(index: number): void {
  form.requiredItems.splice(index, 1)
}

function addProduct(): void {
  form.products.push({ key: '', multiple: 1, requiredChainOperation: '', requiredItems: [] })
}

function removeProduct(index: number): void {
  form.products.splice(index, 1)
}

function applyFromValue(value: Record<string, unknown>): void {
  syncingFromModel.value = true
  form.key = String(value.key ?? '')
  form.name = String(value.name ?? '')
  form.description = String(value.description ?? '')
  form.timeRequired = typeof value.time_required === 'number' ? value.time_required : undefined
  form.requiredContainer = String(value.required_container ?? '')

  const requiredActions = (value.required_actions as Record<string, unknown> | undefined) || {}
  form.requiredActionKey = String(requiredActions.key ?? '')
  form.requiredActionMin = typeof requiredActions.min === 'number' ? requiredActions.min : undefined
  form.requiredActionMax = typeof requiredActions.max === 'number' ? requiredActions.max : undefined

  form.requiredTechs = Array.isArray(value.required_techs) ? [...value.required_techs].map(String) : []
  form.requiredEra = String(value.required_era ?? '')

  form.requiredItems = Array.isArray(value.required_items)
    ? value.required_items.map(entry => {
      const item = (entry || {}) as Record<string, unknown>
      const use = item.use
      return {
        keys: Array.isArray(item.key) ? item.key.map(String) : item.key ? [String(item.key)] : [],
        quantity: typeof item.quantity === 'number' && Number.isFinite(item.quantity) ? item.quantity : 1,
        useText: typeof use === 'number' && Number.isFinite(use) ? String(use) : '',
        isMain: Boolean(item.isMain),
      }
    })
    : []

  form.products = Array.isArray(value.products)
    ? value.products.map(entry => {
      const product = (entry || {}) as Record<string, unknown>
      return {
        key: String(product.key ?? ''),
        multiple: typeof product.multiple === 'number' && Number.isFinite(product.multiple) ? product.multiple : 1,
        requiredChainOperation: String(product.required_chain_operation ?? ''),
        requiredItems: Array.isArray(product.required_item)
          ? product.required_item.map(String)
          : product.required_item
            ? [String(product.required_item)]
            : [],
      }
    })
    : []

  form.fragmentDescription = String(value.fragment_description ?? '')
  form.powerConsumption = typeof value.power_consumption === 'number' ? value.power_consumption : undefined
  form.extraJson = ''
  syncingFromModel.value = false
}

function buildValue(): Record<string, unknown> {
  const value: Record<string, unknown> = {}
  if (form.key.trim()) value.key = form.key.trim()
  if (form.name.trim()) value.name = form.name.trim()
  if (form.description.trim()) value.description = form.description.trim()
  if (typeof form.timeRequired === 'number') value.time_required = form.timeRequired
  if (form.requiredContainer.trim()) value.required_container = form.requiredContainer.trim()

  if (form.requiredActionKey.trim() || typeof form.requiredActionMin === 'number' || typeof form.requiredActionMax === 'number') {
    value.required_actions = {
      key: form.requiredActionKey.trim(),
      min: form.requiredActionMin,
      max: form.requiredActionMax,
    }
  }

  if (form.requiredTechs.length > 0) value.required_techs = [...form.requiredTechs]
  if (form.requiredEra.trim()) value.required_era = form.requiredEra.trim()
  if (form.fragmentDescription.trim()) value.fragment_description = form.fragmentDescription.trim()
  if (typeof form.powerConsumption === 'number') value.power_consumption = form.powerConsumption

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
      if (item.isMain) row.isMain = true
      return row
    })
    .filter((item): item is Record<string, unknown> => Boolean(item))

  if (requiredItems.length > 0) {
    value.required_items = requiredItems
  }

  const products = form.products
    .map(product => {
      const key = product.key.trim()
      if (!key) return null

      const row: Record<string, unknown> = {
        key,
        multiple: typeof product.multiple === 'number' && Number.isFinite(product.multiple) ? product.multiple : 1,
      }

      const requiredChainOperation = product.requiredChainOperation.trim()
      if (requiredChainOperation) row.required_chain_operation = requiredChainOperation

      const requiredItem = buildSingleOrArray(product.requiredItems)
      if (requiredItem) row.required_item = requiredItem
      return row
    })
    .filter((item): item is Record<string, unknown> => Boolean(item))

  if (products.length > 0) {
    value.products = products
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
