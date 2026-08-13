/* ===================================================================
   TOOLS — all calculator UIs wired to NetMath
   =================================================================== */

function initAllTools(){
  initIPTool();
  initSubnetTool();
  initCIDRTool();
  initVLSMTool();
  initRangeTool();
  initMaskTool();
  initWildcardTool();
  initAnalyzerTool();
  initIPv6Tool();
  initConverterTool();
  initVizTool();
}

function applySharedParams(tool, params){
  const setVal = (id, val) => { const el = document.getElementById(id); if(el && val!==undefined) el.value = val; };
  if(tool === 'ip'){ setVal('ip_addr', params.ip); setVal('ip_cidr', params.cidr); document.getElementById('ip_calc_btn').click(); }
  if(tool === 'subnet'){ setVal('sub_net', params.net); setVal('sub_cidr', params.cidr); setVal('sub_newcidr', params.newcidr); document.getElementById('sub_calc_btn').click(); }
  if(tool === 'cidr'){ setVal('cidr_input', params.v); document.getElementById('cidr_calc_btn').click(); }
  if(tool === 'range'){ setVal('range_start', params.start); setVal('range_end', params.end); document.getElementById('range_calc_btn').click(); }
  if(tool === 'mask'){ setVal('mask_cidr_input', params.cidr); document.getElementById('mask_calc_btn').click(); }
  if(tool === 'wildcard'){ setVal('wc_mask_input', params.mask); document.getElementById('wc_calc_btn').click(); }
  if(tool === 'analyzer'){ setVal('an_ip', params.ip); document.getElementById('an_calc_btn').click(); }
  if(tool === 'ipv6'){ setVal('v6_input', params.v); document.getElementById('v6_calc_btn').click(); }
}

/* helper to render a grid of result items */
function renderResultGrid(container, items){
  // items: [{label, value, cls}]
  container.innerHTML = items.map(it => `
    <div class="result-item ${it.cls||''}">
      <div class="result-label">${it.label}</div>
      <div class="result-value">
        <span>${it.value}</span>
        <span class="copy-mini" data-copy="${String(it.value).replace(/"/g,'&quot;')}" title="${t('copy_btn')}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
        </span>
      </div>
    </div>
  `).join('');
  container.querySelectorAll('.copy-mini').forEach(el => {
    el.addEventListener('click', () => copyText(el.dataset.copy));
  });
}

/* render bit-grid visualization for an IPv4 (signature element) */
function renderBitGrid(container, ip, cidr){
  const octets = ip.split('.').map(Number);
  const maskBits = cidr;
  let bitIndex = 0;
  const octetsHtml = octets.map((oct) => {
    const bits = oct.toString(2).padStart(8,'0').split('');
    const cellsHtml = bits.map(b => {
      const isNet = bitIndex < maskBits;
      bitIndex++;
      const cls = b === '1' ? `on ${isNet ? 'net' : 'host'}` : '';
      return `<div class="bit-cell ${cls}"></div>`;
    }).join('');
    return `<div class="bitgrid-octet">
      <div class="bitgrid-octet-label">${oct}</div>
      <div class="bitgrid-bits">${cellsHtml}</div>
    </div>`;
  }).join('');

  container.innerHTML = `
    <div class="bitgrid-title"><span>BIT MAP</span><span>/${cidr}</span></div>
    <div class="bitgrid">${octetsHtml}</div>
    <div class="bitgrid-legend">
      <span><span class="legend-dot" style="background:var(--accent)"></span>Network bits</span>
      <span><span class="legend-dot" style="background:var(--blue)"></span>Host bits</span>
    </div>
  `;
}

/* ===================================================================
   2.1 — IP CALCULATOR
   =================================================================== */

function initIPTool(){
  const ipInput = document.getElementById('ip_addr');
  const cidrInput = document.getElementById('ip_cidr');
  const btn = document.getElementById('ip_calc_btn');
  const resetBtn = document.getElementById('ip_reset_btn');
  const resultPanel = document.getElementById('ip_result_panel');
  const emptyState = document.getElementById('ip_empty_state');

  btn.addEventListener('click', () => {
    clearFieldError(ipInput); clearFieldError(cidrInput);
    let valid = true;
    if(!ipInput.value.trim()){ setFieldError(ipInput, t('err_required')); valid=false; }
    else if(!NetMath.isValidIPv4(ipInput.value.trim())){ setFieldError(ipInput, t('err_ipv4')); valid=false; }

    if(!cidrInput.value.toString().trim()){ setFieldError(cidrInput, t('err_required')); valid=false; }
    else if(!NetMath.isValidCIDR(cidrInput.value)){ setFieldError(cidrInput, t('err_cidr')); valid=false; }

    if(!valid) return;

    const ip = ipInput.value.trim();
    const cidr = parseInt(cidrInput.value,10);
    const r = NetMath.calcNetwork(ip, cidr);
    const defClass = NetMath.defaultClassMask(ip);

    const items = [
      {label:'Network Address', value:r.network},
      {label:'Broadcast Address', value:r.broadcast, cls:'red'},
      {label:'First Usable IP', value:r.firstHost, cls:'blue'},
      {label:'Last Usable IP', value:r.lastHost, cls:'blue'},
      {label:'Total Addresses', value:r.totalAddresses.toLocaleString()},
      {label:'Usable Hosts', value:r.usableHosts.toLocaleString()},
      {label:'CIDR', value:'/' + r.cidr},
      {label:'Subnet Mask', value:r.subnetMask},
      {label:'Wildcard Mask', value:r.wildcardMask},
      {label:'IP Class', value:r.ipClass},
      {label:'Type', value: r.isPrivate ? 'Private' : 'Public', cls: r.isPrivate ? '' : 'blue'},
      {label:'Binary IP', value:r.binary},
    ];
    renderResultGrid(document.getElementById('ip_result_grid'), items);
    renderBitGrid(document.getElementById('ip_bitgrid'), r.network, cidr);

    resultPanel.classList.remove('hidden');
    emptyState.classList.add('hidden');

    addHistory('IP Calculator', {ip, cidr}, r);
    wireResultActions('ip', r, {ip, cidr});
  });

  resetBtn.addEventListener('click', () => {
    ipInput.value=''; cidrInput.value='';
    clearFieldError(ipInput); clearFieldError(cidrInput);
    resultPanel.classList.add('hidden');
    emptyState.classList.remove('hidden');
  });

  [ipInput, cidrInput].forEach(el => el.addEventListener('keydown', e => { if(e.key==='Enter') btn.click(); }));
}

