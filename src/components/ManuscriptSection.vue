<script setup lang="ts">
  import { computed } from 'vue';
  import { Actions } from '@/data/actions';
  import { Formulas } from '@/data/formula';
  import Action from '@/components/Action.vue';
  import FormulaAction from '@/components/FormulaAction.vue';
  import { usePackStore } from '@/stores/modules/pack';
  import { LabActions } from '@/data/labs';

  const packStore = usePackStore();

  const allActionsMap = computed(() => new Map(Actions.map(a => [a.key, a])))
  const allFormulasMap = computed(() => new Map(Formulas.map(f => [f.key, f])))

  const emit = defineEmits<{
    (e: 'open-formula', formula: typeof Formulas[number]): void
  }>()

  /** 获取配方的单次耗时 */
  function getFormulaTime(f: any) {
    const opKey = f.required_actions?.key;
    if (!opKey) return f.time_required;
    const op = LabActions.find(a => a.key === opKey);
    if (!op) return f.time_required;
    return op.time_required * (f.required_actions?.min || 1);
  }

  function promptCreateGroup() {
    const name = window.prompt('请输入新手札名称')
    if (name) packStore.createManuscriptGroup(name)
  }

  function promptRenameGroup(group: any) {
    const name = window.prompt('请输入新手札名称', group.name)
    if (name) packStore.renameManuscriptGroup(group.id, name)
  }

  function canPerformFormula(formula: any): boolean {
    // 这里简单判断，实际逻辑由 TaskStore 提供，但组件内可简化
    return true
  }
</script>

<template>
  <details
    v-if="packStore.manuscripts.length > 0"
    class="collapse collapse-arrow bg-base-200/60 shadow overflow-visible isolation-auto mb-1"
    :open="packStore.manuscripts.length > 0"
  >
    <summary class="collapse-title font-bold text-lg flex items-center justify-between pr-12! pointer-events-none">
      <div class="flex items-center gap-2 pointer-events-auto">
        手札
        <span class="text-sm text-base-content/60 font-normal">
          （{{ packStore.manuscripts.length }}）
        </span>
      </div>
      <button 
        class="btn btn-circle btn-ghost btn-xs pointer-events-auto absolute right-10 top-1/2 -translate-y-1/2 z-10" 
        @click.stop="promptCreateGroup"
      >
        <Icon icon="tabler:plus" />
      </button>
    </summary>
    <div class="collapse-content overflow-visible">
      <div v-if="packStore.manuscripts.length === 0" class="text-center py-4 opacity-50 text-sm">
        暂无分组，点击上方 + 创建
      </div>
      <div class="grid grid-cols-2 lg:grid-cols-6 gap-2">
         <div 
           v-for="group in packStore.manuscripts" 
           :key="group.id" 
           class="dropdown dropdown-hover w-full"
         >
           <div tabindex="0" role="button" class="btn btn-soft w-full truncate">
             <span class="truncate">{{ group.name }}</span>
             <Icon icon="tabler:chevron-down" class="text-xs opacity-50 shrink-0" />
           </div>
           <div tabindex="0" class="dropdown-content overflow-visible p-4 shadow-2xl bg-base-100 rounded-box w-[90vw] md:w-150 z-50 border border-base-300">
             <div class="flex items-center justify-between mb-4 pb-2 border-b border-base-content/5">
               <div class="flex items-center gap-2">
                 <span class="font-bold text-base">{{ group.name }}</span>
                 <span class="badge badge-sm badge-ghost opacity-50">{{ group.items.length }} 项</span>
               </div>
               <div class="flex gap-1">
                  <button class="btn btn-xs btn-ghost" @click="promptRenameGroup(group)">
                    <Icon icon="tabler:edit" class="opacity-50" />
                  </button>
                  <button class="btn btn-xs btn-ghost text-error" @click="packStore.deleteManuscriptGroup(group.id)">
                    <Icon icon="tabler:trash" class="opacity-50" />
                  </button>
               </div>
             </div>

             <div v-if="group.items.length === 0" class="py-8 text-center opacity-30 italic text-sm">
               空空如也，点击下方详情菜单添加内容
             </div>
             
             <div class="flex gap-4 flex-wrap p-1">
               <template v-for="item in group.items" :key="item.key">
                 <!-- 行动 -->
                 <template v-if="item.type === 'action'">
                   <Action 
                     v-if="allActionsMap.get(item.key)" 
                     :data="allActionsMap.get(item.key)!"
                     :in-group-id="group.id"
                   />
                 </template>

                 <!-- 配方 -->
                 <template v-else-if="item.type === 'formula'">
                   <FormulaAction
                      v-if="allFormulasMap.get(item.key)"
                      :data="allFormulasMap.get(item.key)!"
                      :in-group-id="group.id"
                      @click="emit('open-formula', $event)"
                   />
                 </template>
               </template>
             </div>
           </div>
         </div>
      </div>
    </div>
  </details>
  <section v-else class="text-center py-8 opacity-50 text-sm">
    暂无手札分组，<span class="cursor-pointer hover:border-b border-dashed" @click="promptCreateGroup">点击创建</span>
  </section>
</template>
