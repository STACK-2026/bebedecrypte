import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const blog = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/blog" }),
  schema: z.object({
    title: z.string(),
    description: z.string().max(160),
    date: z.coerce.date(),
    author: z.string().optional(),
    category: z.string().optional(),
    tags: z.array(z.string()).default([]),
    image: z.string().optional(),
    imageAlt: z.string().optional(),
    draft: z.boolean().default(false),
    keywords: z.string().optional(),
    lang: z.enum(["en", "fr"]).default("en"),
    lastReviewed: z.coerce.date().optional(),
    reviewedBy: z.string().optional(),
    // Optional structured data enrichment , emit HowTo + FAQPage JSON-LD when provided
    howTo: z
      .object({
        name: z.string(),
        description: z.string().optional(),
        totalTime: z.string().optional(),
        steps: z
          .array(
            z.object({
              name: z.string(),
              text: z.string(),
            })
          )
          .min(2),
      })
      .optional(),
    faq: z
      .array(
        z.object({
          question: z.string(),
          answer: z.string(),
        })
      )
      .optional(),
    // Emit MedicalWebPage JSON-LD when the article covers infant or paediatric
    // health topics (allergens, diversification, formula, botulism, etc.).
    medical: z.boolean().default(false),
  }),
});

const pages = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/pages" }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    lastUpdated: z.coerce.date().optional(),
  }),
});

// ---------------------------------------------------------------------------
// Catalog , products, brands, categories. Schema matches the frontmatter
// emitted by scripts/build_astro_pages.py.
// ---------------------------------------------------------------------------
const productGrade = z.enum(["A", "B", "C", "D", "E"]);
const nutriLetter = z.enum(["a", "b", "c", "d", "e", ""]).optional();

const products = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/products" }),
  schema: z.object({
    slug: z.string(),
    brand: z.string(),
    brandSlug: z.string(),
    name: z.string(),
    title: z.string(),
    description: z.string().max(200),
    grade: productGrade,
    score: z.number().int().min(0).max(100),
    nutriScore: nutriLetter,
    nova: z.number().int().min(1).max(4).nullable().optional(),
    barcode: z.string().optional(),
    additives: z.array(z.string()).default([]),
    ingredients: z.string().default(""),
    ingredientCount: z.number().int().min(0).default(0),
    image: z.string().optional(),
    imageAlt: z.string().optional(),
    categories: z.array(z.string()).default([]),
    catalogCategory: z.string(),
    ageRange: z.string(),
    targetAgeMonths: z.number().int().min(0).max(72).default(0),
    warnings: z.array(z.string()).default([]),
    sources: z.array(z.string()).default([]),
    sourceUrl: z.string().optional(),
    lastReviewed: z.coerce.date(),
    reviewedBy: z.string(),
    publishedDate: z.coerce.date().optional(),
    lang: z.enum(["fr", "en"]).default("fr"),
    draft: z.boolean().default(false),
  }),
});

const brands = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/brands" }),
  schema: z.object({
    slug: z.string(),
    brand: z.string(),
    title: z.string(),
    description: z.string().max(200),
    averageGrade: productGrade,
    averageScore: z.number().int().min(0).max(100),
    productCount: z.number().int().min(0),
    lastReviewed: z.coerce.date(),
    reviewedBy: z.string(),
    lang: z.enum(["fr", "en"]).default("fr"),
    draft: z.boolean().default(false),
  }),
});

const categories = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/categories" }),
  schema: z.object({
    slug: z.string(),
    title: z.string(),
    label: z.string(),
    labelEn: z.string(),
    description: z.string().max(200),
    productCount: z.number().int().min(0),
    brandCount: z.number().int().min(0),
    averageScore: z.number().int().min(0).max(100),
    lastReviewed: z.coerce.date(),
    reviewedBy: z.string(),
    lang: z.enum(["fr", "en"]).default("fr"),
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog, pages, products, brands, categories };