/* generic export/share wiring for a tool's result buttons.
   toolId = DOM id prefix (e.g. 'wc'); shareRoute = route/page name used in share links (defaults to toolId) */
function wireResultActions(toolId, results, shareParams, shareRoute){
  shareRoute = shareRoute || toolId;
  const csvBtn = document.getElementById(toolId + '_csv_btn');
  const jsonBtn = document.getElementById(toolId + '_json_btn');
  const printBtn = document.getElementById(toolId + '_print_btn');
  const shareBtn = document.getElementById(toolId + '_share_btn');
  const copyAllBtn = document.getElementById(toolId + '_copyall_btn');

  if(csvBtn) csvBtn.onclick = () => downloadFile(toolId + '-result.csv', resultsToCSV(results), 'text/csv');
  if(jsonBtn) jsonBtn.onclick = () => downloadFile(toolId + '-result.json', resultsToJSON(results), 'application/json');
  if(printBtn) printBtn.onclick = () => window.print();
  if(shareBtn) shareBtn.onclick = () => copyShareLink(shareRoute, shareParams);
  if(copyAllBtn) copyAllBtn.onclick = () => {
    const lines = Object.entries(results).map(([k,v]) => `${k}: ${v}`).join('\n');
    copyText(lines);
  };
}

/* ===================================================================
   2.2 — SUBNET CALCULATOR
   =================================================================== */

function initSubnetTool(){
  const netInput = document.getElementById('sub_net');
  const cidrInput = document.getElementById('sub_cidr');
  const newCidrInput = document.getElementById('sub_newcidr');
  const btn = document.getElementById('sub_calc_btn');
  const resetBtn = document.getElementById('sub_reset_btn');
  const resultPanel = document.getElementById('sub_result_panel');
  const emptyState = document.getElementById('sub_empty_state');
  const summaryEl = document.getElementById('sub_summary');
  const tableBody = document.getElementById('sub_table_body');

  btn.addEventListener('click', () => {
    clearFieldError(netInput); clearFieldError(cidrInput); clearFieldError(newCidrInput);
    let valid = true;
    if(!netInput.value.trim()){ setFieldError(netInput, t('err_required')); valid=false; }
    else if(!NetMath.isValidIPv4(netInput.value.trim())){ setFieldError(netInput, t('err_ipv4')); valid=false; }
    if(!NetMath.isValidCIDR(cidrInput.value)){ setFieldError(cidrInput, t('err_cidr')); valid=false; }
    if(!NetMath.isValidCIDR(newCidrInput.value)){ setFieldError(newCidrInput, t('err_cidr')); valid=false; }

    if(valid){
      const baseCidr = parseInt(cidrInput.value,10);
      const newCidr = parseInt(newCidrInput.value,10);
      if(newCidr < baseCidr){
        setFieldError(newCidrInput, 'New CIDR must be ≥ base CIDR');
        valid = false;
      }
    }
    if(!valid) return;

    const networkIp = netInput.value.trim();
    const baseCidr = parseInt(cidrInput.value,10);
    const newCidr = parseInt(newCidrInput.value,10);
    const subnets = NetMath.calcSubnets(networkIp, baseCidr, newCidr);

    summaryEl.innerHTML = `
      <div class="result-item"><div class="result-label">Number of Subnets</div><div class="result-value"><span>${subnets.length.toLocaleString()}</span></div></div>
      <div class="result-item blue"><div class="result-label">Hosts per Subnet</div><div class="result-value"><span>${subnets[0].usableHosts.toLocaleString()}</span></div></div>
      <div class="result-item"><div class="result-label">Subnet Mask</div><div class="result-value"><span>${subnets[0].subnetMask}</span></div></div>
      <div class="result-item"><div class="result-label">New CIDR</div><div class="result-value"><span>/${newCidr}</span></div></div>
    `;

    tableBody.innerHTML = subnets.map((s,i) => `
      <tr>
        <td>${i+1}</td>
        <td>${s.network}</td>
        <td>${s.firstHost}</td>
        <td>${s.lastHost}</td>
        <td>${s.broadcast}</td>
        <td>/${s.cidr}</td>
        <td>${s.subnetMask}</td>
      </tr>
    `).join('');

    resultPanel.classList.remove('hidden');
    emptyState.classList.add('hidden');

    addHistory('Subnet Calculator', {networkIp, baseCidr, newCidr}, {count:subnets.length, hostsPer:subnets[0].usableHosts, mask:subnets[0].subnetMask});
    wireResultActions('sub', {count:subnets.length, hostsPerSubnet:subnets[0].usableHosts, mask:subnets[0].subnetMask, newCidr}, {net:networkIp, cidr:baseCidr, newcidr:newCidr});

    const subCsvBtn = document.getElementById('sub_csv_btn');
    if(subCsvBtn){
      subCsvBtn.onclick = () => {
        const rows = [['#','Network','First Host','Last Host','Broadcast','CIDR','Mask']];
        subnets.forEach((s,i) => rows.push([i+1, s.network, s.firstHost, s.lastHost, s.broadcast, '/'+s.cidr, s.subnetMask]));
        downloadFile('subnets.csv', rows.map(r=>r.join(',')).join('\n'), 'text/csv');
      };
    }
    const subJsonBtn = document.getElementById('sub_json_btn');
    if(subJsonBtn){
      subJsonBtn.onclick = () => downloadFile('subnets.json', JSON.stringify(subnets.map(s=>({network:s.network,firstHost:s.firstHost,lastHost:s.lastHost,broadcast:s.broadcast,cidr:s.cidr,mask:s.subnetMask})), null, 2), 'application/json');
    }
    const subPrintBtn = document.getElementById('sub_print_btn');
    if(subPrintBtn) subPrintBtn.onclick = () => window.print();
    const subShareBtn = document.getElementById('sub_share_btn');
    if(subShareBtn) subShareBtn.onclick = () => copyShareLink('subnet', {net:networkIp, cidr:baseCidr, newcidr:newCidr});
  });

  resetBtn.addEventListener('click', () => {
    netInput.value=''; cidrInput.value=''; newCidrInput.value='';
    clearFieldError(netInput); clearFieldError(cidrInput); clearFieldError(newCidrInput);
    resultPanel.classList.add('hidden');
    emptyState.classList.remove('hidden');
  });

  [netInput, cidrInput, newCidrInput].forEach(el => el.addEventListener('keydown', e => { if(e.key==='Enter') btn.click(); }));
}

