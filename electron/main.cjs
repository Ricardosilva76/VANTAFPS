const {app,BrowserWindow,ipcMain}=require("electron");const path=require("node:path");const {execFile}=require("node:child_process");
let win,watch=null,original=null,busy=false;const dev=!app.isPackaged;
const runPS=script=>new Promise((resolve,reject)=>execFile("powershell.exe",["-NoProfile","-NonInteractive","-ExecutionPolicy","Bypass","-Command",script],{windowsHide:true,timeout:18000,maxBuffer:2*1024*1024},(e,o,err)=>e?reject(new Error((err||e.message).trim())):resolve(String(o||"").trim())));
const displayPS=String.raw`
Add-Type -TypeDefinition @"
using System;using System.Runtime.InteropServices;
public class VantaDM {
[StructLayout(LayoutKind.Sequential,CharSet=CharSet.Unicode)] public struct DEVMODE {
[MarshalAs(UnmanagedType.ByValTStr,SizeConst=32)] public string dmDeviceName;
public short dmSpecVersion,dmDriverVersion,dmSize,dmDriverExtra;public int dmFields,dmPositionX,dmPositionY,dmDisplayOrientation,dmDisplayFixedOutput;
public short dmColor,dmDuplex,dmYResolution,dmTTOption,dmCollate;[MarshalAs(UnmanagedType.ByValTStr,SizeConst=32)] public string dmFormName;
public short dmLogPixels;public int dmBitsPerPel,dmPelsWidth,dmPelsHeight,dmDisplayFlags,dmDisplayFrequency,dmICMMethod,dmICMIntent,dmMediaType,dmDitherType,dmReserved1,dmReserved2,dmPanningWidth,dmPanningHeight;
}
[DllImport("user32.dll",CharSet=CharSet.Unicode)] public static extern int EnumDisplaySettings(string d,int n,ref DEVMODE m);
[DllImport("user32.dll",CharSet=CharSet.Unicode)] public static extern int ChangeDisplaySettingsEx(string d,ref DEVMODE m,IntPtr w,int flags,IntPtr l);
public const int WIDTH=0x80000,HEIGHT=0x100000,FREQ=0x400000,TEST=2,FULL=4;
}
"@
function ReadDM([int]$i){$m=New-Object VantaDM+DEVMODE;$m.dmSize=[Runtime.InteropServices.Marshal]::SizeOf([type][VantaDM+DEVMODE]);if([VantaDM]::EnumDisplaySettings($null,$i,[ref]$m)-eq 0){throw "Falha ao ler modo de ecrã"};return $m}
`;
async function getDisplay(){const raw=await runPS($displayPS+String.raw`
$cur=ReadDM -1;$list=@();for($i=0;$i -lt 1000;$i++){$m=New-Object VantaDM+DEVMODE;$m.dmSize=[Runtime.InteropServices.Marshal]::SizeOf([type][VantaDM+DEVMODE]);if([VantaDM]::EnumDisplaySettings($null,$i,[ref]$m)-eq 0){break};$list+=@{width=$m.dmPelsWidth;height=$m.dmPelsHeight;hz=$m.dmDisplayFrequency}}
[pscustomobject]@{width=$cur.dmPelsWidth;height=$cur.dmPelsHeight;hz=$cur.dmDisplayFrequency;modes=@($list|Sort-Object width,height,hz -Unique)}|ConvertTo-Json -Depth 5 -Compress
`);return JSON.parse(raw);}
async function setDisplay(mode){const w=Number(mode.width),h=Number(mode.height),hz=Number(mode.hz);if(![w,h,hz].every(Number.isFinite)||w<640||w>7680||h<480||h>4320||hz<24||hz>1000)throw Error("Modo inválido.");const output=await runPS(displayPS+String.raw`
$m=ReadDM -1;$m.dmPelsWidth=${w};$m.dmPelsHeight=${h};$m.dmDisplayFrequency=${hz};$m.dmFields=[VantaDM]::WIDTH -bor [VantaDM]::HEIGHT -bor [VantaDM]::FREQ
$t=[VantaDM]::ChangeDisplaySettingsEx($null,[ref]$m,[IntPtr]::Zero,[VantaDM]::TEST,[IntPtr]::Zero);if($t-ne 0){throw "Modo não suportado pelo monitor/driver ($t)"}
$r=[VantaDM]::ChangeDisplaySettingsEx($null,[ref]$m,[IntPtr]::Zero,[VantaDM]::FULL,[IntPtr]::Zero);if($r-ne 0){throw "Windows recusou a alteração ($r)"};"OK"
`);if(output!=="OK")throw Error(output);return getDisplay();}
function emit(v){if(win&&!win.isDestroyed())win.webContents.send("status",v);}
async function restore(){if(!original)return;const m=original;original=null;try{await setDisplay(m);emit({type:"restored",mode:m});}catch(e){original=m;emit({type:"error",message:"Não foi possível restaurar a resolução: "+e.message});}}
async function stopWatch(restoreNow=true){if(watch)clearInterval(watch);watch=null;if(restoreNow)await restore();return true;}
async function startWatch(profile){await stopWatch(false);if(!profile?.processName)throw Error("Indica o executável do jogo.");const proc=path.basename(profile.processName).replace(/\.exe$/i,"").replace(/'/g,"''");let seen=false;
watch=setInterval(async()=>{if(busy)return;busy=true;try{const state=await runPS(`if(Get-Process -Name '${proc}' -ErrorAction SilentlyContinue){"YES"}else{"NO"}`);if(state==="YES"&&!seen){seen=true;const old=await getDisplay();original={width:old.width,height:old.height,hz:old.hz};await setDisplay(profile);emit({type:"changed",profile,original});}else if(state!=="YES"&&seen){seen=false;await restore();emit({type:"closed"});}}catch(e){emit({type:"error",message:e.message});clearInterval(watch);watch=null;}finally{busy=false;}},1250);emit({type:"watching",profile});return true;}
function createWindow(){win=new BrowserWindow({width:1450,height:940,minWidth:1100,minHeight:720,backgroundColor:"#080812",title:"VANTAFPS",autoHideMenuBar:true,webPreferences:{preload:path.join(__dirname,"preload.cjs"),contextIsolation:true,nodeIntegration:false,sandbox:true}});if(dev)win.loadURL("http://127.0.0.1:5173");else win.loadFile(path.join(__dirname,"../dist/index.html"));}
ipcMain.handle("display:get",getDisplay);ipcMain.handle("display:set",(_e,m)=>setDisplay(m));ipcMain.handle("display:restore",restore);ipcMain.handle("game:watch",(_e,p)=>startWatch(p));ipcMain.handle("game:stop",()=>stopWatch(true));
ipcMain.handle("nvidia:detect",async()=>{const raw=await runPS("Get-CimInstance Win32_VideoController | Select-Object Name,DriverVersion | ConvertTo-Json -Compress");let parsed=JSON.parse(raw||"[]");if(!Array.isArray(parsed))parsed=[parsed];return parsed.filter(x=>/NVIDIA/i.test(x.Name));});
app.whenReady().then(createWindow);app.on("before-quit",()=>{if(watch)clearInterval(watch);if(original){const m=original;const script=displayPS+String.raw`$x=ReadDM -1;$x.dmPelsWidth=${m.width};$x.dmPelsHeight=${m.height};$x.dmDisplayFrequency=${m.hz};$x.dmFields=[VantaDM]::WIDTH -bor [VantaDM]::HEIGHT -bor [VantaDM]::FREQ;[VantaDM]::ChangeDisplaySettingsEx($null,[ref]$x,[IntPtr]::Zero,[VantaDM]::FULL,[IntPtr]::Zero)|Out-Null`;execFile("powershell.exe",["-NoProfile","-ExecutionPolicy","Bypass","-Command",script],{windowsHide:true});}});app.on("window-all-closed",()=>{if(process.platform!=="darwin")app.quit();});