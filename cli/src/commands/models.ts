export async function modelsCommand() {
  const { default: chalk } = await import("chalk");
  const { loadConfig }     = await import("../lib/config");
  const config = loadConfig();

  const OR = [
    { id: "google/gemma-2-9b-it:free",                     badge: "Default ← recommended" },
    { id: "google/gemma-3-12b-it:free",                    badge: "Google"    },
    { id: "meta-llama/llama-3.1-8b-instruct:free",         badge: "128k ctx"  },
    { id: "meta-llama/llama-3.2-3b-instruct:free",         badge: "Fast"      },
    { id: "deepseek/deepseek-r1:free",                     badge: "Reasoning" },
    { id: "deepseek/deepseek-r1-distill-llama-70b:free",   badge: "Reasoning" },
    { id: "qwen/qwen-2.5-7b-instruct:free",                badge: "Alibaba"   },
    { id: "mistralai/mistral-nemo:free",                   badge: "12B"       },
    { id: "microsoft/phi-3-mini-128k-instruct:free",       badge: "Microsoft" },
    { id: "openchat/openchat-7b:free",                     badge: "Chat"      },
    { id: "mistralai/mistral-small-3.2-24b-instruct:free", badge: "Mistral"   },
  ];

  const GROQ = [
    { id: "groq/llama-3.3-70b-versatile",                   badge: "Groq Fast"   },
    { id: "groq/llama-3.1-8b-instant",                      badge: "Groq Speed"  },
    { id: "groq/meta-llama/llama-4-scout-17b-16e-instruct", badge: "Groq New"    },
    { id: "groq/compound-beta",                              badge: "Groq Agent"  },
    { id: "groq/compound-beta-mini",                         badge: "Groq Mini"   },
    { id: "groq/qwen/qwen3-32b",                             badge: "Alibaba/Groq"},
    { id: "groq/openai/gpt-oss-120b",                        badge: "OpenAI/Groq" },
    { id: "groq/openai/gpt-oss-20b",                         badge: "OpenAI/Groq" },
  ];

  console.log("\n" + chalk.bold("  CodeForge AI — Available Models\n"));

  console.log(chalk.cyan.bold("  OpenRouter") + chalk.dim("  (free — cf config --openrouter-key KEY)"));
  console.log(chalk.dim("  " + "─".repeat(62) + "\n"));
  for (const m of OR) {
    const active = config.model === m.id;
    const mark   = active ? chalk.green("  ✓ active") : "";
    console.log(`    ${chalk.white(m.id.padEnd(52))} ${chalk.dim("[" + m.badge + "]")}${mark}`);
  }

  console.log("\n" + chalk.yellow.bold("  Groq") + chalk.dim("  (fast — cf config --groq-key KEY)"));
  console.log(chalk.dim("  " + "─".repeat(62) + "\n"));
  for (const m of GROQ) {
    const active = config.model === m.id;
    const mark   = active ? chalk.green("  ✓ active") : "";
    console.log(`    ${chalk.white(m.id.padEnd(52))} ${chalk.dim("[" + m.badge + "]")}${mark}`);
  }

  console.log("\n" + chalk.dim("  Switch model:  cf config --model <id>"));
  console.log(chalk.dim("  Current model: ") + chalk.cyan(config.model) + "\n");
}
