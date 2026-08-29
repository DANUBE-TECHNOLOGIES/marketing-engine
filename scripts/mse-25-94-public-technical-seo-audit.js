#!/usr/bin/env node
'use strict';

const https = require('https');
const { URL } = require('url');

const ORIGIN = process.env.MSE_25_94_ORIGIN || 'https://agences.mondescale.com';
const AGENCIES = [
  'ambassade-fram-mondescale-ozoir-la-ferriere',
  'ambassade-fram-mondescale-maurepas',
  'ambassade-fram-mondescale-nevers',
  'ambassade-fram-mondescale-dax',
  'ambassade-fram-mondescale-gien',
  'ambassade-fram-mondescale-bois-colombes',
  'mondescale-lamorlaye',
  'tui-store-melun',
  'tui-store-amilly',
];
const PAGE_SLUGS = ['', 'services', 'contact'];

function request(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'user-agent': 'Mondescale-MSE-25.94-ReadOnly-Audit/1.0', accept: 'text/html,application/xml;q=0.9,*/*;q=0.8' } }, res => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => body += chunk);
      res.on('end', async () => {
        if ([301,302,307,308].includes(res.statusCode) && res.headers.location && redirects < 5) {
          try { return resolve(await request(new URL(res.headers.location, url).toString(), redirects + 1)); }
          catch (e) { return reject(e); }
        }
        resolve({ url, finalUrl: url, status: res.statusCode, headers: res.headers, body, redirects });
      });
    });
    req.setTimeout(15000, () => req.destroy(new Error('timeout')));
    req.on('error', reject);
  });
}

function match(html, re) { const m = html.match(re); return m ? String(m[1] || '').trim() : null; }
function all(html, re) { return [...html.matchAll(re)].map(m => String(m[1] || '').trim()).filter(Boolean); }
function normalizeUrl(value, base) { try { return new URL(value, base).toString(); } catch { return value || null; } }
function inspectHtml(r) {
  const html = r.body || '';
  const title = match(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const description = match(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["'][^>]*>/i) || match(html, /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["'][^>]*>/i);
  const robots = match(html, /<meta[^>]+name=["']robots["'][^>]+content=["']([^"']*)["'][^>]*>/i) || match(html, /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']robots["'][^>]*>/i);
  const canonicalRaw = match(html, /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["'][^>]*>/i) || match(html, /<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["'][^>]*>/i);
  const h1s = all(html, /<h1[^>]*>([\s\S]*?)<\/h1>/gi).map(x => x.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim());
  const jsonLd = all(html, /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  let jsonLdValid = 0;
  const jsonLdTypes = [];
  for (const raw of jsonLd) {
    try {
      const parsed = JSON.parse(raw);
      jsonLdValid++;
      const stack = Array.isArray(parsed) ? parsed : [parsed];
      for (const x of stack) {
        if (x && x['@type']) jsonLdTypes.push(...(Array.isArray(x['@type']) ? x['@type'] : [x['@type']]));
        if (x && Array.isArray(x['@graph'])) for (const g of x['@graph']) if (g && g['@type']) jsonLdTypes.push(...(Array.isArray(g['@type']) ? g['@type'] : [g['@type']]));
      }
    } catch {}
  }
  const canonical = canonicalRaw ? normalizeUrl(canonicalRaw, r.url) : null;
  const noindex = /(^|[,\s])noindex([,\s]|$)/i.test(robots || '');
  const issues = [];
  if (r.status !== 200) issues.push(`http-${r.status}`);
  if (!title) issues.push('missing-title');
  if (!description) issues.push('missing-meta-description');
  if (!canonical) issues.push('missing-canonical');
  if (canonical && canonical.replace(/\/$/,'') !== r.url.replace(/\/$/,'')) issues.push('canonical-mismatch');
  if (noindex) issues.push('noindex');
  if (h1s.length !== 1) issues.push(`h1-count-${h1s.length}`);
  if (!jsonLd.length) issues.push('missing-jsonld');
  if (jsonLd.length !== jsonLdValid) issues.push('invalid-jsonld');
  return { status:r.status, title, titleLength:title?.length || 0, description, descriptionLength:description?.length || 0, robots, canonical, h1Count:h1s.length, h1:h1s[0] || null, jsonLdCount:jsonLd.length, jsonLdValid, jsonLdTypes:[...new Set(jsonLdTypes)], issues };
}

(async () => {
  const pages = [];
  for (const agency of AGENCIES) for (const slug of PAGE_SLUGS) {
    const url = `${ORIGIN}/agence/${agency}${slug ? `/${slug}` : ''}`;
    try { const r = await request(url); pages.push({ agency, slug: slug || 'home', url, ...inspectHtml(r) }); }
    catch (e) { pages.push({ agency, slug:slug || 'home', url, status:null, issues:[`request-error:${e.message}`] }); }
  }
  const endpoints = {};
  for (const path of ['/robots.txt','/sitemap.xml']) {
    try { const r = await request(`${ORIGIN}${path}`); endpoints[path] = { status:r.status, contentType:r.headers['content-type'] || null, body:r.body.slice(0,250000) }; }
    catch (e) { endpoints[path] = { status:null, error:e.message, body:'' }; }
  }
  const sitemapBody = endpoints['/sitemap.xml']?.body || '';
  for (const p of pages) p.inSitemap = sitemapBody.includes(p.url);
  const duplicateTitles = Object.entries(pages.reduce((a,p)=>{ if(p.title) (a[p.title] ||= []).push(p.url); return a; },{})).filter(([,v])=>v.length>1).map(([title,urls])=>({title,urls}));
  const duplicateDescriptions = Object.entries(pages.reduce((a,p)=>{ if(p.description) (a[p.description] ||= []).push(p.url); return a; },{})).filter(([,v])=>v.length>1).map(([description,urls])=>({description,urls}));
  const result = {
    mse:'25.94', readOnly:true, writes:false, origin:ORIGIN, auditedPages:pages.length,
    pages, endpoints:{ robots:{...endpoints['/robots.txt'], body:undefined}, sitemap:{...endpoints['/sitemap.xml'], body:undefined}},
    sitemap:{ urlsFound:(sitemapBody.match(/<loc>/g)||[]).length, auditedPagesPresent:pages.filter(p=>p.inSitemap).length, auditedPagesMissing:pages.filter(p=>!p.inSitemap).map(p=>p.url) },
    duplicates:{ titles:duplicateTitles, descriptions:duplicateDescriptions },
    summary:{ http200:pages.filter(p=>p.status===200).length, clean:pages.filter(p=>!p.issues?.length).length, withIssues:pages.filter(p=>p.issues?.length).length, noindex:pages.filter(p=>p.issues?.includes('noindex')).length, canonicalMissing:pages.filter(p=>p.issues?.includes('missing-canonical')).length, canonicalMismatch:pages.filter(p=>p.issues?.includes('canonical-mismatch')).length, jsonLdMissing:pages.filter(p=>p.issues?.includes('missing-jsonld')).length }
  };
  process.stdout.write(JSON.stringify(result,null,2)+'\n');
})().catch(e => { console.error(e); process.exit(1); });
