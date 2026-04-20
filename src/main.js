import './style.css';

const characters = [
    { id: 'gojo', name: 'Gojo', domain: 'Unlimited Void', desc: "Transmits infinite information, paralyzing the target.", colors: [[255, 255, 255], [162, 155, 254], [108, 92, 231]], asset: '/assets/black_hole.png' },
    { id: 'sukuna', name: 'Sukuna', domain: 'Malevolent Shrine', desc: "A divine shrine that slashes everything in range.", colors: [[255, 30, 30], [150, 0, 0], [45, 52, 54]], asset: '/assets/sukuna.png' },
    { id: 'megumi', name: 'Megumi', domain: 'Shadow Garden', desc: "Fills the area with shadows and summoned beasts.", colors: [[0, 255, 255], [0, 168, 255], [255, 255, 255]], asset: '/assets/megumi.png' },
    { id: 'mahito', name: 'Mahito', domain: 'Self-Perfection', desc: "Directly transfigures souls within its reach.", colors: [[255, 126, 185], [255, 180, 200], [223, 230, 233]], asset: '/assets/mahito.png' },
    { id: 'jogo', name: 'Jogo', domain: 'Iron Mountain', desc: "Incinerates targets inside an active volcanic space.", colors: [[255, 69, 0], [255, 140, 0], [255, 215, 0]], asset: '/assets/jogo.png' },
    { id: 'hakari', name: 'Hakari', domain: 'Death Gamble', desc: "A Pachinko game granting infinite energy.", colors: [[255, 0, 150], [0, 168, 255], [255, 215, 0]], asset: '/assets/hakari.png' }
];

const IDLE_PALETTE = [[255, 255, 255], [200, 200, 255], [162, 155, 254], [108, 92, 231]];

