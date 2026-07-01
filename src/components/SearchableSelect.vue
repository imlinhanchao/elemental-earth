<template>
  <div class="relative isolation-auto" ref="wrapperRef">
    <!-- 触发器 -->
    <button type="button" class="w-full flex items-center justify-between gap-1 text-left"
      :class="{ 'text-base-content/40': !selected, 'input input-bordered': border, ['input-' + size]: size }"
      @click="toggleOpen">
      <span class="truncate">{{ selected ? getLabel(selected) : placeholder }}</span>
      <svg class="w-3 h-3 opacity-40 shrink-0 transition-transform" :class="{ 'rotate-180': open }" viewBox="0 0 10 6"><path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>
    </button>

    <!-- 下拉面板 -->
    <div v-if="open" class="absolute inset-0 z-1000" @click="close" @contextmenu.prevent="close"></div>
    <div v-if="open" ref="panelRef"
      class="absolute z-1004 bg-base-100 border border-base-300 rounded-lg shadow-lg overflow-hidden">
      <!-- 搜索框 -->
      <div class="p-1.5 border-b border-base-300">
        <input ref="searchRef" v-model="query" class="input input-bordered input-sm w-full" placeholder="搜索…" @keydown.escape="close" @keydown.enter="selectFirst" />
      </div>
      <!-- 选项列表 -->
      <div class="max-h-48 overflow-y-auto">
        <button v-for="opt in filteredOptions" :key="getValue(opt)"
          class="w-full text-left px-3 py-1.5 text-sm hover:bg-base-200 transition-colors flex items-center gap-2"
          :class="{ 'bg-primary/10 text-primary': getValue(opt) === selected }"
          @click="pick(opt)">
          <span class="truncate">{{ getLabel(opt) }}</span>
          <span class="text-[10px] opacity-40 shrink-0 font-mono">{{ getValue(opt) }}</span>
        </button>
        <div v-if="filteredOptions.length === 0" class="px-3 py-4 text-xs text-base-content/40 text-center">无匹配</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'

const props = withDefaults(defineProps<{
  options: { key?: string; name?: string; label?: string; value?: string }[] | string[]
  modelValue?: string
  placeholder?: string;
  border?: boolean;
  size?: string;
}>(), {
  placeholder: '',
  border: true,
  size: 'xs',
})

const emit = defineEmits<{ 'update:modelValue': [v: string] }>()

const open = ref(false)
const query = ref('')
const wrapperRef = ref<HTMLElement | null>(null)
const panelRef = ref<HTMLElement | null>(null)
const searchRef = ref<HTMLInputElement | null>(null)
const panelStyle = ref({ top: '0px', left: '0px', width: '200px' })

const selected = computed(() => props.modelValue)

function getValue(opt: any): string {
  if (typeof opt === 'string') return opt
  return opt.key ?? opt.value ?? opt.name ?? opt.label ?? String(opt)
}
function getLabel(opt: any): string {
  if (opt === undefined || opt === null) return ''
  if (typeof opt === 'string') return getLabel(props.options.find(o => getValue(o) === opt)) ?? opt
  return opt.name ?? opt.label ?? opt.key ?? opt.value ?? String(opt)
}

const filteredOptions = computed(() => {
  const q = query.value.toLowerCase().trim()
  if (!q) return props.options
  return props.options.filter(o => {
    const label = getLabel(o).toLowerCase()
    const val = getValue(o).toLowerCase()
    return label.includes(q) || val.includes(q)
  })
})

function toggleOpen() {
  if (open.value) { close(); return }
  open.value = true
  query.value = ''
  nextTick(() => {
    searchRef.value?.focus()
    positionPanel()
  })
}

function positionPanel() {
  if (!wrapperRef.value || !panelRef.value) return
  const rect = wrapperRef.value.getBoundingClientRect()
  const panelHeight = 260
  const spaceBelow = window.innerHeight - rect.bottom
  const top = spaceBelow >= panelHeight ? rect.bottom : Math.max(8, rect.top - panelHeight)
  panelStyle.value = {
    top: `${top}px`,
    left: `${rect.left}px`,
    width: `${rect.width}px`,
  }
}

function pick(opt: any) {
  emit('update:modelValue', getValue(opt))
  //close()
}

function selectFirst() {
  if (filteredOptions.value.length > 0) pick(filteredOptions.value[0])
}

function close() { open.value = false }
</script>
