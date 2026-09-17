import { LegalPage, legalMetadata } from "@/components/site/legal-page";

export function generateMetadata() {
  return legalMetadata("cookie-policy", "Cookie Policy");
}

export default function Page() {
  return <LegalPage pageKey="cookie-policy" />;
}
