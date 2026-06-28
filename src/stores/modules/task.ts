import { defineStore } from 'pinia'
import { computed, reactive } from 'vue';
import { store } from '@/stores/';
import { once } from '@/utils/function';
import { usePackStore } from '@/stores/modules/pack';
import { useStateStore } from '@/stores/modules/state';
import type { IAction, IReward } from '@/data/actions';
import type { ITech } from '@/data/techs';
import { useLogStore } from './log';
import { getItem } from '@/data/items';

export interface ITask extends IAction {
  id: number;
  begin_time: number; // timestamp
  type: 'action' | 'tech' | 'lab';
  formulaKey?: string;
}

export const useTaskStore = defineStore('task', () => {
  const tasks = reactive<ITask[]>([]);
  const stateStore = useStateStore();
  const packStore = usePackStore();
  const logStore = useLogStore();

  // 按照奖励概率计算最终奖励
  function getReward(rewards: IReward[], consumedKeys?: string[]): IReward | null {
    const currentMap = stateStore.getMap?.key || '';
    let rewardsList = rewards.filter(r => {
      if (!r.map) return true;
      return r.map.some(m => {
        const mapKey = typeof m === 'string' ? m : m.key;
        return mapKey === currentMap;
      });
    }).map(r => {
      if (!r.map) return r;
      // 查找当前地图是否配置了覆盖概率
      const mapEntry = r.map.find(m => {
        const mapKey = typeof m === 'string' ? m : m.key;
        return mapKey === currentMap;
      });
      if (mapEntry && typeof mapEntry !== 'string' && mapEntry.probability !== undefined) {
        return { ...r, probability: mapEntry.probability };
      }
      return r;
    });
    // 过滤：需要特定消耗品才出现的奖励
    if (consumedKeys && consumedKeys.length > 0) {
      rewardsList = rewardsList.filter(r => {
        if (!r.required_item) return true;
        const required = Array.isArray(r.required_item) ? r.required_item : [r.required_item];
        return required.some(k => consumedKeys.includes(k));
      });
    }
    if (rewardsList.length === 1) return rewardsList[0];
    rewardsList.sort((a, b) => a.probability - b.probability);
    const totalProbability = rewardsList.reduce((sum, r) => sum + r.probability, 0);
    const random = Math.random() * totalProbability;
    let cumulativeProbability = 0;
    for (const r of rewardsList) {
      cumulativeProbability += r.probability;
      if (random < cumulativeProbability) {
        return r;
      }
    }
    return null;
  }

  function taskLoop() {
    setInterval(async () => {
      const now = Date.now();
      const task = tasks[0];
      if (!task) return; // 没有任务，跳过检查
      if (now - task.begin_time >= task.time_required * 1000) {
        if (task.type === 'action') {
          const reward = getReward(task.rewards, task.required_items.map(r => Array.isArray(r.key) ? r.key[0] : r.key));
          if (reward) {
            const quantity = Array.isArray(reward.quantity) ? reward.quantity[Math.floor(Math.random() * reward.quantity.length)] : reward.quantity;
            if (packStore.addItem(reward.key, quantity)) {
              logStore.addLog(`任务 ${task.name} 完成，获得奖励: ${packStore.getDisplayName(reward.key)} x${quantity}`, 'reward');
            }
          } else {
            logStore.addLog(`任务 ${task.name} 完成，但未获得奖励`, 'reward');
          }
        } else if (task.type === 'lab') {
          // lab 类型：给予所有产物
          for (const reward of task.rewards) {
            const quantity = Array.isArray(reward.quantity) ? reward.quantity[Math.floor(Math.random() * reward.quantity.length)] : reward.quantity;
            if (packStore.addItem(reward.key, quantity)) {
              logStore.addLog(`实验室产物: ${packStore.getDisplayName(reward.key)} x${quantity}`, 'reward');
            }
          }
          // 发现新配方日志（任务完成时记录）
          if ('formulaKey' in task && task.formulaKey && !packStore.hasProvenFormula(task.formulaKey)) {
            const { Formulas } = await import('@/data/formula')
            const f = Formulas.find(fm => fm.key === task.formulaKey)
            packStore.addProvenFormula(task.formulaKey)
            if (f) {
              logStore.addLog(`发现新配方: ${f.name}`, 'lab')
            }
          }
        } else {
          packStore.addTech(task.key);
          logStore.addLog(`科技 ${task.name} 研究完成`, 'tech');
        }
        tasks.splice(0, 1); // 从任务列表中移除完成的任务
        if (tasks.length > 0) {
          tasks[0].begin_time = Date.now(); // 重置下一个任务的开始时间
        }
      }
    }, 100); // 每秒检查一次任务状态
  }
  const getTasks = computed(() => tasks);
  const pushTask = (task: IAction|ITech) => {
    if (task.required_items.length) {
      for (const req of task.required_items) {
        const k = Array.isArray(req.key) ? req.key[0] : req.key;
        if (!packStore.hasItem(k, req.quantity)) {
          logStore.addLog(`无法执行任务 ${task.name}，缺少物品: ${packStore.getDisplayName(k)} x${req.quantity}`, 'warning');
          return;
        }
      }
      // 扣除所需物品
      for (const req of task.required_items) {
        const k = Array.isArray(req.key) ? req.key[0] : req.key;
        packStore.removeItem(k, req.quantity, req.use);
      }
    }
    tasks.push({ ...task, begin_time: tasks.length > 0 ? 0 : Date.now(), id: Date.now(), rewards: 'rewards' in task ? task.rewards : [], type: 'rewards' in task ? 'action' : 'tech', category: 'category' in task ? task.category : '' });
  }
  const removeTask = (id: number) => {
    const index = tasks.findIndex(task => task.id === id);
    if (index !== -1) {
      const [task] = tasks.splice(index, 1);
      if (task.required_items.length) {
        // 返还所需物品
        for (const req of task.required_items) {
          const k = Array.isArray(req.key) ? req.key[0] : req.key;
          packStore.addItem(k, req.quantity, req.use);
        }
      }
    }
  }
  /** 实验室专用：直接推入任务（物品已在 UI 层扣除，存入 required_items 用于取消时退还） */
  function pushLabTask(labTask: {
    name: string;
    key: string;
    description: string;
    time_required: number;
    rewards: IReward[];
    required_items: { key: string; quantity: number; use?: number }[];
    formulaKey?: string;
  }) {
    tasks.push({
      ...labTask,
      begin_time: tasks.length > 0 ? 0 : Date.now(),
      id: Date.now(),
      type: 'lab',
    } as ITask);
  }

  function clearTasks() {
    // 返还所有任务的所需物品
    for (const task of tasks) {
      removeTask(task.id);
    }
    tasks.splice(0, tasks.length);
  }

  taskLoop();

  return { tasks, getTasks, pushTask, removeTask, pushLabTask, clearTasks }
})

export const useTaskStoreWithOut = once(() => useTaskStore(store));
