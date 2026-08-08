import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { stdin as input, stdout as output } from "node:process";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const TEMPLATES = ["reference", "openai", "openai-compatible"];
const FRAMEWORK_RANGE = "^1.4.0";
const OPENAI_PEER_RANGE = "^1.0.2";
const ANTHROPIC_PEER_RANGE = "^1.0.0";

function printHelp() {
  console.log(`Usage: create-agentprodready [directory] [--template <name>]

Templates: ${TEMPLATES.join(", ")}

Examples:
  npm create agentprodready@latest my-agent
  npm create agentprodready@latest my-agent -- --template openai
`);
}

function parseArgs(argv) {
  let directory;
  let template;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") return { help: true };
    if (arg === "--template" || arg === "-t") {
      template = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg.startsWith("--template=")) {
      template = arg.slice("--template=".length);
      continue;
    }
    if (arg.startsWith("-")) {
      throw new Error(`Unknown option: ${arg}`);
    }
    if (directory !== undefined) {
      throw new Error("Unexpected extra argument. Pass one directory only.");
    }
    directory = arg;
  }
  return { directory: directory ?? "my-agent", template };
}

async function chooseTemplate(explicit) {
  if (explicit !== undefined) {
    if (!TEMPLATES.includes(explicit)) {
      throw new Error(`Unknown template "${explicit}". Use: ${TEMPLATES.join(", ")}`);
    }
    return explicit;
  }
  if (!input.isTTY || !output.isTTY) {
    return "reference";
  }
  const rl = createInterface({ input, output });
  try {
    console.log("Provider template:");
    TEMPLATES.forEach((name, index) => {
      console.log(`  ${index + 1}) ${name}`);
    });
    const answer = (await rl.question("Choose [1-3] (default 1 — reference): ")).trim();
    if (answer === "" || answer === "1") return "reference";
    if (answer === "2") return "openai";
    if (answer === "3") return "openai-compatible";
    if (TEMPLATES.includes(answer)) return answer;
    throw new Error(`Invalid choice: ${answer}`);
  } finally {
    rl.close();
  }
}

function copyDir(from, to) {
  mkdirSync(to, { recursive: true });
  for (const entry of readdirSync(from)) {
    const src = join(from, entry);
    const dest = join(to, entry);
    if (statSync(src).isDirectory()) copyDir(src, dest);
    else cpSync(src, dest);
  }
}

function writePackageJson(targetDir, template, packageName) {
  const dependencies = {
    "@agentprodready/agent-framework": FRAMEWORK_RANGE,
  };
  if (template === "openai" || template === "openai-compatible") {
    dependencies["@agentprodready/ai-provider-openai"] = OPENAI_PEER_RANGE;
  }
  const pkg = {
    name: packageName,
    private: true,
    type: "module",
    scripts: {
      dev: "tsx src/index.ts",
      start: "tsx src/index.ts",
    },
    engines: {
      node: ">=22 <25",
    },
    dependencies,
    devDependencies: {
      tsx: "^4.20.0",
      typescript: "^5.9.2",
      "@types/node": "^22.17.0",
    },
  };
  writeFileSync(join(targetDir, "package.json"), `${JSON.stringify(pkg, null, 2)}\n`, "utf8");
}

export async function run(argv) {
  const parsed = parseArgs(argv);
  if (parsed.help) {
    printHelp();
    return;
  }

  const template = await chooseTemplate(parsed.template);
  const targetDir = resolve(process.cwd(), parsed.directory);
  if (existsSync(targetDir) && readdirSync(targetDir).length > 0) {
    throw new Error(`Target directory is not empty: ${targetDir}`);
  }

  const templateDir = join(ROOT, "templates", template);
  if (!existsSync(templateDir)) {
    throw new Error(`Missing template files for ${template}`);
  }

  mkdirSync(targetDir, { recursive: true });
  copyDir(templateDir, targetDir);

  const packageName = parsed.directory
    .replace(/\\/g, "/")
    .split("/")
    .filter(Boolean)
    .at(-1)
    ?.toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-") || "my-agent";

  writePackageJson(targetDir, template, packageName);

  // Keep generated README honest about env loading.
  const readmePath = join(targetDir, "README.md");
  if (existsSync(readmePath)) {
    let readme = readFileSync(readmePath, "utf8");
    readme = readme.replaceAll("{{PACKAGE_NAME}}", packageName);
    writeFileSync(readmePath, readme, "utf8");
  }

  console.log(`Created AgentProdReady project in ${targetDir}`);
  console.log(`Template: ${template}`);
  console.log("");
  console.log("Next:");
  console.log(`  cd ${parsed.directory}`);
  console.log("  npm install");
  console.log("  npm run dev");
}
