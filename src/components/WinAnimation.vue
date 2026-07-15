<script setup lang="ts">
import { computed } from 'vue'
import { useStateStore } from '@/stores/modules/state'
import { usePackStore } from '@/stores/modules/pack'
import { ELEMENTS } from '@/data/elements'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const stateStore = useStateStore()
const packStore = usePackStore()

const totalElements = computed(() => ELEMENTS.filter(e => e.category !== 'placeholder').length)
const unlockedElements = computed(() => stateStore.state.elements?.length || 0)
const discoveredSubstances = computed(() => packStore.discoveredItems.size)

const stats = computed(() => stateStore.state.stats)

const quote = "物质不会消失，它只会以另一种形式点亮星空。"
</script>

<template>
  <Teleport to="body">
    <Transition name="win-overlay-fade">
      <div v-if="visible" class="win-overlay" @click="emit('close')">
        <div class="win-stars">
          <div v-for="i in 100" :key="i" class="star" :style="{
            left: Math.random() * 100 + '%',
            top: Math.random() * 100 + '%',
            animationDelay: Math.random() * 5 + 's',
            opacity: 0.2 + Math.random() * 0.8
          }"></div>
        </div>

        <div class="win-content" @click.stop>
          <div class="aura aura-rainbow aura-xl p-1 rounded-3xl">
            <div class="win-card card bg-base-100/80 backdrop-blur-xl border border-white/10 shadow-2xl">
              <div class="card-body items-center text-center p-8 md:p-12">
                <h1 class="win-title mb-2">MAGNUM OPUS</h1>
                <div class="divider divider-neutral opacity-50 w-32 mx-auto"></div>
                <h2 class="text-2xl md:text-3xl font-light tracking-[0.5em] mb-8 text-white/90">伟大的工作已圆满完成</h2>

                <div class="grid grid-cols-2 md:grid-cols-3 gap-6 mb-10 w-full">
                  <div class="stat-item p-4 rounded-2xl bg-white/5 border border-white/5">
                    <div class="text-xs opacity-50 mb-1 uppercase tracking-widest">元素归位</div>
                    <div class="text-2xl font-bold font-mono">{{ unlockedElements }} / {{ totalElements }}</div>
                  </div>
                  <div class="stat-item p-4 rounded-2xl bg-white/5 border border-white/5">
                    <div class="text-xs opacity-50 mb-1 uppercase tracking-widest">发现物质</div>
                    <div class="text-2xl font-bold font-mono">{{ discoveredSubstances }}</div>
                  </div>
                  <div class="stat-item p-4 rounded-2xl bg-white/5 border border-white/5">
                    <div class="text-xs opacity-50 mb-1 uppercase tracking-widest">挖掘采石</div>
                    <div class="text-2xl font-bold font-mono">{{ stats.mining }}</div>
                  </div>
                  <div class="stat-item p-4 rounded-2xl bg-white/5 border border-white/5">
                    <div class="text-xs opacity-50 mb-1 uppercase tracking-widest">披荆斩棘</div>
                    <div class="text-2xl font-bold font-mono">{{ stats.woodcutting }}</div>
                  </div>
                  <div class="stat-item p-4 rounded-2xl bg-white/5 border border-white/5">
                    <div class="text-xs opacity-50 mb-1 uppercase tracking-widest">汲取生命</div>
                    <div class="text-2xl font-bold font-mono">{{ stats.water }}</div>
                  </div>
                  <div class="stat-item p-4 rounded-2xl bg-white/5 border border-white/5">
                    <div class="text-xs opacity-50 mb-1 uppercase tracking-widest">荒野猎迹</div>
                    <div class="text-2xl font-bold font-mono">{{ stats.hunting }}</div>
                  </div>
                </div>

                <div class="quote-section mb-10">
                  <p class="text-lg italic font-serif text-white/80 leading-relaxed">
                    “{{ quote }}”
                  </p>
                </div>

                <div class="card-actions flex flex-col items-center gap-4">
                  <button class="btn btn-lg btn-wide btn-primary aura aura-glow border-none" @click="emit('close')">
                    继续旅程
                  </button>
                  <p class="text-xs opacity-40">你可以继续探索，解锁更多配方与物质</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.win-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle at center, #1a1a2e 0%, #0a0a0c 100%);
  overflow: hidden;
}

.win-stars {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.star {
  position: absolute;
  width: 2px;
  height: 2px;
  background: white;
  border-radius: 50%;
  animation: star-move 20s linear infinite, twinkle 2s ease-in-out infinite;
}

@keyframes star-move {
  from { transform: translateY(0); }
  to { transform: translateY(-100vh); }
}

@keyframes twinkle {
  0%, 100% { opacity: 0.3; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.5); }
}

.win-content {
  position: relative;
  z-index: 10;
  width: 90%;
  max-width: 800px;
  animation: content-pop 1.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes content-pop {
  from { opacity: 0; transform: scale(0.8) translateY(30px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

.win-card {
  border-radius: 1.5rem;
  overflow: hidden;
}

.win-title {
  font-size: 4rem;
  font-weight: 900;
  color: #fff;
  letter-spacing: 0.2em;
  text-shadow: 0 0 30px rgba(255, 255, 255, 0.4);
  animation: title-glow 3s ease-in-out infinite alternate;
}

@keyframes title-glow {
  from { text-shadow: 0 0 20px rgba(255, 255, 255, 0.4); }
  to { text-shadow: 0 0 50px rgba(255, 255, 255, 0.8), 0 0 100px rgba(255, 255, 255, 0.3); }
}

.stat-item {
  transition: all 0.3s ease;
}

.stat-item:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: translateY(-4px);
  border-color: rgba(255, 255, 255, 0.2);
}

.win-overlay-fade-enter-active,
.win-overlay-fade-leave-active {
  transition: opacity 1s ease;
}

.win-overlay-fade-enter-from,
.win-overlay-fade-leave-to {
  opacity: 0;
}

@media (max-width: 640px) {
  .win-title {
    font-size: 2.5rem;
  }
}
</style>
