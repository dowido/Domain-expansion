import './style.css';

const characters = [
  { id: 'gojo', name: 'Gojo', domain: 'Unlimited Void', desc: "Transmits infinite information, paralyzing the target.", colors: [[162, 155, 254], [108, 92, 231], [255, 255, 255]], asset: '/assets/gojo.png' },
  { id: 'sukuna', name: 'Sukuna', domain: 'Malevolent Shrine', desc: "A divine shrine that slashes everything in range.", colors: [[255, 118, 117], [214, 48, 49], [45, 52, 54]], asset: '/assets/sukuna.png' },
  { id: 'megumi', name: 'Megumi', domain: 'Shadow Garden', desc: "Fills the area with shadows and summoned beasts.", colors: [[0, 206, 201], [110, 252, 246], [255, 255, 255]], asset: '/assets/megumi.png' },
  { id: 'mahito', name: 'Mahito', domain: 'Self-Perfection', desc: "Directly transfigures souls within its reach.", colors: [[223, 230, 233], [255, 204, 204], [255, 126, 185]], asset: '/assets/mahito.png' },
  { id: 'jogo', name: 'Jogo', domain: 'Iron Mountain', desc: "Incinerates targets inside an active volcanic space.", colors: [[250, 177, 160], [225, 112, 85], [214, 48, 49]], asset: '/assets/jogo.png' },
  { id: 'hakari', name: 'Hakari', domain: 'Death Gamble', desc: "A Pachinko game granting infinite energy.", colors: [[253, 203, 110], [232, 67, 147], [255, 159, 243]], asset: '/assets/hakari.png' }
];

const IDLE_PALETTE = [[255, 255, 255], [200, 200, 255], [162, 155, 254], [108, 92, 231]];

// ─── WEBGL SHADERS ────────────────────────────────────────────────────────────
const V_SHADER = `
  precision highp float;
  attribute vec2 a_pos;
  attribute vec2 a_target;
  attribute vec3 a_color;
  attribute float a_size;
  attribute float a_id;
  attribute float a_tag; // 0 = atmosphere, 1 = shape

  uniform vec2 u_res;
  uniform float u_time;
  uniform float u_transition;
  uniform int u_char_id;
  uniform vec2 u_center;

  varying vec3 v_color;
  varying float v_alpha;

  float hash(float n) { return fract(sin(n) * 43758.5453123); }
  float hash2(float n) { return fract(cos(n * 127.1) * 311.7); }

  void main() {
    // TWO-PHASE TRANSITION:
    // Phase 1 (u_transition 0→0.5): particles scatter completely outward
    // Phase 2 (u_transition 0.5→1): particles converge into new shape
    float phase1 = clamp(u_transition * 2.0, 0.0, 1.0);
    float phase2 = clamp((u_transition - 0.5) * 2.0, 0.0, 1.0);
    float ep1 = phase1 * phase1 * (3.0 - 2.0 * phase1); // smoothstep scatter
    float ep2 = phase2 * phase2 * (3.0 - 2.0 * phase2); // smoothstep reform

    // Each particle scatters in a unique direction across full screen
    vec2 scatter_dir = vec2(hash(a_id) - 0.5, hash2(a_id) - 0.5) * u_res * 1.4;
    vec2 dispersed = a_pos + scatter_dir * ep1;
    // Then converge from dispersed position to new target
    vec2 pos = mix(dispersed, a_target, ep2);

    if (a_tag > 0.5) {
      // === SHAPE PARTICLES: character-specific active animation ===
      if (u_char_id == 1) {
        // Gojo: particles orbit/rotate around center gently
        vec2 d = pos - u_center;
        float dist = length(d);
        float angle = atan(d.y, d.x) + sin(u_time * 0.001 + dist * 0.005) * 0.25;
        pos = u_center + vec2(cos(angle), sin(angle)) * dist;
      }
      else if (u_char_id == 2) {
        // Sukuna: aggressive slash ripples outward from center
        float dist = length(pos - u_center);
        float slash = sin(u_time * 0.006 + dist * 0.025 + a_id) * 5.0;
        pos.x += slash; pos.y += slash * 0.6;
      }
      else if (u_char_id == 3) {
        // Megumi: dark wave ripples through shape
        pos.x += sin(u_time * 0.003 + pos.y * 0.015 + a_id) * 6.0;
        pos.y += cos(u_time * 0.0025 + pos.x * 0.015) * 3.0;
      }
      else if (u_char_id == 4) {
        // Mahito: soul distortion
        pos.x += sin(u_time * 0.005 + a_id * 3.14) * 8.0;
        pos.y += cos(u_time * 0.004 + a_id * 2.71) * 8.0;
      }
      else if (u_char_id == 5) {
        // Jogo: heat shimmer upward
        pos.x += sin(u_time * 0.005 + pos.y * 0.012) * 6.0;
        pos.y -= abs(sin(u_time * 0.003 + a_id)) * 3.0;
      }
      else if (u_char_id == 6) {
        // Hakari: slot flicker
        float spin = sin(u_time * 0.04 + a_id * 6.28) * 10.0;
        pos.x += spin * (hash(a_id) - 0.5);
        pos.y += spin * (hash2(a_id) - 0.5);
      }
      v_color = a_color;
      // Fade in during phase 2 only
      v_alpha = ep2 * 0.7 + 0.3;
    } else {
      // === ATMOSPHERE: continuous white star drift ===
      pos.x += sin(u_time * 0.0005 + a_id * 2.14) * 50.0;
      pos.y += cos(u_time * 0.0006 + a_id * 1.73) * 50.0;
      v_color = mix(a_color, vec3(1.0, 1.0, 1.0), 0.75);
      v_alpha = 0.4 + 0.3 * sin(u_time * 0.003 + a_id * 6.28);
    }

    // Size pulses during scatter, settles during reform
    float scatter_peak = ep1 * (1.0 - ep2);
    gl_PointSize = a_size * (u_res.x / 1150.0 + 0.5) * (1.0 + scatter_peak * 1.2);

    vec2 clip = (pos / u_res) * 2.0 - 1.0;
    gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);

  }
`;

