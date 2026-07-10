<script setup lang="ts">
import { ref, computed, onMounted, provide, nextTick } from "vue";
import { useRoute, useRouter } from "vue-router";
import itemsData from "@/data/items.json";
import elementsData from "@/data/elements.json";
import DependencyNode from "./components/DependencyNode.vue";
import RequirementSummary from "./components/RequirementSummary.vue";
import { useProductionTree } from "@/hook/useProductionTree";

const route = useRoute();
const router = useRouter();
const itemKey = ref(route.params.id as string);
const targetQuantity = ref(1);

const item = computed(() => itemsData.find(i => i.key === itemKey.value));
const element = computed(() => {
  if (!item.value?.elemental) return null;
  return (elementsData as any[]).find(e => e.number === item.value?.elemental);
});

const pathOverrides = ref<Record<string, string>>({});
const requestedLocationKey = ref<string | null>(null);

const { resolveItem, totalTechs, globalProcessedTechs } = useProductionTree(pathOverrides);

const rootNode = ref<any>(null);

provide('requestedLocationKey', requestedLocationKey);
provide('pathOverrides', {
  overrides: pathOverrides,
  update: (key: string, methodKey: string) => {
    pathOverrides.value[key] = methodKey;
    buildTree();
  }
});

function buildTree() {
  if (!item.value) return;
  totalTechs.value = new Set();
  globalProcessedTechs.clear();
  rootNode.value = resolveItem(itemKey.value, targetQuantity.value, new Set());
}

onMounted(() => {
  buildTree();
});

const goBack = () => {
  router.push({ name: 'AdminItems' });
};
</script>

<template>
  <div class="p-6 space-y-6 max-w-6xl mx-auto pb-24">
    <!-- Header -->
    <div class="flex items-center gap-4">
      <button class="btn btn-ghost btn-circle" @click="goBack">
        <Icon icon="mdi:arrow-left" class="text-2xl" />
      </button>
      <div>
        <h1 class="text-3xl font-bold flex items-center gap-2">
          {{ item?.name || itemKey }}
          <div v-if="element" class="badge badge-outline gap-1">
            <span class="text-xs opacity-70">{{ element.number }}</span>
            {{ element.symbol }}
          </div>
        </h1>
        <p class="text-base-content/60">物品详情及生产分析</p>
      </div>
    </div>

    <div v-if="!item" class="alert alert-error">
      <Icon icon="mdi:alert" />
      <span>未找到物品: {{ itemKey }}</span>
    </div>

    <template v-else>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <!-- Item Info -->
        <div class="card bg-base-100 shadow-xl border border-base-300">
          <div class="card-body p-5">
            <h2 class="card-title text-sm opacity-60 uppercase tracking-widest">基础信息</h2>
            <div class="space-y-3 mt-2">
              <div class="flex justify-between items-center border-b border-base-200 pb-2">
                <span class="opacity-60">Key</span>
                <span class="font-mono bg-base-200 px-2 rounded">{{ item.key }}</span>
              </div>
              <div class="flex justify-between items-center border-b border-base-200 pb-2">
                <span class="opacity-60">分类</span>
                <span class="badge badge-ghost">{{ item.category }}</span>
              </div>
              <div class="flex justify-between items-center border-b border-base-200 pb-2">
                <span class="opacity-60">类型</span>
                <span>{{ item.type?.join(', ') || 'N/A' }}</span>
              </div>
              <div class="flex justify-between items-center border-b border-base-200 pb-2" v-if="item.milestone">
                <span class="opacity-60">里程碑</span>
                <span class="badge badge-primary badge-sm">时代 {{ item.milestone }}</span>
              </div>
              <div v-if="item.description" class="pt-2">
                <p class="text-sm opacity-80">{{ item.description }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Production Controls -->
        <div class="card bg-base-100 shadow-xl border border-base-300 md:col-span-2">
          <div class="card-body p-5">
            <h2 class="card-title text-sm opacity-60 uppercase tracking-widest">生产分析</h2>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
              <div class="form-control">
                <label class="label">
                  <span class="label-text font-bold">目标生产数量</span>
                </label>
                <div class="join">
                  <input 
                    type="number" 
                    v-model.number="targetQuantity" 
                    class="input input-bordered join-item w-full" 
                    min="1"
                    @change="buildTree"
                  />
                  <div class="join-item btn btn-active pointer-events-none">个</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Summary -->
      <RequirementSummary 
        v-if="rootNode" 
        :root-node="rootNode" 
        @locate="key => {
          requestedLocationKey = null;
          nextTick(() => { requestedLocationKey = key; });
        }"
      />

      <!-- Dependency Tree -->
      <div class="card bg-base-100 shadow-xl border border-base-300 overflow-visible">
        <div class="card-body p-5">
          <h2 class="card-title text-sm opacity-60 uppercase tracking-widest mb-4">依赖关系树 (自上而下分析)</h2>
          <div class="overflow-x-auto p-2 bg-base-200/30 rounded-xl min-h-[300px]">
            <DependencyNode 
              v-if="rootNode" 
              :node="rootNode" 
              :depth="0"
              is-root 
            />
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
