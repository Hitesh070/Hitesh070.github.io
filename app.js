/* ==========================================================================
   HITESH V S PORTFOLIO — CINEMATIC ENGINE & INTERACTIVE SCHEMATICS (VANILLA JS)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    initConstellationBackgroundCanvas();
    initTypingEffect();
    initNavbarAndScroll();
    initScrollRevealEngine();
    init3DMagneticTiltCards();
    initProjectFiltersAndModals();
    initContactFormAndCopy();
    initTelemetryTracker();
});

/* ==========================================================================
   1. ETHEREAL CONSTELLATION & DYNAMIC AMBIENT NEBULA BACKGROUND CANVAS
   ========================================================================== */
function initConstellationBackgroundCanvas() {
    const canvas = document.getElementById('ambient-mesh-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let width, height;
    let time = 0;
    let mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
    let particles = [];

    function resize() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
        mouse.x = mouse.targetX = width / 2;
        mouse.y = mouse.targetY = height / 2;
        createParticles();
    }

    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', (e) => {
        mouse.targetX = e.clientX;
        mouse.targetY = e.clientY;
    });

    class ConstellationParticle {
        constructor() {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            this.vx = (Math.random() - 0.5) * 0.4;
            this.vy = (Math.random() - 0.5) * 0.4;
            this.radius = Math.random() * 2 + 1;
            this.color = Math.random() > 0.5 ? 'rgba(59, 130, 246, ' : 'rgba(255, 42, 95, ';
            this.alpha = Math.random() * 0.4 + 0.15;
        }

        update() {
            this.x += this.vx;
            this.y += this.vy;

            if (this.x < 0 || this.x > width) this.vx *= -1;
            if (this.y < 0 || this.y > height) this.vy *= -1;
        }

        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = this.color + this.alpha + ')';
            ctx.fill();
        }
    }

    function createParticles() {
        particles = [];
        const count = Math.min(Math.floor((width * height) / 18000), 65);
        for (let i = 0; i < count; i++) {
            particles.push(new ConstellationParticle());
        }
    }

    const blobs = [
        { xRatio: 0.2, yRatio: 0.35, radius: 380, color: 'rgba(59, 130, 246, 0.08)', speedX: 0.0004, speedY: 0.0003 },
        { xRatio: 0.8, yRatio: 0.45, radius: 420, color: 'rgba(255, 42, 95, 0.07)', speedX: 0.0003, speedY: 0.0005 },
        { xRatio: 0.5, yRatio: 0.75, radius: 340, color: 'rgba(59, 130, 246, 0.06)', speedX: 0.0005, speedY: 0.0004 }
    ];

    function animate() {
        time += 0.015;
        mouse.x += (mouse.targetX - mouse.x) * 0.05;
        mouse.y += (mouse.targetY - mouse.y) * 0.05;

        ctx.clearRect(0, 0, width, height);

        blobs.forEach((blob, i) => {
            const bx = (blob.xRatio + Math.sin(time * 0.5 + i) * 0.12) * width + (mouse.x - width / 2) * 0.03;
            const by = (blob.yRatio + Math.cos(time * 0.4 + i) * 0.12) * height + (mouse.y - height / 2) * 0.03;

            const grad = ctx.createRadialGradient(bx, by, 0, bx, by, blob.radius);
            grad.addColorStop(0, blob.color);
            grad.addColorStop(1, 'rgba(3, 3, 3, 0)');

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(bx, by, blob.radius, 0, Math.PI * 2);
            ctx.fill();
        });

        for (let i = 0; i < particles.length; i++) {
            particles[i].update();
            particles[i].draw();

            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < 130) {
                    const lineAlpha = (1 - dist / 130) * 0.15;
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = `rgba(255, 255, 255, ${lineAlpha})`;
                    ctx.lineWidth = 0.7;
                    ctx.stroke();
                }
            }

            const mouseDx = particles[i].x - mouse.x;
            const mouseDy = particles[i].y - mouse.y;
            const mouseDist = Math.sqrt(mouseDx * mouseDx + mouseDy * mouseDy);

            if (mouseDist < 160) {
                const lineAlpha = (1 - mouseDist / 160) * 0.35;
                ctx.beginPath();
                ctx.moveTo(particles[i].x, particles[i].y);
                ctx.lineTo(mouse.x, mouse.y);
                ctx.strokeStyle = `rgba(59, 130, 246, ${lineAlpha})`;
                ctx.lineWidth = 1;
                ctx.stroke();
            }
        }

        requestAnimationFrame(animate);
    }

    resize();
    animate();
}

/* ==========================================================================
   2. TYPING EFFECT ENGINE FOR HERO ROLES
   ========================================================================== */
function initTypingEffect() {
    const outputElement = document.getElementById('typed-output');
    if (!outputElement) return;

    const roles = [
        "EEE Engineering Undergraduate",
        "Embedded Systems & Robotics Specialist",
        "Digital VLSI & Logic Designer",
        "Power Electronics & Control Engineer",
        "Carnatic Music Practitioner & Media Creator"
    ];

    let roleIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let typeSpeed = 70;

    function type() {
        const currentRole = roles[roleIndex];

        if (isDeleting) {
            outputElement.textContent = currentRole.substring(0, charIndex - 1);
            charIndex--;
            typeSpeed = 35;
        } else {
            outputElement.textContent = currentRole.substring(0, charIndex + 1);
            charIndex++;
            typeSpeed = 70;
        }

        if (!isDeleting && charIndex === currentRole.length) {
            typeSpeed = 2200;
            isDeleting = true;
        } else if (isDeleting && charIndex === 0) {
            isDeleting = false;
            roleIndex = (roleIndex + 1) % roles.length;
            typeSpeed = 500;
        }

        setTimeout(type, typeSpeed);
    }

    type();
}

