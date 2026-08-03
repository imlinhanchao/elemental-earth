<template>
  <div class="space-y-4">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <fieldset class="fieldset">
        <legend class="fieldset-legend">动作标识符 (Key)</legend>
        <input v-model="form.key" class="input input-sm w-full" placeholder="$new_action" />
      </fieldset>

      <fieldset class="fieldset">
        <legend class="fieldset-legend">显示名称</legend>
        <input v-model="form.name" class="input input-sm w-full" />
      </fieldset>

      <fieldset class="fieldset">
        <legend class="fieldset-legend">分类</legend>
        <input v-model="form.category" class="input input-sm w-full" placeholder="采集 / 制作 / 其他" />
      </fieldset>

      <fieldset class="fieldset">
        <legend class="fieldset-legend">所需时间 (秒)</legend>
        <input type="number" v-model.number="form.timeRequired" class="input input-sm w-full" />
      </fieldset>

      <fieldset class="fieldset">
        <legend class="fieldset-legend">冷却时间 (秒)</legend>
        <input type="number" v-model.number="form.cooldown" class="input input-sm w-full" />
      </fieldset>

      <fieldset class="fieldset">
        <legend class="fieldset-legend">可用地图</legend>
        <SearchableSelect
          v-model="form.maps"
          multiple
          :options="lookup.maps.value"
          placeholder="选择可用地图..."
        />
      </fieldset>

      <fieldset class="fieldset md:col-span-2">
        <legend class="fieldset-legend">前置科技</legend>
        <SearchableSelect
          v-model="form.requiredTechs"
          multiple
          :options="lookup.techs.value"
          placeholder="选择前置科技..."
        />
      </fieldset>
    </div>

    <fieldset class="fieldset">
      <legend class="fieldset-legend">功能描述</legend>
      <textarea v-model="form.description" class="textarea textarea-sm w-full" rows="2"></textarea>
    </fieldset>

    <fieldset class="fieldset">
      <legend class="fieldset-legend">物品消耗逻辑 (required_items)</legend>
      <div class="space-y-2">
        <div
          v-for="(item, idx) in form.requiredItems"
          :key="`required-item-${idx}`"
          class="rounded-box border border-base-300 p-3 grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_auto] gap-2 items-end"
        >
          <fieldset class="fieldset">
            <legend class="fieldset-legend text-xs">物品 Key (支持可替代项多选)</legend>
            <SearchableSelect
              v-model="item.keys"
              multiple
              :options="lookup.items.value"
              placeholder="选择消耗物品..."
            />
          </fieldset>
          <fieldset class="fieldset">
            <legend class="fieldset-legend text-xs">数量</legend>
            <input v-model.number="item.quantity" type="number" min="1" class="input input-sm w-full" />
          </fieldset>
          <fieldset class="fieldset">
            <legend class="fieldset-legend text-xs">耐久消耗 use (可选)</legend>
            <input v-model="item.useText" type="number" min="0" class="input input-sm w-full" placeholder="留空表示不设置" />
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
      <legend class="fieldset-legend">奖励产出逻辑 (rewards)</legend>
      <div class="space-y-2">
        <div
          v-for="(reward, idx) in form.rewards"
          :key="`reward-${idx}`"
          class="rounded-box border border-base-300 p-3 space-y-2"
        >
          <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
            <fieldset class="fieldset">
              <legend class="fieldset-legend text-xs">奖励 Key</legend>
              <SearchableSelect
                v-model="reward.key"
                clearable
                :options="lookup.items.value"
                placeholder="选择奖励物品..."
              />
            </fieldset>
            <fieldset class="fieldset">
              <legend class="fieldset-legend text-xs">概率 (0-1000)</legend>
              <input v-model.number="reward.probability" type="number" min="0" class="input input-sm w-full" />
            </fieldset>
            <fieldset class="fieldset">
              <legend class="fieldset-legend text-xs">数量最小值</legend>
              <input v-model.number="reward.quantityMin" type="number" min="0" class="input input-sm w-full" />
            </fieldset>
            <fieldset class="fieldset">
              <legend class="fieldset-legend text-xs">数量最大值 (可选)</legend>
              <input v-model="reward.quantityMaxText" type="number" min="0" class="input input-sm w-full" placeholder="留空=固定数量" />
            </fieldset>
            <fieldset class="fieldset">
              <legend class="fieldset-legend text-xs">消耗指定物品才掉落 (可替代项多选)</legend>
              <SearchableSelect
                v-model="reward.requiredItems"
                multiple
                :options="lookup.items.value"
                placeholder="选择触发物品..."
              />
            </fieldset>
            <fieldset class="fieldset">
              <legend class="fieldset-legend text-xs">指定时代才掉落 (可选)</legend>
              <SearchableSelect
                v-model="reward.requiredEra"
                clearable
                :options="lookup.eras.value"
                placeholder="选择时代..."
              />
            </fieldset>
            <fieldset class="fieldset md:col-span-2">
              <legend class="fieldset-legend text-xs">map 列表 (每项可单独覆盖概率)</legend>
              <div class="space-y-2">
                <div
                  v-for="(mapRule, mapIdx) in reward.maps"
                  :key="`reward-${idx}-map-${mapIdx}`"
                  class="grid grid-cols-1 md:grid-cols-[2fr_1fr_auto] gap-2 items-end"
                >
                  <SearchableSelect
                    v-model="mapRule.key"
                    clearable
                    :options="lookup.maps.value"
                    placeholder="选择地图..."
                  />
                  <input
                    v-model="mapRule.probabilityText"
                    type="number"
                    min="0"
                    class="input input-sm w-full"
                    placeholder="概率覆盖(可选)"
                  />
                  <button class="btn btn-xs btn-error btn-soft" @click="removeRewardMap(idx, mapIdx)">
                    <Icon icon="tabler:trash" />
                  </button>
                </div>
                <button class="btn btn-xs" @click="addRewardMap(idx)">
                  <Icon icon="tabler:plus" />
                  添加地图规则
                </button>
              </div>
            </fieldset>
          </div>

          <div class="flex items-center justify-between">
            <label class="label cursor-pointer justify-start gap-2">
              <input v-model="reward.guaranteed" type="checkbox" class="checkbox checkbox-sm" />
              <span class="label-text text-xs">guaranteed 必定掉落</span>
            </label>
            <button class="btn btn-xs btn-error btn-soft" @click="removeReward(idx)">
              <Icon icon="tabler:trash" />
              删除奖励
            </button>
          </div>
        </div>

        <button class="btn btn-xs" @click="addReward">
          <Icon icon="tabler:plus" />
          添加奖励项
        </button>
      </div>
    </fieldset>

    <fieldset class="fieldset">
      <legend class="fieldset-legend">高级属性 (JSON)</legend>
      <textarea v-model="form.extraJson" class="textarea textarea-sm w-full font-mono text-xs" rows="3"></textarea>
    </fieldset>

    <div v-if="jsonErrors.length" class="alert alert-warning alert-soft text-xs">
      <Icon icon="tabler:alert-circle" />
      <span>JSON 校验异常：{{ jsonErrors.join('；') }}</span>
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

