"use client";

import axios from "axios";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
type AuthMode = "login" | "register";

export default function AuthForm() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  const isRegister = mode === "register";


  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    try {
      const endpoint =
        mode === "register"
          ? "/api/auth/register"
          : "/api/auth/login";

      const payload = {
        ...(isRegister && { username, name }),
        email,
        password,
      };

      const response = await axios.post(endpoint, payload, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.data;

      if (response.status !== 200) {
        throw new Error(data.message || "Authentication failed");
      }

      console.log("Authentication successful:", data);

      // Redirect after successful login or registration.
      window.location.href = "/";

    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message =
          error.response?.data?.message ||
          "Authentication failed. Please try again.";

        alert(message);
      } else if (error instanceof Error) {
        alert(error.message);
      } else {
        alert("An unexpected error occurred.");
      }
    }
  }


  function changeMode(newMode: AuthMode) {
    setMode(newMode);
    setShowPassword(false);
  }

  const inputClass =
    "w-full rounded-xl border border-white/[0.09] bg-[#151B16] px-4 py-3.5 text-sm text-[#F5F7F2] outline-none transition-all duration-200 placeholder:text-[#687469] hover:border-white/[0.15] focus:border-[#B8F28B]/70 focus:ring-4 focus:ring-[#B8F28B]/[0.08]";

  const labelClass =
    "mb-2 block text-sm font-medium text-[#D8E0D7]";

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#080B09] px-4 py-10 text-[#F5F7F2] selection:bg-[#B8F28B]/30">

      {/* Background glow */}
      <div className="pointer-events-none absolute -left-40 -top-40 h-96 w-96 rounded-full bg-emerald-500/[0.07] blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-[#B8F28B]/[0.06] blur-[120px]" />

      {/* Main card */}
      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-3xl border border-white/[0.08] bg-[#101511] shadow-[0_25px_100px_rgba(0,0,0,0.55)] md:grid-cols-2">

        {/* Brand panel */}
        <section className="relative hidden flex-col justify-between overflow-hidden bg-[#142019] p-10 lg:p-12 md:flex">

          {/* Decorative circles */}
          <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full border border-white/[0.06]" />
          <div className="pointer-events-none absolute -right-10 -top-10 h-60 w-60 rounded-full border border-white/[0.06]" />
          <div className="pointer-events-none absolute -bottom-28 -left-24 h-80 w-80 rounded-full border border-white/[0.06]" />

          {/* Soft accent glow */}
          <div className="pointer-events-none absolute right-0 top-1/3 h-64 w-64 rounded-full bg-[#B8F28B]/[0.05] blur-[90px]" />

          {/* Logo */}
          <div className="relative z-10">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#B8F28B] text-2xl font-bold text-[#142019] shadow-[0_0_30px_rgba(184,242,139,0.12)]">
                b
              </div>

              <span className="text-2xl font-semibold tracking-tight text-white">
                briza<span className="text-[#B8F28B]">.</span>
              </span>
            </div>

            {/* Main heading */}
            <div className="mt-24">
              <p className="text-sm font-medium uppercase tracking-[0.22em] text-[#B8F28B]/80">
                A world of possibilities
              </p>

              <h2 className="mt-5 max-w-sm text-4xl font-semibold leading-[1.2] tracking-tight text-white">
                Discover ideas.
                <br />
                <span className="text-[#B8F28B]">
                  Share your world.
                </span>
              </h2>

              <p className="mt-6 max-w-sm text-sm leading-7 text-[#A4B0A5]">
                A space for inspiration, creativity, and discovering
                things that matter to you. Find your people and
                make every interest count.
              </p>
            </div>

            {/* Feature tags */}
            <div className="mt-9 flex flex-wrap gap-2">
              <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3.5 py-2 text-xs text-[#CBD5C9]">
                ✳ Your interests
              </span>

              <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3.5 py-2 text-xs text-[#CBD5C9]">
                ◉ Your community
              </span>
            </div>
          </div>

          {/* Footer */}
          <p className="relative z-10 mt-16 text-xs tracking-wide text-[#778579]">
            Your interests. Your community. Your Briza.
          </p>
        </section>

        {/* Authentication panel */}
        <section className="flex items-center justify-center px-6 py-10 sm:px-10 md:px-10 lg:px-14 lg:py-12">
          <div className="w-full max-w-sm">

            {/* Mobile logo */}
            <div className="mb-10 flex items-center gap-3 md:hidden">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#B8F28B] text-xl font-bold text-[#142019]">
                b
              </div>

              <span className="text-2xl font-semibold tracking-tight text-white">
                briza<span className="text-[#B8F28B]">.</span>
              </span>
            </div>

            {/* Intro */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#B8F28B]">
                Your space to explore
              </p>

              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-[2rem]">
                {isRegister ? "Create your account" : "Welcome back"}
              </h1>

              <p className="mt-3 text-sm leading-6 text-[#8F9B90]">
                {isRegister
                  ? "Join Briza and start sharing your world."
                  : "Sign in to continue your journey on Briza."}
              </p>
            </div>

            {/* Login / Register toggle */}
            <div className="mt-8 grid grid-cols-2 rounded-xl border border-white/[0.06] bg-[#0B0F0C] p-1">
              <button
                type="button"
                onClick={() => changeMode("login")}
                aria-pressed={!isRegister}
                className={`rounded-lg py-2.5 text-sm font-medium transition-all duration-200 ${!isRegister
                  ? "bg-[#252F26] text-white shadow-sm"
                  : "text-[#8F9B90] hover:text-white"
                  }`}
              >
                Login
              </button>

              <button
                type="button"
                onClick={() => changeMode("register")}
                aria-pressed={isRegister}
                className={`rounded-lg py-2.5 text-sm font-medium transition-all duration-200 ${isRegister
                  ? "bg-[#252F26] text-white shadow-sm"
                  : "text-[#8F9B90] hover:text-white"
                  }`}
              >
                Sign up
              </button>
            </div>

            {/* Authentication form */}
            <form
              onSubmit={handleSubmit}
              className="mt-7 space-y-5"
            >
              {/* Username - registration only */}

              {isRegister && (
                <>
                  {/* Name Field */}
                  <div>
                    <label htmlFor="name" className={labelClass}>
                      Full Name
                    </label>

                    <input
                      id="name"
                      name="name"
                      type="text"
                      autoComplete="name"
                      placeholder="Enter your full name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      minLength={3}
                      maxLength={30}
                      pattern="[A-Za-z0-9_]+"
                      title="Use letters, numbers, and underscores only."
                      required
                      className={inputClass}
                    />
                  </div>

                  {/* Username Field */}
                  <div>
                    <label htmlFor="username" className={labelClass}>
                      Username
                    </label>

                    <input
                      id="username"
                      name="username"
                      type="text"
                      autoComplete="username"
                      placeholder="Choose a username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      minLength={3}
                      maxLength={30}
                      pattern="[A-Za-z0-9_]+"
                      title="Use letters, numbers, and underscores only."
                      required
                      className={inputClass}
                    />

                    <p className="mt-2 text-xs text-[#778579]">
                      3–30 characters, using letters, numbers, or underscores.
                    </p>
                  </div>
                </>
              )}


              {/* Email */}
              <div>
                <label htmlFor="email" className={labelClass}>
                  Email address
                </label>

                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className={inputClass}
                />
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className={labelClass}>
                  Password
                </label>

                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete={
                      isRegister ? "new-password" : "current-password"
                    }
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={8}
                    required
                    className={`${inputClass} pr-12`}
                  />

                  <button
                    type="button"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-[#849185] transition hover:text-[#B8F28B] focus:outline-none focus:ring-2 focus:ring-[#B8F28B]/30"
                  >
                    {showPassword ? (
                      <EyeOff size={19} />
                    ) : (
                      <Eye size={19} />
                    )}
                  </button>
                </div>

                {isRegister && (
                  <p className="mt-2 text-xs text-[#778579]">
                    Use at least 8 characters.
                  </p>
                )}
              </div>

              {/* Submit button */}
              <button
                type="submit"

                className="group flex w-full items-center justify-center gap-2 rounded-xl bg-[#B8F28B] px-4 py-3.5 text-sm font-semibold text-[#142011] transition-all duration-200 hover:bg-[#C9F7A5] hover:shadow-[0_0_25px_rgba(184,242,139,0.12)] active:scale-[0.99] focus:outline-none focus:ring-4 focus:ring-[#B8F28B]/20"
              >
                {isRegister ? "Create account" : "Sign in"}

                <ArrowRight
                  size={17}
                  className="transition-transform duration-200 group-hover:translate-x-1"
                />
              </button>
            </form>

            {/* Switch mode */}
            <p className="mt-7 text-center text-sm text-[#8F9B90]">
              {isRegister
                ? "Already have an account?"
                : "New to Briza?"}{" "}

              <button
                type="button"
                onClick={() =>
                  changeMode(isRegister ? "login" : "register")
                }
                className="font-semibold text-[#B8F28B] transition hover:text-[#C9F7A5] hover:underline focus:outline-none focus:underline"
              >
                {isRegister ? "Login" : "Create an account"}
              </button>
            </p>

            {/* Footer */}
            <p className="mt-9 text-center text-xs leading-5 text-[#687469]">
              Your space to discover, create, and connect.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}