/* ==========================================================================
   3. NAVBAR & SMOOTH SCROLL TRACKING
   ========================================================================== */
function initNavbarAndScroll() {
    const navbar = document.getElementById('navbar');
    const mobileBtn = document.getElementById('mobile-menu-btn');
    const navLinks = document.getElementById('nav-links');
    const navItems = document.querySelectorAll('.nav-item');
    const backToTop = document.getElementById('back-to-top');

    window.addEventListener('scroll', () => {
        if (window.scrollY > 40) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }

        const sections = document.querySelectorAll('section[id]');
        let currentSectionId = '';

        sections.forEach(section => {
            const sectionTop = section.offsetTop - 120;
            const sectionHeight = section.offsetHeight;
            if (window.scrollY >= sectionTop && window.scrollY < sectionTop + sectionHeight) {
                currentSectionId = section.getAttribute('id');
            }
        });

        navItems.forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('href') === `#${currentSectionId}`) {
                item.classList.add('active');
            }
        });
    });

    if (mobileBtn && navLinks) {
        mobileBtn.addEventListener('click', () => {
            navLinks.classList.toggle('mobile-open');
        });

        navItems.forEach(item => {
            item.addEventListener('click', () => {
                navLinks.classList.remove('mobile-open');
            });
        });
    }

    if (backToTop) {
        backToTop.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
}

/* ==========================================================================
   4. SCROLL REVEAL ENGINE
   ========================================================================== */
function initScrollRevealEngine() {
    const revealElements = document.querySelectorAll('.reveal-on-scroll');

    const observerOptions = {
        root: null,
        rootMargin: '0px 0px -80px 0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
            }
        });
    }, observerOptions);

    revealElements.forEach(el => observer.observe(el));
}

/* ==========================================================================
   5. 3D MAGNETIC TILT CARDS
   ========================================================================== */
