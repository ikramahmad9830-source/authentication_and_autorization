/**
 * CYBERVAULT 3D CRYPTOGRAPHIC ENGINE
 * Three.js Interactive WebGL Hologram, Particle Field & Reactive Security Core
 */

class CyberScene {
    constructor() {
        this.container = document.getElementById('canvas-container');
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        
        // 3D Objects
        this.coreGroup = null;
        this.outerVault = null;
        this.innerCrystal = null;
        this.orbitRings = [];
        this.tokenNodes = [];
        this.particleSystem = null;
        this.lightRing = null;
        this.coreLight = null;

        // Visual State
        this.currentState = 'idle'; // 'idle', 'authenticating', 'success', 'admin', 'user', 'error'
        this.targetColors = {
            primary: new THREE.Color(0x00f0ff),   // Cyan
            secondary: new THREE.Color(0x7000ff), // Purple
            accent: new THREE.Color(0x00ff9d),    // Emerald
            glow: new THREE.Color(0x00f0ff)
        };
        this.currentColors = {
            primary: new THREE.Color(0x00f0ff),
            secondary: new THREE.Color(0x7000ff),
            accent: new THREE.Color(0x00ff9d),
            glow: new THREE.Color(0x00f0ff)
        };

        // Animation metrics
        this.clock = new THREE.Clock();
        this.mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
        this.burstParticles = [];

        this.init();
    }

    init() {
        // 1. Scene setup
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x05070e, 0.02);

