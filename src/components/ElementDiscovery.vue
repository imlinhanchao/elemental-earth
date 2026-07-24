<template>
  <Teleport to="body">
    <Transition name="overlay-fade">
      <div v-if="visible" class="discovery-overlay" @click="onOverlayClick">
        <!-- 星空背景粒子 -->
        <div class="discovery-particles">
          <span v-for="i in 40" :key="i" class="particle" :style="particleStyle(i)" />
        </div>

        <!-- 主内容 -->
        <div class="discovery-stage" :class="`stage-${stage}`">

          <!-- Phase 1: 标题 -->
          <Transition name="title-fade">
            <div v-if="stage === 1" key="title" class="discovery-title">
              <span class="title-icon">⚛️</span>
              <span class="title-text">发现新元素！</span>
            </div>
          </Transition>

          <!-- Phase 2: 3D 翻转卡片 -->
          <Transition name="card-appear">
            <div v-if="stage === 2" key="card" class="card-wrapper" ref="cardWrapperRef">
              <div class="flip-card" :class="{ flipped: cardFlipped }">
                <!-- 正面：元素符号 -->
                <div class="flip-card-front" :style="{ backgroundColor: elementColor }">
                  <span class="front-number">{{ element?.number }}</span>
                  <span class="front-symbol">{{ element?.symbol }}</span>
                  <span class="front-name">{{ element?.name }}</span>
                </div>
                <!-- 背面：元素详情 -->
                <div class="flip-card-back" :style="{ backgroundColor: elementColor }">
                  <span class="back-label">原子序数</span>
                  <span class="back-number">{{ element?.number }}</span>
                  <span class="back-symbol">{{ element?.symbol }}</span>
                  <span class="back-en-name">{{ element?.nameEn }}</span>
                  <span class="back-detail">{{ element?.name }} · {{ CATEGORY_LABELS[element?.category || 'nonmetal'] }}</span>
                  <span class="back-mass">原子量 {{ element?.mass }}</span>
                </div>
              </div>
            </div>
          </Transition>

          <!-- Phase 3: 飞向周期表 -->
          <div v-if="stage === 3" key="flying" class="flight-container">
            <div class="flight-card" ref="flightCardRef" :style="flightCardStyle">
              <div class="flight-inner" :style="{ backgroundColor: elementColor }">
                <span class="flight-symbol">{{ element?.symbol }}</span>
                <span class="flight-number">{{ element?.number }}</span>
              </div>
            </div>
            <!-- 背景网格 -->
            <div class="flight-grid" ref="flightGridRef">
              <div
                v-for="el in gridElements"
                :key="el.key"
                class="flight-cell"
                :class="{ 'target-cell': el.isTarget }"
                :style="gridCellStyle(el)"
              >
                <template v-if="el.isTarget">
                  <span class="cell-sym">{{ element?.symbol }}</span>
                  <span class="cell-num">{{ element?.number }}</span>
                </template>
              </div>
            </div>
          </div>

          <!-- 点击揭示提示（阶段 1 和阶段 3 通用） -->
          <Transition name="fade-up">
            <div v-if="waitingForClick" class="click-reveal-hint" @click.stop="reveal">
              点击揭示新元素 ✦
            </div>
          </Transition>

          <!-- Phase 4: 点亮完成 -->
          <Transition name="pulse-in">
            <div v-if="stage === 4" key="done" class="done-container">
              <div class="done-glow" :style="{ color: elementColor }">✦ {{ element?.symbol }} ✦</div>
              <div class="done-text">{{ element?.name }} 已收录至元素周期表</div>
            </div>
          </Transition>

        </div>

        <!-- 跳过提示 -->
        <div class="skip-hint">点击任意处跳过</div>

        <!-- 通关动画专门组件 -->
        <WinAnimation :visible="showWinAnimation" @close="onWinAnimationDone" />
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useStateStore } from '@/stores/modules/state'
import { ELEMENTS, getElementById, CATEGORY_LABELS, DEFAULT_CATEGORY_COLORS } from '@/data/elements'
import type { PeriodicElement, ElementCategory } from '@/data/elements'
import WinAnimation from './WinAnimation.vue'
import { Items } from '@/data/items.ts'

const props = defineProps<{
  /** 是否可见 */
  visible: boolean
  /** 要展示的元素编号 */
  elementNumber: number | null
}>()

const emit = defineEmits<{
  done: []
}>()

const router = useRouter()

// ─── 阶段控制 ──────────────────────────────────────────────────────────
const stage = ref(0)      // 0=hidden, 1=title, 2=card, 3=fly, 4=done
const cardFlipped = ref(false)
const waitingForClick = ref(false)
const showWinAnimation = ref(false)

const element = computed<PeriodicElement | undefined>(() =>
  props.elementNumber ? getElementById(props.elementNumber) : undefined
)