function init3DMagneticTiltCards() {
    const magneticCards = document.querySelectorAll('.magnetic-card');
    const isMobile = window.innerWidth <= 768;

    if (isMobile) return;

    magneticCards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            const rotateX = ((y - centerY) / centerY) * -6;
            const rotateY = ((x - centerX) / centerX) * 6;

            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.01, 1.01, 1.01)`;
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
        });
    });
}

/* ==========================================================================
   6. PROJECT MODALS & INTERACTIVE SCHEMATIC DIAGRAMS MAP
   ========================================================================== */
const projectDetailsMap = {
    alps: {
        title: "ALPS — Autonomous Aquatic Waste Skimmer USV",
        subtitle: "Unmanned Surface Vehicle for AI River Cleaning & Waste Mapping",
        category: "Embedded & Robotics",
        img: "assets/project1.jpg",
        description: "An autonomous Unmanned Surface Vehicle (USV) engineered for river water surface cleaning, featuring real-time AI trash mapping, Raspberry Pi ML vision, and an extendable robotic collector arm.",
        highlights: [
            "Raspberry Pi 4 vision pipeline running real-time aquatic trash classifier model.",
            "Autonomous path navigation using GPS module and digital compass guidance.",
            "Motor driver PWM bridge controlling dual propulsion thrusters and conveyor arm.",
            "Ongoing Indian Patent Application for novel waste mapping & collection mechanism."
        ],
        schematicSvg: `
            <div style="background:#080b12; border:1px solid rgba(59,130,246,0.3); border-radius:12px; padding:1.5rem; margin:1.5rem 0; text-align:center;">
                <h5 style="color:var(--accent-blue); font-family:var(--font-mono); font-size:0.85rem; margin-bottom:1rem;">SYSTEM ARCHITECTURE & SENSOR FLOWCHART</h5>
                <svg viewBox="0 0 700 180" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
                    <rect x="10" y="50" width="120" height="60" rx="8" fill="#152033" stroke="#3b82f6" stroke-width="1.5"/>
                    <text x="70" y="85" fill="#fff" font-size="12" text-anchor="middle">Camera & GPS</text>
                    
                    <path d="M 130 80 L 190 80" stroke="#3b82f6" stroke-width="2" marker-end="url(#arrow)"/>
                    
                    <rect x="190" y="40" width="150" height="80" rx="8" fill="#241223" stroke="#ff2a5f" stroke-width="1.5"/>
                    <text x="265" y="75" fill="#fff" font-size="13" font-weight="bold" text-anchor="middle">Raspberry Pi 4 ML</text>
                    <text x="265" y="95" fill="#a0a0a0" font-size="10" text-anchor="middle">Trash Classifier</text>
                    
                    <path d="M 340 80 L 400 80" stroke="#3b82f6" stroke-width="2"/>
                    
                    <rect x="400" y="50" width="130" height="60" rx="8" fill="#152033" stroke="#3b82f6" stroke-width="1.5"/>
                    <text x="465" y="80" fill="#fff" font-size="12" text-anchor="middle">Motor Driver PWM</text>

                    <path d="M 530 80 L 590 80" stroke="#3b82f6" stroke-width="2"/>

                    <rect x="590" y="50" width="100" height="60" rx="8" fill="#082b1a" stroke="#10b981" stroke-width="1.5"/>
                    <text x="640" y="80" fill="#fff" font-size="12" text-anchor="middle">Robotic Arm</text>
                </svg>
            </div>
        `,
        stack: ["Python", "Embedded C", "Raspberry Pi", "OpenCV", "Robotic Actuator", "Patent Pending"],
        repoUrl: "https://github.com/Hitesh070"
    },
    approx_adder: {
        title: "Approximate Arithmetic Adder for Edge Computing",
        subtitle: "Energy-Efficient VLSI Hardware Architecture for Edge AI",
        category: "VLSI & Digital",
        img: "assets/project2.jpg",
        description: "Digital VLSI research and hardware implementation of approximate arithmetic adders tailored for energy-efficient image processing and edge computing accelerators.",
        highlights: [
            "Verilog HDL design of low-latency approximate adder cells with reduced logic gate counts.",
            "Waveform simulation and functional verification using ModelSim.",
            "PSNR and image quality degradation trade-off evaluation in Python and MATLAB.",
            "Featured in research paper under publication in The Journal of Supercomputing (Springer Nature)."
        ],
        schematicSvg: `
            <div style="background:#080b12; border:1px solid rgba(59,130,246,0.3); border-radius:12px; padding:1.5rem; margin:1.5rem 0; text-align:center;">
                <h5 style="color:var(--accent-blue); font-family:var(--font-mono); font-size:0.85rem; margin-bottom:1rem;">ETA-1 APPROXIMATE ADDER LOGIC SCHEMATIC</h5>
                <svg viewBox="0 0 700 160" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
                    <rect x="20" y="40" width="180" height="80" rx="8" fill="#0c1e38" stroke="#3b82f6" stroke-width="1.5"/>
                    <text x="110" y="75" fill="#fff" font-size="13" font-weight="bold" text-anchor="middle">Accurate MSB Part</text>
                    <text x="110" y="95" fill="#3b82f6" font-size="11" text-anchor="middle">Carry Lookahead (CLA)</text>
                    
                    <rect x="250" y="40" width="180" height="80" rx="8" fill="#380c18" stroke="#ff2a5f" stroke-width="1.5"/>
                    <text x="340" y="75" fill="#fff" font-size="13" font-weight="bold" text-anchor="middle">Approximate LSB Part</text>
                    <text x="340" y="95" fill="#ff2a5f" font-size="11" text-anchor="middle">Error Tolerant ETA-1 Logic</text>

                    <rect x="480" y="40" width="190" height="80" rx="8" fill="#182e1c" stroke="#10b981" stroke-width="1.5"/>
                    <text x="575" y="75" fill="#fff" font-size="13" font-weight="bold" text-anchor="middle">Error Control Unit</text>
                    <text x="575" y="95" fill="#10b981" font-size="11" text-anchor="middle">Facial Recognition Out</text>
                </svg>
            </div>
        `,
        stack: ["Verilog HDL", "ModelSim", "Python", "MATLAB", "Springer Nature", "Edge AI"],
        repoUrl: "https://github.com/Hitesh070"
    },
    buck_converter: {
        title: "Cascade Dual-Loop Control of Buck Converter",
        subtitle: "High-Performance Power Electronics Closed-Loop Regulation",
        category: "Power & Control",
        img: "assets/project3.jpg",
        description: "Closed-loop design of a DC-DC Buck Converter using dual-loop cascade control (inner current loop, outer voltage loop) to achieve rapid dynamic load response and tight output voltage regulation.",
        highlights: [
            "Inner current control loop for instantaneous inductor current regulation.",
            "Outer voltage control loop with PI/PID tuning for zero steady-state error.",
            "Circuit transient analysis and Bode plot stability verification in LTspice.",
            "Simulink block model and firmware logic prototype in Embedded C."
        ],
        schematicSvg: `
            <div style="background:#080b12; border:1px solid rgba(59,130,246,0.3); border-radius:12px; padding:1.5rem; margin:1.5rem 0; text-align:center;">
                <h5 style="color:var(--accent-blue); font-family:var(--font-mono); font-size:0.85rem; margin-bottom:1rem;">CASCADE DUAL-LOOP CONTROL FEEDBACK DIAGRAM</h5>
                <svg viewBox="0 0 700 160" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
                    <rect x="20" y="45" width="150" height="70" rx="8" fill="#152033" stroke="#3b82f6" stroke-width="1.5"/>
                    <text x="95" y="75" fill="#fff" font-size="12" text-anchor="middle">Voltage Outer PI Loop</text>

                    <rect x="220" y="45" width="150" height="70" rx="8" fill="#29111c" stroke="#ff2a5f" stroke-width="1.5"/>
                    <text x="295" y="75" fill="#fff" font-size="12" text-anchor="middle">Current Inner PWM</text>

                    <rect x="420" y="45" width="140" height="70" rx="8" fill="#152033" stroke="#3b82f6" stroke-width="1.5"/>
                    <text x="490" y="75" fill="#fff" font-size="12" text-anchor="middle">Buck MOSFET Power Stage</text>
                </svg>
            </div>
        `,
        stack: ["MATLAB", "Simulink", "LTspice", "Embedded C", "Control Engineering", "Power Electronics"],
        repoUrl: "https://github.com/Hitesh070"
    },
    irrigation: {
        title: "Analog Automatic Irrigation Controller",
        subtitle: "Microcontroller-Free Precision Hysteresis Circuit",
        category: "Embedded & Circuits",
        img: "assets/project4.jpg",
        description: "A robust, low-cost analog feedback circuit designed for automated soil moisture sensing and pump actuation without needing microcontrollers.",
        highlights: [
            "Op-amp window comparator circuit with adjustable hysteresis threshold points.",
            "Soil moisture sensor signal conditioning and noise suppression filter.",
            "Relay driver stage for AC/DC irrigation pump control.",
            "LTspice circuit transient simulations and mathematical component tolerance sizing."
        ],
        stack: ["LTspice", "Analog Circuit Design", "MATLAB", "Simulink", "Sensor Conditioning"],
        repoUrl: "https://github.com/Hitesh070"
    },
    thermal_runaway: {
        title: "Thermal Runaway Prediction in Lithium-Ion Batteries",
        subtitle: "Early Detection ML Framework for EV Battery Safety",
        category: "Software & AI",
        img: "assets/project5.jpg",
        description: "Research and predictive modeling pipeline to forecast thermal runaway hazards in Lithium-Ion battery packs used in Electric Vehicles.",
        highlights: [
            "Thermal mathematical modeling simulating battery temperature spike dynamics.",
            "Machine learning feature extraction from voltage, current, and temperature sensor series.",
            "Literature benchmark analysis and thermal run-away hazard indicator metrics."
        ],
        stack: ["Python", "MATLAB", "Machine Learning", "Thermal Physics", "Data Analytics"],
        repoUrl: "https://github.com/Hitesh070"
    },
    learning_system: {
        title: "Advance Online Learning System",
        subtitle: "Full-Stack Portal for Interactive Courses & Progress Analytics",
        category: "Software & Web",
        img: "assets/project6.jpg",
        description: "A feature-complete online learning portal facilitating micro-courses, student-teacher workspace orchestration, live practice modules, and progress tracking.",
        highlights: [
            "Modular backend with user authentication and role-based access.",
            "Micro-courses interface with interactive quiz engines and score reports.",
            "SQL relational database schema for student records and course metrics."
        ],
        stack: ["Python", "JavaScript", "SQL", "PHP", "HTML5", "CSS3"],
        repoUrl: "https://github.com/Hitesh070"
    },
    uav_guardian: {
        title: "UAV Guardian — Autonomous Disturbance Detection & Rerouting System",
        subtitle: "Onboard ESP32 Sensor Fusion, Priority AI Threat Classifier & Closed-Loop Actuation",
        category: "Embedded & Robotics",
        img: "assets/uav_guardian.png",
        description: "A self-contained onboard module that senses real-time environmental disturbances (RF/GPS jamming, adverse weather, wind buffeting, biological intrusion, and mid-air obstacles), classifies threat severity using a priority AI classifier engine, and autonomously executes rerouting maneuvers via physical servo direction pointing and telemetry reporting.",
        schematicSvg: `
            <div class="schematic-container" style="margin-bottom:1.5rem; background:#080808; padding:1.2rem; border-radius:var(--radius-md); border:1px solid var(--border-subtle);">
                <span class="schematic-title" style="color:var(--accent-blue); font-family:var(--font-mono); font-size:0.8rem; display:block; margin-bottom:1rem;">
                    <i class="fa-solid fa-diagram-project"></i> SYSTEM ARCHITECTURE — ESP32 DISTURBANCE FUSION & REROUTING
                </span>
                <svg viewBox="0 0 700 240" style="width:100%; height:auto;" xmlns="http://www.w3.org/2000/svg">
                    <rect x="20" y="25" width="140" height="55" rx="8" fill="#111" stroke="#3b82f6" stroke-width="1.5"/>
                    <text x="90" y="52" fill="#fff" font-size="11" text-anchor="middle" font-family="sans-serif">NEO-6M GPS & MPU-6050</text>
                    <text x="90" y="67" fill="#888" font-size="9" text-anchor="middle" font-family="sans-serif">GPS Satellites & IMU Accel</text>

                    <rect x="20" y="95" width="140" height="55" rx="8" fill="#111" stroke="#3b82f6" stroke-width="1.5"/>
                    <text x="90" y="122" fill="#fff" font-size="11" text-anchor="middle" font-family="sans-serif">BMP280 & DHT22</text>
                    <text x="90" y="137" fill="#888" font-size="9" text-anchor="middle" font-family="sans-serif">Baro Pressure & Humidity</text>

                    <rect x="20" y="165" width="140" height="55" rx="8" fill="#111" stroke="#3b82f6" stroke-width="1.5"/>
                    <text x="90" y="192" fill="#fff" font-size="11" text-anchor="middle" font-family="sans-serif">Ultrasonic & PIR Motion</text>
                    <text x="90" y="207" fill="#888" font-size="9" text-anchor="middle" font-family="sans-serif">Obstacle & Intrusion Sense</text>

                    <rect x="240" y="60" width="200" height="120" rx="10" fill="#0d1527" stroke="#3b82f6" stroke-width="2"/>
                    <text x="340" y="95" fill="#3b82f6" font-size="15" font-weight="bold" text-anchor="middle" font-family="sans-serif">ESP32 Dual-Core (240MHz)</text>
                    <text x="340" y="118" fill="#aaa" font-size="11" text-anchor="middle" font-family="sans-serif">Sensor Data Aggregator</text>
                    <text x="340" y="138" fill="#aaa" font-size="10" text-anchor="middle" font-family="sans-serif">Priority Threat AI Classifier</text>
                    <text x="340" y="158" fill="#10b981" font-size="10" text-anchor="middle" font-family="sans-serif">50Hz PWM Maneuver Engine</text>

                    <rect x="520" y="30" width="160" height="55" rx="8" fill="#111" stroke="#10b981" stroke-width="1.5"/>
                    <text x="600" y="57" fill="#fff" font-size="11" text-anchor="middle" font-family="sans-serif">SG90 Servo Direction Pointer</text>
                    <text x="600" y="72" fill="#888" font-size="9" text-anchor="middle" font-family="sans-serif">Physical Maneuver Angle θ</text>

                    <rect x="520" y="95" width="160" height="55" rx="8" fill="#111" stroke="#3b82f6" stroke-width="1.5"/>
                    <text x="600" y="122" fill="#fff" font-size="11" text-anchor="middle" font-family="sans-serif">SSD1306 OLED & RGB Alarm</text>
                    <text x="600" y="137" fill="#888" font-size="9" text-anchor="middle" font-family="sans-serif">Live Threat Dashboard</text>

                    <rect x="520" y="165" width="160" height="55" rx="8" fill="#111" stroke="#8b5cf6" stroke-width="1.5"/>
                    <text x="600" y="192" fill="#fff" font-size="11" text-anchor="middle" font-family="sans-serif">Wi-Fi Web Telemetry Link</text>
                    <text x="600" y="207" fill="#888" font-size="9" text-anchor="middle" font-family="sans-serif">Live Ground Station Buffer</text>

                    <path d="M 160 52 L 240 95" stroke="#3b82f6" stroke-width="1.5" fill="none"/>
                    <path d="M 160 122 L 240 120" stroke="#3b82f6" stroke-width="1.5" fill="none"/>
                    <path d="M 160 192 L 240 145" stroke="#3b82f6" stroke-width="1.5" fill="none"/>

                    <path d="M 440 95 L 520 57" stroke="#10b981" stroke-width="1.5" fill="none"/>
                    <path d="M 440 120 L 520 122" stroke="#3b82f6" stroke-width="1.5" fill="none"/>
                    <path d="M 440 145 L 520 192" stroke="#8b5cf6" stroke-width="1.5" fill="none"/>
                </svg>
            </div>
        `,
        highlights: [
            "ESP32 Dual-Core (240MHz) sensor fusion aggregating NEO-6M GPS, BMP280, MPU-6050 IMU, ultrasonic & PIR sensor vectors every 500ms.",
            "Priority Rule-Based AI Classifier Engine evaluating 6 threat severity levels (GPS Jamming, Severe Weather, Wind Buffeting, Obstacles, Human Intrusion).",
            "Closed-loop SG90 servo motor directional pointer executing 50Hz PWM escape maneuvers (180° Reverse Escape, 90° RTH, 45° Descend & Hover).",
            "Integrated SSD1306 128x64 OLED status display, RGB alert beacons, active buzzer alarms, and MATLAB Simulink control system analysis."
        ],
        stack: ["ESP32", "Arduino C++", "MATLAB Simulink", "MPU-6050", "BMP280", "NEO-6M GPS", "HC-SR04"],
        repoUrl: "https://github.com/Hitesh070/UAV-Guardian-ESP32"
    }
};

function initProjectFiltersAndModals() {
    const filterBtns = document.querySelectorAll('.proj-filter-pill');
    const modalOverlay = document.getElementById('project-modal-overlay');
    const modalCloseBtn = document.getElementById('modal-close-btn');
    const modalBody = document.getElementById('modal-body');

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const filter = btn.getAttribute('data-proj-filter');
            const allCards = document.querySelectorAll('#projects .project-editorial-card');
            allCards.forEach(card => {
                const cat = card.getAttribute('data-category');
                if (filter === 'all' || cat === filter) {
                    card.style.display = 'flex';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    });

    document.querySelectorAll('[data-project-id]').forEach(trigger => {
        trigger.addEventListener('click', () => {
            const projId = trigger.getAttribute('data-project-id');
            const data = projectDetailsMap[projId];
            if (!data) return;

            if (window.gtag) {
                gtag('event', 'inspect_project', { 'project_id': projId, 'title': data.title });
            }

            modalBody.innerHTML = `
                <div style="margin-bottom:1.5rem;">
                    <span class="project-tag-badge" style="position:static; display:inline-block; margin-bottom:0.8rem;">${data.category}</span>
                    <h2 style="font-size: 1.8rem; font-weight:400; margin-bottom: 0.4rem;">${data.title}</h2>
                    <p style="color: var(--accent-blue); font-family: var(--font-mono); font-size: 0.9rem;">${data.subtitle}</p>
                </div>
                ${data.img ? `<img src="${data.img}" alt="${data.title}" style="width:100%; border-radius:var(--radius-md); margin-bottom:1.5rem; border:1px solid var(--border-subtle);">` : ''}
                <p style="font-size: 1rem; color: var(--text-secondary); margin-bottom: 1.5rem; line-height:1.7;">${data.description}</p>

                ${data.schematicSvg ? data.schematicSvg : ''}
                
                <h4 style="font-size: 1.1rem; font-weight:500; margin-bottom: 0.8rem; color: var(--text-primary);">Key Architectural Highlights</h4>
                <ul style="padding-left: 1.2rem; margin-bottom: 1.5rem; color: var(--text-secondary); display:flex; flex-direction:column; gap:0.6rem; font-size:0.95rem;">
                    ${data.highlights.map(h => `<li>${h}</li>`).join('')}
                </ul>

                <h4 style="font-size: 1.1rem; font-weight:500; margin-bottom: 0.8rem; color: var(--text-primary);">Tech &amp; Tools Used</h4>
                <div class="tech-stack-row" style="margin-bottom: 1.8rem;">
                    ${data.stack.map(s => `<span>${s}</span>`).join('')}
                </div>

                <div style="padding-top:1rem; border-top:1px solid var(--border-subtle); display:flex; align-items:center; justify-content:space-between;">
                    <a href="${data.repoUrl}" target="_blank" class="btn-pill-primary" style="font-size:0.75rem; padding:0.5rem 1.2rem;">
                        <i class="fa-brands fa-github"></i> View GitHub Repo (Hitesh070)
                    </a>
                </div>
            `;

            modalOverlay.classList.add('active');
        });
    });

    if (modalCloseBtn && modalOverlay) {
        modalCloseBtn.addEventListener('click', () => {
            modalOverlay.classList.remove('active');
        });

        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                modalOverlay.classList.remove('active');
            }
        });
    }
}

/* ==========================================================================
   7. CONTACT FORM & TELEMETRY TRACKER
   ========================================================================== */
function initContactFormAndCopy() {
    const copyBtns = document.querySelectorAll('.btn-copy-mini');

    copyBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const textToCopy = btn.getAttribute('data-copy-val') || btn.getAttribute('data-copy') || 'hiteshvs616@gmail.com';
            if (textToCopy) {
                navigator.clipboard.writeText(textToCopy);
                showToast(`Copied ${textToCopy} to clipboard!`);
            }
        });
    });
}

function initTelemetryTracker() {
    const cvBtn = document.getElementById('download-cv-hero-btn');
    if (cvBtn) {
        cvBtn.addEventListener('click', () => {
            if (window.gtag) {
                gtag('event', 'download_resume', {
                    'event_category': 'Engagement',
                    'event_label': 'Hitesh_VS_Resume.pdf'
                });
            }
            showToast('Initiating Resume PDF Download...');
        });
    }
}

function showToast(msg) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<i class="fa-solid fa-circle-check text-blue"></i> <span>${msg}</span>`;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.4s ease';
        setTimeout(() => toast.remove(), 400);
    }, 2600);
}


    // Contact Form Handler
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
      contactForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // 1. Honeypot check
        const hpInput = contactForm.querySelector('[name="_hp"]');
        if (hpInput && hpInput.value.trim() !== '') {
          console.warn('Bot submission blocked');
          contactForm.reset();
          return;
        }

        const nameInput = contactForm.querySelector('[name="name"]') || contactForm.querySelector('#name');
        const emailInput = contactForm.querySelector('[name="email"]') || contactForm.querySelector('#email');
        const subjectInput = contactForm.querySelector('[name="subject"]') || contactForm.querySelector('#subject');
        const messageInput = contactForm.querySelector('[name="message"]') || contactForm.querySelector('#message');
        const submitBtn = contactForm.querySelector('button[type="submit"]');
        const statusMsg = document.getElementById('form-status-msg');

        const name = (nameInput ? nameInput.value : '').trim();
        const email = (emailInput ? emailInput.value : '').trim();
        const subject = (subjectInput ? subjectInput.value : 'General Inquiry').trim();
        const message = (messageInput ? messageInput.value : '').trim();

        if (!name || !email || !message) {
          showToast('Please fill in all required fields.', 'warning');
          return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          showToast('Please enter a valid email address.', 'warning');
          return;
        }

        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = '<span>Sending Message...</span> <i class="fa-solid fa-spinner fa-spin"></i>';
        }

        const SUPABASE_URL = 'https://nnhzuvchomjgycfydbhn.supabase.co';
        const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5uaHp1dmNob21qZ3ljZnldYmhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2NTQzNzIsImV4cCI6MjA4NzIzMDM3Mn0.o_VqD6k4d38l0F1t9538jKj24dK48v7yX457K3t4LdI';

        try {
          const res = await fetch(`${SUPABASE_URL}/rest/v1/contact_submissions`, {
            method: 'POST',
            headers: {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal'
            },
            body: JSON.stringify({
              name,
              email,
              subject,
              message,
              submitted_at: new Date().toISOString()
            })
          });

          if (res.ok) {
            showToast('Message sent successfully! Hitesh will reply shortly.', 'success');
            if (statusMsg) {
              statusMsg.style.display = 'block';
              statusMsg.className = 'form-status-msg success';
              statusMsg.textContent = '✓ Thank you! Your message has been safely delivered to Hitesh.';
            }
            contactForm.reset();
            
            // Analytics event
            if (typeof gtag === 'function') {
              gtag('event', 'contact_form_submit', { event_category: 'engagement', event_label: subject });
            }
          } else {
            throw new Error(`Server returned status ${res.status}`);
          }
        } catch (err) {
          console.warn('Supabase form submission failed, falling back to mailto:', err);
          const mailtoUrl = `mailto:hiteshvs616@gmail.com?subject=${encodeURIComponent(subject + ' - ' + name)}&body=${encodeURIComponent('Name: ' + name + '\nEmail: ' + email + '\n\nMessage:\n' + message)}`;
          window.location.href = mailtoUrl;
          showToast('Opened email client to send message.', 'info');
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span>Send Message</span> <i class="fa-solid fa-paper-plane"></i>';
          }
        }
      });
    }
  
