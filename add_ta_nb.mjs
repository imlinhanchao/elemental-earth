import fs from 'fs';

const itemsPath = 'src/data/items.json';
const formulaPath = 'src/data/formula.json';
const actionsPath = 'src/data/actions.json';

// 1. Add new items to items.json
const items = JSON.parse(fs.readFileSync(itemsPath, 'utf8'));
const newItems = [
    {
        "name": "钽铌铁矿",
        "key": "tantalite_columbite",
        "category": "材料",
        "description": "一种深褐色的重矿石，是提取钽和铌的主要矿物来源。通常产于花岗伟晶岩中。",
        "type": ["material"],
        "is_discovery": true
    },
    {
        "name": "氟钽酸钾",
        "key": "potassium_fluotantalate",
        "category": "材料",
        "description": "白色针状晶体，通过钽铌铁矿的氢氟酸浸出与分步控制沉淀获得，是提炼金属钽的重要中间体。",
        "type": ["material"]
    },
    {
        "name": "氟铌酸钾",
        "key": "potassium_fluoniobate",
        "category": "材料",
        "description": "白色晶体，在钽铌分离流程中通过溶解度差异与氟钽酸钾分离，用于提炼金属铌。",
        "type": ["material"]
    },
    {
        "name": "钽",
        "key": "tantalum",
        "category": "材料",
        "description": "钢灰色金属，极耐腐蚀，熔点高，具有优异的延展性。主要用于制造高性能电容器和耐酸设备。",
        "type": ["material"],
        "elemental": 73
    },
    {
        "name": "铌",
        "key": "niobium",
        "category": "材料",
        "description": "银灰色金属，具有超导性能和良好的抗强腐蚀性。广泛用于高温合金钢和超导磁体。",
        "type": ["material"],
        "elemental": 41
    }
];

newItems.forEach(item => {
    if (!items.find(i => i.key === item.key)) {
        items.push(item);
    }
});
fs.writeFileSync(itemsPath, JSON.stringify(items, null, 2));
console.log('Added Ta/Nb items.');

// 2. Add mining reward for tantalite_columbite in actions.json
const actions = JSON.parse(fs.readFileSync(actionsPath, 'utf8'));
const deepMining = actions.find(a => a.key === 'deep_mining' || a.key === 'mining');
if (deepMining) {
    if (!deepMining.rewards.find(r => r.key === 'tantalite_columbite')) {
        deepMining.rewards.push({
            "key": "tantalite_columbite",
            "quantity": 1,
            "probability": 50, // Relatively rare
            "map": { "mountain": 80 }
        });
        console.log('Added tantalite_columbite to mining rewards.');
    }
}
fs.writeFileSync(actionsPath, JSON.stringify(actions, null, 2));

// 3. Add formulas to formula.json
const formulas = JSON.parse(fs.readFileSync(formulaPath, 'utf8'));

const fTaNbSeparation = {
    "key": "tantalum_niobium_separation",
    "name": "钽铌氟化分离",
    "description": "将钽铌铁矿溶解于氢氟酸与硫酸的混合液中，加入钾盐，利用氟钽酸钾和氟铌酸钾的溶解度差异进行分步结晶分离。",
    "time_required": 60,
    "required_container": "iron_tank",
    "required_actions": { "key": "heating" },
    "required_items": [
        { "key": "tantalite_columbite", "quantity": 1 },
        { "key": "hydrofluoric_acid", "quantity": 2 },
        { "key": "concentrated_sulfuric_acid", "quantity": 1 },
        { "key": "potassium_fluoride", "quantity": 1 }
    ],
    "products": [
        { "key": "potassium_fluotantalate", "multiple": 1 },
        { "key": "potassium_fluoniobate", "multiple": 1 }
    ],
    "required_techs": ["modern_chem"]
};

const fRefineTa = {
    "key": "refine_tantalum_step",
    "name": "钠还原提炼钽",
    "description": "在高温下用金属钠还原氟钽酸钾，得到高纯度的金属钽粉。",
    "time_required": 40,
    "required_container": "crucible",
    "required_actions": { "key": "roasting" },
    "required_items": [
        { "key": "potassium_fluotantalate", "quantity": 1 },
        { "key": "sodium", "quantity": 2 }
    ],
    "products": [{ "key": "tantalum", "multiple": 1 }],
    "required_techs": ["modern_chem"]
};

const fRefineNb = {
    "key": "refine_niobium_step",
    "name": "钠还原提炼铌",
    "description": "在高温下用金属钠还原氟铌酸钾，制取金属铌。",
    "time_required": 40,
    "required_container": "crucible",
    "required_actions": { "key": "roasting" },
    "required_items": [
        { "key": "potassium_fluoniobate", "quantity": 1 },
        { "key": "sodium", "quantity": 2 }
    ],
    "products": [{ "key": "niobium", "multiple": 1 }],
    "required_techs": ["modern_chem"]
};

[fTaNbSeparation, fRefineTa, fRefineNb].forEach(f => {
    if (!formulas.find(x => x.key === f.key)) {
        formulas.push(f);
    }
});

fs.writeFileSync(formulaPath, JSON.stringify(formulas, null, 2));
console.log('Added Ta/Nb refining formulas.');
