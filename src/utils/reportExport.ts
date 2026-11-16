import type { AnalysisResult } from '../types/debugger';

export function downloadDebuggingReportMarkdown(result: AnalysisResult): void {
  const lines: string[] = [
    `# AI Debugger Report: ${result.fileName}`,
    '',
    `- **Language**: ${result.language.toUpperCase()}`,
    `- **Analyzed At**: ${new Date(result.analyzedAt).toLocaleString()}`,
    `- **Health Status**: ${result.summary.overallHealth}`,
    `- **Total Issues**: ${result.summary.totalErrors} (${result.summary.staticFindingsCount} Static Parser, ${result.summary.aiFindingsCount} AI Analysis)`,
    '',
    '## Detected Errors',
    '',
  ];

  if (result.errors.length === 0) {
    lines.push('No errors were detected in this source file.');
  } else {
    result.errors.forEach((err, i) => {
      lines.push(
        `### ${i + 1}. [${err.type}] Line ${err.line} (${err.source} · ${err.confidence}% confidence)`,
        `- **Message**: ${err.message}`,
        `- **Possible Cause**: ${err.possibleCause}`,
        `- **Beginner Explanation**: ${err.beginnerExplanation}`,
        `- **Suggested Correction**: ${err.suggestedCorrection}`,
        ''
      );
    });
  }

  lines.push('## Step-by-Step Fix Summary', '');
  result.fixSteps.forEach((step) => {
    lines.push(`${step.stepNumber}. **Line ${step.line} — ${step.title}**: ${step.description}`);
  });

  lines.push(
    '',
    '## Learning Tips',
    '',
    ...result.learningTips.map((tip) => `- ${tip}`),
    '',
    '## Original Source Code',
    '',
    '```' + result.language,
    result.originalCode,
    '```',
    '',
    '## Corrected Source Code',
    '',
    '```' + result.language,
    result.fixedCode,
    '```',
    ''
  );

  const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeBase = result.fileName.replace(/\.[^.]+$/, '');
  a.href = url;
  a.download = `${safeBase}-debug-report.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