// ==========================================================================
// ADVANCED PORTFOLIO INTERACTION SUITE
// ==========================================================================

// 1. Top Scroll Progress Bar & Scroll Depth Tracking
function initScrollProgressAndAnalytics() {
  const progressBar = document.getElementById('scroll-progress-bar');
  const depthMarks = { 25: false, 50: false, 75: false, 90: false };

  window.addEventListener('scroll', () => {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrollPercent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;

    if (progressBar) {
      progressBar.style.width = `${Math.min(100, Math.max(0, scrollPercent))}%`;
    }

    // Scroll depth tracking
    [25, 50, 75, 90].forEach(mark => {
      if (scrollPercent >= mark && !depthMarks[mark]) {
        depthMarks[mark] = true;
        if (typeof gtag === 'function') {
          gtag('event', 'scroll_depth', { event_category: 'engagement', event_label: `${mark}%`, value: mark });
        }
      }
    });
  }, { passive: true });
}

// 2. Dark / Light Theme Toggle
function initThemeToggle() {
  const toggleBtn = document.getElementById('theme-toggle-btn');
  const cmdToggle = document.getElementById('cmd-toggle-theme');

  const applyTheme = (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('portfolio_theme', theme);
    if (toggleBtn) {
      toggleBtn.innerHTML = theme === 'light' ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
    }
  };

  const savedTheme = localStorage.getItem('portfolio_theme') || 'dark';
  applyTheme(savedTheme);

  const toggle = () => {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    showToast(`Switched to ${next} mode`, 'info');
  };

  if (toggleBtn) toggleBtn.addEventListener('click', toggle);
  if (cmdToggle) cmdToggle.addEventListener('click', () => { toggle(); closeCommandPalette(); });
}

