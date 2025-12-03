#!/usr/bin/env -S deno run --allow-read --allow-write

/**
 * Script to merge all result files from public/results into a single file,
 * preferring newer results for the same models
 */

const RESULTS_DIR = "./public/results";

interface FileResult {
  filename: string;
  characters: number;
  words: number;
  tokens: number;
  createdAt?: string;
}

interface ModelReport {
  modelId: string;
  modelInfo: unknown | null;
  results: FileResult[];
  stats: {
    totalFiles: number;
    successfulFiles: number;
    totalTokens: number;
    totalEstimatedCost: number;
    errors: string[];
  };
}

interface Report {
  createdAt: string;
  models: ModelReport[];
  summary: {
    totalModels: number;
    processedModels: number;
    modelsWithErrors: number;
    totalFiles: number;
    totalSuccessfulFiles: number;
    totalErrors: number;
    totalTokens: number;
    totalCost: number;
  };
}

/**
 * Compares two dates and returns true if date1 is newer than date2
 */
function isNewer(date1: string, date2: string): boolean {
  return new Date(date1) > new Date(date2);
}

async function main() {
  console.error("🔄 Merging result files...");

  try {
    // Read all result files (exclude reports.json)
    const files: string[] = [];
    for (const entry of Deno.readDirSync(RESULTS_DIR)) {
      if (entry.isFile && entry.name.endsWith('.json') && entry.name !== 'reports.json') {
        files.push(entry.name);
      }
    }

    console.error(`📁 Found ${files.length} result files`);

    if (files.length === 0) {
      console.error("⚠️  No result files found");
      Deno.exit(1);
    }

    // Map to store the latest report for each model
    const modelReportsMap = new Map<string, { report: ModelReport; createdAt: string; sourceFile: string }>();

    // Process each file
    for (const filename of files) {
      const filePath = `${RESULTS_DIR}/${filename}`;

      try {
        const content = await Deno.readTextFile(filePath);
        const report: Report = JSON.parse(content);

        if (!report.createdAt) {
          console.error(`⚠️  File ${filename} has no createdAt field, skipping`);
          continue;
        }

        // Process each model in the report
        for (const modelReport of report.models) {
          const modelId = modelReport.modelId;
          const existing = modelReportsMap.get(modelId);

          if (!existing || isNewer(report.createdAt, existing.createdAt)) {
            modelReportsMap.set(modelId, {
              report: modelReport,
              createdAt: report.createdAt,
              sourceFile: filename
            });
            console.error(`📊 ${modelId}: using result from ${filename} (${report.createdAt})`);
          } else {
            console.error(`⏭️  ${modelId}: skipping older result from ${filename} (${report.createdAt} < ${existing.createdAt})`);
          }
        }

      } catch (error) {
        console.error(`❌ Error processing ${filename}:`, error instanceof Error ? error.message : String(error));
      }
    }

    // Convert map to array of model reports
    const mergedModels: ModelReport[] = Array.from(modelReportsMap.values())
      .map(item => item.report)
      .sort((a, b) => a.modelId.localeCompare(b.modelId));

    // Calculate summary statistics
    const totalModels = mergedModels.length;
    const processedModels = mergedModels.filter(m => m.modelInfo !== null).length;
    const modelsWithErrors = mergedModels.filter(m => m.stats.errors.length > 0).length;
    const totalFiles = mergedModels.reduce((sum, m) => sum + m.stats.totalFiles, 0);
    const totalSuccessfulFiles = mergedModels.reduce((sum, m) => sum + m.stats.successfulFiles, 0);
    const totalErrors = mergedModels.reduce((sum, m) => sum + m.stats.errors.length, 0);
    const totalTokens = mergedModels.reduce((sum, m) => sum + m.stats.totalTokens, 0);
    const totalCost = mergedModels.reduce((sum, m) => sum + m.stats.totalEstimatedCost, 0);

    // Count unique languages (unique filenames across all models)
    const uniqueLanguages = new Set<string>();
    for (const modelReport of mergedModels) {
      for (const result of modelReport.results) {
        uniqueLanguages.add(result.filename);
      }
    }
    const langCount = uniqueLanguages.size;

    // Find the latest createdAt from all source files
    const latestCreatedAt = Array.from(modelReportsMap.values())
      .map(item => item.createdAt)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] || new Date().toISOString();

    // Create merged report
    const mergedReport: Report = {
      createdAt: latestCreatedAt,
      models: mergedModels,
      summary: {
        totalModels,
        processedModels,
        modelsWithErrors,
        totalFiles,
        totalSuccessfulFiles,
        totalErrors,
        totalTokens,
        totalCost
      }
    };

    // Generate filename following the same pattern as other result files
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').replace('T', '_').split('Z')[0];
    const outputFilename = `${timestamp}_${langCount}langs_${totalModels}models.json`;
    const outputFile = `${RESULTS_DIR}/${outputFilename}`;

    // Write merged report
    await Deno.writeTextFile(outputFile, JSON.stringify(mergedReport, null, 2));

    console.error("");
    console.error("==================================================");
    console.error("✅ Merge completed!");
    console.error(`📊 Total models: ${totalModels}`);
    console.error(`✅ Processed models: ${processedModels}`);
    console.error(`❌ Models with errors: ${modelsWithErrors}`);
    console.error(`📁 Total files: ${totalFiles}`);
    console.error(`✅ Successful files: ${totalSuccessfulFiles}`);
    console.error(`❌ Total errors: ${totalErrors}`);
    console.error(`🔢 Total tokens: ${totalTokens.toLocaleString()}`);
    console.error(`💰 Total cost: ${totalCost.toFixed(10)}`);
    console.error(`💾 Output file: ${outputFile}`);
    console.error("==================================================");

  } catch (error) {
    console.error(`❌ Error:`, error instanceof Error ? error.message : String(error));
    Deno.exit(1);
  }
}

if (import.meta.main) {
  await main();
}

