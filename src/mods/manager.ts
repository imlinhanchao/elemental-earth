import JSZip from 'jszip';
import EncryptedStorage from '@/utils/storage';
import { applyMods } from './registry';
import { HookRuntime } from './hook-runtime';
import type {
  ApplyModsResult,
  HookDiagnostic,
  HookEventName,
  ModHookScript,
  ModModel,
  ModPackage,
  ModPatchEntry,
  ModPatchSet,
  StoredModEntry,
  StoredModRegistry,
} from './types';

const STORAGE_KEY = 'mod_registry_v1';
const STORAGE_VERSION = 1;
const ZIP_PACKAGE_CANDIDATES = ['mod.json', 'mod-package.json', 'package.mod.json'];

function makeEmptyRegistry(): StoredModRegistry {
  return {
    version: STORAGE_VERSION,
    entries: {},
    loadOrder: [],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\.\//, '');
}

function deriveHookId(path: string, index: number): string {
  const normalized = normalizePath(path);
  const fileName = normalized.split('/').pop() || `hook-${index + 1}`;
  return fileName.replace(/\.[^.]+$/, '');
}

function findZipFile(zip: JSZip, path: string): JSZip.JSZipObject | null {
  const normalized = normalizePath(path).toLowerCase();
  for (const file of Object.values(zip.files)) {
    if (file.dir) continue;
    if (normalizePath(file.name).toLowerCase() === normalized) {
      return file;
    }
  }
  return null;
}

async function tryReadZipTextFile(zip: JSZip, path: string): Promise<string | null> {
  const file = findZipFile(zip, path);
  if (!file) return null;
  return file.async('string');
}

async function readZipTextFile(zip: JSZip, path: string): Promise<string> {
  const text = await tryReadZipTextFile(zip, path);
  if (text === null) {
    throw new Error(`ZIP mod 包中找不到文件: ${path}`);
  }
  return text;
}

function parsePatchEntriesFromContent(model: ModModel, parsed: unknown, sourcePath: string): ModPatchEntry[] {
  if (Array.isArray(parsed)) {
    return parsed as ModPatchEntry[];
  }

  if (isRecord(parsed)) {
    const modelEntries = parsed[model];
    if (Array.isArray(modelEntries)) {
      return modelEntries as ModPatchEntry[];
    }
  }

  throw new Error(`补丁文件格式无效: ${sourcePath}（应为数组，或包含 ${model} 数组字段）`);
}

async function parseModPackageFromZipBuffer(buffer: ArrayBuffer): Promise<ModPackage> {
  const zip = await JSZip.loadAsync(buffer);

  for (const candidate of ZIP_PACKAGE_CANDIDATES) {
    const candidateText = await tryReadZipTextFile(zip, candidate);
    if (!candidateText) continue;

    const parsed = JSON.parse(candidateText) as ModPackage;
    if (parsed?.manifest) {
      return parsed;
    }
  }

  const manifestText = await readZipTextFile(zip, 'manifest.json');
  const manifest = JSON.parse(manifestText) as ModPackage['manifest'];
  const modPkg: ModPackage = { manifest };

  if (manifest.contentFiles && isRecord(manifest.contentFiles)) {
    const patches: ModPatchSet = {};
    for (const [model, patchPath] of Object.entries(manifest.contentFiles) as [ModModel, string][]) {
      if (!patchPath) continue;
      const patchText = await readZipTextFile(zip, patchPath);
      const parsed = JSON.parse(patchText) as unknown;
      patches[model] = parsePatchEntriesFromContent(model, parsed, patchPath);
    }
    if (Object.keys(patches).length > 0) {
      modPkg.patches = patches;
    }
  } else {
    const fallbackPatchText = await tryReadZipTextFile(zip, 'patches.json');
    if (fallbackPatchText) {
      const parsed = JSON.parse(fallbackPatchText) as ModPatchSet;
      if (!isRecord(parsed)) {
        throw new Error('patches.json 格式无效，必须是对象');
      }
      modPkg.patches = parsed;
    }
  }

  if (Array.isArray(manifest.hookFiles) && manifest.hookFiles.length > 0) {
    const seenHookIds = new Set<string>();
    const hooks: ModHookScript[] = [];
    for (let i = 0; i < manifest.hookFiles.length; i += 1) {
      const hookPath = manifest.hookFiles[i];
      const code = await readZipTextFile(zip, hookPath);
      let hookId = deriveHookId(hookPath, i);
      if (seenHookIds.has(hookId)) {
        hookId = `${hookId}-${i + 1}`;
      }
      seenHookIds.add(hookId);
      hooks.push({ id: hookId, code });
    }
    modPkg.hooks = hooks;
  } else {
    const fallbackHooksText = await tryReadZipTextFile(zip, 'hooks.json');
    if (fallbackHooksText) {
      const parsedHooks = JSON.parse(fallbackHooksText) as ModHookScript[];
      if (!Array.isArray(parsedHooks)) {
        throw new Error('hooks.json 格式无效，必须是数组');
      }
      modPkg.hooks = parsedHooks;
    }
  }

  return modPkg;
}

function assertManifest(pkg: ModPackage): void {
  if (!pkg?.manifest) throw new Error('Invalid mod package: missing manifest');
  const m = pkg.manifest;
  const required = ['schemaVersion', 'modId', 'name', 'version', 'description', 'author', 'gameVersionRange', 'conflictPolicy'] as const;
  for (const key of required) {
    if (!m[key]) throw new Error(`Invalid manifest: missing ${key}`);
  }

  if (!/^[a-z0-9._-]+$/.test(m.modId)) {
    throw new Error(`Invalid manifest.modId: ${m.modId}`);
  }
}

export class ModManager {
  private storage = new EncryptedStorage();
  private runtime = new HookRuntime();
  private registry: StoredModRegistry = makeEmptyRegistry();
  private lastApply: ApplyModsResult = { conflicts: [], warnings: [] };

  initialize(): void {
    const loaded = this.storage.getItem<StoredModRegistry>(STORAGE_KEY);
    this.registry = normalizeRegistry(loaded);

    try {
      this.rebuild();
    } catch (error) {
      console.error('Mod initialize failed, entering safe mode:', error);
      this.runtime.clear();
      for (const entry of Object.values(this.registry.entries)) {
        entry.enabled = false;
      }
      this.persist();
      this.lastApply = applyMods([], []);
    }
  }

  importModFromText(text: string): ModPackage {
    const parsed = JSON.parse(text) as ModPackage;
    return this.importModPackage(parsed);
  }

  async importModFromFile(file: File): Promise<ModPackage> {
    const fileName = file.name.toLowerCase();
    if (fileName.endsWith('.zip')) {
      const buffer = await file.arrayBuffer();
      const parsed = await parseModPackageFromZipBuffer(buffer);
      return this.importModPackage(parsed);
    }

    const text = await file.text();
    const parsed = JSON.parse(text) as ModPackage;
    return this.importModPackage(parsed);
  }

  exportRegistrySnapshot(): StoredModRegistry {
    return cloneRegistry(this.registry);
  }

  restoreRegistrySnapshot(snapshot: StoredModRegistry | null | undefined): void {
    if (!snapshot) return;

    const previous = cloneRegistry(this.registry);
    this.registry = normalizeRegistry(snapshot);

    try {
      this.persist();
      this.rebuild();
    } catch (error) {
      this.registry = previous;
      this.persist();
      this.rebuild();
      throw error;
    }
  }

  private importModPackage(parsed: ModPackage): ModPackage {
    assertManifest(parsed);

    const modId = parsed.manifest.modId;
    const existing = this.registry.entries[modId];

    const entry: StoredModEntry = {
      pkg: parsed,
      enabled: existing?.enabled ?? false,
      installedAt: existing?.installedAt ?? Date.now(),
    };

    const previous = cloneRegistry(this.registry);
    this.registry.entries[modId] = entry;
    if (!this.registry.loadOrder.includes(modId)) {
      this.registry.loadOrder.push(modId);
    }

    try {
      this.persist();
      this.rebuild();
    } catch (error) {
      this.registry = previous;
      this.persist();
      this.rebuild();
      throw error;
    }

    return parsed;
  }

  enableMod(modId: string): void {
    const entry = this.registry.entries[modId];
    if (!entry) throw new Error(`Mod not found: ${modId}`);
    const previous = cloneRegistry(this.registry);
    entry.enabled = true;
    try {
      this.persist();
      this.rebuild();
    } catch (error) {
      this.registry = previous;
      this.persist();
      this.rebuild();
      throw error;
    }
  }

  disableMod(modId: string): void {
    const entry = this.registry.entries[modId];
    if (!entry) return;
    const previous = cloneRegistry(this.registry);
    entry.enabled = false;
    try {
      this.persist();
      this.rebuild();
    } catch (error) {
      this.registry = previous;
      this.persist();
      this.rebuild();
      throw error;
    }
  }

  uninstallMod(modId: string): void {
    const previous = cloneRegistry(this.registry);
    this.runtime.disableMod(modId);
    delete this.registry.entries[modId];
    this.registry.loadOrder = this.registry.loadOrder.filter(id => id !== modId);
    try {
      this.persist();
      this.rebuild();
    } catch (error) {
      this.registry = previous;
      this.persist();
      this.rebuild();
      throw error;
    }
  }

  setLoadOrder(nextOrder: string[]): void {
    const previous = cloneRegistry(this.registry);
    const seen = new Set<string>();
    const normalized: string[] = [];

    for (const modId of nextOrder) {
      if (!this.registry.entries[modId] || seen.has(modId)) continue;
      seen.add(modId);
      normalized.push(modId);
    }

    for (const modId of Object.keys(this.registry.entries)) {
      if (!seen.has(modId)) normalized.push(modId);
    }

    this.registry.loadOrder = normalized;
    try {
      this.persist();
      this.rebuild();
    } catch (error) {
      this.registry = previous;
      this.persist();
      this.rebuild();
      throw error;
    }
  }

  async emit(event: HookEventName, payload: unknown): Promise<void> {
    await this.runtime.emit(event, payload);
  }

  getDiagnostics(): HookDiagnostic[] {
    return this.runtime.getDiagnostics();
  }

  listMods(): StoredModEntry[] {
    const ordered = this.registry.loadOrder
      .map(modId => this.registry.entries[modId])
      .filter((entry): entry is StoredModEntry => !!entry);
    const listedIds = new Set(ordered.map(entry => entry.pkg.manifest.modId));
    for (const entry of Object.values(this.registry.entries)) {
      if (!listedIds.has(entry.pkg.manifest.modId)) {
        ordered.push(entry);
      }
    }
    return ordered;
  }

  getApplyResult(): ApplyModsResult {
    return this.lastApply;
  }

  private rebuild(): void {
    const activeMods = this.registry.loadOrder
      .map(modId => this.registry.entries[modId])
      .filter((entry): entry is StoredModEntry => !!entry && entry.enabled)
      .map(entry => entry.pkg);

    this.lastApply = applyMods(activeMods, this.registry.loadOrder);

    this.runtime.clear();
    for (const modPkg of activeMods) {
      this.runtime.enableMod(modPkg);
    }
  }

  private persist(): void {
    this.storage.setItem(STORAGE_KEY, this.registry);
  }
}

export const modManager = new ModManager();

function cloneRegistry(value: StoredModRegistry): StoredModRegistry {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as StoredModRegistry;
}

function normalizeRegistry(raw: StoredModRegistry | null | undefined): StoredModRegistry {
  if (!isRecord(raw)) {
    return makeEmptyRegistry();
  }

  const rawEntries = isRecord(raw.entries) ? raw.entries : {};
  const entries: Record<string, StoredModEntry> = {};
  for (const rawEntry of Object.values(rawEntries)) {
    if (!isRecord(rawEntry)) continue;
    const pkg = rawEntry.pkg as ModPackage | undefined;
    if (!pkg) continue;

    try {
      assertManifest(pkg);
    } catch {
      continue;
    }

    const modId = pkg.manifest.modId;
    entries[modId] = {
      pkg,
      enabled: Boolean(rawEntry.enabled),
      installedAt: typeof rawEntry.installedAt === 'number' ? rawEntry.installedAt : Date.now(),
    };
  }

  const rawLoadOrder = Array.isArray(raw.loadOrder)
    ? raw.loadOrder.filter((modId): modId is string => typeof modId === 'string')
    : [];

  const seen = new Set<string>();
  const loadOrder: string[] = [];
  for (const modId of rawLoadOrder) {
    if (!entries[modId] || seen.has(modId)) continue;
    seen.add(modId);
    loadOrder.push(modId);
  }

  for (const modId of Object.keys(entries)) {
    if (!seen.has(modId)) {
      loadOrder.push(modId);
    }
  }

  return {
    version: STORAGE_VERSION,
    entries,
    loadOrder,
  };
}
