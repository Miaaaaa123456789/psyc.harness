/* No keys or real endpoints in this public file. Configure at private deployment time. */
(function(){
  'use strict';
  const config=window.OPS_DASHBOARD_CONFIG||{};
  const emit=data=>window.dispatchEvent(new CustomEvent('ops:snapshot-updated',{detail:data}));
  let current=window.OPSModel.validate(window.OPS_PUBLIC_SNAPSHOT),timer,busy=false;
  const safeURL=raw=>{const u=new URL(raw,location.href);if(u.protocol!=='https:'&&!['localhost','127.0.0.1'].includes(u.hostname))throw Error('真实接口必须使用HTTPS或本机地址');return u;};
  window.OPS_DATA={get:()=>current,set(data){current=window.OPSModel.validate(data);emit(current);},async refresh(){
    if(!config.snapshotUrl||busy)return;busy=true;
    try{const u=safeURL(config.snapshotUrl);const r=await fetch(u,{credentials:u.origin===location.origin?'same-origin':'omit',cache:'no-store'});if(!r.ok)throw Error('读取失败HTTP '+r.status);const next=await r.json();if(next.mode!=='private-runtime')throw Error('私有接口必须声明private-runtime');this.set(next);}
    catch(e){window.dispatchEvent(new CustomEvent('ops:sync-error',{detail:{message:e.message}}));}
    finally{busy=false;}
  },start(){if(config.snapshotUrl){this.refresh();timer=setInterval(()=>this.refresh(),Math.max(30000,config.pollMs||60000));}},stop(){clearInterval(timer);},
  async preview(file){
    if(/\.json$/i.test(file.name)){const parsed=window.OPSModel.validate(JSON.parse(await file.text()));return {kind:'snapshot',data:parsed};}
    if(!config.uploadUrl)throw Error('图片/表格识别服务未配置，不会假装识别成功。可导入已脱敏JSON快照，或在院内部署上传API。');
    const u=safeURL(config.uploadUrl),body=new FormData();body.append('file',file);
    const r=await fetch(u,{method:'POST',body,credentials:u.origin===location.origin?'same-origin':'omit'});if(!r.ok)throw Error('上传失败HTTP '+r.status);
    const parsed=await r.json();if(!parsed.importId||!Array.isArray(parsed.rows))throw Error('识别结果缺少importId或rows');return {kind:'server-preview',...parsed};
  },async confirm(preview){
    if(preview.kind==='snapshot'){this.set(preview.data);return {scope:'memory-only'};}
    if(!config.confirmUrl)throw Error('确认入库接口未配置');const u=safeURL(config.confirmUrl);
    const r=await fetch(u,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({importId:preview.importId}),credentials:u.origin===location.origin?'same-origin':'omit'});if(!r.ok)throw Error('确认失败HTTP '+r.status);await this.refresh();return {scope:'server'};
  }};
  window.OPS_DATA.start();
})();