/* ===================================================================
   2.3 — CIDR CALCULATOR
   =================================================================== */

function initCIDRTool(){
  const input = document.getElementById('cidr_input');
  const btn = document.getElementById('cidr_calc_btn');
  const resetBtn = document.getElementById('cidr_reset_btn');
  const resultPanel = document.getElementById('cidr_result_panel');
  const emptyState = document.getElementById('cidr_empty_state');

  btn.addEventListener('click', () => {
    clearFieldError(input);
    const raw = input.value.trim();
    if(!raw){ setFieldError(input, t('err_required')); return; }
    if(!raw.includes('/')){ setFieldError(input, 'Format must be IP/CIDR, e.g. 192.168.1.0/24'); return; }
    const [ip, cidrStr] = raw.split('/');
    if(!NetMath.isValidIPv4(ip.trim())){ setFieldError(input, t('err_ipv4')); return; }
    if(!NetMath.isValidCIDR(cidrStr.trim())){ setFieldError(input, t('err_cidr')); return; }

    const cidr = parseInt(cidrStr.trim(),10);
    const r = NetMath.calcNetwork(ip.trim(), cidr);

    const items = [
      {label:'IP Address', value:r.ip},
      {label:'Prefix', value:'/' + r.cidr},
      {label:'Subnet Mask', value:r.subnetMask},
      {label:'Wildcard Mask', value:r.wildcardMask},
      {label:'Network Address', value:r.network},
      {label:'Broadcast Address', value:r.broadcast, cls:'red'},
      {label:'Host Range', value:`${r.firstHost} – ${r.lastHost}`, cls:'blue'},
      {label:'Total Addresses', value:r.totalAddresses.toLocaleString()},
      {label:'Usable Hosts', value:r.usableHosts.toLocaleString()},
    ];
    renderResultGrid(document.getElementById('cidr_result_grid'), items);
    renderBitGrid(document.getElementById('cidr_bitgrid'), r.network, cidr);

    resultPanel.classList.remove('hidden');
    emptyState.classList.add('hidden');

    addHistory('CIDR Calculator', {input: raw}, r);
    wireResultActions('cidr', r, {v: raw});
  });

  resetBtn.addEventListener('click', () => {
    input.value=''; clearFieldError(input);
    resultPanel.classList.add('hidden');
    emptyState.classList.remove('hidden');
  });

  input.addEventListener('keydown', e => { if(e.key==='Enter') btn.click(); });
}

/* ===================================================================
   2.4 — VLSM CALCULATOR
   =================================================================== */

let vlsmRowCount = 0;

function vlsmAddRow(name='', hosts=''){
  vlsmRowCount++;
  const id = 'vlsm_row_' + vlsmRowCount;
  const wrap = document.getElementById('vlsm_rows');
  const row = document.createElement('div');
  row.className = 'input-row';
  row.id = id;
  row.innerHTML = `
    <div class="field">
      <label>Subnet Name</label>
      <input type="text" class="vlsm-name" placeholder="e.g. Sales-LAN" value="${name}">
    </div>
    <div class="field" style="max-width:160px">
      <label>Hosts Needed</label>
      <input type="number" min="1" class="vlsm-hosts" placeholder="e.g. 50" value="${hosts}">
    </div>
    <div class="field" style="max-width:90px; display:flex; align-items:flex-end;">
      <button class="btn btn-sm btn-danger vlsm-remove-btn" type="button" style="width:100%;">✕</button>
    </div>
  `;
  wrap.appendChild(row);
  row.querySelector('.vlsm-remove-btn').addEventListener('click', () => {
    if(wrap.children.length > 1) row.remove();
  });
}

