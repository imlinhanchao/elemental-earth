import { defineStore } from 'pinia'
import { computed, reactive, ref, watch } from 'vue';
import { store } from '@/stores/';
import { once } from '@/utils/function';
import { usePackStore } from '@/stores/modules/pack';
import { useStateStore } from '@/stores/modules/state';
import { useAppStore } from '@/stores/modules/app';
import { useFragmentStore } from '@/stores/modules/fragment';
import type { IAction, IReward } from '@/data/actions';
import type { ITech } from '@/data/techs';
import { tips } from '@/data/tips';
import { Eras, getEra } from '@/data/eras';
import { useLogStore } from './log';
import { getItem } from '@/data/items';
import { Formulas, getFormula } from '@/data/formula';
import { LabActions, getLab } from '@/data/labs';
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
  /** 是否时代加成 */
  era_bonus?: boolean;
}

export const useTaskStore = defineStore('task', () => {
  const tasksMap = reactive<Record<string, ITask[]>>({});
  const viewingMap = ref<string>('');

  const appStore = useAppStore();
  const stateStore = useStateStore();
  const packStore = usePackStore();
  const logStore = useLogStore();

  const tasks = computed(() => {
    const key = viewingMap.value || stateStore.state.map;
    if (!tasksMap[key]) {
      tasksMap[key] = [];
    }
    return tasksMap[key];
  });

  /** 当前实际所在地图的任务列表 */
  const currentMapTasks = computed(() => tasksMap[stateStore.state.map] || []);

  const currentEraOrder = computed(() => {
    return getEra(stateStore.state.currentEra)?.order ?? 0;
  });

  /** 所有地图的任务总数 */
  const totalTaskCount = computed(() => {
    return Object.values(tasksMap).reduce((acc, list) => acc + list.length, 0);
  });

  /** 所有作为碎片掉落候选者的配方列表 (有碎片描述的配方) */
  const allFragmentCandidates = computed(() => Formulas.filter(f => !!f.fragment_description));

  /** 当前时代及已发现材料下，可能掉落的碎片列表 */
  const potentialFragments = computed(() => {
    const currentOrder = currentEraOrder.value;
    return allFragmentCandidates.value.filter(f => {
      // 时代检查
      const fEraOrder = getEra(f.required_era || '')?.order ?? 0;
      if (fEraOrder >= currentOrder) return false;

      // 主材料发现检查
      const mainItems = (f.required_items || []).filter(item => item.isMain);
      if (mainItems.length === 0) return true;

      return mainItems.some(req => {
        const keys = Array.isArray(req.key) ? req.key : [req.key];
        return keys.some(k => packStore.hasEverHad(k));
      });
    });
  });

  const availableTips = computed(() => {
    const currentOrder = currentEraOrder.value;
    return tips.filter(t => {
      if (t.item && packStore.hasEverHad(t.item)) return false;
      const reqOrder = t.era ? (getEra(t.era)?.order ?? 0) : 0;
      return reqOrder <= currentOrder;
    });
  });

  /** 获取时代奖励加成倍率 */
  const getEraBonus = (reward: IReward): number => {
    const currentOrder = currentEraOrder.value;
    
    // 若无时代限制，则当作炼金术时代 (order 1) 处理
    const reqOrder = reward.required_era ? (getEra(reward.required_era)?.order ?? 1) : 1;

    if (currentOrder > reqOrder) {
      return 1 + (currentOrder - reqOrder) * 0.80;
    }
    return 1;
  };

  /** 获取考虑时代加成的最终奖励数量 */
  const getFinalQuantity = (reward: IReward, bonus = false): number => {
    let qty = Array.isArray(reward.quantity) 
      ? reward.quantity[Math.floor(Math.random() * reward.quantity.length)] 
      : (reward.quantity || 1);

    if (!bonus) return qty;

    return Math.max(1, Number((qty * getEraBonus(reward)).toFixed(1)));
  };

  const now = computed(() => appStore.tick);

  /** 时代进度带来的时间减免倍率 */
  const timeMultiplier = computed(() => {
    const order = currentEraOrder.value;
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
      inv.set(item.key, packStore.getItemQuantity(item.key));
      const itemData = getItem(item.key);
      if (itemData && (itemData.durable ?? 0) > 0) {
        dur.set(item.key, packStore.getTotalDurability(item.key));
        durableKeys.add(item.key);
      }
    });

    // 处理处理预计支出与收益
    for (const mapKey in tasksMap) {
      for (const task of tasksMap[mapKey]) {
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
              const qty = task.era_bonus ? Math.floor(baseQty * getEraBonus(r)) : baseQty;
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
  function getReward(rewards: IReward[], mapKey: string, consumedKeys?: string[]): IReward | null {
    const currentMap = mapKey || '';
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
    const currentOrder = currentEraOrder.value;
    rewardsList = rewardsList.filter(r => {
      if (!r.required_era) return true;
      const reqEra = getEra(r.required_era);
      return reqEra ? currentOrder >= reqEra.order : true;
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
  const recalculateStartTimes = (mapKey?: string) => {
    const targetMap = mapKey || stateStore.state.map;
    const mapTasks = tasksMap[targetMap];
    if (!mapTasks || mapTasks.length === 0) return;

    const now = Date.now();
    // 第一个任务：如果还没开始，或者被提前到首位（开始时间在未来），则从现在开始算起
    if (mapTasks[0].begin_time <= 0 || mapTasks[0].begin_time > now) {
      mapTasks[0].begin_time = now;
    }
    let lastFinishTime = mapTasks[0].begin_time + (mapTasks[0].time_required * timeMultiplier.value * 1000);
    for (let i = 1; i < mapTasks.length; i++) {
      mapTasks[i].begin_time = lastFinishTime;
      lastFinishTime += (mapTasks[i].time_required * timeMultiplier.value * 1000);
    }
  };

  // 当时代倍率变化时，立即重计划所有任务的时间
  watch(timeMultiplier, () => {
    for (const mapKey in tasksMap) {
      recalculateStartTimes(mapKey);
    }
  });

  const canPerform = (required_items: { key: string | string[], quantity: number, use?: number }[]): boolean => {
    for (const req of required_items) {
      const keys = Array.isArray(req.key) ? req.key : [req.key];
      const hasAny = keys.some(k => {
        const itemData = getItem(k);
        const hasQty = packStore.getItemQuantity(k);
        if (itemData && (itemData.durable ?? 0) > 0) {
          const totalDur = packStore.getTotalDurability(k);
          return hasQty >= req.quantity && (!req.use || totalDur >= req.use);
        }
        return hasQty >= req.quantity;
      });
      if (!hasAny) return false;
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

  /** 检查并处理单个地图的任务完成 */
  async function processMapTasks(mapKey: string, now: number) {
    const mapTasks = tasksMap[mapKey];
    if (!mapTasks || mapTasks.length === 0) return;
    const task = mapTasks[0];

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
              const hasDur = packStore.getTotalDurability(k);

              if (itemData && (itemData.durable ?? 0) > 0) {
                // 耐久物品：计算总耐久池
                const qOk = hasQty >= req.quantity;
                const dOk = !req.use || hasDur >= req.use;
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
        mapTasks.splice(0, 1);
        recalculateStartTimes(mapKey);
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
        const currentMap = mapKey || '';
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
            const currentOrder = currentEraOrder.value;
            const reqEra = getEra(r.required_era);
            if (reqEra && currentOrder < reqEra.order) return false;
          }
          return true;
        });

        for (const gr of guaranteedRewards) {
          const qty = getFinalQuantity(gr, task.era_bonus);
          if (packStore.addItem(gr.key, qty)) {
            logStore.addLog(`任务 ${task.name} 完成，获得: ${packStore.getDisplayName(gr.key)} x${qty}`, 'reward');
          }
        }
        // 设置冷却
        if (task.cooldown) {
          packStore.setCooldown(task.key, task.cooldown)
        }
        
        const nonGuaranteed = task.rewards.filter(r => !r.guaranteed);
        // 针对“爆破”和“定向爆破”，除了原本的 1 次掉落外，额外增加 2~5 次掉落（总共 3~6 次）
        const iterations = ['爆破', '定向爆破'].includes(task.name) ? (Math.floor(Math.random() * 4) + 3) : 1;
        
        let receivedCount = 0;
        const rewardSummary = new Map<string, number>();

        for (let i = 0; i < iterations; i++) {
          const reward = getReward(nonGuaranteed, mapKey, consumedKeys);
          if (reward) {
            const quantity = getFinalQuantity(reward, task.era_bonus);
            if (packStore.addItem(reward.key, quantity)) {
              receivedCount++;
              const name = packStore.getDisplayName(reward.key);
              rewardSummary.set(name, (rewardSummary.get(name) || 0) + quantity);
            }
          }
        }

        if (receivedCount > 0) {
          const summaryArr = Array.from(rewardSummary.entries()).map(([name, qty]) => `${name} x${qty}`);
          const msg = summaryArr.join('，');
          logStore.addLog(`任务 ${task.name} 完成，获得: ${msg}`, 'reward');
          notifyTaskComplete(task.name, `获得: ${msg}`);
        } else {
          logStore.addLog(`任务 ${task.name} 完成，但未获得奖励`, 'reward');
          notifyTaskComplete(task.name, '未获得奖励');
        }

        // 手稿（碎片）掉落逻辑
        if (stateStore.state.currentEra !== 'stone' && ['挖掘', '爆破', '定向爆破'].includes(task.name)) {
          const chance = 0.1 + Math.random() * 0.05; // 10%-15%
          if (Math.random() < chance) {
            const fragmentStore = useFragmentStore();
            // 在预先通过时代和主材料过滤的基础上，再过滤已拥有的
            const eligibleFormulas = potentialFragments.value.filter(f => 
              !packStore.hasProvenFormula(f.key) && !fragmentStore.hasFragment(f.key)
            );
            
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
          const quantity = getFinalQuantity(reward, false); // 实验室产物不受时代加成影响
          if (packStore.addItem(reward.key, quantity)) {
            obtainedProducts.push({ key: reward.key, quantity });
            logStore.addLog(`实验室产物: ${packStore.getDisplayName(reward.key)} x${quantity}`, 'reward');
            notifyTaskComplete('实验室', `获得 ${packStore.getDisplayName(reward.key)} x${quantity}`);
          }
        }
        // 发现新配方日志（任务完成时记录）
        if ('formulaKey' in task && task.formulaKey && !packStore.hasProvenFormula(task.formulaKey)) {
          const f = getFormula(task.formulaKey);
          
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
        if (Math.random() < 0.01 && availableTips.value.length > 0) {
          const randomTip = availableTips.value[Math.floor(Math.random() * availableTips.value.length)]
          logStore.addLog(`${randomTip.content}`, 'tip')
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
          recalculateStartTimes(mapKey);
          return; // 保持在队列首位，等待下次 Tick 启动
        } else {
          logStore.addLog(`任务 ${task.name} 的循环执行因材料不足而终止`, 'warning');
        }
      }

      mapTasks.splice(0, 1); // 从任务列表中移除完成的任务
      if (mapTasks.length == 0) {
        // 检查是否所有地图的任务都完成了
        const allDone = Object.values(tasksMap).every(q => q.length === 0);
        if (allDone) {
          notifyAllTasksDone();
          document.title = '元素纪元';
        }
      }
    }
  }

  /** 检查并处理任务完成 */
  async function checkAndProcessTasks(currentTime?: number) {
    const now = currentTime || Date.now();
    for (const mapKey in tasksMap) {
      await processMapTasks(mapKey, now);
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
    const mapKey = stateStore.state.map;
    if (!tasksMap[mapKey]) {
      tasksMap[mapKey] = [];
    }

    tasksMap[mapKey].push({ 
      ...task, 
      begin_time: 0, 
      id: task.id || (Date.now() + Math.random()), 
      rewards: 'rewards' in task ? task.rewards : [], 
      type: 'rewards' in task ? 'action' : 'tech', 
      category: 'category' in task ? task.category : '', 
      cooldown: 'cooldown' in task ? task.cooldown : undefined, 
      materials_locked: false,
      condition: task.condition,
      era_bonus: 'category' in task ? task.category == '采集' : false
    } as ITask);
    
    recalculateStartTimes(mapKey);
    return true;
  }

  const removeTask = (id: string | number, mapKey?: string) => {
    const targetMap = mapKey || viewingMap.value || stateStore.state.map;
    const mapTasks = tasksMap[targetMap];
    if (!mapTasks) return;

    const index = mapTasks.findIndex(task => task.id === id);
    if (index !== -1) {
      const [task] = mapTasks.splice(index, 1);
      if (task.materials_locked && task.required_items.length) {
        // 仅在已锁定材料时返还
        for (const req of task.required_items) {
          const k = Array.isArray(req.key) ? req.key[0] : req.key;
          packStore.addItem(k, req.quantity, req.use);
        }
      }
      recalculateStartTimes(targetMap);
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
    const mapKey = stateStore.state.map;
    if (!tasksMap[mapKey]) {
      tasksMap[mapKey] = [];
    }

    tasksMap[mapKey].push({
      ...labTask,
      begin_time: 0,
      id: labTask.id || (Date.now() + Math.random()),
      type: 'lab',
      materials_locked: false,
      condition: labTask.condition
    } as ITask);
    recalculateStartTimes(mapKey);
    return true;
  }

  function clearTasks() {
    const mapKey = viewingMap.value || stateStore.state.map;
    const mapTasks = tasksMap[mapKey];
    if (!mapTasks) return;

    // 返还所有任务的所需物品
    while (mapTasks.length > 0) {
      removeTask(mapTasks[0].id, mapKey);
    }
  }

  /** 在所有地图中查找特定类型的任务及其所属地图 */
  const findTaskGlobal = (key: string, type?: string) => {
    for (const [mapKey, mapTasks] of Object.entries(tasksMap)) {
      const index = mapTasks.findIndex(t => t.key === key && (!type || t.type === type));
      if (index !== -1) {
        return { task: mapTasks[index], index, mapKey };
      }
    }
    return null;
  };

  return {
    tasks,
    currentMapTasks,
    totalTaskCount,
    tasksMap,
    viewingMap,
    getTasks,
    timeMultiplier,
    projectedState,
    projectedInventory,
    projectedDurability,
    pushTask,
    removeTask,
    pushLabTask,
    clearTasks,
    canPerformWithProjection,
    findTaskGlobal
  }
})

export const useTaskStoreWithOut = once(() => useTaskStore(store));
