<template>
  <div class="periodic-table-wrapper">
    <!-- Scrollable table area -->
    <div class="overflow-x-auto pb-2">
      <div class="periodic-grid" :style="gridContainerStyle">
        <div
          v-for="el in ELEMENTS"
          :key="el.number"
          :title="el.number > 0 ? `${el.number} ${el.symbol} · ${el.name} · ${el.nameEn}${el.mass ? ' · ' + el.mass : ''}` : el.nameEn"
          :style="cellStyle(el)"
          :class="[
            'element-cell',
            el.category === 'placeholder' ? 'placeholder-cell' : 'clickable-cell',
          ]"
          @click="el.number > 0 && emit('clickElement', el)"
        >
          <template v-if="el.category !== 'placeholder'">
            <span class="cell-number">{{ el.number }}</span>
            <span class="cell-symbol">{{ el.symbol }}</span>
            <span class="cell-name">{{ el.name }}</span>
          </template>
          <template v-else>
            <span class="cell-placeholder-text">{{ el.symbol }}</span>
          </template>
        </div>
      </div>
    </div>

    <!-- Legend -->
    <div class="legend mt-3 flex flex-wrap gap-2">
      <div
        v-for="cat in legendCategories"
        :key="cat"
        class="legend-item"
        :style="{ backgroundColor: mergedColors[cat] }"
      >
        {{ CATEGORY_LABELS[cat] }}
      </div>
      <!-- Unlit sample -->
      <div class="legend-item legend-item--unlit">未点亮</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  ELEMENTS,
  DEFAULT_CATEGORY_COLORS,
  CATEGORY_LABELS,
  type PeriodicElement,
  type ElementCategory,
} from '@/data/elements'

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  /**
   * Atomic numbers of elements that should be "lit" (coloured).
   * All other elements are displayed in grey.
   * @example [1, 6, 7, 8, 26, 79]
   */
  litElements?: number[]

  /**
   * Override category colours. Merged with DEFAULT_CATEGORY_COLORS.
   * Values should be valid CSS color strings (hex, rgb, hsl, etc.).
   * @example { 'transition-metal': '#60a5fa' }
   */
  categoryColors?: Partial<Record<ElementCategory, string>>

  /** Width (px) of each element cell. Default: 44 */
  cellSize?: number
}

const props = withDefaults(defineProps<Props>(), {
  litElements:    () => [],
  categoryColors: () => ({}),
  cellSize:       44,
})

const emit = defineEmits<{
  /** Emitted when the user clicks a real element cell. */
  clickElement: [element: PeriodicElement]
}>()

// ─── Derived state ────────────────────────────────────────────────────────────

const litSet = computed(() => new Set(props.litElements))

const mergedColors = computed(
  (): Record<ElementCategory, string> => ({
    ...DEFAULT_CATEGORY_COLORS,
    ...props.categoryColors,
  })
)

/** Categories shown in the legend (excludes 'placeholder'). */
const legendCategories = Object.keys(CATEGORY_LABELS).filter(
  (k) => k !== 'placeholder'
) as ElementCategory[]

// ─── Grid & cell styles ───────────────────────────────────────────────────────

const CELL_GAP = 2   // px
const ROW_HEIGHT_RATIO = 1.2  // cell height = cellSize * ratio

const gridContainerStyle = computed(() => {
  const cs = props.cellSize
  const ch = Math.round(cs * ROW_HEIGHT_RATIO)
  return {
    display: 'grid',
    gridTemplateColumns: `repeat(18, ${cs}px)`,
    // rows 1-7: main periods, row 8: 6px spacer, rows 9-10: f-block
    gridTemplateRows: `repeat(7, ${ch}px) 6px repeat(2, ${ch}px)`,
    gap: `${CELL_GAP}px`,
    width: `${18 * cs + 17 * CELL_GAP}px`,
  }
})

function cellStyle(el: PeriodicElement): Record<string, string> {
  const isLit = el.number > 0 && litSet.value.has(el.number)
  const isPlaceholder = el.category === 'placeholder'

  const base: Record<string, string> = {
    gridRow:      String(el.row),
    gridColumn:   String(el.col),
    borderRadius: '3px',
    transition:   'background-color 0.2s, opacity 0.2s',
  }

  if (isPlaceholder) {
    return {
      ...base,
      backgroundColor: 'oklch(var(--b3))',
      opacity: '0.4',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }
  }

  if (isLit) {
    return {
      ...base,
      backgroundColor: mergedColors.value[el.category],
      color: '#ffffff',
      cursor: 'pointer',
    }
  }

  // unlit
  return {
    ...base,
    backgroundColor: 'oklch(var(--b3))',
    color: 'oklch(var(--bc))',
    opacity: '0.45',
    cursor: 'pointer',
  }
}
</script>

<style scoped>
.periodic-table-wrapper {
  user-select: none;
}

.element-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1px;
  overflow: hidden;
}

.clickable-cell:hover {
  filter: brightness(1.15);
  opacity: 1 !important;
  z-index: 1;
}

.cell-number {
  font-size: 8px;
  line-height: 1;
  opacity: 0.75;
  align-self: flex-start;
  padding-left: 2px;
}

.cell-symbol {
  font-size: 14px;
  font-weight: 700;
  line-height: 1.1;
}

.cell-name {
  font-size: 7px;
  line-height: 1;
  opacity: 0.85;
}

.placeholder-cell .cell-placeholder-text {
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.5px;
}

/* Legend */
.legend-item {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  color: #fff;
  font-weight: 500;
}

.legend-item--unlit {
  background-color: oklch(var(--b3));
  color: oklch(var(--bc));
  opacity: 0.7;
}
</style>