const V_SHADER = `
precision highp float;
attribute vec3 a_pos;
attribute vec3 a_target;
attribute vec3 a_color;
attribute float a_size;
attribute float a_id;
attribute float a_tag;

uniform vec2 u_res;
uniform float u_time;
uniform float u_transition;
uniform int u_char_id;
uniform vec2 u_center;
uniform vec2 u_mouse;
uniform vec2 u_rotation;

varying vec3 v_color;
varying float v_alpha;

float hash(float n) { return fract(sin(n) * 43758.5453123); }
float hash2(float n) { return fract(cos(n * 127.1) * 311.7); }

void main() {
    float phase1 = clamp(u_transition * 2.0, 0.0, 1.0);
    float phase2 = clamp((u_transition - 0.5) * 2.0, 0.0, 1.0);
    float ep1 = phase1 * phase1 * (3.0 - 2.0 * phase1);
    float ep2 = phase2 * phase2 * (3.0 - 2.0 * phase2);

    vec3 scatter_dir = vec3(hash(a_id) - 0.5, hash2(a_id) - 0.5, hash(a_id + 50.0) - 0.5) * u_res.x * 1.5;
    vec3 dispersed = a_pos + scatter_dir * ep1;

    vec3 pos = mix(dispersed, a_target, ep2);

    // Orbit Controls Rotation
    float rotX = u_rotation.x;
    float rotY = u_rotation.y;
    
    float cx = cos(rotX), sx = sin(rotX);
    float cy = cos(rotY), sy = sin(rotY);
    
    mat3 rx = mat3(1.0, 0.0, 0.0, 0.0, cx, -sx, 0.0, sx, cx);
    mat3 ry = mat3(cy, 0.0, sy, 0.0, 1.0, 0.0, -sy, 0.0, cy);
    
    pos = ry * rx * pos;

    if (a_tag > 0.5) {
        if (u_char_id == 1) { 
            float gojo_expand = sin(ep1 * 3.14) * 150.0;
            pos += normalize(pos + vec3(0.001)) * gojo_expand;
            pos.x += sin(u_time * 0.001 + pos.y * 0.01) * 5.0;
        }
        else if (u_char_id == 2) { 
            float slash = sin(u_time * 0.006 + length(pos)*0.01 + a_id) * 5.0;
            pos.x += slash; pos.y -= slash * 0.5;
        }
        else if (u_char_id == 3) { 
            pos.x += sin(u_time * 0.003 + pos.y * 0.01) * 6.0;
            pos.z += cos(u_time * 0.0025 + pos.x * 0.01) * 6.0;
        }
        else if (u_char_id == 4) { 
            pos.x += sin(u_time * 0.005 + a_id * 3.14) * 8.0;
            pos.y += cos(u_time * 0.004 + a_id * 2.71) * 8.0;
        }
        else if (u_char_id == 5) { 
            pos.x += sin(u_time * 0.005 + pos.y * 0.01) * 5.0;
            pos.y -= abs(sin(u_time * 0.003 + a_id)) * 4.0;
        }
        else if (u_char_id == 6) { 
            float spin = sin(u_time * 0.04 + a_id * 6.28) * 10.0;
            pos.x += spin * (hash(a_id) - 0.5);
            pos.z += spin * (hash2(a_id) - 0.5);
        }
        v_color = a_color;
        v_alpha = ep2 * 0.6 + 0.2;
    } else {
        pos.x += sin(u_time * 0.0005 + a_id * 2.14) * 40.0;
        pos.y += cos(u_time * 0.0006 + a_id * 1.73) * 40.0;
        pos.z += sin(u_time * 0.0004 + a_id * 3.33) * 40.0;

        v_color = mix(a_color, vec3(1.0, 1.0, 1.0), 0.75);
        v_alpha = 0.3 + 0.3 * sin(u_time * 0.003 + a_id * 6.28);
    }

    vec2 screen_proj_raw = pos.xy + u_center;
    float m_dist = distance(screen_proj_raw, u_mouse);
    if (m_dist < 150.0) {
        float repel = a_tag > 0.5 ? 0.2 : 0.6;
        pos.xy += normalize(screen_proj_raw - u_mouse) * (150.0 - m_dist) * repel;
    }

    float perspective = 1000.0 / (1000.0 - pos.z);
    vec2 screen_pos = pos.xy * perspective + u_center;

    float scatter_peak = ep1 * (1.0 - ep2);
    gl_PointSize = a_size * perspective * (u_res.x / 1150.0 + 0.5) * (1.0 + scatter_peak * 1.0);

    vec2 clip = (screen_pos / u_res) * 2.0 - 1.0;
    float depth = pos.z / 2000.0;
    gl_Position = vec4(clip.x, -clip.y, depth, 1.0);
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
    gl_FragColor = vec4(v_color, alpha * 1.5);
}
`;

class ParticleSystem {
    constructor() {
        this.canvas = document.getElementById('particleCanvas');
        this.gl = this.canvas.getContext('webgl', { alpha: true, depth: false });

        this.particleCount = 300000;
        this.dpr = window.devicePixelRatio || 1;

        this.positions = new Float32Array(this.particleCount * 3);
        this.targets = new Float32Array(this.particleCount * 3);
        this.colors = new Float32Array(this.particleCount * 3);
        this.sizes = new Float32Array(this.particleCount);
        this.ids = new Float32Array(this.particleCount);
        this.tags = new Float32Array(this.particleCount);

        this.coordinateCache = {};
        this.activeChar = null;
        this.transition = 0;
        this.startTime = Date.now();
        this.mouse = [window.innerWidth / 2, window.innerHeight / 2];

        // Orbit Controls State
        this.rotX = 0;
        this.rotY = 0;
        this.targetRotX = 0;
        this.targetRotY = 0;
        this.isDragging = false;
        this.lastMousePos = [0, 0];

        this.initWebGL();
        this.resize();
        this.initParticles();
        this.setupEvents();

        this.animate();
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
            pos: gl.getAttribLocation(this.program, 'a_pos'),
            target: gl.getAttribLocation(this.program, 'a_target'),
            color: gl.getAttribLocation(this.program, 'a_color'),
            size: gl.getAttribLocation(this.program, 'a_size'),
            id: gl.getAttribLocation(this.program, 'a_id'),
            tag: gl.getAttribLocation(this.program, 'a_tag'),
            res: gl.getUniformLocation(this.program, 'u_res'),
            time: gl.getUniformLocation(this.program, 'u_time'),
            trans: gl.getUniformLocation(this.program, 'u_transition'),
            charId: gl.getUniformLocation(this.program, 'u_char_id'),
            center: gl.getUniformLocation(this.program, 'u_center'),
            mouse: gl.getUniformLocation(this.program, 'u_mouse'),
            rotation: gl.getUniformLocation(this.program, 'u_rotation'),
        };

