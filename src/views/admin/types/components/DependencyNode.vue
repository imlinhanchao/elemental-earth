<template>
  <div class="select-none" :id="`node-${node.key}`" ref="nodeRef">
    <div 
      class="flex items-center gap-2 py-1.5 px-2 hover:bg-base-200 rounded-lg cursor-pointer transition-all group"
      :class="{ 'bg-primary/10 ring-1 ring-primary/30': isHighlighted }"
      :style="{ paddingLeft: `${depth * 20 + 8}px` }"
      @click="expanded = !expanded"
    >
      <!-- Expand Indicator -->
      <span class="w-4 flex items-center justify-center">
        <Icon 
          v-if="node.children && node.children.length" 
          :icon="expanded ? 'tabler:chevron-down' : 'tabler:chevron-right'"
          class="text-base-content/40 group-hover:text-base-content/70"
          size="0.85em"
        />
      </span>

      <!-- Type Icon -->
      <Icon :icon="typeIcon" :class="typeClass" size="1em" />

      <!-- Label & Info -->
      <div class="flex items-center gap-2 flex-1 min-w-0 font-sans">
        <span class="font-medium truncate" :class="node.type === 'item' ? 'text-base-content' : 'text-base-content/70'">
          {{ node.name }}
        </span>
        
        <!-- Path Selection -->
        <select 
          v-if="node.availableMethods && node.availableMethods.length > 1"
          class="select select-bordered select-xs h-6 min-h-0 py-0 px-1 bg-base-100/50 border-base-content/10 text-[10px] font-normal focus:outline-none"
          :value="node.selectedMethodKey"
          @click.stop
          @change="onPathChange"
        >
          <option v-for="m in node.availableMethods" :key="m.key" :value="m.key">
            {{ m.name }}
          </option>
        </select>
        
        <div class="flex items-center gap-1.5 no-shrink">
          <span v-if="node.quantity > 0" class="badge badge-sm font-mono bg-base-300 border-none text-base-content/70">
            x{{ formatNumber(node.quantity) }}
          </span>
          <span v-if="node.summary" class="text-[10px] text-base-content/40 italic truncate max-w-[300px]" :title="node.summary">
            需: {{ node.summary }}
          </span>
          <span v-if="node.multiplier" class="text-[10px] opacity-40">
            (单次产出: {{ node.multiplier }})
          </span>
          <span v-if="node.note" class="text-[10px] text-error italic">
            {{ node.note }}
          </span>
        </div>
      </div>
      
      <!-- Key (Hidden by default, show on hover) -->
      <span class="hidden group-hover:inline text-[10px] font-mono opacity-30 ml-auto mr-2">
        {{ node.key }}
      </span>
    </div>

    <!-- Children -->
    <div class="pl-0.5" v-if="expanded && node.children && node.children.length">
      <DependencyNode 
        v-for="(child, idx) in node.children" 
        :key="idx" 
        :node="child" 
        :depth="depth + 1"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, inject, watch, onMounted } from "vue";
import DependencyNode from "./DependencyNode.vue";
import type { TreeNode } from "@/hook/useProductionTree";

const props = defineProps<{
  node: TreeNode;
  depth: number;
  isRoot?: boolean;
}>();

const expanded = ref(props.isRoot || props.depth < 1);
const pathOverrides = inject<any>('pathOverrides');

function onPathChange(e: Event) {
  const select = e.target as HTMLSelectElement;
  pathOverrides?.update(props.node.key, select.value);
}

const typeIcon = computed(() => {
  switch (props.node.type) {
    case 'item': return 'tabler:package';
    case 'formula': return 'tabler:flask';
    case 'action': return 'tabler:bolt';
    case 'tech': return 'tabler:microscope';
    default: return 'tabler:circle';
  }
});

const typeClass = computed(() => {
  switch (props.node.type) {
    case 'item': return 'text-info';
    case 'formula': return 'text-success';
    case 'action': return 'text-warning';
    case 'tech': return 'text-primary';
    default: return '';
  }
});

const nodeRef = ref<HTMLElement | null>(null);
const requestedLocationKey = inject<any>('requestedLocationKey', ref(null));
const isHighlighted = computed(() => requestedLocationKey.value === props.node.key);

// Recursive check if any child has the key
function hasChildWithKey(node: any, key: string): boolean {
  if (node.key === key) return true;
  if (node.children) {
    return node.children.some((c: any) => hasChildWithKey(c, key));
  }
  return false;
}

watch(requestedLocationKey, (newKey) => {
  if (!newKey) return;
  
  // If this node contains the requested key somewhere in its subtree, expand it
  if (hasChildWithKey(props.node, newKey)) {
    expanded.value = true;
    
    // If it's directly this node, scroll into view
    if (props.node.key === newKey) {
      setTimeout(() => {
        nodeRef.value?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }
}, { immediate: true });

function formatNumber(num: number) {
  if (num === Math.floor(num)) return num.toString();
  return Number(num.toFixed(2));
}
</script>
