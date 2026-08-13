/* =====================================================================
   tools.js — Declarative tool definitions (fields + calculation output)
   Each run() returns:
     { fields: [[labelKey, value], ...],
       notes:  [{ key, params }],
       table:  { columns: [labelKey...], rows: [[...]] },
       viz:    { network, cidr, hosts } }
   Validation problems are thrown as { field, key }.
   ===================================================================== */
'use strict';

var TOOLS = [

  /* ---------------------------------------------------------------- */
  {
    id: 'ip-calculator',
    icon: '🖧',
    keywords: ['ip', 'ipv4', 'address', 'عنوان', 'حاسبة'],
    fields: [
      { name: 'ip', labelKey: 'f_ipv4', type: 'text', placeholder: '192.168.1.10', required: true, validate: 'ipv4' },
      { name: 'mask', labelKey: 'f_mask_or_cidr', type: 'text', placeholder: '255.255.255.0  /  24', required: true, validate: 'maskOrCidr' }
    ],
    run: function (v) {
      var cidr = NetCore.parsePrefix(v.mask);
      var r = NetCore.calcIPv4(v.ip, cidr);
      var out = {
        fields: [
          ['r_ip', r.ip],
          ['r_network', r.network],
          ['r_broadcast', r.broadcast || '—'],
          ['r_first', r.usableHosts ? r.firstHost : '—'],
          ['r_last', r.usableHosts ? r.lastHost : '—'],
          ['r_total', r.totalAddresses],
          ['r_usable', r.usableHosts],
          ['r_cidr', '/' + r.cidr],
          ['r_mask', r.mask],
          ['r_wildcard', r.wildcard],
          ['r_class', r.class],
          ['r_scope', r.private ? 'v_private' : 'v_public'],
          ['r_binary', r.binary],
          ['r_hex', NetCore.ipToHex(r.ip)]
        ],
        notes: cidr >= 31 ? [{ key: 'n_p2p' }] : [],
        viz: { network: r.network, cidr: r.cidr }
      };
      return out;
    }
  },

  /* ---------------------------------------------------------------- */
  {
    id: 'subnet-calculator',
    icon: '🧮',
    keywords: ['subnet', 'subnetting', 'شبكة', 'تقسيم'],
    fields: [
      { name: 'ip', labelKey: 'f_network', type: 'text', placeholder: '192.168.1.0', required: true, validate: 'ipv4' },
      { name: 'cidr', labelKey: 'f_base_cidr', type: 'cidr', placeholder: '24', required: true, validate: 'cidr' },
      { name: 'newCidr', labelKey: 'f_new_cidr', type: 'cidr', placeholder: '26', required: true, validate: 'cidr' }
    ],
    run: function (v) {
      var base = Number(v.cidr), nw = Number(v.newCidr);
      if (nw <= base) throw { field: 'newCidr', key: 'e_new_cidr' };
      var s = NetCore.splitSubnets(v.ip, base, nw, 512);
      var rows = s.rows.map(function (r) {
        return [r.network, '/' + r.cidr, r.mask, r.usableHosts ? r.firstHost : '—',
          r.usableHosts ? r.lastHost : '—', r.broadcast || '—'];
      });
      return {
        fields: [
          ['r_network', s.baseNetwork + '/' + s.baseCidr],
          ['r_subnets', s.subnetCount],
          ['r_hosts_per', s.hostsPerSubnet],
          ['r_block_size', s.subnetSize],
          ['r_mask', NetCore.maskFromCidr(nw)],
          ['r_wildcard', NetCore.wildcardFromCidr(nw)]
        ],
        notes: s.truncated ? [{ key: 'n_truncated', params: { n: s.shown, total: s.subnetCount } }] : [],
        table: {
          titleKey: 'all_subnets',
          columns: ['r_network', 'r_cidr', 'r_mask', 'r_first', 'r_last', 'r_broadcast'],
          rows: rows
        },
        viz: { network: s.baseNetwork, cidr: base }
      };
    }
  },

  /* ---------------------------------------------------------------- */
  {
    id: 'cidr-calculator',
    icon: '📐',
    keywords: ['cidr', 'prefix', 'بادئة'],
    fields: [
      { name: 'notation', labelKey: 'f_cidr_notation', type: 'text', placeholder: '192.168.1.0/24', required: true, validate: 'cidrNotation' }
    ],
    run: function (v) {
      var parts = String(v.notation).trim().split('/');
      var r = NetCore.calcIPv4(parts[0], Number(parts[1]));
      return {
        fields: [
          ['r_ip', r.ip],
          ['r_prefix', '/' + r.cidr],
          ['r_mask', r.mask],
          ['r_wildcard', r.wildcard],
          ['r_network', r.network],
          ['r_broadcast', r.broadcast || '—'],
          ['r_range', r.hostRange],
          ['r_total', r.totalAddresses],
          ['r_usable', r.usableHosts],
          ['r_class', r.class],
          ['r_scope', r.private ? 'v_private' : 'v_public'],
          ['r_binary', r.binary]
        ],
        notes: r.cidr >= 31 ? [{ key: 'n_p2p' }] : [],
        viz: { network: r.network, cidr: r.cidr }
      };
    }
  },

  /* ---------------------------------------------------------------- */
  {
    id: 'vlsm-calculator',
    icon: '🧩',
    keywords: ['vlsm', 'variable', 'متغير'],
    fields: [
      { name: 'ip', labelKey: 'f_network', type: 'text', placeholder: '192.168.1.0', required: true, validate: 'ipv4' },
      { name: 'cidr', labelKey: 'f_base_cidr', type: 'cidr', placeholder: '24', required: true, validate: 'cidr' },
      { name: 'reqs', labelKey: 'f_hosts', type: 'reqs', required: true }
    ],
    run: function (v) {
      var list = (v.reqs || []).filter(function (r) { return String(r.hosts).trim() !== ''; });
      if (!list.length) throw { field: 'reqs', key: 'e_no_reqs' };
      for (var i = 0; i < list.length; i++) {
        var h = Number(list[i].hosts);
        if (!/^\d+$/.test(String(list[i].hosts).trim()) || h < 1) throw { field: 'reqs', key: 'e_hosts' };
      }
      var res = NetCore.vlsm(v.ip, Number(v.cidr), list);
      var rows = res.rows.map(function (r) {
        return [r.name || '—', r.requested, r.network, '/' + r.cidr, r.mask,
          r.usableHosts ? r.firstHost : '—', r.usableHosts ? r.lastHost : '—',
          r.broadcast || '—', r.usableHosts, r.unusedInBlock];
      });
      var notes = [];
      if (res.failed.length) {
        notes.push({
          key: 'n_vlsm_failed',
          params: { names: res.failed.map(function (f) { return (f.name || '?') + ' (' + f.hosts + ')'; }).join(', ') }
        });
      }
      return {
        fields: [
          ['r_network', res.base],
          ['r_total', res.totalSize],
          ['r_allocated', res.allocated],
          ['r_remaining', res.remainingIPs],
          ['r_next_free', res.nextAvailable || '—']
        ],
        notes: notes,
        table: {
          titleKey: 'all_subnets',
          columns: ['r_name', 'r_requested', 'r_network', 'r_cidr', 'r_mask', 'r_first',
            'r_last', 'r_broadcast', 'r_available', 'r_unused'],
          rows: rows
        },
        viz: { network: res.rows.length ? res.rows[0].network : v.ip, cidr: res.rows.length ? res.rows[0].cidr : Number(v.cidr) }
      };
    }
  },

  /* ---------------------------------------------------------------- */
  {
    id: 'ip-range-calculator',
    icon: '↔️',
    keywords: ['range', 'نطاق'],
    fields: [
      { name: 'start', labelKey: 'f_start_ip', type: 'text', placeholder: '192.168.1.10', required: true, validate: 'ipv4' },
      { name: 'end', labelKey: 'f_end_ip', type: 'text', placeholder: '192.168.1.200', required: true, validate: 'ipv4' },
      { name: 'cidr', labelKey: 'f_compare_cidr', type: 'cidr', placeholder: '24', required: false, validate: 'cidrOptional' }
    ],
    run: function (v) {
      if (NetCore.ipToLong(v.start) > NetCore.ipToLong(v.end)) throw { field: 'end', key: 'e_order' };
      var r = NetCore.calcRange(v.start, v.end, v.cidr);
      var f = [
        ['r_first', r.first],
        ['r_last', r.last],
        ['r_total', r.total],
        ['r_range', r.range],
        ['r_supernet', r.supernet],
        ['r_mask', r.supernetMask],
        ['r_exact', r.exactBlock ? 'v_yes' : 'v_no'],
        ['r_blocks', r.cidrBlocks.join('  ·  ')]
      ];
      if (r.sameNetwork !== null) f.splice(5, 0, ['r_same_net', r.sameNetwork ? 'v_yes' : 'v_no']);
      return { fields: f, viz: { network: r.supernet.split('/')[0], cidr: Number(r.supernet.split('/')[1]) } };
    }
  },

  /* ---------------------------------------------------------------- */
  {
    id: 'subnet-mask-calculator',
    icon: '🎭',
    keywords: ['mask', 'قناع'],
    fields: [
      { name: 'value', labelKey: 'f_mask_or_cidr', type: 'text', placeholder: '24  /  255.255.255.0', required: true, validate: 'maskOrCidr' }
    ],
    run: function (v) {
      var cidr = NetCore.parsePrefix(v.value);
      var mask = NetCore.maskFromCidr(cidr);
      var total = Math.pow(2, 32 - cidr);
      return {
        fields: [
          ['r_cidr', '/' + cidr],
          ['r_mask', mask],
          ['r_wildcard', NetCore.wildcardFromCidr(cidr)],
          ['r_mask_bin', NetCore.ipToBinary(mask)],
          ['r_binary', NetCore.ipToBinary(NetCore.wildcardFromCidr(cidr))],
          ['r_total', total],
          ['r_usable', cidr === 32 ? 1 : (cidr === 31 ? 2 : total - 2)],
          ['r_hex', NetCore.ipToHex(mask)]
        ]
      };
    }
  },

  /* ---------------------------------------------------------------- */
  {
    id: 'wildcard-calculator',
    icon: '🃏',
    keywords: ['wildcard', 'acl'],
    fields: [
      { name: 'mask', labelKey: 'f_mask', type: 'text', placeholder: '255.255.255.0', required: true, validate: 'maskOrCidr' }
    ],
    run: function (v) {
      var cidr = NetCore.parsePrefix(v.mask);
      var mask = NetCore.maskFromCidr(cidr);
      var wc = NetCore.wildcardFromCidr(cidr);
      return {
        fields: [
          ['r_mask', mask],
          ['r_wildcard', wc],
          ['r_cidr', '/' + cidr],
          ['r_mask_bin', NetCore.ipToBinary(mask)],
          ['r_binary', NetCore.ipToBinary(wc)],
          ['r_total', Math.pow(2, 32 - cidr)]
        ]
      };
    }
  },

  /* ---------------------------------------------------------------- */
  {
    id: 'ipv4-analyzer',
    icon: '🔍',
    keywords: ['analyzer', 'class', 'private', 'تحليل', 'فئة'],
    fields: [
      { name: 'ip', labelKey: 'f_ipv4', type: 'text', placeholder: '169.254.10.5', required: true, validate: 'ipv4' }
    ],
    run: function (v) {
      var a = NetCore.analyzeIPv4(v.ip);
      return {
        fields: [
          ['r_ip', a.ip],
          ['r_class', a.class],
          ['r_scope', a.private ? 'v_private' : (a.public ? 'v_public' : 'r_reserved')],
          ['r_default_mask', a.defaultMask || 'v_na'],
          ['r_loopback', a.loopback ? 'v_yes' : 'v_no'],
          ['r_linklocal', a.linkLocal ? 'v_yes' : 'v_no'],
          ['r_multicast', a.multicast ? 'v_yes' : 'v_no'],
          ['r_reserved', a.reserved ? 'v_yes' : 'v_no'],
          ['r_broadcast_addr', a.limitedBroadcast ? 'v_yes' : 'v_no'],
          ['r_binary', a.binary],
          ['r_decimal', a.decimal],
          ['r_hex', a.hex]
        ]
      };
    }
  },

  /* ---------------------------------------------------------------- */
  {
    id: 'ipv6-calculator',
    icon: '🌍',
    keywords: ['ipv6', 'v6'],
    fields: [
      { name: 'ip', labelKey: 'f_ipv6', type: 'text', placeholder: '2001:db8::1', required: true, validate: 'ipv6' },
      { name: 'prefix', labelKey: 'f_prefix_len', type: 'number', placeholder: '64', required: false, validate: 'cidr6' }
    ],
    run: function (v) {
      var r = NetCore.calcIPv6(v.ip, v.prefix === '' || v.prefix === undefined ? 64 : v.prefix);
      if (!r) throw { field: 'ip', key: 'e_ipv6' };
      return {
        fields: [
          ['r_full', r.full],
          ['r_compressed', r.compressed],
          ['r_prefix_len', '/' + r.prefixLength],
          ['r_net_prefix', r.networkPrefix],
          ['r_iface_id', r.interfaceId],
          ['r_type', 't_' + r.type],
          ['r_first_addr', r.firstAddress],
          ['r_last_addr', r.lastAddress],
          ['r_total', r.totalAddresses],
          ['r_hex', r.hex]
        ]
      };
    }
  },

  /* ---------------------------------------------------------------- */
  {
    id: 'number-converter',
    icon: '🔢',
    keywords: ['convert', 'binary', 'hex', 'decimal', 'تحويل', 'ثنائي'],
    fields: [
      {
        name: 'mode', labelKey: 'f_mode', type: 'select', required: true, default: 'dec_bin',
        options: [
          { value: 'dec_bin', labelKey: 'm_dec_bin' },
          { value: 'bin_dec', labelKey: 'm_bin_dec' },
          { value: 'dec_hex', labelKey: 'm_dec_hex' },
          { value: 'hex_dec', labelKey: 'm_hex_dec' },
          { value: 'ip_bin', labelKey: 'm_ip_bin' },
          { value: 'ip_dec', labelKey: 'm_ip_dec' },
          { value: 'dec_ip', labelKey: 'm_dec_ip' }
        ]
      },
      { name: 'value', labelKey: 'f_value', type: 'text', placeholder: '192', required: true }
    ],
    run: function (v) {
      var val = String(v.value).trim(), out, extra = [];
      switch (v.mode) {
        case 'dec_bin':
          if (!/^\d+$/.test(val)) throw { field: 'value', key: 'e_number' };
          out = NetCore.decToBin(val);
          extra.push(['r_hex', NetCore.decToHex(val)]);
          break;
        case 'bin_dec':
          if (!/^[01]+$/.test(val)) throw { field: 'value', key: 'e_binary' };
          out = NetCore.binToDec(val);
          extra.push(['r_hex', NetCore.decToHex(out)]);
          break;
        case 'dec_hex':
          if (!/^\d+$/.test(val)) throw { field: 'value', key: 'e_number' };
          out = NetCore.decToHex(val);
          extra.push(['r_binary', NetCore.decToBin(val)]);
          break;
        case 'hex_dec':
          if (!/^(0x)?[0-9a-fA-F]+$/.test(val)) throw { field: 'value', key: 'e_hex' };
          out = NetCore.hexToDec(val);
          extra.push(['r_binary', NetCore.decToBin(out)]);
          break;
        case 'ip_bin':
          if (!NetCore.isValidIPv4(val)) throw { field: 'value', key: 'e_ipv4' };
          out = NetCore.ipToBinary(val);
          extra.push(['r_decimal', NetCore.ipToLong(val)], ['r_hex', NetCore.ipToHex(val)]);
          break;
        case 'ip_dec':
          if (!NetCore.isValidIPv4(val)) throw { field: 'value', key: 'e_ipv4' };
          out = NetCore.ipToLong(val);
          extra.push(['r_binary', NetCore.ipToBinary(val)]);
          break;
        case 'dec_ip':
          if (!/^\d+$/.test(val) || Number(val) > 4294967295) throw { field: 'value', key: 'e_number' };
          out = NetCore.longToIp(Number(val));
          extra.push(['r_binary', NetCore.ipToBinary(out)]);
          break;
      }
      return { fields: [['r_input', val], ['r_result', out]].concat(extra) };
    }
  }
];

var TOOL_MAP = {};
TOOLS.forEach(function (t) { TOOL_MAP[t.id] = t; });

var PAGES = TOOLS.map(function (t) { return t.id; })
  .concat(['visualization', 'history', 'basics', 'settings']);

if (typeof module !== 'undefined' && module.exports) { module.exports = { TOOLS: TOOLS, TOOL_MAP: TOOL_MAP }; }
