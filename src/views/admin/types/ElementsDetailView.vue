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

const route = useRoute();
const elementId = ref(route.params.id as string);
const targetQuantity = ref(1);
const selectedRootIndex = ref(0);
const requestedLocationKey = ref<string | null>(null);
const pathOverrides = ref<Record<string, string>>({});

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

const totalTechs = ref<Set<string>>(new Set());
const globalProcessedTechs = new Set<string>();

interface TreeNode {
  type: 'item' | 'formula' | 'action' | 'tech';
  key: string;
  name: string;
  quantity: number;
  multiplier?: number;
  children: TreeNode[];
  note?: string;
  summary?: string;
  availableMethods?: { key: string; name: string; type: 'formula' | 'action' }[];
  selectedMethodKey?: string;
}

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

function resolveItem(itemKey: string, count: number, visited: Set<string>): TreeNode {
  const item = itemsData.find(i => i.key === itemKey);
  const node: TreeNode = {
    type: 'item',
    key: itemKey,
    name: item?.name || itemKey,
    quantity: count,
    children: []
  };

  const formulas = (formulasData as any[]).filter(f => f.products.some((p: any) => p.key === itemKey));
  const actions = (actionsData as any[]).filter(a => a.rewards.some((r: any) => r.key === itemKey));
  
  // All possible methods
  node.availableMethods = [
    ...actions.map(a => ({ key: a.key, name: `行动: ${a.name}`, type: 'action' as const })),
    ...formulas.map(f => ({ key: f.key, name: `配方: ${f.name}`, type: 'formula' as const }))
  ];

  // Pick production method
  let bestAction = null;
  let bestFormula = null;

  const overrideKey = pathOverrides.value[itemKey];
  if (overrideKey) {
    bestAction = actions.find(a => a.key === overrideKey);
    bestFormula = !bestAction ? formulas.find(f => f.key === overrideKey) : null;
    node.selectedMethodKey = overrideKey;
  }

  if (!bestAction && !bestFormula) {
    // Default Preference: Action > Formula
    bestAction = actions[0];
    bestFormula = bestAction ? null : formulas[0];
    node.selectedMethodKey = bestAction?.key || bestFormula?.key;
  }

  if (visited.has(itemKey)) {
    node.note = "(已折叠 - 循环引用)";
    return node;
  }
  const nextVisited = new Set(visited);
  nextVisited.add(itemKey);

  if (visited.size > 12) {
    node.note = "(已达到最大深度)";
    return node;
  }

  if (bestFormula) {
    const f = bestFormula;
    const p = f.products.find((p: any) => p.key === itemKey)!;
    const multiple = p.multiple || 1;
    const executions = Math.ceil(count / multiple);
    
    const formulaNode: TreeNode = {
      type: 'formula',
      key: f.key,
      name: `配方: ${f.name}`,
      quantity: executions,
      multiplier: multiple,
      children: []
    };

    const summaryParts: string[] = [];

    if (f.required_techs) {
      for (const tKey of f.required_techs) {
        formulaNode.children.push(resolveTech(tKey, nextVisited));
      }
    }

    if (f.required_actions) {
      const ras = Array.isArray(f.required_actions) ? f.required_actions : [f.required_actions];
      for (const ra of ras) {
        const raKey = typeof ra === 'string' ? ra : ra.key;
        const raMin = typeof ra === 'object' ? ra.min || 1 : 1;
        const action = (actionsData as any[]).find(a => a.key === raKey);
        if (action) {
          formulaNode.children.push(resolveAction(action, itemKey, executions * raMin, nextVisited));
        }
      }
    }

    if (f.required_container) {
      const containerItem = itemsData.find(i => i.key === f.required_container);
      summaryParts.push(`${containerItem?.name || f.required_container} x1`);
      formulaNode.children.push(resolveItem(f.required_container, 1, nextVisited));
    }

    if (f.required_items) {
      for (const ri of f.required_items) {
        const riKey = Array.isArray(ri.key) ? ri.key[0] : ri.key;
        const riItem = itemsData.find(i => i.key === riKey);
        const total = executions * (ri.quantity || 1);
        summaryParts.push(`${riItem?.name || riKey} x${total}`);
        formulaNode.children.push(resolveItem(riKey, total, nextVisited));
      }
    }

    if (summaryParts.length) formulaNode.summary = summaryParts.join(', ');
    node.children.push(formulaNode);
  } else if (bestAction) {
    node.children.push(resolveAction(bestAction, itemKey, count, nextVisited));
  }

  return node;
}

function resolveAction(a: any, targetItemKey: string, count: number, visited: Set<string>): TreeNode {
  const rw = a.rewards.find((r: any) => r.key === targetItemKey)!;
  const prob = ((rw as any).probability || 1000) / 1000;
  const qty = (rw as any).quantity || 1;
  const executions = Math.ceil(count / (qty * prob));

  const actionNode: TreeNode = {
    type: 'action',
    key: a.key,
    name: `行动: ${a.name}`,
    quantity: executions,
    multiplier: qty,
    children: []
  };

  if (visited.has(`action:${a.key}`)) {
    actionNode.note = "(已折叠)";
    return actionNode;
  }
  const nextVisited = new Set(visited);
  nextVisited.add(`action:${a.key}`);

  const summaryParts: string[] = [];

  if (a.required_techs) {
    for (const tKey of a.required_techs) {
      actionNode.children.push(resolveTech(tKey, nextVisited));
    }
  }

  if (a.required_items) {
    for (const ri of a.required_items) {
      const riKey = Array.isArray(ri.key) ? ri.key[0] : ri.key;
      const riItem = itemsData.find(i => i.key === riKey);
      const total = executions * (ri.quantity || 1);
      summaryParts.push(`${riItem?.name || riKey} x${total}`);
      actionNode.children.push(resolveItem(riKey, total, nextVisited));
    }
  }

  if (summaryParts.length) actionNode.summary = summaryParts.join(', ');
  return actionNode;
}

function resolveTech(techKey: string, visited: Set<string>): TreeNode {
  totalTechs.value.add(techKey);
  const tech = (techsData as any[]).find(t => t.key === techKey);
  const node: TreeNode = {
    type: 'tech',
    key: techKey,
    name: tech?.name || techKey,
    quantity: 1,
    children: []
  };

  if (globalProcessedTechs.has(techKey)) {
    node.summary = "(已在别处统计其材料需求)";
    return node;
  }
  globalProcessedTechs.add(techKey);

  if (visited.has(`tech:${techKey}`)) {
    node.note = "(已折叠)";
    return node;
  }
  const nextVisited = new Set(visited);
  nextVisited.add(`tech:${techKey}`);

  if (tech?.required_items) {
    for (const ri of tech.required_items) {
      const riKey = Array.isArray(ri.key) ? ri.key[0] : ri.key;
      node.children.push(resolveItem(riKey, ri.quantity || 1, nextVisited));
    }
  }

  if (tech?.required_techs) {
    for (const tKey of tech.required_techs) {
      node.children.push(resolveTech(tKey, nextVisited));
    }
  }

  return node;
}

onMounted(() => {
  buildTree(true);
});

watch([elementId, targetQuantity], () => {
  pathOverrides.value = {};
  buildTree(true);
});
</script>
