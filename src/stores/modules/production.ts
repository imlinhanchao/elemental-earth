import { defineStore } from 'pinia'
import { reactive, ref } from 'vue'
import { useTaskStore } from './task'
import { usePackStore } from './pack'
import { useStateStore } from './state'
import { useToastStore } from './toast'
import { Formulas } from '@/data/formula'
import { Actions } from '@/data/actions'
import { Items } from '@/data/items'

export interface IProductionLineStep {
  type: 'action' | 'formula';
  key: string;
  name: string;
  count: number;
  /** For formulas: container, materials, operations, fire etc. */
  payload?: any;
}

export interface IProductionLine {
  id: string;
  name: string;
  steps: IProductionLineStep[];
}

export const useProductionStore = defineStore('production', () => {
  const productionLines = reactive<IProductionLine[]>([]);
  const draftSteps = reactive<IProductionLineStep[]>([]);

  const taskStore = useTaskStore();
  const packStore = usePackStore();
  const stateStore = useStateStore();
  const toastStore = useToastStore();

  function getItem(key: string) {
    return Items.find(i => i.key === key)
  }

  function addStepToDraft(step: Omit<IProductionLineStep, 'count'>, count: number = 1) {
    draftSteps.push({ ...step, count });
    toastStore.addToast(`已添加 ${step.name} 到生产线草稿`, 'success');
  }

  function removeStepFromDraft(index: number) {
    draftSteps.splice(index, 1);
  }

  function clearDraft() {
    draftSteps.splice(0, draftSteps.length);
  }

  function saveProductionLine(name: string) {
    if (draftSteps.length === 0) return;
    productionLines.push({
      id: Date.now().toString(),
      name: name || `生产线 ${productionLines.length + 1}`,
      steps: [...draftSteps]
    });
    clearDraft();
    toastStore.addToast('生产线已保存', 'success');
  }

  function removeProductionLine(id: string) {
    const index = productionLines.findIndex(l => l.id === id);
    if (index !== -1) {
      productionLines.splice(index, 1);
    }
  }

  function editProductionLine(line: IProductionLine) {
    clearDraft();
    draftSteps.push(...JSON.parse(JSON.stringify(line.steps)));
    toastStore.addToast(`已加载生产线 ${line.name} 到草稿区`);
  }

  function getNetRequirements(steps: IProductionLineStep[], multiplier: number = 1) {
    const net: Record<string, { name: string, quantity: number, totalUse: number, isDurable: boolean }> = {};

    for (const step of steps) {
      const stepMultiplier = (step.count || 1) * multiplier;
      
      // Add requirements
      const requirements = step.payload?.required_items || [];
      for (const req of requirements) {
        const key = req.key;
        if (!net[key]) {
          const itemDef = getItem(key);
          net[key] = { 
            name: packStore.getDisplayName(key), 
            quantity: 0, 
            totalUse: 0,
            isDurable: itemDef?.type.some(t => ['tool', 'container', 'battery'].includes(t)) || false
          };
        }
        
        if (req.use) {
          net[key].totalUse += req.use * stepMultiplier;
        } else {
          net[key].quantity += req.quantity * stepMultiplier;
        }
      }

      // Subtract guaranteed outputs
      if (step.type === 'action') {
        const action = Actions.find(a => a.key === step.key);
        if (action) {
          const guaranteed = action.rewards.filter(r => r.guaranteed);
          for (const g of guaranteed) {
            if (!net[g.key]) {
              net[g.key] = { name: packStore.getDisplayName(g.key), quantity: 0, totalUse: 0, isDurable: false };
            }
            const qty = Array.isArray(g.quantity) ? g.quantity[0] : (g.quantity || 1);
            net[g.key].quantity -= qty * stepMultiplier;
          }
        }
      } else if (step.type === 'formula') {
        const products = step.payload?.rewards || [];
        for (const p of products) {
          if (!net[p.key]) {
            net[p.key] = { name: packStore.getDisplayName(p.key), quantity: 0, totalUse: 0, isDurable: false };
          }
          const qty = Array.isArray(p.quantity) ? p.quantity[0] : (p.quantity || 1);
          net[p.key].quantity -= qty * stepMultiplier;
        }
      }
    }

    // Filter out materials with key ending in _fire
    return Object.fromEntries(
      Object.entries(net)
        .filter(([k, v]) => (v.quantity > 0 || v.totalUse > 0) && !k.endsWith('_fire'))
    );
  }

  function executeProductionLine(id: string, multiplier: number = 1) {
    const line = productionLines.find(l => l.id === id);
    if (!line) return;

    const { ok, invalidActions } = validateMapCompatibility(line);
    if (!ok) {
      toastStore.addToast(`无法执行生产线：${invalidActions.join('、')} 不适配当前地图`, 'error');
      return;
    }

    let addedCount = 0;
    for (const step of line.steps) {
      const totalCount = step.count * multiplier;
      
      if (step.type === 'action') {
        const action = Actions.find(a => a.key === step.key);
        if (!action) continue;

        for (let i = 0; i < totalCount; i++) {
          if (taskStore.tasks.length >= 100) break;
          // Use fixed materials if provided in payload, otherwise resolve default
          // Since we want reproducibility, we should have saved the materials in payload
          taskStore.pushTask({
            ...action,
            id: `prod-${line.id}-${step.key}-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`,
            required_items: step.payload?.required_items || action.required_items
          });
          addedCount++;
        }
      } else if (step.type === 'formula') {
        const formula = Formulas.find(f => f.key === step.key);
        if (!formula) continue;

        for (let i = 0; i < totalCount; i++) {
          if (taskStore.tasks.length >= 100) break;
          if (step.payload) {
            taskStore.pushLabTask({
              ...step.payload,
              id: `prod-${line.id}-${step.key}-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`
            });
            addedCount++;
          }
        }
      }
    }
    toastStore.addToast(`已添加 ${addedCount} 个任务到队列`, 'success');
  }

  function validateMapCompatibility(line: IProductionLine | { steps: IProductionLineStep[] }): { ok: boolean, invalidActions: string[] } {
    const currentMap = stateStore.state.map;
    const invalidActions: string[] = [];
    
    for (const step of line.steps) {
      if (step.type === 'action') {
        const action = Actions.find(a => a.key === step.key);
        if (action?.map && !action.map.includes(currentMap)) {
          invalidActions.push(action.name);
        }
      }
    }

    return {
      ok: invalidActions.length === 0,
      invalidActions
    };
  }

  return {
    productionLines,
    draftSteps,
    addStepToDraft,
    removeStepFromDraft,
    clearDraft,
    saveProductionLine,
    removeProductionLine,
    executeProductionLine,
    validateMapCompatibility,
    editProductionLine,
    getNetRequirements
  }
})
