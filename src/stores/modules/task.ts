import { defineStore } from 'pinia'
import { computed, reactive, watch } from 'vue';
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

export interface ITaskCondition {
  key: string;
  operator: '>' | '<' | '>=' | '<=' | '==' | '!=';
  value: number;
  /** 循环执行直至条件满足 */
  loopUntil?: boolean;
}

export interface ITask extends IAction {
  id: string | number;
  begin_time: number; // timestamp
  type: 'action' | 'tech' | 'lab';
  formulaKey?: string;
  /** 任务完成后的冷却时间（秒） */
  cooldown?: number;
  /** 材料是否已锁定（已扣除） */
  materials_locked?: boolean;
  /** 里程碑（任务完成后颁发） */
  milestones?: string[];
  /** 执行条件 */
  condition?: ITaskCondition;
}

export const useTaskStore = defineStore('task', () => {
  const tasks = reactive<ITask[]>([]);
  const appStore = useAppStore();
  const stateStore = useStateStore();
  const packStore = usePackStore();
  const logStore = useLogStore();

  /** 获取时代奖励加成倍率 */
  const getEraBonus = (reward: IReward): number => {
    const currentEraObj = Eras.find(e => e.key === stateStore.state.currentEra);
    const currentOrder = currentEraObj?.order ?? 0;
    
    // 若无时代限制，则当作炼金术时代 (order 1) 处理
    const reqEraObj = reward.required_era 
      ? Eras.find(e => e.key === reward.required_era) 
      : Eras.find(e => e.key === 'alchemy');
    const reqOrder = reqEraObj?.order ?? 1;

    if (currentOrder > reqOrder) {
      return 1 + (currentOrder - reqOrder) * 0.15;
    }
    return 1;
  };

  /** 获取考虑时代加成的最终奖励数量 */
  const getFinalQuantity = (reward: IReward): number => {
    let qty = Array.isArray(reward.quantity) 
      ? reward.quantity[Math.floor(Math.random() * reward.quantity.length)] 
      : (reward.quantity || 1);

    return Math.max(1, Math.floor(qty * getEraBonus(reward)));
  };

  const now = computed(() => appStore.tick);

  /** 时代进度带来的时间减免倍率 */
  const timeMultiplier = computed(() => {
    const currentEra = Eras.find(e => e.key === stateStore.state.currentEra);
    const order = currentEra?.order ?? 0;
    // 从近代化学 (order 2) 开始，每级减少 15%
    return Math.max(0.1, 1.0 - Math.max(0, order - 1) * 0.15);
  });

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
          const keys = Array.isArray(req.key) ? req.key : [req.key];
          // 寻找第一个满足预期的替代品
          const k = keys.find(key => {
            const hasQty = inv.get(key) || 0;
            const hasDur = dur.get(key) || 0;
            const itemData = getItem(key);
            if (itemData && (itemData.durable ?? 0) > 0) {
              return hasQty >= req.quantity && (!req.use || hasDur >= req.use);
            }
            return hasQty >= req.quantity;
          }) || keys[0];

          const itemData = getItem(k);
          if (itemData && (itemData.durable ?? 0) > 0) {
            const currentDur = dur.get(k) || 0;
            const maxDur = itemData.durable || 1;
            // 如果存在耐久消耗，则只扣除耐久值部分；否则视为消耗整块
            const cost = req.use !== undefined ? req.use : req.quantity * maxDur;
            dur.set(k, Math.max(0, currentDur - cost));
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
            const baseQty = Array.isArray(r.quantity) ? Math.min(...r.quantity) : r.quantity || 1;
            const qty = Math.floor(baseQty * getEraBonus(r));
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
  const projectedDurability = computed(() => projectedState.value.dur);

  /** 检查是否可以执行（考虑预期收益及耐久要求） */
  function canPerformWithProjection(requiredItems: { key: string | string[], quantity: number, use?: number }[], multiplier = 1): boolean {
    const { inv, dur } = projectedState.value;
    for (const req of requiredItems) {
      const keys = Array.isArray(req.key) ? req.key : [req.key];
      // 满足任意一种替代方案即可
      const hasAny = keys.some(k => {
        // 数量检查
        const qOk = (inv.get(k) || 0) >= req.quantity * multiplier;
        // 耐久检查（如果该项设置了 use）
        const dOk = !req.use || (dur.get(k) || 1 * (inv.get(k) || 0)) >= req.use * multiplier;
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
    let lastFinishTime = tasks[0].begin_time + (tasks[0].time_required * timeMultiplier.value * 1000);
    for (let i = 1; i < tasks.length; i++) {
      tasks[i].begin_time = lastFinishTime;
      lastFinishTime += (tasks[i].time_required * timeMultiplier.value * 1000);
    }
  };

  // 当时代倍率变化时，立即重计划所有任务的时间
  watch(timeMultiplier, () => {
    recalculateStartTimes();
  });

  const canPerform = (required_items: { key: string | string[], quantity: number, use?: number }[]): boolean => {
    for (const req of required_items) {
      if (packStore.getItemQuantity(req.key as string) < req.quantity) {
        return false;
      }
    }
    return true;
  }

  const checkStepCondition = (condition?: ITaskCondition) => {
    if (!condition) return true;
    const { key, operator, value } = condition;
    const count = packStore.getItemQuantity(key);
    switch (operator) {
      case '>': return count > value;
      case '<': return count < value;
      case '>=': return count >= value;
      case '<=': return count <= value;
      case '==': return count == value;
      case '!=': return count != value;
    }
    return true;
  };

  /** 检查并处理任务完成 */
  async function checkAndProcessTasks(currentTime?: number) {
    const now = currentTime || Date.now();
    const task = tasks[0];
    if (!task) return; // 没有任务，跳过检查

    // 检查并锁定材料（如果尚未锁定）
    if (!task.materials_locked) {
      const missingItems: string[] = [];
      const finalK: string[] = []; // 存储实际选择的替代品 key
      if (task.required_items.length) {
          for (const req of task.required_items) {
            const keys = Array.isArray(req.key) ? req.key : [req.key];
            // 检查每种可能的材料（替代品）
            let matchedKey: string | null = null;
            for (const k of keys) {
              const itemData = getItem(k);
              const maxDur = itemData?.durable || 1;
              const hasQty = packStore.getItemQuantity(k);
              const existing = packStore.items.find(i => i.key === k);

              if (itemData && (itemData.durable ?? 0) > 0) {
                // 耐久物品：计算总耐久池
                const totalDur = existing ? (existing.quantity - 1) * maxDur + existing.durable : 0;
                const qOk = hasQty >= req.quantity;
                const dOk = !req.use || totalDur >= req.use;
                if (qOk && dOk) {
                  matchedKey = k;
                  break;
                }
              } else {
                // 普通物品：仅检查数量
                if (hasQty >= req.quantity) {
                  matchedKey = k;
                  break;
                }
              }
            }

            if (!matchedKey) {
              const displayName = Array.isArray(req.key) 
                ? req.key.map(k => packStore.getDisplayName(k)).join('/') 
                : packStore.getDisplayName(req.key);
              missingItems.push(displayName);
            } else {
              finalK.push(matchedKey);
            }
          }
      }

      if (missingItems.length === 0) {
        // 锁定材料：扣除物品
        if (task.required_items.length) {
            for (let i = 0; i < task.required_items.length; i++) {
              const req = task.required_items[i];
              const k = finalK[i];
              packStore.removeItem(k, req.quantity, req.use);
            }
        }
        task.materials_locked = true;
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

    if (now - task.begin_time >= task.time_required * timeMultiplier.value * 1000) {
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
          const qty = getFinalQuantity(gr);
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
          const quantity = getFinalQuantity(reward);
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
          const quantity = getFinalQuantity(reward);
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

      // 检查循环执行逻辑
      if (task.condition?.loopUntil && !checkStepCondition(task.condition)) {
        // 条件未满足，检查能否再次执行
        // 注意：此处检查的是当前背包，因为 materials_locked 已为 true (刚完成的任务已扣除材料)
        // 我们需要看剩余材料是否足够开启下一轮
        if (canPerform(task.required_items)) {
          // 重置任务状态，以便下一轮重新锁定材料和计时
          task.begin_time = 0; 
          task.materials_locked = false;
          recalculateStartTimes();
          return; // 保持在队列首位，等待下次 Tick 启动
        } else {
          logStore.addLog(`任务 ${task.name} 的循环执行因材料不足而终止`, 'warning');
        }
      }

      tasks.splice(0, 1); // 从任务列表中移除完成的任务
      if (tasks.length == 0) {
        notifyAllTasksDone();
        document.title = '元素纪元';
      }
    }
  }

  // 使用全局 Worker 触发的 tick 处理任务
  appStore.onTick((time) => {
    checkAndProcessTasks(time);
  });

  // 监听页面可见性变化
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        // 页面重新可见时，立即检查任务状态
        checkAndProcessTasks();
      }
    });
  }

  const getTasks = computed(() => tasks);

  const pushTask = (task: (IAction|ITech) & { id?: string | number, condition?: ITaskCondition }): boolean => {
    if (task.required_items.length) {
      if (!canPerformWithProjection(task.required_items)) {
        logStore.addLog(`无法将任务 ${task.name} 加入队列，预期材料不足`, 'warning');
        return false;
      }
    }
    
    tasks.push({ 
      ...task, 
      begin_time: 0, 
      id: task.id || (Date.now() + Math.random()), 
      rewards: 'rewards' in task ? task.rewards : [], 
      type: 'rewards' in task ? 'action' : 'tech', 
      category: 'category' in task ? task.category : '', 
      cooldown: 'cooldown' in task ? task.cooldown : undefined, 
      materials_locked: false,
      condition: task.condition
    } as ITask);
    
    recalculateStartTimes();
    return true;
  }

  const removeTask = (id: string | number) => {
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
    required_items: { key: string | string[]; quantity: number; use?: number }[];
    formulaKey?: string;
    milestones?: string[];
    id?: string | number;
    condition?: ITaskCondition;
  }): boolean {
    if (labTask.required_items.length) {
      if (!canPerformWithProjection(labTask.required_items)) {
        logStore.addLog(`无法将任务 ${labTask.name} 加入队列，预期材料不足`, 'warning');
        return false;
      }
    }

    tasks.push({
      ...labTask,
      begin_time: 0,
      id: labTask.id || (Date.now() + Math.random()),
      type: 'lab',
      materials_locked: false,
      condition: labTask.condition
    } as ITask);
    recalculateStartTimes();
    return true;
  }

  function clearTasks() {
    // 返还所有任务的所需物品
    for (const task of tasks) {
      removeTask(task.id);
    }
    tasks.splice(0, tasks.length);
  }

  return {
    tasks,
    getTasks,
    timeMultiplier,
    projectedState,
    projectedInventory,
    projectedDurability,
    pushTask,
    removeTask,
    pushLabTask,
    clearTasks,
    canPerformWithProjection
  }
})

export const useTaskStoreWithOut = once(() => useTaskStore(store));
