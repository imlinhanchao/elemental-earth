<template>
  <div class="space-y-4">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <fieldset class="fieldset">
        <legend class="fieldset-legend">时代标识符 (Key)</legend>
        <input v-model="form.key" class="input input-sm w-full" placeholder="$new_era" />
      </fieldset>

      <fieldset class="fieldset">
        <legend class="fieldset-legend">时代名称</legend>
        <input v-model="form.name" class="input input-sm w-full" />
      </fieldset>

      <fieldset class="fieldset">
        <legend class="fieldset-legend">时代图标 (Iconify ID)</legend>
        <input v-model="form.icon" class="input input-sm w-full" placeholder="tabler:hourglass" />
      </fieldset>

      <fieldset class="fieldset">
        <legend class="fieldset-legend">排序权重 (Order)</legend>
        <input type="number" v-model.number="form.order" class="input input-sm w-full" />
      </fieldset>
    </div>

    <fieldset class="fieldset">
      <legend class="fieldset-legend">时代背景描述</legend>
      <textarea v-model="form.description" class="textarea textarea-sm w-full" rows="2"></textarea>
    </fieldset>

    <fieldset class="fieldset">
      <legend class="fieldset-legend">里程碑清单 (milestones)</legend>
      <div class="space-y-2">
        <div
          v-for="(milestone, idx) in form.milestones"
          :key="`milestone-${idx}`"
          class="rounded-box border border-base-300 p-3 grid grid-cols-1 md:grid-cols-[1fr_2fr_auto] gap-2 items-end"
        >
          <fieldset class="fieldset">
            <legend class="fieldset-legend text-xs">里程碑 Key</legend>
            <input v-model="milestone.key" class="input input-sm w-full" placeholder="stone_milestone" />
          </fieldset>
          <fieldset class="fieldset">
            <legend class="fieldset-legend text-xs">描述</legend>
            <input v-model="milestone.description" class="input input-sm w-full" placeholder="获取石器时代核心物品" />
          </fieldset>
          <button class="btn btn-xs btn-error btn-soft" @click="removeMilestone(idx)">
            <Icon icon="tabler:trash" />
            删除
          </button>
        </div>

        <button class="btn btn-xs" @click="addMilestone">
          <Icon icon="tabler:plus" />
          添加里程碑
        </button>
      </div>
    </fieldset>

    <fieldset class="fieldset">
      <legend class="fieldset-legend">高级配置/附加属性 (JSON)</legend>
      <textarea v-model="form.extraJson" class="textarea textarea-sm w-full font-mono text-xs" rows="3"></textarea>
    </fieldset>

    <div v-if="jsonErrors.length" class="alert alert-warning alert-soft text-xs">
      <Icon icon="tabler:alert-circle" />
      <span>配置异常：{{ jsonErrors.join('；') }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import type { BuilderPatchOperation } from '@/views/mods/builder/types'

const _props = defineProps<{ op: BuilderPatchOperation }>()
const model = defineModel<Record<string, unknown>>({ required: true })

interface MilestoneFormRow {
  key: string
  description: string
}

const form = reactive({
  key: '',
  name: '',
  icon: '',
  description: '',
  order: undefined as number | undefined,
  milestones: [] as MilestoneFormRow[],
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

function addMilestone(): void {
  form.milestones.push({ key: '', description: '' })
}

function removeMilestone(index: number): void {
  form.milestones.splice(index, 1)
}

function applyFromValue(value: Record<string, unknown>): void {
  syncingFromModel.value = true
  form.key = String(value.key ?? '')
  form.name = String(value.name ?? '')
  form.icon = String(value.icon ?? '')
  form.description = String(value.description ?? '')
  form.order = typeof value.order === 'number' ? value.order : undefined
  form.milestones = Array.isArray(value.milestones)
    ? value.milestones.map(entry => {
      const milestone = (entry || {}) as Record<string, unknown>
      return {
        key: String(milestone.key ?? ''),
        description: String(milestone.description ?? ''),
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
  if (form.icon.trim()) value.icon = form.icon.trim()
  if (form.description.trim()) value.description = form.description.trim()
  if (typeof form.order === 'number') value.order = form.order

  const milestones = form.milestones
    .map(item => {
      const key = item.key.trim()
      const description = item.description.trim()
      if (!key || !description) return null
      return { key, description }
    })
    .filter((item): item is { key: string; description: string } => Boolean(item))

  if (milestones.length > 0) {
    value.milestones = milestones
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
