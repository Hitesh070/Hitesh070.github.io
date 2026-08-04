/* ==========================================================================
   HITESH V S PORTFOLIO — CINEMATIC ENGINE & MAYBACH MOTION (VANILLA JS)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    initConstellationBackgroundCanvas();
    initTypingEffect();
    initNavbarAndScroll();
    initScrollRevealEngine();
    init3DMagneticTiltCards();
    initProjectFiltersAndModals();
    initContactFormAndCopy();
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

    function drawPulsingGrid() {
        const gridOpacity = 0.015 + Math.sin(time * 0.015) * 0.005;
        ctx.strokeStyle = `rgba(255, 255, 255, ${gridOpacity})`;
        ctx.lineWidth = 1;

        const gridSize = 120;
        for (let x = 0; x < width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }
        for (let y = 0; y < height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }
    }

    function animate() {
        time += 1;
        ctx.clearRect(0, 0, width, height);

        mouse.x += (mouse.targetX - mouse.x) * 0.04;
        mouse.y += (mouse.targetY - mouse.y) * 0.04;

        // Dynamic Grid
        drawPulsingGrid();

        // Nebula Blobs
        blobs.forEach((blob, i) => {
            const bx = width * blob.xRatio + Math.sin(time * blob.speedX + i) * 160;
            const by = height * blob.yRatio + Math.cos(time * blob.speedY + i) * 130;

            const grad = ctx.createRadialGradient(bx, by, 0, bx, by, blob.radius);
            grad.addColorStop(0, blob.color);
            grad.addColorStop(1, 'transparent');

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(bx, by, blob.radius, 0, Math.PI * 2);
            ctx.fill();
        });

        // Constellation Particles & Links
        for (let i = 0; i < particles.length; i++) {
            particles[i].update();
            particles[i].draw();

            for (let j = i + 1; j < particles.length; j++) {
                let dx = particles[i].x - particles[j].x;
                let dy = particles[i].y - particles[j].y;
                let dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < 130) {
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    let lineAlpha = (1 - dist / 130) * 0.15;
                    ctx.strokeStyle = `rgba(59, 130, 246, ${lineAlpha})`;
                    ctx.lineWidth = 0.8;
                    ctx.stroke();
                }
            }
        }

        // Interactive Cursor Energy Aura
        const mouseGrad = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 260);
        mouseGrad.addColorStop(0, 'rgba(59, 130, 246, 0.05)');
        mouseGrad.addColorStop(0.5, 'rgba(255, 42, 95, 0.02)');
        mouseGrad.addColorStop(1, 'transparent');

        ctx.fillStyle = mouseGrad;
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, 260, 0, Math.PI * 2);
        ctx.fill();

        requestAnimationFrame(animate);
    }

    resize();
    animate();
}

/* ==========================================================================
   2. MAYBACH SCROLL REVEAL ENGINE
   ========================================================================== */
function initScrollRevealEngine() {
    const reveals = document.querySelectorAll('.reveal-on-scroll');
    if (!reveals.length) return;

    const observerOptions = {
        root: null,
        rootMargin: '0px 0px -80px 0px',
        threshold: 0.15
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
            }
        });
    }, observerOptions);

    reveals.forEach(el => observer.observe(el));
}

/* ==========================================================================
   3. 3D MAGNETIC TILT CARD ENGINE
   ========================================================================== */
