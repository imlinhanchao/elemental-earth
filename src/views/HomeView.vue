<script setup lang="ts">
  import { computed } from 'vue';
  import { Actions } from '@/data/actions';
  import { Formulas } from '@/data/formula';
  import { getItem } from '@/data/items';
  import Action from '@/components/Action.vue';
  import ActionTip from '@/components/ActionTip.vue';
  import { usePackStore } from '@/stores/modules/pack';
  import { useTaskStore } from '@/stores/modules/task';
  import { useLogStore } from '@/stores/modules/log';

  const packStore = usePackStore();
  const taskStore = useTaskStore();
  const logStore = useLogStore();

  /** 已习得的配方 */
  const provenFormulas = computed(() => {
    return Formulas.filter(f => packStore.hasProvenFormula(f.key));
  });

  /** 分类显示顺序 */
  const categoryOrder = ['采集', '制作'];

  /** 按分类分组的行动列表 */
  const groupedActions = computed(() => {
    const groups: { category: string; actions: typeof Actions }[] = [];
    const map = new Map<string, typeof Actions>();

    for (const action of Actions) {
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

  /** 检查是否可以执行配方 */
  function canPerformFormula(formula: typeof Formulas[number]): boolean {
    if (taskStore.tasks.length >= 100) return false;
    return formula.required_items.every((req) => {
      const reqKey = Array.isArray(req.key) ? req.key[0] : req.key;
      return packStore.hasItem(reqKey, req.quantity);
    });
  }

  /** 执行配方 */
  function performFormula(formula: typeof Formulas[number]): void {
    if (!canPerformFormula(formula)) return;

    // 1. 消耗材料
    for (const req of formula.required_items) {
      const reqKey = Array.isArray(req.key) ? req.key[0] : req.key;
      packStore.removeItem(reqKey, req.quantity, req.use);
    }

    // 2. 构建奖励
    const rewards = formula.products.map(p => ({
      key: p.key,
      quantity: p.multiple,
      probability: 1,
    }));

    // 3. 推入任务
    taskStore.pushLabTask({
      name: formula.name,
      key: `formula_${formula.key}_${Date.now()}`,
      description: formula.description,
      time_required: formula.time_required,
      rewards,
      required_items: formula.required_items.map(req => ({
        key: Array.isArray(req.key) ? req.key[0] : req.key,
        quantity: req.quantity,
        use: req.use,
      })),
    });

    // 4. 日志
    const productNames = formula.products
      .map(p => `${getItem(p.key)?.name || p.key} x${p.multiple}`)
      .join('、');
    logStore.addLog(`开始配方: ${formula.name}（${productNames}）`, 'craft');
  }
</script>
<template>
  <div class="flex flex-col gap-2">
    <!-- 已习得的配方 -->
    <details
      v-if="provenFormulas.length > 0"
      class="collapse collapse-arrow bg-base-200 overflow-visible isolation-auto"
      open
    >
      <summary class="collapse-title font-bold text-lg">
        配方
        <span class="text-sm text-base-content/60 font-normal">
          （{{ provenFormulas.length }}）
        </span>
      </summary>
      <div class="collapse-content">
        <div class="flex gap-3 flex-wrap">
          <ActionTip
            v-for="f in provenFormulas"
            :key="f.key"
            :description="f.description"
            :required_items="f.required_items.map(req => ({
              key: Array.isArray(req.key) ? req.key[0] : req.key,
              quantity: req.quantity,
            }))"
            :required_techs="f.required_techs"
          >
            <button
              class="btn w-[10em]"
              :disabled="!canPerformFormula(f)"
              @click="performFormula(f)"
            >
              {{ f.name }}
            </button>
          </ActionTip>
        </div>
      </div>
    </details>

    <!-- 行动分组 -->
    <details
      v-for="group in groupedActions"
      :key="group.category"
      class="collapse collapse-arrow bg-base-200 overflow-visible isolation-auto"
      open
    >
      <summary class="collapse-title font-bold text-lg">
        {{ group.category }}
        <span class="text-sm text-base-content/60 font-normal">
          （{{ group.actions.length }}）
        </span>
      </summary>
      <div class="collapse-content">
        <div class="flex gap-3 flex-wrap">
          <Action v-for="action in group.actions" :key="action.key" :data="action" />
        </div>
      </div>
    </details>
  </div>
</template>
