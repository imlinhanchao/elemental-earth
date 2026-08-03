<template>
  <div class="space-y-4">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <fieldset class="fieldset">
        <legend class="fieldset-legend">地图标识符 (Key)</legend>
        <input v-model="form.key" class="input input-sm w-full" placeholder="$new_map" />
      </fieldset>

      <fieldset class="fieldset">
        <legend class="fieldset-legend">显示名称</legend>
        <input v-model="form.name" class="input input-sm w-full" />
      </fieldset>

      <fieldset class="fieldset">
        <legend class="fieldset-legend">图标 (Iconify ID)</legend>
        <input v-model="form.icon" class="input input-sm w-full" placeholder="tabler:map" />
      </fieldset>

      <fieldset class="fieldset">
        <legend class="fieldset-legend">地图坐标 (X / Y)</legend>
        <div class="join w-full">
          <input type="number" v-model.number="form.position.x" class="input input-sm join-item w-1/2" placeholder="X坐标" />
          <input type="number" v-model.number="form.position.y" class="input input-sm join-item w-1/2" placeholder="Y坐标" />
        </div>
      </fieldset>
    </div>

    <fieldset class="fieldset">
      <legend class="fieldset-legend">区域描述</legend>
      <textarea v-model="form.description" class="textarea textarea-sm w-full" rows="3"></textarea>
    </fieldset>

    <div v-if="jsonError" class="alert alert-warning alert-soft text-xs">
      <Icon icon="tabler:alert-circle" />
      <span>JSON 配置异常：{{ jsonError }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { BuilderPatchOperation } from '@/views/mods/builder/types'
import type { IMap } from '@/data/maps';

const props = defineProps<{
  op: BuilderPatchOperation
}>()

const form = defineModel<IMap>({
  required: true,
  default: () => ({
    key: '',
    name: '',
    icon: '',
    description: '',
    position: { x: 0, y: 0 },
  }),
})
</script>
