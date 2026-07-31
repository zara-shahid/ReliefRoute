"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import * as THREE from "three";

/* ─────────────────────────────────────────────────────────────────────────────
   3D GLOBE — Mouse Parallax + Layered Atmosphere
───────────────────────────────────────────────────────────────────────────── */
function ThreeGlobe() {
  const mountRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let width = container.clientWidth;
    let height = container.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 1000);
    camera.position.z = 230;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    const R = 78;

    // Inner dark core
    globeGroup.add(new THREE.Mesh(
      new THREE.SphereGeometry(R - 0.5, 64, 64),
      new THREE.MeshBasicMaterial({ color: 0x010308 })
    ));

    // High-tech dotted surface
    const dotGeo = new THREE.IcosahedronGeometry(R, 12);
    const dotMat = new THREE.PointsMaterial({ color: 0x0ea5e9, size: 0.4, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending });
    globeGroup.add(new THREE.Points(dotGeo, dotMat));

    // Lat/lng holographic rings
    const ringMat = new THREE.LineBasicMaterial({ color: 0x0284c7, transparent: true, opacity: 0.15, blending: THREE.AdditiveBlending });
    for (let lat = -80; lat <= 80; lat += 20) {
      const rad = (lat * Math.PI) / 180;
      const r = R * Math.cos(rad);
      const y = R * Math.sin(rad);
      const pts: THREE.Vector3[] = [];
      for (let j = 0; j <= 90; j++) {
        const t = (j / 90) * Math.PI * 2;
        pts.push(new THREE.Vector3(r * Math.cos(t), y, r * Math.sin(t)));
      }
      globeGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), ringMat));
    }

    // Layered neon atmosphere
    [[5, 0x0ea5e9, 0.08], [12, 0x0284c7, 0.05], [25, 0xef4444, 0.02]].forEach(([d, col, op]) => {
      globeGroup.add(new THREE.Mesh(
        new THREE.SphereGeometry(R + (d as number), 48, 48),
        new THREE.MeshBasicMaterial({ color: col as number, transparent: true, opacity: op as number, side: THREE.BackSide, blending: THREE.AdditiveBlending })
      ));
    });

    function latLngToVec3(lat: number, lng: number, radius: number) {
      const phi = (90 - lat) * (Math.PI / 180);
      const theta = (lng + 180) * (Math.PI / 180);
      return new THREE.Vector3(
        -(radius * Math.sin(phi) * Math.cos(theta)),
        radius * Math.cos(phi),
        radius * Math.sin(phi) * Math.sin(theta)
      );
    }

    // Mix of Cyan and Red for cyberpunk aesthetic
    const locations = [
      { lat: 37.77, lng: -122.42, color: 0xef4444 },
      { lat: 51.5, lng: -0.12, color: 0x0ea5e9 },
      { lat: 35.68, lng: 139.65, color: 0xef4444 },
      { lat: -1.29, lng: 36.82, color: 0x0ea5e9 },
      { lat: 23.81, lng: 90.41, color: 0xef4444 },
      { lat: 18.59, lng: -72.3, color: 0xef4444 },
      { lat: 27.72, lng: 85.32, color: 0x0ea5e9 },
      { lat: -33.87, lng: 151.21, color: 0xef4444 },
    ];

    const hub = latLngToVec3(20.59, 78.96, R);
    // Hub glow
    const hubMesh = new THREE.Mesh(new THREE.SphereGeometry(2.5, 16, 16), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    hubMesh.position.copy(hub);
    globeGroup.add(hubMesh);
    const hubGlow = new THREE.Mesh(new THREE.SphereGeometry(4.5, 16, 16), new THREE.MeshBasicMaterial({ color: 0x0ea5e9, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending }));
    hubGlow.position.copy(hub);
    globeGroup.add(hubGlow);

    const particles: { mesh: THREE.Mesh; curve: THREE.QuadraticBezierCurve3; t: number; speed: number }[] = [];

    locations.forEach((loc, i) => {
      const target = latLngToVec3(loc.lat, loc.lng, R);

      // Core marker
      const marker = new THREE.Mesh(new THREE.SphereGeometry(1.2, 12, 12), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      marker.position.copy(target);
      globeGroup.add(marker);

      // Outer glowing ring beacon
      const beacon = new THREE.Mesh(
        new THREE.RingGeometry(1.8, 3.6, 24),
        new THREE.MeshBasicMaterial({ color: loc.color, side: THREE.DoubleSide, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending })
      );
      beacon.position.copy(target);
      beacon.lookAt(new THREE.Vector3(0, 0, 0));
      globeGroup.add(beacon);

      // Glowing data connection arc
      const mid = new THREE.Vector3().addVectors(hub, target).multiplyScalar(0.5);
      mid.setLength(R + hub.distanceTo(target) * 0.35);
      const curve = new THREE.QuadraticBezierCurve3(hub, mid, target);

      globeGroup.add(new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(curve.getPoints(50)),
        new THREE.LineBasicMaterial({ color: loc.color, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending })
      ));

      // Packet particle moving along the arc
      const pMesh = new THREE.Mesh(new THREE.SphereGeometry(1.5, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending }));
      globeGroup.add(pMesh);
      particles.push({ mesh: pMesh, curve, t: Math.random(), speed: 0.003 + (i % 3) * 0.001 });
    });

    globeGroup.rotation.x = 0.32;
    globeGroup.rotation.y = 1.1;

    let animId: number;
    const clock = new THREE.Clock();
    let baseRotY = 1.1;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const dt = clock.getDelta();
      baseRotY += 0.12 * dt;
      globeGroup.rotation.y = baseRotY + mouseRef.current.x * 0.15;
      globeGroup.rotation.x = 0.32 + mouseRef.current.y * 0.08;
      particles.forEach((p) => { p.t += p.speed; if (p.t > 1) p.t = 0; p.mesh.position.copy(p.curve.getPoint(p.t)); });
      renderer.render(scene, camera);
    };
    animate();

    const onMouse = (e: MouseEvent) => {
      mouseRef.current.x = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseRef.current.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("mousemove", onMouse);

    const onResize = () => {
      if (!container) return;
      width = container.clientWidth; height = container.clientHeight;
      camera.aspect = width / height; camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("mousemove", onMouse);
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(animId);
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, []);

  return <div ref={mountRef} className="w-full h-full absolute inset-0 pointer-events-none" />;
}

