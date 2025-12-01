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
  output_modality?: string;
  popularity?: number;
  name?: string;
  description?: string;
  [key: string]: unknown; // Allow additional fields from API
}

interface ModelsResponse {
  data?: Model[];
  models?: Model[];
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
  --models      Show list of all available models
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
 * By default, assumes model is text-to-text unless explicitly marked otherwise
 */
function isTextToTextModel(model: Model): boolean {
  const id = model.id.toLowerCase();
  const name = model.name?.toLowerCase() || "";
  const description = model.description?.toLowerCase() || "";

  // Check output_modality field first (if available)
  if (model.output_modality) {
    const modality = model.output_modality.toLowerCase();
    if (modality === 'text') {
      return true;
    }
    // If explicitly set to non-text, exclude
    if (modality !== '' && modality !== 'text') {
      return false;
    }
  }

  // Check architecture.modality field
  // Values can be "text->text", "text", "image->text", etc.
  const architectureModality = model.architecture?.modality?.toLowerCase() || "";
  if (architectureModality) {
    // If modality contains "text" (like "text->text", "text", "image->text"), it's text-to-text
    if (architectureModality.includes('text')) {
      return true;
    }
    // If modality is explicitly set to non-text (like "image", "audio"), exclude
    if (architectureModality !== '') {
      return false;
    }
  }

  // Exclude known non-text models by ID patterns
  const excludePatterns = [
    'vision',
    'image',
    'audio',
    'tts',
    'whisper',
    'dall-e',
    'stable-diffusion',
    'midjourney',
    'imagen',
    'florence',
    'clip',
    'blip'
  ];

  // Check if model ID, name, or description contains exclude patterns
  const allText = `${id} ${name} ${description}`;
  if (excludePatterns.some(pattern => allText.includes(pattern))) {
    return false;
  }

  // By default, assume it's a text-to-text model
  // Most LLM models are text-to-text unless explicitly marked otherwise
  return true;
}

/**
 * Gets list of all models from OpenRouter API
 */
async function getAllModels(apiKey: string, verbose: boolean = false): Promise<Model[]> {
  try {
    const url = `${OPENROUTER_API_BASE}/models`;

    if (verbose) {
      console.error(`🔍 [VERBOSE] Request URL: ${url}`);
      console.error(`🔍 [VERBOSE] Authorization: Bearer ${apiKey.substring(0, 10)}...`);
    }

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://github.com/your-repo",
        "X-Title": "UDHR Token Counter"
      }
    });

    if (verbose) {
      console.error(`🔍 [VERBOSE] Response status: ${response.status} ${response.statusText}`);
    }

    if (!response.ok) {
      const errorText = await response.text();
      if (verbose) {
        console.error(`🔍 [VERBOSE] Error response body: ${errorText}`);
      }
      let errorMessage = response.statusText;
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error?.message || errorMessage;
      } catch {
        // Use default error message
      }
      throw new Error(`API error: ${response.status} ${errorMessage}`);
    }

    const responseText = await response.text();
    if (verbose) {
      console.error(`🔍 [VERBOSE] Response body (first 500 chars): ${responseText.substring(0, 500)}...`);
    }

    let data: ModelsResponse | Model[];
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      throw new Error(`Failed to parse JSON response: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
    }

    // Handle different possible response structures
    let modelsArray: Model[] = [];

    if (Array.isArray(data)) {
      // Response is directly an array
      modelsArray = data;
      if (verbose) {
        console.error(`🔍 [VERBOSE] Response is array with ${modelsArray.length} models`);
      }
    } else if (data && typeof data === 'object') {
      // Response is an object
      if (data.data && Array.isArray(data.data)) {
        // Response has data property with array
        modelsArray = data.data;
        if (verbose) {
          console.error(`🔍 [VERBOSE] Response has data property with ${modelsArray.length} models`);
        }
      } else if (data.models && Array.isArray(data.models)) {
        // Alternative structure with models property
        modelsArray = data.models as unknown as Model[];
        if (verbose) {
          console.error(`🔍 [VERBOSE] Response has models property with ${modelsArray.length} models`);
        }
      } else {
        if (verbose) {
          console.error(`🔍 [VERBOSE] Response structure:`, JSON.stringify(data, null, 2).substring(0, 1000));
        }
        throw new Error("Invalid response format from API: expected array or object with 'data' or 'models' property");
      }
    } else {
      if (verbose) {
        console.error(`🔍 [VERBOSE] Unexpected response type:`, typeof data);
      }
      throw new Error("Invalid response format from API: expected array or object");
    }

    if (verbose) {
      console.error(`🔍 [VERBOSE] Total models found: ${modelsArray.length}`);
    }

    // Debug: show first model structure
    if (verbose) {
      console.error(`🔍 [VERBOSE] Full response:`, JSON.stringify(modelsArray, null, 2));
    }

    // Sort by id
    modelsArray.sort((a, b) => a.id.localeCompare(b.id));

    return modelsArray;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ Error fetching models: ${errorMessage}`);
    throw error;
  }
}

/**
 * Shows list of all models
 */
async function showModelsList(apiKey: string, verbose: boolean = false) {
  try {
    if (verbose) {
      console.error(`🔍 [VERBOSE] Fetching models from: ${OPENROUTER_API_BASE}/models`);
    }

    const models = await getAllModels(apiKey, verbose);

    if (verbose) {
      console.error(`🔍 [VERBOSE] Found ${models.length} models`);
    }

    if (models.length === 0) {
      console.error("⚠️  No models found");
      return;
    }

    // Output to stdout (plain text, one model per line)
    // Format: id modularity
    models.forEach(model => {
      const modality = model.architecture?.modality || '';
      const output = `${modality} - ${model.id}`;
      console.log(output);
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
    const verbose = args.includes('--verbose') || args.includes('-v');
    await showModelsList(API_KEY, verbose);
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
