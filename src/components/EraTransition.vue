<template>
  <Teleport to="body">
    <Transition name="overlay">
      <div v-if="visible" class="era-overlay">
        <div class="era-content">
          <div class="era-sparkle">✦</div>
          <div class="era-label">新时代</div>
          <div class="era-icon" v-html="eraIcon"></div>
          <h2 class="era-name">{{ era?.name }}</h2>
          <p class="era-desc">{{ era?.description }}</p>
          <div class="era-continue" @click="$emit('done')">点击继续</div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Eras } from '@/data/eras'

const props = defineProps<{
  visible: boolean
  eraKey: string | null
}>()

defineEmits<{ done: [] }>()

const era = computed(() => (props.eraKey ? Eras.find(e => e.key === props.eraKey) : null))

const iconMap: Record<string, string> = {
  'tabler:pick': '⛏️',
  'tabler:flask': '⚗️',
  'tabler:flask-2': '🧪',
  'tabler:battery': '⚡',
  'tabler:diamond': '💎',
}

const eraIcon = computed(() => iconMap[era.value?.icon || ''] || '✦')
</script>

<style scoped>
.era-overlay {
  position: fixed; inset: 0; z-index: 9999;
  display: flex; align-items: center; justify-content: center;
  background: radial-gradient(ellipse at center, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.9) 100%);
  backdrop-filter: blur(8px);
  cursor: pointer;
}
.overlay-enter-active { transition: opacity 0.6s; }
.overlay-leave-active { transition: opacity 0.5s; }
.overlay-enter-from, .overlay-leave-to { opacity: 0; }

.era-content {
  text-align: center;
  color: #fff;
  animation: eraIn 0.8s ease-out;
}
@keyframes eraIn {
  0% { transform: scale(0.5); opacity: 0; }
  60% { transform: scale(1.05); }
  100% { transform: scale(1); opacity: 1; }
}

.era-sparkle {
  font-size: 60px;
  opacity: 0.3;
  animation: sparkle 2s ease-in-out infinite;
}
@keyframes sparkle {
  0%, 100% { opacity: 0.2; transform: rotate(0deg) scale(1); }
  50% { opacity: 0.6; transform: rotate(180deg) scale(1.2); }
}

.era-label {
  font-size: 14px;
  letter-spacing: 6px;
  text-transform: uppercase;
  opacity: 0.5;
  margin-bottom: 8px;
}
.era-icon {
  font-size: 72px;
  margin-bottom: 16px;
  filter: drop-shadow(0 0 30px rgba(255,200,50,0.4));
}
.era-name {
  font-size: 36px;
  font-weight: 800;
  margin-bottom: 12px;
  text-shadow: 0 0 40px rgba(255,200,50,0.3);
}
.era-desc {
  font-size: 15px;
  opacity: 0.7;
  max-width: 360px;
  line-height: 1.6;
  margin: 0 auto;
}
.era-continue {
  margin-top: 40px;
  font-size: 13px;
  opacity: 0.4;
  animation: pulse 1.5s ease-in-out infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.7; }
}
</style>
