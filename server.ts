import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { runGeminiAnalysis } from './src/server/geminiAnalyzer.ts';
import {
  buildSummaryCategories,
  runStaticAnalysis,
} from './src/server/staticAnalyzer.ts';
import type {
  AnalysisResult,
  DetectedError,
  SupportedLanguage,
} from './src/types/debugger.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ALLOWED_LANGUAGES = new Set<SupportedLanguage>([
  'python',
  'c',
  'cpp',
  'java',
  'javascript',
]);

const MAX_CODE_BYTES = 100_000;

function sanitizeFileName(rawName: unknown, language: SupportedLanguage): string {
  const defaultNames: Record<SupportedLanguage, string> = {
    python: 'main.py',
    c: 'main.c',
    cpp: 'main.cpp',
    java: 'Main.java',
    javascript: 'index.js',
  };
  if (typeof rawName !== 'string' || !rawName.trim()) {
    return defaultNames[language];
  }
  const base = path.basename(rawName.trim()).replace(/[^a-zA-Z0-9._-]/g, '_');
  return base.slice(0, 80) || defaultNames[language];
}

function mergeDiagnostics(
  staticErrors: DetectedError[],
  aiErrors: DetectedError[]
): DetectedError[] {
  const merged: DetectedError[] = [...staticErrors];

  for (const aiErr of aiErrors) {
    // Keep AI errors unless they duplicate the exact same line & category with near-identical message
    const duplicate = merged.some(
      (s) =>
        s.line === aiErr.line &&
        s.type === aiErr.type &&
        s.message.toLowerCase().slice(0, 28) ===
          aiErr.message.toLowerCase().slice(0, 28)
    );
    if (!duplicate) {
      merged.push(aiErr);
    }
  }

  return merged.sort((a, b) => a.line - b.line || b.confidence - a.confidence);
}

async function startServer() {
  const app = express();
  const port = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '256kb' }));

  // Basic privacy & security headers
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  app.get('/api/health', (_req, res) => {
    const key = process.env.GEMINI_API_KEY?.trim();
    const aiConfigured = Boolean(key && key !== 'MY_GEMINI_API_KEY');
    res.json({ ok: true, aiConfigured });
  });

  app.post('/api/analyze', async (req, res) => {
    const startedAt = Date.now();
    try {
      const { code, language, fileName } = req.body ?? {};

      if (typeof language !== 'string' || !ALLOWED_LANGUAGES.has(language as SupportedLanguage)) {
        res.status(400).json({
          error: 'Unsupported programming language. Supported: python, c, cpp, java, javascript.',
        });
        return;
      }

      if (typeof code !== 'string') {
        res.status(400).json({ error: 'Source code must be provided as text.' });
        return;
      }

      // Strip null bytes for safety; never execute user code
      const sanitizedCode = code.replace(/\0/g, '');
      if (!sanitizedCode.trim()) {
        res.status(400).json({ error: 'Please enter or upload source code before analyzing.' });
        return;
      }

      if (Buffer.byteLength(sanitizedCode, 'utf8') > MAX_CODE_BYTES) {
        res.status(413).json({
          error: 'Source code exceeds the 100 KB inspection limit.',
        });
        return;
      }

      const lang = language as SupportedLanguage;
      const safeFileName = sanitizeFileName(fileName, lang);

      // Step 1: Deterministic Static Parser (AST + lexical/semantic rules, zero code execution)
      const staticResult = runStaticAnalysis(sanitizedCode, lang);

      // Step 2: Secure Server-Side Gemini AI Analysis (with graceful static fallback)
      const aiResult = await runGeminiAnalysis(sanitizedCode, lang, staticResult);

      const allErrors = mergeDiagnostics(staticResult.errors, aiResult.aiErrors);
      const staticFindingsCount = allErrors.filter((e) => e.source === 'Static Parser').length;
      const aiFindingsCount = allErrors.filter((e) => e.source === 'AI Analysis').length;
      const hasCritical = allErrors.some((e) => e.severity === 'critical');

      const result: AnalysisResult = {
        id: `dbg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        language: lang,
        fileName: safeFileName,
        originalCode: sanitizedCode,
        fixedCode: aiResult.fixedCode || sanitizedCode,
        errors: allErrors,
        fixSteps: aiResult.fixSteps,
        learningTips: aiResult.learningTips,
        summary: {
          totalErrors: allErrors.length,
          staticFindingsCount,
          aiFindingsCount,
          byCategory: buildSummaryCategories(allErrors),
          overallHealth:
            allErrors.length === 0
              ? 'Clean'
              : hasCritical
                ? 'Critical Issues'
                : 'Needs Review',
          analysisTimeMs: Math.max(1, Date.now() - startedAt),
        },
        aiConfigured: aiResult.aiConfigured,
        aiNotice: aiResult.aiNotice,
        analyzedAt: new Date().toISOString(),
      };

      res.json(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unexpected analysis error.';
      res.status(500).json({ error: `Analysis failed: ${msg}` });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      const indexFile = path.join(distPath, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build output not found.');
      }
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`AI Debugger server listening on http://localhost:${port}`);
  });
}

startServer();