        // 2. Camera setup
        const aspect = window.innerWidth / window.innerHeight;
        this.camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 1000);
        this.camera.position.set(0, 0, 32);

        // 3. WebGL Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
        this.container.appendChild(this.renderer.domElement);

        // 4. Orbit Controls (smooth interactive orbit)
        if (typeof THREE.OrbitControls !== 'undefined') {
            this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
            this.controls.enableDamping = true;
            this.controls.dampingFactor = 0.05;
            this.controls.enableZoom = true;
            this.controls.minDistance = 14;
            this.controls.maxDistance = 55;
            this.controls.autoRotate = true;
            this.controls.autoRotateSpeed = 0.6;
        }

        // 5. Lighting
        this.setupLighting();

        // 6. Build Core Hologram & Particle Universe
        this.buildCryptographicCore();
        this.buildParticleGrid();
        this.buildTokenOrbitNodes();

        // 7. Event Listeners
        window.addEventListener('resize', () => this.onWindowResize());
        window.addEventListener('mousemove', (e) => this.onMouseMove(e));

        // 8. Start Render Loop
        this.animate();
    }

    setupLighting() {
        const ambientLight = new THREE.AmbientLight(0x0a1026, 1.5);
        this.scene.add(ambientLight);

        // Central glowing point light
        this.coreLight = new THREE.PointLight(0x00f0ff, 3, 50);
        this.coreLight.position.set(0, 0, 0);
        this.scene.add(this.coreLight);

        // Secondary directional rim lights
        const rimLight1 = new THREE.DirectionalLight(0x7000ff, 1.5);
        rimLight1.position.set(20, 20, 20);
        this.scene.add(rimLight1);

        const rimLight2 = new THREE.DirectionalLight(0x00ff9d, 1.2);
        rimLight2.position.set(-20, -20, -20);
        this.scene.add(rimLight2);
    }

    buildCryptographicCore() {
        this.coreGroup = new THREE.Group();

        // --- Outer Geometric Vault (Icosahedron Wireframe & Points) ---
        const vaultGeo = new THREE.IcosahedronGeometry(7, 2);
        const vaultMat = new THREE.MeshStandardMaterial({
            color: 0x00f0ff,
            wireframe: true,
            transparent: true,
            opacity: 0.35,
            roughness: 0.2,
            metalness: 0.8
        });
        this.outerVault = new THREE.Mesh(vaultGeo, vaultMat);
        this.coreGroup.add(this.outerVault);

        // --- Outer Node Points (Vertices glow) ---
        const pointsMat = new THREE.PointsMaterial({
            color: 0x00f0ff,
            size: 0.25,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending
        });
        const vaultPoints = new THREE.Points(vaultGeo, pointsMat);
        this.coreGroup.add(vaultPoints);

        // --- Inner Octahedral Quantum Crystal ---
        const crystalGeo = new THREE.OctahedronGeometry(3.6, 0);
        const crystalMat = new THREE.MeshPhysicalMaterial({
            color: 0x7000ff,
            emissive: 0x00f0ff,
            emissiveIntensity: 0.4,
            roughness: 0.1,
            metalness: 0.9,
            transmission: 0.6,
            thickness: 1.5,
            wireframe: false,
            transparent: true,
            opacity: 0.85
        });
        this.innerCrystal = new THREE.Mesh(crystalGeo, crystalMat);
        this.coreGroup.add(this.innerCrystal);

        // Inner wireframe overlay
        const innerWireMat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            wireframe: true,
            transparent: true,
            opacity: 0.4
        });
        const innerWire = new THREE.Mesh(crystalGeo, innerWireMat);
        this.coreGroup.add(innerWire);

        // --- Rotating Token Trajectory Rings ---
        const ringGeos = [
            { radius: 9, tube: 0.04, axis: 'x', color: 0x00f0ff },
            { radius: 10.5, tube: 0.05, axis: 'y', color: 0x7000ff },
            { radius: 12, tube: 0.04, axis: 'z', color: 0x00ff9d }
        ];

        ringGeos.forEach((cfg) => {
            const ringGeo = new THREE.TorusGeometry(cfg.radius, cfg.tube, 16, 100);
            const ringMat = new THREE.MeshBasicMaterial({
                color: cfg.color,
                transparent: true,
                opacity: 0.5,
                blending: THREE.AdditiveBlending
            });
            const ringMesh = new THREE.Mesh(ringGeo, ringMat);
            if (cfg.axis === 'x') ringMesh.rotation.x = Math.PI / 2;
            if (cfg.axis === 'y') ringMesh.rotation.y = Math.PI / 3;
            if (cfg.axis === 'z') ringMesh.rotation.z = Math.PI / 4;

            this.coreGroup.add(ringMesh);
            this.orbitRings.push({ mesh: ringMesh, speed: (Math.random() * 0.01 + 0.005) * (Math.random() > 0.5 ? 1 : -1) });
        });

        this.scene.add(this.coreGroup);
    }

    buildParticleGrid() {
        const particleCount = 1800;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);

        const color1 = new THREE.Color(0x00f0ff);
        const color2 = new THREE.Color(0x7000ff);
        const color3 = new THREE.Color(0x00ff9d);

        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            // Distribute spherical universe
            const radius = 15 + Math.random() * 70;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos((Math.random() * 2) - 1);

            positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
            positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
            positions[i3 + 2] = radius * Math.cos(phi);

            // Interpolate colors
            const mixColor = Math.random() > 0.6 ? color1 : (Math.random() > 0.5 ? color2 : color3);
            colors[i3] = mixColor.r;
            colors[i3 + 1] = mixColor.g;
            colors[i3 + 2] = mixColor.b;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({
            size: 0.35,
            vertexColors: true,
            transparent: true,
            opacity: 0.65,
            blending: THREE.AdditiveBlending
        });

        this.particleSystem = new THREE.Points(geometry, material);
        this.scene.add(this.particleSystem);
    }

    buildTokenOrbitNodes() {
        const nodeCount = 8;
        for (let i = 0; i < nodeCount; i++) {
            const nodeGeo = new THREE.BoxGeometry(0.6, 0.6, 0.6);
            const nodeMat = new THREE.MeshStandardMaterial({
                color: 0x00f0ff,
                emissive: 0x00f0ff,
                emissiveIntensity: 0.6,
                roughness: 0.2,
                metalness: 0.8
            });
            const nodeMesh = new THREE.Mesh(nodeGeo, nodeMat);
            
            const orbitRadius = 8 + (i % 3) * 2;
            const angle = (i / nodeCount) * Math.PI * 2;
            const speed = 0.008 + (i % 3) * 0.004;

            this.scene.add(nodeMesh);
            this.tokenNodes.push({
                mesh: nodeMesh,
                radius: orbitRadius,
                angle: angle,
                speed: speed,
                yOffset: (Math.random() - 0.5) * 6,
                rotationSpeed: Math.random() * 0.05 + 0.02
            });
        }
    }

    /**
     * Trigger visual state updates based on authentication events
     */
    setState(state, customPayload = null) {
        this.currentState = state;
        const hudState = document.getElementById('hud-core-state');

        switch(state) {
            case 'idle':
                this.targetColors.primary.setHex(0x00f0ff);   // Cyan
                this.targetColors.secondary.setHex(0x7000ff); // Purple
                this.targetColors.accent.setHex(0x00ff9d);    // Emerald
                this.targetColors.glow.setHex(0x00f0ff);
                if (hudState) {
                    hudState.textContent = 'ONLINE_IDLE';
                    hudState.className = 'stat-value highlight-cyan';
                }
                break;

            case 'authenticating':
                this.targetColors.primary.setHex(0xffb700);   // Amber
                this.targetColors.secondary.setHex(0xff6000); // Orange
                this.targetColors.accent.setHex(0xffffff);
                this.targetColors.glow.setHex(0xffb700);
                if (hudState) {
                    hudState.textContent = 'SIGNING_PAYLOAD';
                    hudState.className = 'stat-value';
                    hudState.style.color = 'var(--amber-glow)';
                }
                break;

            case 'admin':
                this.targetColors.primary.setHex(0xa855f7);   // Radiant Purple
                this.targetColors.secondary.setHex(0xffb700); // Gold
                this.targetColors.accent.setHex(0x00f0ff);    // Cyan
                this.targetColors.glow.setHex(0xa855f7);
                this.triggerShockwave(0xa855f7);
                if (hudState) {
                    hudState.textContent = 'ROOT_CLEARANCE_ACTIVE';
                    hudState.className = 'stat-value highlight-purple';
                }
                break;

            case 'user':
                this.targetColors.primary.setHex(0x00ff9d);   // Emerald
                this.targetColors.secondary.setHex(0x00f0ff); // Cyan
                this.targetColors.accent.setHex(0x38bdf8);
                this.targetColors.glow.setHex(0x00ff9d);
                this.triggerShockwave(0x00ff9d);
                if (hudState) {
                    hudState.textContent = 'USER_BEARER_VALIDATED';
                    hudState.className = 'stat-value highlight-green';
                }
                break;

            case 'error':
                this.targetColors.primary.setHex(0xff2a5f);   // Crimson
                this.targetColors.secondary.setHex(0x880020);
                this.targetColors.accent.setHex(0xff8888);
                this.targetColors.glow.setHex(0xff2a5f);
                this.triggerShockwave(0xff2a5f);
                if (hudState) {
                    hudState.textContent = 'ZERO_TRUST_REJECTED';
                    hudState.className = 'stat-value';
                    hudState.style.color = 'var(--crimson-glow)';
                }
                break;
        }
    }

    /**
     * Trigger a 3D particle burst shockwave on auth event
     */
    triggerShockwave(colorHex) {
        const burstCount = 120;
        const burstGeo = new THREE.BufferGeometry();
        const positions = new Float32Array(burstCount * 3);
        const velocities = [];

        for (let i = 0; i < burstCount; i++) {
            positions[i * 3] = 0;
            positions[i * 3 + 1] = 0;
            positions[i * 3 + 2] = 0;

            const dir = new THREE.Vector3(
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2
            ).normalize();

            const speed = 0.3 + Math.random() * 0.5;
            velocities.push(dir.multiplyScalar(speed));
        }

        burstGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const burstMat = new THREE.PointsMaterial({
            color: colorHex,
            size: 0.6,
            transparent: true,
            opacity: 1,
            blending: THREE.AdditiveBlending
        });

        const burstMesh = new THREE.Points(burstGeo, burstMat);
        this.scene.add(burstMesh);
        this.burstParticles.push({ mesh: burstMesh, velocities: velocities, life: 1.0 });
    }

    cycleCameraAngle() {
        if (!this.camera) return;
        const currentZ = this.camera.position.z;
        if (currentZ > 40) {
            // Focus close
            this.camera.position.set(0, 5, 20);
        } else if (currentZ > 25) {
            // Isometric high angle
            this.camera.position.set(25, 20, 25);
        } else {
            // Overview wide angle
            this.camera.position.set(0, 0, 45);
        }
        this.camera.lookAt(0, 0, 0);
    }

    onMouseMove(e) {
        this.mouse.targetX = (e.clientX / window.innerWidth) * 2 - 1;
        this.mouse.targetY = -(e.clientY / window.innerHeight) * 2 + 1;
    }

    onWindowResize() {
        if (!this.camera || !this.renderer) return;
        const width = window.innerWidth;
        const height = window.innerHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        const delta = this.clock.getDelta();
        const elapsedTime = this.clock.getElapsedTime();

        // 1. Smoothly interpolate colors toward targetColors
        this.currentColors.primary.lerp(this.targetColors.primary, 0.05);
        this.currentColors.secondary.lerp(this.targetColors.secondary, 0.05);
        this.currentColors.glow.lerp(this.targetColors.glow, 0.05);

        if (this.outerVault && this.outerVault.material) {
            this.outerVault.material.color.copy(this.currentColors.primary);
        }
        if (this.innerCrystal && this.innerCrystal.material) {
            this.innerCrystal.material.emissive.copy(this.currentColors.glow);
            this.innerCrystal.material.color.copy(this.currentColors.secondary);
        }
        if (this.coreLight) {
            this.coreLight.color.copy(this.currentColors.glow);
        }

        // 2. Animate Core rotations
        if (this.coreGroup) {
            let speedMult = this.currentState === 'authenticating' ? 3.5 : 1.0;
            this.coreGroup.rotation.y += 0.005 * speedMult;
            this.coreGroup.rotation.x += 0.002 * speedMult;

            if (this.innerCrystal) {
                this.innerCrystal.rotation.y -= 0.015 * speedMult;
                this.innerCrystal.rotation.z += 0.008 * speedMult;
                // Pulsate scale slightly
                const scale = 1 + Math.sin(elapsedTime * 3) * 0.06;
                this.innerCrystal.scale.set(scale, scale, scale);
            }

            if (this.outerVault) {
                this.outerVault.rotation.z -= 0.003 * speedMult;
            }
        }

        // 3. Animate Orbit Rings
        this.orbitRings.forEach(ring => {
            ring.mesh.rotation.x += ring.speed * 1.5;
            ring.mesh.rotation.y += ring.speed;
        });

        // 4. Animate Orbiting Token Nodes
        this.tokenNodes.forEach(node => {
            node.angle += node.speed;
            node.mesh.position.x = Math.cos(node.angle) * node.radius;
            node.mesh.position.z = Math.sin(node.angle) * node.radius;
            node.mesh.position.y = Math.sin(elapsedTime * 2 + node.angle) * 2 + node.yOffset;

            node.mesh.rotation.x += node.rotationSpeed;
            node.mesh.rotation.y += node.rotationSpeed;
            node.mesh.material.color.copy(this.currentColors.primary);
            node.mesh.material.emissive.copy(this.currentColors.glow);
        });

        // 5. Animate Galactic Particle Universe
        if (this.particleSystem) {
            this.particleSystem.rotation.y = elapsedTime * 0.02;
            this.particleSystem.rotation.x = Math.sin(elapsedTime * 0.01) * 0.1;
        }

        // 6. Animate and prune shockwaves
        for (let i = this.burstParticles.length - 1; i >= 0; i--) {
            const burst = this.burstParticles[i];
            burst.life -= delta * 1.2;
            const positions = burst.mesh.geometry.attributes.position.array;

            for (let j = 0; j < burst.velocities.length; j++) {
                const j3 = j * 3;
                positions[j3] += burst.velocities[j].x;
                positions[j3 + 1] += burst.velocities[j].y;
                positions[j3 + 2] += burst.velocities[j].z;
            }
            burst.mesh.geometry.attributes.position.needsUpdate = true;
            burst.mesh.material.opacity = Math.max(0, burst.life);

            if (burst.life <= 0) {
                this.scene.remove(burst.mesh);
                burst.mesh.geometry.dispose();
                burst.mesh.material.dispose();
                this.burstParticles.splice(i, 1);
            }
        }

        // 7. Update Controls or Parallax
        if (this.controls) {
            this.controls.update();
        }

        // 8. Render Scene
        this.renderer.render(this.scene, this.camera);
    }
}

// Global 3D scene instance
window.cyberScene = null;
window.addEventListener('DOMContentLoaded', () => {
    window.cyberScene = new CyberScene();
});
