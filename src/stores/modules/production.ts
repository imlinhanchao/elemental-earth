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
  type: 'action' | 'formula' | 'line';
  key: string;
  name: string;
  count: number;
  /** For formulas: container, materials, operations, fire etc. */
  payload?: any;
  /** 
   * 执行条件
   * e.g. { key: 'iron_ore', operator: '>', value: 10 } 
   * 表示：如果背包中 iron_ore > 10 则执行
   */
  condition?: {
    key: string;
    operator: '>' | '<' | '>=' | '<=' | '==' | '!=';
    value: number;
    /** 循环执行直至条件满足 (即条件为 false 时持续添加任务) */
    loopUntil?: boolean;
  };
}

export interface IProductionLine {
  id: string;
  name: string;
  steps: IProductionLineStep[];
}

export type IImportConflictAction = 'keep' | 'reset'

export interface IProductionImportConflict {
  id: string;
  existingName: string;
  importedName: string;
  sameName: boolean;
  sameContent: boolean;
  warning: boolean;
}

export interface IProductionImportPreviewItem {
  id: string;
  name: string;
  depth: number;
  parentId: string | null;
  stepCount: number;
  conflict?: IProductionImportConflict;
}

export interface IProductionImportPreview {
  rootId: string;
  rootName: string;
  lines: IProductionLine[];
  items: IProductionImportPreviewItem[];
  conflicts: IProductionImportConflict[];
  hasNested: boolean;
}

export interface IProductionImportPreviewResult {
  success: boolean;
  message: string;
  preview?: IProductionImportPreview;
}

export interface IProductionImportApplyResult {
  success: boolean;
  message: string;
  importedIds: string[];
  rootId?: string;
}

interface IEncodedProductionStep {
  t: 0 | 1 | 2;
  k: string;
  c?: number;
  p?: any;
  cd?: IProductionLineStep['condition'];
  n?: string;
}

interface IEncodedProductionLine {
  id: string;
  n: string;
  s: IEncodedProductionStep[];
}

interface IExportBundleV2 {
  v: 2;
  rootId: string;
  lines: IEncodedProductionLine[];
}