function initVLSMTool(){
  const netInput = document.getElementById('vlsm_net');
  const cidrInput = document.getElementById('vlsm_cidr');
  const addBtn = document.getElementById('vlsm_add_row_btn');
  const btn = document.getElementById('vlsm_calc_btn');
  const resetBtn = document.getElementById('vlsm_reset_btn');
  const resultPanel = document.getElementById('vlsm_result_panel');
  const emptyState = document.getElementById('vlsm_empty_state');
  const summaryEl = document.getElementById('vlsm_summary');
  const blocksEl = document.getElementById('vlsm_blocks');
  const errBox = document.getElementById('vlsm_error_box');

  vlsmAddRow('Sales-LAN', 50);
  vlsmAddRow('IT-LAN', 20);
  vlsmAddRow('WAN-Link', 2);

  addBtn.addEventListener('click', () => vlsmAddRow());

  btn.addEventListener('click', () => {
    clearFieldError(netInput); clearFieldError(cidrInput);
    errBox.classList.add('hidden'); errBox.textContent='';
    let valid = true;
    if(!netInput.value.trim()){ setFieldError(netInput, t('err_required')); valid=false; }
    else if(!NetMath.isValidIPv4(netInput.value.trim())){ setFieldError(netInput, t('err_ipv4')); valid=false; }
    if(!NetMath.isValidCIDR(cidrInput.value)){ setFieldError(cidrInput, t('err_cidr')); valid=false; }

    const rows = [...document.querySelectorAll('#vlsm_rows .input-row')];
    const requirements = [];
    let rowsValid = true;
    rows.forEach(row => {
      const nameEl = row.querySelector('.vlsm-name');
      const hostsEl = row.querySelector('.vlsm-hosts');
      nameEl.classList.remove('error'); hostsEl.classList.remove('error');
      const name = nameEl.value.trim() || 'Subnet';
      const hosts = parseInt(hostsEl.value,10);
      if(!hostsEl.value.trim() || isNaN(hosts) || hosts < 1){
        hostsEl.classList.add('error');
        rowsValid = false;
      } else {
        requirements.push({name, hosts});
      }
    });
    if(!rowsValid){ errBox.textContent = t('err_hosts'); errBox.classList.remove('hidden'); valid=false; }
    if(requirements.length === 0) valid = false;
    if(!valid) return;

    const networkIp = netInput.value.trim();
    const baseCidr = parseInt(cidrInput.value,10);
    const vlsm = NetMath.calcVLSM(networkIp, baseCidr, requirements);

    if(vlsm.overflow){
      errBox.textContent = t('err_vlsm_space');
      errBox.classList.remove('hidden');
    }

    summaryEl.innerHTML = `
      <div class="result-item"><div class="result-label">Base Network</div><div class="result-value"><span>${networkIp}/${baseCidr}</span></div></div>
      <div class="result-item"><div class="result-label">Total Addresses</div><div class="result-value"><span>${vlsm.totalAvailable.toLocaleString()}</span></div></div>
      <div class="result-item blue"><div class="result-label">Used Addresses</div><div class="result-value"><span>${vlsm.usedTotal.toLocaleString()}</span></div></div>
      <div class="result-item"><div class="result-label">Remaining IPs</div><div class="result-value"><span>${vlsm.remainingIPs.toLocaleString()}</span></div></div>
    `;

    blocksEl.innerHTML = vlsm.results.map(r => {
      if(r.error === 'NO_SPACE'){
        return `<div class="subnet-block"><div class="subnet-block-head"><strong>${r.name}</strong><span class="badge badge-red">No Space</span></div><div class="text-dim" style="font-size:12.5px;">Needs ${r.hostsRequired || r.hosts} hosts — insufficient address space remaining.</div></div>`;
      }
      return `
      <div class="subnet-block">
        <div class="subnet-block-head">
          <strong>${r.name}</strong>
          <span class="badge badge-green">/${r.cidr}</span>
        </div>
        <div class="result-grid">
          <div class="result-item"><div class="result-label">Network</div><div class="result-value"><span>${r.network}</span></div></div>
          <div class="result-item"><div class="result-label">Subnet Mask</div><div class="result-value"><span>${r.subnetMask}</span></div></div>
          <div class="result-item blue"><div class="result-label">First Host</div><div class="result-value"><span>${r.firstHost}</span></div></div>
          <div class="result-item blue"><div class="result-label">Last Host</div><div class="result-value"><span>${r.lastHost}</span></div></div>
          <div class="result-item red"><div class="result-label">Broadcast</div><div class="result-value"><span>${r.broadcast}</span></div></div>
          <div class="result-item"><div class="result-label">Available Hosts</div><div class="result-value"><span>${r.usableHosts.toLocaleString()}</span></div></div>
          <div class="result-item"><div class="result-label">Required</div><div class="result-value"><span>${r.hostsRequired}</span></div></div>
          <div class="result-item"><div class="result-label">Unused in Block</div><div class="result-value"><span>${r.remainingInBlock}</span></div></div>
        </div>
      </div>`;
    }).join('');

    resultPanel.classList.remove('hidden');
    emptyState.classList.add('hidden');

    addHistory('VLSM Calculator', {networkIp, baseCidr, requirements}, {allocations: vlsm.results.length, remainingIPs: vlsm.remainingIPs});

    const csvBtn = document.getElementById('vlsm_csv_btn');
    if(csvBtn) csvBtn.onclick = () => {
      const rows2 = [['Name','Network','CIDR','Mask','First Host','Last Host','Broadcast','Available Hosts','Required']];
      vlsm.results.forEach(r => { if(!r.error) rows2.push([r.name, r.network, '/'+r.cidr, r.subnetMask, r.firstHost, r.lastHost, r.broadcast, r.usableHosts, r.hostsRequired]); });
      downloadFile('vlsm-plan.csv', rows2.map(r=>r.join(',')).join('\n'), 'text/csv');
    };
    const jsonBtn = document.getElementById('vlsm_json_btn');
    if(jsonBtn) jsonBtn.onclick = () => downloadFile('vlsm-plan.json', JSON.stringify(vlsm.results, null, 2), 'application/json');
    const printBtn = document.getElementById('vlsm_print_btn');
    if(printBtn) printBtn.onclick = () => window.print();
  });

  resetBtn.addEventListener('click', () => {
    netInput.value=''; cidrInput.value='';
    clearFieldError(netInput); clearFieldError(cidrInput);
    document.getElementById('vlsm_rows').innerHTML = '';
    vlsmAddRow(); vlsmAddRow();
    resultPanel.classList.add('hidden');
    emptyState.classList.remove('hidden');
    errBox.classList.add('hidden');
  });
}

