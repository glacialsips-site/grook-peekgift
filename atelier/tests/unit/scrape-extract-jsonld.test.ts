import { beforeEach, describe, expect, it, vi } from 'vitest';

const createMock = vi.fn();

vi.mock('@/lib/anthropic/client', () => ({
  anthropic: {
    messages: {
      create: createMock,
    },
  },
  assertAnthropicConfigured: vi.fn(),
  DEFAULT_MODEL: 'claude-opus-4-7',
  FAST_MODEL: 'claude-haiku-4-5',
}));

beforeEach(() => {
  createMock.mockReset();
});

const BEST_BUY_JSONLD = `
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Sony - WH-1000XM5 Wireless Noise-Canceling Over-the-Ear Headphones - Black",
  "image": [
    "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6505/6505727_sd.jpg"
  ],
  "description": "Industry-leading noise cancellation with two processors controlling eight microphones.",
  "sku": "6505727",
  "brand": { "@type": "Brand", "name": "Sony" },
  "offers": {
    "@type": "Offer",
    "url": "https://www.bestbuy.com/site/sony-wh-1000xm5/6505727.p",
    "price": "399.99",
    "priceCurrency": "USD",
    "availability": "https://schema.org/InStock"
  }
}
`.trim();

const bestBuyHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>Sony Headphones</title>
  <script type="application/ld+json">${BEST_BUY_JSONLD}</script>
</head>
<body><h1>Sony WH-1000XM5</h1></body>
</html>
`;

const TARGET_JSONLD = `
{
  "@context": "http://schema.org",
  "@type": "Product",
  "name": "Threshold 8 Cup Stoneware Mug",
  "image": "https://target.scene7.com/is/image/Target/GUEST_abc.jpg",
  "description": "Stoneware mug perfect for coffee and tea lovers.",
  "productID": "TGT-12345",
  "brand": "Threshold",
  "offers": {
    "@type": "Offer",
    "price": 12.99,
    "priceCurrency": "USD",
    "availability": "https://schema.org/InStock"
  }
}
`.trim();

const targetHtml = `
<!DOCTYPE html>
<html>
<head>
  <script type="application/ld+json">${TARGET_JSONLD}</script>
</head>
<body><h1>Mug</h1></body>
</html>
`;

const MACYS_GRAPH_JSONLD = `
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "BreadcrumbList",
      "itemListElement": []
    },
    {
      "@type": "Product",
      "name": "Coach Tabby Shoulder Bag 26",
      "image": ["https://slimages.macysassets.com/is/image/MCY/products/coach.jpg"],
      "description": "Refined silhouette in pebble leather.",
      "brand": { "@type": "Brand", "name": "Coach" },
      "offers": {
        "@type": "AggregateOffer",
        "lowPrice": "395.00",
        "highPrice": "495.00",
        "priceCurrency": "USD",
        "offers": [
          {
            "@type": "Offer",
            "price": "395.00",
            "priceCurrency": "USD",
            "availability": "https://schema.org/InStock"
          }
        ]
      }
    }
  ]
}
`.trim();

const macysHtml = `
<!DOCTYPE html>
<html>
<head>
  <script type="application/ld+json">${MACYS_GRAPH_JSONLD}</script>
</head>
<body><h1>Coach Bag</h1></body>
</html>
`;

const SEPHORA_ARRAY_JSONLD = `
[
  {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": "Fenty Beauty Pro Filt'r Soft Matte Foundation",
    "image": "https://www.sephora.com/productimages/sku/s1234567-main-Lhero.jpg",
    "description": "Long-wear, light-as-air, buildable matte foundation.",
    "brand": { "@type": "Organization", "name": "Fenty Beauty" },
    "offers": [
      {
        "@type": "Offer",
        "price": "40.00",
        "priceCurrency": "USD",
        "availability": "https://schema.org/InStock"
      }
    ]
  }
]
`.trim();

const sephoraHtml = `
<!DOCTYPE html>
<html>
<head>
  <script type="application/ld+json">${SEPHORA_ARRAY_JSONLD}</script>
