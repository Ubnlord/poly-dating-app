import { mkdir, copyFile, cp } from "node:fs/promises";
import { resolve } from "node:path";
const root=process.cwd(), source=resolve(root,"index.html"), targetDir=resolve(root,"www");
await mkdir(targetDir,{recursive:true});
await copyFile(source,resolve(targetDir,"index.html"));
for (const directory of ["src","public"]) {
  try { await cp(resolve(root,directory),resolve(targetDir,directory),{recursive:true,force:true}); }
  catch(error) { if(error?.code!=="ENOENT") throw error; }
}
console.log("Prepared PolyConnect web assets, modules, and public files for Capacitor.");
