import { RedirectClient } from "../../../static-pages";
import { sectionMetadata } from "../../../section-metadata";
export const metadata = sectionMetadata("astronomy", "Astrophotography");
export default function Page() { return <RedirectClient href="/astronomy/" />; }
