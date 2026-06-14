<template>
  <div class="explore-view">
    <div class="mb-4 flex items-center gap-3 flex-wrap">
      <h1 class="text-xl font-bold">元素周期表</h1>
      <span class="badge badge-outline text-xs">
        已点亮 {{ litElements.length }} / 118 个元素
      </span>
      <button class="btn btn-xs btn-ghost" @click="clearAll">清除全部</button>
      <button class="btn btn-xs btn-ghost" @click="selectAll">全部点亮</button>
      <button class="btn btn-xs btn-ghost" @click="resetDemo">恢复示例</button>
    </div>

    <p class="text-xs text-base-content/50 mb-4">
      点击元素格可切换点亮状态。也可直接修改下方 <code>litElements</code> 配置变量来控制哪些元素被点亮。
    </p>

    <!-- ─── Periodic Table ──────────────────────────────────────────────────── -->
    <PeriodicTable
      :litElements="litElements"
      :categoryColors="categoryColors"
      @clickElement="toggleElement"
    />

    <!-- ─── Selected element detail card ─────────────────────────────────────── -->
    <Transition name="slide-fade">
      <div v-if="activeElement" class="mt-4 card bg-base-200 shadow-sm max-w-xs">
        <div
          class="card-body py-3 px-4"
          :style="{ borderLeft: `4px solid ${elementColor(activeElement)}` }"
        >
          <div class="flex items-center gap-3">
            <div
              class="w-12 h-14 rounded flex flex-col items-center justify-center text-white"
              :style="{ backgroundColor: elementColor(activeElement) }"
            >
              <span class="text-xs opacity-75">{{ activeElement.number }}</span>
              <span class="text-xl font-bold leading-tight">{{ activeElement.symbol }}</span>
              <span class="text-xs">{{ activeElement.name }}</span>
            </div>
            <div>
              <p class="font-semibold text-sm">{{ activeElement.nameEn }}</p>
              <p class="text-xs text-base-content/60">原子量：{{ activeElement.mass }}</p>
              <p class="text-xs text-base-content/60">分类：{{ CATEGORY_LABELS[activeElement.category] }}</p>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import PeriodicTable from '@/components/PeriodicTable.vue'
import {
  ELEMENTS,
  DEFAULT_CATEGORY_COLORS,
  CATEGORY_LABELS,
  type PeriodicElement,
  type ElementCategory,
} from '@/data/elements'

// ─────────────────────────────────────────────────────────────────────────────
//  Configuration variable — modify this array to control which elements are lit.
//  Values are atomic numbers (1–118).
// ─────────────────────────────────────────────────────────────────────────────
const litElements = ref<number[]>([
  // Nonmetals (common in organic chemistry)
  1,   // H  氢
  6,   // C  碳
  7,   // N  氮
  8,   // O  氧
  15,  // P  磷
  16,  // S  硫
  // Common metals
  11,  // Na 钠
  12,  // Mg 镁
  13,  // Al 铝
  19,  // K  钾
  20,  // Ca 钙
  26,  // Fe 铁
  29,  // Cu 铜
  30,  // Zn 锌
  47,  // Ag 银
  79,  // Au 金
  80,  // Hg 汞
  // Noble gases
  2,   // He 氦
  10,  // Ne 氖
  18,  // Ar 氩
  // Halogens
  9,   // F  氟
  17,  // Cl 氯
  35,  // Br 溴
  53,  // I  碘
])

// ─────────────────────────────────────────────────────────────────────────────
//  Optional: override category colours.
//  Keys are ElementCategory strings; values are any valid CSS color.
// ─────────────────────────────────────────────────────────────────────────────
const categoryColors = ref<Partial<Record<ElementCategory, string>>>({
  // Uncomment and edit to override defaults:
  // 'transition-metal': '#60a5fa',
})

// ─── Interactivity ────────────────────────────────────────────────────────────

const activeElement = ref<PeriodicElement | null>(null)

function toggleElement(el: PeriodicElement): void {
  activeElement.value = el
  const idx = litElements.value.indexOf(el.number)
  if (idx >= 0) {
    litElements.value.splice(idx, 1)
  } else {
    litElements.value.push(el.number)
  }
}

function clearAll(): void {
  litElements.value = []
  activeElement.value = null
}

function selectAll(): void {
  litElements.value = ELEMENTS
    .filter((e) => e.number > 0)
    .map((e) => e.number)
}

const DEMO_LIT = [1,2,6,7,8,9,10,11,12,13,15,16,17,18,19,20,26,29,30,35,47,53,79,80]

function resetDemo(): void {
  litElements.value = [...DEMO_LIT]
  activeElement.value = null
}

function elementColor(el: PeriodicElement): string {
  return { ...DEFAULT_CATEGORY_COLORS, ...categoryColors.value }[el.category] ?? '#6b7280'
}
</script>

<style scoped>
.explore-view {
  padding-bottom: 2rem;
}

.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: opacity 0.25s, transform 0.25s;
}
.slide-fade-enter-from,
.slide-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
