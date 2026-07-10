<template>
  <div class="card bg-base-100 shadow-sm border border-base-300">
    <div class="card-body p-4">
      <h3 class="card-title text-sm mb-4 flex items-center gap-2">
        <Icon icon="tabler:list-details" class="text-primary" />
        原材料需求汇总 (Basic Requirements)
      </h3>

      <div v-if="!rootNode" class="text-center py-8 opacity-40 italic text-sm">
        选择生产路径以查看汇总
      </div>
      
      <div v-else class="space-y-6">
        <!-- Basic Operations (Leaf Nodes) -->
        <div>
          <div class="text-[11px] font-bold opacity-50 uppercase tracking-wider mb-2 flex items-center gap-2">
            <span>基础采集/操作次数(不考虑掉落概率)</span>
            <div class="h-px flex-1 bg-base-content/10"></div>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div 
              v-for="(count, key) in summary.operations" 
              :key="key"
              class="flex items-center justify-between p-2 bg-base-200/50 rounded-lg text-sm border border-base-content/5 cursor-pointer hover:bg-warning/10 hover:border-warning/30 transition-all group"
              @click="$emit('locate', key)"
              title="点击在路径树中定位"
            >
              <div class="flex items-center gap-2">
                <Icon :icon="getActionIcon(key)" class="text-warning" />
                <span>{{ getActionName(key) }}</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="font-mono font-bold text-primary">x{{ count }}</span>
                <Icon icon="tabler:target-arrow" class="opacity-0 group-hover:opacity-100 text-warning" size="14" />
              </div>
            </div>
            <div v-if="Object.keys(summary.operations).length === 0" class="text-xs opacity-40 italic py-2">
              无需基础采集操作
            </div>
          </div>
        </div>

        <!-- Raw Materials -->
        <div>
          <div class="text-[11px] font-bold opacity-50 uppercase tracking-wider mb-2 flex items-center gap-2">
            <span>基础原材料 (Raw Materials)</span>
            <div class="h-px flex-1 bg-base-content/10"></div>
          </div>
          <div class="flex flex-wrap gap-2">
            <div 
              v-for="(count, key) in summary.materials" 
              :key="key"
              class="badge badge-lg bg-base-200 border-none gap-2 py-4 px-3 cursor-pointer hover:bg-info/10 hover:ring-1 hover:ring-info/30 transition-all group"
              @click="$emit('locate', key)"
              title="点击在路径树中定位"
            >
              <span class="opacity-60 text-xs">{{ getItemName(key) }}</span>
              <span class="font-mono font-bold text-sm">x{{ count }}</span>
              <Icon icon="tabler:target-arrow" class="opacity-0 group-hover:opacity-100 text-info ml-1" size="14" />
            </div>
            <div v-if="Object.keys(summary.materials).length === 0" class="text-xs opacity-40 italic py-2">
              无需基础原材料
            </div>
          </div>
        </div>

        <!-- Intermediate Products -->
        <div v-if="Object.keys(summary.intermediates).length">
          <div class="text-[11px] font-bold opacity-50 uppercase tracking-wider mb-2 flex items-center gap-2 text-secondary">
            <span>中间产物汇总 (Intermediates)</span>
            <div class="h-px flex-1 bg-secondary/10"></div>
          </div>
          <div class="flex flex-wrap gap-2">
            <div 
              v-for="(count, key) in summary.intermediates" 
              :key="key"
              class="badge badge-outline badge-secondary badge-sm gap-1 py-3 px-3 hover:bg-secondary hover:text-secondary-content cursor-pointer transition-all active:scale-95 group"
              @click="$emit('locate', key)"
              title="点击在路径树中定位"
            >
              <span class="opacity-70">{{ getItemName(key) }}</span>
              <span class="font-bold">x{{ count }}</span>
              <Icon icon="tabler:target-arrow" class="opacity-0 group-hover:opacity-100 ml-1" size="12" />
            </div>
          </div>
        </div>

        <!-- Technologies -->
        <div v-if="Object.keys(summary.techs).length">
          <div class="text-[11px] font-bold opacity-50 uppercase tracking-wider mb-2 flex items-center gap-2">
            <span>所需核心科技</span>
            <div class="h-px flex-1 bg-base-content/10"></div>
          </div>
          <div class="flex flex-wrap gap-2">
            <div 
              v-for="(v, key) in summary.techs" 
              :key="key"
              class="badge badge-outline badge-info badge-sm py-3 px-3 cursor-pointer hover:bg-info hover:text-info-content transition-all active:scale-95 group"
              @click="$emit('locate', key)"
              title="点击在路径树中定位"
            >
              <span>{{ getTechName(key) }}</span>
              <Icon icon="tabler:target-arrow" class="opacity-0 group-hover:opacity-100 ml-1" size="12" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import itemsData from "@/data/items.json";
import actionsData from "@/data/actions.json";
import techsData from "@/data/techs.json";
import type { TreeNode } from "@/hook/useProductionTree";

const props = defineProps<{
  rootNode: TreeNode | null;
}>();

defineEmits<{
  (e: 'locate', key: string): void;
}>();

const LEAF_ACTIONS = [
  'pick_stone', 'pick_branch', 'mining', 'fetch_water', 
  'chop_wood', 'dig_sand_on_beach', 'blasting', 'directional_blasting', 
  'extract_salt', 'hunting', 'harvest_seaweed', 'panning', 'fetch_seawater'
];

const summary = computed(() => {
  const result = {
    operations: {} as Record<string, number>,
    materials: {} as Record<string, number>,
    intermediates: {} as Record<string, number>,
    techs: {} as Record<string, number>
  };

  if (!props.rootNode) return result;

  const processNode = (node: TreeNode, isRoot = false) => {
    if (node.type === 'action') {
      if (LEAF_ACTIONS.includes(node.key)) {
        result.operations[node.key] = (result.operations[node.key] || 0) + node.quantity;
        return;
      }
    }

    if (node.type === 'item') {
      const item = itemsData.find(i => i.key === node.key);
      const isDiscovery = (item as any)?.is_discovery;
      const hasProduction = node.children.some(c => c.type === 'formula' || c.type === 'action');

      if (isDiscovery && !isRoot) {
        result.materials[node.key] = (result.materials[node.key] || 0) + node.quantity;
        return; // stop recursion for discovery items
      }

      if (!hasProduction) {
        result.materials[node.key] = (result.materials[node.key] || 0) + node.quantity;
      } else if (!isRoot) {
        // Intermediate but not the final target item
        result.intermediates[node.key] = (result.intermediates[node.key] || 0) + node.quantity;
      }
    }

    if (node.type === 'tech') {
      result.techs[node.key] = (result.techs[node.key] || 0) + 1;
    }

    if (node.children) {
      node.children.forEach(child => processNode(child));
    }
  };

  processNode(props.rootNode, true);
  return result;
});

const getActionName = (key: string) => actionsData.find(a => a.key === key)?.name || key;
const getItemName = (key: string) => itemsData.find(i => i.key === key)?.name || key;
const getTechName = (key: string) => techsData.find(t => t.key === key)?.name || key;

const getActionIcon = (key: string) => {
  if (key.includes('pick') || key.includes('harvest')) return 'tabler:hand-finger';
  if (key.includes('mining') || key.includes('panning')) return 'tabler:pick';
  if (key.includes('blasting')) return 'tabler:bomb';
  if (key.includes('water') || key.includes('seawater')) return 'tabler:droplet';
  if (key.includes('chop')) return 'tabler:axe';
  if (key.includes('hunting')) return 'tabler:bow';
  return 'tabler:bolt';
};
</script>