/**
 * OpenAI Vision → product title, description, and unit price for mass upload.
 * Uses the per-supplier OPENAI_API_KEY when provided.
 */

export type ProductCopyFromImage = {
  title: string;
  description: string;
  /** Suggested wholesale unit price (USD), or null if unknown. */
  unitPrice: number | null;
};

export type ResolveOpenAIApiKeyOptions = {
  /** When false, never read process.env.OPENAI_API_KEY. Default true. */
  allowEnvFallback?: boolean;
};

/**
 * Prefer an explicit supplier/API key. Env is only used when allowEnvFallback is true
 * and no supplier key was passed.
 */
export function resolveOpenAIApiKey(
  supplierKey?: string | null,
  opts?: ResolveOpenAIApiKeyOptions,
): string {
  const fromSupplier =
    typeof supplierKey === 'string' ? supplierKey.trim() : '';
  if (fromSupplier) return fromSupplier;
  if (opts?.allowEnvFallback === false) return '';
  return process.env.OPENAI_API_KEY?.trim() || '';
}

export function isOpenAIConfigured(
  supplierKey?: string | null,
  opts?: ResolveOpenAIApiKeyOptions,
): boolean {
  return resolveOpenAIApiKey(supplierKey, opts).length > 0;
}

function extractJsonObject(text: string): Record<string, unknown> | null {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1)) as Record<
          string,
          unknown
        >;
      } catch {
        return null;
      }
    }
    return null;
  }
}

function parseUnitPrice(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
    return Math.round(value * 100) / 100;
  }
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^0-9.]/g, '');
    if (!cleaned) return null;
    const n = Number(cleaned);
    if (Number.isFinite(n) && n >= 0) return Math.round(n * 100) / 100;
  }
  return null;
}

/**
 * Analyze a public image URL (blob CDN) and return catalog title, description, price.
 */
export async function suggestProductCopyFromImageUrl(
  imageUrl: string,
  fallbackTitle: string,
  options?: {
    apiKey?: string | null;
    /** Default false when apiKey is supplied; set true only for platform-wide fallback. */
    allowEnvFallback?: boolean;
  },
): Promise<ProductCopyFromImage> {
  const allowEnvFallback = options?.allowEnvFallback ?? false;
  const key = resolveOpenAIApiKey(options?.apiKey, { allowEnvFallback });
  if (!key) {
    return {
      title: fallbackTitle,
      description: '',
      unitPrice: null,
    };
  }

  const model =
    process.env.OPENAI_VISION_MODEL?.trim() || 'gpt-4o-mini';

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      max_tokens: 500,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You write B2B marketplace product listings. Return JSON only with keys "title" (short product name, max 80 chars, no quotes), "description" (2–4 sentences for wholesale buyers: materials, use, notable features), and "unitPrice" (number: estimated wholesale unit price in USD based on the product type visible in the image; use null if you cannot reasonably estimate). Be factual from the image; do not invent brand names or certifications you cannot see. unitPrice must be a plain number or null, not a string with currency symbols.',
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Suggest a product title, description, and wholesale unitPrice (USD) for this photo. Fallback title if unclear: ${fallbackTitle}`,
            },
            {
              type: 'image_url',
              image_url: { url: imageUrl, detail: 'low' },
            },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    console.error('OpenAI vision error:', res.status, errText.slice(0, 400));
    throw new Error(
      `OpenAI request failed (${res.status}). Check the supplier OPENAI_API_KEY and billing.`,
    );
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content ?? '';
  const parsed = extractJsonObject(content);
  const titleRaw =
    typeof parsed?.title === 'string' ? parsed.title.trim() : '';
  const descRaw =
    typeof parsed?.description === 'string' ? parsed.description.trim() : '';
  const unitPrice = parseUnitPrice(
    parsed?.unitPrice ?? parsed?.price ?? parsed?.unit_price,
  );

  return {
    title: titleRaw || fallbackTitle,
    description: descRaw,
    unitPrice,
  };
}
