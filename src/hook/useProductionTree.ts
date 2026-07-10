import { ref, computed } from "vue";
import itemsData from "@/data/items.json";
import formulasData from "@/data/formula.json";
import actionsData from "@/data/actions.json";
import techsData from "@/data/techs.json";

export interface TreeNode {
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

export function useProductionTree(pathOverrides: any) {
  const totalTechs = ref<Set<string>>(new Set());
  const globalProcessedTechs = new Set<string>();

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
    
    node.availableMethods = [
      ...actions.map(a => ({ key: a.key, name: `行动: ${a.name}`, type: 'action' as const })),
      ...formulas.map(f => ({ key: f.key, name: `配方: ${f.name}`, type: 'formula' as const }))
    ];

    let bestAction = null;
    let bestFormula = null;

    const overrideKey = pathOverrides.value[itemKey];
    if (overrideKey) {
      bestAction = actions.find(a => a.key === overrideKey);
      bestFormula = !bestAction ? formulas.find(f => f.key === overrideKey) : null;
      node.selectedMethodKey = overrideKey;
    }

    if (!bestAction && !bestFormula) {
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

  return {
    resolveItem,
    totalTechs,
    globalProcessedTechs
  };
}
