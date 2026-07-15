import { defineStore } from 'pinia'
import { computed, reactive } from 'vue';
import { store } from '@/stores/';
import { once } from '@/utils/function';
import { usePackStore } from '@/stores/modules/pack';
import { useStateStore } from '@/stores/modules/state';
import { useAppStore } from '@/stores/modules/app';
import { useFragmentStore } from '@/stores/modules/fragment';
import type { IAction, IReward } from '@/data/actions';
import type { ITech } from '@/data/techs';
import { tips } from '@/data/tips';
import { Eras } from '@/data/eras';
import { useLogStore } from './log';
import { getItem } from '@/data/items';
import { notifyTaskComplete, notifyAllTasksDone } from '@/utils/notification';

export interface ITask extends IAction {
  id: number;
  begin_time: number; // timestamp
  type: 'action' | 'tech' | 'lab';
  formulaKey?: string;
  /** 任务完成后的冷却时间（秒） */
  cooldown?: number;
  /** 材料是否已锁定（已扣除） */
  materials_locked?: boolean;
  /** 里程碑（任务完成后颁发） */
  milestones?: string[];
}

export const useTaskStore = defineStore('task', () => {
  const tasks = reactive<ITask[]>([]);
  const stateStore = useStateStore();
  const packStore = usePackStore();
  const logStore = useLogStore();

  /** 获取考虑队列收益与支出的预期资源状态（包含数量与总耐久） */
  const projectedState = computed(() => {
    const inv = new Map<string, number>();
    const dur = new Map<string, number>();
    const durableKeys = new Set<string>();

    // 基础库存初始化
    packStore.items.forEach(item => {
      inv.set(item.key, (inv.get(item.key) || 0) + item.quantity);
      const itemData = getItem(item.key);
      if (itemData && (itemData.durable ?? 0) > 0) {
        // 总耐久 = (持有数量 - 1) * 单个满耐久 + 当前物品残余耐久
        // 实际上 packStore 里的 durable 存储的就是当前物品的残余耐久
        const maxDur = itemData.durable || 1;
        dur.set(item.key, (dur.get(item.key) || 0) + (item.quantity - 1) * maxDur + item.durable);
        durableKeys.add(item.key);
      }
    });

    // 处理处理预计支出与收益
    for (const task of tasks) {
      // 支出项
      if (!task.materials_locked) {
        for (const req of task.required_items) {
          const k = Array.isArray(req.key) ? req.key[0] : req.key;
          // 如果该物品具有耐久属性（或明确要求耐久消耗）
          if (durableKeys.has(k) || req.use) {
            const currentDur = dur.get(k) || 0;
            // 如果存在耐久消耗，则只扣除耐久值部分
            // 如果不存在耐久消耗但具有耐久属性，则扣除数量对应的总耐久
            const cost = req.use ? req.use : req.quantity;
            dur.set(k, currentDur - cost);
            if (!durableKeys.has(k)) durableKeys.add(k);
          } else {
            inv.set(k, (inv.get(k) || 0) - req.quantity);
          }
        }
      }

      // 收益项 (仅计入确定收益)
      if (task.type === 'lab' || task.type === 'action') {
        const rewards = task.rewards || [];
        for (const r of rewards) {
          if (r.guaranteed || task.type === 'lab') {
            const qty = Array.isArray(r.quantity) ? Math.min(...r.quantity) : r.quantity || 1;
            const itemData = getItem(r.key);
            // 这里判断是否具有耐久属性：原本就在 durableKeys 中，或者配置表中定义了 durable
            if (durableKeys.has(r.key) || (itemData && (itemData.durable ?? 0) > 0)) {
              if (!durableKeys.has(r.key)) durableKeys.add(r.key);
              dur.set(r.key, (dur.get(r.key) || 0) + qty);
            } else {
              inv.set(r.key, (inv.get(r.key) || 0) + qty);
            }
          }
        }
      }
    }

    // 将总耐久映射为 UI 可见数量（向上取整，即只要有残余耐久就视为持有该物品）
    dur.forEach((dVal, k) => {
      const itemData = getItem(k);
      const maxDur = itemData?.durable || 1;
      inv.set(k, Math.max(0, Math.ceil(dVal / maxDur)));
    });

    return { inv, dur };
  });

  /** 获取考虑队列收益与支出的预期库存 */
  const projectedInventory = computed(() => projectedState.value.inv);

  /** 检查是否可以执行（考虑预期收益及耐久要求） */
  function canPerformWithProjection(requiredItems: { key: string | string[], quantity: number, use?: number }[]): boolean {
    const { inv, dur } = projectedState.value;
    for (const req of requiredItems) {
      const keys = Array.isArray(req.key) ? req.key : [req.key];
      // 满足任意一种替代方案即可
      const hasAny = keys.some(k => {
        // 数量检查
        const qOk = (inv.get(k) || 0) >= req.quantity;
        // 耐久检查（如果该项设置了 use）
        const dOk = !req.use || (dur.get(k) || 0) >= req.use;
        return qOk && dOk;
      });
      if (!hasAny) return false;
    }
    return true;
  }

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
    // 过滤：时代限制
    const currentEraObj = Eras.find(e => e.key === stateStore.state.currentEra);
    const currentEraOrder = currentEraObj?.order ?? 0;
    rewardsList = rewardsList.filter(r => {
      if (!r.required_era) return true;
      const reqEra = Eras.find(e => e.key === r.required_era);
      return reqEra ? currentEraOrder >= reqEra.order : true;
    });

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

  /** 重新计算任务队列中所有任务的预计开始时间 */
  const recalculateStartTimes = () => {
    if (tasks.length === 0) return;
    const now = Date.now();
    // 第一个任务：如果还没开始，或者被提前到首位（开始时间在未来），则从现在开始算起
    if (tasks[0].begin_time <= 0 || tasks[0].begin_time > now) {
      tasks[0].begin_time = now;
    }
    let lastFinishTime = tasks[0].begin_time + (tasks[0].time_required * 1000);
    for (let i = 1; i < tasks.length; i++) {
      tasks[i].begin_time = lastFinishTime;
      lastFinishTime += (tasks[i].time_required * 1000);
    }
  };

  function taskLoop() {
    setInterval(async () => {
      const now = Date.now();
      const task = tasks[0];
      if (!task) return; // 没有任务，跳过检查

      // 检查并锁定材料（如果尚未锁定）
      if (!task.materials_locked) {
        const missingItems: string[] = [];
        if (task.required_items.length) {
          for (const req of task.required_items) {
            const keys = Array.isArray(req.key) ? req.key : [req.key];
            // 检查每种可能的材料（替代品）
            const hasAvailable = keys.some(k => {
              const itemData = getItem(k);
              const maxDur = itemData?.durable || 1;
              const hasQty = packStore.getItemQuantity(k);
              const existing = packStore.items.find(i => i.key === k);

              if (itemData && (itemData.durable ?? 0) > 0) {
                // 耐久物品：计算总耐久池
                const totalDur = existing ? (existing.quantity - 1) * maxDur + existing.durable : 0;
                // 对于耐久物品，quantity 通常指“至少持有一个”，除非 req.quantity > 1
                const qOk = hasQty >= req.quantity;
                const dOk = !req.use || totalDur >= req.use;
                return qOk && dOk;
              } else {
                // 普通物品：仅检查数量
                return hasQty >= req.quantity;
              }
            });

            if (!hasAvailable) {
              const displayName = Array.isArray(req.key) 
                ? req.key.map(k => packStore.getDisplayName(k)).join('/') 
                : packStore.getDisplayName(req.key);
              missingItems.push(displayName);
            }
          }
        }

        if (missingItems.length === 0) {
          // 锁定材料：扣除物品
          if (task.required_items.length) {
            for (const req of task.required_items) {
              // 这里简化处理，直接扣除第一个替代品（实际逻辑中应该有更复杂的替代品选择，但目前代码是按 req.key[0] 处理的）
              const k = Array.isArray(req.key) ? req.key[0] : req.key;
              packStore.removeItem(k, req.quantity, req.use);
            }
          }
          task.materials_locked = true;
          // 锁定后重新计算时间，确保从现在开始计时
          task.begin_time = Date.now();
          recalculateStartTimes();
        } else {
          // 材料不足，销毁任务
          const missingStr = missingItems.join('、');
          logStore.addLog(`任务 ${task.name} 的资源 [${missingStr}] 在开始执行时已不足，任务已被销毁`, 'warning');
          notifyTaskComplete('任务销毁', `资源不足: ${task.name} [${missingStr}]`);
          tasks.splice(0, 1);
          recalculateStartTimes();
          return;
        }
      }

      if (now - task.begin_time >= task.time_required * 1000) {
        if (task.type === 'action') {
          // 标记行动为已执行
          packStore.addPerformedAction(task.key);
          // 记录统计数据
          stateStore.recordAction(task.key);

          // 必定掉落的奖励（并行，不受随机抽选影响）
          const consumedKeys = task.required_items.map(r => Array.isArray(r.key) ? r.key[0] : r.key);
          const currentMap = stateStore.getMap?.key || '';
          const guaranteedRewards = task.rewards.filter(r => {
            if (!r.guaranteed) return false;
            // 地图限制
            if (r.map) {
              const onMap = r.map.some(m => {
                const mapKey = typeof m === 'string' ? m : m.key;
                return mapKey === currentMap;
              });
              if (!onMap) return false;
            }
            // 消耗品限制
            if (r.required_item) {
              const required = Array.isArray(r.required_item) ? r.required_item : [r.required_item];
              const met = required.some(k => consumedKeys.includes(k));
              if (!met) return false;
            }
            // 时代限制
            if (r.required_era) {
              const currentEraObj = Eras.find(e => e.key === stateStore.state.currentEra);
              const currentEraOrder = currentEraObj?.order ?? 0;
              const reqEra = Eras.find(e => e.key === r.required_era);
              if (reqEra && currentEraOrder < reqEra.order) return false;
            }
            return true;
          });

          for (const gr of guaranteedRewards) {
            const qty = Array.isArray(gr.quantity) ? gr.quantity[Math.floor(Math.random() * gr.quantity.length)] : gr.quantity || 1;
            if (packStore.addItem(gr.key, qty)) {
              logStore.addLog(`任务 ${task.name} 完成，获得: ${packStore.getDisplayName(gr.key)} x${qty}`, 'reward');
            }
          }
          // 设置冷却
          if (task.cooldown) {
            packStore.setCooldown(task.key, task.cooldown)
          }
          const reward = getReward(task.rewards.filter(r => !r.guaranteed), consumedKeys);
          if (reward) {
            const quantity = Array.isArray(reward.quantity) ? reward.quantity[Math.floor(Math.random() * reward.quantity.length)] : reward.quantity || 1;
            if (packStore.addItem(reward.key, quantity)) {
              logStore.addLog(`任务 ${task.name} 完成，获得: ${packStore.getDisplayName(reward.key)} x${quantity}`, 'reward');
            }
            notifyTaskComplete(task.name, `获得 ${packStore.getDisplayName(reward.key)} x${quantity}`);
          } else {
            logStore.addLog(`任务 ${task.name} 完成，但未获得奖励`, 'reward');
            notifyTaskComplete(task.name, '未获得奖励');
          }

          // 手稿（碎片）掉落逻辑
          if (stateStore.state.currentEra !== 'stone' && ['挖掘', '爆破', '定向爆破'].includes(task.name)) {
            const chance = 0.1 + Math.random() * 0.05; // 10%-15%
            if (Math.random() < chance) {
              const fragmentStore = useFragmentStore();
              const { Formulas } = await import('@/data/formula');

              const currentEraObj = Eras.find(e => e.key === stateStore.state.currentEra);
              const currentOrder = currentEraObj?.order ?? 0;

              const eligibleFormulas = Formulas.filter(f => {
                const fEraObj = Eras.find(e => e.key === f.required_era);
                const fEraOrder = fEraObj?.order ?? 0;

                const mainItems = (f.required_items || []).filter(item => item.isMain);
                const mainMaterialCheck = mainItems.length === 0 || mainItems.some(req => {
                  const keys = Array.isArray(req.key) ? req.key : [req.key];
                  return keys.some(k => packStore.hasEverHad(k));
                });

                return !packStore.hasProvenFormula(f.key) &&
                  !fragmentStore.hasFragment(f.key) &&
                  fEraOrder <= currentOrder &&
                  mainMaterialCheck;
              });
              if (eligibleFormulas.length > 0) {
                const picked = eligibleFormulas[Math.floor(Math.random() * eligibleFormulas.length)];
                if (fragmentStore.unlockFragment(picked.key)) {
                  logStore.addLog(`在${task.name}过程中意外发现了一份「手稿」：${picked.name} 的残片`, 'reward');
                  notifyTaskComplete('获得手稿', `${picked.name} 的残片`);
                }
              }
            }
          }
        } else if (task.type === 'lab') {
          const appStore = useAppStore();
          // lab 类型：给予所有产物
          const obtainedProducts: { key: string; quantity: number }[] = [];
          for (const reward of task.rewards) {
            const quantity = Array.isArray(reward.quantity) ? reward.quantity[Math.floor(Math.random() * reward.quantity.length)] : reward.quantity || 1;
            if (packStore.addItem(reward.key, quantity)) {
              obtainedProducts.push({ key: reward.key, quantity });
              logStore.addLog(`实验室产物: ${packStore.getDisplayName(reward.key)} x${quantity}`, 'reward');
              notifyTaskComplete('实验室', `获得 ${packStore.getDisplayName(reward.key)} x${quantity}`);
            }
          }
          // 发现新配方日志（任务完成时记录）
          if ('formulaKey' in task && task.formulaKey && !packStore.hasProvenFormula(task.formulaKey)) {
            const { Formulas } = await import('@/data/formula')
            const f = Formulas.find(fm => fm.key === task.formulaKey)
            
            if (f) {
              logStore.addLog(`发现新配方: ${f.name}`, 'lab')
              appStore.triggerLabSuccess(task.formulaKey, obtainedProducts)
            }
            packStore.addProvenFormula(task.formulaKey)
          }

          // 颁发里程碑（实验成功后颁发）
          if (task.milestones) {
            for (const ms of task.milestones) {
              stateStore.checkMilestone(ms)
            }
          }

          if (!task.formulaKey && task.rewards.length === 0) {
            logStore.addLog(`实验室操作 ${task.name} 已完成，但似乎没有任何变化`, 'lab');
            notifyTaskComplete(task.name, '实验室操作已完成，但似乎没有任何变化');
          }
        } else {
          packStore.addTech(task.key);
          logStore.addLog(`科技 ${task.name} 研究完成`, 'tech');
          notifyTaskComplete(task.name, '科技研究完成');
        }

        // 1% 概率在 Log 中添加小贴士
        if (Math.random() < 0.01) {
          const currentEra = Eras.find(e => e.key === stateStore.state.currentEra)
          const currentEraOrder = currentEra?.order ?? 0
          const availableTips = tips.filter(t => {
            // 过滤已发现的矿石提示
            if (t.item && packStore.discoveredItems.has(t.item)) return false
            
            if (!t.era) return true
            const requiredEra = Eras.find(e => e.key === t.era)
            return requiredEra ? requiredEra.order <= currentEraOrder : true
          })

          if (availableTips.length > 0) {
            const randomTip = availableTips[Math.floor(Math.random() * availableTips.length)]
            logStore.addLog(`${randomTip.content}`, 'tip')
          }
        }

        tasks.splice(0, 1); // 从任务列表中移除完成的任务
        if (tasks.length > 0) {
          recalculateStartTimes();
        } else {
          notifyAllTasksDone();
        }
      }
    }, 100); // 每秒检查一次任务状态
  }
  const getTasks = computed(() => tasks);
  const pushTask = (task: IAction|ITech) => {
    if (task.required_items.length) {
      if (!canPerformWithProjection(task.required_items)) {
        logStore.addLog(`无法将任务 ${task.name} 加入队列，预期材料不足`, 'warning');
        return;
      }
    }
    tasks.push({ ...task, begin_time: 0, id: Date.now(), rewards: 'rewards' in task ? task.rewards : [], type: 'rewards' in task ? 'action' : 'tech', category: 'category' in task ? task.category : '', cooldown: 'cooldown' in task ? task.cooldown : undefined, materials_locked: false });
    recalculateStartTimes();
  }
  const removeTask = (id: number) => {
    const index = tasks.findIndex(task => task.id === id);
    if (index !== -1) {
      const [task] = tasks.splice(index, 1);
      if (task.materials_locked && task.required_items.length) {
        // 仅在已锁定材料时返还
        for (const req of task.required_items) {
          const k = Array.isArray(req.key) ? req.key[0] : req.key;
          packStore.addItem(k, req.quantity, req.use);
        }
      }
      recalculateStartTimes();
    }
  }
  /** 实验室专用：直接推入任务 */
  function pushLabTask(labTask: {
    name: string;
    key: string;
    description: string;
    time_required: number;
    rewards: IReward[];
    required_items: { key: string; quantity: number; use?: number }[];
    formulaKey?: string;
    milestones?: string[];
  }) {
    tasks.push({
      ...labTask,
      begin_time: 0,
      id: Date.now(),
      type: 'lab',
      materials_locked: false,
    } as ITask);
    recalculateStartTimes();
  }

  function clearTasks() {
    // 返还所有任务的所需物品
    for (const task of tasks) {
      removeTask(task.id);
    }
    tasks.splice(0, tasks.length);
  }

  taskLoop();

  return { tasks, getTasks, projectedInventory, pushTask, removeTask, pushLabTask, clearTasks, canPerformWithProjection }
})

export const useTaskStoreWithOut = once(() => useTaskStore(store));
