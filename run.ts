#!/usr/bin/env -S deno run --allow-read --allow-net --allow-env

/**
 * Script for counting tokens in UDHR texts via OpenRouter API
 */

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_API_BASE = "https://openrouter.ai/api/v1";

// Get API key from environment variable
const API_KEY = Deno.env.get("OPENROUTER_API_KEY");
if (!API_KEY) {
  console.error("❌ OPENROUTER_API_KEY not found in environment variables");
  console.error("Set the variable: export OPENROUTER_API_KEY=your_key_here");
  Deno.exit(1);
}

interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

interface OpenRouterResponse {
  usage?: TokenUsage;
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message: string;
  };
}

interface Model {
  id: string;
  object?: string;
  created?: number;
  owned_by?: string;
  permission?: unknown[];
  root?: string;
  parent?: string | null;
  context_length?: number;
  pricing?: {
    prompt?: string;
    completion?: string;
  };
  architecture?: {
    modality?: string;
    tokenizer?: string;
    instruct_type?: string | null;
  };
  top_provider?: {
    max_completion_tokens?: number | null;
    is_moderated?: boolean;
  };
}

interface ModelsResponse {
  data: Model[];
  object?: string;
}

/**
 * Sends text to OpenRouter API and returns the number of input tokens
 */
async function countTokens(text: string, filename: string, verbose: boolean = false): Promise<number | null> {
  try {
    const requestBody = {
      model: "anthropic/claude-3-haiku:beta", // Cheap model for token counting
      messages: [
        {
          role: "user",
          content: text
        }
      ],
      max_tokens: 1, // Minimal response, we only need tokens
      temperature: 0
    };

    const requestPayload = JSON.stringify(requestBody, null, 2);

    if (verbose) {
      console.error(`🔍 [VERBOSE] Request to OpenRouter API for ${filename}:`);
      console.error(`🔍 [VERBOSE] URL: ${OPENROUTER_API_URL}`);
      console.error(`🔍 [VERBOSE] Headers:`);
      console.error(`🔍 [VERBOSE]   Authorization: Bearer ${API_KEY.substring(0, 10)}...`);
      console.error(`🔍 [VERBOSE]   Content-Type: application/json`);
      console.error(`🔍 [VERBOSE]   HTTP-Referer: https://github.com/your-repo`);
      console.error(`🔍 [VERBOSE]   X-Title: UDHR Token Counter`);
      console.error(`🔍 [VERBOSE] Body:`);
      console.error(requestPayload);
      console.error(`🔍 [VERBOSE] ---`);
    }

    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://github.com/your-repo", // Replace with your repository
        "X-Title": "UDHR Token Counter"
      },
      body: requestPayload
    });

    if (verbose) {
      console.error(`🔍 [VERBOSE] Response from OpenRouter API:`);
      console.error(`🔍 [VERBOSE] Status: ${response.status} ${response.statusText}`);
      console.error(`🔍 [VERBOSE] Headers:`);
      for (const [key, value] of response.headers.entries()) {
        console.error(`🔍 [VERBOSE]   ${key}: ${value}`);
      }
    }

    if (!response.ok) {
      const errorData = await response.text();
      if (verbose) {
        console.error(`🔍 [VERBOSE] Error Response Body:`);
        console.error(errorData);
      }
      let parsedError;
      try {
        parsedError = JSON.parse(errorData);
      } catch {
        parsedError = { error: { message: errorData } };
      }
      console.error(`❌ API error for ${filename}:`, parsedError.error?.message || response.statusText);
      return null;
    }

    const responseText = await response.text();
    if (verbose) {
      console.error(`🔍 [VERBOSE] Response Body:`);
      console.error(responseText);
      console.error(`🔍 [VERBOSE] ---`);
    }

    const data: OpenRouterResponse = JSON.parse(responseText);

    if (data.usage?.prompt_tokens) {
      return data.usage.prompt_tokens;
    } else {
      console.error(`❌ No token usage data for ${filename}`);
      return null;
    }
  } catch (error) {
    console.error(`❌ Network error for ${filename}:`, error.message);
    return null;
  }
}

/**
 * Counts the number of words in text (delimiters: spaces and punctuation)
 */
