#!/usr/bin/env -S deno run --allow-write --allow-read --allow-net --allow-env

/**
 * Script for counting tokens in UDHR texts via OpenRouter API
 */

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_API_BASE = "https://openrouter.ai/api/v1";

// API key will be retrieved in main() function when needed

interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost?: number;
  estimated_cost?: number; // Keep for backward compatibility
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

interface TokenCountResult {
  tokens: number;
  estimatedCost: number;
}

interface ModelProcessingStats {
  modelId: string;
  totalFiles: number;
  successfulFiles: number;
  errors: string[];
  totalTokens: number;
  totalEstimatedCost: number;
  skipped: boolean;
  hasErrors: boolean;
}

/**
 * Sends text to OpenRouter API and returns the number of input tokens and estimated cost
 */
async function countTokens(text: string, filename: string, modelId: string, apiKey: string, verbose: boolean = false): Promise<TokenCountResult | null> {
  const requestBody = {
    model: modelId,
    messages: [
      {
        role: "user",
        content: text
      }
    ],
    max_tokens: 16, // Minimal response, we only need tokens
    temperature: 0,
    usage: {
      include: true
    }
  };

  const requestPayload = JSON.stringify(requestBody, null, 2);

  try {

    if (verbose) {
      console.error(`🔍 [VERBOSE] Request to OpenRouter API for ${filename}:`);
      console.error(`🔍 [VERBOSE] URL: ${OPENROUTER_API_URL}`);
      console.error(`🔍 [VERBOSE] Headers:`);
      console.error(`🔍 [VERBOSE]   Authorization: Bearer ${apiKey.substring(0, 10)}...`);
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
        "Authorization": `Bearer ${apiKey}`,
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
      // Always output raw request and response on error
      console.error(`❌ API error for ${filename}:`);
      console.error(`Request URL: ${OPENROUTER_API_URL}`);
      console.error(`Request Body:`);
      console.error(requestPayload);
      console.error(`Response Status: ${response.status} ${response.statusText}`);
      console.error(`Response Body:`);
      console.error(errorData);
      let parsedError;
      try {
        parsedError = JSON.parse(errorData);
      } catch {
        parsedError = { error: { message: errorData } };
      }
      const errorMessage = parsedError.error?.message || response.statusText;
      console.error(`Error message: ${errorMessage}`);
      return null;
    }

    const responseText = await response.text();
    if (verbose) {
      console.error(`🔍 [VERBOSE] Response Body:`);
      console.error(responseText.trim());
      console.error(`🔍 [VERBOSE] ---`);
    }

    let data: OpenRouterResponse;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      // Always output raw request and response on parse error
      console.error(`❌ JSON parse error for ${filename}:`);
      console.error(`Request URL: ${OPENROUTER_API_URL}`);
      console.error(`Request Body:`);
      console.error(requestPayload);
      console.error(`Response Status: ${response.status} ${response.statusText}`);
      console.error(`Response Body:`);
      console.error(responseText);
      console.error(`Parse error: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
      return null;
    }

    if (data.usage?.prompt_tokens) {
      return {
        tokens: data.usage.prompt_tokens,
        estimatedCost: data.usage.cost || data.usage.estimated_cost || 0
      };
    } else {
      // Always output raw request and response when no token usage data
      console.error(`❌ No token usage data for ${filename}:`);
      console.error(`Request URL: ${OPENROUTER_API_URL}`);
      console.error(`Request Body:`);
      console.error(requestPayload);
      console.error(`Response Status: ${response.status} ${response.statusText}`);
      console.error(`Response Body:`);
      console.error(responseText);
      return null;
    }
  } catch (error) {
    // Always output raw request on network error
    console.error(`❌ Network error for ${filename}:`);
    console.error(`Request URL: ${OPENROUTER_API_URL}`);
    console.error(`Request Body:`);
    console.error(requestPayload);
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
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
 * Gets the list of files to process from UDHR directory
 * @param languageFilter Optional language name to filter files (e.g., "russian", "english")
 */
function getFilesToProcess(languageFilter?: string): string[] {
  const udhrDir = "./udhr";

  try {
    const files: string[] = [];
    for (const entry of Deno.readDirSync(udhrDir)) {
      if (entry.isFile && entry.name.endsWith('.txt') && entry.name !== 'models.txt') {
        // If language filter is specified, check if file matches
        if (languageFilter) {
          // Remove .txt extension and check if it matches the language filter
          const fileLang = entry.name.replace(/\.txt$/, '');
          if (fileLang !== languageFilter) {
            continue;
          }
        }
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
 * Reads model IDs from models.txt file
 */
function readModelsFromFile(): string[] {
  const modelsFile = "./models.txt";
  try {
    const content = Deno.readTextFileSync(modelsFile);
    const models = content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.startsWith('#'));
    return models;
  } catch (error) {
    console.error(`❌ Error reading ${modelsFile}:`, error.message);
    console.error("💡 Create models.txt file with one model ID per line");
    Deno.exit(1);
  }
}

/**
 * Converts model ID to filename-safe string (replaces special characters with -)
 */
function modelIdToFilename(modelId: string): string {
  return modelId.replace(/[^a-zA-Z0-9._-]/g, '-');
}

/**
 * Gets model information by ID from the list of all models
 */
async function getModelInfo(modelId: string, apiKey: string, verbose: boolean = false): Promise<Model | null> {
  try {
    const allModels = await getAllModels(apiKey, verbose);
    const model = allModels.find(m => m.id === modelId);
    return model || null;
  } catch (error) {
    console.error(`❌ Error fetching model info for ${modelId}:`, error instanceof Error ? error.message : String(error));
    return null;
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
🚀 Token Benchmarking - tokenizing benchmarking

USAGE:
  ./bench.ts [options] <results_dir> [--model <model_id>]

OPTIONS:
  --help, -h       Show this help
  --models         Show list of all available models
  --model <id>     Model ID to use (if not specified, reads from models.txt)
  --languages      Show list of available languages
  --language <lang> Filter files by language name (e.g., "russian", "english")
  --override       Overwrite existing result files
  --verbose, -v    Output raw API requests and responses

PARAMETERS:
  results_dir      Path to directory where results will be saved

EXAMPLES:
  ./bench.ts ./results
  ./bench.ts ./results --model anthropic/claude-3-haiku:beta
  ./bench.ts ./results --language russian
  ./bench.ts ./results --verbose
  ./bench.ts --languages
  ./bench.ts --models

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
    const files: string[] = [];
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
 * Shows list of available languages
 */
function showLanguagesList() {
  console.error("🌐 Available languages:");
  console.error("");

  try {
    const languages: string[] = [];
    for (const entry of Deno.readDirSync("./udhr")) {
      if (entry.isFile && entry.name.endsWith('.txt') && entry.name !== 'models.txt') {
        const langName = entry.name.replace(/\.txt$/, '');
        languages.push(langName);
      }
    }

    languages.sort().forEach(lang => {
      console.log(lang);
    });
  } catch (error) {
    console.error("❌ Error reading udhr/ directory:", error.message);
    Deno.exit(1);
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

    // Filter models by modality: only text->text and text+image->text
    const allowedModalities = ['text->text', 'text+image->text'];
    const filteredModels = models.filter(model => {
      const modality = model.architecture?.modality || '';
      return allowedModalities.includes(modality);
    });

    if (verbose) {
      console.error(`🔍 [VERBOSE] Filtered to ${filteredModels.length} models with allowed modalities`);
    }

    if (filteredModels.length === 0) {
      console.error("⚠️  No models found with allowed modalities (text->text, text+image->text)");
      return;
    }

    // Prepare data for table
    const tableData = filteredModels.map(model => {
      const promptPrice = model.pricing?.prompt ? (parseFloat(model.pricing.prompt) * 1000000).toFixed(2) : 'N/A';
      let daysSinceCreation = 'N/A';
      if (model.created) {
        const createdDate = new Date(model.created * 1000);
        const now = new Date();
        const diffTime = now.getTime() - createdDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        daysSinceCreation = diffDays.toString();
      }
      return {
        id: model.id,
        promptPrice: promptPrice,
        daysOld: daysSinceCreation
      };
    });

    // Calculate column widths
    const idWidth = Math.max(
      'Model ID'.length,
      ...tableData.map(row => row.id.length)
    );
    const priceWidth = Math.max(
      'Price ($/1M)'.length,
      ...tableData.map(row => row.promptPrice.length)
    );
    const daysWidth = Math.max(
      'Days Old'.length,
      ...tableData.map(row => row.daysOld.length)
    );

    // Print table header
    const header = `| ${'Model ID'.padEnd(idWidth)} | ${'Price ($/1M)'.padStart(priceWidth)} | ${'Days Old'.padStart(daysWidth)} |`;
    const separator = `|${'-'.repeat(idWidth + 2)}|${'-'.repeat(priceWidth + 2)}|${'-'.repeat(daysWidth + 2)}|`;
    console.log(header);
    console.log(separator);

    // Print table rows
    tableData.forEach(row => {
      const daysText = row.daysOld === 'N/A' ? 'N/A' : `${row.daysOld}`;
      const output = `| ${row.id.padEnd(idWidth)} | ${row.promptPrice.padStart(priceWidth)} | ${daysText.padStart(daysWidth)} |`;
      console.log(output);
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ Failed to get models list: ${errorMessage}`);
    Deno.exit(1);
  }
}

