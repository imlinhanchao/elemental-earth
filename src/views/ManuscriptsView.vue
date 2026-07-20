<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useFragmentStore } from '@/stores/modules/fragment';
import { usePackStore } from '@/stores/modules/pack';
import { useStateStore } from '@/stores/modules/state';
import { useLabStore } from '@/stores/modules/lab';
import { Formulas } from '@/data/formula';
import { Items, getItem } from '@/data/items';
import { LabActions as Labs } from '@/data/labs';
import { Eras } from '@/data/eras';
import Icon from '@/components/Icon.vue';

const fragmentStore = useFragmentStore();
const packStore = usePackStore();
const stateStore = useStateStore();
const labStore = useLabStore();
const router = useRouter();

const hasGasTech = computed(() => packStore.techs.includes('gas_collection'));

function isGasItem(key: string) {
    const item = getItem(key);
    return item?.type.includes('gas');
}

const searchQuery = ref('');
const selectedEra = ref('all');
const eraTabs = computed(() => [
  { key: 'all', name: '全部时代' },
  ...Eras.filter(e => {
    const currEra = Eras.find(ce => ce.key === stateStore.state.currentEra);
    return Eras.indexOf(e) <= (currEra ? Eras.indexOf(currEra) : 0);
  })
]);

const allFragments = computed(() => {
    let frags = fragmentStore.fragments.map((key, index) => {
        const formula = Formulas.find(f => f.key === key);
        return {
            key,
            index,
            formula,
            isUnread: fragmentStore.isUnread(key),
            isProven: packStore.hasProvenFormula(key)
        };
    }).filter(f => f.formula);

    // 时代过滤
    if (selectedEra.value !== 'all') {
        frags = frags.filter(f => f.formula?.required_era === selectedEra.value);
    }

    frags = frags.sort((a, b) => {
        // 1. 未读的手稿放在最前 (新解锁)
        if (a.isUnread !== b.isUnread) {
            return a.isUnread ? -1 : 1;
        }
        // 2. 未实验成功的放在前面
        if (a.isProven !== b.isProven) {
            return a.isProven ? 1 : -1;
        }
        // 3. 同样的各种状态下，按获取顺序倒序（新获得的在前）
        return b.index - a.index;
    });

    if (!searchQuery.value.trim()) return frags;

    const query = searchQuery.value.toLowerCase().trim();
    return frags.filter(f => {
        const formula = f.formula;
        if (!formula) return false;

        // 1. 基础信息搜索 (名称/ID/描述)
        if (formula.name?.toLowerCase().includes(query) || 
            formula.key?.toLowerCase().includes(query) ||
            formula.fragment_description?.toLowerCase().includes(query)) {
            return true;
        }

        // 2. 原材料搜索
        const matchesRequired = formula.required_items?.some(req => {
            const keys = Array.isArray(req.key) ? req.key : [req.key];
            return keys.some(k => {
                const displayName = packStore.getDisplayName(k).toLowerCase();
                return k.toLowerCase().includes(query) || displayName.includes(query);
            });
        });
        if (matchesRequired) return true;

        // 3. 产物搜索
        const matchesProducts = formula.products?.some(prod => {
            const displayName = packStore.getDisplayName(prod.key).toLowerCase();
            return prod.key.toLowerCase().includes(query) || displayName.includes(query);
        });
        if (matchesProducts) return true;

        return false;
    });
});

function formatDescription(desc: string, products: any[] = [], required: any[] = []) {
    if (!desc) return '这份手稿上的字迹模糊不清...';
    const productKeys = products.map(p => p.key);
    
    return desc.replace(/#([\w_]+)#/g, (_, key) => {
        // 如果是产物中的气体且未解锁科技，显示 ???
        if (productKeys.includes(key) && isGasItem(key) && !hasGasTech.value) {
            return `<span class="text-base-content/40 italic">???</span>`;
        }
        // 如果曾经拥有过，或者是（非受限气体的）预期产出，则显示名称
        // 曾经不拥有的反应物将显示为 ???
        if (packStore.hasEverHad(key) || productKeys.includes(key)) {
            return `<span class="font-bold text-primary">${packStore.getDisplayName(key)}</span>`;
        }
        return `<span class="text-base-content/40 italic">???</span>`;
    }).replace(/\$([\w_]+)\$/g, (_, key) => {
        const lab = Labs.find((l: any) => l.key === key);
        return `<span class="font-bold text-secondary">${lab?.name || '???'}</span>`;
    });
}

