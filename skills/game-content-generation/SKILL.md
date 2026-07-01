# Game Content Generation Skill

This skill allows the agent to generate and apply new game data (items, actions, techs, labs, formulas) for the "elemental-earth" project based on a material or element prompt.

## Prerequisites
- The backend server's MCP interface (`server/mcp-server.ts`).
- Existing AI generator logic in `server/ai-generator.ts`.
- Workspace data located in `src/data/*.json`.

## Workflow

### 1. Identify User Intent
Trigger this when a user asks to add materials, elements, or minerals (e.g., "Add Bismuth", "Generate data for Cinnabar").

### 2. Generate Data
Call the `generate_game_data` tool via MCP if available. 
**Fallback**: If MCP is not running, run a temporary Node.js script using `tsx` to call the `generateGameData` function from `server/ai-generator.ts`, passing the contents of all files in `src/data/` as context.
- **Context Path**: Use absolute paths or be careful with `cd server` vs root.
- **Output**: Ensure the output is a valid JSON object with `items`, `actions`, `techs`, `labs`, `formulas`, and `modifications`.

### 3. Present Results to User
Format the generated data for review.
- **Translate to Chinese**: The game UI is Chinese, so names and descriptions must be in Chinese.
- **Highlight Modifications**: Specifically show what existing actions (like `mining` or `directional_blasting`) will be updated.
- **Safety**: Ask: "Please review these changes. Shall I apply them to the game data?"

### 4. Apply Changes (Safe Execution)
Once confirmed, use the `apply_game_data` tool via MCP.
**Fallback (Critical)**: If MCP is not available, DO NOT use `replace_string_in_file` on large JSON files like `actions.json` due to high risk of "Multiple matches" or syntax errors. 
Instead, **generate and run a one-time Node.js script** to:
1. Load the target JSON file into a real JS object.
2. Use `.push()` for new entries and `.find()` to locate/update existing ones.
3. Write the stringified object back to the file.

### 5. Post-Action Validation
- Run `npx tsc --noEmit` on the server or use generic JSON linting to ensure no syntax errors were introduced.
- Verify the new items/techs appear at the end of their respective files.

## Guidelines & Best Practices
- **Real Science**: Base data on real chemistry/mineralogy.
- **Mining Integration**: New minerals MUST be added to the `mining` and `directional_blasting` actions via `modifications`.
- **Atomic Numbers**: Pure elements must have the `elemental` property set to their correct atomic number.
- **Discovery**: Minerals and pure elements should have `is_discovery: true`.
- **Avoid Duplicates**: Always check the context before generating to avoid creating an item/tech that already exists.

