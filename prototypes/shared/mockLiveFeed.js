// Mock live feed for banner — dev only, plugin-able. Admin can localStorage.setItem('boba:banner:events', JSON.stringify([...]))
const SEED = [
  {kicker:"House · Batch at :00", title:"Brown Sugar — brewed Taichung way", cta_label:"View →", cta_type:"sku", cta_value:"brown-sugar", announcements:"Announcements • Sponsor: Straus Organic Milk • Promo: Matcha Uji 0% sugar — live at 16:9", video_url:"../../assets/boba/sample-live.mp4"},
  {kicker:"Live · 89 ordered today", title:"Taro — no powder, real taro", cta_label:"Try →", cta_type:"sku", cta_value:"taro", announcements:"Announcements • Sponsor: Straus • Batch at :40 — warm pearls", video_url:"../../assets/boba/sample-live.mp4"},
  {kicker:"Sponsor — Straus", title:"Organic milk — sponsor", cta_label:"Learn →", cta_type:"url", cta_value:"https://example.com", announcements:"Sponsor: Straus Organic Milk — fresh daily • Promo: Taro 89 ordered", video_url:"../../assets/boba/sample-live.mp4"},
  {kicker:"Announce", title:"Batch at :40 — warm pearls", cta_label:"View →", cta_type:"anchor", cta_value:"brown-sugar", announcements:"Announcements • New: Hong Kong Boba • Sponsor: Local Farms", video_url:"../../assets/boba/sample-live.mp4"},
  {kicker:"Promo", title:"Matcha Uji — 0% sugar", cta_label:"Try →", cta_type:"sku", cta_value:"matcha", announcements:"Promo: Matcha Uji 0% sugar • Announcements • Live video 16:9", video_url:"../../assets/boba/sample-live.mp4"},
];
let idx=0;
const bc = (()=>{ try{ return new BroadcastChannel('boba:banners'); } catch{ return null; }})();
function tick(){
  const custom = (()=>{ try{ return JSON.parse(localStorage.getItem('boba:banner:events')||'null'); } catch{ return null; }})();
  const pool = Array.isArray(custom) && custom.length ? custom : SEED;
  const ev = pool[idx % pool.length]; idx++;
  const payload = {...ev, at: new Date().toISOString(), mock:true};
  // publish via BroadcastChannel + localStorage for fallback
  try{
    localStorage.setItem('boba:tenant:boba-obsidian:banners:active', JSON.stringify(payload));
    bc?.postMessage({type:'banner:event', payload});
    // also dispatch to window for prototype inline listener
    window.dispatchEvent(new CustomEvent('boba:banner', {detail: payload}));
  }catch{}
}
if(!window.__mockLiveFeedStarted){
  window.__mockLiveFeedStarted=true;
  setInterval(tick, 8000);
  // expose for admin console: setBannerEvents([...])
  window.setBannerEvents = (arr)=>{ localStorage.setItem('boba:banner:events', JSON.stringify(arr)); };
  window.tickBanner = tick;
  console.log('[mockLiveFeed] started interval 8s — use setBannerEvents([...]) or tickBanner() to test');
}
