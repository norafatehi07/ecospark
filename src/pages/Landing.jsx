// src/pages/Landing.jsx
import { Navbar } from '../components/landing/Navbar';
import { Hero } from '../components/landing/Hero';
import { Capabilities } from '../components/landing/Capabilities';

export default function Landing() {
  return (
    <div className="landing-container bg-black min-h-screen font-body relative overflow-x-hidden selection:bg-white/20">
      <Navbar />
      <Hero />
      <Capabilities />
    </div>
  );
}
