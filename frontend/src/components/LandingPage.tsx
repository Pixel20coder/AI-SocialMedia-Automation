import { motion } from "framer-motion";
import { ArrowRight, BarChart3, Boxes, Gauge, RadioTower } from "lucide-react";
import { lazy, Suspense } from "react";
import { Link } from "react-router-dom";

const Scene3D = lazy(() => import("./Scene3D"));

const stats = [
  { label: "1M+ Views", icon: BarChart3 },
  { label: "98% Automation", icon: Gauge },
  { label: "24/7 Active", icon: RadioTower }
];

export default function LandingPage() {
  return (
    <main className="landing-page">
      <div className="scene-layer" aria-hidden>
        <Suspense fallback={<div className="scene-fallback" />}>
          <Scene3D />
        </Suspense>
      </div>

      <section className="landing-overlay">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.72, ease: "easeOut" }}
          className="landing-copy"
        >
          <div className="system-pill">
            <Boxes size={16} />
            Multi-agent production pipeline
          </div>
          <h1>AI Content Automation System</h1>
          <p>Generate. Analyze. Automate.</p>
          <div className="landing-actions">
            <Link className="landing-primary" to="/dashboard">
              Enter Dashboard
              <ArrowRight size={18} />
            </Link>
            <Link className="landing-secondary" to="/dashboard">
              View System
            </Link>
          </div>
          <div className="landing-stats">
            {stats.map(({ label, icon: Icon }) => (
              <div key={label} className="landing-stat">
                <Icon size={18} />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </section>
    </main>
  );
}