function init3DMagneticTiltCards() {
    const cards = document.querySelectorAll('.magnetic-card');

    cards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            const rotateX = ((y - centerY) / centerY) * -6; // max 6 deg
            const rotateY = ((x - centerX) / centerX) * 6;  // max 6 deg

            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)`;
        });
    });
}

/* ==========================================================================
   4. TYPING EFFECT
   ========================================================================== */
function initTypingEffect() {
    const roles = [
        "Embedded Systems & Robotics Engineer",
        "Verilog & Digital VLSI Designer",
        "Control & Power Electronics Specialist",
        "Carnatic Music Keyboard & Violinist",
        "Creative Video Editor & Graphic Designer"
    ];
    const outputEl = document.getElementById('typed-output');
    if (!outputEl) return;

    let roleIndex = 0;
    let charIndex = 0;
    let isDeleting = false;

    function type() {
        const currentRole = roles[roleIndex];

        if (isDeleting) {
            outputEl.textContent = currentRole.substring(0, charIndex - 1);
            charIndex--;
        } else {
            outputEl.textContent = currentRole.substring(0, charIndex + 1);
            charIndex++;
        }

        let speed = isDeleting ? 30 : 65;

        if (!isDeleting && charIndex === currentRole.length) {
            speed = 2200;
            isDeleting = true;
        } else if (isDeleting && charIndex === 0) {
            isDeleting = false;
            roleIndex = (roleIndex + 1) % roles.length;
            speed = 400;
        }

        setTimeout(type, speed);
    }

    type();
}

/* ==========================================================================
   5. NAVBAR & SCROLL BEHAVIOR
   ========================================================================== */
function initNavbarAndScroll() {
    const navbar = document.getElementById('navbar');
    const mobileBtn = document.getElementById('mobile-menu-btn');
    const navLinks = document.getElementById('nav-links');
    const backToTop = document.getElementById('back-to-top');

    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    if (mobileBtn && navLinks) {
        mobileBtn.addEventListener('click', () => {
            navLinks.classList.toggle('mobile-open');
        });

        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => navLinks.classList.remove('mobile-open'));
        });
    }

    if (backToTop) {
        backToTop.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
}

/* ==========================================================================
   6. PROJECT DETAILS MAP & MODALS (6 GRAPHIC COVERS)
   ========================================================================== */
const projectDetailsMap = {
    alps: {
        title: "ALPS — Autonomous Aquatic Waste Skimmer USV",
        subtitle: "Vision-Based Water Trash Detection & Autonomous Navigation",
        category: "Embedded & Robotics",
        img: "assets/project1.jpg",
        description: "ALPS is an autonomous unmanned surface vehicle (USV) designed to clear floating debris from water bodies. It integrates Raspberry Pi vision-based trash detection, an extendable robotic collection arm, and autonomous path tracking.",
        highlights: [
            "Vision-based trash detection pipeline using Raspberry Pi camera and custom ML model.",
            "Extendable robotic arm mechanism for debris retrieval and collection bin storage.",
            "Motor driver power distribution and sensor feedback telemetry.",
            "Detailed BOM, CAD modeling, and TRL (Technology Readiness Level) report."
        ],
        stack: ["Python", "Embedded C", "Raspberry Pi", "OpenCV / ML", "CAD Modeling", "Motor Drivers"],
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
            "Comparison against conventional Carry Lookahead (CLA) and Ripple Carry Adders (RCA)."
        ],
        stack: ["Verilog HDL", "ModelSim", "Python", "MATLAB", "Digital Electronics", "Edge Computing"],
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
    }
};

function initProjectFiltersAndModals() {
    const filterBtns = document.querySelectorAll('.proj-filter-pill');
    const projectCards = document.querySelectorAll('.project-editorial-card');
    const modalOverlay = document.getElementById('project-modal-overlay');
    const modalCloseBtn = document.getElementById('modal-close-btn');
    const modalBody = document.getElementById('modal-body');

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const filter = btn.getAttribute('data-proj-filter');
            projectCards.forEach(card => {
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

            modalBody.innerHTML = `
                <div style="margin-bottom:1.5rem;">
                    <span class="project-tag-badge" style="position:static; display:inline-block; margin-bottom:0.8rem;">${data.category}</span>
                    <h2 style="font-size: 1.8rem; font-weight:400; margin-bottom: 0.4rem;">${data.title}</h2>
                    <p style="color: var(--accent-blue); font-family: var(--font-mono); font-size: 0.9rem;">${data.subtitle}</p>
                </div>
                ${data.img ? `<img src="${data.img}" alt="${data.title}" style="width:100%; border-radius:var(--radius-md); margin-bottom:1.5rem; border:1px solid var(--border-subtle);">` : ''}
                <p style="font-size: 1rem; color: var(--text-secondary); margin-bottom: 1.5rem; line-height:1.7;">${data.description}</p>
                
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
        modalCloseBtn.addEventListener('click', () => modalOverlay.classList.remove('active'));
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) modalOverlay.classList.remove('active');
        });
    }
}

/* ==========================================================================
   7. CONTACT FORM HANDLER
   ========================================================================== */
function initContactFormAndCopy() {
    const form = document.getElementById('contact-form');
    const statusMsg = document.getElementById('form-status-msg');
    const copyBtns = document.querySelectorAll('[data-copy]');

    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();

            const name = document.getElementById('name').value.trim();
            const email = document.getElementById('email').value.trim();
            const subject = document.getElementById('subject').value;
            const message = document.getElementById('message').value.trim();

            const submitBtn = document.getElementById('submit-form-btn');
            const originalText = submitBtn.innerHTML;

            submitBtn.disabled = true;
            submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Processing...`;

            setTimeout(() => {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;

                if (statusMsg) {
                    statusMsg.style.display = 'block';
                    statusMsg.innerHTML = `
                        <div style="display:flex; align-items:flex-start; gap:0.8rem;">
                            <i class="fa-solid fa-circle-check text-blue" style="font-size:1.4rem; margin-top:0.1rem;"></i>
                            <div>
                                <strong style="color:#ffffff;">Message Sent Successfully!</strong>
                                <p style="margin-top:0.3rem; font-size:0.85rem; color:var(--text-secondary);">
                                    Thank you, <strong>${escapeHTML(name)}</strong>. Your message regarding "<strong>${escapeHTML(subject)}</strong>" has been logged and dispatched to Hitesh at <a href="mailto:hiteshvs616@gmail.com" style="color:var(--accent-blue);">hiteshvs616@gmail.com</a>.
                                </p>
                            </div>
                        </div>
                    `;
                }

                showToast(`Thank you ${name}, your message was sent!`);

                const mailtoUrl = `mailto:hiteshvs616@gmail.com?subject=${encodeURIComponent(subject + ' - ' + name)}&body=${encodeURIComponent(message + '\n\nFrom: ' + name + ' (' + email + ')')}`;
                window.location.href = mailtoUrl;

                form.reset();
            }, 1000);
        });
    }

    copyBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const textToCopy = btn.getAttribute('data-copy');
            navigator.clipboard.writeText(textToCopy).then(() => {
                showToast("Email copied to clipboard!");
            });
        });
    });
}

function escapeHTML(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function showToast(message) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<i class="fa-solid fa-circle-check text-blue"></i> <span>${message}</span>`;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(50px)';
        toast.style.transition = 'all 0.3s';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