const activeKey = ref<string | null>(null);
const activeFragment = computed(() => {
    if (!activeKey.value) return null;
    return allFragments.value.find(f => f.key === activeKey.value);
});

function selectFragment(key: string) {
    activeKey.value = key;
    fragmentStore.markAsRead(key);
}

function getFormulaTime(formula: any) {
    if (formula?.required_actions) {
        const action = Labs.find((l: any) => l.key === formula.required_actions.key);
        if (action) {
            return action.time_required * (formula.required_actions.min || 1);
        }
    }
    return formula?.time_required || 0;
}

/** 检查物品是否充足 */
function isMaterialEnough(key: string | string[], quantity: number): boolean {
    const keys = Array.isArray(key) ? key : [key];
    return keys.some(k => packStore.getItemQuantity(k) >= quantity);
}

/** 检查所有必需材料是否都已拥有过（哪怕现在没了） */
function allMaterialsDiscovered(formula: any): boolean {
    if (!formula?.required_items) return true;
    return formula.required_items.every((req: any) => {
        const keys: string[] = Array.isArray(req.key) ? req.key : [req.key];
        return keys.some(k => packStore.hasEverHad(k));
    });
}

/** 是否所有材料都充足，且容器与操作已备齐 */
const requirementsMet = computed(() => {
    if (!activeFragment.value?.formula) return false;
    const formula = activeFragment.value.formula;
    
    // 检查材料
    const itemsEnough = formula.required_items?.every((req: any) => isMaterialEnough(req.key, req.quantity));
    if (!itemsEnough) return false;

    // 检查容器 (如果有要求，只要在库存里就行，不用考虑具体的耐久瓶颈，那是实验室处理的事)
    if (formula.required_container && !packStore.hasItem(formula.required_container)) {
        return false;
    }

    return true;
});

function tryFormula() {
    if (!activeFragment.value?.formula) return;
    const formula = activeFragment.value.formula;

    labStore.reset();
    
    // 填充容器
    if (formula.required_container) {
        labStore.selectedContainerKey = formula.required_container;
    }

    // 填充材料 (选当前数量最多的那个变体)
    formula.required_items?.forEach((req: any) => {
        const keys: string[] = Array.isArray(req.key) ? req.key : [req.key];
        let bestKey = keys[0];
        let maxQty = -1;
        keys.forEach(k => {
            const q = packStore.getItemQuantity(k);
            if (q > maxQty) {
                maxQty = q;
                bestKey = k;
            }
        });
        labStore.selectedMaterials.set(bestKey, req.quantity);
    });

    // 填充操作
    if (formula.required_actions) {
        labStore.selectedOperationKey = formula.required_actions.key;
    }

    router.push('/lab');
}

onMounted(() => {
    if (allFragments.value.length > 0 && !activeKey.value) {
        selectFragment(allFragments.value[0].key);
    }
});
</script>