// 3. Command Palette (Ctrl+K / Cmd+K)
function initCommandPalette() {
  const backdrop = document.getElementById('cmd-palette-modal');
  const searchInput = document.getElementById('cmd-search-input');
  const triggerBtn = document.getElementById('cmd-palette-btn');
  const resultsContainer = document.getElementById('cmd-results-list');
  if (!backdrop) return;

  const openPalette = () => {
    backdrop.classList.add('active');
    backdrop.setAttribute('aria-hidden', 'false');
    if (searchInput) {
      searchInput.value = '';
      searchInput.focus();
    }
  };

  const closePalette = () => {
    backdrop.classList.remove('active');
    backdrop.setAttribute('aria-hidden', 'true');
  };
  window.closeCommandPalette = closePalette;

  if (triggerBtn) triggerBtn.addEventListener('click', openPalette);

  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (backdrop.classList.contains('active')) closePalette();
      else openPalette();
    } else if (e.key === 'Escape' && backdrop.classList.contains('active')) {
      closePalette();
    }
  });

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closePalette();
  });

  // Filter items in command palette
  if (searchInput && resultsContainer) {
    searchInput.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      resultsContainer.querySelectorAll('.cmd-item').forEach(item => {
        const text = item.textContent.toLowerCase();
        item.style.display = text.includes(q) ? 'flex' : 'none';
      });
    });
  }

  // Close when navigation item is clicked
  if (resultsContainer) {
    resultsContainer.querySelectorAll('a.cmd-item').forEach(link => {
      link.addEventListener('click', closePalette);
    });
  }
}

