"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { adventYears, GLASS_SLOT, GLASS_START } from './cabinet-years';
const YearsContext=createContext(adventYears);
export function CocktailYearsProvider({children}:{children:ReactNode}) {
  const [years,setYears]=useState(adventYears);
  useEffect(()=>{
    let active=true;
    const refresh=async()=>{try{const r=await fetch('https://skcjspvcinvknkqvgnfk.supabase.co/functions/v1/cocktails/years',{cache:'no-store'});if(!r.ok)return;const entries=await r.json();if(active&&Array.isArray(entries)&&entries.length)setYears(entries.map((entry,index)=>({...entry,left:GLASS_START+index*GLASS_SLOT,right:GLASS_START+(index+1)*GLASS_SLOT})));}catch{/* The bundled shelf remains usable during a storage outage. */}};
    void refresh();
    const update=(event:MessageEvent)=>{if(event.origin===location.origin&&event.data?.type==='cocktail-archive-updated')void refresh();};
    window.addEventListener('message',update);return()=>{active=false;window.removeEventListener('message',update);};
  },[]);
  return <YearsContext.Provider value={years}>{children}</YearsContext.Provider>;
}
export const useCocktailYears=()=>useContext(YearsContext);