export const useProductionStore = defineStore('production', () => {
  const productionLines = reactive<IProductionLine[]>([]);
  const draftSteps = reactive<IProductionLineStep[]>([]);
  const currentEditingId = ref<string | null>(null);

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

  function updateStepInDraft(index: number, step: IProductionLineStep) {
    if (index >= 0 && index < draftSteps.length) {
      draftSteps[index] = { ...step };
    }
  }

  function clearDraft() {
    draftSteps.splice(0, draftSteps.length);
    currentEditingId.value = null;
  }

  function moveStepInDraft(fromIndex: number, toIndex: number) {
    if (fromIndex < 0 || fromIndex >= draftSteps.length || toIndex < 0 || toIndex >= draftSteps.length) return;
    const step = draftSteps.splice(fromIndex, 1)[0];
    draftSteps.splice(toIndex, 0, step);
  }

  function moveProductionLine(fromIndex: number, toIndex: number) {
    if (fromIndex < 0 || fromIndex >= productionLines.length || toIndex < 0 || toIndex >= productionLines.length) return;
    const line = productionLines.splice(fromIndex, 1)[0];
    productionLines.splice(toIndex, 0, line);
    saveToStorage();
  }

  function saveProductionLine(name: string) {
    if (draftSteps.length === 0) return;
    
    if (currentEditingId.value) {
      const idx = productionLines.findIndex(l => l.id === currentEditingId.value);
      if (idx !== -1) {
        productionLines[idx].name = name || productionLines[idx].name;
        productionLines[idx].steps = [...JSON.parse(JSON.stringify(draftSteps))];
      }
    } else {
      productionLines.push({
        id: Date.now().toString(),
        name: name || `生产线 ${productionLines.length + 1}`,
        steps: [...JSON.parse(JSON.stringify(draftSteps))]
      });
    }
    
    clearDraft();
    saveToStorage();
    toastStore.addToast('生产线已保存', 'success');
  }

  function removeProductionLine(id: string) {
    const index = productionLines.findIndex(l => l.id === id);
    if (index !== -1) {
      productionLines.splice(index, 1);
      saveToStorage();
    }
  }

  function editProductionLine(line: IProductionLine) {
    clearDraft();
    draftSteps.push(...JSON.parse(JSON.stringify(line.steps)));
    currentEditingId.value = line.id;
    toastStore.addToast(`已加载生产线 ${line.name} 到草稿区`);
  }

  function getNetRequirements(steps: IProductionLineStep[], multiplier: number = 1, depth: number = 0) {
    const net: Record<string, { name: string, quantity: number, totalUse: number, isDurable: boolean }> = {};
    if (depth > 5) return net;

    for (const step of steps) {
      const stepMultiplier = (step.count || 1) * multiplier;
      
      if (step.type === 'line') {
        const line = productionLines.find(l => l.id === step.key);
        if (line) {
          const subReq = getNetRequirements(line.steps, stepMultiplier, depth + 1);
          for (const [k, v] of Object.entries(subReq)) {
            if (!net[k]) net[k] = { ...v, quantity: 0, totalUse: 0 };
            net[k].quantity += v.quantity;
            net[k].totalUse += v.totalUse;
          }
        }
        continue;
      }

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

  function getTotalTime(steps: IProductionLineStep[], multiplier: number = 1, depth: number = 0): number {
    let total = 0;
    if (depth > 5) return 0;

    for (const step of steps) {
      const stepMultiplier = (step.count || 1) * multiplier;
      if (step.type === 'action') {
        const action = Actions.find(a => a.key === step.key);
        if (action) total += action.time_required * stepMultiplier;
      } else if (step.type === 'formula') {
        const formula = Formulas.find(f => f.key === step.key);
        if (formula) total += formula.time_required * stepMultiplier;
      } else if (step.type === 'line') {
        const line = productionLines.find(l => l.id === step.key);
        if (line) {
          total += getTotalTime(line.steps, stepMultiplier, depth + 1);
        }
      }
    }
    return total;
  }

  function checkStepCondition(condition: IProductionLineStep['condition'], inventory?: Map<string, number>): boolean {
    if (!condition) return true;
    const count = inventory ? (inventory.get(condition.key) || 0) : packStore.getItemQuantity(condition.key);
    switch (condition.operator) {
      case '>': return count > condition.value;
      case '<': return count < condition.value;
      case '>=': return count >= condition.value;
      case '<=': return count <= condition.value;
      case '==': return count === condition.value;
      case '!=': return count !== condition.value;
      default: return true;
    }
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
    addedCount = addStepsToQueue(line.id, line.steps, multiplier);
    toastStore.addToast(`已添加 ${addedCount} 个任务到队列`, 'success');
  }

  /**
   * 将生产线步骤展开并推入任务队列
   * @param lineId 来源生产线 ID
   * @param steps 步骤列表
   * @param m 倍率
   * @param depth 递归深度
   * @returns 成功添加的任务数
   */
  function addStepsToQueue(lineId: string, steps: IProductionLineStep[], m: number, depth: number = 0, targetMap?: string): number {
    if (depth > 5) return 0; // Prevent infinite recursion
    let addedCount = 0;
    const mapKey = targetMap || stateStore.state.map;

    for (const step of steps) {
      // 1. 循环条件的处理 (Loop Until)
      if (step.condition?.loopUntil) {
        // 预检：如果根据预期清单已经满足条件，直接跳过
        if (checkStepCondition(step.condition, taskStore.projectedInventory)) {
          continue;
        }

        // 如果还没满足逻辑，推入【一个】带有循环属性的任务
        let pushSuccess = false;
        const commonId = `prod-${lineId}-${step.key}-${Date.now()}-loop-${Math.random().toString(36).slice(2, 5)}`;
        
        if (step.type === 'action') {
          const action = Actions.find(a => a.key === step.key);
          if (!action) continue;
          pushSuccess = taskStore.pushTask({
            ...action,
            id: commonId,
            required_items: step.payload?.required_items || action.required_items,
            condition: step.condition
          } as any, mapKey);
        } else if (step.type === 'formula') {
          const formula = Formulas.find(f => f.key === step.key);
          if (!formula || !step.payload) continue;
          pushSuccess = taskStore.pushLabTask({
            ...step.payload,
            id: commonId,
            condition: step.condition
          }, mapKey);
        } else if (step.type === 'line') {
          // 嵌套生产线的 LoopUntil：展开一次，并在末尾追加一个“检查并重复”任务
          const subLine = productionLines.find(l => l.id === step.key);
          if (subLine) {
            addedCount += addStepsToQueue(step.key, subLine.steps, 1, depth + 1, mapKey);
            // 追加检查任务
            taskStore.pushTask({
              id: `prod-check-${step.key}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              name: `检查: ${subLine.name}`,
              type: 'production_check',
              required_items: [],
              condition: step.condition,
              line_steps: subLine.steps,
              source_line_id: step.key,
              time_required: 1, // 1s 检查时间
              begin_time: Date.now()
            } as any, mapKey);
            pushSuccess = true;
          }
        }

        if (pushSuccess) addedCount++;
        continue; // 转入下一个 Step
      }

      // 2. 普通条件检查 (If condition)
      if (step.condition && !step.condition.loopUntil) {
        if (!checkStepCondition(step.condition, taskStore.projectedInventory)) {
          continue;
        }
      }

      // 3. 普通任务/嵌套生产线展开
      const cycles = step.count * m;
      for (let j = 0; j < cycles; j++) {
        if (taskStore.currentMapTasks.length >= 100) break;

        let pushSuccess = false;
        if (step.type === 'action') {
          const action = Actions.find(a => a.key === step.key);
          if (!action) break;

          pushSuccess = taskStore.pushTask({
            ...action,
            id: `prod-${lineId}-${step.key}-${Date.now()}-${j}-${Math.random().toString(36).slice(2, 7)}`,
            required_items: step.payload?.required_items || action.required_items
          } as any, mapKey);
        } else if (step.type === 'formula') {
          const formula = Formulas.find(f => f.key === step.key);
          if (!formula || !step.payload) break;

          pushSuccess = taskStore.pushLabTask({
            ...step.payload,
            id: `prod-${lineId}-${step.key}-${Date.now()}-${j}-${Math.random().toString(36).slice(2, 7)}`
          }, mapKey);
        } else if (step.type === 'line') {
          const subLine = productionLines.find(l => l.id === step.key);
          if (subLine) {
            addedCount += addStepsToQueue(step.key, subLine.steps, 1, depth + 1, mapKey);
            pushSuccess = true; 
          } else {
            break;
          }
        }

        if (pushSuccess) {
          addedCount++;
        } else {
          break;
        }
      }
    }
    return addedCount;
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

  function normalizeStepsForCompare(steps: IProductionLineStep[]) {
    return steps.map(step => ({
      type: step.type,
      key: step.key,
      count: step.count || 1,
      payload: step.payload ?? null,
      condition: step.condition ?? null
    }))
  }

  function isLineEquivalent(a: IProductionLine, b: IProductionLine): { sameName: boolean, sameContent: boolean } {
    const sameName = a.name === b.name
    const sameContent = JSON.stringify(normalizeStepsForCompare(a.steps)) === JSON.stringify(normalizeStepsForCompare(b.steps))
    return { sameName, sameContent }
  }

  function getStepTypeByCode(code: number): IProductionLineStep['type'] {
    if (code === 1) return 'formula'
    if (code === 2) return 'line'
    return 'action'
  }

  function getStepTypeCode(type: IProductionLineStep['type']): 0 | 1 | 2 {
    if (type === 'formula') return 1
    if (type === 'line') return 2
    return 0
  }

  function getStepDisplayName(type: IProductionLineStep['type'], key: string, encodedName?: string, importedNameMap?: Map<string, string>) {
    if (type === 'action') {
      return Actions.find(a => a.key === key)?.name || encodedName || key
    }
    if (type === 'formula') {
      return Formulas.find(f => f.key === key)?.name || encodedName || key
    }
    return importedNameMap?.get(key) || productionLines.find(l => l.id === key)?.name || encodedName || key
  }

  function generateUniqueLineId(seed: string, usedIds: Set<string>) {
    const safeSeed = (seed || 'line').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 24) || 'line'
    for (let i = 0; i < 500; i++) {
      const id = `${safeSeed}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
      if (!usedIds.has(id)) {
        usedIds.add(id)
        return id
      }
    }
    let fallbackIndex = 1
    while (usedIds.has(`${safeSeed}_${fallbackIndex}`)) fallbackIndex++
    const fallback = `${safeSeed}_${fallbackIndex}`
    usedIds.add(fallback)
    return fallback
  }

  function decodeImportString(code: string): { success: boolean, message: string, payload?: any, version?: 1 | 2 } {
    const isV2 = code.startsWith('EAPv2:')
    const isV1 = code.startsWith('EAPv1:')
    if (!isV1 && !isV2) {
      return { success: false, message: '无效的生产线代码格式' }
    }

    try {
      const encoded = code.substring(isV2 ? 6 : 6)
      const jsonStr = decodeURIComponent(atob(encoded))
      const payload = JSON.parse(jsonStr)
      return { success: true, message: 'ok', payload, version: isV2 ? 2 : 1 }
    } catch (e) {
      return { success: false, message: '代码解析失败，请检查输入' }
    }
  }

  function decodeLinesFromPayload(payload: any, version: 1 | 2): { success: boolean, message: string, rootId?: string, lines?: IProductionLine[] } {
    if (version === 2) {
      const bundle = payload as IExportBundleV2
      if (!bundle || bundle.v !== 2 || !bundle.rootId || !Array.isArray(bundle.lines)) {
        return { success: false, message: '生产线代码结构无效' }
      }

      const encodedMap = new Map<string, IEncodedProductionLine>()
      for (const rawLine of bundle.lines) {
        if (!rawLine?.id || !Array.isArray(rawLine.s)) {
          return { success: false, message: '生产线数据缺失字段' }
        }
        if (encodedMap.has(rawLine.id)) {
          return { success: false, message: `导入失败：发现重复产线 ID (${rawLine.id})` }
        }
        encodedMap.set(rawLine.id, rawLine)
      }

      if (!encodedMap.has(bundle.rootId)) {
        return { success: false, message: '导入失败：缺少顶级生产线数据' }
      }

      const importedNameMap = new Map<string, string>()
      for (const [id, line] of encodedMap.entries()) importedNameMap.set(id, line.n || id)

      const decodedMap = new Map<string, IProductionLine>()
      for (const [id, rawLine] of encodedMap.entries()) {
        const steps: IProductionLineStep[] = (rawLine.s || []).map((s: IEncodedProductionStep) => {
          const type = getStepTypeByCode(s.t)
          const key = s.k
          const name = getStepDisplayName(type, key, s.n, importedNameMap)
          return {
            type,
            key,
            name,
            count: s.c || 1,
            payload: s.p,
            condition: s.cd
          }
        })

        decodedMap.set(id, {
          id,
          name: rawLine.n || id,
          steps
        })
      }

      const missingRefs = new Set<string>()
      const unknownSteps: string[] = []

      for (const line of decodedMap.values()) {
        for (const step of line.steps) {
          if (step.type === 'action' && !Actions.find(a => a.key === step.key)) {
            unknownSteps.push(`未知行动: ${step.key}`)
          }
          if (step.type === 'formula' && !Formulas.find(f => f.key === step.key)) {
            unknownSteps.push(`未知配方: ${step.key}`)
          }
          if (step.type === 'line') {
            const importedTarget = decodedMap.get(step.key)
            const localTarget = productionLines.find(l => l.id === step.key)
            const targetName = importedTarget?.name || localTarget?.name
            if (!targetName) {
              missingRefs.add(step.key)
            }
            step.name = targetName || step.name || step.key
          }
        }
      }

      if (unknownSteps.length > 0) {
        return { success: false, message: `导入失败：${unknownSteps.join('，')}` }
      }
      if (missingRefs.size > 0) {
        return { success: false, message: `导入失败：缺少嵌套生产线 ${Array.from(missingRefs).join('，')}` }
      }

      const ordered: IProductionLine[] = []
      const visited = new Set<string>()
      const collect = (lineId: string) => {
        if (visited.has(lineId)) return
        const line = decodedMap.get(lineId)
        if (!line) return
        visited.add(lineId)
        ordered.push(JSON.parse(JSON.stringify(line)))
        for (const step of line.steps) {
          if (step.type === 'line' && decodedMap.has(step.key)) {
            collect(step.key)
          }
        }
      }

      collect(bundle.rootId)
      for (const id of decodedMap.keys()) collect(id)

      return { success: true, message: 'ok', rootId: bundle.rootId, lines: ordered }
    }

    // Legacy V1: 仅单条生产线，且通常不包含可递归导出的子孙数据
    if (!payload || !Array.isArray(payload.s)) {
      return { success: false, message: '旧版生产线代码结构无效' }
    }

    const usedIds = new Set(productionLines.map(l => l.id))
    const generatedId = generateUniqueLineId((payload.n || 'imported').toString(), usedIds)
    const steps: IProductionLineStep[] = payload.s.map((s: any) => {
      const type = getStepTypeByCode(s.t)
      const key = s.k
      const name = getStepDisplayName(type, key, undefined)
      return {
        type,
        key,
        name,
        count: s.c || 1,
        payload: s.p,
        condition: s.cd
      }
    })

    return {
      success: true,
      message: 'ok',
      rootId: generatedId,
      lines: [{ id: generatedId, name: payload.n || '导入生产线', steps }]
    }
  }

  function buildImportPreview(rootId: string, lines: IProductionLine[]): IProductionImportPreview {
    const lineMap = new Map(lines.map(l => [l.id, l]))
    const items: IProductionImportPreviewItem[] = []
    const conflicts: IProductionImportConflict[] = []
    const visited = new Set<string>()

    const walk = (lineId: string, depth: number, parentId: string | null) => {
      if (visited.has(lineId)) return
      const line = lineMap.get(lineId)
      if (!line) return
      visited.add(lineId)

      const local = productionLines.find(l => l.id === line.id)
      let conflict: IProductionImportConflict | undefined
      if (local) {
        const { sameName, sameContent } = isLineEquivalent(local, line)
        conflict = {
          id: line.id,
          existingName: local.name,
          importedName: line.name,
          sameName,
          sameContent,
          warning: !(sameName && sameContent)
        }
        conflicts.push(conflict)
      }

      items.push({
        id: line.id,
        name: line.name,
        depth,
        parentId,
        stepCount: line.steps.length,
        conflict
      })

      for (const step of line.steps) {
        if (step.type === 'line' && lineMap.has(step.key)) {
          walk(step.key, depth + 1, line.id)
        }
      }
    }

    walk(rootId, 0, null)
    for (const line of lines) walk(line.id, 0, null)

    const rootLine = lineMap.get(rootId) || lines[0]
    return {
      rootId,
      rootName: rootLine?.name || rootId,
      lines,
      items,
      conflicts,
      hasNested: lines.length > 1
    }
  }

  function previewImportLine(code: string): IProductionImportPreviewResult {
    const decoded = decodeImportString(code)
    if (!decoded.success || !decoded.version) {
      return { success: false, message: decoded.message }
    }

    const parsed = decodeLinesFromPayload(decoded.payload, decoded.version)
    if (!parsed.success || !parsed.rootId || !parsed.lines) {
      return { success: false, message: parsed.message }
    }

    const preview = buildImportPreview(parsed.rootId, parsed.lines)
    return { success: true, message: 'ok', preview }
  }

  function applyImportLines(preview: IProductionImportPreview, options?: { conflictActions?: Record<string, IImportConflictAction> }): IProductionImportApplyResult {
    const lines = preview.lines.map(l => JSON.parse(JSON.stringify(l)) as IProductionLine)
    const localIds = new Set(productionLines.map(l => l.id))
    const finalUsedIds = new Set<string>(localIds)
    const conflictActions = options?.conflictActions || {}
    const remap: Record<string, string> = {}

    for (const line of lines) {
      const hasLocal = localIds.has(line.id)
      const action = conflictActions[line.id] || 'keep'
      if (hasLocal && action === 'reset') {
        remap[line.id] = generateUniqueLineId(line.id, finalUsedIds)
      } else {
        finalUsedIds.add(line.id)
      }
    }

    const importedNameByOldId = new Map(lines.map(l => [l.id, l.name]))
    const importedNameByFinalId = new Map<string, string>()

    const finalLines: IProductionLine[] = lines.map(line => {
      const nextId = remap[line.id] || line.id
      const nextSteps = line.steps.map(step => {
        if (step.type !== 'line') return { ...step }
        const remappedKey = remap[step.key] || step.key
        const importedName = importedNameByOldId.get(step.key)
        const localName = productionLines.find(l => l.id === remappedKey)?.name
        return {
          ...step,
          key: remappedKey,
          name: importedName || localName || step.name || remappedKey
        }
      })

      importedNameByFinalId.set(nextId, line.name)
      return {
        id: nextId,
        name: line.name,
        steps: nextSteps
      }
    })

    for (const line of finalLines) {
      const idx = productionLines.findIndex(l => l.id === line.id)
      if (idx >= 0) {
        productionLines[idx] = line
      } else {
        productionLines.push(line)
      }
    }

    saveToStorage()

    const importedIds = finalLines.map(l => l.id)
    const rootId = remap[preview.rootId] || preview.rootId

    return {
      success: true,
      message: `已导入 ${finalLines.length} 条生产线`,
      importedIds,
      rootId
    }
  }

  /**
   * 导出生产线为压缩字符串
   * 新格式: EAPv2:Base64(JSON)
   */
  function exportLine(id: string): string {
    const line = productionLines.find(l => l.id === id)
    if (!line) return ''

    const visited = new Set<string>()
    const exportedLines: IEncodedProductionLine[] = []

    const collect = (lineId: string) => {
      if (visited.has(lineId)) return
      const target = productionLines.find(l => l.id === lineId)
      if (!target) return

      visited.add(lineId)

      exportedLines.push({
        id: target.id,
        n: target.name,
        s: target.steps.map(step => ({
          t: getStepTypeCode(step.type),
          k: step.key,
          c: step.count,
          p: step.payload,
          cd: step.condition,
          n: step.name
        }))
      })

      for (const step of target.steps) {
        if (step.type === 'line') {
          collect(step.key)
        }
      }
    }

    collect(id)
    if (exportedLines.length === 0) return ''

    const bundle: IExportBundleV2 = {
      v: 2,
      rootId: id,
      lines: exportedLines
    }

    return 'EAPv2:' + btoa(encodeURIComponent(JSON.stringify(bundle)))
  }

  /**
   * 兼容旧调用: 直接预览 + 按默认策略导入
   * 返回 { success: boolean, message: string }
   */
  function importLine(code: string): { success: boolean, message: string } {
    const preview = previewImportLine(code)
    if (!preview.success || !preview.preview) {
      return { success: false, message: preview.message }
    }

    const applied = applyImportLines(preview.preview)
    return { success: applied.success, message: applied.message }
  }

  function saveToStorage() {
    localStorage.setItem('ele_production_lines', JSON.stringify(productionLines));
  }

  function loadFromStorage() {
    const saved = localStorage.getItem('ele_production_lines');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        productionLines.splice(0, productionLines.length, ...parsed);
      } catch (e) {
        console.error('Failed to load production lines', e);
      }
    }
  }

  loadFromStorage();

  return {
    productionLines,
    draftSteps,
    addStepToDraft,
    updateStepInDraft,
    removeStepFromDraft,
    clearDraft,
    moveStepInDraft,
    saveProductionLine,
    removeProductionLine,
    executeProductionLine,
    validateMapCompatibility,
    editProductionLine,
    getNetRequirements,
    collapseSteps,
    getTotalTime,
    exportLine,
    previewImportLine,
    applyImportLines,
    importLine,
    currentEditingId,
    addStepsToQueue,
    moveProductionLine
  }
})
