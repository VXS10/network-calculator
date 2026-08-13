/* =====================================================================
   app.js — UI shell, router, forms, results, history, export, search
   ===================================================================== */
'use strict';

(function () {

  var LS_SETTINGS = 'nc_settings';
  var LS_HISTORY = 'nc_history';
  var HISTORY_LIMIT = 100;

  var state = {
    lang: 'ar',
    theme: 'dark',
    route: 'home',
    params: {},
    lastRun: null      /* { toolId, inputs, result } */
  };

  /* ------------------------------------------------------------------
     Helpers
     ------------------------------------------------------------------ */
  function $(sel, root) { return (root || document).querySelector(sel); }

  function h(tag, props, children) {
    var e = document.createElement(tag);
    if (props) {
      Object.keys(props).forEach(function (k) {
        var val = props[k];
        if (val === null || val === undefined) return;
        if (k === 'class') e.className = val;
        else if (k === 'text') e.textContent = val;
        else if (k === 'html') e.innerHTML = val;
        else if (k.indexOf('on') === 0) e.addEventListener(k.slice(2).toLowerCase(), val);
        else e.setAttribute(k, val);
      });
    }
    (children || []).forEach(function (c) {
      if (c === null || c === undefined || c === false) return;
      e.appendChild(typeof c === 'string' || typeof c === 'number'
        ? document.createTextNode(String(c)) : c);
    });
    return e;
  }

  function t(key, params) {
    var dict = I18N[state.lang] || I18N.en;
    var s = (dict[key] !== undefined) ? dict[key]
      : (I18N.en[key] !== undefined ? I18N.en[key] : key);
    if (params) {
      Object.keys(params).forEach(function (k) {
        s = s.split('{' + k + '}').join(params[k]);
      });
    }
    return s;
  }

  /* Normalize Arabic/Persian digits and numeric grouping before calculations. */
  function normalizeDigits(value) {
    return String(value == null ? '' : value)
      .replace(/[٠-٩]/g, function (d) { return String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)); })
      .replace(/[۰-۹]/g, function (d) { return String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)); });
  }

  function normalizeNumericValue(value) {
    return normalizeDigits(value).replace(/[,_٬،\s]/g, '');
  }

  function formatGroupedInteger(value) {
    var v = normalizeNumericValue(value);
    if (!/^\d+$/.test(v)) return String(value == null ? '' : value);
    return Number(v).toLocaleString('en-US');
  }

  function formatNumericInput(input) {
    if (!input) return;
    var raw = normalizeDigits(input.value);
    if (/^\d+$/.test(raw)) input.value = formatGroupedInteger(raw);
  }

  /* Translate value tokens (v_yes, t_globalunicast …) and format numbers. */
  function formatResultNumber(value) {
    var n = Number(value);
    if (!Number.isFinite(n)) return String(value);
    // Results are intentionally shown without thousands separators and with
    // eight decimal places, e.g. 11110000 -> 11110000.00000000.
    return n.toFixed(8);
  }

  /* Translate value tokens and format numeric result values consistently. */
  function dv(value) {
    if (typeof value === 'number') return formatResultNumber(value);
    if (typeof value === 'string' && /^(v_|t_|r_)/.test(value) && I18N.en[value] !== undefined) return t(value);
    if (typeof value === 'string' && /^-?\d+(?:\.\d+)?$/.test(value)) {
      return formatResultNumber(value);
    }
    return String(value);
  }

  function toast(msg) {
    var box = $('#toast');
    box.textContent = msg;
    box.hidden = false;
    box.classList.add('show');
    clearTimeout(box._tm);
    box._tm = setTimeout(function () {
      box.classList.remove('show');
      setTimeout(function () { box.hidden = true; }, 250);
    }, 2200);
  }

  function copyText(text, msgKey) {
    var done = function () { toast(t(msgKey || 'n_copied')); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text, done); });
    } else { fallbackCopy(text, done); }
  }

  function fallbackCopy(text, done) {
    var ta = h('textarea', { class: 'sr-only' });
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); done(); } catch (e) { /* ignore */ }
    document.body.removeChild(ta);
  }

  function download(filename, mime, content) {
    var blob = new Blob([content], { type: mime + ';charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = h('a', { href: url, download: filename });
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  /* ------------------------------------------------------------------
     Settings + history storage
     ------------------------------------------------------------------ */
  function loadSettings() {
    try {
      var s = JSON.parse(localStorage.getItem(LS_SETTINGS) || '{}');
      if (s.lang === 'ar' || s.lang === 'en') state.lang = s.lang;
      if (s.theme === 'dark' || s.theme === 'light') state.theme = s.theme;
    } catch (e) { /* ignore */ }
  }

  function saveSettings() {
    try {
      localStorage.setItem(LS_SETTINGS, JSON.stringify({ lang: state.lang, theme: state.theme }));
    } catch (e) { /* ignore */ }
  }

  function getHistory() {
    try { return JSON.parse(localStorage.getItem(LS_HISTORY) || '[]'); }
    catch (e) { return []; }
  }

  function setHistory(list) {
    try { localStorage.setItem(LS_HISTORY, JSON.stringify(list.slice(0, HISTORY_LIMIT))); }
    catch (e) { /* quota */ }
  }

  function pushHistory(entry) {
    var list = getHistory();
    list.unshift(entry);
    setHistory(list);
  }

  /* ------------------------------------------------------------------
     Theme & language
     ------------------------------------------------------------------ */
  function applyChrome() {
    var html = document.documentElement;
    html.setAttribute('data-theme', state.theme);
    html.setAttribute('lang', state.lang);
    html.setAttribute('dir', t('dir'));
    document.title = t('app_name') + ' — ' + t('app_tagline');
    $('#langToggle').textContent = t('toggle_lang');
    $('#langToggle').setAttribute('aria-label', t('toggle_lang'));
    $('#themeToggle').textContent = state.theme === 'dark' ? '☀️' : '🌙';
    $('#themeToggle').setAttribute('aria-label', t('toggle_theme'));
    $('#navToggle').setAttribute('aria-label', t('menu'));
    $('#globalSearch').setAttribute('placeholder', t('search_ph'));
    $('#globalSearch').setAttribute('aria-label', t('search_ph'));
    $('#brandName').textContent = t('app_name');
    $('#skipLink').textContent = t('skip');

    /* Keep every navigation layer synchronized with the selected language. */
    var nav = $('#navList');
    if (nav) {
      nav.setAttribute('lang', state.lang);
      nav.setAttribute('dir', state.lang === 'ar' ? 'rtl' : 'ltr');
    }
    var sidebar = $('#sidebar');
    if (sidebar) {
      sidebar.setAttribute('lang', state.lang);
      sidebar.setAttribute('dir', state.lang === 'ar' ? 'rtl' : 'ltr');
    }
  }

  /* ------------------------------------------------------------------
     Navigation
     ------------------------------------------------------------------ */
  var NAV_GROUPS = [
    { titleKey: 'sec_tools', items: ['home'].concat(TOOLS.map(function (x) { return x.id; })) },
    { titleKey: 'sec_learn', items: ['visualization', 'history', 'basics', 'settings'] }
  ];

  var PAGE_ICONS = {
    home: '🏠', visualization: '🗺️', history: '🕘', basics: '📚', settings: '⚙️'
  };
  TOOLS.forEach(function (x) { PAGE_ICONS[x.id] = x.icon; });

  function renderNav() {
    var nav = $('#navList');
    if (!nav) return;
    nav.innerHTML = '';
    nav.setAttribute('lang', state.lang);
    nav.setAttribute('dir', state.lang === 'ar' ? 'rtl' : 'ltr');

    var dict = I18N[state.lang] || I18N.en;
    function navText(key) {
      return dict[key] !== undefined ? dict[key] : (I18N.en[key] !== undefined ? I18N.en[key] : key);
    }

    NAV_GROUPS.forEach(function (g) {
      nav.appendChild(h('li', { class: 'nav-group' }, [
        h('span', { text: navText(g.titleKey) })
      ]));
      g.items.forEach(function (id) {
        var key = 'tool_' + id;
        var link = h('a', {
          class: 'nav-link' + (state.route === id ? ' active' : ''),
          href: '#/' + id,
          'aria-current': state.route === id ? 'page' : null,
          lang: state.lang,
          dir: state.lang === 'ar' ? 'rtl' : 'ltr'
        }, [
          h('span', { class: 'nav-icon', 'aria-hidden': 'true', text: PAGE_ICONS[id] || '•' }),
          h('span', { class: 'nav-label', text: navText(key) })
        ]);
        nav.appendChild(h('li', null, [link]));
      });
    });
  }

  function setSidebarOpen(open) {
    open = !!open;
    document.body.classList.toggle('nav-open', open);
    var toggle = $('#navToggle');
    var overlay = $('#overlay');
    if (toggle) {
      toggle.setAttribute('aria-expanded', String(open));
      toggle.classList.toggle('is-open', open);
    }
    if (overlay) overlay.hidden = !open;
  }

  function closeSidebar() {
    setSidebarOpen(false);
  }

  function toggleSidebar() {
    setSidebarOpen(!document.body.classList.contains('nav-open'));
  }

  /* ------------------------------------------------------------------
     Router
     ------------------------------------------------------------------ */
  function parseHash() {
    var raw = location.hash.replace(/^#\/?/, '');
    var qIndex = raw.indexOf('?');
    var route = (qIndex > -1 ? raw.slice(0, qIndex) : raw) || 'home';
    var params = {};
    if (qIndex > -1) {
      raw.slice(qIndex + 1).split('&').forEach(function (pair) {
        if (!pair) return;
        var kv = pair.split('=');
        params[decodeURIComponent(kv[0])] = decodeURIComponent((kv[1] || '').replace(/\+/g, ' '));
      });
    }
    return { route: route, params: params };
  }

  function navigate(route, params) {
    var qs = '';
    if (params && Object.keys(params).length) {
      qs = '?' + Object.keys(params).map(function (k) {
        return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
      }).join('&');
    }
    location.hash = '#/' + route + qs;
  }

  function onRoute() {
    var p = parseHash();
    var known = ['home', 'visualization', 'history', 'basics', 'settings']
      .concat(TOOLS.map(function (x) { return x.id; }));
    state.route = known.indexOf(p.route) > -1 ? p.route : 'home';
    state.params = p.params;
    renderNav();
    render();
    /* Keep the sidebar open on desktop, but close it after navigation on small screens. */
    if (window.matchMedia && window.matchMedia('(min-width: 1024px)').matches) {
      setSidebarOpen(true);
    } else {
      closeSidebar();
    }
    window.scrollTo(0, 0);
    $('#main').focus();
  }

  /* ------------------------------------------------------------------
     Page rendering
     ------------------------------------------------------------------ */
  function pageHeader(id) {
    var back = id !== 'home' ? h('button', {
      type: 'button',
      class: 'back-btn',
      'aria-label': t('nav_back'),
      title: t('nav_back'),
      onclick: function () {
        if (location.hash && location.hash !== '#/home') location.hash = '#/home';
      }
    }, [h('span', { 'aria-hidden': 'true', text: '←' }), h('span', { text: t('nav_back') })]) : null;

    return h('header', { class: 'page-head' }, [
      back,
      h('div', { class: 'page-icon', 'aria-hidden': 'true', text: PAGE_ICONS[id] || '•' }),
      h('div', null, [
        h('h1', { class: 'page-title', text: t('tool_' + id) }),
        h('p', { class: 'page-desc', text: t('tool_' + id + '_desc') })
      ])
    ]);
  }

  function render() {
    var main = $('#main');
    main.innerHTML = '';
    var id = state.route;
    if (id === 'home') main.appendChild(renderHome());
    else if (id === 'history') main.appendChild(renderHistory());
    else if (id === 'basics') main.appendChild(renderBasics());
    else if (id === 'settings') main.appendChild(renderSettings());
    else if (id === 'visualization') main.appendChild(renderVisualization());
    else main.appendChild(renderTool(TOOL_MAP[id]));
  }

  /* ---------------------- Home ---------------------- */
  function renderHome() {
    var wrap = h('div', { class: 'page' }, [pageHeader('home')]);
    wrap.appendChild(h('p', { class: 'lead', text: t('home_intro') }));
    var grid = h('div', { class: 'card-grid' });
    TOOLS.concat([
      { id: 'visualization', icon: '🗺️' },
      { id: 'basics', icon: '📚' },
      { id: 'history', icon: '🕘' },
      { id: 'settings', icon: '⚙️' }
    ]).forEach(function (tool) {
      grid.appendChild(h('a', { class: 'card tool-card', href: '#/' + tool.id }, [
        h('div', { class: 'card-icon', 'aria-hidden': 'true', text: tool.icon }),
        h('h2', { class: 'card-title', text: t('tool_' + tool.id) }),
        h('p', { class: 'card-desc', text: t('tool_' + tool.id + '_desc') })
      ]));
    });
    wrap.appendChild(grid);
    return wrap;
  }

  /* ---------------------- Tool page ---------------------- */
  function renderTool(tool) {
    var wrap = h('div', { class: 'page' }, [pageHeader(tool.id)]);
    var form = h('form', { class: 'card form-card', novalidate: 'novalidate', id: 'toolForm' });
    var grid = h('div', { class: 'form-grid' });

    tool.fields.forEach(function (f) {
      grid.appendChild(buildField(tool, f));
    });
    form.appendChild(grid);

    form.appendChild(h('div', { class: 'form-actions' }, [
      h('button', { class: 'btn btn-primary', type: 'submit', text: t('btn_calculate') }),
      h('button', {
        class: 'btn btn-ghost', type: 'button', text: t('btn_reset'),
        onclick: function () { navigate(tool.id, {}); }
      })
    ]));

    var resultBox = h('section', { class: 'result-area', id: 'resultArea', 'aria-live': 'polite' });
    resultBox.appendChild(h('p', { class: 'empty-state', text: t('n_no_result') }));

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      runTool(tool, form, resultBox, true);
    });

    wrap.appendChild(form);
    wrap.appendChild(resultBox);

    /* Prefill from URL (shared link / history) and auto-run */
    if (Object.keys(state.params).length) {
      fillForm(tool, form, state.params);
      setTimeout(function () { runTool(tool, form, resultBox, false); }, 0);
    }
    return wrap;
  }

  function buildField(tool, f) {
    var id = 'f_' + tool.id + '_' + f.name;
    if (f.type === 'reqs') return buildReqsField(f, id);

    var input;
    if (f.type === 'select') {
      input = h('select', { id: id, name: f.name, class: 'input' },
        f.options.map(function (o) { return h('option', { value: o.value, text: t(o.labelKey) }); }));
      if (f.default) input.value = f.default;
    } else if (f.type === 'cidr') {
      input = h('input', {
        id: id, name: f.name, class: 'input', type: 'text', inputmode: 'numeric',
        placeholder: f.placeholder || '', autocomplete: 'off', list: 'cidrList'
      });
    } else {
      input = h('input', {
        id: id, name: f.name, class: 'input',
        type: f.type === 'number' ? 'text' : 'text',
        inputmode: f.type === 'number' ? 'numeric' : null,
        placeholder: f.placeholder || '', autocomplete: 'off', spellcheck: 'false'
      });
    }

    /* Keep decimal counts readable while preserving raw numeric values for calculations. */
    if (f.type === 'number' || (tool.id === 'number-converter' && f.name === 'value')) {
      input.addEventListener('blur', function () {
        var modeEl = document.getElementById('f_' + tool.id + '_mode');
        var mode = modeEl ? modeEl.value : '';
        if (f.type === 'number' || /^(dec_bin|dec_hex|dec_ip|ip_dec)$/.test(mode)) {
          formatNumericInput(input);
        }
      });
      input.addEventListener('focus', function () {
        input.value = normalizeNumericValue(input.value);
      });
    }

    return h('div', { class: 'field' }, [
      h('label', { class: 'label', for: id }, [
        t(f.labelKey),
        f.required ? h('span', { class: 'req', 'aria-hidden': 'true', text: ' *' }) : null
      ]),
      input,
      h('p', { class: 'error-msg', id: id + '_err', hidden: 'hidden', role: 'alert' })
    ]);
  }

  function buildReqsField(f, id) {
    var box = h('div', { class: 'field field-full' }, [
      h('span', { class: 'label', text: t('f_hosts') })
    ]);
    var list = h('div', { class: 'reqs-list', id: 'reqsList' });
    box.appendChild(list);
    box.appendChild(h('button', {
      class: 'btn btn-ghost btn-sm', type: 'button', text: '＋ ' + t('btn_add_row'),
      onclick: function () { addReqRow(list, '', ''); }
    }));
    box.appendChild(h('p', { class: 'error-msg', id: id + '_err', hidden: 'hidden', role: 'alert' }));
    addReqRow(list, 'LAN A', '50');
    addReqRow(list, 'LAN B', '25');
    return box;
  }

  function addReqRow(list, name, hosts) {
    var row = h('div', { class: 'req-row' }, [
      h('input', {
        class: 'input req-name', type: 'text', value: name,
        placeholder: t('f_subnet_name'), 'aria-label': t('f_subnet_name'), autocomplete: 'off'
      }),
      h('input', {
        class: 'input req-hosts', type: 'text', inputmode: 'numeric', value: hosts,
        placeholder: t('f_hosts'), 'aria-label': t('f_hosts'), autocomplete: 'off',
        onblur: function (e) { formatNumericInput(e.target); },
        onfocus: function (e) { e.target.value = normalizeNumericValue(e.target.value); }
      }),
      h('button', {
        class: 'btn btn-icon', type: 'button', 'aria-label': t('btn_remove'), text: '✕',
        onclick: function () { row.remove(); }
      })
    ]);
    list.appendChild(row);
  }

  function readForm(tool, form) {
    var v = {};
    tool.fields.forEach(function (f) {
      if (f.type === 'reqs') {
        v[f.name] = Array.prototype.map.call(form.querySelectorAll('.req-row'), function (row) {
          return {
            name: row.querySelector('.req-name').value.trim(),
            hosts: normalizeNumericValue(row.querySelector('.req-hosts').value.trim())
          };
        }).filter(function (r) { return r.name || r.hosts; });
      } else {
        var el = form.querySelector('[name="' + f.name + '"]');
        v[f.name] = el ? el.value.trim() : '';
        /* Numeric fields may be displayed with grouping separators. */
        if (el && (f.type === 'number' || f.validate === 'cidr' || f.validate === 'cidr6' ||
            (tool.id === 'number-converter' && f.name === 'value'))) {
          v[f.name] = normalizeNumericValue(v[f.name]);
        } else if (el && f.validate && /^(cidr|number|decimal)/i.test(f.validate)) {
          v[f.name] = normalizeNumericValue(v[f.name]);
        } else if (el) {
          v[f.name] = normalizeDigits(v[f.name]);
        }
      }
    });
    return v;
  }

  function fillForm(tool, form, params) {
    tool.fields.forEach(function (f) {
      if (f.type === 'reqs') {
        if (!params.reqs) return;
        var list = form.querySelector('#reqsList');
        list.innerHTML = '';
        params.reqs.split(',').forEach(function (item) {
          var parts = item.split(':');
          addReqRow(list, (parts[0] || '').trim(), (parts[1] || '').trim());
        });
      } else if (params[f.name] !== undefined) {
        var el = form.querySelector('[name="' + f.name + '"]');
        if (el) el.value = params[f.name];
      }
    });
  }

  function showFieldError(tool, form, fieldName, key) {
    var errEl = form.querySelector('#f_' + tool.id + '_' + fieldName + '_err');
    if (errEl) {
      errEl.textContent = t(key);
      errEl.hidden = false;
      errEl.parentNode.classList.add('has-error');
    }
    var input = form.querySelector('[name="' + fieldName + '"]');
    if (input) { input.setAttribute('aria-invalid', 'true'); input.focus(); }
  }

  function clearErrors(form) {
    Array.prototype.forEach.call(form.querySelectorAll('.error-msg'), function (e) {
      e.hidden = true; e.textContent = '';
    });
    Array.prototype.forEach.call(form.querySelectorAll('.has-error'), function (e) {
      e.classList.remove('has-error');
    });
    Array.prototype.forEach.call(form.querySelectorAll('[aria-invalid]'), function (e) {
      e.removeAttribute('aria-invalid');
    });
  }

  var VALIDATORS = {
    ipv4: function (val) { return NetCore.isValidIPv4(val) ? null : 'e_ipv4'; },
    ipv6: function (val) { return NetCore.isValidIPv6(val) ? null : 'e_ipv6'; },
    mask: function (val) { return NetCore.isValidMask(val) ? null : 'e_mask'; },
    maskOrCidr: function (val) { return NetCore.parsePrefix(val) === null ? 'e_mask_or_cidr' : null; },
    cidr: function (val) { return NetCore.isValidCidr(val, 32) ? null : 'e_cidr'; },
    cidrOptional: function (val) { return (val === '' || NetCore.isValidCidr(val, 32)) ? null : 'e_cidr'; },
    cidr6: function (val) { return (val === '' || NetCore.isValidCidr(val, 128)) ? null : 'e_cidr6'; },
    cidrNotation: function (val) {
      var parts = String(val).trim().split('/');
      if (parts.length !== 2) return 'e_cidr_notation';
      if (!NetCore.isValidIPv4(parts[0])) return 'e_ipv4';
      if (!NetCore.isValidCidr(parts[1], 32)) return 'e_cidr';
      return null;
    }
  };

  function runTool(tool, form, resultBox, save) {
    clearErrors(form);
    var values = readForm(tool, form);

    for (var i = 0; i < tool.fields.length; i++) {
      var f = tool.fields[i];
      var val = values[f.name];
      if (f.type === 'reqs') continue;
      if (f.required && (val === '' || val === undefined)) {
        showFieldError(tool, form, f.name, 'e_required');
        return;
      }
      if (val !== '' && f.validate && VALIDATORS[f.validate]) {
        var err = VALIDATORS[f.validate](val);
        if (err) { showFieldError(tool, form, f.name, err); return; }
      }
    }

    var result;
    try {
      result = tool.run(values);
    } catch (ex) {
      if (ex && ex.key) { showFieldError(tool, form, ex.field, ex.key); return; }
      throw ex;
    }

    state.lastRun = { toolId: tool.id, inputs: values, result: result };
    renderResult(tool, values, result, resultBox);

    if (save) {
      pushHistory({
        id: Date.now() + '-' + Math.random().toString(36).slice(2, 7),
        tool: tool.id,
        inputs: values,
        fields: result.fields,
        ts: new Date().toISOString()
      });
      toast(t('n_saved'));
    }
    /* keep the URL shareable */
    var q = shareParams(tool, values);
    history.replaceState(null, '', '#/' + tool.id + (q ? '?' + q : ''));
  }

  function shareParams(tool, values) {
    return Object.keys(values).map(function (k) {
      var v = values[k];
      if (Array.isArray(v)) {
        v = v.map(function (r) { return (r.name || '') + ':' + r.hosts; }).join(',');
      }
      if (v === '' || v === undefined) return null;
      return encodeURIComponent(k) + '=' + encodeURIComponent(v);
    }).filter(Boolean).join('&');
  }

  /* ---------------------- Results ---------------------- */
  function renderResult(tool, values, result, box) {
    box.innerHTML = '';
    var card = h('div', { class: 'card result-card', id: 'printArea' });
    card.appendChild(h('h2', { class: 'card-heading', text: t('results') }));

    var dl = h('dl', { class: 'result-grid' });
    result.fields.forEach(function (pair) {
      dl.appendChild(h('div', { class: 'result-item' }, [
        h('dt', { text: t(pair[0]) }),
        h('dd', { class: 'mono', text: dv(pair[1]) })
      ]));
    });
    card.appendChild(dl);

    (result.notes || []).forEach(function (n) {
      card.appendChild(h('p', { class: 'note', text: t(n.key, n.params) }));
    });

    if (result.table) {
      card.appendChild(h('h3', { class: 'card-subheading', text: t(result.table.titleKey || 'details') }));
      var scroll = h('div', { class: 'table-scroll' });
      var table = h('table', { class: 'data-table' });
      table.appendChild(h('thead', null, [
        h('tr', null, result.table.columns.map(function (c) { return h('th', { scope: 'col', text: t(c) }); }))
      ]));
      var tbody = h('tbody');
      result.table.rows.forEach(function (row) {
        tbody.appendChild(h('tr', null, row.map(function (cell) {
          return h('td', { class: 'mono', text: dv(cell) });
        })));
      });
      table.appendChild(tbody);
      scroll.appendChild(table);
      card.appendChild(scroll);
    }

    card.appendChild(buildActions(tool, values, result));
    box.appendChild(card);
  }

  function buildActions(tool, values, result) {
    var bar = h('div', { class: 'action-bar no-print' });

    bar.appendChild(h('button', {
      class: 'btn btn-ghost btn-sm', type: 'button', text: '📋 ' + t('btn_copy'),
      onclick: function () { copyText(resultToText(tool, result)); }
    }));
    bar.appendChild(h('button', {
      class: 'btn btn-ghost btn-sm', type: 'button', text: '⬇️ ' + t('btn_csv'),
      onclick: function () { download(tool.id + '.csv', 'text/csv', '\ufeff' + resultToCSV(result)); }
    }));
    bar.appendChild(h('button', {
      class: 'btn btn-ghost btn-sm', type: 'button', text: '🧾 ' + t('btn_json'),
      onclick: function () {
        download(tool.id + '.json', 'application/json',
          JSON.stringify({ tool: tool.id, inputs: values, result: resultToObject(result), date: new Date().toISOString() }, null, 2));
      }
    }));
    bar.appendChild(h('button', {
      class: 'btn btn-ghost btn-sm', type: 'button', text: '🖨️ ' + t('btn_print'),
      onclick: function () { window.print(); }
    }));
    bar.appendChild(h('button', {
      class: 'btn btn-ghost btn-sm', type: 'button', text: '🔗 ' + t('btn_share'),
      onclick: function () {
        var q = shareParams(tool, values);
        var url = location.href.split('#')[0] + '#/' + tool.id + (q ? '?' + q : '');
        copyText(url, 'n_link_copied');
      }
    }));
    if (result.viz) {
      bar.appendChild(h('button', {
        class: 'btn btn-ghost btn-sm', type: 'button', text: '🗺️ ' + t('btn_visualize'),
        onclick: function () {
          navigate('visualization', { ip: result.viz.network, cidr: result.viz.cidr, hosts: 4 });
        }
      }));
    }
    return bar;
  }

  function resultToObject(result) {
    var o = {};
    result.fields.forEach(function (p) { o[t(p[0])] = dv(p[1]); });
    if (result.table) {
      o.rows = result.table.rows.map(function (row) {
        var r = {};
        result.table.columns.forEach(function (c, i) { r[t(c)] = dv(row[i]); });
        return r;
      });
    }
    return o;
  }

  function resultToText(tool, result) {
    var lines = [t('tool_' + tool.id), ''];
    result.fields.forEach(function (p) { lines.push(t(p[0]) + ': ' + dv(p[1])); });
    if (result.table) {
      lines.push('');
      lines.push(result.table.columns.map(function (c) { return t(c); }).join(' | '));
      result.table.rows.forEach(function (row) {
        lines.push(row.map(function (c) { return dv(c); }).join(' | '));
      });
    }
    return lines.join('\n');
  }

  function csvCell(v) {
    var s = String(v).replace(/"/g, '""');
    return /[",\n]/.test(s) ? '"' + s + '"' : s;
  }

  function resultToCSV(result) {
    var lines = [];
    result.fields.forEach(function (p) { lines.push(csvCell(t(p[0])) + ',' + csvCell(dv(p[1]))); });
    if (result.table) {
      lines.push('');
      lines.push(result.table.columns.map(function (c) { return csvCell(t(c)); }).join(','));
      result.table.rows.forEach(function (row) {
        lines.push(row.map(function (c) { return csvCell(dv(c)); }).join(','));
      });
    }
    return lines.join('\n');
  }

  /* ---------------------- Visualization ---------------------- */
  function renderVisualization() {
    var wrap = h('div', { class: 'page' }, [pageHeader('visualization')]);
    wrap.appendChild(h('p', { class: 'lead', text: t('viz_intro') }));

    var form = h('form', { class: 'card form-card', novalidate: 'novalidate' });
    var grid = h('div', { class: 'form-grid' });

    var ipInput = h('input', { class: 'input', id: 'vizIp', name: 'ip', type: 'text', value: state.params.ip || '192.168.1.0', placeholder: '192.168.1.0', autocomplete: 'off' });
    var cidrInput = h('input', { class: 'input', id: 'vizCidr', name: 'cidr', type: 'text', inputmode: 'numeric', value: state.params.cidr || '24', placeholder: '24', autocomplete: 'off' });
    var hostsInput = h('input', { class: 'input', id: 'vizHosts', name: 'hosts', type: 'text', inputmode: 'numeric', value: state.params.hosts || '3', placeholder: '3', autocomplete: 'off' });
    var gwInput = h('input', { class: 'input', id: 'vizGw', name: 'gw', type: 'text', value: state.params.gw || '', placeholder: '192.168.1.1', autocomplete: 'off' });

    [[ipInput, 'f_network', 'vizIp'], [cidrInput, 'f_cidr', 'vizCidr'],
    [hostsInput, 'f_host_count', 'vizHosts'], [gwInput, 'f_gateway', 'vizGw']]
      .forEach(function (pair) {
        grid.appendChild(h('div', { class: 'field' }, [
          h('label', { class: 'label', for: pair[2], text: t(pair[1]) }), pair[0]
        ]));
      });

    form.appendChild(grid);
    var errBox = h('p', { class: 'error-msg', hidden: 'hidden', role: 'alert' });
    form.appendChild(errBox);
    form.appendChild(h('div', { class: 'form-actions' }, [
      h('button', { class: 'btn btn-primary', type: 'submit', text: t('btn_draw') })
    ]));

    var out = h('section', { class: 'result-area', 'aria-live': 'polite' });

    function draw() {
      errBox.hidden = true;
      var ip = ipInput.value.trim(), cidr = cidrInput.value.trim();
      var hosts = parseInt(hostsInput.value, 10);
      if (!NetCore.isValidIPv4(ip)) { errBox.textContent = t('e_ipv4'); errBox.hidden = false; return; }
      if (!NetCore.isValidCidr(cidr, 32)) { errBox.textContent = t('e_cidr'); errBox.hidden = false; return; }
      if (!hosts || hosts < 1) hosts = 1;
      if (gwInput.value.trim() && !NetCore.isValidIPv4(gwInput.value.trim())) {
        errBox.textContent = t('e_ipv4'); errBox.hidden = false; return;
      }
      var info = NetCore.calcIPv4(ip, Number(cidr));
      var maxHosts = Math.max(1, Math.min(hosts, info.usableHosts || 1));
      var drawn = Math.min(maxHosts, 10);
      var list = [];
      for (var i = 0; i < drawn; i++) list.push(NetCore.longToIp(info.firstHostLong + i));

      out.innerHTML = '';
      var card = h('div', { class: 'card', id: 'printArea' });
      card.appendChild(h('h2', { class: 'card-heading', text: info.network + '/' + info.cidr }));
      var scroll = h('div', { class: 'table-scroll viz-scroll' });
      scroll.innerHTML = buildSVG(info, list, gwInput.value.trim(), maxHosts - drawn);
      card.appendChild(scroll);
      card.appendChild(h('p', { class: 'note', text: t('viz_hosts_note') }));
      card.appendChild(h('h3', { class: 'card-subheading', text: t('viz_ascii') }));
      card.appendChild(h('pre', { class: 'ascii', text: buildASCII(info, list, gwInput.value.trim(), maxHosts - drawn) }));
      card.appendChild(h('div', { class: 'action-bar no-print' }, [
        h('button', {
          class: 'btn btn-ghost btn-sm', type: 'button', text: '📋 ' + t('btn_copy'),
          onclick: function () { copyText(buildASCII(info, list, gwInput.value.trim(), maxHosts - drawn)); }
        }),
        h('button', {
          class: 'btn btn-ghost btn-sm', type: 'button', text: '🖨️ ' + t('btn_print'),
          onclick: function () { window.print(); }
        }),
        h('button', {
          class: 'btn btn-ghost btn-sm', type: 'button', text: '🔗 ' + t('btn_share'),
          onclick: function () {
            var url = location.href.split('#')[0] + '#/visualization?ip=' + encodeURIComponent(ip) +
              '&cidr=' + encodeURIComponent(cidr) + '&hosts=' + encodeURIComponent(hosts) +
              (gwInput.value.trim() ? '&gw=' + encodeURIComponent(gwInput.value.trim()) : '');
            copyText(url, 'n_link_copied');
          }
        })
      ]));
      out.appendChild(card);
    }

    form.addEventListener('submit', function (e) { e.preventDefault(); draw(); });
    wrap.appendChild(form);
    wrap.appendChild(out);
    setTimeout(draw, 0);
    return wrap;
  }

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function buildSVG(info, hosts, gw, extra) {
    var nodeW = 120, gap = 28, pad = 32;
    var width = Math.max(560, hosts.length * (nodeW + gap) + pad * 2);
    var height = 330;
    var cx = width / 2;
    var s = ['<svg viewBox="0 0 ' + width + ' ' + height + '" width="' + width + '" height="' + height +
      '" role="img" aria-label="Network topology" xmlns="http://www.w3.org/2000/svg">'];

    s.push('<rect x="' + (cx - 130) + '" y="14" width="260" height="46" rx="10" class="viz-net"/>');
    s.push('<text x="' + cx + '" y="43" class="viz-t viz-t-strong" text-anchor="middle">' +
      esc(info.network + '/' + info.cidr) + '</text>');
    s.push('<line x1="' + cx + '" y1="60" x2="' + cx + '" y2="104" class="viz-line"/>');

    var label = gw ? esc(gw) : esc(info.mask);
    s.push('<rect x="' + (cx - 95) + '" y="104" width="190" height="46" rx="10" class="viz-sw"/>');
    s.push('<text x="' + cx + '" y="126" class="viz-t viz-t-strong" text-anchor="middle">' + esc('Router / Switch') + '</text>');
    s.push('<text x="' + cx + '" y="142" class="viz-t viz-t-dim" text-anchor="middle">' + label + '</text>');
    s.push('<line x1="' + cx + '" y1="150" x2="' + cx + '" y2="182" class="viz-line"/>');

    var totalW = hosts.length * nodeW + (hosts.length - 1) * gap;
    var startX = (width - totalW) / 2;
    if (hosts.length > 1) {
      s.push('<line x1="' + (startX + nodeW / 2) + '" y1="182" x2="' +
        (startX + totalW - nodeW / 2) + '" y2="182" class="viz-line"/>');
    }

    hosts.forEach(function (ip, i) {
      var x = startX + i * (nodeW + gap);
      var isServer = (i === hosts.length - 1 && hosts.length > 2);
      s.push('<line x1="' + (x + nodeW / 2) + '" y1="182" x2="' + (x + nodeW / 2) + '" y2="214" class="viz-line"/>');
      s.push('<rect x="' + x + '" y="214" width="' + nodeW + '" height="70" rx="10" class="viz-host"/>');
      s.push('<text x="' + (x + nodeW / 2) + '" y="242" class="viz-t" text-anchor="middle">' +
        (isServer ? '🖥️ Server' : '💻 PC-' + (i + 1)) + '</text>');
      s.push('<text x="' + (x + nodeW / 2) + '" y="266" class="viz-t viz-t-dim" text-anchor="middle">' + esc(ip) + '</text>');
    });

    if (extra > 0) {
      s.push('<text x="' + cx + '" y="308" class="viz-t viz-t-dim" text-anchor="middle">' +
        esc(t('viz_more', { n: extra })) + '</text>');
    }
    s.push('</svg>');
    return s.join('');
  }

  function buildASCII(info, hosts, gw, extra) {
    var lines = [];
    lines.push(info.network + '/' + info.cidr + '   mask ' + info.mask);
    lines.push('        |');
    lines.push('   [ Router / Switch ]' + (gw ? '  ' + gw : ''));
    lines.push('        |');
    var bar = '  ' + hosts.map(function () { return '----+'; }).join('');
    lines.push(bar);
    lines.push('      ' + hosts.map(function (_, i) {
      return (i === hosts.length - 1 && hosts.length > 2) ? 'SRV  ' : ('PC' + (i + 1) + '  ');
    }).join(''));
    lines.push('      ' + hosts.map(function (ip) { return ip + '  '; }).join(''));
    if (extra > 0) lines.push('      ' + t('viz_more', { n: extra }));
    lines.push('');
    lines.push('Range: ' + info.hostRange + '   Broadcast: ' + (info.broadcast || '—'));
    return lines.join('\n');
  }

  /* ---------------------- History ---------------------- */
  function renderHistory() {
    var wrap = h('div', { class: 'page' }, [pageHeader('history')]);
    var list = getHistory();

    if (!list.length) {
      wrap.appendChild(h('div', { class: 'card' }, [h('p', { class: 'empty-state', text: t('n_no_history') })]));
      return wrap;
    }

    wrap.appendChild(h('div', { class: 'action-bar' }, [
      h('span', { class: 'muted', text: t('h_count', { n: list.length }) }),
      h('button', {
        class: 'btn btn-danger btn-sm', type: 'button', text: t('btn_clear_history'),
        onclick: function () { setHistory([]); toast(t('n_cleared')); render(); }
      })
    ]));

    var card = h('div', { class: 'card' });
    var scroll = h('div', { class: 'table-scroll' });
    var table = h('table', { class: 'data-table' });
    table.appendChild(h('thead', null, [h('tr', null, [
      h('th', { scope: 'col', text: t('h_tool') }),
      h('th', { scope: 'col', text: t('h_inputs') }),
      h('th', { scope: 'col', text: t('h_date') }),
      h('th', { scope: 'col', text: t('h_actions') })
    ])]));

    var tbody = h('tbody');
    list.forEach(function (entry) {
      var inputsText = Object.keys(entry.inputs).map(function (k) {
        var v = entry.inputs[k];
        if (Array.isArray(v)) v = v.map(function (r) { return (r.name || '?') + ':' + r.hosts; }).join(' ');
        return v;
      }).filter(function (x) { return x !== '' && x !== undefined; }).join('  ');

      tbody.appendChild(h('tr', null, [
        h('td', null, [t('tool_' + entry.tool)]),
        h('td', { class: 'mono', text: inputsText }),
        h('td', { class: 'mono', text: new Date(entry.ts).toLocaleString(state.lang === 'ar' ? 'ar' : 'en-GB') }),
        h('td', null, [h('div', { class: 'row-actions' }, [
          h('button', {
            class: 'btn btn-ghost btn-sm', type: 'button', text: t('btn_view'),
            onclick: function () {
              var params = {};
              Object.keys(entry.inputs).forEach(function (k) {
                var v = entry.inputs[k];
                if (Array.isArray(v)) v = v.map(function (r) { return (r.name || '') + ':' + r.hosts; }).join(',');
                if (v !== '' && v !== undefined) params[k] = v;
              });
              navigate(entry.tool, params);
            }
          }),
          h('button', {
            class: 'btn btn-ghost btn-sm', type: 'button', text: t('btn_copy'),
            onclick: function () {
              copyText(t('tool_' + entry.tool) + '\n' +
                entry.fields.map(function (p) { return t(p[0]) + ': ' + dv(p[1]); }).join('\n'));
            }
          }),
          h('button', {
            class: 'btn btn-ghost btn-sm', type: 'button', text: t('btn_delete'),
            onclick: function () {
              setHistory(getHistory().filter(function (e2) { return e2.id !== entry.id; }));
              toast(t('n_deleted'));
              render();
            }
          })
        ])])
      ]));
    });

    table.appendChild(tbody);
    scroll.appendChild(table);
    card.appendChild(scroll);
    wrap.appendChild(card);
    return wrap;
  }

  /* ---------------------- Basics ---------------------- */
  function renderBasics() {
    var wrap = h('div', { class: 'page' }, [pageHeader('basics')]);
    var search = h('input', {
      class: 'input', type: 'search', placeholder: t('b_search'), 'aria-label': t('b_search')
    });
    wrap.appendChild(h('div', { class: 'card form-card' }, [
      h('div', { class: 'field field-full' }, [search])
    ]));

    var listBox = h('div', { class: 'basics-list' });
    wrap.appendChild(listBox);

    function paint(filter) {
      listBox.innerHTML = '';
      var q = (filter || '').trim().toLowerCase();
      var found = 0;
      BASICS.forEach(function (topic) {
        var hay = [topic.title.en, topic.title.ar, topic.def[state.lang], topic.id]
          .concat(topic.terms.en, topic.terms.ar).join(' ').toLowerCase();
        if (q && hay.indexOf(q) === -1) return;
        found++;
        var open = state.params.topic === topic.id;
        var details = h('details', { class: 'card topic', id: 'topic-' + topic.id, open: open ? 'open' : null }, [
          h('summary', null, [
            h('span', { class: 'topic-icon', 'aria-hidden': 'true', text: topic.icon }),
            h('span', { class: 'topic-title', text: topic.title[state.lang] })
          ]),
          h('div', { class: 'topic-body' }, [
            h('h3', { text: t('b_definition') }),
            h('p', { text: topic.def[state.lang] }),
            h('h3', { text: t('b_explanation') }),
            h('p', { text: topic.explain[state.lang] }),
            h('h3', { text: t('b_example') }),
            h('p', { class: 'mono example', text: topic.example[state.lang] }),
            h('h3', { text: t('b_terms') }),
            h('ul', { class: 'chips' }, topic.terms[state.lang].map(function (term) {
              return h('li', { class: 'chip', text: term });
            }))
          ])
        ]);
        listBox.appendChild(details);
      });
      if (!found) listBox.appendChild(h('p', { class: 'empty-state', text: t('search_empty') }));
    }

    search.addEventListener('input', function () { paint(search.value); });
    paint('');
    if (state.params.topic) {
      setTimeout(function () {
        var el = document.getElementById('topic-' + state.params.topic);
        if (el) el.scrollIntoView({ block: 'center' });
      }, 30);
    }
    return wrap;
  }

  /* ---------------------- Settings ---------------------- */
  function renderSettings() {
    var wrap = h('div', { class: 'page' }, [pageHeader('settings')]);

    var themeCard = h('div', { class: 'card' }, [
      h('h2', { class: 'card-heading', text: t('s_appearance') }),
      h('div', { class: 'setting-row' }, [
        h('span', { class: 'label', text: t('s_theme') }),
        h('div', { class: 'seg' }, [
          h('button', {
            class: 'btn btn-seg' + (state.theme === 'dark' ? ' active' : ''), type: 'button',
            'aria-pressed': String(state.theme === 'dark'), text: '🌙 ' + t('s_dark'),
            onclick: function () { state.theme = 'dark'; saveSettings(); applyChrome(); render(); }
          }),
          h('button', {
            class: 'btn btn-seg' + (state.theme === 'light' ? ' active' : ''), type: 'button',
            'aria-pressed': String(state.theme === 'light'), text: '☀️ ' + t('s_light'),
            onclick: function () { state.theme = 'light'; saveSettings(); applyChrome(); render(); }
          })
        ])
      ]),
      h('div', { class: 'setting-row' }, [
        h('span', { class: 'label', text: t('s_language') }),
        h('div', { class: 'seg' }, [
          h('button', {
            class: 'btn btn-seg' + (state.lang === 'en' ? ' active' : ''), type: 'button',
            'aria-pressed': String(state.lang === 'en'), text: 'English',
            onclick: function () { setLang('en'); }
          }),
          h('button', {
            class: 'btn btn-seg' + (state.lang === 'ar' ? ' active' : ''), type: 'button',
            'aria-pressed': String(state.lang === 'ar'), text: 'العربية',
            onclick: function () { setLang('ar'); }
          })
        ])
      ])
    ]);

    var dataCard = h('div', { class: 'card' }, [
      h('h2', { class: 'card-heading', text: t('s_data') }),
      h('p', { class: 'muted', text: t('s_data_note') }),
      h('div', { class: 'setting-row' }, [
        h('span', { class: 'label', text: t('s_history_size') }),
        h('span', { class: 'mono', text: String(getHistory().length) })
      ]),
      h('div', { class: 'action-bar' }, [
        h('button', {
          class: 'btn btn-danger btn-sm', type: 'button', text: t('btn_clear_history'),
          onclick: function () { setHistory([]); toast(t('n_cleared')); render(); }
        }),
        h('button', {
          class: 'btn btn-ghost btn-sm', type: 'button', text: t('btn_reset_settings'),
          onclick: function () {
            state.theme = 'dark'; state.lang = 'ar';
            saveSettings(); applyChrome(); renderNav(); render();
            toast(t('n_settings_reset'));
          }
        })
      ])
    ]);

    var aboutCard = h('div', { class: 'card' }, [
      h('h2', { class: 'card-heading', text: t('s_about') }),
      h('p', { class: 'muted', text: t('s_about_note') })
    ]);

    wrap.appendChild(themeCard);
    wrap.appendChild(dataCard);
    wrap.appendChild(aboutCard);
    return wrap;
  }

  function setLang(lang) {
    state.lang = lang;
    saveSettings();
    applyChrome();
    renderNav();
    render();
  }

  /* ---------------------- Search ---------------------- */
  function buildSearchIndex() {
    var idx = [];
    TOOLS.forEach(function (tool) {
      idx.push({
        type: 'tool', id: tool.id, icon: tool.icon,
        title: t('tool_' + tool.id), sub: t('tool_' + tool.id + '_desc'),
        hay: [t('tool_' + tool.id), I18N.en['tool_' + tool.id], I18N.ar['tool_' + tool.id]]
          .concat(tool.keywords || []).join(' ').toLowerCase(),
        href: '#/' + tool.id
      });
    });
    ['visualization', 'history', 'basics', 'settings'].forEach(function (id) {
      idx.push({
        type: 'page', id: id, icon: PAGE_ICONS[id],
        title: t('tool_' + id), sub: t('tool_' + id + '_desc'),
        hay: [I18N.en['tool_' + id], I18N.ar['tool_' + id], id].join(' ').toLowerCase(),
        href: '#/' + id
      });
    });
    BASICS.forEach(function (topic) {
      idx.push({
        type: 'topic', id: topic.id, icon: topic.icon,
        title: topic.title[state.lang], sub: t('tool_basics'),
        hay: [topic.title.en, topic.title.ar, topic.id]
          .concat(topic.terms.en, topic.terms.ar).join(' ').toLowerCase(),
        href: '#/basics?topic=' + topic.id
      });
    });
    return idx;
  }

  function initSearch() {
    var input = $('#globalSearch');
    var box = $('#searchResults');

    function close() { box.hidden = true; input.setAttribute('aria-expanded', 'false'); }

    function search() {
      var q = input.value.trim().toLowerCase();
      box.innerHTML = '';
      if (!q) { close(); return; }
      var hits = buildSearchIndex().filter(function (item) {
        return item.hay.indexOf(q) > -1 || item.title.toLowerCase().indexOf(q) > -1;
      }).slice(0, 8);

      if (!hits.length) {
        box.appendChild(h('p', { class: 'search-empty', text: t('search_empty') }));
      } else {
        hits.forEach(function (item) {
          box.appendChild(h('a', {
            class: 'search-item', href: item.href, role: 'option',
            onclick: function () { input.value = ''; close(); }
          }, [
            h('span', { class: 'search-icon', 'aria-hidden': 'true', text: item.icon }),
            h('span', { class: 'search-text' }, [
              h('strong', { text: item.title }),
              h('small', { text: item.sub })
            ])
          ]));
        });
      }
      box.hidden = false;
      input.setAttribute('aria-expanded', 'true');
    }

    input.addEventListener('input', search);
    input.addEventListener('focus', function () { if (input.value.trim()) search(); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { input.value = ''; close(); input.blur(); }
      if (e.key === 'ArrowDown') {
        var first = box.querySelector('.search-item');
        if (first) { e.preventDefault(); first.focus(); }
      }
    });
    document.addEventListener('click', function (e) {
      if (!box.contains(e.target) && e.target !== input) close();
    });
  }

  /* ------------------------------------------------------------------
     Boot
     ------------------------------------------------------------------ */
  function init() {
    loadSettings();
    applyChrome();

    var dl = $('#cidrList');
    for (var i = 0; i <= 32; i++) dl.appendChild(h('option', { value: String(i) }));

    $('#navToggle').addEventListener('click', toggleSidebar);
    $('#overlay').addEventListener('click', closeSidebar);

    /* Desktop starts with the navigation visible; mobile/tablet starts closed. */
    var desktopQuery = window.matchMedia ? window.matchMedia('(min-width: 1024px)') : null;
    setSidebarOpen(!!(desktopQuery && desktopQuery.matches));
    if (desktopQuery) {
      var onViewportChange = function (ev) {
        setSidebarOpen(ev.matches);
      };
      if (desktopQuery.addEventListener) desktopQuery.addEventListener('change', onViewportChange);
      else if (desktopQuery.addListener) desktopQuery.addListener(onViewportChange);
    }

    $('#themeToggle').addEventListener('click', function () {
      state.theme = state.theme === 'dark' ? 'light' : 'dark';
      saveSettings(); applyChrome();
    });
    $('#langToggle').addEventListener('click', function () {
      setLang(state.lang === 'en' ? 'ar' : 'en');
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeSidebar();
      if (e.key === '/' && document.activeElement.tagName !== 'INPUT' &&
        document.activeElement.tagName !== 'TEXTAREA' && document.activeElement.tagName !== 'SELECT') {
        e.preventDefault();
        $('#globalSearch').focus();
      }
    });

    initSearch();
    window.addEventListener('hashchange', onRoute);
    onRoute();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

})();
