/* =========================================================
   Cumpleaños de Emma — lógica de la página
   HTML + CSS + JS plano. Única dependencia externa: Three.js (portada).
   Todo el contenido personal vive en /data/*.json
   ========================================================= */
(function () {
  'use strict';

  var PREFIERE_MENOS_MOVIMIENTO =
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- utilidades ---------- */
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $all(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  function cargarJSON(ruta) {
    return fetch(ruta, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error('No se pudo cargar ' + ruta + ' (' + r.status + ')');
      return r.json();
    });
  }

  function valorAnidado(obj, ruta) {
    return ruta.split('.').reduce(function (o, k) { return o == null ? o : o[k]; }, obj);
  }

  function scrollA(sel) {
    var destino = $(sel);
    if (!destino) return;
    destino.scrollIntoView({ behavior: PREFIERE_MENOS_MOVIMIENTO ? 'auto' : 'smooth', block: 'start' });
  }

  /* ---------- observer de aparición al hacer scroll ---------- */
  var revelador = ('IntersectionObserver' in window)
    ? new IntersectionObserver(function (entradas, obs) {
        entradas.forEach(function (e) {
          if (e.isIntersecting) { e.target.classList.add('is-visible'); obs.unobserve(e.target); }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' })
    : null;

  function revelar(el) {
    if (!revelador) { el.classList.add('is-visible'); return; }
    revelador.observe(el);
  }

  /* ---------- "entrada" (se dispara al abrir la bóveda) ---------- */
  var yaEntro = false;
  var alEntrarCbs = [];
  function alEntrar(fn) { if (yaEntro) fn(); else alEntrarCbs.push(fn); }
  function dispararEntrada() {
    if (yaEntro) return;
    yaEntro = true;
    alEntrarCbs.splice(0).forEach(function (f) { try { f(); } catch (e) { console.error(e); } });
  }
  var armarReanudarMusica = function () {};

  /* =========================================================
     CONFIG + textos generales
     ========================================================= */
  function aplicarConfig(cfg) {
    $all('[data-config]').forEach(function (el) {
      var v = valorAnidado(cfg, el.getAttribute('data-config'));
      if (v != null) el.textContent = v;
    });
    $all('[data-config-text]').forEach(function (el) {
      var v = valorAnidado(cfg, el.getAttribute('data-config-text'));
      if (v != null) el.textContent = v;
    });
    if (cfg.tituloSitio) document.title = cfg.tituloSitio;
    if (cfg.nombre) {
      var t = $('.portada__nombre');
      if (t) t.setAttribute('aria-label', cfg.nombre);
    }
    iniciarContador(cfg.fechaNacimiento);
  }

  /* =========================================================
     CONTADOR de vida (años, meses, días, horas desde que nació)
     Si no hay fecha de nacimiento en config.json, se oculta.
     ========================================================= */
  function iniciarContador(fechaISO) {
    var inicio = fechaISO ? new Date(fechaISO + 'T00:00:00') : null;
    if (!inicio || isNaN(inicio.getTime())) {
      $all('.contador, .contador__etiqueta').forEach(function (el) { el.hidden = true; });
      return;
    }
    function pintar(sel, valor) {
      var txt = String(valor);
      $all('[data-cont="' + sel + '"]').forEach(function (el) { if (el.textContent !== txt) el.textContent = txt; });
    }
    function tick() {
      var ahora = new Date();
      var anios = ahora.getFullYear() - inicio.getFullYear();
      var meses = ahora.getMonth() - inicio.getMonth();
      var dias = ahora.getDate() - inicio.getDate();
      if (dias < 0) { meses -= 1; dias += new Date(ahora.getFullYear(), ahora.getMonth(), 0).getDate(); }
      if (meses < 0) { anios -= 1; meses += 12; }
      pintar('anios', anios);
      pintar('meses', meses);
      pintar('dias', dias);
      pintar('horas', ahora.getHours());
    }
    tick();
    setInterval(tick, 30000);
  }

  /* =========================================================
     CONFETI (canvas a pantalla completa, se dispara a pedido)
     ========================================================= */
  var lanzarConfeti = (function () {
    var cv, ctx, piezas = [], activo = false;
    var colores = ['#ff4fa3', '#b56bff', '#36d6c3', '#ffd34d', '#ff8a3d', '#4fa3ff'];
    function preparar() {
      if (cv) return;
      cv = document.createElement('canvas');
      cv.className = 'confeti';
      cv.setAttribute('aria-hidden', 'true');
      document.body.appendChild(cv);
      ctx = cv.getContext('2d');
      medir();
      window.addEventListener('resize', medir);
    }
    function medir() { cv.width = window.innerWidth; cv.height = window.innerHeight; }
    function bucle() {
      ctx.clearRect(0, 0, cv.width, cv.height);
      piezas = piezas.filter(function (p) { return p.y < cv.height + 30 && p.vida > 0; });
      piezas.forEach(function (p) {
        p.vy += 0.12; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.giro += p.vg; p.vida -= 0.004;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.giro);
        ctx.globalAlpha = Math.min(1, p.vida * 2);
        ctx.fillStyle = p.c;
        if (p.forma === 0) ctx.fillRect(-p.t / 2, -p.t / 4, p.t, p.t / 2);
        else { ctx.beginPath(); ctx.arc(0, 0, p.t / 3, 0, Math.PI * 2); ctx.fill(); }
        ctx.restore();
      });
      if (piezas.length) requestAnimationFrame(bucle); else { activo = false; ctx.clearRect(0, 0, cv.width, cv.height); }
    }
    return function (cantidad, origenY) {
      if (PREFIERE_MENOS_MOVIMIENTO) return;
      preparar();
      var n = cantidad || 160;
      for (var i = 0; i < n; i++) {
        var lado = Math.random() < 0.5;
        piezas.push({
          x: lado ? -10 : cv.width + 10,
          y: (origenY != null ? origenY : cv.height * 0.6) + (Math.random() - 0.5) * 80,
          vx: (lado ? 1 : -1) * (4 + Math.random() * 8), vy: -(6 + Math.random() * 9),
          giro: Math.random() * 6, vg: (Math.random() - 0.5) * 0.3,
          t: 8 + Math.random() * 8, c: colores[Math.floor(Math.random() * colores.length)],
          forma: Math.random() < 0.7 ? 0 : 1, vida: 1
        });
      }
      if (!activo) { activo = true; bucle(); }
    };
  })();

  /* =========================================================
     PORTADA — galaxia con corazón (canvas)
     Espiral de partículas girando + un corazón trazado con
     estrellas más brillantes en el centro. Liviano en celular.
     ========================================================= */
  function iniciarFondoPortada() {
    var canvas = $('.portada__canvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var ancho = 0, alto = 0, cx = 0, cy = 0;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var animando = true, raf = null, t = 0;
    var estrellas = [], galaxia = [], corazon = [];
    var mouseX = 0, mouseY = 0, offX = 0, offY = 0;

    // paleta por radio normalizado (0 = núcleo, 1 = borde)
    var PALETA = ['#fff4e6', '#ffe0b0', '#f4c07f', '#e88aa6', '#c774c0', '#8f74e8', '#6f8bec'];
    function colorRadio(rn) {
      return PALETA[Math.min(PALETA.length - 1, Math.floor(rn * PALETA.length))];
    }

    function dimensionar() {
      ancho = canvas.clientWidth;
      alto = canvas.clientHeight;
      canvas.width = Math.round(ancho * dpr);
      canvas.height = Math.round(alto * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cx = ancho / 2;
      cy = alto * 0.42;
      sembrar();
      if (PREFIERE_MENOS_MOVIMIENTO) { dibujar(); }
    }

    function sembrar() {
      var area = ancho * alto;
      var nEst = Math.max(50, Math.min(Math.round(area / 7000), 220));
      estrellas = [];
      for (var i = 0; i < nEst; i++) {
        estrellas.push({
          x: Math.random() * ancho, y: Math.random() * alto,
          r: Math.random() * 1.4 + 0.25,
          f: Math.random() * Math.PI * 2, v: Math.random() * 0.03 + 0.008
        });
      }

      var radio = Math.min(ancho, alto) * (ancho < 560 ? 0.66 : 0.52);
      var nGal = Math.max(420, Math.min(Math.round(area / 950), 1700));
      if (PREFIERE_MENOS_MOVIMIENTO) nGal = Math.min(nGal, 700);
      var brazos = 2, giroEspiral = 2.7;
      galaxia = [];
      for (var g = 0; g < nGal; g++) {
        var enBulbo = g < nGal * 0.22;                   // núcleo denso
        var rn = enBulbo ? Math.pow(Math.random(), 1.7) * 0.28 : Math.pow(Math.random(), 0.55);
        var r = rn * radio;
        var brazo = g % brazos;
        var base = brazo * (Math.PI * 2 / brazos) + rn * giroEspiral;
        var disp = (Math.random() - 0.5) * (enBulbo ? 6.3 : (0.52 - rn * 0.32));
        galaxia.push({
          r: r, a: base + disp,
          w: (0.10 + (1 - rn) * 0.4) * 0.0016,           // rotación diferencial
          rn: rn,
          size: Math.random() < 0.10 ? (Math.random() * 1.1 + 1.6) : (Math.random() * 1 + 0.55),
          col: colorRadio(Math.min(1, rn + (Math.random() - 0.5) * 0.14)),
          tw: Math.random() * Math.PI * 2, tv: Math.random() * 0.05 + 0.02
        });
      }

      // corazón: curva paramétrica clásica
      var escala = radio * 0.043;
      corazon = [];
      var nCor = ancho < 560 ? 110 : 168;
      for (var h = 0; h < nCor; h++) {
        var th = (h / nCor) * Math.PI * 2;
        var hx = 16 * Math.pow(Math.sin(th), 3);
        var hy = 13 * Math.cos(th) - 5 * Math.cos(2 * th) - 2 * Math.cos(3 * th) - Math.cos(4 * th);
        corazon.push({
          x: hx * escala + (Math.random() - 0.5) * 3,
          y: -hy * escala + (Math.random() - 0.5) * 3,
          tw: Math.random() * Math.PI * 2, tv: Math.random() * 0.06 + 0.03,
          size: Math.random() * 1.1 + 0.9
        });
      }
    }

    function dibujar() {
      ctx.clearRect(0, 0, ancho, alto);

      // brillo del núcleo
      var glow = ctx.createRadialGradient(cx + offX, cy + offY, 0, cx + offX, cy + offY, Math.min(ancho, alto) * 0.6);
      glow.addColorStop(0, 'rgba(255, 224, 196, 0.26)');
      glow.addColorStop(0.22, 'rgba(226, 138, 166, 0.15)');
      glow.addColorStop(0.5, 'rgba(143, 116, 232, 0.08)');
      glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, ancho, alto);

      // estrellas de fondo
      for (var i = 0; i < estrellas.length; i++) {
        var s = estrellas[i];
        var b = 0.35 + Math.sin(s.f + t * s.v) * 0.35 + 0.3;
        ctx.globalAlpha = Math.max(0, Math.min(1, b)) * 0.8;
        ctx.fillStyle = '#ffe9d6';
        ctx.fillRect(s.x, s.y, s.r, s.r);
      }

      // galaxia
      var flatten = 0.58, tilt = -0.34;
      var cosT = Math.cos(tilt), sinT = Math.sin(tilt);
      ctx.globalCompositeOperation = 'lighter';
      for (var g = 0; g < galaxia.length; g++) {
        var p = galaxia[g];
        if (!PREFIERE_MENOS_MOVIMIENTO) p.a += p.w * 16;
        var px = Math.cos(p.a) * p.r;
        var py = Math.sin(p.a) * p.r * flatten;
        var rx = px * cosT - py * sinT;
        var ry = px * sinT + py * cosT;
        var tw = 0.6 + Math.sin(p.tw + t * p.tv) * 0.4;
        ctx.globalAlpha = Math.min(1, (0.5 + (1 - p.rn) * 0.5) * tw);
        ctx.fillStyle = p.col;
        ctx.fillRect(cx + offX + rx, cy + offY + ry, p.size, p.size);
      }
      ctx.globalCompositeOperation = 'source-over';

      // corazón
      ctx.globalCompositeOperation = 'lighter';
      var lat = PREFIERE_MENOS_MOVIMIENTO ? 1 : 1 + Math.sin(t * 0.03) * 0.03;
      for (var h = 0; h < corazon.length; h++) {
        var c = corazon[h];
        var br = 0.5 + Math.sin(c.tw + t * c.tv) * 0.5;
        ctx.globalAlpha = 0.35 + br * 0.6;
        ctx.fillStyle = br > 0.6 ? '#ffd9a8' : '#ff6f9d';
        var s2 = c.size * (br > 0.7 ? 1.6 : 1);
        ctx.fillRect(cx + offX + c.x * lat, cy + offY + c.y * lat - alto * 0.02, s2, s2);
      }
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
    }

    function frame() {
      if (!animando) return;
      t += 1;
      offX += ((mouseX - cx) * 0.02 - offX) * 0.04;
      offY += ((mouseY - cy) * 0.02 - offY) * 0.04;
      dibujar();
      raf = requestAnimationFrame(frame);
    }

    var entrado = false;
    function arrancar() {
      if (!entrado) return;               // no animar hasta abrir la bóveda
      if (PREFIERE_MENOS_MOVIMIENTO) { dibujar(); return; }
      if (!animando) { animando = true; frame(); }
    }
    function parar() { animando = false; if (raf) cancelAnimationFrame(raf); }

    animando = false;
    dimensionar();
    alEntrar(function () { entrado = true; arrancar(); });

    var reajuste;
    window.addEventListener('resize', function () {
      clearTimeout(reajuste);
      reajuste = setTimeout(dimensionar, 200);
    });
    window.addEventListener('pointermove', function (e) {
      mouseX = e.clientX; mouseY = e.clientY;
    }, { passive: true });

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) parar(); else arrancar();
    });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (ents) {
        ents.forEach(function (e) { if (e.isIntersecting) arrancar(); else parar(); });
      }, { threshold: 0.02 }).observe($('#portada'));
    }
  }

  /* =========================================================
     PORTADA — decide: corazón 3D (WebGL) o galaxia 2D (fallback)
     ========================================================= */
  function hayWebGL() {
    try {
      var c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl')));
    } catch (e) { return false; }
  }

  function iniciarPortada() {
    var canvas = $('.portada__canvas');
    if (!canvas) return;
    if (window.THREE && hayWebGL()) {
      alEntrar(function () {
        try { corazon3D(canvas); }
        catch (e) { console.error('corazón 3D falló, uso galaxia 2D', e); iniciarFondoPortada(); }
      });
    } else {
      iniciarFondoPortada();
    }
  }

  /* Número de partículas 3D ("11") que se arma volando + fuegos artificiales */
  function corazon3D(canvas) {
    var T = window.THREE;
    var renderer = new T.WebGLRenderer({ canvas: canvas, alpha: true, antialias: false, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    var scene = new T.Scene();
    var camara = new T.PerspectiveCamera(58, 1, 0.1, 100);
    camara.position.set(0, 0.9, 13);

    function sprite(stops) {
      var c = document.createElement('canvas'); c.width = c.height = 64;
      var g = c.getContext('2d');
      var grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      stops.forEach(function (s) { grd.addColorStop(s[0], s[1]); });
      g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
      return new T.CanvasTexture(c);
    }
    var texPunto = sprite([[0, 'rgba(255,255,255,1)'], [0.3, 'rgba(255,240,250,0.85)'], [1, 'rgba(255,255,255,0)']]);

    // --- muestrear los píxeles del texto "11" en un canvas ---
    var texto = (canvas.getAttribute('data-numero') || '11');
    var cv = document.createElement('canvas'); cv.width = 420; cv.height = 300;
    var g2 = cv.getContext('2d');
    g2.fillStyle = '#fff'; g2.textAlign = 'center'; g2.textBaseline = 'middle';
    g2.font = '900 250px "Fredoka", "Arial Black", Arial, sans-serif';
    g2.fillText(texto, 210, 160);
    var datos = g2.getImageData(0, 0, cv.width, cv.height).data;
    var objetivos = [];
    for (var yy = 0; yy < cv.height; yy += 3) {
      for (var xx = 0; xx < cv.width; xx += 3) {
        if (datos[(yy * cv.width + xx) * 4 + 3] > 128) objetivos.push([xx, yy]);
      }
    }

    var grupo = new T.Group(); scene.add(grupo);
    var area = window.innerWidth * window.innerHeight;
    var N = Math.max(2800, Math.min(Math.round(area / 120), 9000));
    var esc = 0.021;
    var destino = new Float32Array(N * 3), inicio = new Float32Array(N * 3);
    var posN = new Float32Array(N * 3), colN = new Float32Array(N * 3), retraso = new Float32Array(N);
    var paleta = ['#ff4fa3', '#b56bff', '#36d6c3', '#ffd34d', '#ffffff', '#ff8fc8'].map(function (h) { return new T.Color(h); });
    for (var i = 0; i < N; i++) {
      var o = objetivos[Math.floor(Math.random() * objetivos.length)];
      destino[i * 3] = (o[0] - 210 + (Math.random() - 0.5) * 3) * esc;
      destino[i * 3 + 1] = (160 - o[1] + (Math.random() - 0.5) * 3) * esc;
      destino[i * 3 + 2] = (Math.random() - 0.5) * 0.9;
      // nacen dispersas en una esfera grande
      var th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1), r = 9 + Math.random() * 8;
      inicio[i * 3] = r * Math.sin(ph) * Math.cos(th);
      inicio[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th);
      inicio[i * 3 + 2] = r * Math.cos(ph) - 4;
      posN[i * 3] = inicio[i * 3]; posN[i * 3 + 1] = inicio[i * 3 + 1]; posN[i * 3 + 2] = inicio[i * 3 + 2];
      retraso[i] = Math.random() * 0.9;
      var col = paleta[Math.floor(Math.random() * paleta.length)];
      colN[i * 3] = col.r; colN[i * 3 + 1] = col.g; colN[i * 3 + 2] = col.b;
    }
    var geoN = new T.BufferGeometry();
    geoN.setAttribute('position', new T.BufferAttribute(posN, 3));
    geoN.setAttribute('color', new T.BufferAttribute(colN, 3));
    var numero = new T.Points(geoN, new T.PointsMaterial({
      size: 0.12, map: texPunto, vertexColors: true, transparent: true, depthWrite: false, blending: T.AdditiveBlending
    }));
    grupo.add(numero);
    grupo.position.y = 7.2;

    // --- fuegos artificiales ---
    var FW = 6, PF = 140;
    var fuegos = [];
    for (var f = 0; f < FW; f++) {
      var pos = new Float32Array(PF * 3), vel = new Float32Array(PF * 3);
      var geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(pos, 3));
      var mat = new T.PointsMaterial({ size: 0.16, map: texPunto, color: paleta[f % 4].clone(), transparent: true, opacity: 0,
        depthWrite: false, blending: T.AdditiveBlending });
      var pts = new T.Points(geo, mat); scene.add(pts);
      fuegos.push({ pts: pts, pos: pos, vel: vel, vida: 0, espera: f * 0.9 + Math.random() });
    }
    function explotar(fw) {
      var cx = (Math.random() - 0.5) * 16, cy = 2 + Math.random() * 6, cz = -6 - Math.random() * 6;
      for (var k = 0; k < PF; k++) {
        var a1 = Math.random() * Math.PI * 2, a2 = Math.acos(2 * Math.random() - 1), sp = 0.05 + Math.random() * 0.05;
        fw.pos[k * 3] = cx; fw.pos[k * 3 + 1] = cy; fw.pos[k * 3 + 2] = cz;
        fw.vel[k * 3] = sp * Math.sin(a2) * Math.cos(a1);
        fw.vel[k * 3 + 1] = sp * Math.sin(a2) * Math.sin(a1);
        fw.vel[k * 3 + 2] = sp * Math.cos(a2);
      }
      fw.pts.material.color = paleta[Math.floor(Math.random() * 4)].clone();
      fw.vida = 1;
    }

    // --- chispas que suben ---
    var CH = 170;
    var posC = new Float32Array(CH * 3), velC = new Float32Array(CH);
    function nuevaChispa(j, ini) {
      posC[j * 3] = (Math.random() < 0.5 ? -1 : 1) * (0.7 + Math.random() * 2.6);
      posC[j * 3 + 1] = (ini ? Math.random() * 6 - 3.4 : -3.4);
      posC[j * 3 + 2] = (Math.random() - 0.5) * 2.2;
      velC[j] = 0.005 + Math.random() * 0.012;
    }
    for (var c1 = 0; c1 < CH; c1++) nuevaChispa(c1, true);
    var geoC = new T.BufferGeometry();
    geoC.setAttribute('position', new T.BufferAttribute(posC, 3));
    var chispas = new T.Points(geoC, new T.PointsMaterial({
      size: 0.075, map: texPunto, color: new T.Color('#ffe9a8'), transparent: true, opacity: 0.6, depthWrite: false, blending: T.AdditiveBlending
    }));
    scene.add(chispas);

    // --- podio ---
    var texPodio = sprite([[0, 'rgba(255,230,160,0.95)'], [0.45, 'rgba(181,107,255,0.4)'], [1, 'rgba(181,107,255,0)']]);
    var podio = new T.Mesh(new T.PlaneGeometry(2, 2),
      new T.MeshBasicMaterial({ map: texPodio, transparent: true, depthWrite: false, blending: T.AdditiveBlending }));
    podio.rotation.x = -Math.PI / 2 + 0.26; podio.position.y = -3.4; podio.scale.set(3.8, 2, 1);
    scene.add(podio);

    // --- estrellas ---
    var ST = 650, posS = new Float32Array(ST * 3);
    for (var s2 = 0; s2 < ST; s2++) {
      posS[s2 * 3] = (Math.random() - 0.5) * 70; posS[s2 * 3 + 1] = (Math.random() - 0.5) * 46; posS[s2 * 3 + 2] = -12 - Math.random() * 34;
    }
    var geoS = new T.BufferGeometry(); geoS.setAttribute('position', new T.BufferAttribute(posS, 3));
    var estrellas = new T.Points(geoS, new T.PointsMaterial({
      size: 0.16, map: texPunto, color: new T.Color('#fff2fb'), transparent: true, opacity: 0.5, depthWrite: false, blending: T.AdditiveBlending
    }));
    scene.add(estrellas);

    function medir() {
      var w = canvas.clientWidth || window.innerWidth, h = canvas.clientHeight || window.innerHeight;
      renderer.setSize(w, h, false);
      camara.aspect = w / h;
      camara.position.z = w < 560 ? 17 : 13;
      camara.updateProjectionMatrix();
    }
    medir();
    var rz;
    window.addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(medir, 200); });

    function suave(x) { return x < 0 ? 0 : x > 1 ? 1 : x * x * (3 - 2 * x); }

    var reloj = 0, visible = true, t0 = performance.now();
    function frame() {
      if (PREFIERE_MENOS_MOVIMIENTO) {
        posN.set(destino); geoN.attributes.position.needsUpdate = true;
        camara.lookAt(0, 3.7, 0); renderer.render(scene, camara); return;
      }
      requestAnimationFrame(frame);
      if (!visible) return;
      reloj = (performance.now() - t0) / 1000;
      // armado del número (2.6 s) y luego respiración
      var a = geoN.attributes.position.array;
      for (var i2 = 0; i2 < N; i2++) {
        var p = suave((reloj - retraso[i2]) / 2.2);
        var wob = p >= 1 ? Math.sin(reloj * 2 + i2) * 0.015 : 0;
        a[i2 * 3] = inicio[i2 * 3] + (destino[i2 * 3] - inicio[i2 * 3]) * p + wob;
        a[i2 * 3 + 1] = inicio[i2 * 3 + 1] + (destino[i2 * 3 + 1] - inicio[i2 * 3 + 1]) * p + wob;
        a[i2 * 3 + 2] = inicio[i2 * 3 + 2] + (destino[i2 * 3 + 2] - inicio[i2 * 3 + 2]) * p;
      }
      geoN.attributes.position.needsUpdate = true;
      grupo.rotation.y = Math.sin(reloj * 0.35) * 0.35;
      numero.material.size = 0.11 + Math.sin(reloj * 2) * 0.015;
      podio.material.opacity = 0.72 + Math.sin(reloj * 1.5) * 0.16;

      fuegos.forEach(function (fw) {
        if (fw.vida <= 0) {
          fw.espera -= 0.016;
          if (fw.espera <= 0 && reloj > 2.4) { explotar(fw); fw.espera = 1.5 + Math.random() * 3; }
          fw.pts.material.opacity = 0; return;
        }
        for (var k = 0; k < PF; k++) {
          fw.pos[k * 3] += fw.vel[k * 3]; fw.pos[k * 3 + 1] += fw.vel[k * 3 + 1] - 0.004 * (1 - fw.vida); fw.pos[k * 3 + 2] += fw.vel[k * 3 + 2];
          fw.vel[k * 3] *= 0.985; fw.vel[k * 3 + 1] *= 0.985; fw.vel[k * 3 + 2] *= 0.985;
        }
        fw.pts.geometry.attributes.position.needsUpdate = true;
        fw.vida -= 0.012;
        fw.pts.material.opacity = Math.max(0, fw.vida);
      });

      var ac = geoC.attributes.position.array;
      for (var j = 0; j < CH; j++) {
        ac[j * 3 + 1] += velC[j];
        ac[j * 3] += Math.sin((reloj + j) * 0.6) * 0.002;
        if (ac[j * 3 + 1] > 4) nuevaChispa(j, false);
      }
      geoC.attributes.position.needsUpdate = true;
      estrellas.rotation.z = reloj * 0.005;
      camara.position.x = Math.sin(reloj * 0.11) * 0.7;
      camara.lookAt(0, 3.7, 0);
      renderer.render(scene, camara);
    }
    frame();

    document.addEventListener('visibilitychange', function () { visible = !document.hidden; });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) { visible = e.isIntersecting; });
      }, { threshold: 0.02 }).observe($('#portada'));
    }
  }

  /* =========================================================
     FONDO AMBIENTAL — wash de color + pétalos (o una imagen)
     ========================================================= */
  function iniciarAmbiente(cfg) {
    var amb = $('#ambiente');
    if (!amb) return;
    var conf = (cfg && cfg.fondo) || {};

    if (conf.imagen) {
      var im = document.createElement('div');
      im.className = 'ambiente__img';
      im.style.backgroundImage = 'url("' + String(conf.imagen).replace(/["\\]/g, '') + '")';
      im.style.opacity = conf.opacidad != null ? conf.opacidad : 0.5;
      amb.appendChild(im);
    }

    if (PREFIERE_MENOS_MOVIMIENTO) return;
    // globos que suben
    var coloresGlobo = ['#ff4fa3', '#b56bff', '#36d6c3', '#ffd34d', '#ff8a3d', '#4fa3ff'];
    var nG = window.innerWidth < 640 ? 6 : 10;
    for (var g = 0; g < nG; g++) {
      var gl = document.createElement('span');
      gl.className = 'ambiente__globo';
      var tam = 26 + Math.random() * 22;
      gl.style.left = (Math.random() * 94) + 'vw';
      gl.style.width = tam.toFixed(0) + 'px';
      gl.style.height = (tam * 1.22).toFixed(0) + 'px';
      gl.style.setProperty('--c', coloresGlobo[g % coloresGlobo.length]);
      gl.style.animationDuration = (18 + Math.random() * 16).toFixed(1) + 's';
      gl.style.animationDelay = (-Math.random() * 30).toFixed(1) + 's';
      amb.appendChild(gl);
    }
    // confeti suave que cae
    var n = window.innerWidth < 640 ? 10 : 18;
    for (var i = 0; i < n; i++) {
      var p = document.createElement('span');
      p.className = 'ambiente__petalo';
      var s = 6 + Math.random() * 7;
      p.style.left = (Math.random() * 100) + 'vw';
      p.style.width = s.toFixed(1) + 'px';
      p.style.height = (s * 0.5).toFixed(1) + 'px';
      p.style.borderRadius = '2px';
      p.style.animationDuration = (12 + Math.random() * 14).toFixed(1) + 's';
      p.style.animationDelay = (-Math.random() * 22).toFixed(1) + 's';
      p.style.opacity = (0.35 + Math.random() * 0.3).toFixed(2);
      p.style.background = coloresGlobo[i % coloresGlobo.length];
      amb.appendChild(p);
    }
  }

  /* =========================================================
     BÓVEDA de entrada — teclado de 4 dígitos
     ========================================================= */
  function iniciarBoveda(cfg) {
    var b = $('#boveda');
    if (!b) { dispararEntrada(); armarReanudarMusica(); return; }
    var conf = (cfg && cfg.boveda) || {};
    var codigo = String(conf.codigo || '0708').replace(/\D/g, '') || '0708';
    var maxPista = conf.intentosParaPista || 3;
    var display = $('#bovedaDisplay');
    var puntos = $all('span', display);
    var pista = $('#bovedaPista');
    var teclado = $('#bovedaTeclado');
    var entrado = '', intentos = 0, resuelto = false;

    var recordado = false;
    try { recordado = localStorage.getItem('emma11_entrada') === '1'; } catch (e) {}
    if (recordado) { b.hidden = true; dispararEntrada(); armarReanudarMusica(); return; }

    document.body.style.overflow = 'hidden';

    function render() {
      puntos.forEach(function (p, i) { p.classList.toggle('lleno', i < entrado.length); });
    }
    function agregar(d) {
      if (resuelto || entrado.length >= 4) return;
      entrado += d;
      render();
      if (entrado.length === 4) setTimeout(verificar, 170);
    }
    function borrar() { if (!resuelto) { entrado = entrado.slice(0, -1); render(); } }
    function verificar() {
      if (entrado === codigo) { desbloquear(); return; }
      intentos += 1;
      display.classList.add('error');
      setTimeout(function () {
        display.classList.remove('error');
        entrado = ''; render();
      }, 430);
      if (intentos >= maxPista && conf.pista) {
        pista.textContent = conf.pista;
        pista.hidden = false;
      }
    }
    function desbloquear() {
      resuelto = true;
      try { localStorage.setItem('emma11_entrada', '1'); } catch (e) {}
      document.body.style.overflow = '';
      b.classList.add('abriendo');
      dispararEntrada();
      setTimeout(function () { lanzarConfeti(240); }, 450);
      var quitar = function () { b.hidden = true; };
      b.addEventListener('animationend', quitar, { once: true });
      setTimeout(quitar, 1500);
    }

    teclado.addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('button') : null;
      if (!btn) return;
      if (btn.getAttribute('data-d') != null) agregar(btn.getAttribute('data-d'));
      else if (btn.getAttribute('data-accion') === 'borrar') borrar();
      else if (btn.getAttribute('data-accion') === 'ok' && entrado.length === 4) verificar();
    });
    document.addEventListener('keydown', function (e) {
      if (b.hidden || resuelto) return;
      if (/^[0-9]$/.test(e.key)) agregar(e.key);
      else if (e.key === 'Backspace') borrar();
      else if (e.key === 'Enter' && entrado.length === 4) verificar();
    });
    render();
    var primer = $('button', teclado);
    if (primer) { try { primer.focus(); } catch (e) {} }
  }

  /* =========================================================
     MÚSICA de fondo
     ========================================================= */
  function iniciarMusica(cfg) {
    var audio = $('#musica');
    var toggle = $('#musicaToggle');
    var conf = (cfg && cfg.musica) || {};
    if (!audio || !toggle || !conf.archivo) return;

    audio.src = conf.archivo;
    audio.volume = 0;
    var VOL = 0.55;
    var quiereSonar = true;
    try { if (localStorage.getItem('emma11_musica') === 'off') quiereSonar = false; } catch (e) {}

    function fundir() {
      var v = audio.volume;
      var id = setInterval(function () {
        v += 0.035;
        audio.volume = Math.min(VOL, v);
        if (v >= VOL || audio.paused) clearInterval(id);
      }, 110);
    }
    function tocar() {
      var p = audio.play();
      if (p && p.then) p.then(fundir).catch(function () {});
      else fundir();
    }
    function pintar() { toggle.classList.toggle('is-muted', audio.paused); }

    toggle.addEventListener('click', function () {
      if (audio.paused) {
        quiereSonar = true; tocar();
        try { localStorage.setItem('emma11_musica', 'on'); } catch (e) {}
      } else {
        audio.pause(); quiereSonar = false;
        try { localStorage.setItem('emma11_musica', 'off'); } catch (e) {}
      }
      pintar();
    });

    armarReanudarMusica = function () {
      toggle.hidden = false;
      pintar();
      var unaVez = function () {
        if (quiereSonar && audio.paused) tocar();
        setTimeout(pintar, 50);
        document.removeEventListener('pointerdown', unaVez);
      };
      document.addEventListener('pointerdown', unaVez);
    };

    alEntrar(function () {
      toggle.hidden = false;
      if (quiereSonar) tocar();
      setTimeout(pintar, 60);
    });
  }

  /* =========================================================
     LA CARTA — sobre animado
     ========================================================= */
  function iniciarCarta(carta) {
    var sobre = $('#sobre');
    var texto = $('#cartaTexto');
    if (!sobre || !texto) return;

    var enc = $('[data-carta="encabezado"]', texto);
    var cuerpo = $('[data-carta="parrafos"]', texto);
    var firma = $('[data-carta="firma"]', texto);
    var firmaNombre = $('[data-carta="firmaNombre"]', texto);

    if (enc && carta.encabezado) enc.textContent = carta.encabezado;
    if (cuerpo) {
      cuerpo.innerHTML = '';
      var bloques = carta.bloques || (carta.parrafos || []).map(function (p) { return { tipo: 'parrafo', texto: p }; });
      bloques.forEach(function (b) {
        var el;
        if (b.tipo === 'fotos') {
          el = document.createElement('div');
          el.className = 'carta-fotos';
          (b.fotos || []).forEach(function (f, i) {
            var fig = document.createElement('figure');
            fig.className = 'carta-polaroid' + (i % 2 ? ' carta-polaroid--der' : '');
            fig.innerHTML = '<img src="' + encodeURI(f.src) + '" alt="" loading="lazy">' +
              (f.etiqueta ? '<figcaption>' + escapar(f.etiqueta) + '</figcaption>' : '');
            el.appendChild(fig);
          });
        } else if (b.tipo === 'recuerda') {
          el = document.createElement('div');
          el.className = 'carta-recuerda';
          var h = document.createElement('p');
          h.className = 'carta-recuerda__titulo';
          h.textContent = b.titulo || 'Recuerda siempre que…';
          el.appendChild(h);
          (b.items || []).forEach(function (it) {
            var card = document.createElement('div');
            card.className = 'carta-recuerda__item';
            card.innerHTML = '<span class="carta-recuerda__icono" aria-hidden="true">' + escapar(it.icono || '★') + '</span>' +
              '<div><b>' + escapar(it.titulo || '') + '</b><span>' + escapar(it.texto || '') + '</span></div>';
            el.appendChild(card);
          });
        } else if (b.tipo === 'final') {
          el = document.createElement('p');
          el.className = 'carta-final';
          el.textContent = b.texto;
        } else {
          el = document.createElement('p');
          if (b.icono) {
            el.className = 'carta-con-icono';
            var ic = document.createElement('span');
            ic.className = 'carta-icono'; ic.setAttribute('aria-hidden', 'true'); ic.textContent = b.icono;
            el.appendChild(ic);
            el.appendChild(document.createTextNode(b.texto));
          } else {
            el.textContent = b.texto;
          }
        }
        cuerpo.appendChild(el);
      });
    }
    if (firma && carta.firma) firma.textContent = carta.firma;
    if (firmaNombre && carta.firmaNombre) firmaNombre.textContent = carta.firmaNombre;

    function abrir() {
      if (sobre.classList.contains('abierto')) return;
      sobre.classList.add('abierto');
      sobre.setAttribute('aria-expanded', 'true');
      setTimeout(function () { lanzarConfeti(140, window.innerHeight * 0.4); }, 300);
      setTimeout(function () {
        texto.hidden = false;
        texto.scrollIntoView({ behavior: PREFIERE_MENOS_MOVIMIENTO ? 'auto' : 'smooth', block: 'start' });
      }, PREFIERE_MENOS_MOVIMIENTO ? 0 : 520);
    }

    function cerrar() {
      texto.hidden = true;
      sobre.classList.remove('abierto');
      sobre.setAttribute('aria-expanded', 'false');
      sobre.focus();
      sobre.scrollIntoView({ behavior: PREFIERE_MENOS_MOVIMIENTO ? 'auto' : 'smooth', block: 'center' });
    }

    sobre.addEventListener('click', abrir);
    sobre.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrir(); }
    });
    var btnCerrar = $('[data-cerrar-carta]', texto);
    if (btnCerrar) btnCerrar.addEventListener('click', cerrar);
  }

  /* =========================================================
     LÍNEA DE TIEMPO — de bebé a hoy
     ========================================================= */
  function formatearFecha(iso) {
    var d = new Date(iso + 'T00:00:00');
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  function iniciarHistoria(momentos) {
    var cont = $('#timeline');
    if (!cont) return;
    var lista = (momentos || []).slice().sort(function (a, b) {
      return (a.orden || 0) - (b.orden || 0) || String(a.fecha).localeCompare(String(b.fecha));
    });
    cont.innerHTML = '';
    if (!lista.length) {
      cont.innerHTML = '<li class="error-datos">Todavía no hay momentos cargados.</li>';
      return;
    }
    lista.forEach(function (m) {
      var li = document.createElement('li');
      li.className = 'hito';
      var html = '';
      if (m.etiqueta) html += '<p class="hito__fecha">' + escapar(m.etiqueta) + '</p>';
      else if (m.fecha) html += '<p class="hito__fecha">' + formatearFecha(m.fecha) + '</p>';
      if (m.titulo) html += '<h3 class="hito__titulo">' + escapar(m.titulo) + '</h3>';
      if (m.foto) {
        html += '<img class="hito__foto" src="' + encodeURI(m.foto) + '" alt="' +
          escapar(m.titulo || 'Recuerdo') + '" loading="lazy" onerror="this.remove()">';
      }
      if (m.descripcion) html += '<p class="hito__desc">' + escapar(m.descripcion) + '</p>';
      if (m.nota) html += '<p class="hito__nota">' + escapar(m.nota) + '</p>';
      li.innerHTML = html;
      li.classList.add('reveal');
      cont.appendChild(li);
      revelar(li);
    });
  }

  function escapar(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* =========================================================
     VIDEOS — pantalla de cine con lista de reproducción
     Se reproducen solos (sin sonido) al llegar a la sección;
     al tocar "Escuchar" se activa el sonido y se pausa la música.
     ========================================================= */
  function iniciarVideos(lista) {
    var sec = $('#videos');
    if (!sec || !lista || !lista.length) { if (sec) sec.hidden = true; return; }
    var pantalla = $('.cine__pantalla', sec);
    var fondo = $('.cine__fondo', sec);
    var video = $('.cine__video', sec);
    var titulo = $('.cine__titulo', sec);
    var tira = $('.cine__tira', sec);
    var btnSonido = $('.cine__sonido', sec);
    var musica = $('#musica');
    var actual = 0, conSonido = false, musicaPausadaPorVideo = false, enVista = false;

    lista.forEach(function (v, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'cine__mini';
      b.setAttribute('aria-label', 'Ver video: ' + (v.titulo || (i + 1)));
      b.innerHTML = '<img src="' + encodeURI(v.poster) + '" alt="" loading="lazy"><span>' + escapar(v.titulo || '') + '</span>';
      b.addEventListener('click', function () { cargar(i, true); });
      tira.appendChild(b);
    });

    function pausarMusica() {
      if (musica && !musica.paused) { musica.pause(); musicaPausadaPorVideo = true; }
    }
    function reanudarMusica() {
      if (musica && musicaPausadaPorVideo) {
        musicaPausadaPorVideo = false;
        var p = musica.play(); if (p && p.catch) p.catch(function () {});
      }
    }
    function pintarSonido() {
      btnSonido.textContent = conSonido ? '🔊 Sonido activado' : '🔈 Toca para escuchar';
      btnSonido.classList.toggle('is-on', conSonido);
    }

    function cargar(i, reproducir) {
      actual = (i + lista.length) % lista.length;
      var v = lista[actual];
      pantalla.classList.add('cambiando');
      setTimeout(function () {
        video.src = encodeURI(v.src);
        video.poster = encodeURI(v.poster);
        fondo.style.backgroundImage = 'url("' + encodeURI(v.poster) + '")';
        video.muted = !conSonido;
        titulo.textContent = v.titulo || '';
        $all('.cine__mini', tira).forEach(function (m, k) { m.classList.toggle('is-activo', k === actual); });
        pantalla.classList.remove('cambiando');
        if (reproducir) { var p = video.play(); if (p && p.catch) p.catch(function () {}); }
      }, PREFIERE_MENOS_MOVIMIENTO ? 0 : 280);
    }

    btnSonido.addEventListener('click', function () {
      conSonido = !conSonido;
      video.muted = !conSonido;
      if (conSonido) { pausarMusica(); var p = video.play(); if (p && p.catch) p.catch(function () {}); }
      else reanudarMusica();
      pintarSonido();
    });
    video.addEventListener('ended', function () { cargar(actual + 1, true); });
    video.addEventListener('click', function () {
      if (video.paused) { var p = video.play(); if (p && p.catch) p.catch(function () {}); } else video.pause();
    });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          enVista = e.isIntersecting;
          if (enVista) { var p = video.play(); if (p && p.catch) p.catch(function () {}); }
          else {
            video.pause();
            if (conSonido) { conSonido = false; video.muted = true; pintarSonido(); }
            reanudarMusica();
          }
        });
      }, { threshold: 0.35 }).observe(pantalla);
    }
    pintarSonido();
    cargar(0, false);
  }

  /* =========================================================
     GALERÍA + LIGHTBOX
     ========================================================= */
  var galeriaItems = [];

  function iniciarGaleria(items) {
    var grid = $('#galeriaGrid');
    if (!grid) return;
    galeriaItems = (items || []).filter(function (it) { return it && it.src; });
    grid.innerHTML = '';
    if (!galeriaItems.length) {
      grid.innerHTML = '<p class="cargando">Todavía no hay fotos en <code>galeria.json</code>.</p>';
      grid.hidden = false;
      return;
    }

    construirGrid(grid);
    construirCarruseles();

    var verTodas = $('#verTodas');
    if (verTodas) {
      verTodas.hidden = false;
      verTodas.addEventListener('click', function () {
        var abierto = !grid.hidden;
        grid.hidden = abierto;
        verTodas.textContent = abierto ? 'Ver todas las fotos' : 'Ocultar la cuadrícula';
        if (!abierto) grid.scrollIntoView({ behavior: PREFIERE_MENOS_MOVIMIENTO ? 'auto' : 'smooth', block: 'start' });
      });
    }
  }

  function construirGrid(grid) {
    galeriaItems.forEach(function (it, idx) {
      var fig = document.createElement('figure');
      fig.className = 'galeria__item reveal' + (it.tipo === 'video' ? ' es-video' : '');
      fig.setAttribute('role', 'button');
      fig.setAttribute('tabindex', '0');
      fig.setAttribute('aria-label', it.texto || ((it.tipo === 'video' ? 'Ver video ' : 'Ver foto ') + (idx + 1)));

      if (it.tipo === 'video') {
        var v = document.createElement('video');
        v.muted = true; v.playsInline = true; v.loop = true; v.autoplay = true;
        v.preload = 'metadata'; v.setAttribute('muted', '');
        v.src = encodeURI(it.src);
        fig.appendChild(v);
      } else {
        var img = document.createElement('img');
        img.loading = 'lazy';
        img.decoding = 'async';
        img.alt = it.texto || ('Foto ' + (idx + 1));
        img.src = encodeURI(it.thumb || it.src);
        img.onerror = function () { fig.remove(); };
        fig.appendChild(img);
      }
      fig.addEventListener('click', function () { abrirLightbox(idx); });
      fig.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrirLightbox(idx); }
      });
      grid.appendChild(fig);
      setTimeout(function () { revelar(fig); }, Math.min(idx, 12) * 40);
    });
  }

  /* --- carruseles 3D: mitad giran en Y, mitad en X --- */
  function construirCarruseles() {
    // la "ruleta" usa las fotos marcadas con "ruleta": true en galeria.json
    var ruleta = [], resto = [];
    galeriaItems.forEach(function (it, i) { if (it.tipo !== 'video') (it.ruleta ? ruleta : resto).push(i); });
    if (!ruleta.length) ruleta = resto;

    $all('.carrusel3d').forEach(function (caja) {
      var eje = caja.getAttribute('data-eje') === 'x' ? 'x' : 'y';
      construirUnCarrusel(caja, eje, eje === 'x' ? resto : ruleta);
    });

    if (!construirCarruseles._armado) {
      construirCarruseles._armado = true;
      var reajuste;
      window.addEventListener('resize', function () {
        clearTimeout(reajuste);
        reajuste = setTimeout(construirCarruseles, 320);
      });
    }
  }

  function construirUnCarrusel(caja, eje, origIndices) {
    var giro = $('.carrusel3d__giro', caja);
    var anillo = $('.carrusel3d__anillo', caja);
    if (!giro || !anillo || !origIndices.length) { caja.hidden = true; return; }

    var tope = eje === 'x' ? 8 : 12;
    var N = Math.max(3, Math.min(origIndices.length, tope));
    var seleccion = [];
    for (var k = 0; k < N; k++) {
      seleccion.push(origIndices[Math.round(k * (origIndices.length / N)) % origIndices.length]);
    }

    var vw = Math.min(window.innerWidth, document.documentElement.clientWidth);
    var w = Math.max(124, Math.min(eje === 'x' ? 170 : 190, Math.round(vw * (eje === 'x' ? 0.38 : 0.42))));
    var h = Math.round(w * 1.38);
    var paso = 360 / N;
    var r = Math.round((w / 2) / Math.tan(Math.PI / N));
    r = Math.round(Math.max(r, w * 1.1) * (eje === 'x' ? 1.55 : 1.05));

    anillo.style.setProperty('--w', w + 'px');
    anillo.style.setProperty('--h', h + 'px');
    anillo.style.setProperty('--dur', Math.round(N * 3.2) + 's');
    caja.style.height = Math.round(eje === 'x' ? (r * 1.9 + h * 0.45) : (h + r * 0.4 + 24)) + 'px';
    anillo.innerHTML = '';

    seleccion.forEach(function (origIdx, i) {
      var it = galeriaItems[origIdx];
      var el = document.createElement('div');
      el.className = 'carrusel3d__item' + (it.tipo === 'video' ? ' es-video' : '');
      el.style.setProperty('--i', i);
      el.style.setProperty('--paso', paso + 'deg');
      el.style.setProperty('--r', r + 'px');
      el.setAttribute('role', 'button');
      el.setAttribute('tabindex', '0');
      el.setAttribute('aria-label', it.texto || ('Ver foto ' + (origIdx + 1)));

      var media;
      if (it.tipo === 'video') {
        media = document.createElement('video');
        media.muted = true; media.playsInline = true; media.loop = true; media.autoplay = true;
        media.preload = 'metadata'; media.setAttribute('muted', '');
        media.src = encodeURI(it.src);
      } else {
        media = document.createElement('img');
        media.loading = 'lazy';
        media.decoding = 'async';
        media.alt = '';
        media.src = encodeURI(it.thumb || it.src);
      }
      el.appendChild(media);
      el.addEventListener('click', function () { if (!movido) abrirLightbox(origIdx); });
      el.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrirLightbox(origIdx); }
      });
      anillo.appendChild(el);
    });

    /* arrastre: gira el envoltorio (la auto-rotación sigue en CSS) */
    var arrastra = false, movido = false, p0 = 0, ang0 = 0, ang = 0;
    var restaurar;

    var baseTilt = eje === 'x' ? 10 : 0;
    function pintarGiro() {
      giro.style.transform = (eje === 'x' ? 'rotateX(' + (baseTilt + ang) : 'rotateY(' + ang) + 'deg)';
    }
    caja.addEventListener('pointerdown', function (e) {
      arrastra = true; movido = false;
      p0 = eje === 'x' ? e.clientY : e.clientX;
      ang0 = ang;
      caja.classList.add('arrastrando', 'pausado');
      clearTimeout(restaurar);
      if (caja.setPointerCapture) { try { caja.setPointerCapture(e.pointerId); } catch (er) {} }
    });
    caja.addEventListener('pointermove', function (e) {
      if (!arrastra) return;
      var d = (eje === 'x' ? e.clientY : e.clientX) - p0;
      if (Math.abs(d) > 6) movido = true;
      ang = ang0 + d * (eje === 'x' ? -0.4 : 0.4);
      pintarGiro();
    });
    function soltar() {
      if (!arrastra) return;
      arrastra = false;
      caja.classList.remove('arrastrando');
      restaurar = setTimeout(function () { caja.classList.remove('pausado'); movido = false; }, 1400);
    }
    caja.addEventListener('pointerup', soltar);
    caja.addEventListener('pointercancel', soltar);

    if ('IntersectionObserver' in window) {
      if (caja._io) caja._io.disconnect();
      caja._io = new IntersectionObserver(function (ents) {
        ents.forEach(function (e) {
          anillo.style.animationPlayState = e.isIntersecting ? '' : 'paused';
        });
      }, { threshold: 0.02 });
      caja._io.observe(caja);
    }
  }

  /* ---------- Lightbox ---------- */
  var lb, lbMedia, lbCaption, lbIndice = 0, lbAbierto = false, ultimoFoco = null;

  function construirLightbox() {
    lb = $('#lightbox');
    if (!lb) return;
    lbMedia = $('#lightboxMedia');
    lbCaption = $('#lightboxCaption');

    $('.lightbox__btn--cerrar', lb).addEventListener('click', cerrarLightbox);
    $('.lightbox__btn--prev', lb).addEventListener('click', function () { mover(-1); });
    $('.lightbox__btn--next', lb).addEventListener('click', function () { mover(1); });
    lb.addEventListener('click', function (e) { if (e.target === lb) cerrarLightbox(); });

    document.addEventListener('keydown', function (e) {
      if (!lbAbierto) return;
      if (e.key === 'Escape') cerrarLightbox();
      else if (e.key === 'ArrowLeft') mover(-1);
      else if (e.key === 'ArrowRight') mover(1);
    });

    // swipe táctil
    var x0 = null;
    lb.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 50) mover(dx < 0 ? 1 : -1);
      x0 = null;
    }, { passive: true });
  }

  function pintarLightbox() {
    var it = galeriaItems[lbIndice];
    if (!it) return;
    var vPrev = lbMedia.querySelector('video'); if (vPrev) vPrev.pause();
    lbMedia.innerHTML = '';
    var el;
    if (it.tipo === 'video') {
      el = document.createElement('video');
      el.src = encodeURI(it.src);
      el.controls = true; el.autoplay = true; el.playsInline = true; el.loop = true;
      // mientras suena un video en el visor, pausar la música de fondo
      var mus = $('#musica'), pausada = false;
      el.addEventListener('play', function () { if (mus && !mus.paused && !el.muted) { mus.pause(); pausada = true; } });
      el.addEventListener('pause', function () { if (mus && pausada) { pausada = false; var p = mus.play(); if (p && p.catch) p.catch(function () {}); } });
    } else {
      el = document.createElement('img');
      el.src = encodeURI(it.src);
      el.alt = it.texto || 'Foto';
    }
    lbMedia.appendChild(el);
    lbCaption.textContent = it.texto || '';
    var soloUno = galeriaItems.length < 2;
    $('.lightbox__btn--prev', lb).hidden = soloUno;
    $('.lightbox__btn--next', lb).hidden = soloUno;
  }

  function abrirLightbox(indice) {
    if (!lb) return;
    lbIndice = indice;
    lbAbierto = true;
    ultimoFoco = document.activeElement;
    lb.hidden = false;
    lb.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    pintarLightbox();
    $('.lightbox__btn--cerrar', lb).focus();
  }

  function cerrarLightbox() {
    lbAbierto = false;
    lb.hidden = true;
    lb.setAttribute('aria-hidden', 'true');
    var vPrev = lbMedia.querySelector('video'); if (vPrev) vPrev.pause();
    lbMedia.innerHTML = '';
    document.body.style.overflow = '';
    if (ultimoFoco && ultimoFoco.focus) ultimoFoco.focus();
  }

  function mover(paso) {
    if (galeriaItems.length < 2) return;
    lbIndice = (lbIndice + paso + galeriaItems.length) % galeriaItems.length;
    pintarLightbox();
  }

  /* =========================================================
     NAVEGACIÓN — botones data-goto + scrollspy
     ========================================================= */
  function iniciarNavegacion() {
    $all('[data-goto]').forEach(function (btn) {
      btn.addEventListener('click', function () { scrollA(btn.getAttribute('data-goto')); });
    });

    var enlaces = $all('.nav a');
    var porId = {};
    enlaces.forEach(function (a) { porId[a.getAttribute('href').slice(1)] = a; });

    if ('IntersectionObserver' in window) {
      var spy = new IntersectionObserver(function (ents) {
        ents.forEach(function (e) {
          if (e.isIntersecting) {
            enlaces.forEach(function (a) { a.classList.remove('is-active'); });
            var activo = porId[e.target.id];
            if (activo) activo.classList.add('is-active');
          }
        });
      }, { threshold: 0.5 });
      $all('section[id]').forEach(function (s) { spy.observe(s); });
    }

    enlaces.forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        scrollA(a.getAttribute('href'));
      });
    });
  }

  /* =========================================================
     TÍTULOS — las letras aparecen una a una (desenfoque → nítido)
     ========================================================= */
  function partirLetras(el) {
    if (!el || el.dataset.partido) return;
    var texto = el.textContent;
    el.dataset.partido = '1';
    el.setAttribute('aria-label', texto);
    el.textContent = '';
    var n = 0;
    texto.split(' ').forEach(function (palabra, w) {
      if (w) el.appendChild(document.createTextNode(' '));
      var sp = document.createElement('span');
      sp.className = 'palabra';
      sp.setAttribute('aria-hidden', 'true');
      Array.prototype.forEach.call(palabra, function (ch) {
        var l = document.createElement('span');
        l.className = 'letra';
        l.style.setProperty('--i', n++);
        l.textContent = ch;
        sp.appendChild(l);
      });
      el.appendChild(sp);
    });
  }

  /* =========================================================
     ÁRBOL QUE CRECE — tronco y ramas en forma de corazón que se
     dibujan solos, flores que se abren y pétalos que caen.
     ========================================================= */
  function iniciarArbol() {
    var cont = $('#arbol');
    if (!cont) return;
    var ramas = $('.arbol__ramas', cont), flores = $('.arbol__flores', cont);
    var NS = 'http://www.w3.org/2000/svg';
    function nodo(tag, attrs) {
      var e = document.createElementNS(NS, tag);
      for (var k in attrs) e.setAttribute(k, attrs[k]);
      return e;
    }
    function trazo(d, ancho, inicio, dur, clase) {
      var p = nodo('path', { d: d, 'stroke-width': ancho, pathLength: 1, 'stroke-linejoin': 'round', class: 'arbol__trazo ' + (clase || '') });
      p.style.transitionDelay = inicio + 's';
      p.style.transitionDuration = dur + 's';
      ramas.appendChild(p);
    }
    var CX = 200, CIMA = 300;
    // punto de un corazón (punta abajo en la cima del tronco); t: 0 = arriba, PI = punta
    function corazon(t, s, lado) {
      var x = 16 * Math.pow(Math.sin(t), 3);
      var y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
      return [CX + lado * s * x, CIMA - 17 * s - s * y];
    }
    var colores = ['#ff4fa3', '#ff8fc8', '#ffd34d', '#b56bff', '#36d6c3', '#ffffff'];

    // tronco y raíces
    trazo('M200 468C188 436 214 408 202 378C192 352 210 326 200 300', 11, 0, 2.6);
    trazo('M200 466C176 466 150 470 116 460', 4, 0.3, 1.6);
    trazo('M200 466C226 466 252 470 286 460', 4, 0.3, 1.6);

    var PASOS = 46;
    [[9, 4.6, 32, 2.4], [6.6, 3.2, 18, 3.2], [4.2, 2.2, 9, 3.8]].forEach(function (nivel) {
      var s = nivel[0], ancho = nivel[1], nFlores = nivel[2], inicio = nivel[3];
      [1, -1].forEach(function (lado) {
        var d = '';
        for (var k = 0; k <= PASOS; k++) {
          var p = corazon(Math.PI * (1 - k / PASOS), s, lado);
          d += (k ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1);
        }
        trazo(d, ancho, inicio, 2.4);
        // ramitas que salen hacia afuera (solo el corazón grande)
        if (s === 9) {
          for (var r = 4; r < PASOS; r += 4) {
            var q = corazon(Math.PI * (1 - r / PASOS), s, lado);
            var dx = q[0] - CX, dy = q[1] - (CIMA - 150), len = Math.hypot(dx, dy) || 1;
            var ux = dx / len, uy = dy / len, largo = 10 + Math.random() * 10;
            trazo('M' + q[0].toFixed(1) + ' ' + q[1].toFixed(1) + 'Q' + (q[0] + ux * largo / 2 - uy * 4).toFixed(1) + ' ' +
              (q[1] + uy * largo / 2 + ux * 4).toFixed(1) + ' ' + (q[0] + ux * largo).toFixed(1) + ' ' + (q[1] + uy * largo).toFixed(1),
              1.6, inicio + 1.6 + r * 0.02, 0.9);
          }
        }
        // flores a lo largo de la rama
        for (var f = 1; f <= nFlores; f++) {
          var pr = f / nFlores;
          var pt = corazon(Math.PI * (1 - pr * 0.98), s, lado);
          var x = pt[0] + (Math.random() - 0.5) * 8, y = pt[1] + (Math.random() - 0.5) * 8;
          var rad = (s === 9 ? 7 : 5.5) + Math.random() * 3;
          var col = colores[Math.floor(Math.random() * colores.length)];
          var g = nodo('g', { class: 'arbol__flor' });
          for (var pe = 0; pe < 5; pe++) {
            var an = pe * 1.2566 + Math.random() * 0.4;
            g.appendChild(nodo('circle', { cx: (x + Math.cos(an) * rad * 0.8).toFixed(1), cy: (y + Math.sin(an) * rad * 0.8).toFixed(1),
              r: (rad * 0.62).toFixed(1), fill: col, 'fill-opacity': 0.92 }));
          }
          g.appendChild(nodo('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r: (rad * 0.38).toFixed(1), fill: col === '#ffd34d' ? '#ffffff' : '#ffd34d' }));
          g.style.transitionDelay = (inicio + 2 + pr * 2.2 + Math.random() * 0.3).toFixed(2) + 's';
          flores.appendChild(g);
        }
      });
    });

    function lluviaDePetalos() {
      if (PREFIERE_MENOS_MOVIMIENTO) return;
      var capa = $('.arbol__petalos', cont);
      for (var i = 0; i < 22; i++) {
        var p = document.createElement('i');
        p.className = 'arbol__petalo';
        p.style.left = (Math.random() * 92) + '%';
        p.style.background = colores[i % 5];
        p.style.animationDuration = (6 + Math.random() * 5).toFixed(1) + 's';
        p.style.animationDelay = (Math.random() * 6).toFixed(1) + 's';
        p.style.setProperty('--deriva', (60 + Math.random() * 120).toFixed(0) + 'px');
        capa.appendChild(p);
      }
    }

    function crecer() {
      if (cont.classList.contains('crecer')) return;
      cont.classList.add('crecer');
      setTimeout(lluviaDePetalos, PREFIERE_MENOS_MOVIMIENTO ? 0 : 6500);
    }
    if (PREFIERE_MENOS_MOVIMIENTO || !('IntersectionObserver' in window)) { crecer(); return; }
    new IntersectionObserver(function (es, obs) {
      es.forEach(function (e) { if (e.isIntersecting) { crecer(); obs.disconnect(); } });
    }, { threshold: 0.35 }).observe(cont);
  }

  /* =========================================================
     CORAZÓN DE CRISTAL — el mensaje final se escribe letra a letra
     ========================================================= */
  function iniciarCorazonCristal(texto) {
    var c = $('#corazonCristal');
    if (!c || !texto) return;
    var a = $('.tw-a', c), b = $('.tw-b', c);
    a.textContent = ''; b.textContent = texto;
    var empezado = false;
    function escribir() {
      if (empezado) return;
      empezado = true;
      c.classList.add('dibujar');
      if (PREFIERE_MENOS_MOVIMIENTO) { a.textContent = texto; b.textContent = ''; c.classList.add('listo'); return; }
      var i = 0;
      setTimeout(function sig() {
        a.textContent = texto.slice(0, i);
        b.textContent = texto.slice(i);
        if (i >= texto.length) { c.classList.add('listo'); return; }
        var ch = texto.charAt(i);
        i++;
        setTimeout(sig, /[.,;!?:]/.test(ch) ? 260 : 42);
      }, 1300);
    }
    if (!('IntersectionObserver' in window)) { escribir(); return; }
    new IntersectionObserver(function (es, obs) {
      es.forEach(function (e) { if (e.isIntersecting) { escribir(); obs.disconnect(); } });
    }, { threshold: 0.25 }).observe(c);
  }

  /* =========================================================
     ARRANQUE
     ========================================================= */
  function mostrarErrorGlobal(msg) {
    console.error(msg);
  }

  document.addEventListener('DOMContentLoaded', function () {
    iniciarNavegacion();
    iniciarPortada();
    iniciarArbol();
    construirLightbox();
    $all('.titulo-seccion').forEach(function (t) { t.classList.add('reveal'); revelar(t); });

    cargarJSON('data/config.json').then(function (cfg) {
      aplicarConfig(cfg);
      $all('.titulo-seccion').forEach(partirLetras);
      iniciarCorazonCristal(valorAnidado(cfg, 'cierre.mensaje'));
      iniciarAmbiente(cfg);
      iniciarMusica(cfg);
      iniciarBoveda(cfg);
    }).catch(function (e) {
      mostrarErrorGlobal(e);
      iniciarContador(null);
      $all('.titulo-seccion').forEach(partirLetras);
      iniciarAmbiente(null);
      iniciarBoveda(null);
    });

    // red de seguridad: si algo tarda demasiado, no dejar la bóveda trabada
    setTimeout(function () { if (!yaEntro && !$('#boveda')) dispararEntrada(); }, 8000);

    cargarJSON('data/carta.json').then(iniciarCarta).catch(mostrarErrorGlobal);
    cargarJSON('data/videos.json').then(iniciarVideos).catch(mostrarErrorGlobal);

    var btnFiesta = $('[data-confeti]');
    if (btnFiesta) btnFiesta.addEventListener('click', function () { lanzarConfeti(260); });

    cargarJSON('data/momentos.json').then(function (m) {
      iniciarHistoria(m);
    }).catch(function (e) {
      mostrarErrorGlobal(e);
      var tl = $('#timeline');
      if (tl) tl.innerHTML = '<li class="error-datos">No se pudo cargar momentos.json</li>';
    });

    cargarJSON('data/galeria.json').then(iniciarGaleria).catch(function (e) {
      mostrarErrorGlobal(e);
      var g = $('#galeriaGrid');
      if (g) g.innerHTML = '<p class="error-datos">No se pudo cargar galeria.json</p>';
    });
  });
})();