/* ===================================================================
   2.5 — IP RANGE CALCULATOR
   =================================================================== */

function initRangeTool(){
  const startInput = document.getElementById('range_start');
  const endInput = document.getElementById('range_end');
  const btn = document.getElementById('range_calc_btn');
  const resetBtn = document.getElementById('range_reset_btn');
  const resultPanel = document.getElementById('range_result_panel');
  const emptyState = document.getElementById('range_empty_state');

  btn.addEventListener('click', () => {
    clearFieldError(startInput); clearFieldError(endInput);
    let valid = true;
    if(!startInput.value.trim()){ setFieldError(startInput, t('err_required')); valid=false; }
    else if(!NetMath.isValidIPv4(startInput.value.trim())){ setFieldError(startInput, t('err_ipv4')); valid=false; }
    if(!endInput.value.trim()){ setFieldError(endInput, t('err_required')); valid=false; }
    else if(!NetMath.isValidIPv4(endInput.value.trim())){ setFieldError(endInput, t('err_ipv4')); valid=false; }
    if(!valid) return;

    const start = startInput.value.trim();
    const end = endInput.value.trim();
    const r = NetMath.calcIPRange(start, end);
    if(!r){ setFieldError(endInput, t('err_range')); return; }

    const sameC24 = NetMath.sameNetwork(start, end, 24);
    const sameC16 = NetMath.sameNetwork(start, end, 16);
    let sameNetText = 'No (different major networks)';
    if(sameC24) sameNetText = 'Yes — same /24 network';
    else if(sameC16) sameNetText = 'Yes — same /16 network';

    const items = [
      {label:'First IP', value:r.startIp},
      {label:'Last IP', value:r.endIp},
      {label:'Total IPs', value:r.total.toLocaleString()},
      {label:'Range', value:r.range},
      {label:'Same Network?', value: sameNetText, cls: sameC24 ? '' : 'blue'},
    ];
    renderResultGrid(document.getElementById('range_result_grid'), items);

    resultPanel.classList.remove('hidden');
    emptyState.classList.add('hidden');

    addHistory('IP Range Calculator', {start, end}, {total:r.total, sameNetwork:sameNetText});
    wireResultActions('range', {startIp:r.startIp, endIp:r.endIp, total:r.total, sameNetwork:sameNetText}, {start, end});
  });

  resetBtn.addEventListener('click', () => {
    startInput.value=''; endInput.value='';
    clearFieldError(startInput); clearFieldError(endInput);
    resultPanel.classList.add('hidden');
    emptyState.classList.remove('hidden');
  });

  [startInput, endInput].forEach(el => el.addEventListener('keydown', e => { if(e.key==='Enter') btn.click(); }));
}

/* ===================================================================
   2.6 — SUBNET MASK CALCULATOR
   =================================================================== */