const elementColor = computed(() => {
  if (!element.value) return '#6b7280'
  return DEFAULT_CATEGORY_COLORS[element.value.category] || '#6b7280'
})

// ─── 动画序列 ──────────────────────────────────────────────────────────
watch(() => props.visible, async (val) => {
  if (!val || !element.value) return
  stage.value = 0
  cardFlipped.value = false

  // 先导航到 /explore
  if (router.currentRoute.value.path !== '/explore') {
    await router.push('/explore')
    await nextTick()
  }

  await sleep(200)

  // Phase 1: 标题
  stage.value = 1
  await sleep(800)

  // 停住，点击后才展示新元素
  waitingForClick.value = true
})

// ─── 飞行动画位置计算 ──────────────────────────────────────────────────
const flightCardStyle = computed(() => {
  if (!element.value || stage.value !== 3) return { display: 'none' }
  // 计算目标格在网格中的位置 (网格 936×520, 居中于视口)
  const cellW = 52  // 48px cell + 4px gap
  const cellH = 64  // 60px cell + 4px gap
  const gridW = 18 * cellW  // 936
  const gridH = 7 * cellH + 12 + 2 * cellH  // 572
  const gridOffsetX = `calc(50vw - ${gridW / 2}px)`
  const gridOffsetY = `calc(50vh - ${gridH / 2}px)`

  const targetCol = element.value.col
  const targetRow = getGridRowOffset(element.value, cellH)

  return {
    '--fly-from-x': 'calc(50vw - 24px)',
    '--fly-from-y': 'calc(50vh - 28px)',
    '--fly-to-x': `calc(${gridOffsetX} + ${(targetCol - 1) * cellW}px)`,
    '--fly-to-y': `calc(${gridOffsetY} + ${targetRow}px)`,
  } as Record<string, string>
})

function getGridRowOffset(el: PeriodicElement, cellH: number): number {
  const gap = 4
  if (el.row <= 7) return (el.row - 1) * cellH
  return 7 * cellH + 12 + (el.row - 9) * cellH
}

// ─── 周期表网格数据 ────────────────────────────────────────────────────
interface GridCell {
  key: string
  row: number
  col: number
  isTarget: boolean
  isPlaceholder: boolean
}

const gridElements = computed<GridCell[]>(() => {
  if (!element.value) return []
  const cells: GridCell[] = []
  for (const el of ELEMENTS) {
    if (el.category === 'placeholder') {
      cells.push({
        key: `ph-${el.row}-${el.col}`,
        row: el.row,
        col: el.col,
        isTarget: false,
        isPlaceholder: true,
      })
    } else {
      cells.push({
        key: `c-${el.number}`,
        row: el.row,
        col: el.col,
        isTarget: el.number === element.value.number,
        isPlaceholder: false,
      })
    }
  }
  return cells
})

function gridCellStyle(cell: GridCell): Record<string, string> {
  const cellH = cell.isPlaceholder ? 60 : 60
  const gap = 4
  const top = cell.row <= 7
    ? (cell.row - 1) * (cellH + gap)
    : 7 * (cellH + gap) + 12 + (cell.row - 9) * (cellH + gap)
  return {
    position: 'absolute',
    left: `${(cell.col - 1) * 52}px`,
    top: `${top}px`,
    width: cell.isPlaceholder ? 'auto' : '48px',
    height: cell.isPlaceholder ? 'auto' : '56px',
  }
}

// ─── 背景粒子样式 ──────────────────────────────────────────────────────
function particleStyle(i: number): Record<string, string> {
  const x = ((i * 137.5) % 100)
  const y = ((i * 97.3 + 50) % 100)
  const size = 1.5 + (i % 3)
  const delay = (i * 0.3) % 5
  return {
    left: `${x}%`,
    top: `${y}%`,
    width: `${size}px`,
    height: `${size}px`,
    animationDelay: `${delay}s`,
    opacity: String(0.3 + (i % 5) * 0.15),
  }
}

// ─── 帮助函数 ──────────────────────────────────────────────────────────
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/** 点击遮罩：等待揭示时揭示，否则跳过 */
function onOverlayClick() {
  if (waitingForClick.value) {
    reveal()
  } else {
    skip()
  }
}

/** 揭示新元素 → 播放完整动画序列 */
async function reveal() {
  if (!waitingForClick.value) return
  waitingForClick.value = false

  // Phase 2: 卡片翻转
  stage.value = 2
  await nextTick()
  await sleep(600)

  cardFlipped.value = true
  await sleep(1200)

  // Phase 3: 飞向周期表
  stage.value = 3
  await nextTick()
  await sleep(1200)

  // Phase 4: 点亮完成
  stage.value = 4
  await sleep(1500)

  // 检查是否全元素收集完成
  const stateStore = useStateStore()
  const discoveredCount = stateStore.state.elements?.length || 0
  const totalElementsCount = new Set(Items.filter(e => e.elemental).map(e => e.elemental)).size

  if (discoveredCount >= totalElementsCount) {
    await sleep(800)
    showWinAnimation.value = true
    // 通关动画由 WinAnimation 处理关闭
    return
  }

  emit('done')
}