const F_SHADER = `
  precision highp float;
  varying vec3 v_color;
  varying float v_alpha;
  void main() {
    float d = distance(gl_PointCoord, vec2(0.5));
    if (d > 0.5) discard;
    float alpha = smoothstep(0.5, 0.1, d) * v_alpha;
    gl_FragColor = vec4(v_color, alpha * 3.0);
  }
`;


class ParticleSystem {
  constructor() {
    this.canvas = document.getElementById('particleCanvas');
    this.gl = this.canvas.getContext('webgl', { alpha: true });
    this.particleCount = 80000;
    this.dpr = window.devicePixelRatio || 1;

    this.positions = new Float32Array(this.particleCount * 2);
    this.targets   = new Float32Array(this.particleCount * 2);
    this.colors    = new Float32Array(this.particleCount * 3);
    this.sizes     = new Float32Array(this.particleCount);
    this.ids       = new Float32Array(this.particleCount);
    this.tags      = new Float32Array(this.particleCount); // 0=atmosphere, 1=shape

    this.coordinateCache = {};
    this.activeChar = null;
    this.transition = 0;
    this.startTime = Date.now();

    this.initWebGL();
    this.resize();
    this.initParticles();

    window.addEventListener('resize', () => {
      this.resize();
      if (this.activeChar) this.setShape(this.activeChar);
    });

    this.animate();
    console.log('ParticleSystem initialized. Count:', this.particleCount);
  }


  initWebGL() {
    const gl = this.gl;
    const vs = this.compileShader(gl, gl.VERTEX_SHADER, V_SHADER);
    const fs = this.compileShader(gl, gl.FRAGMENT_SHADER, F_SHADER);
    this.program = gl.createProgram();
    gl.attachShader(this.program, vs);
    gl.attachShader(this.program, fs);
    gl.linkProgram(this.program);
    gl.useProgram(this.program);

    this.locs = {
      pos:     gl.getAttribLocation(this.program, 'a_pos'),
      target:  gl.getAttribLocation(this.program, 'a_target'),
      color:   gl.getAttribLocation(this.program, 'a_color'),
      size:    gl.getAttribLocation(this.program, 'a_size'),
      id:      gl.getAttribLocation(this.program, 'a_id'),
      tag:     gl.getAttribLocation(this.program, 'a_tag'),
      res:     gl.getUniformLocation(this.program, 'u_res'),
      time:    gl.getUniformLocation(this.program, 'u_time'),
      trans:   gl.getUniformLocation(this.program, 'u_transition'),
      charId:  gl.getUniformLocation(this.program, 'u_char_id'),
      center:  gl.getUniformLocation(this.program, 'u_center'),
    };

    this.bufs = {
      pos:    gl.createBuffer(),
      target: gl.createBuffer(),
      color:  gl.createBuffer(),
      size:   gl.createBuffer(),
      id:     gl.createBuffer(),
      tag:    gl.createBuffer(),
    };

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
  }