function initMaskTool(){
  const cidrInput = document.getElementById('mask_cidr_input');
  const maskInput = document.getElementById('mask_mask_input');
  const cidrBtn = document.getElementById('mask_calc_btn');
  const maskBtn = document.getElementById('mask_calc_from_mask_btn');
  const resultPanel = document.getElementById('mask_result_panel');
  const emptyState = document.getElementById('mask_empty_state');

  function showMaskResult(cidr, mask){
    const wildcard = NetMath.wildcardFromCIDR(cidr);
    const items = [
      {label:'CIDR', value:'/' + cidr},
      {label:'Subnet Mask', value:mask},
      {label:'Wildcard Mask', value:wildcard},
      {label:'Binary Mask', value:NetMath.ipToBinary(mask)},
      {label:'Total Hosts (block)', value:Math.pow(2,32-cidr).toLocaleString()},
    ];
    renderResultGrid(document.getElementById('mask_result_grid'), items);
    resultPanel.classList.remove('hidden');
    emptyState.classList.add('hidden');
    addHistory('Subnet Mask Calculator', {cidr, mask}, {mask, wildcard, cidr});
    wireResultActions('mask', {cidr:'/'+cidr, mask, wildcard}, {cidr});
  }

  cidrBtn.addEventListener('click', () => {
    clearFieldError(cidrInput);
    if(!NetMath.isValidCIDR(cidrInput.value)){ setFieldError(cidrInput, t('err_cidr')); return; }
    const cidr = parseInt(cidrInput.value,10);
    showMaskResult(cidr, NetMath.cidrToMask(cidr));
  });

  maskBtn.addEventListener('click', () => {
    clearFieldError(maskInput);
    const val = maskInput.value.trim();
    if(!val){ setFieldError(maskInput, t('err_required')); return; }
    if(!NetMath.isValidSubnetMask(val)){ setFieldError(maskInput, t('err_mask')); return; }
    const cidr = NetMath.maskToCIDR(val);
    showMaskResult(cidr, val);
  });

  resultPanel.querySelector = resultPanel.querySelector; // no-op guard
  [cidrInput].forEach(el => el.addEventListener('keydown', e => { if(e.key==='Enter') cidrBtn.click(); }));
  [maskInput].forEach(el => el.addEventListener('keydown', e => { if(e.key==='Enter') maskBtn.click(); }));

  document.getElementById('mask_reset_btn').addEventListener('click', () => {
    cidrInput.value=''; maskInput.value='';
    clearFieldError(cidrInput); clearFieldError(maskInput);
    resultPanel.classList.add('hidden');
    emptyState.classList.remove('hidden');
  });
}

/* ===================================================================
   2.7 — WILDCARD MASK CALCULATOR
   =================================================================== */

function initWildcardTool(){
  const maskInput = document.getElementById('wc_mask_input');
  const btn = document.getElementById('wc_calc_btn');
  const resetBtn = document.getElementById('wc_reset_btn');
  const resultPanel = document.getElementById('wc_result_panel');
  const emptyState = document.getElementById('wc_empty_state');

  btn.addEventListener('click', () => {
    clearFieldError(maskInput);
    const val = maskInput.value.trim();
    if(!val){ setFieldError(maskInput, t('err_required')); return; }
    if(!NetMath.isValidSubnetMask(val)){ setFieldError(maskInput, t('err_mask')); return; }

    const cidr = NetMath.maskToCIDR(val);
    const wildcard = NetMath.wildcardFromMask(val);

    const items = [
      {label:'Subnet Mask', value:val},
      {label:'Wildcard Mask', value:wildcard, cls:'blue'},
      {label:'CIDR', value:'/' + cidr},
      {label:'Mask Binary', value:NetMath.ipToBinary(val)},
      {label:'Wildcard Binary', value:NetMath.ipToBinary(wildcard)},
    ];
    renderResultGrid(document.getElementById('wc_result_grid'), items);
    resultPanel.classList.remove('hidden');
    emptyState.classList.add('hidden');

    addHistory('Wildcard Mask Calculator', {mask:val}, {wildcard, cidr});
    wireResultActions('wc', {mask:val, wildcard, cidr:'/'+cidr}, {mask:val}, 'wildcard');
  });

  resetBtn.addEventListener('click', () => {
    maskInput.value=''; clearFieldError(maskInput);
    resultPanel.classList.add('hidden');
    emptyState.classList.remove('hidden');
  });

  maskInput.addEventListener('keydown', e => { if(e.key==='Enter') btn.click(); });
}

/* ===================================================================
   2.8 — IPv4 ANALYZER
   =================================================================== */