        this.bufs = {
            pos: gl.createBuffer(),
            target: gl.createBuffer(),
            color: gl.createBuffer(),
            size: gl.createBuffer(),
            id: gl.createBuffer(),
            tag: gl.createBuffer(),
        };

        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE); 
    }

    compileShader(gl, type, src) {
        const s = gl.createShader(type);
        gl.shaderSource(s, src);
        gl.compileShader(s);
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

    setupEvents() {
        window.addEventListener('resize', () => {
            this.resize();
            if (this.activeChar) this.setShape(this.activeChar);
        });

        window.addEventListener('mousemove', (e) => {
            this.mouse[0] = e.clientX;
            this.mouse[1] = e.clientY;

            if (this.isDragging) {
                const dx = e.clientX - this.lastMousePos[0];
                const dy = e.clientY - this.lastMousePos[1];
                this.targetRotY += dx * 0.01;
                this.targetRotX += dy * 0.01;
                this.lastMousePos = [e.clientX, e.clientY];
            }
        });

        window.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            this.lastMousePos = [e.clientX, e.clientY];
            document.body.classList.add('grabbing');
        });

        window.addEventListener('mouseup', () => {
            this.isDragging = false;
            document.body.classList.remove('grabbing');
        });

        // Touch support
        window.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                this.isDragging = true;
                this.lastMousePos = [e.touches[0].clientX, e.touches[0].clientY];
            }
        });

        window.addEventListener('touchmove', (e) => {
            if (this.isDragging && e.touches.length === 1) {
                const dx = e.touches[0].clientX - this.lastMousePos[0];
                const dy = e.touches[0].clientY - this.lastMousePos[1];
                this.targetRotY += dx * 0.01;
                this.targetRotX += dy * 0.01;
                this.lastMousePos = [e.touches[0].clientX, e.touches[0].clientY];
            }
        });

        window.addEventListener('touchend', () => {
            this.isDragging = false;
        });
    }

    initParticles() {
        const w = window.innerWidth, h = window.innerHeight;
        for (let i = 0; i < this.particleCount; i++) {
            const x = (Math.random() - 0.5) * w;
            const y = (Math.random() - 0.5) * h;
            const z = (Math.random() - 0.5) * 800;
            this.positions[i * 3] = x; this.positions[i * 3 + 1] = y; this.positions[i * 3 + 2] = z;
            this.targets[i * 3] = x; this.targets[i * 3 + 1] = y; this.targets[i * 3 + 2] = z;
            
            const c = IDLE_PALETTE[i % IDLE_PALETTE.length];
            this.colors[i * 3] = c[0] / 255; this.colors[i * 3 + 1] = c[1] / 255; this.colors[i * 3 + 2] = c[2] / 255;
            this.sizes[i] = Math.random() * 1.5 + 0.5;
            this.ids[i] = Math.random() * 1000;
        }
        this.updateBuffer('pos', this.positions);
        this.updateBuffer('target', this.targets);
        this.updateBuffer('color', this.colors);
        this.updateBuffer('size', this.sizes);
        this.updateBuffer('id', this.ids);
        this.updateBuffer('tag', this.tags);
    }

    updateBuffer(name, data) {
        const gl = this.gl;
        gl.bindBuffer(gl.ARRAY_BUFFER, this.bufs[name]);
        gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    }

    async setShape(char) {
        const t = Math.pow(this.transition, 0.6);
        for (let i = 0; i < this.particleCount; i++) {
            this.positions[i * 3] = this.positions[i * 3] * (1 - t) + this.targets[i * 3] * t;
            this.positions[i * 3 + 1] = this.positions[i * 3 + 1] * (1 - t) + this.targets[i * 3 + 1] * t;
            this.positions[i * 3 + 2] = this.positions[i * 3 + 2] * (1 - t) + this.targets[i * 3 + 2] * t;
        }
        this.updateBuffer('pos', this.positions);
        this.transition = 0; 
        this.activeChar = char;

        if (!this.coordinateCache[char.id]) {
            const img = new Image();
            img.src = char.asset;
            try {
                await new Promise((resolve, reject) => {
                    img.onload = resolve;
                    img.onerror = () => reject(new Error('Failed: ' + char.asset));
                });
            } catch (err) { console.error("Asset Load Failure", err); return; }

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
                    const r = data[idx], g = data[idx + 1], b = data[idx + 2];
                    const nx = x / ow, ny = y / oh;
                    const distFromCenter = Math.sqrt(Math.pow(nx - 0.5, 2) + Math.pow(ny - 0.5, 2));

                    if (r + g + b > 40 && distFromCenter < 0.48) {
                        pts.push({ nx, ny });
                        mnx = Math.min(mnx, nx); mxx = Math.max(mxx, nx);
                        mny = Math.min(mny, ny); mxy = Math.max(mxy, ny);
                    }
                }
            }
            const rw = mxx - mnx || 1, rh = mxy - mny || 1;
            this.coordinateCache[char.id] = {
                points: pts.map(p => ({ 
                    x: (p.nx - mnx) / rw - 0.5, 
                    y: (p.ny - mny) / rh - 0.5,
                })),
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

        this.currentCenter = [vw / 2, (vh - barH) / 2 + 20];

        const shapeThresh = Math.floor(this.particleCount * 0.85);
        const volumeDepth = 60.0;

        for (let i = 0; i < this.particleCount; i++) {
            if (i < shapeThresh) {
                const p = points[i % points.length];
                this.targets[i * 3] = p.x * sw + (Math.random() - 0.5) * 4.0;
                this.targets[i * 3 + 1] = p.y * sh + (Math.random() - 0.5) * 4.0;
                
                // Double-Sided Volumetric Logic
                const group = i % 3;
                if (group === 0) { // Front Face
                    this.targets[i * 3 + 2] = volumeDepth * 0.5;
                } else if (group === 1) { // Back Face (Recognizable from back)
                    this.targets[i * 3 + 2] = -volumeDepth * 0.5;
                    this.targets[i * 3] *= -1; // Mirror X for back visibility
                } else { // Fill
                    this.targets[i * 3 + 2] = (Math.random() - 0.5) * volumeDepth;
                }

                this.tags[i] = 1.0;
                const c = char.colors[i % char.colors.length];
                this.colors[i * 3] = c[0] / 255;
                this.colors[i * 3 + 1] = c[1] / 255;
                this.colors[i * 3 + 2] = c[2] / 255;
            } else {
                this.targets[i * 3] = (Math.random() - 0.5) * vw * 2.0;
                this.targets[i * 3 + 1] = (Math.random() - 0.5) * vh * 2.0;
                this.targets[i * 3 + 2] = (Math.random() - 0.5) * 1200;
                this.tags[i] = 0.0; 
                this.colors[i * 3] = 1.0; this.colors[i * 3 + 1] = 1.0; this.colors[i * 3 + 2] = 1.0;
            }
        }
        this.updateBuffer('target', this.targets);
        this.updateBuffer('color', this.colors);
        this.updateBuffer('tag', this.tags);
        this.charIdNum = characters.findIndex(c => c.id === char.id) + 1;
    }

    setIdle() {
        const t = this.transition;
        for (let i = 0; i < this.particleCount; i++) {
            this.positions[i * 3] = this.positions[i * 3] * (1 - t) + this.targets[i * 3] * t;
            this.positions[i * 3 + 1] = this.positions[i * 3 + 1] * (1 - t) + this.targets[i * 3 + 1] * t;
            this.positions[i * 3 + 2] = this.positions[i * 3 + 2] * (1 - t) + this.targets[i * 3 + 2] * t;
        }
        this.updateBuffer('pos', this.positions);
        this.transition = 0;
        this.activeChar = null;
        this.charIdNum = 0;

        const w = window.innerWidth, h = window.innerHeight;
        for (let i = 0; i < this.particleCount; i++) {
            this.targets[i * 3] = (Math.random() - 0.5) * w * 1.5;
            this.targets[i * 3 + 1] = (Math.random() - 0.5) * h * 1.5;
            this.targets[i * 3 + 2] = (Math.random() - 0.5) * 800;
            this.tags[i] = 0.0;
            this.colors[i * 3] = 1.0; this.colors[i * 3 + 1] = 1.0; this.colors[i * 3 + 2] = 1.0;
        }
        this.updateBuffer('target', this.targets);
        this.updateBuffer('tag', this.tags);
        this.updateBuffer('color', this.colors);
    }

    animate() {
        const gl = this.gl;
        const time = Date.now() - this.startTime;
        gl.clear(gl.COLOR_BUFFER_BIT);
        
        this.transition += (1.0 - this.transition) * 0.024;
        
        // Orbit Controls Smoothing (Inertia)
        this.rotX += (this.targetRotX - this.rotX) * 0.1;
        this.rotY += (this.targetRotY - this.rotY) * 0.1;

        // Auto Rotation when idle or slowly
        if (!this.isDragging) {
            this.targetRotY += 0.003;
        }
        
        gl.useProgram(this.program);
        gl.uniform1f(this.locs.time, time);
        gl.uniform1f(this.locs.trans, this.transition);
        gl.uniform1i(this.locs.charId, this.charIdNum || 0);
        gl.uniform2f(this.locs.mouse, this.mouse[0], this.mouse[1]);
        gl.uniform2f(this.locs.rotation, this.rotX, this.rotY);
        if (this.currentCenter) gl.uniform2f(this.locs.center, this.currentCenter[0], this.currentCenter[1]);
        
        const bind = (name, loc, size) => {
            gl.bindBuffer(gl.ARRAY_BUFFER, this.bufs[name]);
            gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
        };
        
        bind('pos', this.locs.pos, 3); bind('target', this.locs.target, 3);
        bind('color', this.locs.color, 3); bind('size', this.locs.size, 1);
        bind('id', this.locs.id, 1); bind('tag', this.locs.tag, 1);

        gl.drawArrays(gl.POINTS, 0, this.particleCount);
        requestAnimationFrame(() => this.animate());
    }
}

const init = () => {
    const grid = document.getElementById('characterGrid');
    const info = document.getElementById('domainInfo');
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
                card.classList.add('active'); 
                document.body.setAttribute('data-theme', char.id);
                document.body.classList.remove('shake'); 
                void document.body.offsetWidth; 
                document.body.classList.add('shake');
                
                info.classList.add('visible');
                document.getElementById('infoName').textContent = char.domain;
                document.getElementById('infoDesc').textContent = char.desc;
                ps.setShape(char);
            }
        };
        grid.appendChild(card);
    });

    document.getElementById('ui-layer').onclick = (e) => {
        if (e.target.id === 'ui-layer' || e.target.id === 'domainInfo') {
            document.querySelectorAll('.character-card').forEach(c => c.classList.remove('active'));
            document.body.setAttribute('data-theme', 'none');
            info.classList.remove('visible'); 
            ps.setIdle();
        }
    };
};

window.onload = init;