// 4. Project Case Study Modal System
const PROJECT_CASE_STUDIES = {
  'rover': {
    title: 'Autonomous Navigation & Terrain Mapping Rover',
    category: 'Robotics, Embedded Systems & Computer Vision',
    tags: ['ROS2', 'LiDAR SLAM', 'STM32', 'C++', 'OpenCV', 'Python'],
    overview: 'A robust four-wheel differential drive robotic rover engineered for GPS-denied autonomous exploration, high-precision 2D/3D LiDAR terrain mapping, and dynamic obstacle avoidance across unstructured indoor/outdoor surfaces.',
    problem: 'Standard autonomous rovers experience wheel slip, sensor drift, and catastrophic localization loss in rough sand, gravel, and GPS-obstructed environments.',
    solution: 'Engineered an Extended Kalman Filter (EKF) sensor fusion layer blending 9-DOF IMU telemetry with optical wheel odometry. Combined RPLiDAR A1 with ROS2 Navigation2 NavFn planner to achieve real-time costmap inflation and dynamic trajectory re-planning at 20 Hz.',
    results: [
      '±3.2 cm SLAM localization accuracy across 500 m² indoor testing facility',
      '< 180 ms dynamic obstacle detection and avoidance latency',
      '4.5 hours continuous battery runtime on 4S 5000mAh LiPo architecture'
    ],
    github: 'https://github.com/Hitesh070'
  },
  'bldc': {
    title: 'Field Oriented Control (FOC) BLDC Motor Driver',
    category: 'Power Electronics & Embedded Control',
    tags: ['STM32G431', 'Altium Designer', 'Space Vector PWM', 'Power MOSFETs', 'C'],
    overview: 'High-power, low-noise custom 3-phase BLDC/PMSM inverter board with shunt-based current reconstruction, Clarke/Park coordinate transformations, and sensorless rotor flux tracking.',
    problem: 'Traditional trapezoidal six-step commutation generates significant torque ripple, acoustic whine, and low efficiency at low angular velocities.',
    solution: 'Implemented pure sinusoidal FOC utilizing hardware trigonometric accelerators (CORDIC) on STM32G4. Designed an optimal gate driver stage with dead-time insertion and bootstrap circuitry to eliminate shoot-through risk.',
    results: [
      '94.2% peak electrical-to-mechanical conversion efficiency at 48V / 25A',
      'Zero acoustic switching noise using 25 kHz Space Vector Modulation',
      'Instantaneous overcurrent shutoff in under 450 nanoseconds'
    ],
    github: 'https://github.com/Hitesh070'
  },
  'fpga': {
    title: 'FPGA Edge Neural Inference Engine',
    category: 'Digital VLSI & Hardware Acceleration',
    tags: ['Verilog HDL', 'Xilinx Vivado', 'Artix-7', 'AXI4-Stream', 'ModelSim'],
    overview: 'Synthesized 8-bit quantized matrix-multiply systolic array on Xilinx Artix-7 FPGA with high-bandwidth AXI4 streaming interface for real-time edge computer vision classification.',
    problem: 'Microcontrollers lack parallel compute capacity for neural networks, while GPUs consume too much power for micro-UAV deployments.',
    solution: 'Designed a pipelined 4x4 Processing Element (PE) systolic array with double-buffered weight registers and hardware ReLU activation modules in synthesized Verilog HDL.',
    results: [
      '14.8x acceleration factor over ARM Cortex-M7 at comparable clock rate',
      '1.2 Watts total power envelope during peak convolution inference',
      'Zero pipeline stalls with ping-pong AXI4 DMA memory buffers'
    ],
    github: 'https://github.com/Hitesh070'
  }
};

