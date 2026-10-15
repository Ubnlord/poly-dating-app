const KEY="polyconnect_settings";
export const DEFAULT_SETTINGS=Object.freeze({theme:"light",reduceMotion:false,largerText:false});
export function readAppSettings(){try{const v=JSON.parse(globalThis.localStorage?.getItem(KEY)||"{}");return {...DEFAULT_SETTINGS,...(v&&typeof v==="object"?v:{})};}catch{return {...DEFAULT_SETTINGS};}}
export function writeAppSettings(patch){const next={...readAppSettings(),...patch};try{globalThis.localStorage?.setItem(KEY,JSON.stringify(next));}catch{throw new Error("Settings could not be saved on this device.");}return next;}
export function applyAccessibilitySettings(settings=readAppSettings()){const root=globalThis.document?.documentElement;if(!root)return;root.classList.toggle("reduce-motion",Boolean(settings.reduceMotion));root.classList.toggle("larger-text",Boolean(settings.largerText));}
