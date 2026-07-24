import { store } from '@/stores';
import type {
  HookDiagnostic,
  HookEventName,
  ModHookScript,
  ModManifest,
  ModPackage,
} from './types';

interface HookModule {
  onEnable?: HookFn;
  onDisable?: HookFn;
  onReload?: HookFn;
  onSave?: HookFn;
  onLoad?: HookFn;
  onActionStart?: HookFn;
  onTaskComplete?: HookFn;
  onFormulaResolved?: HookFn;
  onEraAdvance?: HookFn;
  onTick?: HookFn;
  onMapSwitch?: HookFn;
}

type HookFn = (payload: unknown, context: HookContext) => unknown | Promise<unknown>;

type CleanupFn = () => void;

interface RuntimeHookInstance {
  hookId: string;
  modId: string;
  manifest: ModManifest;
  module: HookModule;
  cleanups: Set<CleanupFn>;
  controllers: Set<AbortController>;
  failureCount: number;
  disabled: boolean;
  networkInFlight: number;
}

interface HookContext {
  mod: {
    modId: string;
    name: string;
    version: string;
  };
  stores: Record<string, unknown>;
  window: Window;
  document: Document;
  fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  addCleanup: (cleanup: CleanupFn) => void;
  logger: {
    info: (message: string) => void;
    warn: (message: string) => void;
    error: (message: string) => void;
  };
}

const MAX_CONSECUTIVE_FAILURES = 5;

function parseDomain(value: string): string {
  try {
    return new URL(value, window.location.href).hostname;
  } catch {
    return value;
  }
}

function normalizeDomainList(domains: string[] | undefined): Set<string> {
  return new Set((domains || []).map(parseDomain));
}

function extractHookModule(script: ModHookScript): HookModule {
  const module = { exports: {} as Record<string, unknown> };
  const exports = module.exports;

  const fn = new Function(
    'module',
    'exports',
    script.code + '\n; return module.exports || exports.default || exports;',
  );

  const exported = fn(module, exports) as unknown;
  if (!exported || typeof exported !== 'object') {
    throw new Error(`Hook script must export an object: ${script.id}`);
  }

  return exported as HookModule;
}

function getStoreSnapshot(): Record<string, unknown> {
  const piniaStoreMap = (store as unknown as { _s?: Map<string, unknown> })._s;
  const snapshot: Record<string, unknown> = {};
  if (!piniaStoreMap) return snapshot;

  for (const [id, instance] of piniaStoreMap.entries()) {
    snapshot[id] = instance;
  }
  return snapshot;
}

export class HookRuntime {
  private instances = new Map<string, RuntimeHookInstance[]>();
  private diagnostics: HookDiagnostic[] = [];

  clear(): void {
    for (const modId of this.instances.keys()) {
      this.disableMod(modId);
    }
    this.instances.clear();
  }

  enableMod(modPkg: ModPackage): void {
    const scripts = modPkg.hooks || [];
    if (!scripts.length) return;

    const modInstances: RuntimeHookInstance[] = [];

    for (const script of scripts) {
      const module = extractHookModule(script);
      const instance: RuntimeHookInstance = {
        hookId: script.id,
        modId: modPkg.manifest.modId,
        manifest: modPkg.manifest,
        module,
        cleanups: new Set<CleanupFn>(),
        controllers: new Set<AbortController>(),
        failureCount: 0,
        disabled: false,
        networkInFlight: 0,
      };
      modInstances.push(instance);
    }

    this.instances.set(modPkg.manifest.modId, modInstances);
    void this.emitToMod(modPkg.manifest.modId, 'onEnable', {
      modId: modPkg.manifest.modId,
      version: modPkg.manifest.version,
    });
  }

  disableMod(modId: string): void {
    const instances = this.instances.get(modId);
    if (!instances?.length) return;

    void this.emitToMod(modId, 'onDisable', { modId });

    for (const instance of instances) {
      // Abort pending network requests.
      for (const controller of instance.controllers) {
        controller.abort();
      }
      instance.controllers.clear();

      // Cleanup side effects.
      for (const cleanup of instance.cleanups) {
        try {
          cleanup();
        } catch (error) {
          this.pushDiag(instance, 'error', `cleanup error: ${(error as Error).message}`, 'onDisable');
        }
      }
      instance.cleanups.clear();
    }

    this.instances.delete(modId);
  }

