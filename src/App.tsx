"use client";

import { Authenticated, Unauthenticated } from "convex/react";
import { useNavigate, Routes, Route, useLocation } from "react-router-dom";
import { Navbar } from "./components/navbar";
import Leaderboard from "./pages/Leaderboard";
import Requests from "./pages/Requests";
import Browse from "./pages/Browse";
import ProviderLeaks from "./pages/ProviderLeaks";
import { LeakLibrary } from "./components/leakLibrary";
import { SubmitLeakForm } from "./components/submitLeakForm";
import Dashboard from "./pages/Dashboard";

/**
 * Main App component.
 *
 * OPTIMIZATION: Removed the blocking auth loading pattern.
 * Previously, the entire app would wait for authentication to complete before
 * rendering anything, causing the "stuck" feeling on cold starts.
 *
 * Now, the app renders immediately and components handle their own loading states.
 * The Authenticated/Unauthenticated components will automatically show/hide content
 * based on auth state without blocking the entire UI.
 */
export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const isHomePage = location.pathname === "/";

  return (
    <>
      <div className="min-h-screen bg-[#0f0f0f] text-[#e0e0e0] overflow-x-hidden font-sans relative">
        {/* Floating Grid Background */}
        <div
          className="fixed top-0 left-0 w-full h-full pointer-events-none -z-10 animate-[gridMove_20s_linear_infinite]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(0, 255, 136, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 255, 136, 0.03) 1px, transparent 1px)",
            backgroundSize: "50px 50px",
          }}
        />

        <div className="max-w-[1400px] mx-auto p-8">
          <header>
            <div
              className={
                isHomePage ? "" : "flex items-center justify-between mb-8"
              }
            >
              {!isHomePage && (
                <h1
                  onClick={() => navigate("/")}
                  className="text-3xl font-bold bg-linear-to-r from-[#00ff88] via-[#00aaff] to-[#ff00ff] bg-clip-text text-transparent animate-[gradientShift_5s_ease_infinite] cursor-pointer hover:opacity-80 transition-opacity"
                >
                  LeakHub
                </h1>
              )}
              <div className={isHomePage ? "" : "ml-auto"}>
                <Navbar />
              </div>
            </div>
            {isHomePage && (
              <div className="text-center">
                <h1
                  onClick={() => navigate("/")}
                  className="text-5xl font-bold mb-4 bg-linear-to-r from-[#00ff88] via-[#00aaff] to-[#ff00ff] bg-clip-text text-transparent animate-[gradientShift_5s_ease_infinite] cursor-pointer hover:opacity-80 transition-opacity"
                >
                  LeakHub
                </h1>
                <p className="text-[#888] text-xl mb-2">
                  The community hub for crowd-sourced system prompt leak
                  verification. CL4R1T4S!
                </p>
              </div>
            )}
          </header>
          <main className="flex flex-col gap-16">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/requests" element={<Requests />} />
              <Route path="/browse" element={<Browse />} />
              <Route path="/browse/:provider" element={<ProviderLeaks />} />
            </Routes>
          </main>
        </div>
      </div>
    </>
  );
}

function Home() {
  const navigate = useNavigate();
  return (
    <>
      <div className="text-center">
        {/* Status Bar */}
        {/* <div className="flex justify-center gap-8 mb-8 flex-wrap">
          <div className="bg-white/5 px-6 py-2 rounded-full border border-white/10 flex items-center gap-2">
            <span>Active Targets:</span>
            <span className="font-bold text-[#00ff88]">0</span>
          </div>
          <div className="bg-white/5 px-6 py-2 rounded-full border border-white/10 flex items-center gap-2">
            <span>Total Submissions:</span>
            <span className="font-bold text-[#00ff88]">0</span>
          </div>
          <div className="bg-white/5 px-6 py-2 rounded-full border border-white/10 flex items-center gap-2">
            <span>Verified Prompts:</span>
            <span className="font-bold text-[#00ff88]">0</span>
          </div>
        </div> */}

        {/* Action Buttons */}
        <div className="flex gap-4 justify-center flex-wrap mt-4">
          <button
            onClick={() => navigate("/browse")}
            className="bg-linear-to-r from-[#00ff88] to-[#00aaff] text-black px-8 py-2.5 rounded-lg font-bold transition-all hover:-translate-y-0.5 hover:shadow-[0_5px_20px_rgba(0,255,136,0.4)]"
          >
            🔍 Browse Prompts
          </button>
          <button
            onClick={() => navigate("/leaderboard")}
            className="bg-linear-to-r from-[#ff00ff] to-[#00ff88] text-black px-8 py-2.5 rounded-lg font-bold transition-all hover:-translate-y-0.5 hover:shadow-[0_5px_20px_rgba(0,255,136,0.4)]"
          >
            🏆 View Leaderboard
          </button>
          <button
            onClick={() => navigate("/requests")}
            className="bg-linear-to-r from-[#ff6b6b] to-[#ffd700] text-black px-8 py-2.5 rounded-lg font-bold transition-all hover:-translate-y-0.5 hover:shadow-[0_5px_20px_rgba(0,255,136,0.4)]"
          >
            🎯 Requests
          </button>
        </div>
      </div>

      <Authenticated>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <SubmitLeakForm />
          <LeakLibrary isUserLoggedIn={true} />
        </div>
      </Authenticated>
      <Unauthenticated>
        <LeakLibrary isUserLoggedIn={false} />
      </Unauthenticated>
    </>
  );
}
