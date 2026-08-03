<template>
  <div class="card bg-base-100 border border-base-300 shadow-sm">
    <div class="card-body p-4 gap-3">
      <div class="flex flex-wrap items-center gap-2">
        <h2 class="card-title text-base inline-flex items-center gap-2">
          <Icon icon="tabler:stack-3" />
          Patch 工作台
        </h2>
        <div class="join ml-auto">
          <button class="btn btn-sm join-item" @click="addRow">
            <Icon icon="tabler:plus" />
            新增补丁
          </button>
        </div>
      </div>

      <div class="text-xs text-base-content/70">
        已禁用 remove 操作；当前版本仅支持 add / override / merge。
      </div>

      <div v-if="rows.length === 0" class="alert alert-info alert-soft text-sm">
        <Icon icon="tabler:info-circle" />
        <span>还没有补丁，点击“新增补丁”开始配置。</span>
      </div>

      <div v-else class="space-y-3">
        <div class="tabs tabs-box tabs-sm w-full overflow-x-auto">
          <button
            v-for="(row, index) in rows"
            :key="row.id"
            role="tab"
            class="tab flex-none gap-2"
            :class="activeRowIdx === index ? 'tab-active' : ''"
            @click="activeRowIdx = index"
          >
            <span class="truncate max-w-40">{{ getRowLabel(row) }}</span>
            <span class="badge badge-xs badge-soft">{{ row.model }}</span>
          </button>
        </div>

        <PatchRowEditor
          v-if="rows[activeRowIdx]"
          :key="`${rows[activeRowIdx].id}-${rows[activeRowIdx].model}`"
          v-model:row="rows[activeRowIdx]"
          @remove="removeRow"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { BuilderPatchRow } from '@/views/mods/builder/types'
import PatchRowEditor from './PatchRowEditor.vue'

const rows = defineModel<BuilderPatchRow[]>("rows", { required: true })

const emit = defineEmits<{
  (e: 'add-row'): void
  (e: 'remove-row', id: string): void
}>()

const activeRowIdx = ref(0)
function getRowLabel(row: BuilderPatchRow): string {
  const key = (row.targetKey || row.value?.name as string)?.trim()
  if (key) return `${key} (${row.op})`
  return `${row.id.slice(-4)} (${row.op})`
}

function addRow(): void {
  emit('add-row')
}

function removeRow(id: string): void {
  emit('remove-row', id)
}

</script>
