// Next.js replaces nested metadata objects instead of merging them, so any
// page that defines its own openGraph or twitter must repeat the image.
export const defaultOgImage = {
  url: "/og/fsd-cli-og-1200x630-v1.png",
  width: 1200,
  height: 630,
  alt: "FSD CLI logo",
} as const;