function countWords(text: string): number {
  // Delimiters: spaces, tabs, line breaks and punctuation marks
  const words = text.split(/[\s\n\r\t.,;:!?()[\]{}"'-]+/).filter(word => word.length > 0);
  return words.length;
}

/**
 * Gets the list of files to process
 */
function getFilesToProcess(specificFile?: string): string[] {
  const udhrDir = "./udhr";

  if (specificFile) {
    // Add .txt extension if not present
    const filename = specificFile.endsWith('.txt') ? specificFile : `${specificFile}.txt`;
    const fullPath = `${udhrDir}/${filename}`;
    try {
      Deno.statSync(fullPath);
      return [fullPath];
    } catch {
      console.error(`❌ File not found: ${fullPath}`);
      console.error("💡 Use 'deno run --allow-read --allow-net --allow-env run.ts --list' to view available files");
      Deno.exit(1);
    }
  }

  try {
    const files = [];
    for (const entry of Deno.readDirSync(udhrDir)) {
      if (entry.isFile && entry.name.endsWith('.txt')) {
        files.push(`${udhrDir}/${entry.name}`);
      }
    }
    return files.sort();
  } catch (error) {
    console.error(`❌ Error reading directory ${udhrDir}:`, error.message);
    Deno.exit(1);
  }
}

/**
 * Reads file content
 */
function readFileContent(filePath: string): string {
  try {
    return Deno.readTextFileSync(filePath);
  } catch (error) {
    console.error(`❌ Error reading file ${filePath}:`, error.message);
    return "";
  }
}

/**
 * Shows usage help
 */
function showHelp() {
  console.error(`
🚀 UDHR Token Counter - token counting via OpenRouter API

USAGE:
  deno run --allow-read --allow-net --allow-env run.ts [options] [file]

OPTIONS:
  --help, -h    Show this help
  --list        Show list of available files
  --models      Show list of available text-to-text models (sorted by popularity)
  --verbose, -v Output raw API requests and responses

PARAMETERS:
  file          File name from udhr/ folder (optional, without .txt extension)
                If not specified, all files are processed

EXAMPLES:
  deno run --allow-read --allow-net --allow-env run.ts
  deno run --allow-read --allow-net --allow-env run.ts eng_ks
  deno run --allow-read --allow-net --allow-env run.ts --verbose eng_ks
  deno run --allow-read --allow-net --allow-env run.ts --list
  deno run --allow-read --allow-net --allow-env run.ts --models

ENVIRONMENT VARIABLES:
  OPENROUTER_API_KEY    OpenRouter API key (required)
`);
}

/**
 * Shows list of available files
 */
function showFileList() {
  console.error("📁 Available files in udhr/ directory:");
  console.error("");

  try {
    const files = [];
    for (const entry of Deno.readDirSync("./udhr")) {
      if (entry.isFile && entry.name.endsWith('.txt')) {
        files.push(entry.name);
      }
    }

    files.sort().forEach(file => {
      console.error(`  ${file}`);
    });

    console.error("");
    console.error(`Total files: ${files.length}`);
  } catch (error) {
    console.error("❌ Error reading udhr/ directory:", error.message);
  }
}

/**
 * Checks if model is text-to-text (excludes vision, audio, image models)
 */
function isTextToTextModel(model: Model): boolean {
  const id = model.id.toLowerCase();
  const modality = model.architecture?.modality?.toLowerCase() || "";

  // Exclude known non-text models
  const excludePatterns = [
    'vision',
    'image',
    'audio',
    'tts',
    'whisper',
    'dall-e',
    'stable-diffusion',
    'midjourney',
    'imagen'
  ];

  // Check if model ID contains exclude patterns
  if (excludePatterns.some(pattern => id.includes(pattern))) {
    return false;
  }

  // Check modality field if available
  if (modality && modality !== 'text' && modality !== '') {
    return false;
  }

  return true;
}

/**
 * Gets list of text-to-text models from OpenRouter API
 */
async function getTextToTextModels(apiKey: string): Promise<string[]> {
  try {
    const response = await fetch(`${OPENROUTER_API_BASE}/models`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://github.com/your-repo",
        "X-Title": "UDHR Token Counter"
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = response.statusText;
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error?.message || errorMessage;
      } catch {
        // Use default error message
      }
      throw new Error(`API error: ${response.status} ${errorMessage}`);
    }

    const data: ModelsResponse = await response.json();

    if (!data.data || !Array.isArray(data.data)) {
      throw new Error("Invalid response format from API");
    }

    // Filter text-to-text models
    const textModels = data.data.filter(isTextToTextModel);

    // Sort by popularity (if available) or by model ID
    // Popular models often have shorter IDs or specific naming patterns
    // We'll sort by: 1) owned_by (provider), 2) model ID
    textModels.sort((a, b) => {
      // First sort by provider (popular providers first)
      const providerOrder: Record<string, number> = {
        'openai': 1,
        'anthropic': 2,
        'google': 3,
        'meta': 4,
        'mistralai': 5,
        'deepseek': 6,
      };

      const aProvider = a.owned_by?.toLowerCase() || '';
      const bProvider = b.owned_by?.toLowerCase() || '';
      const aOrder = providerOrder[aProvider] || 999;
      const bOrder = providerOrder[bProvider] || 999;

      if (aOrder !== bOrder) {
        return aOrder - bOrder;
      }

      // Then sort by model ID alphabetically
      return a.id.localeCompare(b.id);
    });

    return textModels.map(model => model.id);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ Error fetching models: ${errorMessage}`);
    throw error;
  }
}

/**
 * Shows list of text-to-text models
 */
async function showModelsList(apiKey: string) {
  try {
    const models = await getTextToTextModels(apiKey);

    // Output to stdout (plain text, one model per line)
    models.forEach(model => {
      console.log(model);
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ Failed to get models list: ${errorMessage}`);
    Deno.exit(1);
  }
}

