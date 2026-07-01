import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateGameData, type GeneratedOutput, type ContextData } from './ai-generator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_DIR = resolve(__dirname, '../src/data');

const MODELS: Record<string, { file: string; keyField: string }> = {
  maps:     { file: 'maps.json',     keyField: 'key' },
  items:    { file: 'items.json',    keyField: 'key' },
  actions:  { file: 'actions.json',  keyField: 'key' },
  techs:    { file: 'techs.json',    keyField: 'key' },
  labs:     { file: 'labs.json',     keyField: 'key' },
  formulas: { file: 'formula.json',  keyField: 'key' },
  elements: { file: 'elements.json', keyField: 'number' },
  eras:     { file: 'eras.json',     keyField: 'key' },
};

function readData(type: string): Record<string, any>[] {
  const model = MODELS[type];
  if (!model) throw new Error(`Unknown type: ${type}`);
  const path = resolve(DATA_DIR, model.file);
  if (!existsSync(path)) return [];
  return JSON.parse(readFileSync(path, 'utf-8'));
}

function writeData(type: string, data: any[]): void {
  const model = MODELS[type];
  if (!model) throw new Error(`Unknown type: ${type}`);
  const path = resolve(DATA_DIR, model.file);
  writeFileSync(path, JSON.stringify(data, null, 2), 'utf-8');
}

const server = new Server(
  {
    name: "elemental-earth-manager",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "generate_game_data",
        description: "Generate new game data (items, actions, techs, etc.) based on a material or element prompt.",
        inputSchema: {
          type: "object",
          properties: {
            prompt: {
              type: "string",
              description: "The material or element name to generate data for.",
            },
          },
          required: ["prompt"],
        },
      },
      {
        name: "apply_game_data",
        description: "Apply the generated game data to the workspace. This should be called AFTER the user has confirmed the changes.",
        inputSchema: {
          type: "object",
          properties: {
            data: {
              type: "object",
              description: "The JSON data returned by generate_game_data.",
            },
          },
          required: ["data"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === "generate_game_data") {
      const prompt = args?.prompt as string;
      const contextData: ContextData = {};
      for (const type of Object.keys(MODELS)) {
        contextData[type] = readData(type);
      }
      const result = await generateGameData(prompt, contextData);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }

    if (name === "apply_game_data") {
      const output = args?.data as GeneratedOutput;
      const report: string[] = [];

      // 1. Add new items
      if (output.items?.length) {
        const items = readData('items');
        for (const item of output.items) {
          if (!items.find(i => i.key === item.key)) {
            items.push(item);
            report.push(`Added item: ${item.name} (${item.key})`);
          }
        }
        writeData('items', items);
      }

      // 2. Add new actions
      if (output.actions?.length) {
        const actions = readData('actions');
        for (const action of output.actions) {
          if (!actions.find(a => a.key === action.key)) {
            actions.push(action);
            report.push(`Added action: ${action.name} (${action.key})`);
          }
        }
        writeData('actions', actions);
      }

      // 3. Add new techs
      if (output.techs?.length) {
        const techs = readData('techs');
        for (const tech of output.techs) {
          if (!techs.find(t => t.key === tech.key)) {
            techs.push(tech);
            report.push(`Added tech: ${tech.name} (${tech.key})`);
          }
        }
        writeData('techs', techs);
      }

      // 4. Add new labs
      if (output.labs?.length) {
        const labs = readData('labs');
        for (const lab of output.labs) {
          if (!labs.find(l => l.key === lab.key)) {
            labs.push(lab);
            report.push(`Added lab operation: ${lab.name} (${lab.key})`);
          }
        }
        writeData('labs', labs);
      }

      // 5. Add new formulas
      if (output.formulas?.length) {
        const formulas = readData('formulas');
        for (const formula of output.formulas) {
          if (!formulas.find(f => f.key === formula.key)) {
            formulas.push(formula);
            report.push(`Added formula: ${formula.name} (${formula.key})`);
          }
        }
        writeData('formulas', formulas);
      }

      // 6. Modifications
      if (output.modifications?.length) {
        for (const mod of output.modifications) {
          const type = mod.type;
          const key = mod.key;
          const action = mod.action;
          const data = mod.data;

          try {
            const records = readData(type);
            const keyField = MODELS[type].keyField;
            const target = records.find(r => String(r[keyField]) === String(key));

            if (target) {
              if (action === 'update') {
                Object.assign(target, data);
                report.push(`Updated ${type} ${key}: applied field updates`);
              } else if (action === 'add_reward') {
                if (Array.isArray(target.rewards)) {
                  target.rewards.push(data);
                  report.push(`Updated ${type} ${key}: added reward ${data.key}`);
                }
              } else if (action === 'add_required_tech') {
                if (!Array.isArray(target.required_techs)) target.required_techs = [];
                target.required_techs.push(data.tech);
                report.push(`Updated ${type} ${key}: added required tech ${data.tech}`);
              }
              writeData(type, records);
            }
          } catch (e) {
            report.push(`Failed to modify ${type} ${key}: ${(e as Error).message}`);
          }
        }
      }

      return {
        content: [{ type: "text", text: `Success:\n${report.join('\n')}` }],
      };
    }

    throw new Error(`Tool not found: ${name}`);
  } catch (error) {
    return {
      isError: true,
      content: [{ type: "text", text: (error as Error).message }],
    };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("Elemental Earth Manager MCP Server running on stdio");