function initAnalyzerTool(){
  const input = document.getElementById('an_ip');
  const btn = document.getElementById('an_calc_btn');
  const resetBtn = document.getElementById('an_reset_btn');
  const resultPanel = document.getElementById('an_result_panel');
  const emptyState = document.getElementById('an_empty_state');
  const badgesEl = document.getElementById('an_badges');

  btn.addEventListener('click', () => {
    clearFieldError(input);
    const ip = input.value.trim();
    if(!ip){ setFieldError(input, t('err_required')); return; }
    if(!NetMath.isValidIPv4(ip)){ setFieldError(input, t('err_ipv4')); return; }

    const cls = NetMath.getIPClass(ip);
    const isPriv = NetMath.isPrivateIP(ip);
    const isLoop = NetMath.isLoopback(ip);
    const isLL = NetMath.isLinkLocal(ip);
    const isMC = NetMath.isMulticast(ip);
    const isRes = NetMath.isReserved(ip);
    const defClass = NetMath.defaultClassMask(ip);

    let badges = [];
    badges.push(`<span class="badge badge-green">Class ${cls}</span>`);
    badges.push(isPriv ? `<span class="badge badge-amber">Private</span>` : `<span class="badge badge-blue">Public</span>`);
    if(isLoop) badges.push(`<span class="badge badge-red">Loopback</span>`);
    if(isLL) badges.push(`<span class="badge badge-amber">Link-Local</span>`);
    if(isMC) badges.push(`<span class="badge badge-blue">Multicast</span>`);
    if(isRes) badges.push(`<span class="badge badge-red">Reserved</span>`);
    badgesEl.innerHTML = badges.join('');

    const items = [
      {label:'IP Class', value:cls},
      {label:'Public / Private', value: isPriv ? 'Private' : 'Public'},
      {label:'Loopback', value: isLoop ? 'Yes' : 'No'},
      {label:'Link-Local', value: isLL ? 'Yes' : 'No'},
      {label:'Multicast', value: isMC ? 'Yes' : 'No'},
      {label:'Reserved', value: isRes ? 'Yes' : 'No'},
      {label:'Default Class Mask', value: defClass.mask},
      {label:'Binary Representation', value: NetMath.ipToBinary(ip)},
    ];
    renderResultGrid(document.getElementById('an_result_grid'), items);
    renderBitGrid(document.getElementById('an_bitgrid'), ip, defClass.cidr || 24);

    resultPanel.classList.remove('hidden');
    emptyState.classList.add('hidden');

    addHistory('IPv4 Analyzer', {ip}, {class:cls, private:isPriv, loopback:isLoop, linkLocal:isLL, multicast:isMC, reserved:isRes});
    wireResultActions('an', {ip, class:cls, type: isPriv?'Private':'Public', loopback:isLoop, linkLocal:isLL, multicast:isMC, reserved:isRes}, {ip}, 'analyzer');
  });

  resetBtn.addEventListener('click', () => {
    input.value=''; clearFieldError(input);
    resultPanel.classList.add('hidden');
    emptyState.classList.remove('hidden');
    badgesEl.innerHTML='';
  });

  input.addEventListener('keydown', e => { if(e.key==='Enter') btn.click(); });
}

/* ===================================================================
   2.9 — IPv6 CALCULATOR
   =================================================================== */

function initIPv6Tool(){
  const input = document.getElementById('v6_input');
  const prefixInput = document.getElementById('v6_prefix');
  const btn = document.getElementById('v6_calc_btn');
  const resetBtn = document.getElementById('v6_reset_btn');
  const resultPanel = document.getElementById('v6_result_panel');
  const emptyState = document.getElementById('v6_empty_state');

  btn.addEventListener('click', () => {
    clearFieldError(input); clearFieldError(prefixInput);
    let raw = input.value.trim();
    let prefixLen = prefixInput.value.trim();

    // allow user to type addr/prefix directly in the address field
    if(raw.includes('/')){
      const parts = raw.split('/');
      raw = parts[0].trim();
      if(!prefixLen) prefixLen = parts[1].trim();
    }

    let valid = true;
    if(!raw){ setFieldError(input, t('err_required')); valid=false; }
    else if(!NetMath.isValidIPv6(raw)){ setFieldError(input, t('err_ipv6')); valid=false; }

    if(prefixLen !== '' && !NetMath.isValidCIDR(prefixLen, 128)){ setFieldError(prefixInput, t('err_cidr6')); valid=false; }
    if(!valid) return;

    const full = NetMath.expandIPv6(raw);
    const compressed = NetMath.compressIPv6(full);
    const type = NetMath.ipv6AddressType(full);

    const items = [
      {label:'Full Address', value:full},
      {label:'Compressed Address', value:compressed, cls:'blue'},
      {label:'Address Type', value:type},
    ];

    if(prefixLen !== ''){
      const pfx = parseInt(prefixLen,10);
      const groups = full.split(':');
      const fullBinary = groups.map(g => parseInt(g,16).toString(2).padStart(16,'0')).join('');
      const networkBinary = fullBinary.substring(0, pfx).padEnd(128,'0');
      const networkGroups = [];
      for(let i=0;i<128;i+=16) networkGroups.push(parseInt(networkBinary.substr(i,16),2).toString(16).padStart(4,'0'));
      const networkPrefix = NetMath.compressIPv6(networkGroups.join(':'));

      const interfaceBinary = fullBinary.substring(pfx);
      const ifaceGroups = full.split(':').map((g,i)=>{
        // interface id = bits beyond prefix — show as remaining hextets when prefix is byte-aligned to 16
        return g;
      });
      const interfaceId = pfx % 16 === 0
        ? groups.slice(pfx/16).join(':')
        : '(non-hextet-aligned prefix)';

      items.push({label:'Prefix Length', value:'/' + pfx});
      items.push({label:'Network Prefix', value:networkPrefix});
      items.push({label:'Interface ID', value: interfaceId});
    }

    renderResultGrid(document.getElementById('v6_result_grid'), items);
    resultPanel.classList.remove('hidden');
    emptyState.classList.add('hidden');

    addHistory('IPv6 Calculator', {input:raw, prefix:prefixLen}, {full, compressed, type});
    wireResultActions('v6', {full, compressed, type}, {v: raw + (prefixLen ? '/'+prefixLen : '')}, 'ipv6');
  });

  resetBtn.addEventListener('click', () => {
    input.value=''; prefixInput.value='';
    clearFieldError(input); clearFieldError(prefixInput);
    resultPanel.classList.add('hidden');
    emptyState.classList.remove('hidden');
  });

  [input, prefixInput].forEach(el => el.addEventListener('keydown', e => { if(e.key==='Enter') btn.click(); }));
}

/* ===================================================================
   2.10 — NUMBER CONVERTER
   =================================================================== */