/**
 * Processes files for a single model and saves results
 */
async function processModel(
  modelId: string,
  resultsDir: string,
  apiKey: string,
  verbose: boolean,
  languageFilter?: string,
  override: boolean = false
): Promise<ModelProcessingStats> {
  console.error("\n==================================================");
  console.error(`🔄 Processing model: ${modelId}`);

  // Create filename for this model
  const modelFilename = modelIdToFilename(modelId);
  const csvPath = `${resultsDir}/${modelFilename}.csv`;
  const jsonPath = `${resultsDir}/${modelFilename}.json`;

  // Check if results already exist
  if (!override) {
    try {
      const csvExists = await Deno.stat(csvPath).then(() => true).catch(() => false);
      const jsonExists = await Deno.stat(jsonPath).then(() => true).catch(() => false);

      if (csvExists || jsonExists) {
        console.error(`⏭️  Skipping ${modelId} - results already exist`);
        if (csvExists) {
          console.error(`   CSV file exists: ${csvPath}`);
        }
        if (jsonExists) {
          console.error(`   JSON file exists: ${jsonPath}`);
        }
        console.error(`   Use --override to force re-processing`);
        return {
          modelId,
          totalFiles: 0,
          successfulFiles: 0,
          errors: [],
          totalTokens: 0,
          totalEstimatedCost: 0,
          skipped: true,
          hasErrors: false
        };
      }
    } catch (error) {
      // If stat fails for other reasons, continue processing
      if (verbose) {
        console.error(`🔍 [VERBOSE] Error checking file existence:`, error instanceof Error ? error.message : String(error));
      }
    }
  }

  // Get model information
  const modelInfo = await getModelInfo(modelId, apiKey, verbose);
  if (!modelInfo) {
    console.error(`❌ Model ${modelId} not found in API`);
    return {
      modelId,
      totalFiles: 0,
      successfulFiles: 0,
      errors: [`Model ${modelId} not found in API`],
      totalTokens: 0,
      totalEstimatedCost: 0,
      skipped: false,
      hasErrors: true
    };
  }

  // Get all files to process
  const files = getFilesToProcess(languageFilter);
  if (languageFilter) {
    console.error(`🌐 Language filter: ${languageFilter}`);
  }
  console.error(`📊 Files to process: ${files.length}`);

  // Prepare CSV content
  const csvLines: string[] = ["filename,characters,words,tokens,model_id"];

  let totalFiles = 0;
  let successfulFiles = 0;
  let totalTokens = 0;
  let totalEstimatedCost = 0;
  const errors: string[] = [];

  for (const filePath of files) {
    const filename = filePath.split('/').pop() || filePath;
    const content = readFileContent(filePath);

    if (!content) {
      const errorMsg = `Failed to read file: ${filename}`;
      console.error(`⚠️  Skipping ${filename} - read error`);
      errors.push(errorMsg);
      continue;
    }

    console.error(`🔄 Processing: ${filename} (${content.length} characters)`);

    const result = await countTokens(content, filename, modelId, apiKey, verbose);

    if (result !== null) {
      const wordCount = countWords(content);
      csvLines.push(`${filename},${content.length},${wordCount},${result.tokens},${modelId}`);
      console.error(`✅ ${filename}: ${wordCount} words, ${result.tokens} input tokens`);
      successfulFiles++;
      totalTokens += result.tokens;
      totalEstimatedCost += result.estimatedCost;
    } else {
      const errorMsg = `Token counting failed for file: ${filename}`;
      console.error(`❌ ${filename}: token counting error`);
      errors.push(errorMsg);
    }

    totalFiles++;

    // Small delay between requests to not exceed limits
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Don't save files if there were errors
  if (errors.length > 0) {
    console.error(`❌ Errors occurred during processing. Files not saved.`);
    return {
      modelId,
      totalFiles,
      successfulFiles,
      errors,
      totalTokens,
      totalEstimatedCost,
      skipped: false,
      hasErrors: true
    };
  }

  // Save model info to JSON file
  try {
    await Deno.writeTextFile(jsonPath, JSON.stringify(modelInfo, null, 2));
    console.error(`💾 Model info saved to: ${jsonPath}`);
  } catch (error) {
    const errorMsg = `Failed to save model info: ${error instanceof Error ? error.message : String(error)}`;
    console.error(`❌ Error saving model info:`, error instanceof Error ? error.message : String(error));
    errors.push(errorMsg);
    return {
      modelId,
      totalFiles,
      successfulFiles,
      errors,
      totalTokens,
      totalEstimatedCost,
      skipped: false,
      hasErrors: true
    };
  }

  // Save CSV file
  try {
    await Deno.writeTextFile(csvPath, csvLines.join('\n') + '\n');
    console.error(`💾 Results saved to: ${csvPath}`);
  } catch (error) {
    const errorMsg = `Failed to save CSV: ${error instanceof Error ? error.message : String(error)}`;
    console.error(`❌ Error saving CSV:`, error instanceof Error ? error.message : String(error));
    errors.push(errorMsg);
    return {
      modelId,
      totalFiles,
      successfulFiles,
      errors,
      totalTokens,
      totalEstimatedCost,
      skipped: false,
      hasErrors: true
    };
  }

  console.error("");
  console.error("📈 RESULTS:");
  console.error(`📁 Files processed: ${totalFiles}`);
  console.error(`✅ Successful: ${successfulFiles}`);
  if (errors.length > 0) {
    console.error(`❌ Errors: ${errors.length}`);
  }
  console.error(`🔢 Total input tokens: ${totalTokens}`);
  console.error(`💰 Total estimated cost: ${totalEstimatedCost.toFixed(10)}`);

  return {
    modelId,
    totalFiles,
    successfulFiles,
    errors,
    totalTokens,
    totalEstimatedCost,
    skipped: false,
    hasErrors: errors.length > 0
  };
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

  if (args.includes('--languages')) {
    showLanguagesList();
    return;
  }

  // Get API key (required for --models and token counting)
  const API_KEY = Deno.env.get("OPENROUTER_API_KEY");
  if (!API_KEY) {
    console.error("❌ OPENROUTER_API_KEY not found in environment variables");
    console.error("Set the variable: export OPENROUTER_API_KEY=your_key_here");
    console.error("Run './bench.ts --help' for help");
    Deno.exit(1);
  }

  if (args.includes('--models')) {
    const verbose = args.includes('--verbose') || args.includes('-v');
    await showModelsList(API_KEY, verbose);
    return;
  }

  const verbose = args.includes('--verbose') || args.includes('-v');

  // Parse arguments
  const modelIndex = args.indexOf('--model');
  const specifiedModelId = modelIndex !== -1 && modelIndex + 1 < args.length
    ? args[modelIndex + 1]
    : null;

  const languageIndex = args.indexOf('--language');
  const languageFilter = languageIndex !== -1 && languageIndex + 1 < args.length
    ? args[languageIndex + 1]
    : undefined;

  const override = args.includes('--override');

  // Get results directory (first non-option argument, excluding --model and --language values)
  const excludedArgs = new Set(['--model', '--language', specifiedModelId, languageFilter].filter(Boolean));
  const resultsDir = args.find(arg => !arg.startsWith('--') && !excludedArgs.has(arg));

  if (!resultsDir) {
    console.error("❌ Results directory not specified");
    showHelp();
    Deno.exit(1);
  }

  // Ensure results directory exists
  try {
    await Deno.mkdir(resultsDir, { recursive: true });
  } catch (error) {
    console.error(`❌ Error creating results directory:`, error instanceof Error ? error.message : String(error));
    Deno.exit(1);
  }

  console.error("🚀 Starting token benchmarking via OpenRouter API");
  console.error("==================================================");
  console.error(`📁 Results directory: ${resultsDir}`);

  // Get list of models to process
  const modelIds: string[] = [];
  if (specifiedModelId) {
    modelIds.push(specifiedModelId);
    console.error(`📋 Using specified model: ${specifiedModelId}`);
  } else {
    const modelsFromFile = readModelsFromFile();
    modelIds.push(...modelsFromFile);
    console.error(`📋 Using models from models.txt: ${modelIds.length} model(s)`);
  }

  if (modelIds.length === 0) {
    console.error("❌ No models specified");
    console.error("💡 Use --model <id> or create models.txt file");
    Deno.exit(1);
  }

  // Process each model and collect statistics
  const allStats: ModelProcessingStats[] = [];
  for (const modelId of modelIds) {
    const stats = await processModel(modelId, resultsDir, API_KEY, verbose, languageFilter, override);
    allStats.push(stats);
  }

  // Calculate totals
  const totalModels = allStats.length;
  const processedModels = allStats.filter(s => !s.skipped).length;
  const skippedModels = allStats.filter(s => s.skipped).length;
  const modelsWithErrors = allStats.filter(s => s.hasErrors && !s.skipped).length;
  const totalFiles = allStats.reduce((sum, s) => sum + s.totalFiles, 0);
  const totalSuccessfulFiles = allStats.reduce((sum, s) => sum + s.successfulFiles, 0);
  const totalErrors = allStats.reduce((sum, s) => sum + s.errors.length, 0);
  const totalTokens = allStats.reduce((sum, s) => sum + s.totalTokens, 0);
  const totalCost = allStats.reduce((sum, s) => sum + s.totalEstimatedCost, 0);

  // Collect all errors
  const allErrors: Array<{ modelId: string; errors: string[] }> = [];
  for (const stats of allStats) {
    if (stats.errors.length > 0) {
      allErrors.push({ modelId: stats.modelId, errors: stats.errors });
    }
  }

  // Print summary
  console.error("");
  console.error("==================================================");
  console.error("📊 SUMMARY");
  console.error("==================================================");
  console.error(`🤖 Models processed: ${processedModels} of ${totalModels}`);
  if (skippedModels > 0) {
    console.error(`⏭️  Models skipped: ${skippedModels}`);
  }
  if (modelsWithErrors > 0) {
    console.error(`❌ Models with errors: ${modelsWithErrors}`);
  }
  console.error(`📁 Total files processed: ${totalFiles}`);
  console.error(`✅ Successfully processed: ${totalSuccessfulFiles}`);
  if (totalErrors > 0) {
    console.error(`❌ Total errors: ${totalErrors}`);
  }
  console.error(`🔢 Total tokens: ${totalTokens.toLocaleString()}`);
  console.error(`💰 Total cost: ${totalCost.toFixed(10)}`);

  // Print detailed errors
  if (allErrors.length > 0) {
    console.error("");
    console.error("==================================================");
    console.error("⚠️  ERRORS DETAILS");
    console.error("==================================================");
    for (const { modelId, errors } of allErrors) {
      console.error(`\n❌ ${modelId} (${errors.length} error(s)):`);
      for (const error of errors) {
        console.error(`   - ${error}`);
      }
    }
  }

  console.error("");
  console.error("==================================================");
  console.error("✅ All models processed!");
}

if (import.meta.main) {
  await main();
}
