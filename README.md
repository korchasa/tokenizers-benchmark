# UDHR Token Counter

A Deno script for counting input tokens in Universal Declaration of Human Rights (UDHR) texts via OpenRouter API.

## Data Sources

UDHR texts in different languages are taken from the [uiuc-sst/udhr](https://github.com/uiuc-sst/udhr) repository - a multilingual corpus based on the Universal Declaration of Human Rights.

## Installation and Setup

1. Install Deno if not already installed: https://deno.land/

2. Get an API key from OpenRouter: https://openrouter.ai/

3. Set the environment variable:
   ```bash
   export OPENROUTER_API_KEY=your_api_key_here
   ```

## Usage

For convenience, a `run` script is created in the project root that automatically applies all necessary Deno flags.

### Basic usage

The script requires a results directory path where CSV and JSON files will be saved:

```bash
./run <results_dir>
# or
./bench.ts <results_dir>
```

### Specify a model

To use a specific model, use the `--model` option:

```bash
./run ./results --model anthropic/claude-3-haiku:beta
# or
./bench.ts ./results --model anthropic/claude-3-haiku:beta
```

### Use models from models.txt

If no model is specified, the script reads model IDs from `models.txt` file (one model per line):

```bash
# Create models.txt with model IDs, one per line:
# anthropic/claude-3-haiku:beta
# openai/gpt-4o-mini
# meta-llama/llama-3.1-8b-instruct

./run ./results
```

### View help
```bash
./run --help
# or
./bench.ts --help
```

### View list of available files
```bash
./run --list
# or
./bench.ts --list
```

### View list of available models
```bash
./run --models
# or
./bench.ts --models
```

### Detailed output with raw API requests and responses
```bash
./run ./results --model anthropic/claude-3-haiku:beta --verbose
# or
./bench.ts ./results --model anthropic/claude-3-haiku:beta --verbose
```

## Output Data

The script saves results to files in the specified results directory. For each model, two files are created:

1. **CSV file** (`<model-id>.csv`) - Contains token counting results for all UDHR texts
2. **JSON file** (`<model-id>.json`) - Contains full model parameters from the API response

### CSV Format

The CSV file contains the following columns:
```
filename,characters,words,tokens
eng_ks.txt,10638,1682,2847
rus_sd.txt,21000,2956,3156
...
```

Columns:
- `filename`: file name
- `characters`: number of characters in the text
- `words`: number of words (delimiters: spaces and punctuation)
- `tokens`: number of input tokens from OpenRouter API

### Model ID to Filename Conversion

Model IDs are converted to filename-safe strings by replacing special characters with `-`. For example:
- `anthropic/claude-3-haiku:beta` → `anthropic-claude-3-haiku-beta.csv`
- `openai/gpt-4o-mini` → `openai-gpt-4o-mini.csv`

### JSON Format

The JSON file contains the complete model information from the OpenRouter API, including:
- Model ID, name, description
- Context length
- Pricing information
- Architecture details
- And other model parameters

All log messages (processing status, statistics, errors) are output to stderr.

## Output Examples

### Example: Processing with a single model

```bash
./run ./results --model anthropic/claude-3-haiku:beta
```

**stderr (logs and statistics):**
```
🚀 Starting UDHR token counting via OpenRouter API
==================================================
📁 Results directory: ./results
📋 Using specified model: anthropic/claude-3-haiku:beta

🔄 Processing model: anthropic/claude-3-haiku:beta
==================================================
💾 Model info saved to: ./results/anthropic-claude-3-haiku-beta.json
📊 Files to process: 73

🔄 Processing: eng_ks.txt (10638 characters)
✅ eng_ks.txt: 1682 words, 2847 input tokens
🔄 Processing: rus_sd.txt (21000 characters)
✅ rus_sd.txt: 2956 words, 3156 input tokens
...

📈 RESULTS:
📁 Files processed: 73
✅ Successful: 73
❌ Errors: 0
🔢 Total input tokens: 185432
💰 Total estimated cost: 0.1234567890
💾 Results saved to: ./results/anthropic-claude-3-haiku-beta.csv
```

### Example: Processing multiple models from models.txt

If `models.txt` contains:
```
anthropic/claude-3-haiku:beta
openai/gpt-4o-mini
```

```bash
./run ./results
```

The script will process each model sequentially and create separate CSV and JSON files for each:
- `./results/anthropic-claude-3-haiku-beta.csv`
- `./results/anthropic-claude-3-haiku-beta.json`
- `./results/openai-gpt-4o-mini.csv`
- `./results/openai-gpt-4o-mini.json`

## Features

- **Flexible model selection**: Specify a model via `--model` option or use `models.txt` file for batch processing
- **Per-model results**: Each model's results are saved in separate CSV and JSON files
- **Model information**: Full model parameters from API are saved alongside results
- **Automatic 500ms delay** between requests to comply with API limits
- **Network and API error handling** with detailed error messages
- **Processes all UDHR texts** automatically from the `udhr/` directory
- **`--verbose` mode** for debugging with raw HTTP requests and API responses output
- **Word counting** by delimiters (spaces and punctuation marks)
- **Safe filename conversion**: Model IDs are automatically converted to filename-safe strings
- **Cost tracking**: Accumulates and displays total estimated cost from API responses

## Language Code Mapping

UDHR files use special codes to denote languages:

- `ace` - Achinese
- `afk` - Afrikaans
- `arz` - Arabic (Egyptian)
- `bal` - Baluchi
- `bra` - Braj
- `bug` - Buginese
- `bul` - Bulgarian
- `cat` - Catalan
- `chi` - Chinese
- `cze` - Czech
- `dns` - Dansk
- `dut` - Dutch
- `eng` - English
- `eo` - Esperanto
- `far` - Persian/Farsi
- `fil` - Filipino
- `fin` - Finnish
- `fri` - Frisian
- `frn` - French
- `ger` - German
- `grc` - Greek
- `heb` - Hebrew
- `hin` - Hindi
- `hun` - Hungarian
- `ind` - Indonesian
- `inz` - Indonesian
- `ita` - Italian
- `jav` - Javanese
- `javs` - Javanese (Suriname)
- `jpn` - Japanese
- `kkn` - Kachin
- `lat` - Latin
- `lav` - Latvian
- `lb` - Luxembourgish
- `ltn` - Latin
- `min` - Minangkabau
- `mli` - Malayalam
- `nno` - Norwegian (Nynorsk)
- `oc` - Occitan
- `pl` - Polish
- `plain` - Plain English
- `pmp` - Pampanga
- `por` - Portuguese
- `pql` - Pemon
- `rum` - Romanian
- `rus` - Russian
- `slo` - Slovenian
- `spa` - Spanish
- `spn` - Spanish
- `sun` - Sundanese
- `swe` - Swedish
- `tam` - Tamil
- `ukr` - Ukrainian
- `urd` - Urdu
- `wal` - Wolaitta
- `yid` - Yiddish
