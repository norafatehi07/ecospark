import { motion } from 'framer-motion';
import { FadingVideo } from './FadingVideo';
import { BlurText } from './BlurText';
import { ArrowUpRight, PlayIcon, ClockIcon, GlobeIcon } from './Icons';
import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { getGlobalUserCount } from '../../services/firestoreService';

const fadeUpVariant = {
  initial: { filter: 'blur(10px)', opacity: 0, y: 20 },
  animate: { filter: 'blur(0px)', opacity: 1, y: 0 }
};

export function Hero() {
  const [totalUsers, setTotalUsers] = useState(25);

  useEffect(() => {
    getGlobalUserCount().then(count => {
      setTotalUsers(count);
    });
  }, []);

  return (
    <section className="relative min-h-screen flex flex-col justify-between overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#1a1c29] via-black to-black">
      <FadingVideo
        src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260613_180732_a54afbf6-b30d-470e-861f-669871f09f67.mp4"
        className="absolute left-1/2 top-0 -translate-x-1/2 object-cover object-top z-0 pointer-events-none"
        style={{ width: "120%", height: "120%" }}
      />

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center pt-24 px-4">
        <motion.div
          initial="initial" animate="animate"
          variants={fadeUpVariant}
          transition={{ delay: 0.4, duration: 0.8, ease: "easeOut" }}
          className="liquid-glass rounded-full px-1.5 py-1.5 pr-4 flex items-center gap-3 mb-6"
        >
          <span className="bg-white text-black px-3 py-1 rounded-full text-xs font-semibold">New</span>
          <span className="text-sm text-white/90 font-body">Track, compete & earn rewards for going green 🌱</span>
        </motion.div>

        <BlurText
          text="EcoSpark"
          className="text-6xl md:text-7xl lg:text-[5.5rem] font-heading italic text-white leading-[0.8] max-w-2xl text-center tracking-[-4px]"
        />

        <motion.p
          initial="initial" animate="animate"
          variants={fadeUpVariant}
          transition={{ delay: 0.8, duration: 0.8, ease: "easeOut" }}
          className="mt-6 text-sm md:text-base text-white max-w-2xl text-center font-body font-light leading-tight"
        >
          Build sustainable habits, compete with friends on the leaderboard, and unlock exclusive rewards — all while making a real impact on the planet.
        </motion.p>

        <motion.div
          initial="initial" animate="animate"
          variants={fadeUpVariant}
          transition={{ delay: 1.1, duration: 0.8, ease: "easeOut" }}
          className="flex items-center gap-6 mt-8"
        >
          <Link to="/auth" className="liquid-glass-strong rounded-full px-5 py-2.5 text-sm font-medium text-white flex items-center gap-2 hover:bg-white/10 transition-colors">
            Get Started
            <ArrowUpRight className="h-5 w-5" />
          </Link>
          <a href="/EcoSpark_Whitepaper.pdf" target="_blank" rel="noopener noreferrer" className="text-white text-sm font-medium flex items-center gap-2 hover:opacity-80 transition-opacity">
            View Whitepaper
            <ArrowUpRight className="h-4 w-4" />
          </a>
        </motion.div>

        <motion.div
          initial="initial" animate="animate"
          variants={fadeUpVariant}
          transition={{ delay: 1.3, duration: 0.8, ease: "easeOut" }}
          className="flex flex-col sm:flex-row items-stretch gap-4 mt-12"
        >
          <div className="liquid-glass rounded-[1.25rem] p-5 w-[220px] flex flex-col justify-between items-start text-left min-h-[140px]">
            <ClockIcon className="w-7 h-7 text-white mb-4" />
            <div>
              <div className="font-heading italic text-white text-4xl tracking-[-1px] leading-none">5 Min</div>
              <div className="text-xs text-white/90 font-body font-light mt-2">Average Daily Eco-Task Time</div>
            </div>
          </div>
          <div className="liquid-glass rounded-[1.25rem] p-5 w-[220px] flex flex-col justify-between items-start text-left min-h-[140px]">
            <GlobeIcon className="w-7 h-7 text-white mb-4" />
            <div>
              <div className="font-heading italic text-white text-4xl tracking-[-1px] leading-none">{totalUsers > 25 ? `${totalUsers}` : '25+'}</div>
              <div className="text-xs text-white/90 font-body font-light mt-2">Eco-Warriors Across the Globe</div>
            </div>
          </div>
        </motion.div>
      </div>

      <motion.div
        initial="initial" animate="animate"
        variants={fadeUpVariant}
        transition={{ delay: 1.4, duration: 0.8, ease: "easeOut" }}
        className="relative z-10 flex flex-col items-center gap-5 pb-8 pt-12"
      >
        <div className="liquid-glass rounded-full px-4 py-1.5 text-xs font-medium text-white/90 font-body">
          Made with ❤️ by
        </div>
        <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 font-heading italic text-white text-2xl md:text-3xl tracking-tight">
          <span>Amitesh Yadav</span>
        </div>
      </motion.div>
    </section>
  );
}































