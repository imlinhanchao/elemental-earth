import express, { type Request, type Response } from 'express';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { GenerateGameData } from './ai-generator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_DIR = resolve(__dirname, '../src/data');

// ============================================================
// 数据模型定义
// ============================================================

interface ModelInfo {
  file: string;
  keyField: string;
  label: string;
}

const MODELS: Record<string, ModelInfo> = {
  maps:     { file: 'maps.json',     keyField: 'key',    label: '地图' },
  items:    { file: 'items.json',    keyField: 'key',    label: '物品' },
  actions:  { file: 'actions.json',  keyField: 'key',    label: '行动' },
  techs:    { file: 'techs.json',    keyField: 'key',    label: '科技' },
  labs:     { file: 'labs.json',     keyField: 'key',    label: '实验操作' },
  formulas: { file: 'formula.json',  keyField: 'key',    label: '配方' },
  elements: { file: 'elements.json', keyField: 'number', label: '元素' },
};

// ============================================================
// 工具函数
// ============================================================

function readData(type: string): Record<string, unknown>[] {
  const model = MODELS[type];
  if (!model) throw new Error(`未知类型: ${type}`);
  const path = resolve(DATA_DIR, model.file);
  if (!existsSync(path)) return [];
  return JSON.parse(readFileSync(path, 'utf-8')) as Record<string, unknown>[];
}

function writeData(type: string, data: unknown[]): void {
  const model = MODELS[type];
  if (!model) throw new Error(`未知类型: ${type}`);
  const path = resolve(DATA_DIR, model.file);
  writeFileSync(path, JSON.stringify(data, null, 2), 'utf-8');
}

function getModelKey(type: string): string {
  const model = MODELS[type];
  if (!model) throw new Error(`未知类型: ${type}`);
  return model.keyField;
}

// ============================================================
// App 初始化
// ============================================================

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.static(resolve(__dirname, 'public')));

// ============================================================
// API 路由
// ============================================================

// 获取元信息
app.get('/api', (_req: Request, res: Response) => {
  res.json(
    Object.entries(MODELS).map(([key, val]) => ({
      key,
      label: val.label,
      file: val.file,
      keyField: val.keyField,
    }))
  );
});

// 发布：验证所有 JSON 并写回磁盘
app.post('/api/publish', (_req: Request, res: Response) => {
  try {
    const errors: string[] = [];
    for (const [, model] of Object.entries(MODELS)) {
      const path = resolve(DATA_DIR, model.file);
      const content = readFileSync(path, 'utf-8');
      try {
        JSON.parse(content);
      } catch {
        errors.push(`${model.file} JSON 格式错误，未写入`);
        continue;
      }
      // 重新写入以规范化格式
      const data = JSON.parse(content);
      writeFileSync(path, JSON.stringify(data, null, 2) + '\n', 'utf-8');
    }
    res.json({ success: true, errors: errors.length ? errors : undefined });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// ============================================================
// AI 内容生成
// ============================================================

app.post('/api/generate', async (req: Request, res: Response) => {
  try {
    const { prompt } = req.body as { prompt?: string };
    if (!prompt || !prompt.trim()) {
      res.status(400).json({ error: '请提供要生成的材料或元素名称' });
      return;
    }

    // 读取所有现有数据作为上下文
    const contextData: Record<string, unknown[]> = {};
    for (const [type] of Object.entries(MODELS)) {
      contextData[type] = readData(type);
    }

    // 动态导入 AI 生成器
    const { generateGameData } = await import('./ai-generator.js') as { generateGameData: GenerateGameData };
    const result = await generateGameData(prompt.trim(), contextData);

    res.json({ success: true, data: result });
  } catch (e) {
    const err = e as Error;
    console.error('AI 生成失败:', err.message, err.stack?.split('\n').slice(0, 3).join('\n'));
    if (!res.headersSent) {
      res.status(500).json({ error: err.message || 'AI 生成失败' });
    }
  }
});

// 获取所有数据的上下文摘要
app.get('/api/data-context', (_req: Request, res: Response) => {
  try {
    const context: Record<string, { count: number; keys: unknown[] }> = {};
    for (const [type, model] of Object.entries(MODELS)) {
      const data = readData(type);
      context[type] = {
        count: data.length,
        keys: data.map(r => r[model.keyField]),
      };
    }
    res.json(context);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// ============================================================
// 通用 CRUD 路由
// ============================================================

// 获取所有记录
app.get('/api/:type', (req: Request, res: Response) => {
  try {
    const data = readData(req.params.type as string);
    res.json(data);
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

// 获取单条记录
app.get('/api/:type/:key', (req: Request, res: Response) => {
  try {
    const data = readData(req.params.type as string);
    const keyField = getModelKey(req.params.type as string);
    const record = data.find(r => String(r[keyField]) === req.params.key);
    if (!record) {
      res.status(404).json({ error: '记录不存在' });
      return;
    }
    res.json(record);
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

// 新增记录
app.post('/api/:type', (req: Request, res: Response) => {
  try {
    const data = readData(req.params.type as string);
    const keyField = getModelKey(req.params.type as string);
    const newKey = req.body[keyField];
    const existing = data.find(r => String(r[keyField]) === String(newKey));
    if (existing) {
      res.status(409).json({ error: `key "${newKey}" 已存在` });
      return;
    }
    data.push(req.body);
    writeData(req.params.type as string, data);
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

// 更新记录
app.put('/api/:type/:key', (req: Request, res: Response) => {
  try {
    const data = readData(req.params.type as string);
    const keyField = getModelKey(req.params.type as string);
    const idx = data.findIndex(r => String(r[keyField]) === req.params.key);
    if (idx === -1) {
      res.status(404).json({ error: '记录不存在' });
      return;
    }
    data[idx] = req.body;
    writeData(req.params.type as string, data);
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

// 删除记录
app.delete('/api/:type/:key', (req: Request, res: Response) => {
  try {
    const data = readData(req.params.type as string);
    const keyField = getModelKey(req.params.type as string);
    const idx = data.findIndex(r => String(r[keyField]) === req.params.key);
    if (idx === -1) {
      res.status(404).json({ error: '记录不存在' });
      return;
    }
    data.splice(idx, 1);
    writeData(req.params.type as string, data);
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

// ============================================================
// 启动服务器
// ============================================================

const PORT = Number(process.env.PORT) || 3001;
app.listen(PORT, () => {
  console.log(`⚙️  管理后台: http://localhost:${PORT}`);
  console.log(`📁 数据目录: ${DATA_DIR}`);
});