interface RequiredItemFormRow {
  keys: string[]
  quantity: number
  useText: string
}

interface RewardMapFormRow {
  key: string
  probabilityText: string
}

interface RewardFormRow {
  key: string
  quantityMin: number
  quantityMaxText: string
  probability: number
  guaranteed: boolean
  maps: RewardMapFormRow[]
  requiredItems: string[]
  requiredEra: string
}

const form = reactive({
  key: '',
  name: '',
  category: '',
  description: '',
  timeRequired: undefined as number | undefined,
  cooldown: undefined as number | undefined,
  maps: [] as string[],
  requiredTechs: [] as string[],
  requiredItems: [] as RequiredItemFormRow[],
  rewards: [] as RewardFormRow[],
  extraJson: '',
})
const syncingFromModel = ref(false)
const lastSnapshot = ref('')

function snapshot(value: Record<string, unknown>): string {
  return JSON.stringify(value)
}

function checkJson(raw: string): string {
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
    ['advanced', checkJson(form.extraJson)],
  ].filter(([, err]) => err)

  return rows.map(([field, err]) => `${field}: ${err}`)
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

function toKeyArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String)
  if (value === undefined || value === null || value === '') return []
  return [String(value)]
}

function toRewardMapRows(value: unknown): RewardMapFormRow[] {
  if (!Array.isArray(value)) return []
  return value
    .map(entry => {
      if (typeof entry === 'string') {
        return { key: entry, probabilityText: '' }
      }

      if (entry && typeof entry === 'object') {
        const raw = entry as Record<string, unknown>
        const key = String(raw.key ?? '').trim()
        if (!key) return null
        const probability = raw.probability
        return {
          key,
          probabilityText: typeof probability === 'number' && Number.isFinite(probability) ? String(probability) : '',
        }
      }

      return null
    })
    .filter((item): item is RewardMapFormRow => Boolean(item))
}

function addRequiredItem(): void {
  form.requiredItems.push({ keys: [], quantity: 1, useText: '' })
}