</head>
<body><h1>Foundation</h1></body>
</html>
`;

describe('extractProduct JSON-LD preflight', () => {
  it('Best Buy: extracts Product from JSON-LD without calling Anthropic', async () => {
    const { extractProduct } = await import('@/lib/scrape/extract');
    const result = await extractProduct({
      html: bestBuyHtml,
      sourceUrl: 'https://www.bestbuy.com/site/sony-wh-1000xm5/6505727.p',
    });
    expect(result).not.toBeNull();
    expect(result?.title).toContain('Sony');
    expect(result?.title).toContain('WH-1000XM5');
    expect(result?.imageUrl).toBe(
      'https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6505/6505727_sd.jpg',
    );
    expect(result?.valueCents).toBe(39999);
    expect(result?.sourceRetailer).toBe('Sony');
    expect(result?.description).toContain('noise cancellation');
    expect(createMock).not.toHaveBeenCalled();
  });

  it('Target: extracts Product with numeric price and string brand', async () => {
    const { extractProduct } = await import('@/lib/scrape/extract');
    const result = await extractProduct({
      html: targetHtml,
      sourceUrl: 'https://www.target.com/p/stoneware-mug/-/A-12345',
    });
    expect(result).not.toBeNull();
    expect(result?.title).toBe('Threshold 8 Cup Stoneware Mug');
    expect(result?.valueCents).toBe(1299);
    expect(result?.sourceRetailer).toBe('Threshold');
    expect(result?.imageUrl).toBe(
      'https://target.scene7.com/is/image/Target/GUEST_abc.jpg',
    );
    expect(createMock).not.toHaveBeenCalled();
  });

  it('Macys: walks @graph and picks Product node + AggregateOffer lowPrice', async () => {
    const { extractProduct } = await import('@/lib/scrape/extract');
    const result = await extractProduct({
      html: macysHtml,
      sourceUrl: 'https://www.macys.com/shop/product/coach-tabby?ID=123',
    });
    expect(result).not.toBeNull();
    expect(result?.title).toBe('Coach Tabby Shoulder Bag 26');
    expect(result?.sourceRetailer).toBe('Coach');
    expect(result?.valueCents).toBe(39500);
    expect(createMock).not.toHaveBeenCalled();
  });

  it('Sephora: top-level JSON-LD array with offer array', async () => {
    const { extractProduct } = await import('@/lib/scrape/extract');
    const result = await extractProduct({
      html: sephoraHtml,
      sourceUrl: 'https://www.sephora.com/product/foundation-P12345',
    });
    expect(result).not.toBeNull();
    expect(result?.title).toContain('Fenty Beauty');
    expect(result?.valueCents).toBe(4000);
    expect(result?.sourceRetailer).toBe('Fenty Beauty');
    expect(createMock).not.toHaveBeenCalled();
  });

  it('falls through to Anthropic when no JSON-LD Product block is present', async () => {
    createMock.mockResolvedValueOnce({
      content: [{ type: 'text', text: JSON.stringify({ title: 'LLM Product' }) }],
      usage: { input_tokens: 100, output_tokens: 50 },
      stop_reason: 'end_turn',
      model: 'claude-haiku-4-5',
    });
    const { extractProduct } = await import('@/lib/scrape/extract');
    const result = await extractProduct({
      html: '<html><head><title>No JSON-LD</title></head><body><h1>Plain</h1></body></html>',
      sourceUrl: 'https://shop.example.com/plain',
    });
    expect(result?.title).toBe('LLM Product');
    expect(createMock).toHaveBeenCalledOnce();
  });

  it('falls through to Anthropic when JSON-LD has no @type: Product', async () => {
    const html = `
      <html><head>
        <script type="application/ld+json">{"@context":"https://schema.org","@type":"Organization","name":"Acme"}</script>
      </head><body></body></html>
    `;
    createMock.mockResolvedValueOnce({
      content: [{ type: 'text', text: JSON.stringify({ title: 'LLM Fallback' }) }],
      usage: { input_tokens: 100, output_tokens: 50 },
      stop_reason: 'end_turn',
      model: 'claude-haiku-4-5',
    });
    const { extractProduct } = await import('@/lib/scrape/extract');
    const result = await extractProduct({
      html,
      sourceUrl: 'https://shop.example.com/x',
    });
    expect(result?.title).toBe('LLM Fallback');
    expect(createMock).toHaveBeenCalledOnce();
  });

  it('falls through to Anthropic when JSON-LD JSON is malformed', async () => {
    const html = `
      <html><head>
        <script type="application/ld+json">{this is not valid json}</script>
      </head><body></body></html>
    `;
    createMock.mockResolvedValueOnce({
      content: [{ type: 'text', text: JSON.stringify({ title: 'LLM Recovery' }) }],
      usage: { input_tokens: 100, output_tokens: 50 },
      stop_reason: 'end_turn',
      model: 'claude-haiku-4-5',
    });
    const { extractProduct } = await import('@/lib/scrape/extract');
    const result = await extractProduct({
      html,
      sourceUrl: 'https://shop.example.com/y',
    });
    expect(result?.title).toBe('LLM Recovery');
    expect(createMock).toHaveBeenCalledOnce();
  });

  it('resolves relative image URL in JSON-LD against sourceUrl', async () => {
    const html = `
      <html><head>
        <script type="application/ld+json">{"@context":"https://schema.org","@type":"Product","name":"Relative Image","image":"/img/relative.jpg","offers":{"@type":"Offer","price":"9.99","priceCurrency":"USD"}}</script>
      </head><body></body></html>
    `;
    const { extractProduct } = await import('@/lib/scrape/extract');
    const result = await extractProduct({
      html,
      sourceUrl: 'https://shop.example.com/products/x',
    });
    expect(result?.imageUrl).toBe('https://shop.example.com/img/relative.jpg');
    expect(createMock).not.toHaveBeenCalled();
  });
});
