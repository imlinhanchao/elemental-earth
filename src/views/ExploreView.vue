<template>
  <div class="explore-view">
    <div class="mb-4 flex items-center gap-3 flex-wrap">
      <h1 class="text-xl font-bold">元素周期表</h1>
      <span class="badge badge-outline text-xs">
        已点亮 {{ litElements.length }} / 118 个元素
      </span>
    </div>

    <!-- ─── Periodic Table ──────────────────────────────────────────────────── -->
    <PeriodicTable
      :litElements="litElements"
      :categoryColors="categoryColors"
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
  DEFAULT_CATEGORY_COLORS,
  CATEGORY_LABELS,
  type PeriodicElement,
  type ElementCategory,
} from '@/data/elements'
import { useStateStore } from '@/stores/modules/state';

// ─────────────────────────────────────────────────────────────────────────────
//  Configuration variable — modify this array to control which elements are lit.
//  Values are atomic numbers (1–118).
// ─────────────────────────────────────────────────────────────────────────────
const stateStore = useStateStore();
const litElements = ref<number[]>(stateStore.state.elements || []);

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
