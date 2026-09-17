import { LegalPage, legalMetadata } from "@/components/site/legal-page";

export function generateMetadata() {
  return legalMetadata("terms-and-conditions", "Terms & Conditions");
}

export default function Page() {
  return <LegalPage pageKey="terms-and-conditions" />;
}
