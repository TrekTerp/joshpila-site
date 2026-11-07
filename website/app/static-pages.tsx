"use client";
import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { OrreryHome } from './prototype-lab';
import { MotionStudy } from './motion-study';
export function HomeClient() { const q=useSearchParams(); return <OrreryHome initialSelectedId={q.get('selected')||undefined}/>; }
export function CabinetClient() { const q=useSearchParams(); const panel=q.get('panel'); const section=panel==='backstory'||panel==='recipes'||panel==='advent'?panel:'overview'; const y=Number(q.get('year')); return <MotionStudy concept="cabinet" initialSection={section} initialYear={Number.isInteger(y)&&y>=2020&&y<=2100?y:undefined}/>; }
export function RedirectClient({href}:{href:string}) { useEffect(()=>{window.location.replace(href+window.location.search+window.location.hash);},[href]);return <a href={href}>Continue</a>; }
