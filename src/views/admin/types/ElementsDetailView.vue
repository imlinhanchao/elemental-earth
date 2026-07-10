<template>
  <div class="flex-1 overflow-y-auto p-4 bg-base-200/50">
    <!-- Header -->
    <div class="flex items-center gap-3 mb-6">
      <button
        class="btn btn-ghost btn-sm"
        @click="$router.push('/admin/elements')"
      >
        ← 返回
      </button>
      <h2 class="text-xl font-bold inline-flex items-center gap-2">
        <span class="text-primary">{{ element?.symbol }}</span>
        <span>{{ element?.name }}</span>
        <span class="text-base-content/50 text-sm font-normal">#{{ element?.number }}</span>
      </h2>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Element Info -->
      <div class="card bg-base-100 shadow-sm border border-base-300">
        <div class="card-body p-4">
          <h3 class="card-title text-sm mb-4">元素基本信息</h3>
          <div class="space-y-2 text-sm">
            <div class="flex justify-between border-b border-base-200 pb-1">
              <span class="opacity-60">英文名</span>
              <span class="font-mono">{{ element?.nameEn }}</span>
            </div>
            <div class="flex justify-between border-b border-base-200 pb-1">
              <span class="opacity-60">分类</span>
              <span>{{ element?.category }}</span>
            </div>
            <div class="flex justify-between border-b border-base-200 pb-1">
              <span class="opacity-60">原子量</span>
              <span>{{ element?.mass }}</span>
            </div>
            <div class="flex justify-between">
              <span class="opacity-60">位置</span>
              <span>第 {{ element?.row }} 周期，第 {{ element?.col }} 族</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Controls/Summary Area -->
      <div class="lg:col-span-2 space-y-6">
        <div class="card bg-base-100 shadow-sm border border-base-300">
          <div class="card-body p-4">
            <h3 class="card-title text-sm mb-4">生产计算配置</h3>
            <div class="flex flex-wrap gap-8 items-start">
              <div class="form-control">
                <label class="label pt-0">
                  <span class="label-text text-xs text-base-content/50">目标数量</span>
                </label>
                <input
                  type="number"
                  v-model.number="targetQuantity"
                  class="input input-bordered input-sm w-32 font-mono"
                  min="1"
                />
              </div>

              <!-- Path Selection if multiple items exist for this element -->
              <div v-if="treeNodes.length > 1" class="flex-1">
                <label class="label pt-0">
                  <span class="label-text text-xs text-base-content/50">选择产出物品</span>
                </label>
                <div class="flex flex-wrap gap-2">
                  <button 
                    v-for="(node, idx) in treeNodes" 
                    :key="idx"
                    class="btn btn-xs normal-case"
                    :class="selectedRootIndex === idx ? 'btn-primary' : 'btn-ghost bg-base-200'"
                    @click="selectedRootIndex = idx"
                  >
                    {{ node.name }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <RequirementSummary 
          :root-node="selectedNode" 
          @locate="key => {
            requestedLocationKey = null;
            nextTick(() => { requestedLocationKey = key; });
          }"
        />
      </div>

      <!-- Tree Section -->
      <div class="lg:col-span-3">
        <div class="card bg-base-100 shadow-sm border border-base-300 h-full">
          <div class="card-body p-0">
            <div class="p-4 border-b border-base-200 flex justify-between items-center">
              <h3 class="card-title text-sm">生产依赖树 (Item Dependency Tree)</h3>
              <div class="text-xs badge badge-ghost">递归深度: 5</div>
            </div>
            
            <div class="p-4 text-sm">
              <div v-if="!treeNodes.length" class="py-20 text-center opacity-30 italic">
                未找到该元素的生产路径
              </div>
              <div v-else class="space-y-1">
                <DependencyNode 
                  v-for="(node, idx) in treeNodes" 
                  :key="idx" 
                  :node="node" 
                  :depth="0"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch, provide, nextTick } from "vue";
import { useRoute } from "vue-router";
import elementsData from "@/data/elements.json";
import itemsData from "@/data/items.json";
import formulasData from "@/data/formula.json";
import actionsData from "@/data/actions.json";
import techsData from "@/data/techs.json";

// Recursive Component for Tree
import DependencyNode from "./components/DependencyNode.vue";
import RequirementSummary from "./components/RequirementSummary.vue";
import { useProductionTree, type TreeNode } from "@/hook/useProductionTree";

const route = useRoute();
const elementId = ref(route.params.id as string);
const targetQuantity = ref(1);
const selectedRootIndex = ref(0);
const requestedLocationKey = ref<string | null>(null);
const pathOverrides = ref<Record<string, string>>({});

const { resolveItem, totalTechs, globalProcessedTechs } = useProductionTree(pathOverrides);

provide('requestedLocationKey', requestedLocationKey);
provide('pathOverrides', {
  overrides: pathOverrides,
  update: (itemKey: string, methodKey: string) => {
    pathOverrides.value[itemKey] = methodKey;
    buildTree(false);
  }
});

const element = computed(() => {
  return elementsData.find(e => e.number.toString() === elementId.value || e.symbol === elementId.value);
});

const treeNodes = ref<any[]>([]);

const selectedNode = computed(() => {
  if (treeNodes.value.length === 0) return null;
  return treeNodes.value[selectedRootIndex.value] || treeNodes.value[0];
});

function buildTree(resetRoot = false) {
  if (!element.value) return;
  
  const elNum = element.value.number;
  const items = itemsData.filter(i => i.elemental === elNum);
  
  treeNodes.value = [];
  if (resetRoot) selectedRootIndex.value = 0;
  totalTechs.value = new Set();
  globalProcessedTechs.clear();
  
  for (const item of items) {
    treeNodes.value.push(resolveItem(item.key, targetQuantity.value, new Set()));
  }
}

onMounted(() => {
  buildTree(true);
});

watch([elementId, targetQuantity], () => {
  pathOverrides.value = {};
  buildTree(true);
});
</script>
