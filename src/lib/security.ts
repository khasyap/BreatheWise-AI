const PROMPT_INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+instructions/i,
  /disregard\s+(the\s+)?system\s+prompt/i,
  /reveal\s+(your\s+)?(system\s+prompt|api\s*key|secret)/i,
  /act\s+as\s+a\s+doctor\s+and\s+prescribe/i,
  /you\s+are\s+now\s+(dan|jailbroken|unrestricted)/i,
  /override\s+safety\s+rules/i,
  /<script[\s>]/i,
];

export function detectPromptInjection(input: string): { flagged: boolean; reason?: string } {
  const cleaned = input.trim();
  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    if (pattern.test(cleaned)) {
      return {
        flagged: true,
        reason: 'Your message contains instructions that conflict with BreatheWise AI safety boundaries. Please ask an air quality, indoor health, or sustainable lifestyle question directly.',
      };
    }
  }
  return { flagged: false };
}

export function sanitizePlainText(input: string, maxLength = 1500): string {
  return input
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, maxLength);
}
