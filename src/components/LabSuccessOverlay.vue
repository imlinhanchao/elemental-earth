<template>
  <Teleport to="body">
    <Transition name="overlay-fade">
      <div v-if="visible" class="lab-success-overlay bg-base-100/70" @click="close">
        <div class="success-content bg-base-100 border-4 border-primary shadow-2xl rounded-[2rem]" @click.stop>
          <div class="success-header">
            <Icon icon="fluent:beaker-sparkle-16-filled" class="header-icon text-primary" />
            <h2 class="title from-base-content to-primary bg-gradient-to-b bg-clip-text text-transparent">发现新配方！</h2>
          </div>

          <div class="formula-info bg-primary/10 rounded-2xl">
            <div class="formula-name text-primary">{{ formulaName }}</div>
            <div class="formula-desc opacity-80">{{ formulaDesc }}</div>
          </div>

          <div class="products-list">
            <div class="list-title opacity-50">获得产物</div>
            <div class="items-grid">
              <div v-for="p in products" :key="p.key" class="product-item">
                <div class="badge badge-primary badge-lg py-4 px-4 gap-2 shadow-lg scale-110">
                  <span class="product-name font-bold">{{ packStore.getDisplayName(p.key) }}</span>
                  <span class="product-qty opacity-80 text-sm">x{{ p.quantity }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="footer-hint opacity-40">点击任意处关闭</div>
        </div>

        <!-- 纸屑粒子效果 -->
        <div class="confetti-container">
          <div v-for="i in 30" :key="i" class="confetti" :style="confettiStyle(i)"></div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { usePackStore } from '@/stores/modules/pack'
import { Formulas } from '@/data/formula'
import Icon from './Icon.vue'

const props = defineProps<{
  visible: boolean
  formulaKey: string | null
  products: { key: string; quantity: number }[]
}>()

const emit = defineEmits<{
  close: []
}>()

const packStore = usePackStore()

const formulaName = computed(() => {
  if (!props.formulaKey) return ''
  const f = Formulas.find(fm => fm.key === props.formulaKey)
  return f?.name || '未知配方'
})

const formulaDesc = computed(() => {
  if (!props.formulaKey) return ''
  const f = Formulas.find(fm => fm.key === props.formulaKey)
  return f?.description || ''
})

function close() {
  emit('close')
}

function confettiStyle(i: number) {
  const colors = ['#3498db', '#e74c3c', '#2ecc71', '#f1c40f', '#9b59b6', '#e67e22']
  return {
    left: `${Math.random() * 100}%`,
    top: `-10px`,
    backgroundColor: colors[Math.floor(Math.random() * colors.length)],
    width: `${Math.random() * 10 + 5}px`,
    height: `${Math.random() * 10 + 5}px`,
    animationDelay: `${Math.random() * 2}s`,
    animationDuration: `${Math.random() * 2 + 1}s`,
    transform: `rotate(${Math.random() * 360}deg)`
  }
}
</script>

<style scoped>
.lab-success-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
}

.success-content {
  padding: 2.5rem;
  width: 90%;
  max-width: 480px;
  position: relative;
  text-align: center;
  transform: perspective(1000px) rotateX(2deg);
  animation: content-pop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

@keyframes content-pop {
  from { transform: perspective(1000px) rotateX(10deg) scale(0.8); opacity: 0; }
  to { transform: perspective(1000px) rotateX(2deg) scale(1); opacity: 1; }
}

.success-header {
  margin-bottom: 2rem;
}

.header-icon {
  font-size: 5rem;
  margin-bottom: 1rem;
  animation: icon-float 3s ease-in-out infinite;
}

@keyframes icon-float {
  0%, 100% { transform: translateY(0) scale(1.1); }
  50% { transform: translateY(-10px) scale(1.2); }
}

.title {
  font-size: 2.5rem;
  font-weight: 900;
  margin: 0;
}

.formula-info {
  margin-bottom: 2rem;
  padding: 1.5rem;
}

.formula-name {
  font-size: 1.5rem;
  font-weight: bold;
  margin-bottom: 0.5rem;
}

.formula-desc {
  font-size: 0.9rem;
  line-height: 1.4;
}

.products-list {
  margin-bottom: 2rem;
}

.list-title {
  font-size: 0.8rem;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: 1rem;
}

.items-grid {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 1.5rem;
}

.footer-hint {
  font-size: 0.8rem;
  margin-top: 1rem;
  animation: blink 2s infinite;
}

@keyframes blink {
  0%, 100% { opacity: 0.2; }
  50% { opacity: 0.6; }
}

/* 纸屑粒子 */
.confetti-container {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.confetti {
  position: absolute;
  animation: confetti-fall linear forwards;
}

@keyframes confetti-fall {
  0% { transform: translateY(-10px) rotate(0deg); opacity: 1; }
  100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
}

.overlay-fade-enter-active, .overlay-fade-leave-active { transition: opacity 0.5s; }
.overlay-fade-enter-from, .overlay-fade-leave-to { opacity: 0; }
</style>