function onWinAnimationDone() {
  showWinAnimation.value = false
  emit('done')
}

function skip() {
  if (showWinAnimation.value) return // 通关中不能直接 skip
  emit('done')
}
</script>

<style scoped>
/* ─── Overlay ────────────────────────────────────────────────── */
.discovery-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.88);
  backdrop-filter: blur(8px);
  cursor: pointer;
  overflow: hidden;
}

.overlay-fade-enter-active { transition: opacity 0.4s; }
.overlay-fade-leave-active { transition: opacity 0.6s; }
.overlay-fade-enter-from, .overlay-fade-leave-to { opacity: 0; }

/* ─── 粒子 ────────────────────────────────────────────────────── */
.discovery-particles {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.particle {
  position: absolute;
  border-radius: 50%;
  background: #fff;
  animation: twinkle 3s ease-in-out infinite alternate;
}
@keyframes twinkle {
  0%   { opacity: 0.2; transform: scale(0.8); }
  100% { opacity: 0.8; transform: scale(1.2); }
}

/* ─── 舞台 ────────────────────────────────────────────────────── */
.discovery-stage {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  max-width: 800px;
  min-height: 500px;
}

/* ─── Phase 1: 标题 ────────────────────────────────────────────── */
.discovery-title {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}
.title-icon { font-size: 48px; }
.title-text {
  font-size: 36px;
  font-weight: 800;
  color: #fff;
  text-shadow: 0 0 30px rgba(255,200,50,0.5);
  letter-spacing: 4px;
}
.title-fade-enter-active { transition: all 0.5s ease-out; }
.title-fade-leave-active { transition: all 0.3s ease-in; }
.title-fade-enter-from { opacity: 0; transform: translateY(30px) scale(0.9); }
.title-fade-leave-to { opacity: 0; transform: translateY(-20px) scale(0.9); }

/* ─── Phase 2: 3D 翻转卡片 ────────────────────────────────────── */
.card-wrapper {
  perspective: 1200px;
}
.card-appear-enter-active { transition: all 0.5s ease-out; }
.card-appear-leave-active { transition: all 0.3s ease-in; }
.card-appear-enter-from { opacity: 0; transform: scale(0.5) rotateY(30deg); }
.card-appear-leave-to { opacity: 0; transform: scale(0.8); }

.flip-card {
  position: relative;
  width: 220px;
  height: 300px;
  transform-style: preserve-3d;
  transition: transform 0.8s cubic-bezier(0.4, 0.0, 0.2, 1);
  border-radius: 16px;
  box-shadow: 0 8px 40px rgba(0,0,0,0.5), 0 0 60px rgba(255,255,255,0.1);
}
.flip-card.flipped {
  transform: rotateY(180deg);
}

.flip-card-front,
.flip-card-back {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #fff;
  padding: 20px;
}

.flip-card-back {
  transform: rotateY(180deg);
}

.front-number {
  font-size: 18px;
  opacity: 0.8;
  font-weight: 500;
}
.front-symbol {
  font-size: 80px;
  font-weight: 900;
  line-height: 1;
  margin: 4px 0;
  text-shadow: 0 2px 10px rgba(0,0,0,0.3);
}
.front-name {
  font-size: 22px;
  opacity: 0.9;
}

.back-label { font-size: 11px; opacity: 0.7; letter-spacing: 2px; margin-bottom: 2px; }
.back-number { font-size: 24px; font-weight: 700; }
.back-symbol { font-size: 48px; font-weight: 900; margin: 4px 0; }
.back-en-name { font-size: 16px; font-weight: 500; opacity: 0.9; }
.back-detail { font-size: 13px; opacity: 0.75; margin-top: 4px; }
.back-mass { font-size: 13px; opacity: 0.65; margin-top: 2px; }

/* ─── Phase 3: 飞向周期表 ──────────────────────────────────────── */
.flight-container {
  position: relative;
  width: 100%;
  height: 520px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.flight-card {
  position: absolute;
  z-index: 10;
  width: 48px;
  height: 56px;
  border-radius: 4px;
  overflow: hidden;
  /* 从中心飞到目标位置 */
  animation: flightToGrid 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
  box-shadow: 0 0 30px rgba(255,255,255,0.3);
}
.flight-inner {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #fff;
}
.flight-symbol { font-size: 16px; font-weight: 800; line-height: 1; }
.flight-number { font-size: 9px; opacity: 0.8; }

@keyframes flightToGrid {
  0% {
    left: var(--fly-from-x);
    top: var(--fly-from-y);
    width: 192px;
    height: 224px;
    border-radius: 12px;
    opacity: 1;
  }
  40% {
    opacity: 1;
  }
  100% {
    left: var(--fly-to-x);
    top: var(--fly-to-y);
    width: 48px;
    height: 56px;
    border-radius: 4px;
    opacity: 1;
  }
}

.flight-grid {
  position: absolute;
  width: 936px;
  height: 520px;
  opacity: 0;
  animation: gridFadeIn 0.6s 0.2s ease-out forwards;
}
@keyframes gridFadeIn {
  0%   { opacity: 0; }
  100% { opacity: 0.25; }
}

.flight-cell {
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 3px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(255,255,255,0.03);
}
.flight-cell.target-cell {
  border-color: transparent;
  background: transparent;
  animation: cellGlow 1.2s 0.3s ease-in-out infinite alternate;
}
@keyframes cellGlow {
  0%   { box-shadow: 0 0 8px rgba(255,255,255,0.2); }
  100% { box-shadow: 0 0 20px rgba(255,255,255,0.6), 0 0 40px rgba(255,255,255,0.2); }
}
.target-cell .cell-sym {
  font-size: 14px;
  font-weight: 800;
  color: #fff;
  line-height: 1;
}
.target-cell .cell-num {
  font-size: 8px;
  color: rgba(255,255,255,0.7);
}

/* ─── Phase 4: 点亮完成 ────────────────────────────────────────── */
.done-container {
  text-align: center;
}
.done-glow {
  font-size: 48px;
  font-weight: 900;
  text-shadow: 0 0 40px currentColor;
  margin-bottom: 16px;
  animation: donePulse 1.5s ease-in-out infinite alternate;
}
@keyframes donePulse {
  0%   { transform: scale(1); opacity: 0.8; }
  100% { transform: scale(1.08); opacity: 1; }
}
.done-text {
  font-size: 18px;
  color: rgba(255,255,255,0.7);
  font-weight: 400;
}

.pulse-in-enter-active { transition: all 0.5s ease-out; }
.pulse-in-enter-from { opacity: 0; transform: scale(0.5); }

/* ─── 跳过提示 ────────────────────────────────────────────────── */
.skip-hint {
  position: absolute;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 12px;
  color: rgba(255,255,255,0.3);
  letter-spacing: 1px;
}

/* ─── 点击揭示提示 ────────────────────────────────────────── */
.click-reveal-hint {
  position: absolute;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 16px;
  font-weight: 700;
  color: #fff;
  background: rgba(255,255,255,0.12);
  padding: 10px 28px;
  border-radius: 8px;
  cursor: pointer;
  letter-spacing: 2px;
  backdrop-filter: blur(4px);
  border: 1px solid rgba(255,255,255,0.2);
  transition: all 0.2s;
  z-index: 20;
  animation: hintPulse 1.5s ease-in-out infinite;
}
.click-reveal-hint:hover {
  background: rgba(255,255,255,0.2);
  transform: translateX(-50%) scale(1.05);
}
@keyframes hintPulse {
  0%, 100% { box-shadow: 0 0 8px rgba(255,255,255,0.1); }
  50%      { box-shadow: 0 0 20px rgba(255,255,255,0.3); }
}

.fade-up-enter-active { transition: all 0.4s ease-out; }
.fade-up-enter-from { opacity: 0; transform: translateX(-50%) translateY(10px); }

/* ─────────────────────────────────────────────────────────────────────────────
   Transitions & Animations
   ────────────────────────────────────────────────────────────────────────── */

.win-title {
  font-size: 4.5rem;
  font-weight: 900;
  color: #fff;
  letter-spacing: 0.15em;
  margin: 0;
  text-shadow: 0 0 20px rgba(255, 255, 255, 0.5);
  animation: win-glow 2s ease-in-out infinite alternate;
}

.win-divider {
  height: 2px;
  width: 100%;
  margin: 1.5rem auto;
  background: linear-gradient(to right, transparent, #fff, transparent);
  opacity: 0.5;
}

.win-subtitle {
  font-size: 1.5rem;
  color: rgba(255, 255, 255, 0.9);
  letter-spacing: 0.5em;
  margin-bottom: 2rem;
}

.win-stats {
  opacity: 0.6;
}

@keyframes win-glow {
  from { text-shadow: 0 0 10px rgba(255, 255, 255, 0.3); }
  to { text-shadow: 0 0 30px rgba(255, 255, 255, 0.8), 0 0 10px rgba(255, 255, 255, 0.5); }
}

.win-fade-enter-active,
.win-fade-leave-active {
  transition: all 1.5s cubic-bezier(0.4, 0, 0.2, 1);
}
.win-fade-enter-from {
  opacity: 0;
  transform: scale(0.9) translateY(20px);
}
</style>
