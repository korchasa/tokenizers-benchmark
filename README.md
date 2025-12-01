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

### Count tokens for all files in the udhr/ folder
```bash
./run
# or
deno run --allow-read --allow-net --allow-env run.ts
```

### Count tokens for a specific file
```bash
./run eng_ks
# or
deno run --allow-read --allow-net --allow-env run.ts eng_ks
```

### View help
```bash
./run --help
# or
deno run --allow-read --allow-env run.ts --help
```

### View list of available files
```bash
./run --list
# or
deno run --allow-read --allow-env run.ts --list
```

### Detailed output with raw API requests and responses
```bash
./run --verbose eng_ks
# or
deno run --allow-read --allow-net --allow-env run.ts --verbose eng_ks
```

## Output Data

The script outputs data in CSV format to stdout:
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

All other messages (logs, statistics, errors) are output to stderr.

## Output Examples

**stdout (CSV data):**
```
filename,characters,words,tokens
eng_ks.txt,10638,1682,2847
rus_sd.txt,21000,2956,3156
...
```

**stderr (logs and statistics):**
```
🚀 Starting UDHR token counting via OpenRouter API
==================================================
📁 Processing all files in udhr/ directory
📊 Files found: 73

🔄 Processing: eng_ks.txt (10638 characters)
✅ eng_ks.txt: 1682 words, 2847 input tokens
🔄 Processing: rus_sd.txt (21000 characters)
✅ rus_sd.txt: 2956 words, 3156 input tokens
...

==================================================
📈 RESULTS:
📁 Files processed: 73
✅ Successful: 73
❌ Errors: 0
🔢 Total input tokens: 185432
```

## Features

- Uses `anthropic/claude-3-haiku:beta` model for minimal costs
- Automatic 500ms delay between requests to comply with limits
- Network and API error handling
- Support for processing all files or a specific file
- `--verbose` mode for debugging with raw HTTP requests and API responses output
- Results output in CSV format (stdout), all logs to stderr
- Word counting by delimiters (spaces and punctuation marks)

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
