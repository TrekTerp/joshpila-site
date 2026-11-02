// JPL Table 1 (1800–2050), Meeus Ch.25/47. Same core as SkyWatcher.
const J2000=2451545,DEG=Math.PI/180,RAD=180/Math.PI;const mod360=x=>((x%360)+360)%360;
const PELEMS={
  Mercury:[0.38709927,0.00000037,0.20563593,0.00001906,7.00497902,-0.00594749,252.25032350,149472.67411175,77.45779628,0.16047689,48.33076593,-0.12534081],
  Venus:  [0.72333566,0.00000390,0.00677672,-0.00004107,3.39467605,-0.00078890,181.97909950,58517.81538729,131.60246718,0.00268329,76.67984255,-0.27769418],
  Earth:  [1.00000261,0.00000562,0.01671123,-0.00004392,-0.00001531,-0.01294668,100.46457166,35999.37244981,102.93768193,0.32327364,0.0,0.0],
  Mars:   [1.52371034,0.00001847,0.09339410,0.00007882,1.84969142,-0.00813131,-4.55343205,19140.30268499,-23.94362959,0.44441088,49.55953891,-0.29257343],
  Jupiter:[5.20288700,-0.00011607,0.04838624,-0.00013253,1.30439695,-0.00183714,34.39644051,3034.74612775,14.72847983,0.21252668,100.47390909,0.20469106],
  Saturn: [9.53667594,-0.00125060,0.05386179,-0.00050991,2.48599187,0.00193609,49.95424423,1222.49362201,92.59887831,-0.41897216,113.66242448,-0.28867794],
  Uranus: [19.18916464,-0.00196176,0.04725744,-0.00004397,0.77263783,-0.00242939,313.23810451,428.48202785,170.95427630,0.40805281,74.01692503,0.04240589],
  Neptune:[30.06992276,0.00026291,0.00859048,0.00005105,1.77004347,0.00035372,-55.12002969,218.45945325,44.96476227,-0.32241464,131.78422574,-0.00508664],
};
// Heliocentric rectangular J2000 ecliptic coordinates (AU)
function helioRect(name,jd){
  const p=PELEMS[name];if(!p)return null;
  const T=(jd-J2000)/36525;
  const a=p[0]+p[1]*T,e=p[2]+p[3]*T,I=(p[4]+p[5]*T)*DEG,L=p[6]+p[7]*T,w=p[8]+p[9]*T,Om=p[10]+p[11]*T;
  const M=mod360(L-w)*DEG,omega=(w-Om)*DEG,O=Om*DEG;
  let E=M;for(let k=0;k<12;k++)E=E-(E-e*Math.sin(E)-M)/(1-e*Math.cos(E));
  const xp=a*(Math.cos(E)-e),yp=a*Math.sqrt(1-e*e)*Math.sin(E);
  const cw=Math.cos(omega),sw=Math.sin(omega),cO=Math.cos(O),sO=Math.sin(O),cI=Math.cos(I),sI=Math.sin(I);
  const x=(cw*cO-sw*sO*cI)*xp+(-sw*cO-cw*sO*cI)*yp,
        y=(cw*sO+sw*cO*cI)*xp+(-sw*sO+cw*cO*cI)*yp,
        z=(sw*sI)*xp+(cw*sI)*yp,
        r=Math.sqrt(xp*xp+yp*yp);
  return{x,y,z,r};
}
function sunPos(jd){
  const T=(jd-J2000)/36525;
  const L0=mod360(280.46646+36000.76983*T),M=mod360(357.52911+35999.05029*T)*DEG;
  const C=(1.914602-0.004817*T)*Math.sin(M)+(0.019993-0.000101*T)*Math.sin(2*M)+0.000289*Math.sin(3*M);
  const lon=mod360(L0+C),eps=(23.439291-0.013004*T)*DEG;
  const e=0.016708634-0.000042037*T;let E=M;for(let k=0;k<10;k++)E=M+e*Math.sin(E);
  const R=1.000001018*(1-e*Math.cos(E));
  return{ra:mod360(Math.atan2(Math.cos(eps)*Math.sin(lon*DEG),Math.cos(lon*DEG))*RAD),
    dec:Math.asin(Math.sin(eps)*Math.sin(lon*DEG))*RAD,lon,R};
}

const _ML=[ // D M M' F  Σl(1e-6°)  Σr(1e-3 km)
 [0,0,1,0,6288774,-20905355],[2,0,-1,0,1274027,-3699111],[2,0,0,0,658314,-2955968],[0,0,2,0,213618,-569925],
 [0,1,0,0,-185116,48888],[0,0,0,2,-114332,-3149],[2,0,-2,0,58793,246158],[2,-1,-1,0,57066,-152138],
 [2,0,1,0,53322,-170733],[2,-1,0,0,45758,-204586],[0,1,-1,0,-40923,-129620],[1,0,0,0,-34720,108743],
 [0,1,1,0,-30383,104755],[2,0,0,-2,15327,10321],[0,0,1,2,-12528,0],[0,0,1,-2,10980,79661],
 [4,0,-1,0,10675,-34782],[0,0,3,0,10034,-23210],[4,0,-2,0,8548,-21636],[2,1,-1,0,-7888,24208],
 [2,1,0,0,-6766,30824],[1,0,-1,0,-5163,-8379],[1,1,0,0,4987,-16675],[2,-1,1,0,4036,-12831],
 [2,0,2,0,3994,-10445],[4,0,0,0,3861,-11650],[2,0,-3,0,3665,14403],[0,1,-2,0,-2689,-7003],
 [2,0,-1,2,-2602,0],[2,-1,-2,0,2390,10056],[1,0,1,0,-2348,6322],[2,-2,0,0,2236,-9884]];
