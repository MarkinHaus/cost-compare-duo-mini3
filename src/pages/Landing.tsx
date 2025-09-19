import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { motion } from "framer-motion";
import { ArrowRight, BarChart3, Shield, Zap, Sun, Moon } from "lucide-react";
import { useNavigate } from "react-router";
import { useEffect, useState } from "react";

export default function Landing() {
  // Theme toggle state
  const [isDark, setIsDark] = useState<boolean>(() => {
    return document.documentElement.classList.contains("dark");
  });

  useEffect(() => {
    // Sync state with persisted theme (if user changed it elsewhere)
    try {
      const stored = localStorage.getItem("theme");
      if (stored === "dark") setIsDark(true);
      if (stored === "light") setIsDark(false);
    } catch {
      // ignore
    }
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    if (next) {
      document.documentElement.classList.add("dark");
      try {
        localStorage.setItem("theme", "dark");
      } catch {}
    } else {
      document.documentElement.classList.remove("dark");
      try {
        localStorage.setItem("theme", "light");
      } catch {}
    }
  };

  const { isLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleGetStarted = () => {
    if (isAuthenticated) {
      navigate("/dashboard");
    } else {
      navigate("/auth");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-background"
    >
      {/* Navigation */}
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-6xl mx-auto px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <img src="/logo.svg" alt="Cost Compare Duo mini logo" width={32} height={32} />
              <span className="font-bold text-xl tracking-tight">Cost Compare Duo mini</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                aria-label="Toggle dark mode"
                className="h-9 w-9"
              >
                {isDark ? (
                  <Sun className="h-5 w-5" />
                ) : (
                  <Moon className="h-5 w-5" />
                )}
              </Button>
              <Button onClick={handleGetStarted} disabled={isLoading}>
                {isAuthenticated ? "Dashboard" : "Get Started"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="mb-4 text-sm font-medium text-primary/80 tracking-wide">
          For couples and partners
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
          Track expenses together — clear, fair, and fast
        </h1>
        <p className="mt-4 text-muted-foreground max-w-2xl">
          Create shared rooms with 1–n members, compare spending with Bar or Pie charts,
          view a premium GitHub‑style heatmap, manage advanced recurring costs and beneficiaries,
          and export polished PDF reports. Real‑time, privacy‑first, and PWA‑installable.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Button
            onClick={handleGetStarted}
            disabled={isLoading}
            aria-label={isAuthenticated ? "Go to Dashboard" : "Start free 7-day trial"}
          >
            {isAuthenticated ? "Go to Dashboard" : "Start Free 7‑day Trial"}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          {isAuthenticated ? (
            <Button
              variant="outline"
              onClick={() => navigate("/dashboard?openCreateRoom=1")}
              disabled={isLoading}
              aria-label="Create a new room"
            >
              Create Room
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={() => navigate("/auth")}
              disabled={isLoading}
              aria-label="Sign in"
            >
              Sign in
            </Button>
          )}
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16 mt-10 sm:mt-12">
        <h2 className="text-2xl sm:text-3xl font-semibold">
          Everything you need, nothing you don't
        </h2>
        <p className="mt-2 text-muted-foreground">
          Clean, simple expense tracking designed for shared budgets.
        </p>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border p-5">
            <h3 className="font-semibold">Shared Rooms (1–n)</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Create a room, invite with a link or 6‑char code, and track together in real time.
            </p>
          </div>
          <div className="rounded-xl border p-5">
            <h3 className="font-semibold">Smart Comparisons</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Bar or Pie by tag with legends and per‑member breakdowns, plus a premium daily heatmap.
            </p>
          </div>
          <div className="rounded-xl border p-5">
            <h3 className="font-semibold">Recurring & Reports</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Advanced recurrence (daily/weekly/monthly/annual) and beautiful, English‑only PDF exports.
            </p>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-32 px-8">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl font-bold tracking-tight mb-4">
              Built for modern relationships
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7 }}
              className="space-y-8"
            >
              <div className="flex gap-4">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                  <Shield className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Privacy First</h3>
                  <p className="text-muted-foreground">
                    Your data stays secure. Share access only with the people in your room.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                  <Zap className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Lightning Fast</h3>
                  <p className="text-muted-foreground">
                    Real‑time sync, quick add, and an installable PWA for offline‑friendly use.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                  <BarChart3 className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Clear Insights</h3>
                  <p className="text-muted-foreground">
                    Per‑member totals, differences, and clean charts for instant clarity.
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.8 }}
              className="bg-muted/30 rounded-2xl p-8"
            >
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Your Total</span>
                  <span className="text-2xl font-bold">$1,247.50</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Partner Total</span>
                  <span className="text-2xl font-bold">$1,156.30</span>
                </div>
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Difference</span>
                    <span className="text-lg font-semibold text-primary">$91.20</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">You spend slightly more</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Plans (UI only) */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <h2 className="text-2xl sm:text-3xl font-semibold">Simple plans</h2>
        <p className="mt-2 text-muted-foreground">
          Start free. Upgrade when you want more rooms, members, and advanced visuals. No data loss when you downgrade.
        </p>

        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          {/* Free Plan */}
          <div className="rounded-xl border p-6 flex flex-col">
            <div className="mb-1 text-sm font-medium text-primary/80">Free</div>
            <h3 className="text-xl font-semibold">Everything to get started</h3>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground list-disc pl-5">
              <li>1 room, up to 3 members</li>
              <li>Add/edit/delete expenses</li>
              <li>Bar or Pie (basic) & PDF export</li>
              <li>Invite by code or link</li>
            </ul>
            <div className="mt-6">
              <Button
                variant="outline"
                className="w-full"
                onClick={handleGetStarted}
                disabled={isLoading}
                aria-label={isAuthenticated ? "Open Dashboard" : "Get Started Free"}
              >
                {isAuthenticated ? "Open Dashboard" : "Get Started Free"}
              </Button>
            </div>
          </div>

          {/* Pro Plan */}
          <div className="rounded-xl border p-6 flex flex-col relative">
            <div className="absolute right-4 top-4 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              New: Heatmap
            </div>
            <div className="mb-1 text-sm font-medium text-primary/80">Pro</div>
            <h3 className="text-xl font-semibold">All features, no limits</h3>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground list-disc pl-5">
              <li>Unlimited rooms & members</li>
              <li>Tag comparison (Bar/Pie) with legends</li>
              <li>GitHub‑style heatmap calendar</li>
              <li>Advanced recurring + premium reports</li>
            </ul>
            <p className="mt-2 text-xs text-muted-foreground">
              Includes a 7‑day trial (one per account). Cancel anytime.
            </p>
            <div className="mt-6 grid gap-2 sm:flex sm:gap-3">
              <Button
                onClick={handleGetStarted}
                disabled={isLoading}
                aria-label={isAuthenticated ? "Go to Dashboard" : "Start 7-day Trial"}
                className="w-full sm:w-auto"
              >
                {isAuthenticated ? "Go to Dashboard" : "Start 7‑day Trial"}
              </Button>
              {!isAuthenticated && (
                <Button
                  variant="outline"
                  onClick={() => navigate("/auth")}
                  disabled={isLoading}
                  aria-label="Sign in"
                  className="w-full sm:w-auto"
                >
                  Sign in
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="rounded-xl border p-8 text-center">
          <h3 className="text-2xl sm:text-3xl font-semibold">Ready to sync your expenses?</h3>
          <p className="mt-2 text-muted-foreground">
            Create a room and start tracking together in minutes. No card required for the trial.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button
              onClick={handleGetStarted}
              disabled={isLoading}
              aria-label={isAuthenticated ? "Go to Dashboard" : "Start free 7-day trial"}
            >
              {isAuthenticated ? "Go to Dashboard" : "Start Free 7‑day Trial"}
            </Button>
            {isAuthenticated && (
              <Button
                variant="outline"
                onClick={() => navigate("/dashboard?openCreateRoom=1")}
                disabled={isLoading}
                aria-label="Create a new room"
              >
                Create Room
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 px-8">
        <div className="max-w-6xl mx-auto text-center text-muted-foreground">
          <p>Built with ❤️ for better financial communication</p>
        </div>
      </footer>
    </motion.div>
  );
}