  compileShader(gl, type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(s));
    }
    return s;
  }

  resize() {
    this.dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.canvas.width = w * this.dpr;
    this.canvas.height = h * this.dpr;
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    this.gl.useProgram(this.program);
    this.gl.uniform2f(this.locs.res, w, h);
  }

  initParticles() {
    const w = window.innerWidth, h = window.innerHeight;
    for (let i = 0; i < this.particleCount; i++) {
      const x = Math.random() * w, y = Math.random() * h;
      this.positions[i*2] = x; this.positions[i*2+1] = y;
      this.targets[i*2] = x; this.targets[i*2+1] = y;
      const c = IDLE_PALETTE[i % IDLE_PALETTE.length];
      this.colors[i*3] = c[0] / 255; this.colors[i*3+1] = c[1] / 255; this.colors[i*3+2] = c[2] / 255;
      this.sizes[i] = Math.random() * 1.5 + 0.5;
      this.ids[i] = Math.random() * 1000;
    }
    this.updateBuffer('pos', this.positions);
    this.updateBuffer('target', this.targets);
    this.updateBuffer('color', this.colors);
    this.updateBuffer('size', this.sizes);
    this.updateBuffer('id', this.ids);
    this.updateBuffer('tag', this.tags);
    console.log('Static buffers uploaded.');
  }


  updateBuffer(name, data) {
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.bufs[name]);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  }

  async setShape(char) {
    console.log('Setting shape for:', char.id);
    
    // CONTINUOUS TRANSITION:
    // Calculate current rendered positions and set them as the new start (pos)
    // This allows particles to flow smoothly from one shape to the next.
    const t = Math.pow(this.transition, 0.6); 
    for (let i = 0; i < this.particleCount; i++) {
      this.positions[i*2]   = this.positions[i*2] * (1-t) + this.targets[i*2] * t;
      this.positions[i*2+1] = this.positions[i*2+1] * (1-t) + this.targets[i*2+1] * t;
    }
    this.updateBuffer('pos', this.positions);
    this.transition = 0; // Reset for new target

    this.activeChar = char;
    if (!this.coordinateCache[char.id]) {
      console.time('scan-' + char.id);
      const img = new Image();
      img.src = char.asset;
      try {
        await new Promise((resolve, reject) => { 
          img.onload = resolve; 
          img.onerror = () => reject(new Error('Failed: ' + char.asset));
        });
      } catch (err) { console.error(err); return; }

      const ow = 256; 
      const oh = Math.round(ow * (img.height / img.width));
      const oc = document.createElement('canvas'); oc.width = ow; oc.height = oh;
      const ctx = oc.getContext('2d'); ctx.drawImage(img, 0, 0, ow, oh);
      const data = ctx.getImageData(0, 0, ow, oh).data;
      const pts = [];
      let mnx = 1, mxx = 0, mny = 1, mxy = 0;
      for (let y = 0; y < oh; y++) {
        for (let x = 0; x < ow; x++) {
          const idx = (y * ow + x) * 4;
          const r = data[idx], g = data[idx+1], b = data[idx+2];
          if (r + g + b > 40) { 
            const nx = x / ow, ny = y / oh;
            pts.push({nx, ny});
            mnx = Math.min(mnx, nx); mxx = Math.max(mxx, nx);
            mny = Math.min(mny, ny); mxy = Math.max(mxy, ny);
          }
        }
      }
      console.timeEnd('scan-' + char.id);
      console.log('Points found:', pts.length);
      const rw = mxx - mnx || 1, rh = mxy - mny || 1;
      this.coordinateCache[char.id] = { 
        points: pts.map(p => ({x:(p.nx-mnx)/rw, y: (p.ny-mny)/rh})), 
        ar: rw / rh 
      };
    }

    const { points, ar } = this.coordinateCache[char.id];
    const vw = window.innerWidth, vh = window.innerHeight;
    const barH = 120, padding = 40;
    const safeW = vw - padding * 2, safeH = vh - barH - padding * 2;
    
    let sw, sh;
    if (ar > (safeW / safeH)) { sw = safeW; sh = sw / ar; } 
    else { sh = safeH; sw = sh * ar; }
    
    const cx = vw / 2, cy = (vh - barH) / 2 + 20;
    const offX = cx - sw / 2, offY = cy - sh / 2;
    this.currentCenter = [cx, cy];

    // SPLIT: Shape (75%) and Atmosphere (25%)
    const shapeThresh = Math.floor(this.particleCount * 0.75);

    for (let i = 0; i < this.particleCount; i++) {
      if (i < shapeThresh) {
        // Shape particle
        const p = points[i % points.length];
        this.targets[i*2] = p.x * sw + offX; 
        this.targets[i*2+1] = p.y * sh + offY;
        this.tags[i] = 1.0; // shape
        const c = char.colors[i % char.colors.length];
        this.colors[i*3] = c[0] / 255; 
        this.colors[i*3+1] = c[1] / 255; 
        this.colors[i*3+2] = c[2] / 255;
      } else {
        // Atmosphere particle — white, scattered
        this.targets[i*2] = Math.random() * vw;
        this.targets[i*2+1] = Math.random() * vh;
        this.tags[i] = 0.0; // atmosphere
        this.colors[i*3] = 1.0;   // white
        this.colors[i*3+1] = 1.0;
        this.colors[i*3+2] = 1.0;
      }
    }
    this.updateBuffer('target', this.targets);
    this.updateBuffer('color', this.colors);
    this.updateBuffer('tag', this.tags);
    this.charIdNum = characters.findIndex(c => c.id === char.id) + 1;
    console.log('Buffers updated for:', char.id);
  }

  setIdle() {
    // Capture current rendered positions so particles flow from wherever they are
    const t = this.transition * this.transition * (3.0 - 2.0 * this.transition);
    for (let i = 0; i < this.particleCount; i++) {
      this.positions[i*2]   = this.positions[i*2]   * (1 - t) + this.targets[i*2]   * t;
      this.positions[i*2+1] = this.positions[i*2+1] * (1 - t) + this.targets[i*2+1] * t;
    }
    this.updateBuffer('pos', this.positions);
    this.transition = 0;

    this.activeChar = null;
    this.charIdNum = 0;

    // All particles become atmosphere (tag 0) and drift white
    const w = window.innerWidth, h = window.innerHeight;
    for (let i = 0; i < this.particleCount; i++) {
      this.targets[i*2]   = Math.random() * w;
      this.targets[i*2+1] = Math.random() * h;
      this.tags[i] = 0.0;
      this.colors[i*3] = 1.0; this.colors[i*3+1] = 1.0; this.colors[i*3+2] = 1.0;
    }
    this.updateBuffer('target', this.targets);
    this.updateBuffer('tag', this.tags);
    this.updateBuffer('color', this.colors);
  }

  animate() {
    const gl = this.gl;
    const time = Date.now() - this.startTime;
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    // Slow, cinematic feel
    this.transition += (1.0 - this.transition) * 0.018;
    if (this.transition > 0.9995) this.transition = 1.0;
    gl.useProgram(this.program);
    gl.uniform1f(this.locs.time, time);
    gl.uniform1f(this.locs.trans, this.transition);
    gl.uniform1i(this.locs.charId, this.charIdNum || 0);
    if (this.currentCenter) gl.uniform2f(this.locs.center, this.currentCenter[0], this.currentCenter[1]);
    const bind = (name, loc, size) => {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.bufs[name]);
      gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
    };
    bind('pos', this.locs.pos, 2); bind('target', this.locs.target, 2);
    bind('color', this.locs.color, 3); bind('size', this.locs.size, 1); 
    bind('id', this.locs.id, 1); bind('tag', this.locs.tag, 1);

    gl.drawArrays(gl.POINTS, 0, this.particleCount);
    requestAnimationFrame(() => this.animate());
  }
}

