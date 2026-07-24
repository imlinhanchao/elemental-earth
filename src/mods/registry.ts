import { Actions, replaceActions } from '@/data/actions';
import { Eras, replaceEras } from '@/data/eras';
import { Formulas, replaceFormulas } from '@/data/formula';
import { Items, replaceItems } from '@/data/items';
import { LabActions, replaceLabActions } from '@/data/labs';
import { Maps, replaceMaps } from '@/data/maps';
import { Techs, replaceTechs } from '@/data/techs';
import { tips, replaceTips } from '@/data/tips';
import type {
  ApplyModsResult,
  ConflictPolicy,
  ModConflictRecord,
  ModModel,
  ModPackage,
  ModPatchEntry,
} from './types';

type DataRecord = Record<string, unknown>;

interface ModelConfig {
  keyField: string;
  get: () => DataRecord[];
  set: (next: DataRecord[]) => void;
}

const modelConfigs: Record<ModModel, ModelConfig> = {
  items: {
    keyField: 'key',
    get: () => Items as unknown as DataRecord[],
    set: next => replaceItems(next as unknown as typeof Items),
  },
  actions: {
    keyField: 'key',
    get: () => Actions as unknown as DataRecord[],
    set: next => replaceActions(next as unknown as typeof Actions),
  },
  formulas: {
    keyField: 'key',
    get: () => Formulas as unknown as DataRecord[],
    set: next => replaceFormulas(next as unknown as typeof Formulas),
  },
  labs: {
    keyField: 'key',
    get: () => LabActions as unknown as DataRecord[],
    set: next => replaceLabActions(next as unknown as typeof LabActions),
  },
  techs: {
    keyField: 'key',
    get: () => Techs as unknown as DataRecord[],
    set: next => replaceTechs(next as unknown as typeof Techs),
  },
  maps: {
    keyField: 'key',
    get: () => Maps as unknown as DataRecord[],
    set: next => replaceMaps(next as unknown as typeof Maps),
  },
  tips: {
    keyField: 'id',
    get: () => tips as unknown as DataRecord[],
    set: next => replaceTips(next as unknown as typeof tips),
  },
  eras: {
    keyField: 'key',
    get: () => Eras as unknown as DataRecord[],
    set: next => replaceEras(next as unknown as typeof Eras),
  },
};

const baseSnapshot: Record<ModModel, DataRecord[]> = createSnapshot();

function cloneValue<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

function createSnapshot(): Record<ModModel, DataRecord[]> {
  const out = {} as Record<ModModel, DataRecord[]>;
  (Object.keys(modelConfigs) as ModModel[]).forEach(model => {
    out[model] = cloneValue(modelConfigs[model].get());
  });
  return out;
}

function resetToBaseSnapshot(): void {
  (Object.keys(modelConfigs) as ModModel[]).forEach(model => {
    modelConfigs[model].set(cloneValue(baseSnapshot[model]));
  });
}

function isValidModScopedKey(modId: string, key: string): boolean {
  return key.startsWith(`${modId}:`);
}

function mergeDeep(target: DataRecord, source: DataRecord): DataRecord {
  const output: DataRecord = { ...target };
  for (const [k, sourceVal] of Object.entries(source)) {
    const targetVal = output[k];
    if (
      typeof sourceVal === 'object' &&
      sourceVal !== null &&
      !Array.isArray(sourceVal) &&
      typeof targetVal === 'object' &&
      targetVal !== null &&
      !Array.isArray(targetVal)
    ) {
      output[k] = mergeDeep(targetVal as DataRecord, sourceVal as DataRecord);
    } else {
      output[k] = cloneValue(sourceVal);
    }
  }
  return output;
}

function getKeyFieldValue(record: DataRecord, keyField: string): string {
  return String(record[keyField] ?? '');
}

function handleConflict(
  conflicts: ModConflictRecord[],
  model: ModModel,
  key: string,
  incomingModId: string,
  currentOwnerModId: string,
  policy: ConflictPolicy,
  reason: string,
): void {
  conflicts.push({
    model,
    key,
    incomingModId,
    currentOwnerModId,
    policy,
    reason,
  });

  if (policy === 'error') {
    throw new Error(`Mod conflict: [${model}] ${key} by ${incomingModId}, owner=${currentOwnerModId}`);
  }
}

