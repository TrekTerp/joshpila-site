import { sectionMetadata } from "../../section-metadata";
export const metadata = sectionMetadata("cocktails", "Cooking & cocktails");
import { Suspense } from 'react';
import { CabinetClient, RedirectClient } from '../../static-pages';
export function generateStaticParams(){return [{slug:'cabinet'},{slug:'anchorage'}];}
export default async function Page({params}:{params:Promise<{slug:string}>}){const {slug}=await params;return <Suspense>{slug==='cabinet'?<CabinetClient/>:<RedirectClient href="/study/cabinet/"/>}</Suspense>;}