function removeRequiredItem(index: number): void {
  form.requiredItems.splice(index, 1)
}

function addReward(): void {
  form.rewards.push({
    key: '',
    quantityMin: 1,
    quantityMaxText: '',
    probability: 1000,
    guaranteed: false,
    maps: [],
    requiredItems: [],
    requiredEra: '',
  })
}

function removeReward(index: number): void {
  form.rewards.splice(index, 1)
}

function addRewardMap(rewardIndex: number): void {
  form.rewards[rewardIndex]?.maps.push({ key: '', probabilityText: '' })
}

function removeRewardMap(rewardIndex: number, mapIndex: number): void {
  form.rewards[rewardIndex]?.maps.splice(mapIndex, 1)
}

function applyFromValue(value: Record<string, unknown>): void {
  syncingFromModel.value = true
  form.key = String(value.key ?? '')
  form.name = String(value.name ?? '')
  form.category = String(value.category ?? '')
  form.description = String(value.description ?? '')
  form.timeRequired = typeof value.time_required === 'number' ? value.time_required : undefined
  form.cooldown = typeof value.cooldown === 'number' ? value.cooldown : undefined
  form.maps = Array.isArray(value.map) ? [...value.map].map(String) : []
  form.requiredTechs = Array.isArray(value.required_techs) ? [...value.required_techs].map(String) : []

  form.requiredItems = Array.isArray(value.required_items)
    ? value.required_items.map(item => {
      const row = (item || {}) as Record<string, unknown>
      const useValue = row.use
      return {
        keys: toKeyArray(row.key),
        quantity: typeof row.quantity === 'number' && Number.isFinite(row.quantity) ? row.quantity : 1,
        useText: typeof useValue === 'number' && Number.isFinite(useValue) ? String(useValue) : '',
      }
    })
    : []

  form.rewards = Array.isArray(value.rewards)
    ? value.rewards.map(entry => {
      const reward = (entry || {}) as Record<string, unknown>
      const quantity = reward.quantity
      const quantityArray = Array.isArray(quantity) ? quantity : []
      const quantityMin = typeof quantity === 'number' && Number.isFinite(quantity)
        ? quantity
        : typeof quantityArray[0] === 'number' && Number.isFinite(quantityArray[0])
          ? Number(quantityArray[0])
          : 1
      const quantityMaxText = typeof quantityArray[1] === 'number' && Number.isFinite(quantityArray[1])
        ? String(quantityArray[1])
        : ''

      return {
        key: String(reward.key ?? ''),
        quantityMin,
        quantityMaxText,
        probability: typeof reward.probability === 'number' && Number.isFinite(reward.probability) ? reward.probability : 1000,
        guaranteed: Boolean(reward.guaranteed),
        maps: toRewardMapRows(reward.map),
        requiredItems: toKeyArray(reward.required_item),
        requiredEra: String(reward.required_era ?? ''),
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
  if (form.category.trim()) value.category = form.category.trim()
  if (form.description.trim()) value.description = form.description.trim()
  if (typeof form.timeRequired === 'number') value.time_required = form.timeRequired
  if (typeof form.cooldown === 'number') value.cooldown = form.cooldown

  if (form.maps.length > 0) value.map = [...form.maps]
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

  const rewards = form.rewards
    .map(reward => {
      const key = reward.key.trim()
      if (!key) return null

      const quantityMax = parseOptionalNumber(reward.quantityMaxText)
      const quantity = typeof quantityMax === 'number'
        ? [reward.quantityMin, quantityMax]
        : reward.quantityMin

      const row: Record<string, unknown> = {
        key,
        quantity,
        probability: typeof reward.probability === 'number' && Number.isFinite(reward.probability) ? reward.probability : 1000,
      }

      if (reward.guaranteed) row.guaranteed = true

      const requiredItem = buildSingleOrArray(reward.requiredItems)
      if (requiredItem) row.required_item = requiredItem

      const requiredEra = reward.requiredEra.trim()
      if (requiredEra) row.required_era = requiredEra

      const map: Array<string | { key: string; probability?: number }> = []
      for (const entry of reward.maps) {
        const keyPart = entry.key.trim()
        if (!keyPart) continue

        const probability = parseOptionalNumber(entry.probabilityText)
        if (typeof probability === 'number') {
          map.push({ key: keyPart, probability })
        } else {
          map.push(keyPart)
        }
      }

      if (map.length > 0) row.map = map

      return row
    })
    .filter((item): item is Record<string, unknown> => Boolean(item))

  if (rewards.length > 0) {
    value.rewards = rewards
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