const _MB=[ // D M M' F  Σb(1e-6°)
 [0,0,0,1,5128122],[0,0,1,1,280602],[0,0,1,-1,277693],[2,0,0,-1,173237],[2,0,-1,1,55413],
 [2,0,-1,-1,46271],[2,0,0,1,32573],[0,0,2,1,17198],[2,0,1,-1,9266],[0,0,2,-1,8822],
 [2,-1,0,-1,8216],[2,0,-2,-1,4324],[2,0,1,1,4200],[2,1,0,-1,-3359],[2,-1,-1,1,2463],
 [2,-1,0,1,2211],[2,-1,-1,-1,2065],[0,1,-1,-1,-1870],[4,0,-1,-1,1828],[0,1,0,1,-1794]];
function moonPos(jd){
  const T=(jd-J2000)/36525;
  const Lp=mod360(218.3164477+481267.88123421*T),D=mod360(297.8501921+445267.1114034*T);
  const M=mod360(357.5291092+35999.0502909*T),Mp=mod360(134.9633964+477198.8675055*T);
  const F=mod360(93.2720950+483202.0175233*T),Ecc=1-0.002516*T;
  const A1=mod360(119.75+131.849*T),A2=mod360(53.09+479264.290*T),A3=mod360(313.45+481266.484*T);
  let sl=0,sr=0,sb=0;
  for(const[d,m,mp,f,cl,cr]of _ML){const arg=(d*D+m*M+mp*Mp+f*F)*DEG,ef=Math.abs(m)===1?Ecc:Math.abs(m)===2?Ecc*Ecc:1;
    sl+=cl*ef*Math.sin(arg);sr+=cr*ef*Math.cos(arg);}
  for(const[d,m,mp,f,cb]of _MB){const arg=(d*D+m*M+mp*Mp+f*F)*DEG,ef=Math.abs(m)===1?Ecc:Math.abs(m)===2?Ecc*Ecc:1;
    sb+=cb*ef*Math.sin(arg);}
  sl+=3958*Math.sin(A1*DEG)+1962*Math.sin((Lp-F)*DEG)+318*Math.sin(A2*DEG);
  sb+=-2235*Math.sin(Lp*DEG)+382*Math.sin(A3*DEG)+175*Math.sin((A1-F)*DEG)+175*Math.sin((A1+F)*DEG)+127*Math.sin((Lp-Mp)*DEG)-115*Math.sin((Lp+Mp)*DEG);
  const lon=Lp+sl/1e6,lat=sb/1e6,dist=385000.56+sr/1000;
  const eps=(23.4392911-0.0130042*T)*DEG,lonR=lon*DEG,latR=lat*DEG;
  return{ra:mod360(Math.atan2(Math.sin(lonR)*Math.cos(eps)-Math.tan(latR)*Math.sin(eps),Math.cos(lonR))*RAD),
    dec:Math.asin(Math.sin(latR)*Math.cos(eps)+Math.cos(latR)*Math.sin(eps)*Math.sin(lonR))*RAD,dist,lon:mod360(lon),lat};
}

export const planetNames=Object.keys(PELEMS);
export {helioRect,moonPos,sunPos,PELEMS};
export function localJD(date,time='21:00') {const [y,m,d]=date.split('-').map(Number),[h,min,s=0]=time.split(':').map(Number);const desired=Date.UTC(y,m-1,d,h,min,s);let t=desired;const f=new Intl.DateTimeFormat('en-US',{timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});for(let i=0;i<3;i++){const p={};f.formatToParts(new Date(t)).forEach(x=>p[x.type]=x.value);t+=desired-Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute,+p.second)}return t/86400000+2440587.5;}
export function photoJD(photo){if(!photo.date)return null;if(photo.capturedUTC)return Date.parse(photo.capturedUTC)/86400000+2440587.5;return localJD(photo.date,photo.captureTime||'21:00');}
export function lunarState(jd){const m=moonPos(jd),s=sunPos(jd),cos=Math.cos(m.lat*DEG)*Math.cos((m.lon-s.lon)*DEG),psi=Math.acos(Math.max(-1,Math.min(1,cos)));const angle=Math.atan2(s.R*149597870.7*Math.sin(psi),m.dist-s.R*149597870.7*Math.cos(psi));const illumination=(1+Math.cos(angle))/2,waxing=mod360(m.lon-s.lon)<180;return {...m,illumination,waxing,phase:illumination<.015?'New Moon':illumination>.985?'Full Moon':Math.abs(illumination-.5)<.025?(waxing?'First quarter':'Last quarter'):(waxing?'Waxing ':'Waning ')+(illumination<.5?'crescent':'gibbous')};}