/* ─────────────────────────────────────────────────────────────────────────────
   TILT CARD (3D hover + gradient border + glass)
───────────────────────────────────────────────────────────────────────────── */
function TiltCard({ children, className = "", glowColor = "rgba(14,165,233,0.15)", style = {} }: {
  children: React.ReactNode; className?: string; glowColor?: string; style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current; if (!el) return;
    const rect = el.getBoundingClientRect();
    const rx = ((e.clientY - rect.top - rect.height / 2) / rect.height) * -5;
    const ry = ((e.clientX - rect.left - rect.width / 2) / rect.width) * 5;
    el.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(5px)`;
  };
  const onLeave = () => {
    if (ref.current) ref.current.style.transform = "perspective(900px) rotateX(0deg) rotateY(0deg) translateZ(0px)";
  };

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={`relative group ${className}`}
      style={{
        transition: "transform 0.18s cubic-bezier(0.33,1,0.68,1)",
        background: "linear-gradient(90deg, rgba(14,165,233,0.05), transparent)",
        border: "1px solid rgba(14,165,233,0.2)",
        borderLeft: "3px solid #0ea5e9",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        transformStyle: "preserve-3d",
        clipPath: "polygon(0 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%)",
        ...style,
      }}
    >
      <div
        className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: `radial-gradient(ellipse at 0% 0%, ${glowColor}, transparent 70%)` }}
      />
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   COUNT-UP HOOK
───────────────────────────────────────────────────────────────────────────── */
function useCountUp(target: number, duration = 1400, started = false) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!started) return;
    let start: number | null = null;
    const step = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      setVal(Math.round((1 - Math.pow(1 - p, 3)) * target));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [started, target, duration]);
  return val;
}

/* ─────────────────────────────────────────────────────────────────────────────
   STAT CARD
───────────────────────────────────────────────────────────────────────────── */
function StatCard({ numericVal, display, label, suffix = "" }: {
  numericVal?: number; display?: string; label: string; suffix?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const count = useCountUp(numericVal ?? 0, 1400, inView);

  useEffect(() => {
    const el = ref.current;
    if (!el || !numericVal) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect(); } }, { threshold: 0.5 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [numericVal]);

  return (
    <div ref={ref} style={{
      padding: "1rem 1.2rem",
      background: "rgba(14,165,233,0.03)",
      border: "1px solid rgba(14,165,233,0.15)",
      borderTop: "2px solid #0ea5e9",
    }}>
      <div className="font-mono-custom" style={{
        fontSize: "clamp(1.5rem, 2.5vw, 2.2rem)", fontWeight: 700,
        color: "#0ea5e9", textShadow: "0 0 10px rgba(14,165,233,0.5)",
        marginBottom: 4,
      }}>
        {display ?? (inView ? `${count}${suffix}` : `0${suffix}`)}
      </div>
      <div className="font-mono-custom" style={{ fontSize: "0.6rem", color: "#94a3b8", letterSpacing: "0.1em", textTransform: "uppercase" }}>{label}</div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   SCROLL-REVEAL HOOK
───────────────────────────────────────────────────────────────────────────── */
function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    el.style.opacity = "0"; el.style.transform = "translateY(40px)";
    el.style.transition = "opacity 0.85s cubic-bezier(0.16,1,0.3,1), transform 0.85s cubic-bezier(0.16,1,0.3,1)";
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { el.style.opacity = "1"; el.style.transform = "translateY(0)"; obs.disconnect(); }
    }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
}

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────────────────────────────────────── */
export default function LandingPage() {
  const [navShrunk, setNavShrunk] = useState(false);

  useEffect(() => {
    const el = document.getElementById("scroll-root");
    if (!el) return;
    const onScroll = () => setNavShrunk(el.scrollTop > 60);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  // Stagger observer for cards
  useEffect(() => {
    const cards = Array.from(document.querySelectorAll("[data-stagger]")) as HTMLElement[];
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const el = entry.target as HTMLElement;
          const delay = parseFloat(el.dataset.stagger ?? "0");
          setTimeout(() => { el.style.opacity = "1"; el.style.transform = "translateY(0)"; }, delay * 1000);
          obs.unobserve(el);
        }
      });
    }, { threshold: 0.1 });
    cards.forEach((c) => {
      c.style.opacity = "0"; c.style.transform = "translateY(36px)";
      c.style.transition = "opacity 0.75s cubic-bezier(0.16,1,0.3,1), transform 0.75s cubic-bezier(0.16,1,0.3,1)";
      obs.observe(c);
    });
    return () => obs.disconnect();
  }, []);

  const heroRef = useScrollReveal();
  const problemRef = useScrollReveal();
  const pipelineRef = useScrollReveal();
  const vrpRef = useScrollReveal();
  const techRef = useScrollReveal();
  const ctaRef = useScrollReveal();

  const navH = navShrunk ? 56 : 76;

  return (
    <div
      id="scroll-root"
      style={{ height: "100vh", overflowY: "auto", overflowX: "hidden", background: "#030712", color: "#f0f6ff", scrollBehavior: "smooth" }}
    >
      {/* ══ Layered background ══ */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        {/* Perspective grid */}
        <div style={{
          position: "absolute", inset: 0,
          opacity: 0.4,
          backgroundImage: "linear-gradient(to right,rgba(30,42,71,0.11) 1px,transparent 1px),linear-gradient(to bottom,rgba(30,42,71,0.11) 1px,transparent 1px)",
          backgroundSize: "60px 60px",
          maskImage: "linear-gradient(to bottom,transparent,black 12%,black 72%,transparent)",
        }} />
        {/* Ambient orbs */}
        <div style={{ position: "absolute", top: "-5%", left: "18%", width: 800, height: 500, background: "radial-gradient(ellipse,rgba(59,130,246,0.09),transparent 70%)", borderRadius: "50%" }} />
        <div style={{ position: "absolute", top: "35%", right: "-8%", width: 600, height: 600, background: "radial-gradient(ellipse,rgba(236,72,153,0.08),transparent 70%)", borderRadius: "50%" }} />
        <div style={{ position: "absolute", bottom: "-8%", left: "-5%", width: 700, height: 700, background: "radial-gradient(ellipse,rgba(99,102,241,0.09),transparent 70%)", borderRadius: "50%" }} />
        {/* Vignette */}
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center,transparent 40%,rgba(3,7,18,0.75) 100%)" }} />
      </div>

      {/* ══ NAVBAR ══ */}
      <header style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
        height: navH, background: navShrunk ? "rgba(3,7,18,0.95)" : "rgba(3,7,18,0.55)",
        backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 max(2rem, 4vw)",
        transition: "height 0.4s cubic-bezier(0.16,1,0.3,1), background 0.3s ease",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div className="font-mono-custom" style={{
            width: 36, height: 36, fontSize: 18, fontWeight: 900,
            background: "rgba(239,68,68,0.1)",
            border: "1px solid #ef4444",
            color: "#ef4444",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 10px rgba(239,68,68,0.3)"
          }}>R</div>
          <div>
            <span className="font-display" style={{ fontSize: "1.05rem", fontWeight: 700, letterSpacing: "-0.02em", color: "#fff" }}>ReliefRoute</span>
            <span className="font-mono-custom" style={{ marginLeft: 8, fontSize: "0.55rem", letterSpacing: "0.14em", color: "#0ea5e9" }}>[ AI OPS ]</span>
          </div>
        </div>
        <nav style={{ display: "flex", gap: "2rem" }}>
          {[["#overview", "Overview"], ["#pipeline", "AI Pipeline"], ["#optimization", "VRP Engine"], ["#tech", "Tech"]].map(([href, lbl]) => (
            <a key={href} href={href} className="font-mono-custom" style={{ fontSize: "0.68rem", letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "rgba(148,163,184,0.8)", textDecoration: "none", transition: "all 0.2s" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#0ea5e9"; e.currentTarget.style.textShadow = "0 0 8px rgba(14,165,233,0.5)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(148,163,184,0.8)"; e.currentTarget.style.textShadow = "none"; }}
            >{lbl}</a>
          ))}
        </nav>
        <Link href="/dashboard" style={{
          display: "inline-flex", alignItems: "center", gap: 8, padding: "0.5rem 1.2rem",
          fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "#fff",
          background: "linear-gradient(135deg,rgba(14,165,233,0.2),rgba(239,68,68,0.2))",
          border: "1px solid #0ea5e9", borderRight: "3px solid #ef4444",
          textDecoration: "none", transition: "all 0.2s ease", fontFamily: "'DM Mono',monospace"
        }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 0 15px rgba(14,165,233,0.4)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "none"; }}
        >[ LAUNCH CMD ] →</Link>
      </header>

      {/* ══ HERO ══ */}
      <section id="overview" style={{ position: "relative", minHeight: "100vh", display: "flex", alignItems: "center", overflow: "hidden", paddingTop: navH }}>
        {/* Globe — right side */}
        <div style={{ position: "absolute", right: "-6%", top: "50%", transform: "translateY(-50%)", width: "64vw", maxWidth: 820, height: "88vh", pointerEvents: "none" }}>
          <ThreeGlobe />
        </div>

        {/* Left-aligned text block */}
        <div ref={heroRef} style={{ position: "relative", zIndex: 10, maxWidth: 640, padding: "0 4rem 0 max(4rem, 5vw)" }}>
          <div className="kicker" style={{ marginBottom: "1.5rem" }}>
            <span style={{ color: "#f87171", animation: "pulse 2s infinite" }}>●</span>
            Autonomous Disaster Relief Logistics
          </div>

          {/* Cyberpunk Glitch & Neon Styling */}
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes glitch {
              0% { clip-path: inset(20% 0 80% 0); transform: translate(-2px, 2px); }
              20% { clip-path: inset(60% 0 10% 0); transform: translate(2px, -2px); }
              40% { clip-path: inset(40% 0 50% 0); transform: translate(-2px, 1px); }
              60% { clip-path: inset(80% 0 5% 0); transform: translate(1px, -1px); }
              80% { clip-path: inset(10% 0 70% 0); transform: translate(-1px, 2px); }
              100% { clip-path: inset(30% 0 50% 0); transform: translate(2px, -2px); }
            }
            .cyber-glitch::before {
              content: attr(data-text);
              position: absolute;
              left: -2px;
              text-shadow: 2px 0 #0ff;
              top: 0;
              color: white;
              background: transparent;
              overflow: hidden;
              animation: glitch 5s infinite linear alternate-reverse;
              z-index: 2;
              pointer-events: none;
            }
            .cyber-glitch::after {
              content: attr(data-text);
              position: absolute;
              left: 2px;
              text-shadow: -2px 0 #f00;
              top: 0;
              color: white;
              background: transparent;
              overflow: hidden;
              animation: glitch 4s infinite linear alternate-reverse;
              z-index: 1;
              pointer-events: none;
            }
          `}} />

          <h1 style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "2.5rem" }}>
            <span className="font-mono-custom" style={{ 
              fontSize: "clamp(1rem, 2vw, 1.2rem)", 
              fontWeight: 600, 
              color: "#0ea5e9", 
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              display: "flex",
              alignItems: "center",
              gap: "0.8rem"
            }}>
              <span style={{ width: "2rem", height: 2, background: "#0ea5e9", boxShadow: "0 0 10px #0ea5e9" }}></span>
              SYS.OP // ROUTING RELIEF
            </span>
            
            <div style={{ position: "relative", padding: "1rem 2rem", borderLeft: "3px solid #ef4444", background: "linear-gradient(90deg, rgba(239,68,68,0.1), transparent)", marginLeft: "1rem" }}>
              <div style={{ position: "absolute", top: 0, left: 0, width: "12px", height: "12px", borderTop: "2px solid #ef4444", borderLeft: "2px solid #ef4444" }} />
              <div style={{ position: "absolute", bottom: 0, left: 0, width: "12px", height: "12px", borderBottom: "2px solid #ef4444", borderLeft: "2px solid #ef4444" }} />
              
              <span className="font-display cyber-glitch" data-text="WHERE IT MATTERS," style={{ 
                position: "relative", 
                fontSize: "clamp(3rem, 6vw, 5.5rem)", 
                fontWeight: 900, 
                letterSpacing: "0.02em", 
                color: "transparent",
                WebkitTextStroke: "2px rgba(255,255,255,0.9)",
                textShadow: "0 0 15px rgba(255,255,255,0.3), 0 0 30px rgba(14,165,233,0.5), 0 0 50px rgba(239,68,68,0.5)",
                lineHeight: 1.1,
                display: "inline-block"
              }}>
                WHERE IT MATTERS,
              </span>
            </div>

            <span className="font-mono-custom" style={{ 
              fontSize: "clamp(1rem, 2vw, 1.2rem)", 
              fontWeight: 600, 
              color: "#ef4444", 
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              marginLeft: "1rem"
            }}>
              <span style={{ color: "#94a3b8" }}>[</span> IN REAL TIME. <span style={{ color: "#94a3b8" }}>]</span>
            </span>
          </h1>

          <div style={{ width: "3rem", height: 2, background: "linear-gradient(to right,#ef4444,transparent)", marginBottom: "1.25rem" }} />

          <p style={{ fontSize: "0.95rem", color: "rgba(148,163,184,0.82)", lineHeight: 1.75, maxWidth: 460, marginBottom: "2rem", fontWeight: 300 }}>
            Real-time VRPTW optimization paired with an agentic AI pipeline.
            Multi-source crisis intake to vehicle route dispatch in under 3 seconds.
          </p>

          <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
            <Link href="/dashboard" style={{
              display: "inline-flex", alignItems: "center", gap: 10, padding: "0.9rem 2rem", 
              fontSize: "0.82rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "#fff",
              background: "linear-gradient(135deg,rgba(14,165,233,0.3),rgba(239,68,68,0.3))",
              border: "1px solid #0ea5e9",
              borderRight: "4px solid #ef4444",
              textDecoration: "none",
              transition: "all 0.2s cubic-bezier(0.33,1,0.68,1)",
              fontFamily: "'DM Mono',monospace"
            }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 0 15px rgba(14,165,233,0.5)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "none"; }}
            >[ INITIALIZE SYSTEM ]</Link>
            <a href="#pipeline" style={{
              display: "inline-flex", alignItems: "center", gap: 8, padding: "0.9rem 1.75rem", 
              fontSize: "0.82rem", fontWeight: 600, color: "#0ea5e9",
              background: "rgba(15,23,42,0.7)", border: "1px solid rgba(14,165,233,0.3)",
              textDecoration: "none", backdropFilter: "blur(12px)", transition: "all 0.2s",
              fontFamily: "'DM Mono',monospace", letterSpacing: "0.05em",
            }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#0ea5e9"; e.currentTarget.style.background = "rgba(14,165,233,0.1)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(14,165,233,0.3)"; e.currentTarget.style.background = "rgba(15,23,42,0.7)"; }}
            >VIEW ARCHITECTURE</a>
          </div>

          {/* Count-up stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginTop: "3.5rem" }}>
            <StatCard numericVal={40} suffix="%" label="Distance Saved" />
            <StatCard numericVal={22} suffix="+" label="Live Sites" />
            <StatCard numericVal={6} label="Active Fleet" />
            <StatCard display="< 3s" label="Solver Latency" />
          </div>
        </div>
      </section>

      {/* ══ PROBLEM SECTION ══ */}
      <section style={{ position: "relative", zIndex: 10, padding: "8rem max(2rem,5vw)", maxWidth: 1400, margin: "0 auto" }}>
        <span className="font-mono-custom" style={{ position: "absolute", top: "1rem", right: "3vw", fontSize: "15vw", fontWeight: 900, color: "transparent", WebkitTextStroke: "2px rgba(255,255,255,0.03)", userSelect: "none" }}>01</span>

        <div ref={problemRef} style={{ maxWidth: 480, marginBottom: "3.5rem" }}>
          <div className="font-mono-custom" style={{ marginBottom: "1rem", color: "#ef4444", fontSize: "0.75rem", letterSpacing: "0.2em" }}>[ OPERATION CRISIS ]</div>
          <h2 className="font-display" style={{ fontSize: "clamp(1.8rem, 3.5vw, 3rem)", fontWeight: 800, letterSpacing: "-0.03em", color: "#fff", lineHeight: 1.1 }}>
            The Chaos of<br />
            <span style={{ background: "linear-gradient(100deg,#ef4444,#0ea5e9)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Relief Logistics</span>
          </h2>
          <div style={{ width: "3rem", height: 2, background: "linear-gradient(to right,#ef4444,transparent)", margin: "1rem 0" }} />
          <p style={{ color: "rgba(148,163,184,0.72)", lineHeight: 1.75, fontSize: "0.88rem", fontWeight: 300 }}>
            Manual dispatch relies on static spreadsheets and delayed radio reports, leading to overlapping routes and wasted rescue windows.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20 }}>
          {[
            { num: "01", title: "Unstructured Report Triage", desc: "Disaster reports enter via social posts, voice notes, and raw SMS. Manual triage takes hours to estimate supply demands.", glow: "rgba(239,68,68,0.18)", accent: "#ef4444", d: 0 },
            { num: "02", title: "Suboptimal Route Allocation", desc: "Relief trucks cross paths without coordinate optimization, doubling fuel consumption and delaying critical aid delivery.", glow: "rgba(245,158,11,0.18)", accent: "#f59e0b", d: 0.12 },
            { num: "03", title: "Static Fleet Management", desc: "When site priorities shift dynamically, legacy systems fail to recalculate vehicle time windows in real time.", glow: "rgba(99,102,241,0.18)", accent: "#6366f1", d: 0.24 },
          ].map((c) => (
            <TiltCard key={c.num} className="p-8" glowColor={c.glow} style={{ position: "relative" }} data-stagger={c.d}>
              <span style={{ position: "absolute", top: -16, right: 20, fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: "5.5rem", color: "rgba(255,255,255,0.04)", lineHeight: 1, userSelect: "none" }}>{c.num}</span>
              <div style={{ marginBottom: "1.2rem", fontFamily: "'DM Mono',monospace", fontWeight: 700, fontSize: "0.8rem", color: c.accent }}>[ {c.num} ]</div>
              <h4 className="font-display" style={{ fontSize: "1.1rem", fontWeight: 700, color: "#fff", marginBottom: "0.7rem" }}>{c.title}</h4>
              <p style={{ fontSize: "0.82rem", color: "rgba(148,163,184,0.72)", lineHeight: 1.72, fontWeight: 300 }}>{c.desc}</p>
            </TiltCard>
          ))}
        </div>
      </section>

      {/* ══ PIPELINE ══ */}
      <section id="pipeline" style={{ position: "relative", zIndex: 10, padding: "8rem max(2rem,5vw)", borderTop: "1px solid rgba(255,255,255,0.05)", background: "linear-gradient(to bottom,transparent,rgba(6,9,20,0.6),transparent)" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto" }}>
          <span className="font-mono-custom" style={{ position: "absolute", top: 0, left: "2vw", fontSize: "15vw", fontWeight: 900, color: "transparent", WebkitTextStroke: "2px rgba(255,255,255,0.03)", userSelect: "none" }}>02</span>

          <div ref={pipelineRef} style={{ textAlign: "right", marginBottom: "3.5rem" }}>
            <div className="font-mono-custom" style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1rem", color: "#0ea5e9", fontSize: "0.75rem", letterSpacing: "0.2em" }}>[ MULTI-AGENT INTELLIGENCE ]</div>
            <h2 className="font-display" style={{ fontSize: "clamp(1.8rem, 3.5vw, 3rem)", fontWeight: 800, letterSpacing: "-0.03em", color: "#fff", lineHeight: 1.1 }}>
              The 4-Stage<br />
              <span style={{ background: "linear-gradient(100deg,#0ea5e9,#ef4444)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Autonomous Pipeline</span>
            </h2>
            <div style={{ width: "3rem", height: 2, background: "linear-gradient(to left,#0ea5e9,transparent)", margin: "1rem 0 1rem auto" }} />
            <p style={{ color: "rgba(148,163,184,0.72)", lineHeight: 1.7, fontSize: "0.88rem", fontWeight: 300, maxWidth: 360, marginLeft: "auto" }}>Powered by LangGraph multi-agent orchestration and Gemini AI.</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }}>
            {[
              { step: "01", title: "Intake Agent", desc: "Extracts coordinates, urgency metrics, and supply requirements from unstructured field text and multi-channel inputs.", badge: "Gemini 2.5", accent: "#38bdf8", glow: "rgba(56,189,248,0.15)", d: 0 },
              { step: "02", title: "Prioritization Agent", desc: "Ranks disaster zones 0–100 by population density, severity, and urgency time-caps with dynamic reweighting.", badge: "Urgency Model", accent: "#818cf8", glow: "rgba(129,140,248,0.15)", d: 0.1 },
              { step: "03", title: "VRP Solver Agent", desc: "Solves vehicle routing with capacity and time windows using mathematical constraint programming in real time.", badge: "OR-Tools", accent: "#f97316", glow: "rgba(249,115,22,0.15)", d: 0.2 },
              { step: "04", title: "Dispatch Agent", desc: "Issues turn-by-turn vehicle manifests and monitors real-time GPS telemetry streams for live rerouting.", badge: "Live Reroute", accent: "#34d399", glow: "rgba(52,211,153,0.15)", d: 0.3 },
            ].map((a) => (
              <TiltCard key={a.step} className="p-6 flex flex-col" glowColor={a.glow} data-stagger={a.d}>
                <div className="font-display" style={{ fontSize: "2.8rem", fontWeight: 800, color: a.accent, opacity: 0.22, lineHeight: 1, marginBottom: "1rem", letterSpacing: "-0.04em" }}>{a.step}</div>
                <div style={{ display: "inline-flex", marginBottom: "0.7rem", fontFamily: "'DM Mono',monospace", fontSize: "0.6rem", letterSpacing: "0.1em", textTransform: "uppercase" as const, color: a.accent, borderBottom: `1px solid ${a.accent}40`, paddingBottom: 4 }}>{`> MODEL: ${a.badge}`}</div>
                <h4 className="font-display" style={{ fontSize: "1rem", fontWeight: 700, color: "#fff", marginBottom: "0.55rem" }}>{a.title}</h4>
                <p style={{ fontSize: "0.78rem", color: "rgba(148,163,184,0.7)", lineHeight: 1.72, fontWeight: 300, flex: 1 }}>{a.desc}</p>
                <div style={{ marginTop: "1.4rem", height: 1, background: `linear-gradient(to right,${a.accent}40,transparent)` }} />
              </TiltCard>
            ))}
          </div>
        </div>
      </section>

      {/* ══ VRP ENGINE ══ */}
      <section id="optimization" style={{ position: "relative", zIndex: 10, padding: "8rem max(2rem,5vw)", borderTop: "1px solid rgba(255,255,255,0.05)", maxWidth: 1400, margin: "0 auto" }}>
        <span className="font-mono-custom" style={{ position: "absolute", top: "1rem", right: "2vw", fontSize: "15vw", fontWeight: 900, color: "transparent", WebkitTextStroke: "2px rgba(255,255,255,0.03)", userSelect: "none" }}>03</span>

        <div ref={vrpRef} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5rem", alignItems: "center" }}>
          <div>
            <div className="font-mono-custom" style={{ marginBottom: "1rem", color: "#ef4444", fontSize: "0.75rem", letterSpacing: "0.2em" }}>[ CONSTRAINT PROGRAMMING ]</div>
            <h2 className="font-display" style={{ fontSize: "clamp(1.8rem, 3vw, 2.8rem)", fontWeight: 800, letterSpacing: "-0.03em", color: "#fff", lineHeight: 1.12, marginBottom: "1rem" }}>
              Real Road Networks.<br />
              <span style={{ background: "linear-gradient(100deg,#ef4444,#0ea5e9)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Optimal Routes.</span>
            </h2>
            <div style={{ width: "3rem", height: 2, background: "linear-gradient(to right,#ef4444,transparent)", marginBottom: "1.25rem" }} />
            <p style={{ color: "rgba(148,163,184,0.75)", lineHeight: 1.75, fontSize: "0.88rem", fontWeight: 300, maxWidth: 400, marginBottom: "2rem" }}>
              Google OR-Tools solves VRPTW using real OSRM driving distances and dispatches optimized manifests in under 3 seconds — for any number of active disaster sites.
            </p>
            {[
              ["OSRM Road Network", "Real turn-by-turn driving distances"],
              ["Capacity Constraints", "Per-vehicle payload optimization"],
              ["Time Window Scoring", "Urgency-weighted priority ranking"],
              ["Greedy Fallback", "Resilient solver for degraded mode"],
            ].map(([lbl, detail]) => (
              <div key={lbl} style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: "0.9rem" }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#f97316", marginTop: 7, flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 600, color: "#fff", fontSize: "0.83rem" }}>{lbl}</div>
                  <div style={{ color: "rgba(148,163,184,0.6)", fontSize: "0.77rem", fontWeight: 300 }}>{detail}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { label: "Solver latency", val: "< 3s", sub: "For 25+ disaster sites", bar: 15, color: "#38bdf8" },
              { label: "Route efficiency gain", val: "~40%", sub: "vs. manual dispatch baseline", bar: 40, color: "#f97316" },
              { label: "On-time delivery rate", val: "94%", sub: "Within urgency time window", bar: 94, color: "#34d399" },
              { label: "Fleet utilization", val: "89%", sub: "Average load per vehicle", bar: 89, color: "#818cf8" },
            ].map((m) => (
              <TiltCard key={m.label} className="p-5" glowColor={`${m.color}18`} data-stagger={0}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.5rem" }}>
                  <span className="font-display" style={{ fontWeight: 700, color: "#fff", fontSize: "0.88rem" }}>{m.label}</span>
                  <span className="font-mono-custom" style={{ fontWeight: 800, color: m.color, fontSize: "1.1rem" }}>{m.val}</span>
                </div>
                <div style={{ height: 4, background: "rgba(255,255,255,0.06)", overflow: "hidden", marginBottom: "0.4rem", display: "flex", gap: 2 }}>
                  <div style={{ height: "100%", width: `${m.bar}%`, background: m.color, boxShadow: `0 0 10px ${m.color}` }} />
                </div>
                <div style={{ fontSize: "0.7rem", color: "rgba(148,163,184,0.52)", fontWeight: 300 }}>{m.sub}</div>
              </TiltCard>
            ))}
          </div>
        </div>
      </section>

      {/* ══ TECH STACK ══ */}
      <section id="tech" style={{ position: "relative", zIndex: 10, padding: "7rem max(2rem,5vw)", borderTop: "1px solid rgba(255,255,255,0.05)", background: "rgba(4,8,18,0.65)" }}>
        <div ref={techRef} style={{ maxWidth: 1200, margin: "0 auto", textAlign: "center" }}>
          <div className="font-mono-custom" style={{ display: "flex", justifyContent: "center", marginBottom: "2rem", color: "#0ea5e9", fontSize: "0.75rem", letterSpacing: "0.2em" }}>[ PRODUCTION INFRASTRUCTURE ]</div>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 12 }}>
            {[
              { label: "VRPTW Solver", icon: "🔬" }, { label: "OR-Tools", icon: "⚙️" },
              { label: "Gemini AI", icon: "✨" }, { label: "Django REST", icon: "🐍" },
              { label: "Next.js 16", icon: "▲" }, { label: "React 19", icon: "⚛️" },
              { label: "Three.js 3D", icon: "🌐" }, { label: "Leaflet Maps", icon: "🗺️" },
              { label: "USGS Live Data", icon: "📡" }, { label: "OSRM Routing", icon: "🛣️" },
            ].map((t) => (
              <div key={t.label} style={{
                padding: "0.6rem 1rem",
                fontFamily: "'DM Mono',monospace",
                fontSize: "0.75rem", fontWeight: 600, color: "#94a3b8",
                display: "flex", alignItems: "center", gap: 8,
                border: "1px solid rgba(255,255,255,0.1)", background: "rgba(15,23,42,0.5)"
              }}>
                <span>{t.icon}</span><span>[ {t.label} ]</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ CTA ══ */}
      <section style={{ position: "relative", zIndex: 10, padding: "10rem max(2rem,5vw)", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 700, height: 400, background: "radial-gradient(ellipse,rgba(239,68,68,0.12),rgba(99,102,241,0.06) 50%,transparent 70%)", pointerEvents: "none" }} />
        <div ref={ctaRef} style={{ textAlign: "center", maxWidth: 700, margin: "0 auto", position: "relative" }}>
          <div className="font-mono-custom" style={{ display: "flex", justifyContent: "center", marginBottom: "1.5rem", color: "#ef4444", fontSize: "0.75rem", letterSpacing: "0.2em" }}>[ SYSTEM READY ]</div>
          <h2 className="font-display cyber-glitch" data-text="READY TO DISPATCH?" style={{ position: "relative", fontSize: "clamp(2.5rem, 5vw, 4.5rem)", fontWeight: 900, letterSpacing: "-0.04em", color: "transparent", WebkitTextStroke: "2px #fff", textShadow: "0 0 20px rgba(14,165,233,0.5), 0 0 40px rgba(239,68,68,0.5)", lineHeight: 1.07, marginBottom: "1.5rem", display: "inline-block" }}>
            READY TO DISPATCH?
          </h2>
          <div style={{ width: "3rem", height: 2, background: "linear-gradient(to right,transparent,#0ea5e9,transparent)", margin: "0 auto 1.5rem" }} />
          <p style={{ color: "rgba(148,163,184,0.75)", fontSize: "0.95rem", lineHeight: 1.75, fontWeight: 300, marginBottom: "2.5rem" }}>
            Experience real-time AI report intake, automated site prioritization, and instant vehicle route solving in the live operations cockpit.
          </p>
          <Link href="/dashboard" style={{
            display: "inline-flex", alignItems: "center", gap: 12, padding: "1.1rem 2.5rem",
            fontSize: "0.88rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "#fff",
            background: "linear-gradient(135deg,rgba(239,68,68,0.3),rgba(14,165,233,0.3))",
            border: "1px solid #ef4444", borderRight: "4px solid #0ea5e9",
            textDecoration: "none", transition: "all 0.2s", fontFamily: "'DM Mono',monospace"
          }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 0 20px rgba(239,68,68,0.5)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "none"; }}
          >[ INITIATE LAUNCH ] →</Link>

        </div>
      </section>

      {/* ══ FOOTER ══ */}
      <footer style={{
        position: "relative", zIndex: 10, borderTop: "1px solid rgba(255,255,255,0.05)",
        padding: "2rem max(2rem,4vw)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10,
      }}>
        <span className="font-mono-custom" style={{ fontSize: "0.7rem", color: "rgba(100,116,139,0.65)" }}>ReliefRoute — AI Disaster Relief Routing System</span>
        <span className="font-mono-custom" style={{ fontSize: "0.7rem", color: "rgba(100,116,139,0.45)" }}>Orion Global Hackathon 2026</span>
      </footer>
    </div>
  );
}
