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

  function collapseSteps(steps: IProductionLineStep[]) {
    const result: IProductionLineStep[] = [];
    for (const step of steps) {
      const last = result[result.length - 1];
      if (last && last.key === step.key && last.type === step.type && JSON.stringify(last.payload) === JSON.stringify(step.payload)) {
        last.count += step.count;
      } else {
        result.push({ ...step });
      }
    }
    return result;
  }

  function addStepToDraft(step: Omit<IProductionLineStep, 'count'>, count: number = 1) {
    const last = draftSteps[draftSteps.length - 1];
    if (last && last.key === step.key && last.type === step.type && JSON.stringify(last.payload) === JSON.stringify(step.payload)) {
      last.count += count;
    } else {
      draftSteps.push({ ...step, count });
    }
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

  function getTotalTime(steps: IProductionLineStep[], multiplier: number = 1) {
    let total = 0;
    for (const step of steps) {
      const stepMultiplier = (step.count || 1) * multiplier;
      if (step.type === 'action') {
        const action = Actions.find(a => a.key === step.key);
        if (action) total += action.time_required * stepMultiplier;
      } else if (step.type === 'formula') {
        const formula = Formulas.find(f => f.key === step.key);
        if (formula) total += formula.time_required * stepMultiplier;
      }
    }
    return total;
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

  /**
   * 导出生产线为压缩字符串
   * 格式: EAPv1|Name|JSON
   */
  function exportLine(id: string): string {
    const line = productionLines.find(l => l.id === id)
    if (!line) return ''
    
    // 简化步骤数据以减小体积
    const data = line.steps.map(s => ({
      t: s.type === 'action' ? 0 : 1,
      k: s.key,
      c: s.count,
      p: s.payload
    }))

    const json = JSON.stringify({ n: line.name, s: data })
    // 使用简单的 Base64，后续如有需求可引入更高效的压缩
    return 'EAPv1:' + btoa(encodeURIComponent(json))
  }

  /**
   * 导入生产线
   * 返回 { success: boolean, message: string }
   */
  function importLine(code: string): { success: boolean, message: string } {
    if (!code.startsWith('EAPv1:')) {
      return { success: false, message: '无效的生产线代码格式' }
    }

    try {
      const jsonStr = decodeURIComponent(atob(code.substring(6)))
      const data = JSON.parse(jsonStr)
      
      const missingKeys: string[] = []
      const steps: IProductionLineStep[] = []

      for (const s of data.s) {
        const type = s.t === 0 ? 'action' : 'formula'
        const key = s.k
        
        let name = ''
        let isUnlocked = false

        if (type === 'action') {
          const action = Actions.find(a => a.key === key)
          if (action) {
            name = action.name
            // 检查已解锁状态: 拥有对应技术且已尝试执行过(或产物已全解锁)
            const techsOk = !action.required_techs || action.required_techs.every(t => packStore.hasTech(t))
            const performedOk = packStore.performedActions.has(key)
            isUnlocked = techsOk && performedOk
          }
        } else {
          const formula = Formulas.find(f => f.key === key)
          if (formula) {
            name = formula.name
            isUnlocked = packStore.provenFormulas.includes(key)
          }
        }

        if (!isUnlocked) {
          missingKeys.push(name || key)
        }

        steps.push({
          type,
          key,
          name: name || key,
          count: s.c,
          payload: s.p
        })
      }

      if (missingKeys.length > 0) {
        return { 
          success: false, 
          message: `导入失败：以下内容未解锁 - ${missingKeys.join(', ')}` 
        }
      }

      // 导入到草稿
      draftSteps.splice(0, draftSteps.length, ...steps)
      // 如果有名字，尝试填入 (由 UI 处理比较好，或者这里直接返回名字)
      return { success: true, message: data.n }

    } catch (e) {
      return { success: false, message: '代码解析失败，请检查输入' }
    }
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
    getNetRequirements,
    collapseSteps,
    getTotalTime,
    exportLine,
    importLine
  }
})
