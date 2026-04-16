# Tokenization Benchmarking

A script for benchmarking tokenization efficiency of different models.

## Methodology

To evaluate tokenization efficiency, the script uses the text of the **Universal Declaration of Human Rights (UDHR)** in various languages. This text was chosen as a standard, publicly available corpus translated into many languages.

The testing process is as follows:

1.  **Source Data**: Text files containing the declaration are located in the `udhr/` directory. Each file corresponds to a specific language (e.g., `braj.txt`, `english.txt`).
2.  **Token Counting**:
    *   The script sends the content of each file to the OpenRouter API.
    *   It uses the `chat/completions` endpoint with `max_tokens: 16` to minimize generation and retrieve usage statistics.
    *   The `usage.prompt_tokens` value is extracted from the API response, representing how many tokens the model's tokenizer used to encode the text.
3.  **Metrics**:
    *   **Token Count**: The primary metric. Fewer tokens for the same text indicate a more efficient tokenizer for that language (allowing more context and lower costs).
    *   **Cost**: Estimated cost based on the API response.
    *   **Stats**: Character and word counts are also recorded for comparison.

## Installation and Setup

1. Install Deno if not already installed: https://deno.land/

2. Get an API key from OpenRouter: https://openrouter.ai/

3. Set the environment variable:
   ```bash
   export OPENROUTER_API_KEY=your_api_key_here
   ```

## Usage

The script can be run directly with Deno. The shebang in `bench.ts` allows it to be executed directly.

### Basic usage

The script requires an output directory where results will be saved:

```bash
./bench.ts ./public/results
```

The script will:
1. Create a new JSON file with timestamp name in `./public/results/` (e.g., `2025-12-02_10-43-01_53langs_1models.json`).
2. Update (or create) `./public/results/reports.json` which serves as an index for the viewer.

### Specify a model

To use a specific model, use the `--model` option:

```bash
./bench.ts ./public/results --model anthropic/claude-3-haiku:beta
```

You can also specify multiple models separated by commas:

```bash
./bench.ts ./public/results --model anthropic/claude-3-haiku:beta,openai/gpt-4o-mini,meta-llama/llama-3.1-8b-instruct
```

### Use models from models.json

If no model is specified, the script reads model configs from `models.json`. Each entry must have an `id` and a `displayName` (used in reports and the viewer, typically formatted as `Provider (model-name)`):

```json
[
  { "id": "anthropic/claude-haiku-4.5", "displayName": "Anthropic (claude-haiku-4.5)" },
  { "id": "openai/gpt-4.1-nano",        "displayName": "OpenAI (gpt-4.1-nano)" },
  { "id": "meta-llama/llama-4-scout",   "displayName": "Meta (llama-4-scout)" }
]
```

```bash
./bench.ts ./public/results
```

### Filter by language

To process only files for a specific language, use the `--language` option:

```bash
./bench.ts ./public/results --language russian
```

### View help
```bash
./bench.ts --help
```

### View list of available files
```bash
./bench.ts --list
```

### View list of available languages
```bash
./bench.ts --languages
```

### View list of available models
```bash
./bench.ts --models
```

### Detailed output with raw API requests and responses
```bash
./bench.ts ./public/results --model anthropic/claude-3-haiku:beta --verbose
```

## Output Data

The script uses an accumulated data approach:

1. **Individual Run Files**: Each run creates a unique JSON file in the output directory (e.g., `public/results/2023-12-01_10-00-00_50langs_10models.json`). This file contains full details of the run.
2. **Index File**: `public/results/reports.json` is updated with a link to the new file.

### Viewing Results

Open `public/index.html` in your browser (via a local server) to view the dashboard. It automatically loads `reports.json` and fetches all linked result files, merging them into a single view.

1. Start a local server:
   ```bash
   # Using Python
   python3 -m http.server

   # Or using Deno
   deno run --allow-net --allow-read https://deno.land/std/http/file_server.ts
   ```
2. Open `http://localhost:8000/public/index.html`

