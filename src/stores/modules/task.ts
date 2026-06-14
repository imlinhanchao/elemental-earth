import { defineStore } from 'pinia'
import { computed, reactive } from 'vue';
import { store } from '@/stores/';
import { once } from '@/utils/function';
import { usePackStore } from '@/stores/modules/pack';
import { useStateStore } from '@/stores/modules/state';
import type { IAction, IReward } from '@/data/actions';
import type { ITech } from '@/data/techs';

export interface ITask extends IAction {
  id: number;
  begin_time: number; // timestamp
  type: 'action' | 'tech';
}

export const useTaskStore = defineStore('task', () => {
  const tasks = reactive<ITask[]>([]);
  const stateStore = useStateStore();
  const packStore = usePackStore();

  // 按照奖励概率计算最终奖励
  function getReward(rewards: IReward[]): IReward | null {
    const rewardsList = rewards.filter(r => !r.map || r.map.includes(stateStore.getMap?.key || ''));
    if (rewardsList.length === 1) return rewardsList[0];
    rewardsList.sort((a, b) => a.probability - b.probability); // 按概率从低到高排序
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
    setInterval(() => {
      const now = Date.now();
      const task = tasks[0];
      if (!task) return; // 没有任务，跳过检查
      if (now - task.begin_time >= task.time_required * 1000) {
        if (task.type === 'action') {
          const reward = getReward(task.rewards);
          if (reward) {
            console.log(`任务 ${task.name} 完成，获得奖励:`, reward);
            const quantity = Array.isArray(reward.quantity) ? reward.quantity[Math.floor(Math.random() * reward.quantity.length)] : reward.quantity;
            packStore.addItem(reward.key, quantity);
          } else {
            console.log(`任务 ${task.name} 完成，但未获得奖励`);
          }
        } else {
          packStore.addTech(task.key);
          console.log(`科技 ${task.name} 研究完成`);
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
        if (!packStore.hasItem(req.key, req.quantity)) {
          console.warn(`无法执行任务 ${task.name}，缺少物品: ${req.key} x${req.quantity}`);
          return;
        }
      }
      // 扣除所需物品
      for (const req of task.required_items) {
        packStore.removeItem(req.key, req.quantity, req.use);
      }
    }
    tasks.push({ ...task, begin_time: tasks.length > 0 ? 0 : Date.now(), id: Date.now(), rewards: 'rewards' in task ? task.rewards : [], type: 'rewards' in task ? 'action' : 'tech' });
  }
  const removeTask = (id: number) => {
    const index = tasks.findIndex(task => task.id === id);
    if (index !== -1) {
      const [task] = tasks.splice(index, 1);
      if (task.required_items.length) {
        // 返还所需物品
        for (const req of task.required_items) {
          packStore.addItem(req.key, req.quantity, req.use);
        }
      }
    }
  }

  taskLoop();

  return { tasks, getTasks, pushTask, removeTask }
})

export const useTaskStoreWithOut = once(() => useTaskStore(store));
