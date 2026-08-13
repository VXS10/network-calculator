/* =====================================================================
   net.js — Network calculation engine (pure logic, no DOM, no network)
   Network Calculator Toolkit
   ===================================================================== */
'use strict';

var NetCore = (function () {

  /* ------------------------------------------------------------------
     IPv4 — helpers
     ------------------------------------------------------------------ */
  var IPV4_RE = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

  function isValidIPv4(str) {
    if (typeof str !== 'string') return false;
    var m = str.trim().match(IPV4_RE);
    if (!m) return false;
    for (var i = 1; i <= 4; i++) {
      var part = m[i];
      if (part.length > 1 && part[0] === '0') return false;
      var v = Number(part);
      if (!isFinite(v) || v < 0 || v > 255) return false;
    }
    return true;
  }

  function ipToLong(ip) {
    var p = ip.trim().split('.').map(Number);
    return (((p[0] * 256 + p[1]) * 256 + p[2]) * 256 + p[3]) >>> 0;
  }

  function longToIp(n) {
    n = n >>> 0;
    return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');
  }

  function bin8(n) {
    var s = Number(n).toString(2);
    while (s.length < 8) s = '0' + s;
    return s;
  }

  function ipToBinary(ip, sep) {
    sep = (sep === undefined) ? '.' : sep;
    return ip.split('.').map(function (o) { return bin8(Number(o)); }).join(sep);
  }

  function ipToHex(ip) {
    return '0x' + ip.split('.').map(function (o) {
      var h = Number(o).toString(16).toUpperCase();
      return h.length < 2 ? '0' + h : h;
    }).join('');
  }

  function maskLongFromCidr(cidr) {
    cidr = Number(cidr);
    return cidr === 0 ? 0 : (0xFFFFFFFF << (32 - cidr)) >>> 0;
  }

  function maskFromCidr(cidr) { return longToIp(maskLongFromCidr(cidr)); }

  function isValidMask(mask) {
    if (!isValidIPv4(mask)) return false;
    var n = ipToLong(mask);
    var inv = (~n) >>> 0;
    return (((inv + 1) & inv) >>> 0) === 0;
  }

  function cidrFromMask(mask) {
    if (!isValidMask(mask)) return null;
    var n = ipToLong(mask), c = 0;
    while (n) { c += n & 1; n >>>= 1; }
    return c;
  }

  function wildcardFromMask(mask) { return longToIp((~ipToLong(mask)) >>> 0); }
  function wildcardFromCidr(cidr) { return longToIp((~maskLongFromCidr(cidr)) >>> 0); }

  function isValidCidr(c, max) {
    max = max || 32;
    if (c === '' || c === null || c === undefined) return false;
    var n = Number(c);
    return /^\d+$/.test(String(c).trim()) && n >= 0 && n <= max;
  }

  /** Accepts "24", "/24" or "255.255.255.0" and returns a prefix length. */
  function parsePrefix(value) {
    if (value === null || value === undefined) return null;
    var v = String(value).trim().replace(/^\//, '');
    if (/^\d{1,2}$/.test(v)) {
      var n = Number(v);
      return (n >= 0 && n <= 32) ? n : null;
    }
    if (isValidIPv4(v)) return cidrFromMask(v);
    return null;
  }

  /* ------------------------------------------------------------------
     IPv4 — classification
     ------------------------------------------------------------------ */
  function ipClass(ip) {
    var f = Number(ip.split('.')[0]);
    if (f < 128) return 'A';
    if (f < 192) return 'B';
    if (f < 224) return 'C';
    if (f < 240) return 'D';
    return 'E';
  }

  function defaultClassMask(ip) {
    var c = ipClass(ip);
    if (c === 'A') return '255.0.0.0';
    if (c === 'B') return '255.255.0.0';
    if (c === 'C') return '255.255.255.0';
    return null;
  }

  function inBlock(ipLong, block) {
    var parts = block.split('/');
    var m = maskLongFromCidr(Number(parts[1]));
    return ((ipToLong(parts[0]) & m) >>> 0) === ((ipLong & m) >>> 0);
  }

  var PRIVATE_BLOCKS = ['10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16'];
  var RESERVED_BLOCKS = [
    '0.0.0.0/8', '100.64.0.0/10', '192.0.0.0/24', '192.0.2.0/24',
    '192.88.99.0/24', '198.18.0.0/15', '198.51.100.0/24',
    '203.0.113.0/24', '240.0.0.0/4'
  ];

  function isPrivate(ip) {
    var n = ipToLong(ip);
    return PRIVATE_BLOCKS.some(function (b) { return inBlock(n, b); });
  }

  function analyzeIPv4(ip) {
    var n = ipToLong(ip);
    var loopback = inBlock(n, '127.0.0.0/8');
    var linkLocal = inBlock(n, '169.254.0.0/16');
    var multicast = inBlock(n, '224.0.0.0/4');
    var experimental = inBlock(n, '240.0.0.0/4') && n !== 0xFFFFFFFF;
    var broadcast = (n === 0xFFFFFFFF);
    var priv = isPrivate(ip);
    var reserved = RESERVED_BLOCKS.some(function (b) { return inBlock(n, b); }) || broadcast;
    var isPublic = !(priv || loopback || linkLocal || multicast || reserved);
    return {
      ip: ip,
      long: n,
      class: ipClass(ip),
      defaultMask: defaultClassMask(ip),
      private: priv,
      public: isPublic,
      loopback: loopback,
      linkLocal: linkLocal,
      multicast: multicast,
      reserved: reserved,
      experimental: experimental,
      limitedBroadcast: broadcast,
      binary: ipToBinary(ip),
      hex: ipToHex(ip),
      decimal: n
    };
  }

  /* ------------------------------------------------------------------
     IPv4 — core subnet math
     ------------------------------------------------------------------ */
  function calcIPv4(ip, cidr) {
    cidr = Number(cidr);
    var maskL = maskLongFromCidr(cidr);
    var ipL = ipToLong(ip);
    var net = (ipL & maskL) >>> 0;
    var bcastL = (net | ((~maskL) >>> 0)) >>> 0;
    var total = Math.pow(2, 32 - cidr);
    var first, last, usable, bcast;

    if (cidr === 32) {
      first = net; last = net; usable = 1; bcast = null;
    } else if (cidr === 31) {
      first = net; last = net + 1; usable = 2; bcast = null;
    } else {
      first = net + 1; last = bcastL - 1; usable = total - 2; bcast = longToIp(bcastL);
    }

    return {
      ip: ip,
      cidr: cidr,
      prefix: '/' + cidr,
      network: longToIp(net),
      networkLong: net,
      broadcast: bcast,
      broadcastLong: (cidr >= 31 ? null : bcastL),
      firstHost: longToIp(first >>> 0),
      lastHost: longToIp(last >>> 0),
      firstHostLong: first >>> 0,
      lastHostLong: last >>> 0,
      totalAddresses: total,
      usableHosts: usable,
      mask: maskFromCidr(cidr),
      maskBinary: ipToBinary(maskFromCidr(cidr)),
      wildcard: wildcardFromCidr(cidr),
      class: ipClass(ip),
      private: isPrivate(ip),
      binary: ipToBinary(ip),
      networkBinary: ipToBinary(longToIp(net)),
      hostRange: (usable > 0)
        ? longToIp(first >>> 0) + ' – ' + longToIp(last >>> 0)
        : '—'
    };
  }

  /* Split a block into equally sized subnets (FLSM). */
  function splitSubnets(ip, baseCidr, newCidr, limit) {
    baseCidr = Number(baseCidr);
    newCidr = Number(newCidr);
    limit = limit || 1024;
    var base = (ipToLong(ip) & maskLongFromCidr(baseCidr)) >>> 0;
    var count = Math.pow(2, newCidr - baseCidr);
    var size = Math.pow(2, 32 - newCidr);
    var shown = Math.min(count, limit);
    var rows = [];
    for (var i = 0; i < shown; i++) {
      rows.push(calcIPv4(longToIp((base + i * size) >>> 0), newCidr));
    }
    return {
      baseNetwork: longToIp(base),
      baseCidr: baseCidr,
      newCidr: newCidr,
      subnetCount: count,
      subnetSize: size,
      hostsPerSubnet: newCidr === 32 ? 1 : (newCidr === 31 ? 2 : size - 2),
      rows: rows,
      shown: shown,
      truncated: count > shown
    };
  }

  /* Smallest prefix that can host `hosts` usable addresses. */
  function cidrForHosts(hosts) {
    hosts = Number(hosts);
    for (var c = 30; c >= 0; c--) {
      if (Math.pow(2, 32 - c) - 2 >= hosts) return c;
    }
    return 0;
  }

  /* VLSM allocation — largest first, naturally aligned, no overlap. */
  function vlsm(ip, cidr, requirements) {
    cidr = Number(cidr);
    var base = (ipToLong(ip) & maskLongFromCidr(cidr)) >>> 0;
    var totalSize = Math.pow(2, 32 - cidr);
    var end = base + totalSize; /* exclusive */
    var sorted = requirements.slice().sort(function (a, b) { return Number(b.hosts) - Number(a.hosts); });
    var cursor = base, rows = [], failed = [];

    sorted.forEach(function (r) {
      var need = Number(r.hosts);
      var c = cidrForHosts(need);
      var size = Math.pow(2, 32 - c);
      var start = Math.ceil(cursor / size) * size;   /* natural alignment */
      if (start + size > end) {
        failed.push({ name: r.name, hosts: need, requiredCidr: c });
        return;
      }
      var info = calcIPv4(longToIp(start >>> 0), c);
      info.name = r.name;
      info.requested = need;
      info.unusedInBlock = info.usableHosts - need;
      rows.push(info);
      cursor = start + size;
    });

    return {
      base: longToIp(base) + '/' + cidr,
      rows: rows,
      failed: failed,
      totalSize: totalSize,
      allocated: cursor - base,
      remainingIPs: totalSize - (cursor - base),
      nextAvailable: cursor < end ? longToIp(cursor >>> 0) : null
    };
  }

  /* ------------------------------------------------------------------
     IPv4 — ranges
     ------------------------------------------------------------------ */
  function commonPrefixLen(a, b) {
    var x = (a ^ b) >>> 0, c = 0;
    for (var i = 31; i >= 0; i--) {
      if ((x >>> i) & 1) break;
      c++;
    }
    return c;
  }

  function rangeToCidrs(startL, endL, limit) {
    limit = limit || 256;
    var out = [], start = startL;
    while (start <= endL && out.length < limit) {
      var maxSize = 32;
      while (maxSize > 0) {
        var mask = maskLongFromCidr(maxSize - 1);
        if (((start & mask) >>> 0) !== start) break;
        maxSize--;
      }
      var span = endL - start + 1;
      var maxDiff = 32 - Math.floor(Math.log(span) / Math.LN2);
      if (maxSize < maxDiff) maxSize = maxDiff;
      out.push(longToIp(start) + '/' + maxSize);
      start = start + Math.pow(2, 32 - maxSize);
    }
    return out;
  }

  function calcRange(startIp, endIp, cidr) {
    var s = ipToLong(startIp), e = ipToLong(endIp);
    var pref = commonPrefixLen(s, e);
    var supernet = calcIPv4(longToIp((s & maskLongFromCidr(pref)) >>> 0), pref);
    var sameNetwork = null;
    if (cidr !== null && cidr !== undefined && cidr !== '') {
      var m = maskLongFromCidr(Number(cidr));
      sameNetwork = ((s & m) >>> 0) === ((e & m) >>> 0);
    }
    return {
      first: startIp,
      last: endIp,
      total: e - s + 1,
      range: startIp + ' – ' + endIp,
      supernet: supernet.network + '/' + pref,
      supernetMask: maskFromCidr(pref),
      exactBlock: supernet.networkLong === s &&
        (pref <= 30 ? supernet.broadcastLong === e : (s + Math.pow(2, 32 - pref) - 1) === e),
      sameNetwork: sameNetwork,
      cidrBlocks: rangeToCidrs(s, e),
      firstBinary: ipToBinary(startIp),
      lastBinary: ipToBinary(endIp)
    };
  }

  /* ------------------------------------------------------------------
     IPv6
     ------------------------------------------------------------------ */
  function parseIPv6(input) {
    if (typeof input !== 'string') return null;
    var s = input.trim();
    if (!s) return null;
    var pct = s.indexOf('%');
    if (pct > -1) s = s.slice(0, pct);
    if (/[^0-9a-fA-F:.]/.test(s)) return null;
    if ((s.match(/::/g) || []).length > 1) return null;
    if (s.indexOf(':::') > -1) return null;
    if (s.indexOf(':') === -1) return null;

    var lastColon = s.lastIndexOf(':');
    var tail = s.slice(lastColon + 1);
    if (tail.indexOf('.') > -1) {
      if (!isValidIPv4(tail)) return null;
      var p = tail.split('.').map(Number);
      s = s.slice(0, lastColon + 1) +
        (((p[0] << 8) | p[1]).toString(16)) + ':' + (((p[2] << 8) | p[3]).toString(16));
    }

    var groups;
    if (s.indexOf('::') > -1) {
      var parts = s.split('::');
      var head = parts[0] === '' ? [] : parts[0].split(':');
      var rest = parts[1] === '' ? [] : parts[1].split(':');
      if (head.length + rest.length > 7) return null;
      var fill = [];
      for (var i = 0; i < 8 - head.length - rest.length; i++) fill.push('0');
      groups = head.concat(fill, rest);
    } else {
      groups = s.split(':');
      if (groups.length !== 8) return null;
    }

    var out = [];
    for (var j = 0; j < groups.length; j++) {
      var g = groups[j];
      if (g === '' || g.length > 4 || !/^[0-9a-fA-F]+$/.test(g)) return null;
      out.push(parseInt(g, 16));
    }
    return out.length === 8 ? out : null;
  }

  function isValidIPv6(str) { return parseIPv6(str) !== null; }

  function expandIPv6(groups) {
    return groups.map(function (g) {
      var h = g.toString(16);
      while (h.length < 4) h = '0' + h;
      return h;
    }).join(':');
  }

  function compressIPv6(groups) {
    var hex = groups.map(function (g) { return g.toString(16); });
    var bestStart = -1, bestLen = 0, curStart = -1, curLen = 0;
    for (var i = 0; i < 8; i++) {
      if (groups[i] === 0) {
        if (curStart < 0) { curStart = i; curLen = 1; } else { curLen++; }
        if (curLen > bestLen) { bestLen = curLen; bestStart = curStart; }
      } else { curStart = -1; curLen = 0; }
    }
    if (bestLen < 2) return hex.join(':');
    var left = hex.slice(0, bestStart).join(':');
    var right = hex.slice(bestStart + bestLen).join(':');
    return left + '::' + right;
  }

  function groupsToBig(g) {
    var n = 0n;
    for (var i = 0; i < 8; i++) n = (n << 16n) | BigInt(g[i]);
    return n;
  }

  function bigToGroups(n) {
    var g = [];
    for (var i = 0; i < 8; i++) g.push(Number((n >> BigInt(16 * (7 - i))) & 0xFFFFn));
    return g;
  }

  function ipv6Type(groups) {
    var g0 = groups[0];
    var allZero = groups.every(function (x) { return x === 0; });
    if (allZero) return 'unspecified';
    if (groups.slice(0, 7).every(function (x) { return x === 0; }) && groups[7] === 1) return 'loopback';
    if (groups[0] === 0 && groups[1] === 0 && groups[2] === 0 &&
        groups[3] === 0 && groups[4] === 0 && groups[5] === 0xFFFF) return 'ipv4mapped';
    if (groups[0] === 0x64 && groups[1] === 0xFF9B) return 'nat64';
    if ((g0 & 0xFF00) === 0xFF00) return 'multicast';
    if ((g0 & 0xFFC0) === 0xFE80) return 'linklocal';
    if ((g0 & 0xFFC0) === 0xFEC0) return 'sitelocal';
    if ((g0 & 0xFE00) === 0xFC00) return 'uniquelocal';
    if ((g0 & 0xE000) === 0x2000) return 'globalunicast';
    return 'reserved';
  }

  function calcIPv6(address, prefixLen) {
    var groups = parseIPv6(address);
    if (!groups) return null;
    prefixLen = (prefixLen === null || prefixLen === undefined || prefixLen === '') ? 64 : Number(prefixLen);
    var full = groupsToBig(groups);
    var maskBig = prefixLen === 0 ? 0n
      : ((1n << BigInt(prefixLen)) - 1n) << BigInt(128 - prefixLen);
    var netBig = full & maskBig;
    var idBig = full & ~maskBig & ((1n << 128n) - 1n);
    var netGroups = bigToGroups(netBig);
    var idGroups = bigToGroups(idBig);
    var lastBig = netBig | (~maskBig & ((1n << 128n) - 1n));

    return {
      valid: true,
      full: expandIPv6(groups),
      compressed: compressIPv6(groups),
      prefixLength: prefixLen,
      networkPrefix: compressIPv6(netGroups) + '/' + prefixLen,
      networkFull: expandIPv6(netGroups),
      interfaceId: expandIPv6(idGroups),
      firstAddress: compressIPv6(netGroups),
      lastAddress: compressIPv6(bigToGroups(lastBig)),
      totalAddresses: (1n << BigInt(128 - prefixLen)).toString(),
      type: ipv6Type(groups),
      decimal: full.toString(),
      hex: '0x' + full.toString(16).toUpperCase()
    };
  }

  /* ------------------------------------------------------------------
     Number conversion
     ------------------------------------------------------------------ */
  function decToBin(v) { return BigInt(v).toString(2); }
  function binToDec(v) { return BigInt('0b' + String(v).trim()).toString(10); }
  function decToHex(v) { return BigInt(v).toString(16).toUpperCase(); }
  function hexToDec(v) { return BigInt('0x' + String(v).trim().replace(/^0x/i, '')).toString(10); }
  function decToOct(v) { return BigInt(v).toString(8); }
  function octToDec(v) { return BigInt('0o' + String(v).trim()).toString(10); }

  /* ------------------------------------------------------------------
     Exports
     ------------------------------------------------------------------ */
  return {
    isValidIPv4: isValidIPv4,
    ipToLong: ipToLong,
    longToIp: longToIp,
    ipToBinary: ipToBinary,
    ipToHex: ipToHex,
    maskFromCidr: maskFromCidr,
    maskLongFromCidr: maskLongFromCidr,
    cidrFromMask: cidrFromMask,
    isValidMask: isValidMask,
    isValidCidr: isValidCidr,
    parsePrefix: parsePrefix,
    wildcardFromMask: wildcardFromMask,
    wildcardFromCidr: wildcardFromCidr,
    ipClass: ipClass,
    defaultClassMask: defaultClassMask,
    isPrivate: isPrivate,
    analyzeIPv4: analyzeIPv4,
    calcIPv4: calcIPv4,
    splitSubnets: splitSubnets,
    cidrForHosts: cidrForHosts,
    vlsm: vlsm,
    calcRange: calcRange,
    rangeToCidrs: rangeToCidrs,
    commonPrefixLen: commonPrefixLen,
    parseIPv6: parseIPv6,
    isValidIPv6: isValidIPv6,
    expandIPv6: expandIPv6,
    compressIPv6: compressIPv6,
    ipv6Type: ipv6Type,
    calcIPv6: calcIPv6,
    decToBin: decToBin,
    binToDec: binToDec,
    decToHex: decToHex,
    hexToDec: hexToDec,
    decToOct: decToOct,
    octToDec: octToDec
  };
})();

if (typeof module !== 'undefined' && module.exports) { module.exports = NetCore; }
