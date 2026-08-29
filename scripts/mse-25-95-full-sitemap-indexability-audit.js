#!/usr/bin/env node
'use strict';

const https = require('https');
const { URL } = require('url');
const ORIGIN = String(process.env.MSE_25_95_ORIGIN || 'https://agences.mondescale.com').replace(/\/+$/,'');
const CONCURRENCY = Math.max(1, Math.min(12, Number(process.env.MSE_25_95_CONCURRENCY || 6)));

function request(url, redirects = []) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers:{'user-agent':'Mondescale-MSE-25.95-ReadOnly-Audit/1.0',accept:'text/html,application/xml;q=0.9,*/*;q=0.8'} }, res => {
      let body=''; res.setEncoding('utf8'); res.on('data',c=>body+=c);
      res.on('end', async()=>{
        if ([301,302,307,308].includes(res.statusCode) && res.headers.location && redirects.length < 6) {
          const next = new URL(res.headers.location,url).toString();
          try { const out=await request(next,[...redirects,{status:res.statusCode,from:url,to:next}]); return resolve(out); } catch(e){ return reject(e); }
        }
        resolve({requestedUrl:redirects[0]?.from||url,finalUrl:url,status:res.statusCode,headers:res.headers,body,redirects});
      });
    });
    req.setTimeout(20000,()=>req.destroy(new Error('timeout'))); req.on('error',reject);
  });
}
function match(html,re){const m=html.match(re);return m?String(m[1]||'').trim():null;}
function all(html,re){return [...html.matchAll(re)].map(m=>String(m[1]||'').trim()).filter(Boolean);}
function abs(v,b){try{return new URL(v,b).toString();}catch{return v||null;}}
function norm(u){return String(u||'').replace(/\/$/,'');}
function inspect(r, sitemapUrl){
  const html=r.body||'';
  const title=match(html,/<title[^>]*>([\s\S]*?)<\/title>/i);
  const description=match(html,/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["'][^>]*>/i)||match(html,/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["'][^>]*>/i);
  const robots=match(html,/<meta[^>]+name=["']robots["'][^>]+content=["']([^"']*)["'][^>]*>/i)||match(html,/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']robots["'][^>]*>/i);
  const canonicalRaw=match(html,/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["'][^>]*>/i)||match(html,/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["'][^>]*>/i);
  const canonical=canonicalRaw?abs(canonicalRaw,r.finalUrl):null;
  const h1Count=all(html,/<h1[^>]*>([\s\S]*?)<\/h1>/gi).length;
  const jsonLd=all(html,/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  let jsonLdInvalid=0; for(const x of jsonLd){try{JSON.parse(x);}catch{jsonLdInvalid++;}}
  const noindex=/(^|[,\s])noindex([,\s]|$)/i.test(robots||'');
  const issues=[];
  if(r.status!==200) issues.push(`http-${r.status}`);
  if(r.redirects.length) issues.push('redirect-in-sitemap');
  if(!title) issues.push('missing-title');
  if(!description) issues.push('missing-meta-description');
  if(noindex) issues.push('noindex-in-sitemap');
  if(!canonical) issues.push('missing-canonical');
  if(canonical && norm(canonical)!==norm(sitemapUrl)) issues.push('canonical-mismatch');
  if(h1Count!==1) issues.push(`h1-count-${h1Count}`);
  if(!jsonLd.length) issues.push('missing-jsonld');
  if(jsonLdInvalid) issues.push('invalid-jsonld');
  return {url:sitemapUrl,status:r.status,finalUrl:r.finalUrl,redirects:r.redirects,title,titleLength:title?.length||0,descriptionLength:description?.length||0,robots,canonical,h1Count,jsonLdCount:jsonLd.length,jsonLdInvalid,issues};
}
function parseLocs(xml){return [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map(m=>m[1].trim());}
async function mapLimit(items,limit,fn){const out=new Array(items.length);let i=0;async function worker(){while(true){const n=i++;if(n>=items.length)return;try{out[n]=await fn(items[n],n);}catch(e){out[n]={url:items[n],status:null,finalUrl:null,redirects:[],issues:[`request-error:${e.message}`]};}}}await Promise.all(Array.from({length:Math.min(limit,items.length)},worker));return out;}
(async()=>{
  const sitemapResponse=await request(`${ORIGIN}/sitemap.xml`);
  if(sitemapResponse.status!==200) throw new Error(`sitemap HTTP ${sitemapResponse.status}`);
  const urls=parseLocs(sitemapResponse.body);
  const unique=[...new Set(urls)];
  const foreign=unique.filter(u=>{try{return new URL(u).origin!==ORIGIN;}catch{return true;}});
  const pages=await mapLimit(unique,CONCURRENCY,async u=>inspect(await request(u),u));
  const dupTitles=Object.entries(pages.reduce((a,p)=>{if(p.title)(a[p.title]||=[]).push(p.url);return a;},{})).filter(([,v])=>v.length>1).map(([value,urls])=>({value,urls}));
  const canonicalTargets=pages.reduce((a,p)=>{if(p.canonical)(a[p.canonical]||=[]).push(p.url);return a;},{});
  const canonicalCollisions=Object.entries(canonicalTargets).filter(([,v])=>v.length>1).map(([canonical,urls])=>({canonical,urls}));
  const issueCounts={}; for(const p of pages)for(const issue of p.issues||[])issueCounts[issue]=(issueCounts[issue]||0)+1;
  const result={mse:'25.95',readOnly:true,writes:false,origin:ORIGIN,sitemap:{status:sitemapResponse.status,contentType:sitemapResponse.headers['content-type']||null,entries:urls.length,unique:unique.length,duplicates:urls.length-unique.length,foreignOrigins:foreign},summary:{audited:pages.length,http200:pages.filter(p=>p.status===200).length,clean:pages.filter(p=>!(p.issues||[]).length).length,withIssues:pages.filter(p=>(p.issues||[]).length).length,redirects:pages.filter(p=>p.redirects?.length).length,noindex:pages.filter(p=>p.issues?.includes('noindex-in-sitemap')).length,canonicalMissing:pages.filter(p=>p.issues?.includes('missing-canonical')).length,canonicalMismatch:pages.filter(p=>p.issues?.includes('canonical-mismatch')).length,jsonLdMissing:pages.filter(p=>p.issues?.includes('missing-jsonld')).length},issueCounts,duplicateTitles:dupTitles,canonicalCollisions,pages};
  process.stdout.write(JSON.stringify(result,null,2)+'\n');
})().catch(e=>{console.error(e);process.exit(1);});
