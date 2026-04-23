import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import fs from "node:fs";
import path from "node:path";
import { getCollection } from "astro:content";
import type { APIRoute } from "astro";

const fontsDir = path.join(process.cwd(), "src", "assets", "fonts");
const INTER_600 = fs.readFileSync(path.join(fontsDir, "Inter-600.woff"));
const INTER_700 = fs.readFileSync(path.join(fontsDir, "Inter-700.woff"));
const INTER_800 = fs.readFileSync(path.join(fontsDir, "Inter-800.woff"));

const CYAN_FROM = "#0891b2";
const CYAN_TO = "#155e75";
const AMBER = "#f59e0b";
const CREAM = "#fefce8";

export async function getStaticPaths() {
  const posts = await getCollection("blog", ({ data }) => !data.draft);
  return posts.map((post) => ({
    params: { slug: post.id },
    props: {
      title: post.data.title,
      category: post.data.category ?? "Guide",
      tags: (post.data.tags ?? []) as string[],
      author: post.data.author ?? "BébéDécrypte",
    },
  }));
}

export const GET: APIRoute = async ({ props }) => {
  const { title, category, tags, author } = props as {
    title: string;
    category: string;
    tags: string[];
    author: string;
  };
  const pills = [category, ...tags.filter((t) => t && t.length <= 16).slice(0, 2)];

  const svg = await satori(
    {
      type: "div",
      props: {
        style: {
          display: "flex",
          flexDirection: "column",
          width: "1200px",
          height: "630px",
          backgroundImage: `linear-gradient(135deg, ${CYAN_FROM}, ${CYAN_TO})`,
          padding: "64px",
          fontFamily: "Inter",
          color: "white",
          position: "relative",
        },
        children: [
          // Top row : logo mark + wordmark
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                width: "100%",
              },
              children: [
                {
                  type: "svg",
                  props: {
                    width: 88,
                    height: 88,
                    viewBox: "0 0 72 72",
                    children: [
                      // Bottle body
                      {
                        type: "rect",
                        props: { x: 22, y: 16, width: 24, height: 40, rx: 4, fill: "none", stroke: "white", strokeWidth: 3 },
                      },
                      // Bottle teat
                      {
                        type: "rect",
                        props: { x: 28, y: 8, width: 12, height: 8, rx: 3, fill: CREAM },
                      },
                      // Milk level
                      {
                        type: "rect",
                        props: { x: 25, y: 34, width: 18, height: 19, rx: 2, fill: CREAM, opacity: 0.85 },
                      },
                      // Magnifier lens
                      {
                        type: "circle",
                        props: { cx: 52, cy: 50, r: 12, fill: "none", stroke: AMBER, strokeWidth: 4 },
                      },
                      // Magnifier handle
                      {
                        type: "line",
                        props: { x1: 61, y1: 59, x2: 70, y2: 68, stroke: AMBER, strokeWidth: 4, strokeLinecap: "round" },
                      },
                    ],
                  },
                },
                {
                  type: "div",
                  props: {
                    style: { display: "flex", flexDirection: "column", alignItems: "flex-end" },
                    children: [
                      {
                        type: "div",
                        props: {
                          style: {
                            fontSize: 14,
                            fontWeight: 700,
                            letterSpacing: 3,
                            textTransform: "uppercase",
                            color: AMBER,
                          },
                          children: "Bébé",
                        },
                      },
                      {
                        type: "div",
                        props: {
                          style: { fontSize: 28, fontWeight: 800, marginTop: 2 },
                          children: "Décrypte",
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
          // Spacer
          { type: "div", props: { style: { flex: 1 } } },
          // Title
          {
            type: "div",
            props: {
              style: {
                fontSize: 58,
                fontWeight: 800,
                lineHeight: 1.1,
                letterSpacing: -1.4,
                maxWidth: "90%",
                textWrap: "balance",
              },
              children: title,
            },
          },
          // Pills (category + tags)
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                gap: 12,
                marginTop: 28,
                flexWrap: "wrap",
              },
              children: pills.map((label) => ({
                type: "div",
                props: {
                  style: {
                    padding: "8px 18px",
                    border: "1px solid rgba(255,255,255,0.45)",
                    backgroundColor: "rgba(255,255,255,0.14)",
                    fontSize: 14,
                    fontWeight: 700,
                    letterSpacing: 1,
                    textTransform: "uppercase",
                    borderRadius: 999,
                    color: "white",
                  },
                  children: String(label).replace(/-/g, " "),
                },
              })),
            },
          },
          // Accent bar
          {
            type: "div",
            props: {
              style: { width: 120, height: 4, backgroundColor: AMBER, marginTop: 22 },
            },
          },
          // Author credit
          {
            type: "div",
            props: {
              style: {
                fontSize: 18,
                fontWeight: 600,
                marginTop: 20,
                color: "rgba(255,255,255,0.85)",
              },
              children: `Par ${author} · bebedecrypte.com`,
            },
          },
        ],
      },
    },
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: "Inter", data: INTER_600, weight: 600, style: "normal" },
        { name: "Inter", data: INTER_700, weight: 700, style: "normal" },
        { name: "Inter", data: INTER_800, weight: 800, style: "normal" },
      ],
    }
  );

  const resvg = new Resvg(svg, { fitTo: { mode: "width", value: 1200 } });
  const png = resvg.render().asPng();

  return new Response(png, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
};
