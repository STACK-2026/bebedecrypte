import { siteConfig, fullUrl } from "./config";

interface MetaProps {
  title: string;
  description: string;
  url: string;
  image?: string;
  type?: "website" | "article";
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
  keywords?: string[];
}

/** Generate meta tags array for <head> */
export function generateMeta(props: MetaProps) {
  const image = props.image || siteConfig.ogImage;
  const imageUrl = image.startsWith("http") ? image : fullUrl(image);

  return {
    title: props.title,
    description: props.description,
    canonical: props.url,
    og: {
      title: props.title,
      description: props.description,
      url: props.url,
      image: imageUrl,
      type: props.type || "website",
      locale: siteConfig.locale,
      siteName: siteConfig.name,
      ...(props.publishedTime && {
        "article:published_time": props.publishedTime,
      }),
      ...(props.modifiedTime && {
        "article:modified_time": props.modifiedTime,
      }),
    },
    twitter: {
      card: "summary_large_image",
      title: props.title,
      description: props.description,
      image: imageUrl,
      site: siteConfig.twitterHandle,
    },
  };
}

/** JSON-LD for Organization + WebSite (homepage) */
export function jsonLdHomepage() {
  return [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: siteConfig.name,
      url: siteConfig.url,
      description: siteConfig.description,
      ...(siteConfig.legal.email && {
        contactPoint: {
          "@type": "ContactPoint",
          email: siteConfig.legal.email,
          contactType: "customer service",
          availableLanguage: "French",
        },
      }),
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: siteConfig.name,
      url: siteConfig.url,
      description: siteConfig.tagline,
      inLanguage: siteConfig.locale,
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${siteConfig.url}/blog?q={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
    },
  ];
}

/** JSON-LD for Article */
export function jsonLdArticle(article: {
  title: string;
  description: string;
  url: string;
  datePublished: string;
  dateModified?: string;
  image?: string;
  author?: string;
  authorRole?: string;
  authorSpecialities?: string[];
  reviewedBy?: string;
  reviewedByRole?: string;
  lastReviewed?: string;
  wordCount?: number;
  keywords?: string[];
}) {
  const authorName = article.author || siteConfig.blog.defaultAuthor;
  const authorSlug = authorName.toLowerCase().replace(/[^\w]+/g, "-").replace(/^-|-$/g, "");
  const authorUrl = fullUrl(`/authors/${authorSlug}/`);

  const reviewerName = article.reviewedBy;
  const reviewerSlug = reviewerName
    ? reviewerName.toLowerCase().replace(/[^\w]+/g, "-").replace(/^-|-$/g, "")
    : undefined;
  const reviewerUrl = reviewerSlug ? fullUrl(`/authors/${reviewerSlug}/`) : undefined;

  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.description,
    url: article.url,
    datePublished: article.datePublished,
    // dateModified must be >= datePublished. Earlier lastReviewed dates are
    // ignored to avoid the date inversion flagged by the schema audit.
    dateModified: (function () {
      const candidate = article.dateModified || article.lastReviewed || article.datePublished;
      return candidate < article.datePublished ? article.datePublished : candidate;
    })(),
    image: article.image
      ? article.image.startsWith("http")
        ? article.image
        : fullUrl(article.image)
      : undefined,
    author: {
      "@type": "Person",
      name: authorName,
      url: authorUrl,
      ...(article.authorRole ? { jobTitle: article.authorRole } : {}),
      ...(article.authorSpecialities && article.authorSpecialities.length > 0
        ? { knowsAbout: article.authorSpecialities }
        : {}),
    },
    ...(reviewerName
      ? {
          reviewedBy: {
            "@type": "Person",
            name: reviewerName,
            url: reviewerUrl,
            ...(article.reviewedByRole ? { jobTitle: article.reviewedByRole } : {}),
          },
        }
      : {}),
    ...(article.lastReviewed ? { lastReviewed: article.lastReviewed } : {}),
    publisher: {
      "@type": "Organization",
      name: siteConfig.name,
      url: siteConfig.url,
      logo: {
        "@type": "ImageObject",
        url: fullUrl("/favicon.svg"),
      },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": article.url },
    ...(article.wordCount ? { wordCount: article.wordCount } : {}),
    keywords: article.keywords?.join(", "),
    inLanguage: siteConfig.locale,
    speakable: {
      "@type": "SpeakableSpecification",
      cssSelector: ["h1", "h2", "[data-speakable]"],
    },
  };
}

/** JSON-LD for FAQPage */
export function jsonLdFaq(
  faq: Array<{ question: string; answer: string }>
) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

/** JSON-LD for BreadcrumbList */
export function jsonLdBreadcrumbs(
  items: Array<{ name: string; url: string }>
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/** JSON-LD for HowTo */
export function jsonLdHowTo(howTo: {
  name: string;
  description?: string;
  totalTime?: string;
  steps: Array<{ name: string; text: string }>;
  image?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: howTo.name,
    ...(howTo.description ? { description: howTo.description } : {}),
    ...(howTo.totalTime ? { totalTime: howTo.totalTime } : {}),
    ...(howTo.image ? { image: howTo.image } : {}),
    step: howTo.steps.map((s, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: s.name,
      text: s.text,
    })),
  };
}
