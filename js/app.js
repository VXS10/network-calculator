/* ===================================================================
   APP CORE — state, storage, routing, theme/lang, validation, history
   =================================================================== */

const STORAGE_KEYS = {
  settings: 'netcalc_settings',
  history: 'netcalc_history'
};

const AppState = {
  settings: { theme:'dark', lang:'en' },
  history: [],
  currentPage: 'home'
};

/* ---------------- Storage ---------------- */

function loadSettings(){
  try{
    const raw = localStorage.getItem(STORAGE_KEYS.settings);
    if(raw) AppState.settings = { ...AppState.settings, ...JSON.parse(raw) };
  }catch(e){ /* ignore corrupt storage */ }
}
function saveSettings(){
  try{ localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(AppState.settings)); }catch(e){}
}
function loadHistory(){
  try{
    const raw = localStorage.getItem(STORAGE_KEYS.history);
    AppState.history = raw ? JSON.parse(raw) : [];
  }catch(e){ AppState.history = []; }
}
function saveHistory(){
  try{ localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(AppState.history)); }catch(e){}
}

function addHistory(tool, inputs, results){
  AppState.history.unshift({
    id: Date.now() + '-' + Math.random().toString(36).slice(2,7),
    tool, inputs, results,
    time: new Date().toISOString()
  });
  if(AppState.history.length > 200) AppState.history.length = 200;
  saveHistory();
}

/* ---------------- Theme / Language ---------------- */

function applyTheme(){
  document.documentElement.setAttribute('data-theme', AppState.settings.theme);
}
function applyLang(){
  const lang = AppState.settings.lang;
  document.documentElement.setAttribute('lang', lang === 'ar' ? 'ar' : 'en');
  document.documentElement.setAttribute('dir', I18N[lang].dir);
  translateDOM();
}
function toggleTheme(){
  AppState.settings.theme = AppState.settings.theme === 'dark' ? 'light' : 'dark';
  saveSettings(); applyTheme(); renderSettingsPage();
}
function toggleLang(){
  AppState.settings.lang = AppState.settings.lang === 'en' ? 'ar' : 'en';
  saveSettings(); applyLang(); renderSettingsPage();
  // re-render current page results/labels that are JS-generated
  refreshCurrentPageChrome();
}

function translateDOM(){
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.getAttribute('data-i18n'));
  });
  document.querySelectorAll('[data-i18n-ph]').forEach(el => {
    el.setAttribute('placeholder', t(el.getAttribute('data-i18n-ph')));
  });
}

function refreshCurrentPageChrome(){
  // Re-render nav labels & page head; leave live results as-is (already computed)
  buildSidebarNav();
  highlightActiveNav(AppState.currentPage);
}

/* ---------------- Toast ---------------- */

