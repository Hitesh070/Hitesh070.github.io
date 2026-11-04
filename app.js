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
    goto_telescope: {
        title: "Custom GoTo Telescope Mount v4.0",
        subtitle: "3-Axis Motorized Alt-Azimuth Mount & Stellarium Bridge (PyQt6 / Arduino Uno)",
        category: "Embedded & Robotics",
        img: "assets/goto_telescope_icon.png",
        description: "A precision 3-axis motorized astronomical telescope controller engineered for 60mm F/2.8 refractors. Pairs an Arduino Uno ATmega328P firmware engine with an asynchronous PyQt6 Fluent desktop client, bridging Stellarium via TCP/HTTP protocols, calculating real-time astrometric ephemeris, and executing automated V-curve autofocus routines.",
        highlights: [
            "Arduino Uno ATmega328P firmware orchestrating 3-axis motion (Azimuth, Altitude, and Motorized Focuser) using 28BYJ-48 steppers and ULN2003 drivers at 4075.77 steps/rev.",
            "Bidirectional Stellarium planetarium software integration via TCP server (Port 10001) and HTTP REST follower API (Port 8090) for synchronized sky slewing.",
            "Windows 11 Fluent PyQt6 desktop application featuring 20Hz tabular telemetry, real-time vector polar sky radar, and retina-protecting Pure-Red OLED Night Vision mode.",
            "Precision astrometry engine implementing Jean Meeus algorithms, coordinate precession, multi-rate tracking (Sidereal, Lunar, Solar, King refraction), and parabolic V-curve autofocusing.",
            "Hardware safety protocols including active solar proximity exclusion barriers, cable anti-wrap tracking with 1-click unwind, and global keyboard emergency aborts."
        ],
        schematicSvg: `
            <div style="background:#080b12; border:1px solid rgba(56,189,248,0.3); border-radius:12px; padding:1.5rem; margin:1.5rem 0; text-align:center;">
                <h5 style="color:#38bdf8; font-family:var(--font-mono); font-size:0.85rem; margin-bottom:1rem; letter-spacing:0.05em;">SYSTEM ARCHITECTURE &amp; HARDWARE BRIDGE</h5>
                <svg viewBox="0 0 740 220" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
                    <rect x="15" y="30" width="140" height="70" rx="8" fill="#0c2340" stroke="#38bdf8" stroke-width="1.5"/>
                    <text x="85" y="60" fill="#fff" font-size="12" font-weight="bold" text-anchor="middle">Stellarium Core</text>
                    <text x="85" y="80" fill="#93c5fd" font-size="10" text-anchor="middle">TCP 10001 / REST 8090</text>

                    <rect x="15" y="125" width="140" height="65" rx="8" fill="#111827" stroke="#6b7280" stroke-width="1.5"/>
                    <text x="85" y="152" fill="#fff" font-size="11" font-weight="bold" text-anchor="middle">Open-Meteo API</text>
                    <text x="85" y="170" fill="#9ca3af" font-size="9" text-anchor="middle">Live Cloud &amp; Seeing</text>

                    <path d="M 155 65 L 205 90" stroke="#38bdf8" stroke-width="2"/>
                    <path d="M 155 155 L 205 130" stroke="#9ca3af" stroke-width="1.5" stroke-dasharray="3,3"/>

                    <rect x="205" y="45" width="180" height="130" rx="10" fill="#1e1035" stroke="#c084fc" stroke-width="2"/>
                    <text x="295" y="75" fill="#f3e8ff" font-size="13" font-weight="bold" text-anchor="middle">PyQt6 Fluent App (PC)</text>
                    <text x="295" y="98" fill="#c084fc" font-size="10" text-anchor="middle">Astrometry &amp; Meeus Engine</text>
                    <text x="295" y="118" fill="#e9d5ff" font-size="9.5" text-anchor="middle">Vector Sky Radar • 20Hz Telemetry</text>
                    <text x="295" y="136" fill="#f43f5e" font-size="9.5" text-anchor="middle">OLED Pure-Red Night Vision</text>
                    <text x="295" y="154" fill="#a855f7" font-size="9" text-anchor="middle">V-Curve AutoFocus Routine</text>

                    <path d="M 385 110 L 440 110" stroke="#38bdf8" stroke-width="2"/>
                    <text x="412" y="102" fill="#38bdf8" font-size="9" text-anchor="middle">USB 115.2k</text>

                    <rect x="440" y="55" width="135" height="110" rx="8" fill="#062817" stroke="#34d399" stroke-width="1.5"/>
                    <text x="507" y="85" fill="#fff" font-size="12" font-weight="bold" text-anchor="middle">Arduino Uno</text>
                    <text x="507" y="103" fill="#6ee7b7" font-size="10" text-anchor="middle">ATmega328P Firmware</text>
                    <text x="507" y="123" fill="#a7f3d0" font-size="9" text-anchor="middle">Step Pulse Dispatcher</text>
                    <text x="507" y="141" fill="#a7f3d0" font-size="9" text-anchor="middle">Emergency Interlock</text>

                    <path d="M 575 80 L 615 50" stroke="#34d399" stroke-width="1.5"/>
                    <rect x="615" y="25" width="115" height="50" rx="6" fill="#111827" stroke="#38bdf8" stroke-width="1.5"/>
                    <text x="672" y="47" fill="#fff" font-size="10" font-weight="bold" text-anchor="middle">Azimuth (RA)</text>
                    <text x="672" y="63" fill="#93c5fd" font-size="8.5" text-anchor="middle">ULN2003 + 28BYJ-48</text>

                    <path d="M 575 110 L 615 110" stroke="#34d399" stroke-width="1.5"/>
                    <rect x="615" y="85" width="115" height="50" rx="6" fill="#111827" stroke="#f43f5e" stroke-width="1.5"/>
                    <text x="672" y="107" fill="#fff" font-size="10" font-weight="bold" text-anchor="middle">Altitude (Dec)</text>
                    <text x="672" y="123" fill="#fda4af" font-size="8.5" text-anchor="middle">ULN2003 + 28BYJ-48</text>

                    <path d="M 575 140 L 615 170" stroke="#34d399" stroke-width="1.5"/>
                    <rect x="615" y="145" width="115" height="50" rx="6" fill="#111827" stroke="#a855f7" stroke-width="1.5"/>
                    <text x="672" y="167" fill="#fff" font-size="10" font-weight="bold" text-anchor="middle">Focus Motor</text>
                    <text x="672" y="183" fill="#d8b4fe" font-size="8.5" text-anchor="middle">ULN2003 + 28BYJ-48</text>
                </svg>
            </div>
        `,
        stack: ["Python 3.12", "PyQt6 Fluent", "Arduino Uno", "Embedded C", "Stellarium Protocol", "Astrometry", "ULN2003 Drivers", "Hardware Diagnostics"],
        repoUrl: "https://github.com/Hitesh070/Custom-GoTo-Telescope"
    },
    solar_simulator: {
        title: "HI Grid — Solar Power System Simulator",
        subtitle: "Computational Rooftop PV Physics & Indian Discom Net-Metering Engine",
        category: "Power & Energy Systems",
        description: "A physics-grade computational photovoltaic (PV) simulation platform specifically engineered for Indian residential and commercial rooftop solar installations. Simulates authentic flat RCC concrete terraces (chhat) with parapet walls and overhead tanks, evaluates real-time shadow casting using Three.js, and models 25-year Discom net-metering cash flows and PM Surya Ghar subsidies.",
        highlights: [
            "Authentic Indian flat RCC concrete terrace 3D architecture modeling parapet walls, mumty headroom, Sintex water tank, and elevated hot-dip GI strut mounting racks.",
            "Computational solar radiation physics utilizing Hay-Davies Plane of Array (POA) irradiance formulation and Sandia/King operating cell temperature equations.",
            "Interactive Leaflet GPS rooftop pinpoint map with live locality search and real-time satellite solar irradiance fetching via Open-Meteo API.",
            "India-specific Discom net-metering tariff models (BESCOM, BSES, MSEDCL, JVVNL, UGVCL) computing 25-year cumulative cash flow, LCOE, and PM Surya Ghar subsidies.",
            "Real-time Three.js 3D sun trajectory animation with accurate seasonal solar angles, shadow raytracing, and CEA carbon offset analytics."
        ],
        schematicSvg: `
            <div style="background:#080b12; border:1px solid rgba(245,158,11,0.3); border-radius:12px; padding:1.5rem; margin:1.5rem 0; text-align:center;">
                <h5 style="color:#f59e0b; font-family:var(--font-mono); font-size:0.85rem; margin-bottom:1rem; letter-spacing:0.05em;">COMPUTATIONAL PV PIPELINE &amp; 3D SIMULATION ARCHITECTURE</h5>
                <svg viewBox="0 0 740 200" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
                    <rect x="15" y="45" width="130" height="110" rx="8" fill="#241407" stroke="#f59e0b" stroke-width="1.5"/>
                    <text x="80" y="75" fill="#fde68a" font-size="11" font-weight="bold" text-anchor="middle">Leaflet GPS Map</text>
                    <text x="80" y="95" fill="#fff" font-size="10" text-anchor="middle">Open-Meteo API</text>
                    <text x="80" y="115" fill="#fcd34d" font-size="9" text-anchor="middle">GHI, DNI, DHI</text>
                    <text x="80" y="133" fill="#cbd5e1" font-size="8.5" text-anchor="middle">Wind &amp; Ambient Temp</text>

                    <path d="M 145 100 L 195 100" stroke="#f59e0b" stroke-width="2"/>

                    <rect x="195" y="40" width="160" height="120" rx="8" fill="#18181b" stroke="#38bdf8" stroke-width="1.5"/>
                    <text x="275" y="70" fill="#38bdf8" font-size="12" font-weight="bold" text-anchor="middle">PV Physics Engine</text>
                    <text x="275" y="92" fill="#fff" font-size="9.5" text-anchor="middle">Hay-Davies POA Model</text>
                    <text x="275" y="110" fill="#93c5fd" font-size="9" text-anchor="middle">Sandia King Cell Temp</text>
                    <text x="275" y="128" fill="#cbd5e1" font-size="9" text-anchor="middle">Thermal Power Derating</text>
                    <text x="275" y="146" fill="#cbd5e1" font-size="8.5" text-anchor="middle">Inverter Efficiency Curve</text>

                    <path d="M 355 100 L 405 100" stroke="#38bdf8" stroke-width="2"/>

                    <rect x="405" y="40" width="160" height="120" rx="8" fill="#0c2340" stroke="#60a5fa" stroke-width="1.5"/>
                    <text x="485" y="70" fill="#bfdbfe" font-size="12" font-weight="bold" text-anchor="middle">Three.js 3D Terrace</text>
                    <text x="485" y="92" fill="#fff" font-size="9.5" text-anchor="middle">Indian Flat RCC Roof</text>
                    <text x="485" y="110" fill="#93c5fd" font-size="9" text-anchor="middle">Parapet &amp; Tank Shadows</text>
                    <text x="485" y="128" fill="#cbd5e1" font-size="9" text-anchor="middle">Seasonal Sun Raytracing</text>
                    <text x="485" y="146" fill="#cbd5e1" font-size="8.5" text-anchor="middle">Elevated GI Strut Racks</text>

                    <path d="M 565 100 L 610 100" stroke="#34d399" stroke-width="2"/>

                    <rect x="610" y="45" width="115" height="110" rx="8" fill="#062817" stroke="#10b981" stroke-width="1.5"/>
                    <text x="667" y="75" fill="#a7f3d0" font-size="11" font-weight="bold" text-anchor="middle">Discom Tariff</text>
                    <text x="667" y="95" fill="#fff" font-size="9.5" text-anchor="middle">Net-Metering</text>
                    <text x="667" y="113" fill="#6ee7b7" font-size="9" text-anchor="middle">25-Yr LCOE ROI</text>
                    <text x="667" y="131" fill="#cbd5e1" font-size="8.5" text-anchor="middle">PM Surya Ghar</text>
                    <text x="667" y="147" fill="#cbd5e1" font-size="8.5" text-anchor="middle">CO₂ Offset Metric</text>
                </svg>
            </div>
        `,
        stack: ["React 18", "TypeScript", "Three.js", "Leaflet", "Tailwind CSS", "Vite", "Open-Meteo API", "PV Physics Engine"],
        repoUrl: "https://github.com/Hitesh070/Solar-Power-System-Simulator"
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
                const cat = card.getAttribute('data-category') || '';
                const categories = cat.split(/\s+/);
                if (filter === 'all' || categories.includes(filter)) {
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
      contactForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const nameInput = contactForm.querySelector('[name="name"]') || contactForm.querySelector('#name');
        const emailInput = contactForm.querySelector('[name="email"]') || contactForm.querySelector('#email');
        const messageInput = contactForm.querySelector('[name="message"]') || contactForm.querySelector('#message');
        const submitBtn = contactForm.querySelector('button[type="submit"]');

        const name = nameInput ? nameInput.value : '';
        const email = emailInput ? emailInput.value : '';
        const message = messageInput ? messageInput.value : '';

        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Opening Mail Client...';
        }

        const mailtoUrl = `mailto:hiteshvs616@gmail.com?subject=${encodeURIComponent('Portfolio Contact from ' + name)}&body=${encodeURIComponent('Name: ' + name + '\nEmail: ' + email + '\n\nMessage:\n' + message)}`;
        window.location.href = mailtoUrl;

        setTimeout(() => {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Message Ready ✓';
          }
          contactForm.reset();
        }, 1200);
      });
    }
  