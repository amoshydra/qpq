type ModuleId =
  | 'AddCommandForm'
  | 'CommandSearch'
  | 'DeleteConfirmation'
  | 'EditCommandForm'
  | 'TemplatePrompt';

interface ModuleConfig {
  id: ModuleId;
  path: string;
  priority: 'high' | 'medium' | 'low';
}

const MODULE_CONFIGS: ModuleConfig[] = [
  { id: 'CommandSearch', path: './components/CommandSearch.js', priority: 'high' },
  { id: 'AddCommandForm', path: './components/AddCommandForm.js', priority: 'high' },
  { id: 'TemplatePrompt', path: './components/TemplatePrompt.js', priority: 'medium' },
  { id: 'EditCommandForm', path: './components/EditCommandForm.js', priority: 'medium' },
  { id: 'DeleteConfirmation', path: './components/DeleteConfirmation.js', priority: 'low' },
];

const PRIORITY_ORDER: Record<'high' | 'medium' | 'low', number> = {
  high: 0,
  medium: 1,
  low: 2,
};

const preloadCache = new Map<ModuleId, Promise<unknown>>();

function getModuleConfig(id: ModuleId): ModuleConfig | undefined {
  return MODULE_CONFIGS.find(m => m.id === id);
}

function updateTemplatePriority(hasTemplates: boolean): void {
  const templateModule = MODULE_CONFIGS.find(m => m.id === 'TemplatePrompt');
  if (templateModule) {
    templateModule.priority = hasTemplates ? 'high' : 'low';
  }
}

function getSortedModules(): ModuleConfig[] {
  return [...MODULE_CONFIGS].sort(
    (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
  );
}

async function loadModule(config: ModuleConfig): Promise<unknown> {
  const cached = preloadCache.get(config.id);
  if (cached) {
    return cached;
  }

  const promise = import(config.path).then(m => {
    return m;
  });

  preloadCache.set(config.id, promise);
  return promise;
}

export function preloadModule(id: ModuleId): void {
  const config = getModuleConfig(id);
  if (!config) return;

  loadModule(config).catch(err => {
    console.error(`Failed to preload module ${id}:`, err);
  });
}

export function preloadUrgent(id: ModuleId): Promise<unknown> {
  const config = getModuleConfig(id);
  if (!config) {
    return Promise.resolve();
  }

  return loadModule(config);
}

export function startPreloading(hasTemplates: boolean): void {
  updateTemplatePriority(hasTemplates);

  const sorted = getSortedModules();

  let delay = 0;
  const BETWEEN_DELAY_MS = 50;

  for (const mod of sorted) {
    setTimeout(() => {
      loadModule(mod).catch(err => {
        console.error(`Failed to preload module ${mod.id}:`, err);
      });
    }, delay);
    delay += BETWEEN_DELAY_MS;
  }
}

export type { ModuleId };
