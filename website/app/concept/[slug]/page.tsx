import { RedirectClient } from '../../static-pages';
export function generateStaticParams(){return ['orrery','atlas','codex','question'].map(slug=>({slug}));}
export default function Page(){return <RedirectClient href="/"/>;}
