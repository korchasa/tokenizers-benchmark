# Tokenization Benchmarking

A script for benchmarking tokenization efficiency of different models.

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
./bench.ts ./results
```

The script will:
1. Create a new JSON file with timestamp name in `./results/` (e.g., `2025-12-02_10-43-01_53langs_1models.json`).
2. Update (or create) `./results/reports.json` which serves as an index for the viewer.

### Specify a model

To use a specific model, use the `--model` option:

```bash
./bench.ts ./results --model anthropic/claude-3-haiku:beta
```

### Use models from models.txt

If no model is specified, the script reads model IDs from `models.txt` file (one model per line):

```bash
# Create models.txt with model IDs, one per line:
# anthropic/claude-3-haiku:beta
# openai/gpt-4o-mini
# meta-llama/llama-3.1-8b-instruct

./bench.ts ./results
```

### Filter by language

To process only files for a specific language, use the `--language` option:

```bash
./bench.ts ./results --language russian
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
./bench.ts ./results --model anthropic/claude-3-haiku:beta --verbose
```

## Output Data

The script uses an accumulated data approach:

1. **Individual Run Files**: Each run creates a unique JSON file in the output directory (e.g., `results/2023-12-01_10-00-00_50langs_10models.json`). This file contains full details of the run.
2. **Index File**: `results/reports.json` is updated with a link to the new file.

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

## Features

- **Flexible model selection**: Specify a model via `--model` option or use `models.txt` file for batch processing
- **Unified Dashboard**: Accumulate results over time and view them in a consolidated HTML dashboard
- **Accumulated Results**: Automatically manages a history of runs in the output directory
- **Model information**: Full model parameters from API are saved in the report
- **Comprehensive summary**: Aggregated statistics across all processed models with total files, tokens, and cost
- **Detailed error reporting**: Collects and displays all errors with specific messages per model
- **Language filtering**: Process only specific language files with `--language` option
- **Automatic 500ms delay** between requests to comply with API limits
- **Network and API error handling** with detailed error messages
- **Processes all UDHR texts** automatically from the `udhr/` directory
- **`--verbose` mode** for debugging with raw HTTP requests and API responses output
- **Word counting** by delimiters (spaces and punctuation marks)
- **Cost tracking**: Accumulates and displays total estimated cost from API responses
