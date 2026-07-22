<script setup lang="ts">
  import { computed, ref } from 'vue';
  import { Actions } from '@/data/actions';
  import { Formulas, type IFormula } from '@/data/formula';
  import { LabActions } from '@/data/labs';
  import Action from '@/components/Action.vue';
  import ActionTip from '@/components/ActionTip.vue';
  import FormulaDialog from '@/components/FormulaDialog.vue';
  import { usePackStore } from '@/stores/modules/pack';
  import { useStateStore } from '@/stores/modules/state';
  import { useTaskStore } from '@/stores/modules/task';

  const packStore = usePackStore();
  const stateStore = useStateStore();
  const taskStore = useTaskStore();

  const searchQuery = ref('');

  /** 获取配方的单次耗时（操作耗时 * 最小次数） */
  function getFormulaTime(f: IFormula) {
    const opKey = f.required_actions?.key;
    if (!opKey) return f.time_required;
    const op = LabActions.find(a => a.key === opKey);
    if (!op) return f.time_required;
    return op.time_required * (f.required_actions?.min || 1);
  }

  /** 已习得的配方 */
  const provenFormulas = computed(() => {
    let list = Formulas.filter(f => packStore.hasProvenFormula(f.key));
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase().trim();
      list = list.filter(f => {
        // 1. 基础信息搜索
        if (f.name.toLowerCase().includes(q) || 
            f.key.toLowerCase().includes(q) || 
            f.description.toLowerCase().includes(q)) {
          return true;
        }

        // 2. 原材料搜索
        const matchesRequired = f.required_items?.some(req => {
          const keys = Array.isArray(req.key) ? req.key : [req.key];
          return keys.some(k => {
            const displayName = packStore.getDisplayName(k).toLowerCase();
            return k.toLowerCase().includes(q) || displayName.includes(q);
          });
        });
        if (matchesRequired) return true;

        // 3. 产物搜索
        const matchesProducts = f.products?.some(prod => {
          const displayName = packStore.getDisplayName(prod.key).toLowerCase();
          return prod.key.toLowerCase().includes(q) || displayName.includes(q);
        });
        if (matchesProducts) return true;

        return false;
      });
    }
    return list;
  });

  /** 分类显示顺序 */
  const categoryOrder = ['采集', '制作'];

  /** 按分类分组的行动列表（仅显示满足可见条件的按钮） */
  const groupedActions = computed(() => {
    const groups: { category: string; actions: typeof Actions }[] = [];
    const map = new Map<string, typeof Actions>();
    const q = searchQuery.value.toLowerCase().trim();

    for (const action of Actions) {
      // 跳过不可见的行动（科技未解锁 / 依赖物品不曾拥有 / 不在所需地图）
      if (action.required_techs && !action.required_techs.every(t => packStore.hasTech(t))) continue
      if (action.required_items.some(item => {
        const keys = Array.isArray(item.key) ? item.key : [item.key]
        return !keys.some(k => packStore.hasEverHad(k))
      })) continue
      if (action.map && !action.map.includes(stateStore.state.map)) continue

      // 搜索过滤
      if (q && !(
        action.name.toLowerCase().includes(q) || 
        action.key.toLowerCase().includes(q) || 
        action.description.toLowerCase().includes(q)
      )) continue;

      const cat = action.category || '未分类';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(action);
    }

    // 按指定顺序排列
    for (const cat of categoryOrder) {
      if (map.has(cat)) {
        groups.push({ category: cat, actions: map.get(cat)! });
        map.delete(cat);
      }
    }
    // 剩余未在 order 中定义的分类
    for (const [cat, actions] of map) {
      groups.push({ category: cat, actions });
    }
    return groups;
  });

  // ─── 配方对话框状态 ────────────────────────────────────────────
  const dialogFormulaKey = ref('')
  const dialogOperationKey = ref('')
  const showFormulaDialog = ref(false)

  function openFormulaDialog(formula: typeof Formulas[number]) {
    dialogFormulaKey.value = formula.key
    // 从配方中取操作 key
    dialogOperationKey.value = formula.required_actions?.key || ''
    showFormulaDialog.value = true
  }

  /** 配方是否至少有一种材料可执行 */
  function canPerformFormula(formula: typeof Formulas[number]): boolean {
    if (!formula.required_actions) return false
    return taskStore.canPerformWithProjection(formula.required_items)
  }

  function onFormulaDialogClose() {
    showFormulaDialog.value = false
  }