  async emit(event: HookEventName, payload: unknown): Promise<void> {
    for (const modId of this.instances.keys()) {
      await this.emitToMod(modId, event, payload);
    }
  }

  getDiagnostics(): HookDiagnostic[] {
    return [...this.diagnostics];
  }

  private async emitToMod(modId: string, event: HookEventName, payload: unknown): Promise<void> {
    const instances = this.instances.get(modId);
    if (!instances?.length) return;

    for (const instance of instances) {
      if (instance.disabled) continue;
      const handler = instance.module[event];
      if (!handler) continue;

      const start = Date.now();
      try {
        const context = this.buildContext(instance);
        await handler(payload, context);
        instance.failureCount = 0;

        const duration = Date.now() - start;
        if (duration > 80) {
          this.pushDiag(instance, 'warn', `slow hook ${event}: ${duration}ms`, event);
        }
      } catch (error) {
        instance.failureCount += 1;
        this.pushDiag(instance, 'error', `${event} failed: ${(error as Error).message}`, event);

        if (instance.failureCount >= MAX_CONSECUTIVE_FAILURES) {
          instance.disabled = true;
          this.pushDiag(instance, 'warn', `hook disabled after ${MAX_CONSECUTIVE_FAILURES} consecutive failures`, event);
        }
      }
    }
  }

  private buildContext(instance: RuntimeHookInstance): HookContext {
    const manifest = instance.manifest;
    const allowDomains = normalizeDomainList(manifest.networkPolicy?.allowDomains);
    const blockedDomains = normalizeDomainList(manifest.networkPolicy?.blockedDomains);
    const timeoutMs = manifest.networkPolicy?.timeoutMs ?? 10_000;
    const maxConcurrentRequests = Math.max(1, manifest.networkPolicy?.maxConcurrentRequests ?? 4);

    const wrappedFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      if ((manifest.capabilities?.network ?? true) !== true) {
        throw new Error('Network capability is disabled for this mod');
      }

      if (instance.networkInFlight >= maxConcurrentRequests) {
        throw new Error(`Network request limit reached (${maxConcurrentRequests})`);
      }

      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      const domain = parseDomain(url);

      if (blockedDomains.has(domain)) {
        throw new Error(`Network blocked by policy: ${domain}`);
      }

      if (allowDomains.size > 0 && !allowDomains.has(domain)) {
        throw new Error(`Network domain not in allow list: ${domain}`);
      }

      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
      const mergedSignal = init?.signal;

      if (mergedSignal) {
        mergedSignal.addEventListener('abort', () => controller.abort(), { once: true });
      }

      instance.controllers.add(controller);
      instance.networkInFlight += 1;

      try {
        const response = await fetch(input, {
          ...init,
          signal: controller.signal,
        });
        return response;
      } finally {
        clearTimeout(timeout);
        instance.controllers.delete(controller);
        instance.networkInFlight = Math.max(0, instance.networkInFlight - 1);
      }
    };

    return {
      mod: {
        modId: manifest.modId,
        name: manifest.name,
        version: manifest.version,
      },
      stores: getStoreSnapshot(),
      window,
      document,
      fetch: wrappedFetch,
      addCleanup: cleanup => {
        instance.cleanups.add(cleanup);
      },
      logger: {
        info: message => this.pushDiag(instance, 'info', message, 'onTick'),
        warn: message => this.pushDiag(instance, 'warn', message, 'onTick'),
        error: message => this.pushDiag(instance, 'error', message, 'onTick'),
      },
    };
  }

  private pushDiag(
    instance: RuntimeHookInstance,
    level: 'info' | 'warn' | 'error',
    message: string,
    event: HookEventName,
  ): void {
    const row: HookDiagnostic = {
      modId: instance.modId,
      hookId: instance.hookId,
      event,
      timestamp: Date.now(),
      level,
      message,
    };
    this.diagnostics.push(row);
    if (this.diagnostics.length > 200) {
      this.diagnostics.shift();
    }
  }
}