<template>
  <div class="manuscripts-view flex flex-col h-full overflow-hidden">
    <header class="my-4 flex flex-col md:flex-row md:items-center justify-between gap-3 flex-none">
      <div class="flex items-center justify-between">
        <h1 class="text-xl font-bold flex items-center gap-2">
          <Icon icon="mingcute:document-fill" class="text-primary" />
          研究手稿
        </h1>
        <span class="badge badge-outline text-xs md:hidden">
          {{ allFragments.length }} 份
        </span>
      </div>

      <div class="flex items-center gap-2 w-full md:w-auto">
        <div class="input input-sm input-bordered flex-1 md:w-64">
          <Icon icon="tabler:search" class="opacity-30 text-sm" />
          <input 
            v-model="searchQuery" 
            type="text" 
            placeholder="搜索手稿名称或内容..." 
            class="w-full"
          />
          <button v-if="searchQuery" class="btn btn-ghost btn-xs btn-circle" @click="searchQuery = ''">
            <Icon icon="tabler:x" />
          </button>
        </div>
        <span class="badge badge-outline text-xs hidden md:inline-flex whitespace-nowrap">
          已收集 {{ allFragments.length }} 份
        </span>
      </div>
    </header>

    <!-- 时代切换页签 -->
    <div v-if="fragmentStore.fragments.length > 0" class="flex items-center gap-1 mb-4 overflow-x-auto no-scrollbar pb-1 flex-none border-b border-base-200">
      <button 
        v-for="era in eraTabs" 
        :key="era.key"
        class="btn btn-sm whitespace-nowrap"
        :class="selectedEra === era.key ? 'btn-primary' : 'btn-ghost text-base-content/60'"
        @click="selectedEra = era.key"
      >
        {{ era.name }}
      </button>
    </div>

    <div v-if="fragmentStore.fragments.length === 0" class="flex-1 flex flex-col items-center justify-center opacity-50 p-8 text-center">
      <Icon icon="game-icons:parchment" class="text-6xl mb-4" />
      <p>目前还没有收集到任何手稿。</p>
      <p class="text-xs mt-2">在石器时代之后，通过挖掘或爆破行动有机会获得它们。</p>
    </div>

    <div v-else-if="allFragments.length === 0 && searchQuery" class="flex-1 flex flex-col items-center justify-center opacity-50 p-8 text-center">
      <Icon icon="tabler:search-off" class="text-6xl mb-4" />
      <p>没有找到匹配的手稿。</p>
      <button class="btn btn-ghost btn-sm mt-2" @click="searchQuery = ''">重置搜索</button>
    </div>

    <div v-else class="flex-1 flex gap-4 overflow-hidden min-h-0">
      <!-- 列表侧栏 -->
      <div class="w-1/3 lg:w-1/4 flex flex-col gap-2 overflow-y-auto px-1 py-1 custom-scrollbar">
        <div 
          v-for="frag in allFragments" 
          :key="frag.key"
          class="p-3 rounded-lg cursor-pointer transition-all border border-base-300 relative"
          :class="[
            activeKey === frag.key ? 'bg-primary text-primary-content border-primary shadow-md' : 'bg-base-200 hover:bg-base-300',
            frag.isUnread ? 'ring-1 ring-error' : '',
            frag.isProven && activeKey !== frag.key ? 'opacity-70' : ''
          ]"
          @click="selectFragment(frag.key)"
        >
          <div v-if="frag.isUnread" class="badge badge-error badge-xs absolute -top-1 -right-1">NEW</div>
          <div v-if="frag.isProven" class="absolute top-1 right-1">
            <Icon icon="tabler:circle-check-filled" class="text-success text-xs" />
          </div>
          <div class="text-sm font-bold truncate leading-tight pr-4">{{ frag.formula?.name }}</div>
        </div>
      </div>

      <!-- 内容区 -->
      <div class="flex-1 bg-base-200 rounded-xl p-4 lg:p-6 overflow-y-auto custom-scrollbar relative border border-base-300 shadow-inner">
        <template v-if="activeFragment">
          <div class="absolute top-4 right-4 opacity-10 pointer-events-none">
            <Icon icon="game-icons:parchment" class="text-8xl" />
          </div>

          <h2 class="text-2xl font-serif font-bold mb-2 border-b-2 border-primary/20 pb-2 flex items-center justify-between">
            <span>「{{ activeFragment.formula?.name }}」的手稿</span>
            <div v-if="activeFragment.isProven" class="badge badge-success gap-1 text-xs">
              <Icon icon="tabler:check" />
              已实验成功
            </div>
          </h2>
          
          <div class="mb-6 p-4 bg-base-300/50 rounded-lg italic font-serif leading-relaxed text-lg" v-html="formatDescription(activeFragment.formula?.fragment_description || '', activeFragment.formula?.products, activeFragment.formula?.required_items)">
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- 所需材料 -->
            <div class="space-y-3">
              <h3 class="font-bold flex items-center gap-2 text-sm opacity-80 uppercase tracking-wider">
                <Icon icon="game-icons:materials-science" />
                疑似原材料
              </h3>
              <div class="space-y-2">
                <div 
                  v-for="(req, i) in activeFragment.formula?.required_items" 
                  :key="i"
                  class="flex items-center justify-between p-2 bg-base-100 rounded border border-base-300"
                  :class="{ 'border-error/50 bg-error/5': packStore.hasEverHad(Array.isArray(req.key) ? req.key[0] : req.key) && !isMaterialEnough(req.key, req.quantity) }"
                >
                  <span class="text-sm" :class="{ 'text-error': packStore.hasEverHad(Array.isArray(req.key) ? req.key[0] : req.key) && !isMaterialEnough(req.key, req.quantity) }">
                    <template v-if="Array.isArray(req.key)">
                      <template v-for="(k, idx) in req.key" :key="k">
                        <span v-if="idx > 0" class="mx-1 opacity-50">/</span>
                        <span :class="{ 'opacity-40 italic': !packStore.hasEverHad(k) }">
                          {{ packStore.hasEverHad(k) ? packStore.getDisplayName(k) : '???' }}
                        </span>
                      </template>
                    </template>
                    <template v-else>
                      <span :class="{ 'opacity-40 italic': !packStore.hasEverHad(req.key) }">
                        {{ packStore.hasEverHad(req.key) ? packStore.getDisplayName(req.key) : '???' }}
                      </span>
                    </template>
                    <span v-if="allMaterialsDiscovered(activeFragment.formula)" class="ml-2 text-[10px] opacity-40">
                      (持有: {{ Array.isArray(req.key) ? req.key.reduce((acc, k) => acc + packStore.getItemQuantity(k), 0) : packStore.getItemQuantity(req.key) }})
                    </span>
                  </span>
                  <span class="text-xs opacity-60">x {{ req.quantity }}</span>
                </div>
              </div>
            </div>

            <!-- 产物 -->
            <div class="space-y-3">
              <h3 class="font-bold flex items-center gap-2 text-sm opacity-80 uppercase tracking-wider">
                <Icon icon="game-icons:crystal-growth" />
                预期产出
              </h3>
              <div class="space-y-2">
                <div 
                  v-for="(prod, i) in activeFragment.formula?.products" 
                  :key="i"
                  class="flex items-center justify-between p-2 bg-base-100 rounded border border-base-300"
                >
                  <span class="text-sm font-medium">
                    {{ (isGasItem(prod.key) && !hasGasTech) ? '???' : packStore.getDisplayName(prod.key) }}
                  </span>
                  <span v-if="prod.multiple && prod.multiple !== 1" class="text-xs opacity-60">x {{ prod.multiple }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="mt-8 pt-4 border-t border-base-300 flex flex-wrap gap-4 items-center">
             <div class="flex items-center gap-2 text-xs opacity-60">
                <Icon icon="mdi:clock-outline" />
                耗时约为 {{ getFormulaTime(activeFragment.formula) }}s
             </div>
             <div v-if="activeFragment.formula?.required_container" class="flex items-center gap-2 text-xs opacity-60">
                <Icon icon="mdi:archive-outline" />
                对应容器：{{ packStore.getDisplayName(activeFragment.formula.required_container) }}
             </div>
             <div v-if="activeFragment.formula?.required_actions" class="flex items-center gap-2 text-xs opacity-60 text-secondary font-bold">
                <Icon icon="mdi:flask-outline" />
                关键操作：{{ Labs.find(l => l.key === activeFragment!.formula!.required_actions?.key)?.name || '未知' }}
             </div>

             <div v-if="!activeFragment.isProven" class="w-full mt-2">
                <button 
                  class="btn btn-primary btn-sm w-full md:w-auto"
                  :disabled="!requirementsMet"
                  @click="tryFormula"
                >
                  <Icon icon="entypo:lab-flask" />
                  去实验室试一试
                </button>
                <div v-if="!requirementsMet" class="text-[10px] text-error mt-1 opacity-70">
                  <Icon icon="mdi:alert-circle-outline" class="inline mr-1" />
                  材料不足或缺少必要容器
                </div>
             </div>
          </div>
        </template>
        <div v-else class="h-full flex items-center justify-center opacity-30 italic">
          请选择一份手稿进行研读
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: hsl(var(--bc) / 0.1);
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: hsl(var(--bc) / 0.2);
}

font-serif {
  font-family: 'Noto Serif SC', serif;
}
</style>