const init = () => {
  const grid = document.getElementById('characterGrid');
  const info = document.getElementById('domainInfo');
  if (!grid) { setTimeout(init, 100); return; }
  const ps = new ParticleSystem();
  characters.forEach(char => {
    const card = document.createElement('div');
    card.className = 'character-card';
    card.innerHTML = `<h3>${char.name}</h3><p>${char.domain}</p>`;
    card.onclick = e => {
      e.stopPropagation();
      const isActive = card.classList.contains('active');
      document.querySelectorAll('.character-card').forEach(c => c.classList.remove('active'));
      if (isActive) {
        document.body.setAttribute('data-theme', 'none');
        info.classList.remove('visible'); ps.setIdle();
      } else {
        card.classList.add('active'); document.body.setAttribute('data-theme', char.id);
        document.body.classList.remove('shake'); void document.body.offsetWidth; document.body.classList.add('shake');
        info.classList.add('visible');
        document.getElementById('infoName').textContent = char.domain;
        document.getElementById('infoDesc').textContent = char.desc;
        ps.setShape(char);
      }
    };
    grid.appendChild(card);
  });
  document.body.onclick = () => {
    document.querySelectorAll('.character-card').forEach(c => c.classList.remove('active'));
    document.body.setAttribute('data-theme', 'none');
    info.classList.remove('visible'); ps.setIdle();
  };
};

init();
