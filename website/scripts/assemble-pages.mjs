import {cpSync,mkdirSync,existsSync,rmSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const dest=path.join(root,'pages-dist');rmSync(dest,{recursive:true,force:true});mkdirSync(dest,{recursive:true});
cpSync(path.join(root,'website/out'),dest,{recursive:true});
for(const file of ['dnd','games','CNAME','apple-touch-icon.png','favicon.ico','favicon-32.png','favicon-48.png'])if(existsSync(path.join(root,file)))cpSync(path.join(root,file),path.join(dest,file),{recursive:true});
console.log('Pages artifact assembled with existing D&D and Games intact.');
