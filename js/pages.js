/* ===================================================================
   PAGES — History, Settings, Networking Basics
   =================================================================== */

/* ---------------- History Page ---------------- */

function formatHistoryDetail(item){
  const i = item.inputs || {};
  switch(item.tool){
    case 'IP Calculator': return `${i.ip}/${i.cidr}`;
    case 'Subnet Calculator': return `${i.networkIp}/${i.baseCidr} → /${i.newCidr}`;
    case 'CIDR Calculator': return i.input;
    case 'VLSM Calculator': return `${i.networkIp}/${i.baseCidr} (${(i.requirements||[]).length} subnets)`;
    case 'IP Range Calculator': return `${i.start} – ${i.end}`;
    case 'Subnet Mask Calculator': return i.mask ? i.mask : `/${i.cidr}`;
    case 'Wildcard Mask Calculator': return i.mask;
    case 'IPv4 Analyzer': return i.ip;
    case 'IPv6 Calculator': return i.input + (i.prefix ? '/'+i.prefix : '');
    default: return JSON.stringify(i);
  }
}

function renderHistoryPage(){
  const container = document.getElementById('historyList');
  const emptyState = document.getElementById('historyEmptyState');
  const clearBtn = document.getElementById('history_clear_btn');

  if(AppState.history.length === 0){
    container.innerHTML = '';
    emptyState.classList.remove('hidden');
    clearBtn.classList.add('hidden');
    return;
  }
  emptyState.classList.add('hidden');
  clearBtn.classList.remove('hidden');

  container.innerHTML = AppState.history.map(item => {
    const date = new Date(item.time);
    const timeStr = date.toLocaleString(AppState.settings.lang === 'ar' ? 'ar' : 'en-US', { dateStyle:'medium', timeStyle:'short' });
    return `
    <div class="history-item" data-id="${item.id}">
      <div class="history-info">
        <div class="history-tool">${item.tool}</div>
        <div class="history-detail">${formatHistoryDetail(item)}</div>
        <div class="history-time">${timeStr}</div>
      </div>
      <div class="history-actions">
        <button class="btn btn-sm hist-view-btn" data-id="${item.id}">${t('view_btn')}</button>
        <button class="btn btn-sm hist-copy-btn" data-id="${item.id}">${t('copy_btn')}</button>
        <button class="btn btn-sm btn-danger hist-del-btn" data-id="${item.id}">${t('delete_btn')}</button>
      </div>
    </div>`;
  }).join('');

  container.querySelectorAll('.hist-view-btn').forEach(b => b.addEventListener('click', () => historyViewItem(b.dataset.id)));
  container.querySelectorAll('.hist-copy-btn').forEach(b => b.addEventListener('click', () => historyCopyItem(b.dataset.id)));
  container.querySelectorAll('.hist-del-btn').forEach(b => b.addEventListener('click', () => historyDeleteItem(b.dataset.id)));

  clearBtn.onclick = () => {
    AppState.history = [];
    saveHistory();
    renderHistoryPage();
    showToast(t('toast_history_cleared'));
  };
}

function historyViewItem(id){
  const item = AppState.history.find(h => h.id === id);
  if(!item) return;
  const win = document.getElementById('historyDetailModal');
  document.getElementById('historyDetailTitle').textContent = item.tool;
  document.getElementById('historyDetailBody').innerHTML = `
    <div class="card-title" style="margin-top:0;">Inputs</div>
    <pre class="mono" style="white-space:pre-wrap; font-size:12px; color:var(--text-dim); background:var(--bg-alt); padding:12px; border-radius:6px; border:1px solid var(--border-soft);">${JSON.stringify(item.inputs, null, 2)}</pre>
    <div class="card-title" style="margin-top:16px;">Results</div>
    <pre class="mono" style="white-space:pre-wrap; font-size:12px; color:var(--text-dim); background:var(--bg-alt); padding:12px; border-radius:6px; border:1px solid var(--border-soft);">${JSON.stringify(item.results, null, 2)}</pre>
  `;
  win.classList.add('show');
}
function closeHistoryModal(){
  document.getElementById('historyDetailModal').classList.remove('show');
}
function historyCopyItem(id){
  const item = AppState.history.find(h => h.id === id);
  if(!item) return;
  copyText(JSON.stringify({inputs:item.inputs, results:item.results}, null, 2));
}
function historyDeleteItem(id){
  AppState.history = AppState.history.filter(h => h.id !== id);
  saveHistory();
  renderHistoryPage();
  showToast(t('toast_deleted'));
}

