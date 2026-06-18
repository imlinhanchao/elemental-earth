import express from 'express';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, '../src/data');

// 数据模型定义：类型名 → JSON 文件名、主键、可显示名称
const MODELS = {
  maps:     { file: 'maps.json',     keyField: 'key', label: '地图' },
  items:    { file: 'items.json',    keyField: 'key', label: '物品' },
  actions:  { file: 'actions.json',  keyField: 'key', label: '行动' },
  techs:    { file: 'techs.json',    keyField: 'key', label: '科技' },
  labs:     { file: 'labs.json',     keyField: 'key', label: '实验操作' },
  formulas: { file: 'formula.json',  keyField: 'key', label: '配方' },
};

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.static(resolve(__dirname, 'public')));

// ---- 工具函数 ----

function readData(type) {
  const model = MODELS[type];
  if (!model) throw new Error(`未知类型: ${type}`);
  const path = resolve(DATA_DIR, model.file);
  if (!existsSync(path)) return [];
  return JSON.parse(readFileSync(path, 'utf-8'));
}

function writeData(type, data) {
  const model = MODELS[type];
  if (!model) throw new Error(`未知类型: ${type}`);
  const path = resolve(DATA_DIR, model.file);
  writeFileSync(path, JSON.stringify(data, null, 2), 'utf-8');
}

// ---- API 路由 ----

// 获取元信息（类型列表）- 必须在 :type 路由之前
app.get('/api', (_req, res) => {
  res.json(Object.entries(MODELS).map(([key, val]) => ({
    key,
    label: val.label,
    file: val.file,
    keyField: val.keyField,
  })));
});

// 发布：验证所有 JSON 并写回磁盘（必须在 /api/:type 之前）
app.post('/api/publish', (req, res) => {
  try {
    const errors = [];
    for (const [type, model] of Object.entries(MODELS)) {
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
    res.status(500).json({ error: e.message });
  }
});

// 获取所有记录
app.get('/api/:type', (req, res) => {
  try {
    const data = readData(req.params.type);
    res.json(data);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// 获取单条记录
app.get('/api/:type/:key', (req, res) => {
  try {
    const data = readData(req.params.type);
    const model = MODELS[req.params.type];
    const record = data.find(r => r[model.keyField] === req.params.key);
    if (!record) return res.status(404).json({ error: '记录不存在' });
    res.json(record);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// 新增记录
app.post('/api/:type', (req, res) => {
  try {
    const data = readData(req.params.type);
    const model = MODELS[req.params.type];
    const existing = data.find(r => r[model.keyField] === req.body[model.keyField]);
    if (existing) return res.status(409).json({ error: `key "${req.body[model.keyField]}" 已存在` });
    data.push(req.body);
    writeData(req.params.type, data);
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// 更新记录
app.put('/api/:type/:key', (req, res) => {
  try {
    const data = readData(req.params.type);
    const model = MODELS[req.params.type];
    const idx = data.findIndex(r => r[model.keyField] === req.params.key);
    if (idx === -1) return res.status(404).json({ error: '记录不存在' });
    data[idx] = req.body;
    writeData(req.params.type, data);
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// 删除记录
app.delete('/api/:type/:key', (req, res) => {
  try {
    const data = readData(req.params.type);
    const model = MODELS[req.params.type];
    const idx = data.findIndex(r => r[model.keyField] === req.params.key);
    if (idx === -1) return res.status(404).json({ error: '记录不存在' });
    data.splice(idx, 1);
    writeData(req.params.type, data);
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});


const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`⚙️  管理后台: http://localhost:${PORT}`);
  console.log(`📁 数据目录: ${DATA_DIR}`);
});
