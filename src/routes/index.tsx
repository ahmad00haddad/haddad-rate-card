import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Ahmad Haddad — Cinematic Filmmaker · إربد" },
      { name: "description", content: "قائمة تسعيرات أحمد حداد — تصوير سينمائي، ريلز، أفلام، إعلانات، وثائقيات، إيفنتات، مونتاج وتلوين." },
      { property: "og:title", content: "Ahmad Haddad — Cinematic Filmmaker" },
      { property: "og:description", content: "قائمة التسعيرات ومعرض المعدات" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <iframe
      src="/ratecard.html"
      title="Rate Card"
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        border: "none",
      }}
    />
  );
}