let toastTimer = null;
function showToast(msg){
  const el = document.getElementById('toast');
  el.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg><span>${msg}</span>`;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=> el.classList.remove('show'), 2200);
}

function copyText(text){
  if(navigator.clipboard && window.isSecureContext){
    navigator.clipboard.writeText(text).then(()=>showToast(t('toast_copied')));
  } else {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position='fixed'; ta.style.opacity='0';
    document.body.appendChild(ta); ta.select();
    try{ document.execCommand('copy'); showToast(t('toast_copied')); }catch(e){}
    document.body.removeChild(ta);
  }
}

/* ---------------- Validation helpers ---------------- */

function setFieldError(inputEl, msg){
  inputEl.classList.add('error');
  const err = inputEl.closest('.field')?.querySelector('.field-error');
  if(err){ err.textContent = msg; err.classList.add('show'); }
}
function clearFieldError(inputEl){
  inputEl.classList.remove('error');
  const err = inputEl.closest('.field')?.querySelector('.field-error');
  if(err){ err.classList.remove('show'); }
}
function clearAllErrors(container){
  container.querySelectorAll('.field input, .field select').forEach(clearFieldError);
}

/* ---------------- Routing ---------------- */

const ROUTES = ['home','ip','subnet','cidr','vlsm','range','mask','wildcard','analyzer','ipv6','converter','viz','history','basics','settings'];

function navigate(page, opts={}){
  if(!ROUTES.includes(page)) page = 'home';
  AppState.currentPage = page;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const el = document.getElementById('page-' + page);
  if(el) el.classList.add('active');
  highlightActiveNav(page);
  closeMobileSidebar();
  if(!opts.skipHash) window.location.hash = page;
  window.scrollTo({top:0, behavior:'instant'});

  // page-specific refresh
  if(page === 'history') renderHistoryPage();
  if(page === 'settings') renderSettingsPage();
}

function highlightActiveNav(page){
  document.querySelectorAll('.nav-item').forEach(n=>{
    n.classList.toggle('active', n.dataset.page === page);
  });
}

function closeMobileSidebar(){
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('show');
}

/* ---------------- Share links ---------------- */

function buildShareHash(tool, params){
  const p = new URLSearchParams(params);
  return `#share/${tool}?${p.toString()}`;
}
function copyShareLink(tool, params){
  const url = `${location.origin}${location.pathname}${buildShareHash(tool, params)}`;
  copyText(url);
  showToast(t('toast_link_copied'));
}
function parseShareHash(){
  const hash = window.location.hash;
  if(hash.startsWith('#share/')){
    const rest = hash.slice(7);
    const [tool, qs] = rest.split('?');
    const params = Object.fromEntries(new URLSearchParams(qs || ''));
    return { tool, params };
  }
  return null;
}

/* ---------------- Export helpers ---------------- */

function downloadFile(filename, content, mime){
  const blob = new Blob([content], {type: mime});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function resultsToCSV(results){
  const rows = [['Field','Value']];
  Object.entries(results).forEach(([k,v]) => rows.push([k, String(v)]));
  return rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
}

function resultsToJSON(results){
  return JSON.stringify(results, null, 2);
}

/* ---------------- Init ---------------- */

document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  loadHistory();
  applyTheme();
  applyLang();
  buildSidebarNav();
  bindGlobalUI();
  initHomePage();
  initAllTools();
  renderBasicsPage();

  // routing: share link takes priority, then hash, then home
  const shared = parseShareHash();
  if(shared){
    handleSharedLink(shared);
  } else {
    const initial = window.location.hash.replace('#','') || 'home';
    navigate(ROUTES.includes(initial) ? initial : 'home', {skipHash:true});
  }

  window.addEventListener('hashchange', () => {
    const shared2 = parseShareHash();
    if(shared2){ handleSharedLink(shared2); return; }
    const p = window.location.hash.replace('#','') || 'home';
    if(ROUTES.includes(p)) navigate(p, {skipHash:true});
  });
});

function bindGlobalUI(){
  document.getElementById('hamburger').addEventListener('click', () => {
    document.getElementById('sidebar').classList.add('open');
    document.getElementById('sidebarOverlay').classList.add('show');
  });
  document.getElementById('sidebarOverlay').addEventListener('click', closeMobileSidebar);

  document.getElementById('themeBtn').addEventListener('click', toggleTheme);
  document.getElementById('langBtn').addEventListener('click', toggleLang);

  document.getElementById('sidebarSearchInput').addEventListener('input', (e) => {
    performSearch(e.target.value);
  });
}

/* ---------------- Sidebar nav build ---------------- */

const NAV_ITEMS = [
  { page:'home', icon:'home', key:'nav_home', group:null },
  { page:'ip', icon:'ip', key:'nav_ip', group:'tools' },
  { page:'subnet', icon:'subnet', key:'nav_subnet', group:'tools' },
  { page:'cidr', icon:'cidr', key:'nav_cidr', group:'tools' },
  { page:'vlsm', icon:'vlsm', key:'nav_vlsm', group:'tools' },
  { page:'range', icon:'range', key:'nav_range', group:'tools' },
  { page:'mask', icon:'mask', key:'nav_mask', group:'tools' },
  { page:'wildcard', icon:'wildcard', key:'nav_wildcard', group:'tools' },
  { page:'analyzer', icon:'analyzer', key:'nav_analyzer', group:'tools' },
  { page:'ipv6', icon:'ipv6', key:'nav_ipv6', group:'tools' },
  { page:'converter', icon:'converter', key:'nav_converter', group:'tools' },
  { page:'viz', icon:'viz', key:'nav_viz', group:'other' },
  { page:'history', icon:'history', key:'nav_history', group:'other' },
  { page:'basics', icon:'basics', key:'nav_basics', group:'other' },
  { page:'settings', icon:'settings', key:'nav_settings', group:'other' },
];

