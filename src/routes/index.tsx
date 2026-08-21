import { createFileRoute } from "@tanstack/react-router";
import { RateCardExperience } from "@/components/RateCardExperience";
import { usePricingItems } from "@/hooks/use-pricing-items";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Ahmad Haddad — Cinematic Filmmaker · إربد" },
      { name: "description", content: "قائمة تسعيرات أحمد حداد — تصوير سينمائي، ريلز، أفلام، إعلانات، وثائقيات، إيفنتات، مونتاج وتلوين." },
      { property: "og:title", content: "Ahmad Haddad — Cinematic Filmmaker" },
      { property: "og:description", content: "قائمة التسعيرات ومعرض المعدات" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const { data = [], isLoading, error, refetch } = usePricingItems();

  if (isLoading) {
    return <div className="ratecard-state"><span className="ratecard-state__spinner" /><p>جارٍ تحميل بطاقة الأسعار…</p></div>;
  }

  if (error) {
    return <div className="ratecard-state"><h1>تعذّر تحميل الأسعار</h1><p>لم نعرض أسعاراً قديمة. تحقق من الاتصال وحاول مجدداً.</p><button onClick={() => void refetch()}>إعادة المحاولة</button></div>;
  }

  return (
    <RateCardExperience items={data} />
  );
}