/* ---------------- Settings Page ---------------- */

function renderSettingsPage(){
  const themeToggle = document.getElementById('settingsThemeToggle');
  const langSeg = document.getElementById('settingsLangSeg');
  if(!themeToggle) return;

  themeToggle.classList.toggle('on', AppState.settings.theme === 'dark');
  themeToggle.onclick = () => toggleTheme();

  langSeg.querySelectorAll('.seg-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === AppState.settings.lang);
    btn.onclick = () => {
      if(AppState.settings.lang !== btn.dataset.lang){ toggleLang(); }
    };
  });

  document.getElementById('settingsHistoryCount').textContent = AppState.history.length;

  document.getElementById('settings_clear_history_btn').onclick = () => {
    AppState.history = [];
    saveHistory();
    renderSettingsPage();
    showToast(t('toast_history_cleared'));
  };

  document.getElementById('settings_reset_btn').onclick = () => {
    AppState.settings = { theme:'dark', lang:'en' };
    saveSettings();
    applyTheme(); applyLang();
    refreshCurrentPageChrome();
    renderSettingsPage();
    showToast(t('toast_settings_reset'));
  };
}

/* ---------------- Networking Basics Page ---------------- */

const BASICS_TOPICS = [
  {
    id:'ipaddr', title:'IP Address',
    def:'A unique numerical label assigned to every device on a network so it can send and receive data.',
    body:`<h4>Explanation</h4><p>Every device that communicates on a network — a laptop, phone, printer, or server — needs an address so other devices know where to send data. An IP address works like a postal address for the internet.</p>
    <h4>Example</h4><p><code>192.168.1.10</code> is a typical home-network IP address.</p>`,
    terms:['Host','Endpoint','Address space']
  },
  {
    id:'ipv4', title:'IPv4',
    def:'The fourth version of the Internet Protocol, using 32-bit addresses written as four decimal numbers separated by dots.',
    body:`<h4>Explanation</h4><p>IPv4 addresses are 32 bits long, split into four 8-bit sections called octets, each ranging from 0–255. This gives about 4.3 billion possible addresses — a number the internet has since outgrown, which is part of why IPv6 exists.</p>
    <h4>Example</h4><p><code>10.0.0.1</code>, <code>172.16.5.20</code>, <code>203.0.113.7</code></p>`,
    terms:['Octet','32-bit','Dotted decimal']
  },
  {
    id:'ipv6', title:'IPv6',
    def:'The newest version of the Internet Protocol, using 128-bit addresses to provide a vastly larger address space than IPv4.',
    body:`<h4>Explanation</h4><p>IPv6 addresses are written as eight groups of four hexadecimal digits, separated by colons. Consecutive groups of zeros can be compressed with <code>::</code> once per address.</p>
    <h4>Example</h4><p><code>2001:0db8:0000:0000:0000:0000:0000:0001</code> compresses to <code>2001:db8::1</code></p>`,
    terms:['128-bit','Hextet','Compression']
  },
  {
    id:'mask', title:'Subnet Mask',
    def:'A 32-bit number that separates an IP address into its network portion and host portion.',
    body:`<h4>Explanation</h4><p>The subnet mask tells devices which part of an IP address identifies the network and which part identifies the specific host. Bits set to 1 mark the network portion; bits set to 0 mark the host portion.</p>
    <h4>Example</h4><p><code>255.255.255.0</code> means the first 24 bits are the network, leaving 8 bits (254 usable addresses) for hosts.</p>`,
    terms:['Network bits','Host bits','Dotted decimal mask']
  },
  {
    id:'cidr', title:'CIDR',
    def:'Classless Inter-Domain Routing — a compact notation that expresses a subnet mask as a slash followed by the number of network bits.',
    body:`<h4>Explanation</h4><p>Instead of writing out a full subnet mask, CIDR notation appends <code>/n</code> to an IP address, where <code>n</code> is the number of leading 1-bits in the mask. This makes addressing more flexible than the old class-based system.</p>
    <h4>Example</h4><p><code>192.168.1.0/24</code> is equivalent to a subnet mask of <code>255.255.255.0</code>.</p>`,
    terms:['Prefix length','Classless addressing','Slash notation']
  },
  {
    id:'subnetting', title:'Subnetting',
    def:'The practice of dividing a larger network into smaller, more manageable sub-networks.',
    body:`<h4>Explanation</h4><p>Subnetting borrows bits from the host portion of an address to create multiple smaller networks. This improves security, reduces broadcast traffic, and makes efficient use of address space.</p>
    <h4>Example</h4><p>Splitting <code>192.168.1.0/24</code> into four <code>/26</code> subnets, each with 62 usable hosts.</p>`,
    terms:['Subnet','Broadcast domain','Host range']
  },
  {
    id:'vlsm', title:'VLSM',
    def:'Variable Length Subnet Masking — subnetting a network into subnets of different sizes based on actual host requirements.',
    body:`<h4>Explanation</h4><p>Unlike basic subnetting where every subnet is the same size, VLSM allows different subnet masks for different subnets within the same network, minimizing wasted addresses.</p>
    <h4>Example</h4><p>A department needing 50 hosts gets a <code>/26</code>, while a point-to-point link needing only 2 hosts gets a <code>/30</code> or <code>/31</code> — all carved from the same parent block.</p>`,
    terms:['Address efficiency','Hierarchical addressing','Route summarization']
  },
  {
    id:'gateway', title:'Default Gateway',
    def:'The router or device on a local network that traffic is sent to when the destination is outside the local subnet.',
    body:`<h4>Explanation</h4><p>When a device needs to reach an address outside its own subnet, it forwards the traffic to its default gateway, which then routes it toward the destination network.</p>
    <h4>Example</h4><p>A home router at <code>192.168.1.1</code> commonly serves as the default gateway for devices on that network.</p>`,
    terms:['Router','Next hop','Routing table']
  },
  {
    id:'dns', title:'DNS',
    def:'Domain Name System — translates human-readable domain names into IP addresses.',
    body:`<h4>Explanation</h4><p>Computers communicate using IP addresses, but people prefer names. DNS acts as the internet's phonebook, resolving names like <code>example.com</code> into the numeric addresses computers use to connect.</p>
    <h4>Example</h4><p>Typing <code>example.com</code> in a browser triggers a DNS lookup that might return <code>93.184.216.34</code>.</p>`,
    terms:['Resolver','A record','Name server']
  },
  {
    id:'dhcp', title:'DHCP',
    def:'Dynamic Host Configuration Protocol — automatically assigns IP addresses and network settings to devices.',
    body:`<h4>Explanation</h4><p>Rather than manually configuring every device, DHCP servers lease IP addresses, subnet masks, gateways, and DNS servers automatically when a device joins the network.</p>
    <h4>Example</h4><p>A laptop connecting to Wi-Fi receives an address like <code>192.168.1.42</code> automatically from the router's DHCP service.</p>`,
    terms:['Lease','DORA process','Scope']
  },
  {
    id:'nat', title:'NAT',
    def:'Network Address Translation — allows multiple devices on a private network to share a single public IP address.',
    body:`<h4>Explanation</h4><p>NAT rewrites the source address of outgoing packets from a private IP to a shared public IP (and back again for replies), conserving public IPv4 addresses and hiding internal network structure.</p>
    <h4>Example</h4><p>Every device in a home network shares the one public IP address assigned by the ISP.</p>`,
    terms:['Port forwarding','PAT','Private-to-public mapping']
  },
  {
    id:'mac', title:'MAC Address',
    def:'A unique hardware identifier burned into a device\'s network interface, used for communication on the local network segment.',
    body:`<h4>Explanation</h4><p>While IP addresses can change, a MAC address is (in principle) permanently tied to the network hardware. It operates at Layer 2 and is used for delivering frames within a local network.</p>
    <h4>Example</h4><p><code>00:1A:2B:3C:4D:5E</code> — six pairs of hexadecimal digits.</p>`,
    terms:['Layer 2','NIC','ARP']
  },
  {
    id:'tcpudp', title:'TCP / UDP',
    def:'The two core transport-layer protocols: TCP guarantees reliable, ordered delivery; UDP is faster but does not guarantee delivery.',
    body:`<h4>Explanation</h4><p>TCP establishes a connection and confirms every packet arrives correctly and in order — ideal for web pages and file transfers. UDP sends data without these guarantees, favoring speed — ideal for video calls and gaming.</p>
    <h4>Example</h4><p>Web browsing uses TCP; live video streaming often uses UDP.</p>`,
    terms:['Three-way handshake','Connectionless','Reliability']
  },
  {
    id:'ports', title:'Ports',
    def:'Numbered endpoints (0–65535) that let a single IP address handle many simultaneous network conversations.',
    body:`<h4>Explanation</h4><p>A port number identifies which application or service on a device a piece of traffic belongs to. Well-known ports are reserved for common services.</p>
    <h4>Example</h4><p>Port <code>80</code> for HTTP, port <code>443</code> for HTTPS, port <code>22</code> for SSH.</p>`,
    terms:['Well-known ports','Socket','Ephemeral port']
  },
  {
    id:'pubpriv', title:'Public / Private IP',
    def:'Public IPs are globally routable on the internet; private IPs are reserved for use inside local networks only.',
    body:`<h4>Explanation</h4><p>Private address ranges are not routed on the public internet, so many organizations can reuse the same private ranges internally without conflict. NAT bridges private networks to the public internet.</p>
    <h4>Example</h4><p>Private ranges: <code>10.0.0.0/8</code>, <code>172.16.0.0/12</code>, <code>192.168.0.0/16</code>.</p>`,
    terms:['RFC 1918','Routable','Reserved range']
  },
  {
    id:'osi', title:'OSI Model',
    def:'A seven-layer conceptual framework describing how network communication happens, from physical cables to applications.',
    body:`<h4>Explanation</h4><p>The OSI model breaks networking into seven layers: Physical, Data Link, Network, Transport, Session, Presentation, and Application — each with a specific job.</p>
    <h4>Example</h4><p>IP addressing happens at the Network layer (Layer 3); MAC addressing at the Data Link layer (Layer 2).</p>`,
    terms:['7 layers','Encapsulation','Layer 3']
  },
  {
    id:'tcpip', title:'TCP/IP Model',
    def:'A simplified four-layer model (Link, Internet, Transport, Application) that describes how the internet actually operates.',
    body:`<h4>Explanation</h4><p>The TCP/IP model is the practical framework the internet is built on, condensing OSI's seven layers into four: Network Access, Internet, Transport, and Application.</p>
    <h4>Example</h4><p>IP operates at the Internet layer; TCP and UDP operate at the Transport layer.</p>`,
    terms:['4 layers','Internet layer','Practical model']
  },
];

function renderBasicsPage(){
  const container = document.getElementById('basicsList');
  container.innerHTML = BASICS_TOPICS.map(topic => `
    <div class="card topic-card" id="topic-${topic.id}">
      <div class="topic-head" data-id="${topic.id}">
        <h3>${topic.title}</h3>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>
      </div>
      <p class="text-dim" style="font-size:13px; margin-top:4px;">${topic.def}</p>
      <div class="topic-body">
        ${topic.body}
        <div class="term-tags">${topic.terms.map(term => `<span class="term-tag">${term}</span>`).join('')}</div>
      </div>
    </div>
  `).join('');

  container.querySelectorAll('.topic-head').forEach(head => {
    head.addEventListener('click', () => {
      head.closest('.topic-card').classList.toggle('open');
    });
  });
}

function openBasicsTopic(id){
  navigate('basics');
  setTimeout(() => {
    const card = document.getElementById('topic-' + id);
    if(card){
      card.classList.add('open');
      card.scrollIntoView({behavior:'smooth', block:'start'});
    }
  }, 60);
}