function navIcon(name){
  const icons = {
    home: '<path d="M3 10.5L12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 001 1h4v-6h4v6h4a1 1 0 001-1V9.5"/>',
    ip: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 10h2M7 14h2M15 10h2M15 14h2"/>',
    subnet: '<circle cx="12" cy="5" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/><path d="M12 7v5M12 12L6 17.5M12 12l6 5.5"/>',
    cidr: '<path d="M4 4h16v6H4zM4 14h10v6H4z"/>',
    vlsm: '<path d="M3 5h18M3 12h12M3 19h7"/>',
    range: '<path d="M5 12h14M5 12l4-4M5 12l4 4M19 12l-4-4M19 12l-4 4"/>',
    mask: '<path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z"/>',
    wildcard: '<path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6L5.6 18.4"/>',
    analyzer: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
    ipv6: '<path d="M4 6h16M4 12h16M4 18h10"/>',
    converter: '<path d="M7 7h11l-3-3M17 17H6l3 3M7 7v10M17 7v10" fill="none"/>',
    viz: '<circle cx="12" cy="4" r="2"/><circle cx="5" cy="18" r="2"/><circle cx="19" cy="18" r="2"/><path d="M12 6v6M12 12l-6 6M12 12l6 6"/>',
    history: '<path d="M3 12a9 9 0 109-9"/><path d="M3 4v5h5"/><path d="M12 7v5l4 2"/>',
    basics: '<path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 005 15c.1-.31.1-.65 0-.96.05-.32-.02-.65-.19-.93l-.06-.06a2 2 0 112.83-2.83l.06.06c.28.17.6.24.93.19.31-.1.65-.1.96 0A1.65 1.65 0 009 9.6a1.65 1.65 0 001-1.51V8a2 2 0 014 0v.09c0 .68.4 1.28 1 1.51.32.1.65.1.96 0 .32.05.65-.02.93-.19l.06-.06a2 2 0 112.83 2.83l-.06.06c-.28.28-.35.6-.19.93z"/>'
  };
  return icons[name] || icons.home;
}

function buildSidebarNav(){
  const nav = document.getElementById('navContainer');
  let html = '';
  let lastGroup = null;
  NAV_ITEMS.forEach(item => {
    if(item.group && item.group !== lastGroup){
      const label = item.group === 'tools' ? t('nav_group_tools') : t('nav_group_other');
      html += `<div class="nav-group-label">${label}</div>`;
      lastGroup = item.group;
    }
    html += `<div class="nav-item" data-page="${item.page}" tabindex="0" role="button" aria-label="${t(item.key)}">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${navIcon(item.icon)}</svg>
      <span>${t(item.key)}</span>
    </div>`;
  });
  nav.innerHTML = html;
  nav.querySelectorAll('.nav-item').forEach(el => {
    el.addEventListener('click', () => navigate(el.dataset.page));
    el.addEventListener('keydown', (e) => { if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); navigate(el.dataset.page);} });
  });
  highlightActiveNav(AppState.currentPage);
}

/* ---------------- Search ---------------- */