</script>
<template>
  <div class="flex flex-col gap-3 pb-30">
    <!-- 搜索栏 -->
    <header class="sticky bg-base-100 py-2 -top-6 z-50">
      <div class="w-full mb-1 input input-sm input-bordered">
         <div class="flex items-center pointer-events-none opacity-50">
           <Icon icon="tabler:search" class="text-sm" />
         </div>
         <input 
           v-model="searchQuery" 
           type="text" 
           placeholder="搜索行动或配方..." 
           class="w-full"
         />
         <button 
           v-if="searchQuery" 
           class="flex items-center opacity-50 hover:opacity-100 transition-opacity"
           @click="searchQuery = ''"
         >
           <Icon icon="tabler:x" class="text-xs" />
         </button>
      </div>
    </header>

    <div v-if="provenFormulas.length === 0 && groupedActions.length === 0 && searchQuery" class="py-12 text-center opacity-50">
      <Icon icon="tabler:search-off" class="text-3xl mx-auto mb-2" />
      <p>没有找到匹配的内容</p>
      <button class="btn btn-link btn-xs mt-1" @click="searchQuery = ''">清除搜索</button>
    </div>

    <!-- 已习得的配方 -->
    <details
      v-if="provenFormulas.length > 0"
      class="collapse collapse-arrow bg-base-200/60 shadow overflow-visible isolation-auto"
      open
    >
      <summary class="collapse-title font-bold text-lg">
        配方
        <span class="text-sm text-base-content/60 font-normal">
          （{{ provenFormulas.length }}）
        </span>
      </summary>
      <div class="collapse-content">
        <div class="grid grid-cols-2 md:grid-cols-6 gap-4 flex-wrap">
          <ActionTip
            v-for="f in provenFormulas"
            :key="f.key"
            :id="`action-${f.key}`"
            :description="f.description"
            :required_items="f.required_items.map(req => ({
              key: Array.isArray(req.key) ? (req.key.find(k => packStore.hasEverHad(k)) || req.key[0]) : req.key,
              quantity: req.quantity,
            }))"
            :required_techs="f.required_techs"
            :time_required="getFormulaTime(f)"
          >
            <button
              class="btn btn-soft w-full"
              :disabled="!canPerformFormula(f)"
              @click="openFormulaDialog(f)"
            >
              {{ f.name }}
            </button>
          </ActionTip>
        </div>
      </div>
    </details>

    <FormulaDialog
      :visible="showFormulaDialog"
      :formulaKey="dialogFormulaKey"
      :operationKey="dialogOperationKey"
      @close="onFormulaDialogClose"
    />

    <!-- 行动分组 -->
    <details
      v-for="group in groupedActions"
      :key="group.category"
      class="collapse collapse-arrow bg-base-200/60 shadow overflow-visible isolation-auto"
      :id="group.category === '采集' ? 'home-actions-collect' : group.category === '制作' ? 'home-actions-craft' : undefined"
      open
    >
      <summary class="collapse-title font-bold text-lg">
        {{ group.category }}
        <span class="text-sm text-base-content/60 font-normal">
          （{{ group.actions.length }}）
        </span>
      </summary>
      <div class="collapse-content">
        <div class="flex gap-4 flex-wrap">
          <Action v-for="action in group.actions" :key="action.key" :data="action" />
        </div>
      </div>
    </details>
  </div>
</template>
