<template>
  <Teleport to="body">
    <Transition name="overlay-fade">
      <div v-if="visible" class="discovery-overlay">
        <div class="discovery-card">
          <h2 class="discovery-title flex items-center justify-center gap-2">
            <Icon class="inline text-3xl" icon="game-icons:stone-block" /> 发现新材料！
          </h2>

          <div class="discovery-desc">你发现了 <b>{{ itemData?.description }}</b></div>

          <div class="form-group">
            <label class="form-label">为这个材料命名</label>
            <input
              ref="nameInput"
              v-model="name"
              class="input input-bordered w-full"
              placeholder="输入你给这个材料起的名字…"
              maxlength="30"
              @keyup.enter="confirm"
            />
            <span class="form-hint">之后可在物品备注中修改</span>
          </div>

          <div class="form-group">
            <label class="form-label">备注（可选）</label>
            <textarea
              v-model="note"
              class="textarea textarea-bordered w-full"
              rows="2"
              placeholder="记录你的发现心得…"
            ></textarea>
          </div>

          <div class="discovery-actions">
            <button class="btn btn-primary btn-sm" :disabled="!name.trim()" @click="confirm">确认命名</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { getItem } from '@/data/items'
import { usePackStore } from '@/stores/modules/pack'
import { useLogStore } from '@/stores/modules/log'

const props = defineProps<{
  visible: boolean
  itemKey: string | null
}>()

const emit = defineEmits<{
  done: []
}>()

const packStore = usePackStore()
const nameInput = ref<HTMLInputElement | null>(null)
const name = ref('')
const note = ref('')

const itemData = computed(() => props.itemKey ? getItem(props.itemKey) : null)

watch(() => props.visible, async (v) => {
  if (v) {
    name.value = ''
    note.value = ''
    await nextTick()
    nameInput.value?.focus()
  }
})

function confirm() {
  if (!props.itemKey || !name.value.trim()) return
  packStore.setItemName(props.itemKey, name.value.trim())
  packStore.setItemNote(props.itemKey, note.value.trim())
  // 写入命名日志
  const logStore = useLogStore()
  const itemDef = getItem(props.itemKey)
  logStore.addLog(`🔬 发现新物质: ${name.value.trim()}`, 'elements')
  packStore.clearPendingDiscovery()
  emit('done')
}
</script>

<style scoped>
.discovery-overlay {
  position: fixed; inset: 0; z-index: 9999;
  display: flex; align-items: center; justify-content: center;
  background: rgba(0,0,0,0.7); backdrop-filter: blur(6px);
  padding: 16px;
}
.overlay-fade-enter-active { transition: opacity 0.3s; }
.overlay-fade-leave-active { transition: opacity 0.2s; }
.overlay-fade-enter-from,.overlay-fade-leave-to { opacity: 0; }

.discovery-card {
  background: oklch(var(--b1));
  border: 1px solid oklch(var(--b3));
  border-radius: 16px;
  padding: 32px;
  width: 100%; max-width: 420px;
  box-shadow: 0 8px 40px rgba(0,0,0,0.4);
  text-align: center;
}

.discovery-icon { font-size: 48px; margin-bottom: 8px; }
.discovery-title { font-size: 22px; font-weight: 800; margin-bottom: 16px; }

.discovery-desc {
  font-size: 15px; line-height: 1.7;
  color: oklch(var(--bc));
  opacity: 0.85;
  margin-bottom: 24px;
  padding: 12px 16px;
  background: oklch(var(--b2));
  border-radius: 8px;
  text-align: left;
  font-style: italic;
}

.form-group { margin-bottom: 16px; text-align: left; }
.form-label { display: block; font-size: 12px; font-weight: 600; margin-bottom: 4px; opacity: 0.8; }
.form-hint { display: block; font-size: 11px; opacity: 0.4; margin-top: 4px; }

.discovery-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px; }
</style>
