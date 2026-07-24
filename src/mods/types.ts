export type ModModel =
  | 'items'
  | 'actions'
  | 'formulas'
  | 'labs'
  | 'techs'
  | 'maps'
  | 'tips'
  | 'eras';

export type ConflictPolicy = 'error' | 'warn' | 'last-write-wins';

export type ModOperation = 'add' | 'override' | 'merge' | 'remove';

export interface ModPatchEntry {
  op: ModOperation;
  /**
   * 覆盖/合并/删除目标 key
   */
  targetKey?: string;
  /**
   * 新增对象完整内容
   */
  value?: Record<string, unknown>;
}

export type ModPatchSet = Partial<Record<ModModel, ModPatchEntry[]>>;

export interface ModHookScript {
  id: string;
  code: string;
}

export interface NetworkPolicy {
  allowDomains?: string[];
  blockedDomains?: string[];
  timeoutMs?: number;
  maxConcurrentRequests?: number;
}

export interface ModManifest {
  schemaVersion: string;
  modId: string;
  name: string;
  version: string;
  description: string;
  author: string;
  homepage?: string;
  license?: string;
  gameVersionRange: string;
  minLoaderVersion?: string;
  maxLoaderVersion?: string;
  depends?: string[];
  optionalDepends?: string[];
  conflicts?: string[];
  loadAfter?: string[];
  loadBefore?: string[];
  contentFiles?: Partial<Record<ModModel, string>>;
  hookFiles?: string[];
  hooksRuntime?: 'full-trust';
  capabilities?: {
    stores?: 'all';
    dom?: boolean;
    network?: boolean;
  };
  networkPolicy?: NetworkPolicy;
  conflictPolicy: ConflictPolicy;
  safeModeCompatible?: boolean;
  saveFlags?: {
    persistRuntimeState?: boolean;
    persistHookState?: boolean;
    allowLoadWithoutMod?: boolean;
  };
}

export interface ModPackage {
  manifest: ModManifest;
  patches?: ModPatchSet;
  hooks?: ModHookScript[];
}

export interface ModConflictRecord {
  model: ModModel;
  key: string;
  incomingModId: string;
  currentOwnerModId: string;
  policy: ConflictPolicy;
  reason: string;
}

export interface ApplyModsResult {
  conflicts: ModConflictRecord[];
  warnings: string[];
}

export interface StoredModEntry {
  pkg: ModPackage;
  enabled: boolean;
  installedAt: number;
}

export interface StoredModRegistry {
  version: number;
  entries: Record<string, StoredModEntry>;
  loadOrder: string[];
}

export type HookEventName =
  | 'onEnable'
  | 'onDisable'
  | 'onReload'
  | 'onSave'
  | 'onLoad'
  | 'onActionStart'
  | 'onTaskComplete'
  | 'onFormulaResolved'
  | 'onEraAdvance'
  | 'onTick'
  | 'onMapSwitch';

export interface HookDiagnostic {
  modId: string;
  hookId: string;
  event: HookEventName;
  timestamp: number;
  level: 'info' | 'warn' | 'error';
  message: string;
}
