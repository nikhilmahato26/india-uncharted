import { LegalPage, legalMetadata } from "@/components/site/legal-page";

export function generateMetadata() {
  return legalMetadata("privacy-policy", "Privacy Policy");
}

export default function Page() {
  return <LegalPage pageKey="privacy-policy" />;
}