const SEARCH_INDEX = [
  {page:'ip', en:'IP Calculator IPv4 address network broadcast', ar:'حاسبة IP عنوان الشبكة البث'},
  {page:'subnet', en:'Subnet Calculator subnetting subnets hosts', ar:'حاسبة الشبكات الفرعية تقسيم'},
  {page:'cidr', en:'CIDR Calculator prefix notation', ar:'حاسبة سي آي دي آر البادئة'},
  {page:'vlsm', en:'VLSM Calculator variable length subnet mask', ar:'حاسبة في ال اس ام'},
  {page:'range', en:'IP Range Calculator start end', ar:'حاسبة نطاق العناوين'},
  {page:'mask', en:'Subnet Mask Calculator', ar:'حاسبة قناع الشبكة'},
  {page:'wildcard', en:'Wildcard Mask Calculator ACL', ar:'حاسبة وايلد كارد'},
  {page:'analyzer', en:'IPv4 Analyzer class private public loopback multicast', ar:'محلل آي بي في4 فئة خاص عام'},
  {page:'ipv6', en:'IPv6 Calculator compressed prefix', ar:'حاسبة آي بي في6'},
  {page:'converter', en:'Number Converter binary decimal hex', ar:'محول الأرقام ثنائي عشري سداسي'},
  {page:'viz', en:'Network Visualization diagram tree', ar:'تصور الشبكة رسم بياني'},
  {page:'basics', en:'Networking Basics DNS DHCP NAT MAC OSI TCP UDP gateway', ar:'أساسيات الشبكات دي ان اس دي اتش سي بي'},
  {page:'history', en:'History saved calculations', ar:'السجل المحفوظات'},
  {page:'settings', en:'Settings dark mode language', ar:'الإعدادات المظهر اللغة'},
];

function performSearch(query){
  const box = document.getElementById('searchResultsBox');
  if(!box) return;
  query = query.trim().toLowerCase();
  if(!query){ box.classList.remove('show'); box.innerHTML=''; return; }
  const lang = AppState.settings.lang;
  const matches = SEARCH_INDEX.filter(item => {
    const hay = (item.en + ' ' + item.ar).toLowerCase();
    return hay.includes(query);
  });
  if(matches.length === 0){
    box.innerHTML = `<div class="search-empty">${t('state_empty_search')}</div>`;
  } else {
    box.innerHTML = matches.map(m => {
      const navItem = NAV_ITEMS.find(n=>n.page===m.page);
      return `<div class="search-result-item" data-page="${m.page}">${t(navItem.key)}</div>`;
    }).join('');
    box.querySelectorAll('.search-result-item').forEach(el=>{
      el.addEventListener('click', ()=>{
        navigate(el.dataset.page);
        document.getElementById('sidebarSearchInput').value = '';
        box.classList.remove('show'); box.innerHTML='';
      });
    });
  }
  box.classList.add('show');
}

/* ---------------- Home page ---------------- */

function initHomePage(){
  const grid = document.getElementById('homeToolGrid');
  const items = NAV_ITEMS.filter(i => i.group === 'tools');
  grid.innerHTML = items.map(item => `
    <div class="tool-card" data-page="${item.page}" tabindex="0" role="button">
      <div class="tool-card-icon">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${navIcon(item.icon)}</svg>
      </div>
      <h3 data-i18n="${item.key}">${t(item.key)}</h3>
      <p>${homeToolDesc(item.page)}</p>
    </div>
  `).join('');
  grid.querySelectorAll('.tool-card').forEach(el=>{
    el.addEventListener('click', ()=>navigate(el.dataset.page));
    el.addEventListener('keydown', (e)=>{ if(e.key==='Enter') navigate(el.dataset.page); });
  });
}

function homeToolDesc(page){
  const descs = {
    ip:'Network, broadcast, host range & more', subnet:'Split a network into equal subnets',
    cidr:'Parse IP/prefix notation instantly', vlsm:'Allocate subnets by host requirements',
    range:'Analyze an arbitrary IP address range', mask:'Convert between CIDR and dotted mask',
    wildcard:'Compute ACL wildcard masks', analyzer:'Classify any IPv4 address',
    ipv6:'Expand, compress & classify IPv6', converter:'Binary, decimal, hex & IPv4'
  };
  return descs[page] || '';
}

function handleSharedLink(shared){
  navigate(shared.tool, {skipHash:true});
  setTimeout(()=> applySharedParams(shared.tool, shared.params), 50);
}