function applyPatchEntry(
  model: ModModel,
  entry: ModPatchEntry,
  mod: ModPackage,
  ownerMap: Map<string, string>,
  conflicts: ModConflictRecord[],
  warnings: string[],
): void {
  const config = modelConfigs[model];
  const records = config.get();
  const keyField = config.keyField;
  const policy = mod.manifest.conflictPolicy;
  const modId = mod.manifest.modId;

  if (entry.op === 'add') {
    const value = entry.value;
    if (!value) throw new Error(`[${modId}] add patch missing value on ${model}`);
    const key = getKeyFieldValue(value, keyField);
    if (!key) throw new Error(`[${modId}] add patch missing key field ${keyField} on ${model}`);
    if (!isValidModScopedKey(modId, key)) {
      throw new Error(`[${modId}] add key must be namespaced: ${key}`);
    }

    const existsIndex = records.findIndex(r => getKeyFieldValue(r, keyField) === key);
    if (existsIndex !== -1) {
      const currentOwner = ownerMap.get(key) || '__base__';
      handleConflict(conflicts, model, key, modId, currentOwner, policy, 'add existing key');
      if (policy === 'warn') {
        warnings.push(`[${modId}] add key already exists, skipped: ${model}.${key}`);
        return;
      }
      if (policy === 'last-write-wins') {
        records[existsIndex] = cloneValue(value);
        ownerMap.set(key, modId);
        config.set(records);
        return;
      }
    }

    records.push(cloneValue(value));
    ownerMap.set(key, modId);
    config.set(records);
    return;
  }

  const targetKey = entry.targetKey;
  if (!targetKey) throw new Error(`[${modId}] ${entry.op} patch missing targetKey on ${model}`);

  const targetIndex = records.findIndex(r => getKeyFieldValue(r, keyField) === targetKey);
  if (targetIndex === -1) {
    throw new Error(`[${modId}] ${entry.op} target not found: ${model}.${targetKey}`);
  }

  const currentOwner = ownerMap.get(targetKey) || '__base__';
  if (currentOwner !== '__base__' && currentOwner !== modId) {
    handleConflict(conflicts, model, targetKey, modId, currentOwner, policy, `${entry.op} existing modded key`);
    if (policy === 'warn') {
      warnings.push(`[${modId}] ${entry.op} key already overridden by ${currentOwner}: ${model}.${targetKey}`);
      return;
    }
  }

  if (entry.op === 'override') {
    const value = entry.value;
    if (!value) throw new Error(`[${modId}] override patch missing value on ${model}.${targetKey}`);
    records[targetIndex] = cloneValue(value);
    ownerMap.set(targetKey, modId);
    config.set(records);
    return;
  }

  if (entry.op === 'merge') {
    const value = entry.value;
    if (!value) throw new Error(`[${modId}] merge patch missing value on ${model}.${targetKey}`);
    const merged = mergeDeep(records[targetIndex], value);
    records[targetIndex] = merged;
    ownerMap.set(targetKey, modId);
    config.set(records);
    return;
  }

  if (entry.op === 'remove') {
    throw new Error(`[${modId}] remove operation is disabled in current loader`);
  }

  throw new Error(`[${modId}] unknown patch op: ${String((entry as { op?: string }).op)}`);
}

function sortModsByLoadOrder(mods: ModPackage[], explicitOrder: string[]): ModPackage[] {
  const orderMap = new Map<string, number>();
  explicitOrder.forEach((id, idx) => orderMap.set(id, idx));
  return [...mods].sort((a, b) => {
    const aPos = orderMap.get(a.manifest.modId);
    const bPos = orderMap.get(b.manifest.modId);
    if (aPos === undefined && bPos === undefined) return a.manifest.modId.localeCompare(b.manifest.modId);
    if (aPos === undefined) return 1;
    if (bPos === undefined) return -1;
    return aPos - bPos;
  });
}

export function applyMods(mods: ModPackage[], explicitOrder: string[] = []): ApplyModsResult {
  resetToBaseSnapshot();

  const conflicts: ModConflictRecord[] = [];
  const warnings: string[] = [];

  const ownerMaps = {} as Record<ModModel, Map<string, string>>;
  (Object.keys(modelConfigs) as ModModel[]).forEach(model => {
    const keyField = modelConfigs[model].keyField;
    const entries = modelConfigs[model].get();
    ownerMaps[model] = new Map(entries.map(record => [getKeyFieldValue(record, keyField), '__base__']));
  });

  const sortedMods = sortModsByLoadOrder(mods, explicitOrder);

  for (const mod of sortedMods) {
    const patchSet = mod.patches;
    if (!patchSet) continue;

    for (const model of Object.keys(patchSet) as ModModel[]) {
      const entries = patchSet[model] || [];
      for (const entry of entries) {
        applyPatchEntry(model, entry, mod, ownerMaps[model], conflicts, warnings);
      }
    }
  }

  return { conflicts, warnings };
}
