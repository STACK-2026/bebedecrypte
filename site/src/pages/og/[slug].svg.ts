import type { APIRoute, GetStaticPaths } from "astro";
import { getProducts } from "../../lib/supabase";
import { GRADE_COLOURS } from "../../lib/scoring";

export const getStaticPaths: GetStaticPaths = async () => {
  const products = await getProducts();
  return products.map((p) => ({
    params: { slug: p.id },
    props: { product: p },
  }));
};

export const GET: APIRoute = async ({ props }) => {
  const p = (props as any).product;
  const gradeColor = GRADE_COLOURS[p.score as keyof typeof GRADE_COLOURS] || "#16a34a";
  const name = p.name.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
  const brand = p.brand.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#065f46"/>
      <stop offset="100%" stop-color="#16a34a"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <circle cx="180" cy="315" r="100" fill="${gradeColor}" opacity="0.95"/>
  <text x="180" y="295" font-family="system-ui,-apple-system,sans-serif" font-size="80" font-weight="900" fill="#ffffff" text-anchor="middle">${p.score}</text>
  <text x="180" y="345" font-family="system-ui,-apple-system,sans-serif" font-size="28" font-weight="800" fill="rgba(255,255,255,0.85)" text-anchor="middle">${p.scoreNumeric}/100</text>
  <text x="350" y="240" font-family="system-ui,-apple-system,sans-serif" font-size="24" font-weight="800" fill="#bbf7d0" letter-spacing="2" text-transform="uppercase">${brand}</text>
  <text x="350" y="310" font-family="system-ui,-apple-system,sans-serif" font-size="48" font-weight="900" fill="#ffffff">${name.length > 35 ? name.slice(0, 35) + "..." : name}</text>
  <text x="350" y="370" font-family="system-ui,-apple-system,sans-serif" font-size="22" font-weight="600" fill="#a7c0ae">${p.animal} · ${p.type} · PetFoodRate independent rating</text>
  <g transform="translate(350,420)" opacity="0.7">
    <circle cx="6" cy="5" r="3.5" fill="#ffffff"/>
    <circle cx="18" cy="2" r="3.5" fill="#ffffff"/>
    <circle cx="30" cy="5" r="3.5" fill="#ffffff"/>
    <ellipse cx="18" cy="16" rx="10" ry="7" fill="#ffffff"/>
  </g>
  <text x="395" y="432" font-family="system-ui,-apple-system,sans-serif" font-size="20" font-weight="700" fill="#ffffff">petfoodrate.com</text>
</svg>`;

  return new Response(svg, {
    headers: { "Content-Type": "image/svg+xml" },
  });
};
