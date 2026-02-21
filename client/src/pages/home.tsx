import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Video, Zap, Shield, Users, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

// Static images
// import heroImg from "@assets/hero.jpg"; // Not used, using gradients instead for cleaner look

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden selection:bg-primary/20">
      {/* Background Gradients */}
      <div className="fixed inset-0 z-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[128px]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[128px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Navigation */}
        <nav className="flex items-center justify-between py-6">
          <div className="flex items-center gap-2">
            <div className="bg-primary p-2 rounded-lg">
              <Video className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold font-display tracking-tight">OmeClone</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="https://github.com" target="_blank" rel="noreferrer" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
              GitHub
            </a>
            <Button variant="outline" className="hidden sm:flex border-white/10 hover:bg-white/5">
              Login
            </Button>
          </div>
        </nav>

        {/* Hero Section */}
        <div className="mt-20 lg:mt-32 flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-8"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span className="text-xs font-medium text-white/80">1,204 users online now</span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl md:text-7xl lg:text-8xl font-bold font-display tracking-tight leading-tight max-w-4xl bg-clip-text text-transparent bg-gradient-to-b from-white to-white/50"
          >
            Meet strangers<br />
            <span className="text-primary">instantly.</span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed"
          >
            The modern way to meet new people. Fast video connections, crystal clear audio, and completely anonymous. One click to start.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-10 flex flex-col sm:flex-row gap-4 w-full sm:w-auto"
          >
            <Link href="/video">
              <Button size="lg" className="h-14 px-8 text-lg rounded-full bg-primary hover:bg-primary/90 text-white font-bold shadow-[0_0_40px_-10px_rgba(124,58,237,0.5)] transition-all hover:scale-105 active:scale-95">
                Start Chatting <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="h-14 px-8 text-lg rounded-full border-white/10 hover:bg-white/5 backdrop-blur-sm">
              Learn More
            </Button>
          </motion.div>

          {/* Features Grid */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl"
          >
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-xl font-bold mb-2">Lightning Fast</h3>
              <p className="text-muted-foreground">Instant connections with WebRTC technology. Low latency video and audio.</p>
            </div>
            
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-xl font-bold mb-2">Safe & Secure</h3>
              <p className="text-muted-foreground">Community reporting tools and automated moderation keep you safe.</p>
            </div>

            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-green-400" />
              </div>
              <h3 className="text-xl font-bold mb-2">Global Community</h3>
              <p className="text-muted-foreground">Connect with people from over 190 countries around the world.</p>
            </div>
          </motion.div>
        </div>

        <footer className="mt-24 py-8 border-t border-white/5 text-center text-sm text-muted-foreground">
          <p>© 2024 OmeClone. All rights reserved. Please follow community guidelines.</p>
        </footer>
      </div>
    </div>
  );
}
