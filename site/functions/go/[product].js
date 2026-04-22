// Affiliate click redirect for /go/:product.
// Logs click to Supabase (affiliate_clicks table) then 302s to Awin deep link.
// robots.txt must Disallow /go/ to prevent crawler follow.
//
// When new Awin merchants are approved, extend getMerchantForProduct() to route
// based on product.country / product.animal / advertiser availability.

const AWIN_PUB_ID = "2859659";
const ZOOPLUS_FR_MID = "7334";
const SUPABASE_URL = "https://bhmmidfnovtkcxljjfpd.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJobW1pZGZub3Z0a2N4bGpqZnBkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5OTU3NzAsImV4cCI6MjA5MTU3MTc3MH0.COETkvMmQ69Lw153RJ1OW6EeY0LX7Zv1w54BtAipsYE";

function sanitizeProductId(raw) {
  if (!raw || typeof raw !== "string") return null;
  // slug pattern: a-z0-9 + hyphens, max 120
  const match = raw.toLowerCase().match(/^[a-z0-9][a-z0-9-]{0,119}$/);
  return match ? match[0] : null;
}

async function fetchProduct(productId) {
  try {
    const resp = await fetch(
      `${SUPABASE_URL}/rest/v1/products?id=eq.${encodeURIComponent(productId)}&select=brand,name,country,zooplus_url`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        cf: { cacheTtl: 300, cacheEverything: true },
      }
    );
    if (!resp.ok) return null;
    const rows = await resp.json();
    return rows.length ? rows[0] : null;
  } catch (e) {
    return null;
  }
}

function buildZooplusSearchUrl(brand, name) {
  const query = encodeURIComponent(`${brand} ${name}`.trim());
  return `https://www.zooplus.fr/shop/search_result?query=${query}`;
}

function buildAwinDeepLink(targetUrl, clickref) {
  return `https://www.awin1.com/awclick.php?mid=${ZOOPLUS_FR_MID}&id=${AWIN_PUB_ID}&clickref=${encodeURIComponent(clickref)}&p=${encodeURIComponent(targetUrl)}`;
}

async function logClick(ctx, payload) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/affiliate_clicks`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(payload),
    });
  } catch (e) {}
}

export async function onRequestGet(context) {
  const { request, params, waitUntil } = context;
  const productId = sanitizeProductId(params.product);

  if (!productId) {
    return new Response("Invalid product slug", { status: 400 });
  }

  const product = await fetchProduct(productId);

  // Prefer the direct Zooplus product URL (matched via sitemap, stored in DB).
  // Fallback 1: brand+name search URL. Fallback 2: Zooplus homepage.
  let targetUrl;
  let matchType;
  if (product && product.zooplus_url) {
    targetUrl = product.zooplus_url;
    matchType = "direct";
  } else if (product && product.brand && product.name) {
    targetUrl = buildZooplusSearchUrl(product.brand, product.name);
    matchType = "search";
  } else {
    targetUrl = "https://www.zooplus.fr/";
    matchType = "home";
  }

  const awinUrl = buildAwinDeepLink(targetUrl, productId);

  const logPayload = {
    product_id: productId,
    merchant: "zooplus_fr",
    awin_mid: ZOOPLUS_FR_MID,
    brand: product?.brand || null,
    country: request.cf?.country || null,
    referrer: request.headers.get("Referer") || null,
    user_agent: request.headers.get("User-Agent") || null,
    match_type: matchType,
  };

  waitUntil(logClick(context, logPayload));

  return Response.redirect(awinUrl, 302);
}
