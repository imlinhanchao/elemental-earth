<template>
  <div class="card bg-base-100 border border-base-300">
    <div class="card-body p-4 gap-4">
      <div class="flex flex-wrap items-center gap-4">
        <fieldset class="fieldset">
          <legend class="fieldset-legend text-xs opacity-60">数据模型</legend>
          <select v-model="draft.model" class="select select-sm w-48">
            <option v-for="model in models" :key="model.key" :value="model.key">{{ model.label }}</option>
          </select>
        </fieldset>

        <fieldset class="fieldset">
          <legend class="fieldset-legend text-xs opacity-60">修改操作</legend>
          <select v-model="draft.op" class="select select-sm w-48">
            <option v-for="op in ops" :key="op.key" :value="op.key">{{ op.label }}</option>
          </select>
        </fieldset>

        <button class="btn btn-xs btn-error btn-soft ml-auto mt-6" @click="emit('remove', draft.id)">
          <Icon icon="tabler:trash" />
          移除此补丁
        </button>
      </div>

      <div v-if="draft.op !== 'add'" class="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-end">
        <fieldset class="fieldset">
          <legend class="fieldset-legend">目标条目标识符 (Target Key)</legend>
          <div class="join w-full">
            <input
              v-model="draft.targetKey"
              class="input input-sm join-item grow"
              :placeholder="`输入目标 ID，例如: ${targetExample}`"
              :list="targetListId"
            />
            <button class="btn btn-sm join-item" @click="loadTargetValue" :disabled="!draft.targetKey.trim()">
              <Icon icon="tabler:database-import" />
              载入基础数据
            </button>
          </div>
          <datalist :id="targetListId">
            <option v-for="key in availableKeys" :key="key" :value="key"></option>
          </datalist>
          <div class="fieldset-label text-xs">只有载入基础数据后，编辑器才会显示原始值方便你修改。</div>
        </fieldset>
      </div>

      <div class="alert alert-info alert-soft text-xs py-2 px-3">
        <Icon icon="tabler:info-circle" />
        <span v-if="draft.op === 'add'">【新增】创建一个全新的条目。注意：新 Key 必须以 $ 符号开头。</span>
        <span v-else-if="draft.op === 'override'">【覆盖】用下方数据完整替换目标 Key 对应条目。</span>
        <span v-else>【合并】将下方数据合并到目标条目（对象合并，数组追加）。</span>
      </div>

      <div class="divider my-0"></div>

      <component
        v-if="editorComponent"
        :is="editorComponent"
        v-model="draft.value"
        :op="draft.op"
        :key="editorComponentKey"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { BuilderPatchRow } from '@/views/mods/builder/types'
import { BUILDER_MODELS, BUILDER_OPS } from '@/views/mods/builder/types'
import { getModelEntry, listModelKeys } from '@/views/mods/builder/helpers'
import ActionsPatchFields from './models/ActionsPatchFields.vue'
import ErasPatchFields from './models/ErasPatchFields.vue'
import FormulasPatchFields from './models/FormulasPatchFields.vue'
import ItemsPatchFields from './models/ItemsPatchFields.vue'
import LabsPatchFields from './models/LabsPatchFields.vue'
import MapsPatchFields from './models/MapsPatchFields.vue'
import TechsPatchFields from './models/TechsPatchFields.vue'
import TipsPatchFields from './models/TipsPatchFields.vue'

const emit = defineEmits<{
  (e: 'remove', id: string): void
}>()

const models = BUILDER_MODELS
const ops = BUILDER_OPS

const draft = defineModel<BuilderPatchRow>("row", { required: true })

const editorMap = {
  items: ItemsPatchFields,
  actions: ActionsPatchFields,
  formulas: FormulasPatchFields,
  labs: LabsPatchFields,
  techs: TechsPatchFields,
  maps: MapsPatchFields,
  tips: TipsPatchFields,
  eras: ErasPatchFields,
}

const editorComponent = computed(() => editorMap[draft.value.model] || ItemsPatchFields)

const targetExampleMap: Record<string, string> = {
  items: 'stone',
  actions: 'mining',
  formulas: 'clay_production',
  labs: 'stirring',
  techs: 'wood_processing',
  maps: 'forest',
  tips: 'tip-001',
  eras: 'stone_age',
}

const targetExample = computed(() => targetExampleMap[draft.value.model])
const targetListId = computed(() => `mod-target-keys-${draft.value.id}`)
const availableKeys = computed(() => listModelKeys(draft.value.model))
const editorEpoch = ref(0)
const editorComponentKey = computed(() => `${draft.value.id}-${draft.value.model}-${editorEpoch.value}`)

watch(
  () => draft.value.model,
  (next, prev) => {
    if (next === prev) return

    editorEpoch.value += 1
    draft.value.targetKey = ''
    draft.value.value = {}
  },
)

function loadTargetValue(): void {
  const key = draft.value.targetKey.trim()
  if (!key) return

  const value = getModelEntry(draft.value.model, key)
  if (!value) {
    alert(`未找到目标条目：${key}`)
    return
  }

  draft.value.value = value
}
</script>
