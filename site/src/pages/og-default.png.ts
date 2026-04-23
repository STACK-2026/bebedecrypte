import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import fs from "node:fs";
import path from "node:path";
import type { APIRoute } from "astro";

const fontsDir = path.join(process.cwd(), "src", "assets", "fonts");
const INTER_600 = fs.readFileSync(path.join(fontsDir, "Inter-600.woff"));
const INTER_700 = fs.readFileSync(path.join(fontsDir, "Inter-700.woff"));
const INTER_800 = fs.readFileSync(path.join(fontsDir, "Inter-800.woff"));

const CYAN_FROM = "#0891b2";
const CYAN_TO = "#155e75";
const AMBER = "#f59e0b";
const CREAM = "#fefce8";

export const GET: APIRoute = async () => {
  const svg = await satori(
    {
      type: "div",
      props: {
        style: {
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          width: "1200px",
          height: "630px",
          backgroundImage: `linear-gradient(135deg, ${CYAN_FROM}, ${CYAN_TO})`,
          padding: "64px",
          fontFamily: "Inter",
          color: "white",
          textAlign: "center",
        },
        children: [
          {
            type: "svg",
            props: {
              width: 140,
              height: 140,
              viewBox: "0 0 72 72",
              children: [
                { type: "rect", props: { x: 22, y: 16, width: 24, height: 40, rx: 4, fill: "none", stroke: "white", strokeWidth: 3 } },
                { type: "rect", props: { x: 28, y: 8, width: 12, height: 8, rx: 3, fill: CREAM } },
                { type: "rect", props: { x: 25, y: 34, width: 18, height: 19, rx: 2, fill: CREAM, opacity: 0.85 } },
                { type: "circle", props: { cx: 52, cy: 50, r: 12, fill: "none", stroke: AMBER, strokeWidth: 4 } },
                { type: "line", props: { x1: 61, y1: 59, x2: 70, y2: 68, stroke: AMBER, strokeWidth: 4, strokeLinecap: "round" } },
              ],
            },
          },
          {
            type: "div",
            props: {
              style: {
                fontSize: 16,
                fontWeight: 700,
                letterSpacing: 4,
                textTransform: "uppercase",
                color: AMBER,
                marginTop: 32,
              },
              children: "Décodeur alimentation bébé",
            },
          },
          {
            type: "div",
            props: {
              style: { fontSize: 88, fontWeight: 800, letterSpacing: -2, marginTop: 12 },
              children: "BébéDécrypte",
            },
          },
          {
            type: "div",
            props: {
              style: {
                fontSize: 28,
                fontWeight: 600,
                maxWidth: "72%",
                marginTop: 24,
                color: "rgba(255,255,255,0.88)",
                lineHeight: 1.35,
              },
              children: "Petits pots, laits, céréales et gourdes bébé notés de A à E sur 8 axes , additifs, sucres cachés, ultra-transformation.",
            },
          },
          {
            type: "div",
            props: { style: { width: 160, height: 5, backgroundColor: AMBER, marginTop: 36 } },
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
