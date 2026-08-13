/* ===================================================================
   NETMATH — Core IPv4 / IPv6 / Binary math engine (no dependencies)
   =================================================================== */

const NetMath = (() => {

  /* ---------------- IPv4 basics ---------------- */

  function isValidIPv4(str){
    if(typeof str !== 'string') return false;
    const parts = str.trim().split('.');
    if(parts.length !== 4) return false;
    for(const p of parts){
      if(!/^\d{1,3}$/.test(p)) return false;
      const n = parseInt(p,10);
      if(n < 0 || n > 255) return false;
      if(p.length > 1 && p[0] === '0') return false; // no leading zeros
    }
    return true;
  }

  function ipToLong(ip){
    const parts = ip.trim().split('.').map(Number);
    return ((parts[0]<<24) >>> 0) + (parts[1]<<16) + (parts[2]<<8) + parts[3];
  }

  function longToIp(long){
    long = long >>> 0;
    return [
      (long >>> 24) & 255,
      (long >>> 16) & 255,
      (long >>> 8) & 255,
      long & 255
    ].join('.');
  }

  function isValidCIDR(cidr, max=32){
    if(cidr === '' || cidr === null || cidr === undefined) return false;
    if(!/^\d{1,3}$/.test(String(cidr))) return false;
    const n = parseInt(cidr,10);
    return n >= 0 && n <= max;
  }

  function cidrToMaskLong(cidr){
    cidr = parseInt(cidr,10);
    if(cidr === 0) return 0;
    return (0xFFFFFFFF << (32-cidr)) >>> 0;
  }

  function cidrToMask(cidr){
    return longToIp(cidrToMaskLong(cidr));
  }

  function maskToCIDR(mask){
    const long = ipToLong(mask);
    let cidr = 0;
    let seenZero = false;
    for(let i=31;i>=0;i--){
      const bit = (long >>> i) & 1;
      if(bit === 1){
        if(seenZero) return null; // invalid, non-contiguous mask
        cidr++;
      } else {
        seenZero = true;
      }
    }
    return cidr;
  }

  function isValidSubnetMask(mask){
    if(!isValidIPv4(mask)) return false;
    return maskToCIDR(mask) !== null;
  }

  function wildcardFromCIDR(cidr){
    const maskLong = cidrToMaskLong(cidr);
    const wildcardLong = (~maskLong) >>> 0;
    return longToIp(wildcardLong);
  }

  function wildcardFromMask(mask){
    const cidr = maskToCIDR(mask);
    if(cidr === null) return null;
    return wildcardFromCIDR(cidr);
  }

  function ipToBinary(ip, sep=true){
    return ip.trim().split('.').map(o => parseInt(o,10).toString(2).padStart(8,'0')).join(sep ? '.' : '');
  }

  function getIPClass(ip){
    const first = parseInt(ip.split('.')[0],10);
    if(first >= 0 && first <= 127) return 'A';
    if(first >= 128 && first <= 191) return 'B';
    if(first >= 192 && first <= 223) return 'C';
    if(first >= 224 && first <= 239) return 'D (Multicast)';
    if(first >= 240 && first <= 255) return 'E (Reserved/Experimental)';
    return 'Unknown';
  }

  function defaultClassMask(ip){
    const cls = getIPClass(ip)[0];
    if(cls === 'A') return { mask:'255.0.0.0', cidr:8 };
    if(cls === 'B') return { mask:'255.255.0.0', cidr:16 };
    if(cls === 'C') return { mask:'255.255.255.0', cidr:24 };
    return { mask:'-', cidr:null };
  }

  function isPrivateIP(ip){
    const long = ipToLong(ip);
    const ranges = [
      ['10.0.0.0','10.255.255.255'],
      ['172.16.0.0','172.31.255.255'],
      ['192.168.0.0','192.168.255.255'],
      ['169.254.0.0','169.254.255.255'], // link-local (APIPA)
      ['127.0.0.0','127.255.255.255']    // loopback
    ];
    return ranges.some(([a,b]) => long >= ipToLong(a) && long <= ipToLong(b));
  }

  function isLoopback(ip){
    const first = parseInt(ip.split('.')[0],10);
    return first === 127;
  }

  function isLinkLocal(ip){
    const parts = ip.split('.').map(Number);
    return parts[0] === 169 && parts[1] === 254;
  }

  function isMulticast(ip){
    const first = parseInt(ip.split('.')[0],10);
    return first >= 224 && first <= 239;
  }

  function isReserved(ip){
    const first = parseInt(ip.split('.')[0],10);
    return first >= 240;
  }

  /* ---------------- Network calculations ---------------- */

  function calcNetwork(ip, cidr){
    const ipLong = ipToLong(ip);
    const maskLong = cidrToMaskLong(cidr);
    const networkLong = (ipLong & maskLong) >>> 0;
    const broadcastLong = (networkLong | (~maskLong >>> 0)) >>> 0;
    const totalAddresses = Math.pow(2, 32-cidr);
    let usableHosts, firstHost, lastHost;

    if(cidr >= 31){
      // /31 and /32 special cases (RFC 3021)
      usableHosts = cidr === 32 ? 1 : 2;
      firstHost = longToIp(networkLong);
      lastHost = longToIp(broadcastLong);
    } else {
      usableHosts = totalAddresses - 2;
      firstHost = longToIp(networkLong + 1);
      lastHost = longToIp(broadcastLong - 1);
    }

    return {
      ip,
      cidr,
      network: longToIp(networkLong),
      networkLong,
      broadcast: longToIp(broadcastLong),
      broadcastLong,
      firstHost,
      lastHost,
      totalAddresses,
      usableHosts,
      subnetMask: cidrToMask(cidr),
      wildcardMask: wildcardFromCIDR(cidr),
      ipClass: getIPClass(ip),
      isPrivate: isPrivateIP(ip),
      binary: ipToBinary(ip)
    };
  }

  /* ---------------- Subnetting (equal subnets) ---------------- */

  function calcSubnets(networkIp, baseCidr, newCidr){
    const baseLong = ipToLong(networkIp) & cidrToMaskLong(baseCidr) >>> 0;
    const count = Math.pow(2, newCidr - baseCidr);
    const blockSize = Math.pow(2, 32-newCidr);
    const subnets = [];
    for(let i=0;i<count;i++){
      const netLong = (baseLong + i*blockSize) >>> 0;
      subnets.push(calcNetwork(longToIp(netLong), newCidr));
    }
    return subnets;
  }

  /* ---------------- VLSM ---------------- */

  function calcVLSM(networkIp, baseCidr, requirements){
    // requirements: [{name, hosts}]
    const sorted = requirements
      .map((r,idx) => ({...r, hosts:parseInt(r.hosts,10), origIndex:idx}))
      .sort((a,b) => b.hosts - a.hosts);

    const baseLong = (ipToLong(networkIp) & cidrToMaskLong(baseCidr)) >>> 0;
    const totalAvailable = Math.pow(2, 32-baseCidr);
    let cursor = baseLong;
    const results = [];
    let overflow = false;

    for(const req of sorted){
      // find the largest cidr (smallest block) whose usable-host count still covers the requirement.
      // Capacity grows monotonically as cidr decreases, so scan upward from /32 and stop
      // at the first (largest) cidr that satisfies the requirement.
      let needCidr = 0;
      for(let c=32;c>=0;c--){
        const size = Math.pow(2,32-c);
        const usable = c>=31 ? size : size-2;
        if(usable >= req.hosts){
          needCidr = c;
          break;
        }
      }
      const blockSize = Math.pow(2,32-needCidr);

      if(cursor - baseLong + blockSize > totalAvailable){
        overflow = true;
        results.push({ ...req, error:'NO_SPACE' });
        continue;
      }

      const net = calcNetwork(longToIp(cursor), needCidr);
      results.push({
        name: req.name,
        hostsRequired: req.hosts,
        origIndex: req.origIndex,
        ...net,
        remainingInBlock: net.usableHosts - req.hosts
      });
      cursor = (cursor + blockSize) >>> 0;
    }

    const usedTotal = cursor - baseLong;
    return {
      results: results.sort((a,b)=>a.origIndex-b.origIndex),
      overflow,
      totalAvailable,
      usedTotal,
      remainingIPs: totalAvailable - usedTotal
    };
  }

  /* ---------------- IP Range ---------------- */

  function calcIPRange(startIp, endIp){
    const startLong = ipToLong(startIp);
    const endLong = ipToLong(endIp);
    if(startLong > endLong) return null;
    const total = endLong - startLong + 1;
    // check if same /24-ish network heuristic: check if all in same network for smallest common cidr
    return {
      startIp, endIp, startLong, endLong,
      total,
      range: `${startIp} - ${endIp}`
    };
  }

  function sameNetwork(ip1, ip2, cidr){
    const maskLong = cidrToMaskLong(cidr);
    return ((ipToLong(ip1) & maskLong) >>> 0) === ((ipToLong(ip2) & maskLong) >>> 0);
  }

  /* ---------------- Number conversions ---------------- */

  function decToBin(n){ return (parseInt(n,10) >>> 0).toString(2); }
  function binToDec(b){ return parseInt(b,2); }
  function decToHex(n){ return (parseInt(n,10) >>> 0).toString(16).toUpperCase(); }
  function hexToDec(h){ return parseInt(h,16); }
  function isValidBinary(s){ return /^[01]+$/.test(s); }
  function isValidHex(s){ return /^[0-9a-fA-F]+$/.test(s); }

  /* ---------------- IPv6 ---------------- */

  function isValidIPv6(str){
    if(typeof str !== 'string' || str.trim() === '') return false;
    str = str.trim();
    // basic structural validation
    if(str.indexOf(':::') !== -1) return false;
    const doubleColonCount = (str.match(/::/g) || []).length;
    if(doubleColonCount > 1) return false;

    let hextets;
    if(str.includes('::')){
      const [left, right] = str.split('::');
      const leftParts = left ? left.split(':').filter(x=>x!=='') : [];
      const rightParts = right ? right.split(':').filter(x=>x!=='') : [];
      hextets = [...leftParts, ...rightParts];
      if(hextets.length > 7) return false;
    } else {
      hextets = str.split(':');
      if(hextets.length !== 8) return false;
    }
    return hextets.every(h => /^[0-9a-fA-F]{1,4}$/.test(h));
  }

  function expandIPv6(str){
    str = str.trim();
    let full = ['0000','0000','0000','0000','0000','0000','0000','0000'];
    if(str.includes('::')){
      const [left, right] = str.split('::');
      const leftParts = left ? left.split(':').filter(x=>x!=='') : [];
      const rightParts = right ? right.split(':').filter(x=>x!=='') : [];
      leftParts.forEach((p,i) => full[i] = p.padStart(4,'0'));
      rightParts.forEach((p,i) => full[8-rightParts.length+i] = p.padStart(4,'0'));
    } else {
      str.split(':').forEach((p,i) => full[i] = p.padStart(4,'0'));
    }
    return full.join(':');
  }

  function compressIPv6(fullAddr){
    let groups = fullAddr.split(':').map(g => g.replace(/^0+(?=.)/,''));
    // find longest run of zero groups
    let bestStart=-1, bestLen=0, curStart=-1, curLen=0;
    for(let i=0;i<groups.length;i++){
      if(groups[i] === '0'){
        if(curStart === -1) curStart = i;
        curLen++;
        if(curLen > bestLen){ bestLen = curLen; bestStart = curStart; }
      } else {
        curStart = -1; curLen = 0;
      }
    }
    if(bestLen > 1){
      const before = groups.slice(0,bestStart);
      const after = groups.slice(bestStart+bestLen);
      return before.join(':') + '::' + after.join(':');
    }
    return groups.join(':');
  }

  function ipv6AddressType(fullAddr){
    const first16 = fullAddr.split(':')[0];
    const firstByte = parseInt(first16.substring(0,2),16);
    if(fullAddr === '0000:0000:0000:0000:0000:0000:0000:0001') return 'Loopback (::1)';
    if(fullAddr === '0000:0000:0000:0000:0000:0000:0000:0000') return 'Unspecified (::)';
    if(first16.toLowerCase().startsWith('fe8') || first16.toLowerCase().startsWith('fe9') ||
       first16.toLowerCase().startsWith('fea') || first16.toLowerCase().startsWith('feb')) return 'Link-Local';
    if(first16.toLowerCase().startsWith('ff')) return 'Multicast';
    if(firstByte >= 0xfc && firstByte <= 0xfd) return 'Unique Local Address (ULA)';
    if(first16.toLowerCase().startsWith('2') || first16.toLowerCase().startsWith('3')) return 'Global Unicast';
    return 'Other / Reserved';
  }

  return {
    isValidIPv4, ipToLong, longToIp, isValidCIDR, cidrToMask, cidrToMaskLong,
    maskToCIDR, isValidSubnetMask, wildcardFromCIDR, wildcardFromMask,
    ipToBinary, getIPClass, defaultClassMask, isPrivateIP, isLoopback,
    isLinkLocal, isMulticast, isReserved, calcNetwork, calcSubnets, calcVLSM,
    calcIPRange, sameNetwork, decToBin, binToDec, decToHex, hexToDec,
    isValidBinary, isValidHex, isValidIPv6, expandIPv6, compressIPv6, ipv6AddressType
  };
})();
