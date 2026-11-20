const {app,BrowserWindow,ipcMain,globalShortcut}=require("electron");const path=require("node:path");const {execFile}=require("node:child_process");
let win,watch=null,original=null,busy=false;let crossWindow=null,quickWindow=null;const dev=!app.isPackaged;
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
function createOverlayWindows(){
  const {screen}=require("electron");const bounds=screen.getPrimaryDisplay().bounds;
  crossWindow=new BrowserWindow({x:bounds.x,y:bounds.y,width:bounds.width,height:bounds.height,frame:false,transparent:true,backgroundColor:"#00000000",show:false,alwaysOnTop:true,skipTaskbar:true,focusable:false,hasShadow:false,webPreferences:{preload:path.join(__dirname,"preload.cjs"),contextIsolation:true,nodeIntegration:false,sandbox:true}});
  crossWindow.setBackgroundColor("#00000000");
  crossWindow.setIgnoreMouseEvents(true,{forward:true});
  crossWindow.loadURL(dev?"http://127.0.0.1:5173/?overlay=cross":"file://"+path.join(__dirname,"../dist/index.html")+"?overlay=cross");
  quickWindow=new BrowserWindow({width:430,height:560,frame:false,transparent:true,show:false,alwaysOnTop:true,skipTaskbar:true,resizable:false,webPreferences:{preload:path.join(__dirname,"preload.cjs"),contextIsolation:true,nodeIntegration:false,sandbox:true}});
  quickWindow.loadURL(dev?"http://127.0.0.1:5173/?overlay=quick":"file://"+path.join(__dirname,"../dist/index.html")+"?overlay=quick");
  quickWindow.on("blur",()=>quickWindow.hide());
}
function toggleQuick(){if(!quickWindow)return;quickWindow.isVisible()?quickWindow.hide():quickWindow.show();}
function createWindow(){win=new BrowserWindow({width:1450,height:940,minWidth:1100,minHeight:720,backgroundColor:"#080812",title:"VANTAFPS",autoHideMenuBar:true,webPreferences:{preload:path.join(__dirname,"preload.cjs"),contextIsolation:true,nodeIntegration:false,sandbox:true}});if(dev)win.loadURL("http://127.0.0.1:5173");else win.loadFile(path.join(__dirname,"../dist/index.html"));}
ipcMain.handle("color:apply",async(_e,col)=>{
 const b=Math.max(0,Math.min(200,Number(col.brightness??100))),ct=Math.max(0,Math.min(200,Number(col.contrast??100))),g=Math.max(1,Math.min(200,Number(col.gamma??100)));
 const vib=Math.max(0,Math.min(200,Number(col.vibrance??100)));
 const script=String.raw`
Add-Type -TypeDefinition @"
using System;using System.Runtime.InteropServices;
public static class VantaColor {
 [DllImport("user32.dll",CharSet=CharSet.Unicode)] public static extern IntPtr CreateDC(string driver,string device,string output,IntPtr init);
 [DllImport("gdi32.dll")] public static extern bool DeleteDC(IntPtr dc);
 [DllImport("gdi32.dll")] public static extern bool SetDeviceGammaRamp(IntPtr dc,IntPtr ramp);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)] public static extern bool EnumDisplayDevices(string device,uint index,ref DISPLAY_DEVICE data,uint flags);
 [StructLayout(LayoutKind.Sequential,CharSet=CharSet.Unicode)] public struct DISPLAY_DEVICE { public int cb; [MarshalAs(UnmanagedType.ByValTStr,SizeConst=32)] public string DeviceName; [MarshalAs(UnmanagedType.ByValTStr,SizeConst=128)] public string DeviceString; public int StateFlags; [MarshalAs(UnmanagedType.ByValTStr,SizeConst=128)] public string DeviceID; [MarshalAs(UnmanagedType.ByValTStr,SizeConst=128)] public string DeviceKey; }
 public static int Gamma(float brightness,float contrast,float gamma) {
  int ok=0;
  for(uint i=0;i<16;i++){ var d=new DISPLAY_DEVICE();d.cb=Marshal.SizeOf(typeof(DISPLAY_DEVICE));if(!EnumDisplayDevices(null,i,ref d,0)) break;if((d.StateFlags&1)==0) continue;
   IntPtr dc=CreateDC(null,d.DeviceName,null,IntPtr.Zero);if(dc==IntPtr.Zero) continue;
   IntPtr p=Marshal.AllocHGlobal(1536);var a=new ushort[768];
   for(int ch=0;ch<3;ch++)for(int n=0;n<256;n++){double x=n/255.0;double y=Math.Pow(x,100.0/gamma);y=((y-.5)*(contrast/100.0)+.5)*(brightness/100.0);y=Math.Max(0,Math.Min(1,y));a[ch*256+n]=(ushort)Math.Round(y*65535);}
   Marshal.Copy(a,0,p,768);if(SetDeviceGammaRamp(dc,p))ok++;Marshal.FreeHGlobal(p);DeleteDC(dc);
  } return ok;
 }
 public static int Reset(){return Gamma(100,100,100);}
}
"@
$gammaOk=[VantaColor]::Gamma(__B__,__CT__,__G__)
$nvOk=0
try {
 Add-Type -TypeDefinition @"
using System;using System.Runtime.InteropServices;
public static class VantaNv {
 [UnmanagedFunctionPointer(CallingConvention.Cdecl)] delegate int Init();
 [UnmanagedFunctionPointer(CallingConvention.Cdecl)] delegate int EnumDisplay(uint index,out IntPtr handle);
 [UnmanagedFunctionPointer(CallingConvention.Cdecl)] delegate int SetDvc(IntPtr handle,uint output,uint level);
 [DllImport("nvapi64.dll",CallingConvention=CallingConvention.Cdecl,EntryPoint="nvapi_QueryInterface")] static extern IntPtr Q(uint id);
 public static int Set(uint level){
  var init=Marshal.GetDelegateForFunctionPointer<Init>(Q(0x0150E828));int st=init();if(st!=0)return 0;
  var en=Marshal.GetDelegateForFunctionPointer<EnumDisplay>(Q(0x9ABDD40));var set=Marshal.GetDelegateForFunctionPointer<SetDvc>(Q(0x172409B4));int ok=0;
  for(uint i=0;i<16;i++){IntPtr h;st=en(i,out h);if(st!=0)break;if(h==IntPtr.Zero)continue;if(set(h,0,level)==0)ok++;}
  return ok;
 }
}
"@
 $level=[Math]::Max(0,[Math]::Min(100,[Math]::Round(__V__/2.0)))
 $nvOk=[VantaNv]::Set([uint32]$level)
} catch {}
if($gammaOk -eq 0 -and $nvOk -eq 0){throw "O driver não permite alterar a cor neste modo de ecrã. Se estiveres em HDR, desliga HDR no Windows e testa novamente."}
[pscustomobject]@{gamma=$gammaOk;nvidiaVibrance=$nvOk}|ConvertTo-Json -Compress
`.replace("__G__",String(g)).replace("__CT__",String(ct)).replace("__B__",String(b)).replace("__V__",String(vib));
 const raw=await runPS(script);return JSON.parse(raw);
});
ipcMain.handle("color:reset",async()=>{
 const script=String.raw`
Add-Type -TypeDefinition @"
using System;using System.Runtime.InteropServices;
public static class VantaColorReset {
 [DllImport("user32.dll",CharSet=CharSet.Unicode)] public static extern IntPtr CreateDC(string driver,string device,string output,IntPtr init);
 [DllImport("gdi32.dll")] public static extern bool DeleteDC(IntPtr dc);
 [DllImport("gdi32.dll")] public static extern bool SetDeviceGammaRamp(IntPtr dc,IntPtr ramp);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)] public static extern bool EnumDisplayDevices(string device,uint index,ref DISPLAY_DEVICE data,uint flags);
 [StructLayout(LayoutKind.Sequential,CharSet=CharSet.Unicode)] public struct DISPLAY_DEVICE { public int cb; [MarshalAs(UnmanagedType.ByValTStr,SizeConst=32)] public string DeviceName; [MarshalAs(UnmanagedType.ByValTStr,SizeConst=128)] public string DeviceString; public int StateFlags; [MarshalAs(UnmanagedType.ByValTStr,SizeConst=128)] public string DeviceID; [MarshalAs(UnmanagedType.ByValTStr,SizeConst=128)] public string DeviceKey; }
 public static int Reset(){int ok=0;for(uint i=0;i<16;i++){var d=new DISPLAY_DEVICE();d.cb=Marshal.SizeOf(typeof(DISPLAY_DEVICE));if(!EnumDisplayDevices(null,i,ref d,0))break;if((d.StateFlags&1)==0)continue;IntPtr dc=CreateDC(null,d.DeviceName,null,IntPtr.Zero);if(dc==IntPtr.Zero)continue;IntPtr p=Marshal.AllocHGlobal(1536);var a=new ushort[768];for(int ch=0;ch<3;ch++)for(int n=0;n<256;n++)a[ch*256+n]=(ushort)Math.Round((n/255.0)*65535);Marshal.Copy(a,0,p,768);if(SetDeviceGammaRamp(dc,p))ok++;Marshal.FreeHGlobal(p);DeleteDC(dc);}return ok;}
}
"@
$gammaOk=[VantaColorReset]::Reset()
try {
 Add-Type -TypeDefinition @"
using System;using System.Runtime.InteropServices;
public static class VantaNvReset {
 [UnmanagedFunctionPointer(CallingConvention.Cdecl)] delegate int Init();
 [UnmanagedFunctionPointer(CallingConvention.Cdecl)] delegate int EnumDisplay(uint index,out IntPtr handle);
 [UnmanagedFunctionPointer(CallingConvention.Cdecl)] delegate int SetDvc(IntPtr handle,uint output,uint level);
 [DllImport("nvapi64.dll",CallingConvention=CallingConvention.Cdecl,EntryPoint="nvapi_QueryInterface")] static extern IntPtr Q(uint id);
 public static int Reset(){var init=Marshal.GetDelegateForFunctionPointer<Init>(Q(0x0150E828));if(init()!=0)return 0;var en=Marshal.GetDelegateForFunctionPointer<EnumDisplay>(Q(0x9ABDD40));var set=Marshal.GetDelegateForFunctionPointer<SetDvc>(Q(0x172409B4));int ok=0;for(uint i=0;i<16;i++){IntPtr h;if(en(i,out h)!=0)break;if(h!=IntPtr.Zero&&set(h,0,50)==0)ok++;}return ok;}
}
"@
 $nvOk=[VantaNvReset]::Reset()
} catch {}
[pscustomobject]@{gamma=$gammaOk;nvidiaVibrance=$nvOk}|ConvertTo-Json -Compress
`;
 const raw=await runPS(script);return JSON.parse(raw);
});
ipcMain.handle("overlay:crosshair",(_e,show)=>show?crossWindow?.show():crossWindow?.hide());
ipcMain.handle("overlay:quick",()=>{if(quickWindow?.isVisible())quickWindow.hide();else quickWindow?.show();});
ipcMain.handle("overlay:set-crosshair",(_e,x)=>crossWindow?.webContents.send("crosshair:set",x));
ipcMain.handle("display:get",getDisplay);ipcMain.handle("display:set",(_e,m)=>setDisplay(m));ipcMain.handle("display:restore",restore);ipcMain.handle("game:watch",(_e,p)=>startWatch(p));ipcMain.handle("game:stop",()=>stopWatch(true));
ipcMain.handle("nvidia:detect",async()=>{const raw=await runPS("Get-CimInstance Win32_VideoController | Select-Object Name,DriverVersion | ConvertTo-Json -Compress");let parsed=JSON.parse(raw||"[]");if(!Array.isArray(parsed))parsed=[parsed];return parsed.filter(x=>/NVIDIA/i.test(x.Name));});
app.whenReady().then(()=>{globalShortcut.register("Alt+Z",()=>{if(quickWindow?.isVisible())quickWindow.hide();else quickWindow?.show();});createOverlayWindows();createWindow();});app.on("before-quit",()=>{if(watch)clearInterval(watch);if(original){const m=original;const script=displayPS+String.raw`$x=ReadDM -1;$x.dmPelsWidth=${m.width};$x.dmPelsHeight=${m.height};$x.dmDisplayFrequency=${m.hz};$x.dmFields=[VantaDM]::WIDTH -bor [VantaDM]::HEIGHT -bor [VantaDM]::FREQ;[VantaDM]::ChangeDisplaySettingsEx($null,[ref]$x,[IntPtr]::Zero,[VantaDM]::FULL,[IntPtr]::Zero)|Out-Null`;execFile("powershell.exe",["-NoProfile","-ExecutionPolicy","Bypass","-Command",script],{windowsHide:true});}});app.on("before-quit",()=>{try{globalShortcut.unregisterAll();}catch{};});app.on("window-all-closed",()=>{if(process.platform!=="darwin")app.quit();});