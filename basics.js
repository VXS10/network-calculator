/* =====================================================================
   basics.js — Networking Basics content (EN / AR)
   ===================================================================== */
'use strict';

var BASICS = [
  {
    id: 'ip-address',
    icon: '🏷️',
    title: { en: 'IP Address', ar: 'عنوان IP' },
    def: {
      en: 'A logical address that uniquely identifies a device on a network so traffic can be routed to it.',
      ar: 'عنوان منطقي يُعرّف الجهاز بشكل فريد داخل الشبكة حتى يمكن توجيه البيانات إليه.'
    },
    explain: {
      en: 'Every device that speaks IP needs an address. The address has a network part (which network the device belongs to) and a host part (which device inside that network). The subnet mask decides where the split happens. Addresses can be assigned manually (static) or automatically by DHCP.',
      ar: 'كل جهاز يستخدم بروتوكول IP يحتاج إلى عنوان. يتكوّن العنوان من جزء للشبكة (أي شبكة ينتمي إليها الجهاز) وجزء للمضيف (أي جهاز داخل تلك الشبكة)، ويحدد قناع الشبكة مكان الفصل بينهما. يمكن إسناد العنوان يدويًا (ثابت) أو تلقائيًا عبر DHCP.'
    },
    example: {
      en: '192.168.1.10/24 → network part 192.168.1.0, host part .10',
      ar: '192.168.1.10/24 ← جزء الشبكة 192.168.1.0، وجزء المضيف ‎.10'
    },
    terms: {
      en: ['Host', 'Network ID', 'Static IP', 'Dynamic IP', 'Octet'],
      ar: ['المضيف Host', 'معرّف الشبكة', 'عنوان ثابت', 'عنوان ديناميكي', 'الخانة Octet']
    }
  },
  {
    id: 'ipv4',
    icon: '4️⃣',
    title: { en: 'IPv4', ar: 'IPv4' },
    def: {
      en: 'A 32-bit address written as four decimal octets separated by dots, giving about 4.3 billion addresses.',
      ar: 'عنوان بطول 32 بت يُكتب على شكل أربع خانات عشرية مفصولة بنقاط، ويوفّر نحو 4.3 مليار عنوان.'
    },
    explain: {
      en: 'Each octet holds a value from 0 to 255 (8 bits). IPv4 was historically split into classes A–E, but modern networks use CIDR instead. Because the address space is small, private addressing plus NAT is used almost everywhere.',
      ar: 'كل خانة تحمل قيمة من 0 إلى 255 (8 بت). كان IPv4 يُقسَّم تاريخيًا إلى فئات من A إلى E، لكن الشبكات الحديثة تعتمد على CIDR بدلًا من ذلك. ولأن مساحة العناوين محدودة، تُستخدم العناوين الخاصة مع NAT في معظم الشبكات.'
    },
    example: {
      en: '10.0.0.5 → binary 00001010.00000000.00000000.00000101',
      ar: '10.0.0.5 ← بالنظام الثنائي 00001010.00000000.00000000.00000101'
    },
    terms: {
      en: ['32-bit', 'Octet', 'Dotted decimal', 'Address exhaustion'],
      ar: ['32 بت', 'الخانة', 'الترميز العشري المنقّط', 'نفاد العناوين']
    }
  },
  {
    id: 'ipv6',
    icon: '6️⃣',
    title: { en: 'IPv6', ar: 'IPv6' },
    def: {
      en: 'A 128-bit address written as eight groups of four hexadecimal digits, designed to replace IPv4.',
      ar: 'عنوان بطول 128 بت يُكتب على شكل ثماني مجموعات من أربعة أرقام ست عشرية، صُمّم ليحل محل IPv4.'
    },
    explain: {
      en: 'IPv6 removes the need for NAT by providing an enormous address space. Leading zeros in a group can be dropped and one run of all-zero groups can be replaced by "::" (only once per address). A /64 prefix is the normal size for a LAN segment.',
      ar: 'يلغي IPv6 الحاجة إلى NAT بفضل مساحة العناوين الهائلة. يمكن حذف الأصفار البادئة في كل مجموعة، كما يمكن استبدال سلسلة واحدة من المجموعات الصفرية بـ «::» مرة واحدة فقط في العنوان. والبادئة /64 هي الحجم المعتاد لمقطع شبكة محلية.'
    },
    example: {
      en: '2001:0db8:0000:0000:0000:0000:0000:0001 → 2001:db8::1',
      ar: '2001:0db8:0000:0000:0000:0000:0000:0001 ← 2001:db8::1'
    },
    terms: {
      en: ['Global Unicast', 'Link-local (fe80::/10)', 'Unique Local (fc00::/7)', 'Interface ID', 'SLAAC'],
      ar: ['Global Unicast', 'محلي الارتباط ‎fe80::/10', 'محلي فريد ‎fc00::/7', 'معرّف الواجهة', 'SLAAC']
    }
  },
  {
    id: 'subnet-mask',
    icon: '🎭',
    title: { en: 'Subnet Mask', ar: 'قناع الشبكة Subnet Mask' },
    def: {
      en: 'A 32-bit value whose leading ones mark the network bits and whose trailing zeros mark the host bits.',
      ar: 'قيمة بطول 32 بت تمثّل الواحدات المتتالية فيها بتات الشبكة، بينما تمثّل الأصفار المتبقية بتات المضيف.'
    },
    explain: {
      en: 'A device ANDs its own address with the mask to learn its network address, then compares that with the destination network to decide whether to deliver locally or send the packet to the default gateway. The ones in a valid mask must be contiguous.',
      ar: 'يقوم الجهاز بعملية AND بين عنوانه والقناع ليعرف عنوان شبكته، ثم يقارنه بشبكة الوجهة ليقرر ما إذا كان التسليم محليًا أم يجب إرسال الحزمة إلى البوابة الافتراضية. ويجب أن تكون الواحدات في القناع الصحيح متتالية دون فواصل.'
    },
    example: {
      en: '255.255.255.0 = /24 = 11111111.11111111.11111111.00000000',
      ar: '255.255.255.0 = ‎/24 = 11111111.11111111.11111111.00000000'
    },
    terms: {
      en: ['Network bits', 'Host bits', 'Bitwise AND', 'Wildcard mask'],
      ar: ['بتات الشبكة', 'بتات المضيف', 'عملية AND', 'قناع Wildcard']
    }
  },
  {
    id: 'cidr',
    icon: '📐',
    title: { en: 'CIDR', ar: 'CIDR' },
    def: {
      en: 'Classless Inter-Domain Routing: writing a prefix length after the address (/24) instead of relying on address classes.',
      ar: 'التوجيه غير المصنّف بين النطاقات: كتابة طول البادئة بعد العنوان (‎/24) بدلًا من الاعتماد على فئات العناوين.'
    },
    explain: {
      en: 'The number after the slash is how many bits belong to the network. Larger prefix = smaller network. CIDR also allows route summarisation, where many small networks are advertised as one larger block.',
      ar: 'الرقم بعد الشرطة المائلة يمثّل عدد البتات المخصصة للشبكة، وكلما زاد الرقم صغرت الشبكة. كما يتيح CIDR تجميع المسارات بحيث يُعلن عن عدة شبكات صغيرة ككتلة واحدة أكبر.'
    },
    example: {
      en: '192.168.1.0/24 → 256 addresses, 254 usable hosts',
      ar: '192.168.1.0/24 ← 256 عنوانًا، منها 254 صالحة للأجهزة'
    },
    terms: {
      en: ['Prefix length', 'Supernetting', 'Summarisation', 'Classless'],
      ar: ['طول البادئة', 'التجميع Supernetting', 'تلخيص المسارات', 'غير مصنّف']
    }
  },
  {
    id: 'subnetting',
    icon: '✂️',
    title: { en: 'Subnetting', ar: 'التقسيم الفرعي Subnetting' },
    def: {
      en: 'Dividing one network block into several smaller networks by borrowing bits from the host part.',
      ar: 'تقسيم كتلة شبكة واحدة إلى عدة شبكات أصغر عن طريق استعارة بتات من جزء المضيف.'
    },
    explain: {
      en: 'Borrowing n bits creates 2ⁿ subnets, and each subnet keeps 2^(32−prefix) − 2 usable hosts. Subnetting limits broadcast domains, improves security separation, and keeps address waste under control.',
      ar: 'استعارة n بت تنتج 2ⁿ شبكة فرعية، ويبقى في كل شبكة 2^(32−البادئة) − 2 عنوانًا صالحًا للأجهزة. ويحدّ التقسيم من نطاقات البث، ويحسّن الفصل الأمني، ويقلّل هدر العناوين.'
    },
    example: {
      en: '192.168.1.0/24 split into /26 → 4 subnets of 62 hosts each',
      ar: 'تقسيم 192.168.1.0/24 إلى ‎/26 ← أربع شبكات، كل منها 62 مضيفًا'
    },
    terms: {
      en: ['Borrowed bits', 'Broadcast domain', 'Block size', 'FLSM'],
      ar: ['البتات المستعارة', 'نطاق البث', 'حجم الكتلة', 'FLSM']
    }
  },
  {
    id: 'vlsm',
    icon: '🧩',
    title: { en: 'VLSM', ar: 'VLSM' },
    def: {
      en: 'Variable Length Subnet Masking: giving each subnet only the size it actually needs.',
      ar: 'أقنعة الشبكات المتغيرة الطول: منح كل شبكة فرعية الحجم الذي تحتاجه فعليًا فقط.'
    },
    explain: {
      en: 'Sort the requirements from largest to smallest, allocate each one the smallest block that fits, and start the next block right after the previous one ends. This prevents overlap and keeps the leftover space contiguous for future growth.',
      ar: 'رتّب المتطلبات من الأكبر إلى الأصغر، وخصّص لكل متطلب أصغر كتلة تكفيه، ثم ابدأ الكتلة التالية مباشرة بعد نهاية السابقة. هذا يمنع التداخل ويُبقي المساحة المتبقية متصلة للتوسع المستقبلي.'
    },
    example: {
      en: '192.168.1.0/24 → 100 hosts /25, 50 hosts /26, 25 hosts /27, 2 hosts /30',
      ar: '192.168.1.0/24 ← 100 مضيف ‎/25، و50 مضيف ‎/26، و25 مضيف ‎/27، ووصلة نقطية ‎/30'
    },
    terms: {
      en: ['Largest first', 'Alignment', 'Overlap', 'Point-to-point /30'],
      ar: ['الأكبر أولًا', 'المحاذاة', 'التداخل', 'وصلة ‎/30']
    }
  },
  {
    id: 'default-gateway',
    icon: '🚪',
    title: { en: 'Default Gateway', ar: 'البوابة الافتراضية' },
    def: {
      en: 'The router address a host sends packets to when the destination is outside its own subnet.',
      ar: 'عنوان الموجّه الذي يرسل إليه الجهاز الحزم عندما تكون الوجهة خارج شبكته الفرعية.'
    },
    explain: {
      en: 'The gateway must be an address inside the same subnet as the host. Without a correct gateway a device can still reach local neighbours but has no path to the internet or to other internal networks.',
      ar: 'يجب أن يكون عنوان البوابة ضمن الشبكة الفرعية نفسها للجهاز. وبدون بوابة صحيحة يظل الجهاز قادرًا على الوصول إلى الأجهزة المحلية فقط دون أي منفذ إلى الإنترنت أو الشبكات الداخلية الأخرى.'
    },
    example: {
      en: 'Host 192.168.1.10/24 → gateway 192.168.1.1',
      ar: 'جهاز 192.168.1.10/24 ← البوابة 192.168.1.1'
    },
    terms: {
      en: ['Router', 'Default route 0.0.0.0/0', 'Next hop'],
      ar: ['الموجّه', 'المسار الافتراضي ‎0.0.0.0/0', 'القفزة التالية']
    }
  },
  {
    id: 'dns',
    icon: '🌐',
    title: { en: 'DNS', ar: 'DNS' },
    def: {
      en: 'The Domain Name System translates human-readable names into IP addresses.',
      ar: 'نظام أسماء النطاقات يترجم الأسماء المفهومة للبشر إلى عناوين IP.'
    },
    explain: {
      en: 'A resolver queries root, TLD, and authoritative servers until it gets an answer, then caches it for the record TTL. DNS mostly uses UDP port 53, falling back to TCP for large responses and zone transfers.',
      ar: 'يستعلم المحلِّل من الخوادم الجذرية ثم خوادم النطاق الأعلى ثم الخوادم المخوّلة حتى يحصل على الإجابة، ثم يخزنها مؤقتًا طوال مدة TTL. ويستخدم DNS غالبًا المنفذ 53 عبر UDP، وينتقل إلى TCP للردود الكبيرة ونقل المناطق.'
    },
    example: {
      en: 'example.com → A record 93.184.216.34',
      ar: 'example.com ← سجل A بقيمة 93.184.216.34'
    },
    terms: {
      en: ['Resolver', 'A / AAAA record', 'CNAME', 'TTL', 'Port 53'],
      ar: ['المحلِّل Resolver', 'سجل A / AAAA', 'CNAME', 'TTL', 'المنفذ 53']
    }
  },
  {
    id: 'dhcp',
    icon: '📦',
    title: { en: 'DHCP', ar: 'DHCP' },
    def: {
      en: 'A protocol that automatically hands out IP addresses and network settings to clients.',
      ar: 'بروتوكول يوزّع عناوين IP وإعدادات الشبكة على الأجهزة تلقائيًا.'
    },
    explain: {
      en: 'The client and server exchange four messages — Discover, Offer, Request, Acknowledge (DORA). The lease includes the address, mask, gateway, DNS servers and a lease time, after which the client renews.',
      ar: 'يتبادل العميل والخادم أربع رسائل: Discover ثم Offer ثم Request ثم Acknowledge (DORA). ويشمل عقد الإيجار العنوان والقناع والبوابة وخوادم DNS ومدة الإيجار التي يجدّدها العميل بعد انتهائها.'
    },
    example: {
      en: 'Pool 192.168.1.100–192.168.1.200, gateway 192.168.1.1, lease 24h',
      ar: 'نطاق التوزيع 192.168.1.100–192.168.1.200، البوابة 192.168.1.1، مدة الإيجار 24 ساعة'
    },
    terms: {
      en: ['DORA', 'Lease', 'Scope / Pool', 'Reservation', 'Ports 67/68'],
      ar: ['DORA', 'عقد الإيجار', 'نطاق التوزيع', 'الحجز Reservation', 'المنفذان 67/68']
    }
  },
  {
    id: 'nat',
    icon: '🔁',
    title: { en: 'NAT', ar: 'NAT' },
    def: {
      en: 'Network Address Translation rewrites addresses so many private hosts can share one public IP.',
      ar: 'ترجمة عناوين الشبكة تعيد كتابة العناوين ليتمكن عدد كبير من الأجهزة الخاصة من مشاركة عنوان عام واحد.'
    },
    explain: {
      en: 'The router keeps a translation table mapping inside address and port to outside address and port (PAT / overload). Inbound connections need explicit port forwarding because the table has no entry for them.',
      ar: 'يحتفظ الموجّه بجدول ترجمة يربط العنوان والمنفذ الداخليين بالعنوان والمنفذ الخارجيين (PAT / Overload). أما الاتصالات الواردة فتحتاج إلى إعادة توجيه منافذ صريحة لعدم وجود مدخل لها في الجدول.'
    },
    example: {
      en: '192.168.1.10:5001 → 203.0.113.7:41230',
      ar: '192.168.1.10:5001 ← 203.0.113.7:41230'
    },
    terms: {
      en: ['PAT / Overload', 'Static NAT', 'Port forwarding', 'Inside / outside'],
      ar: ['PAT / Overload', 'NAT ثابت', 'إعادة توجيه المنافذ', 'الداخلي/الخارجي']
    }
  },
  {
    id: 'mac-address',
    icon: '🔗',
    title: { en: 'MAC Address', ar: 'عنوان MAC' },
    def: {
      en: 'A 48-bit hardware address burned into a network interface and used inside the local segment.',
      ar: 'عنوان مادي بطول 48 بت مخزّن في بطاقة الشبكة ويُستخدم داخل المقطع المحلي.'
    },
    explain: {
      en: 'Switches forward frames using MAC addresses, while routers use IP addresses. ARP is what maps an IP address to the MAC address of the device that owns it on the same subnet. The first three bytes identify the manufacturer (OUI).',
      ar: 'تعتمد المبدّلات على عناوين MAC في تمرير الإطارات، بينما تعتمد الموجّهات على عناوين IP. ويقوم بروتوكول ARP بربط عنوان IP بعنوان MAC للجهاز المالك له داخل الشبكة الفرعية نفسها. وتُعرّف البايتات الثلاثة الأولى الشركة المصنّعة (OUI).'
    },
    example: {
      en: '00:1A:2B:3C:4D:5E — OUI 00:1A:2B',
      ar: '00:1A:2B:3C:4D:5E — المعرّف OUI هو 00:1A:2B'
    },
    terms: {
      en: ['OUI', 'ARP', 'Layer 2', 'Unicast / Broadcast frame'],
      ar: ['OUI', 'ARP', 'الطبقة الثانية', 'إطار أحادي/بثّي']
    }
  },
  {
    id: 'tcp-udp',
    icon: '🚚',
    title: { en: 'TCP / UDP', ar: 'TCP / UDP' },
    def: {
      en: 'The two main transport protocols: TCP is connection-oriented and reliable, UDP is connectionless and fast.',
      ar: 'بروتوكولا النقل الرئيسيان: TCP موجّه للاتصال وموثوق، وUDP بلا اتصال وسريع.'
    },
    explain: {
      en: 'TCP opens a session with a three-way handshake, numbers every byte, retransmits what is lost and controls congestion — good for web, mail and file transfer. UDP just sends datagrams with no guarantee, which suits DNS, VoIP, gaming and streaming where late data is useless.',
      ar: 'يفتح TCP الجلسة بمصافحة ثلاثية، ويرقّم كل بايت، ويعيد إرسال المفقود، ويتحكم في الازدحام؛ ولذلك يناسب الويب والبريد ونقل الملفات. أما UDP فيرسل الرزم دون ضمانات، وهو ما يناسب DNS والاتصال الصوتي والألعاب والبث حيث تكون البيانات المتأخرة عديمة الفائدة.'
    },
    example: {
      en: 'HTTPS uses TCP 443 · DNS query uses UDP 53',
      ar: 'HTTPS يستخدم TCP على المنفذ 443 · واستعلام DNS يستخدم UDP على المنفذ 53'
    },
    terms: {
      en: ['Three-way handshake', 'Sequence number', 'Datagram', 'Retransmission'],
      ar: ['المصافحة الثلاثية', 'رقم التسلسل', 'الرزمة Datagram', 'إعادة الإرسال']
    }
  },
  {
    id: 'ports',
    icon: '🔢',
    title: { en: 'Ports', ar: 'المنافذ Ports' },
    def: {
      en: 'A 16-bit number that identifies which application or service a segment belongs to.',
      ar: 'رقم بطول 16 بت يحدد التطبيق أو الخدمة التي تنتمي إليها البيانات.'
    },
    explain: {
      en: 'Ports 0–1023 are well-known, 1024–49151 are registered, and 49152–65535 are dynamic ports used as the client source port. An IP address plus a port forms a socket, which is what identifies one end of a connection.',
      ar: 'المنافذ من 0 إلى 1023 معروفة، ومن 1024 إلى 49151 مسجّلة، ومن 49152 إلى 65535 ديناميكية تُستخدم كمنفذ مصدر للعميل. ويشكّل عنوان IP مع المنفذ مقبسًا Socket يمثّل أحد طرفَي الاتصال.'
    },
    example: {
      en: '22 SSH · 53 DNS · 80 HTTP · 443 HTTPS · 3389 RDP',
      ar: '22 لـ SSH · 53 لـ DNS · 80 لـ HTTP · 443 لـ HTTPS · 3389 لـ RDP'
    },
    terms: {
      en: ['Socket', 'Well-known ports', 'Ephemeral port', 'Listening'],
      ar: ['المقبس Socket', 'المنافذ المعروفة', 'المنفذ المؤقت', 'الاستماع Listening']
    }
  },
  {
    id: 'public-private',
    icon: '🔒',
    title: { en: 'Public / Private IP', ar: 'العناوين العامة والخاصة' },
    def: {
      en: 'Private ranges are reusable inside any organisation; public addresses are globally unique and routable on the internet.',
      ar: 'النطاقات الخاصة قابلة لإعادة الاستخدام داخل أي مؤسسة، أما العناوين العامة فهي فريدة عالميًا وقابلة للتوجيه عبر الإنترنت.'
    },
    explain: {
      en: 'RFC 1918 reserves 10.0.0.0/8, 172.16.0.0/12 and 192.168.0.0/16 for private use. Routers on the internet drop these, so a NAT device translates them to a public address on the way out.',
      ar: 'تحجز RFC 1918 النطاقات 10.0.0.0/8 و172.16.0.0/12 و192.168.0.0/16 للاستخدام الخاص. وتُسقِط موجّهات الإنترنت هذه العناوين، لذا يترجمها جهاز NAT إلى عنوان عام عند الخروج.'
    },
    example: {
      en: '192.168.0.15 private · 8.8.8.8 public · 169.254.x.x link-local (no DHCP)',
      ar: '192.168.0.15 خاص · 8.8.8.8 عام · 169.254.x.x محلي الارتباط (فشل DHCP)'
    },
    terms: {
      en: ['RFC 1918', 'APIPA', 'CGNAT 100.64.0.0/10', 'Loopback 127.0.0.1'],
      ar: ['RFC 1918', 'APIPA', 'CGNAT ‎100.64.0.0/10', 'الاسترجاع 127.0.0.1']
    }
  },
  {
    id: 'osi-model',
    icon: '🗂️',
    title: { en: 'OSI Model', ar: 'نموذج OSI' },
    def: {
      en: 'A seven-layer reference model that describes how data moves from an application down to the physical medium.',
      ar: 'نموذج مرجعي من سبع طبقات يصف كيفية انتقال البيانات من التطبيق حتى الوسط المادي.'
    },
    explain: {
      en: 'Layers: 1 Physical, 2 Data Link, 3 Network, 4 Transport, 5 Session, 6 Presentation, 7 Application. Each layer adds its own header on the way down (encapsulation) and removes it on the way up. The model is mostly used as a troubleshooting map.',
      ar: 'الطبقات: 1 المادية، 2 ربط البيانات، 3 الشبكة، 4 النقل، 5 الجلسة، 6 العرض، 7 التطبيق. تضيف كل طبقة ترويستها أثناء النزول (التغليف) وتزيلها أثناء الصعود. ويُستخدم النموذج غالبًا كخريطة لتشخيص الأعطال.'
    },
    example: {
      en: 'Cable = L1 · Switch = L2 · Router = L3 · TCP = L4 · HTTP = L7',
      ar: 'الكابل = الطبقة 1 · المبدّل = 2 · الموجّه = 3 · TCP = 4 · HTTP = 7'
    },
    terms: {
      en: ['Encapsulation', 'PDU', 'Frame / Packet / Segment', 'Layer 3 device'],
      ar: ['التغليف', 'وحدة البيانات PDU', 'إطار/حزمة/مقطع', 'جهاز الطبقة الثالثة']
    }
  },
  {
    id: 'tcpip-model',
    icon: '🧱',
    title: { en: 'TCP/IP Model', ar: 'نموذج TCP/IP' },
    def: {
      en: 'The practical four-layer model the internet actually runs on: Link, Internet, Transport, Application.',
      ar: 'النموذج العملي المكوّن من أربع طبقات الذي يعمل به الإنترنت فعليًا: الارتباط، الإنترنت، النقل، التطبيق.'
    },
    explain: {
      en: 'It maps onto OSI: Link covers OSI layers 1–2, Internet matches layer 3 (IP, ICMP, ARP), Transport matches layer 4 (TCP, UDP), and Application absorbs OSI layers 5–7 (HTTP, DNS, SMTP).',
      ar: 'يقابل نموذج OSI كالتالي: طبقة الارتباط تغطي الطبقتين 1 و2، وطبقة الإنترنت تقابل الطبقة 3 (IP وICMP وARP)، وطبقة النقل تقابل الطبقة 4 (TCP وUDP)، وطبقة التطبيق تجمع الطبقات 5 إلى 7 (HTTP وDNS وSMTP).'
    },
    example: {
      en: 'Browsing a site: HTTP → TCP → IP → Ethernet',
      ar: 'تصفّح موقع: HTTP ← TCP ← IP ← إيثرنت'
    },
    terms: {
      en: ['Protocol stack', 'IP header', 'ICMP', 'ARP'],
      ar: ['حزمة البروتوكولات', 'ترويسة IP', 'ICMP', 'ARP']
    }
  }
];

if (typeof module !== 'undefined' && module.exports) { module.exports = BASICS; }
