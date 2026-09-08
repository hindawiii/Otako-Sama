import { createFileRoute } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import { OtakuShell } from "@/components/OtakuShell";
import "@/i18n";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Otaku Sama — المنصة العربية الأولى للأوتاكو" },
      {
        name: "description",
        content:
          "Otaku Sama: an Arabic-first community for anime, manga, and games. Chat, debate, and track what you love.",
      },
      { property: "og:title", content: "Otaku Sama — أوتاكو ساما" },
      {
        property: "og:description",
        content: "Arabic-first community for anime, manga, and games.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  // i18n uses localStorage + navigator for language detection, which is
  // browser-only. Render inside ClientOnly to avoid SSR/CSR mismatches.
  return (
    <ClientOnly fallback={<div className="min-h-screen bg-background" />}>
      <OtakuShell />
    </ClientOnly>
  );
}
