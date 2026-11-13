"use client";
import { useEffect } from 'react';
import { MotionStudy } from './motion-study';
// The cabinet restores ?panel= and ?year= from the address bar itself after it mounts, so this
// page can be prerendered instead of waiting for the browser to read the query string.
export function CabinetClient() { return <MotionStudy concept="cabinet" />; }
export function RedirectClient({href}:{href:string}) { useEffect(()=>{window.location.replace(href+window.location.search+window.location.hash);},[href]);return <a href={href}>Continue</a>; }