/**
 * Main function
 */
async function main() {
  const args = Deno.args;

  // Handle options (don't require API key)
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }

  if (args.includes('--list')) {
    showFileList();
    return;
  }

  // Get API key (required for --models and token counting)
  const API_KEY = Deno.env.get("OPENROUTER_API_KEY");
  if (!API_KEY) {
    console.error("❌ OPENROUTER_API_KEY not found in environment variables");
    console.error("Set the variable: export OPENROUTER_API_KEY=your_key_here");
    console.error("Run 'deno run --allow-read --allow-net --allow-env run.ts --help' for help");
    Deno.exit(1);
  }

  if (args.includes('--models')) {
    await showModelsList(API_KEY);
    return;
  }

  const verbose = args.includes('--verbose') || args.includes('-v');
  const specificFile = args.find(arg => !arg.startsWith('-')); // First argument without dash

  console.error("🚀 Starting UDHR token counting via OpenRouter API");
  console.error("==================================================");

  if (specificFile) {
    console.error(`📁 Processing file: ${specificFile}`);
  } else {
    console.error("📁 Processing all files in udhr/ directory");
  }

  const files = getFilesToProcess(specificFile);
  console.error(`📊 Files found: ${files.length}`);
  console.error("");

  // Output CSV header to stdout
  console.log("filename,characters,words,tokens");

  let totalFiles = 0;
  let successfulFiles = 0;
  let totalTokens = 0;

  for (const filePath of files) {
    const filename = filePath.split('/').pop() || filePath;
    const content = readFileContent(filePath);

    if (!content) {
      console.error(`⚠️  Skipping ${filename} - read error`);
      continue;
    }

    console.error(`🔄 Processing: ${filename} (${content.length} characters)`);

    const tokenCount = await countTokens(content, filename, verbose);

    if (tokenCount !== null) {
      const wordCount = countWords(content);
      // Output CSV data to stdout
      console.log(`${filename},${content.length},${wordCount},${tokenCount}`);
      console.error(`✅ ${filename}: ${wordCount} words, ${tokenCount} input tokens`);
      successfulFiles++;
      totalTokens += tokenCount;
    } else {
      console.error(`❌ ${filename}: token counting error`);
    }

    totalFiles++;

    // Small delay between requests to not exceed limits
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.error("");
  console.error("==================================================");
  console.error("📈 RESULTS:");
  console.error(`📁 Files processed: ${totalFiles}`);
  console.error(`✅ Successful: ${successfulFiles}`);
  console.error(`❌ Errors: ${totalFiles - successfulFiles}`);
  console.error(`🔢 Total input tokens: ${totalTokens}`);
}

// Запуск скрипта
if (import.meta.main) {
  await main();
}