function initCaseStudyModals() {
  const modal = document.getElementById('case-study-modal');
  const content = document.getElementById('case-study-content');
  const closeBtn = document.getElementById('close-case-study-btn');
  if (!modal || !content) return;

  const openModal = (key) => {
    const data = PROJECT_CASE_STUDIES[key] || PROJECT_CASE_STUDIES['rover'];
    content.innerHTML = `
      <div style="margin-bottom: 16px;">
        <span class="uppercase-tag" style="font-size: 11px; padding: 3px 8px; border-radius: 4px; background: rgba(56,189,248,0.15); color: #38bdf8; font-weight: 600;">${data.category}</span>
        <h2 style="font-size: 24px; font-weight: 700; color: #f8fafc; margin: 10px 0 6px;">${data.title}</h2>
        <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 16px;">
          ${data.tags.map(t => `<span style="font-size: 11px; background: #1e293b; color: #94a3b8; padding: 2px 8px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.06);">${t}</span>`).join('')}
        </div>
      </div>
      <p style="font-size: 14px; line-height: 1.6; color: #cbd5e1; margin-bottom: 20px;">${data.overview}</p>

      <div style="background: #1e293b; border-radius: 8px; padding: 16px; margin-bottom: 16px; border: 1px solid rgba(255,255,255,0.08);">
        <h4 style="color: #f59e0b; margin: 0 0 8px; font-size: 14px;">⚡ Problem Statement</h4>
        <p style="margin: 0; font-size: 13px; color: #94a3b8; line-height: 1.5;">${data.problem}</p>
      </div>

      <div style="background: #1e293b; border-radius: 8px; padding: 16px; margin-bottom: 20px; border: 1px solid rgba(255,255,255,0.08);">
        <h4 style="color: #38bdf8; margin: 0 0 8px; font-size: 14px;">🛠️ Architecture & Solution</h4>
        <p style="margin: 0; font-size: 13px; color: #94a3b8; line-height: 1.5;">${data.solution}</p>
      </div>

      <h4 style="color: #10b981; margin: 0 0 10px; font-size: 14px;">📊 Benchmark Results & Metrics</h4>
      <ul style="margin: 0 0 24px; padding-left: 20px; color: #cbd5e1; font-size: 13px; line-height: 1.8;">
        ${data.results.map(r => `<li>${r}</li>`).join('')}
      </ul>

      <div style="display: flex; gap: 10px;">
        <a href="${data.github}" target="_blank" class="social-pill" style="display: inline-flex; align-items: center; gap: 8px; background: #2563eb; color: #fff; text-decoration: none; padding: 8px 16px; border-radius: 6px; font-weight: 600; font-size: 13px;">
          <i class="fa-brands fa-github"></i> View Source Code
        </a>
      </div>
    `;

    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');

    if (typeof gtag === 'function') {
      gtag('event', 'view_case_study', { event_category: 'projects', event_label: data.title });
    }
  };

  const closeModal = () => {
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
  };

  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  // Attach to project cards / buttons
  document.querySelectorAll('.project-editorial-card').forEach((card, idx) => {
    card.style.cursor = 'pointer';
    card.addEventListener('click', (e) => {
      // If clicking external link directly, don't hijack
      if (e.target.closest('a')) return;
      const keys = ['rover', 'bldc', 'fpga'];
      openModal(keys[idx % keys.length]);
    });
  });
}

// 5. Outbound Links & Engagement Tracking
function initOutboundTracking() {
  document.querySelectorAll('a[target="_blank"]').forEach(link => {
    link.addEventListener('click', () => {
      const href = link.getAttribute('href') || '';
      if (typeof gtag === 'function') {
        gtag('event', 'outbound_click', {
          event_category: 'outbound',
          event_label: href,
          transport_type: 'beacon'
        });
      }
    });
  });
}

// 6. Register Service Worker for Offline Resilience
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

// Boot enhancements
document.addEventListener('DOMContentLoaded', () => {
  initScrollProgressAndAnalytics();
  initThemeToggle();
  initCommandPalette();
  initCaseStudyModals();
  initOutboundTracking();
});
