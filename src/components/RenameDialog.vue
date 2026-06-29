<template>
  <Teleport to="body">
    <Transition name="overlay-fade">
      <div v-if="visible" class="rename-overlay" @click.self="cancel">
        <div class="rename-card">
          <h3 class="rename-title flex items-center gap-2">
            <Icon icon="icon-park-outline:edit" class="text-base" /> 修改命名
          </h3>

          <div class="form-group">
            <label class="form-label">名称</label>
            <input v-model="name" class="input input-bordered w-full" maxlength="30" @keyup.enter="confirm" />
          </div>

          <div class="form-group">
            <label class="form-label">备注</label>
            <textarea v-model="note" class="textarea textarea-bordered w-full" rows="2"></textarea>
          </div>

          <div class="rename-actions">
            <button class="btn btn-ghost btn-sm" @click="cancel">取消</button>
            <button class="btn btn-primary btn-sm" :disabled="!name.trim()" @click="confirm">保存</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { usePackStore } from '@/stores/modules/pack'

const props = defineProps<{
  visible: boolean
  itemKey: string | null
}>()

const emit = defineEmits<{ done: [] }>()

const packStore = usePackStore()
const name = ref('')
const note = ref('')

watch(() => props.visible, (v) => {
  if (v && props.itemKey) {
    const rename = packStore.itemRenames[props.itemKey]
    name.value = rename?.customName || packStore.getDisplayName(props.itemKey)
    note.value = rename?.note || ''
  }
})

function confirm() {
  if (!props.itemKey || !name.value.trim()) return
  packStore.setItemName(props.itemKey, name.value.trim())
  packStore.setItemNote(props.itemKey, note.value.trim())
  emit('done')
}

function cancel() {
  emit('done')
}
</script>

<style scoped>
.rename-overlay {
  position: fixed; inset: 0; z-index: 9998;
  display: flex; align-items: center; justify-content: center;
  background: rgba(0,0,0,0.5); backdrop-filter: blur(4px);
  padding: 16px;
}
.overlay-fade-enter-active { transition: opacity 0.2s; }
.overlay-fade-leave-active { transition: opacity 0.15s; }
.overlay-fade-enter-from,.overlay-fade-leave-to { opacity: 0; }
.rename-card {
  background: oklch(var(--b1)); border: 1px solid oklch(var(--b3));
  border-radius: 12px; padding: 24px; width: 100%; max-width: 360px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.3);
}
.rename-title { font-size: 16px; font-weight: 700; margin-bottom: 16px; }
.form-group { margin-bottom: 12px; }
.form-label { display: block; font-size: 12px; font-weight: 600; margin-bottom: 4px; opacity: 0.8; }
.rename-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px; }
</style>