function initConverterTool(){
  const decInput = document.getElementById('nc_dec');
  const binInput = document.getElementById('nc_bin');
  const hexInput = document.getElementById('nc_hex');
  const ipv4Input = document.getElementById('nc_ipv4');
  const ipv4BinOut = document.getElementById('nc_ipv4_bin_out');
  const errBox = document.getElementById('nc_error_box');

  function clearAll(except){
    [decInput, binInput, hexInput].forEach(el => { if(el !== except) el.value=''; el.classList.remove('error'); });
    errBox.classList.add('hidden');
  }
  function showErr(msg){ errBox.textContent = msg; errBox.classList.remove('hidden'); }

  decInput.addEventListener('input', () => {
    errBox.classList.add('hidden');
    const v = decInput.value.trim();
    if(v === ''){ binInput.value=''; hexInput.value=''; return; }
    if(!/^\d+$/.test(v)){ showErr(t('err_number')); return; }
    const n = parseInt(v,10);
    binInput.value = NetMath.decToBin(n);
    hexInput.value = NetMath.decToHex(n);
  });

  binInput.addEventListener('input', () => {
    errBox.classList.add('hidden');
    const v = binInput.value.trim();
    if(v === ''){ decInput.value=''; hexInput.value=''; return; }
    if(!NetMath.isValidBinary(v)){ showErr(t('err_binary')); return; }
    const n = NetMath.binToDec(v);
    decInput.value = n;
    hexInput.value = NetMath.decToHex(n);
  });

  hexInput.addEventListener('input', () => {
    errBox.classList.add('hidden');
    const v = hexInput.value.trim();
    if(v === ''){ decInput.value=''; binInput.value=''; return; }
    if(!NetMath.isValidHex(v)){ showErr(t('err_hex')); return; }
    const n = NetMath.hexToDec(v);
    decInput.value = n;
    binInput.value = NetMath.decToBin(n);
  });

  ipv4Input.addEventListener('input', () => {
    const v = ipv4Input.value.trim();
    if(!v){ ipv4BinOut.textContent=''; ipv4Input.classList.remove('error'); return; }
    if(!NetMath.isValidIPv4(v)){ ipv4Input.classList.add('error'); ipv4BinOut.textContent=''; return; }
    ipv4Input.classList.remove('error');
    ipv4BinOut.textContent = NetMath.ipToBinary(v);
  });

  document.getElementById('nc_reset_btn').addEventListener('click', () => {
    clearAll(null); ipv4Input.value=''; ipv4BinOut.textContent='';
    ipv4Input.classList.remove('error');
  });
}

/* ===================================================================
   NETWORK VISUALIZATION
   =================================================================== */

function initVizTool(){
  const netInput = document.getElementById('viz_net');
  const cidrInput = document.getElementById('viz_cidr');
  const btn = document.getElementById('viz_calc_btn');
  const canvas = document.getElementById('viz_canvas');

  btn.addEventListener('click', () => {
    clearFieldError(netInput); clearFieldError(cidrInput);
    let valid = true;
    if(!netInput.value.trim()){ setFieldError(netInput, t('err_required')); valid=false; }
    else if(!NetMath.isValidIPv4(netInput.value.trim())){ setFieldError(netInput, t('err_ipv4')); valid=false; }
    if(!NetMath.isValidCIDR(cidrInput.value)){ setFieldError(cidrInput, t('err_cidr')); valid=false; }
    if(!valid) return;

    const ip = netInput.value.trim();
    const cidr = parseInt(cidrInput.value,10);
    const r = NetMath.calcNetwork(ip, cidr);
    renderVizTree(canvas, r);
  });

  // render an initial example
  const initial = NetMath.calcNetwork('192.168.1.0', 24);
  renderVizTree(canvas, initial);
}

function renderVizTree(canvas, r){
  const startLong = NetMath.ipToLong(r.firstHost);
  const endLong = NetMath.ipToLong(r.lastHost);
  const totalHosts = endLong - startLong + 1;
  const showCount = Math.min(totalHosts, 6);
  const nodeTypes = ['pc','pc','pc','server','pc','pc'];
  const nodeIcons = {pc:'🖥️', server:'🗄️'};

  let nodesHtml = '';
  for(let i=0;i<showCount;i++){
    const long = startLong + i;
    const ipStr = NetMath.longToIp(long);
    const type = i === showCount-1 && totalHosts > 3 ? 'server' : 'pc';
    nodesHtml += `
      <div class="viz-node">
        <div class="viz-line" style="height:20px;"></div>
        <div class="viz-node-box ${type}">
          <div class="viz-node-icon">${nodeIcons[type]}</div>
          <strong>${type === 'server' ? 'Server' : 'PC'}</strong>
          <span>${ipStr}</span>
        </div>
      </div>
    `;
  }
  if(totalHosts > showCount){
    nodesHtml += `
      <div class="viz-node">
        <div class="viz-line" style="height:20px;"></div>
        <div class="viz-node-box">
          <div class="viz-node-icon">➕</div>
          <strong>+${(totalHosts-showCount).toLocaleString()} more</strong>
          <span>hosts</span>
        </div>
      </div>
    `;
  }

  canvas.innerHTML = `
    <div class="viz-tree">
      <div class="viz-root">
        <strong>${r.network}/${r.cidr}</strong>
        <span>${r.subnetMask} · ${r.usableHosts.toLocaleString()} usable hosts</span>
      </div>
      <div class="viz-line"></div>
      <div class="viz-children">${nodesHtml}</div>
    </div>
  `;
}
