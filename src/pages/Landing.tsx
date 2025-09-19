import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { motion } from "framer-motion";
import { ArrowRight, BarChart3, Users, TrendingUp, Shield, Zap, Sun, Moon } from "lucide-react";
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
              <img src="./logo.svg" alt="Logo" width={32} height={32} />
              <span className="font-bold text-xl tracking-tight">ExpenseSync</span>
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
      <section className="py-32 px-8">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h1 className="text-5xl font-bold tracking-tight mb-8">
              Track expenses together,
              <br />
              <span className="text-primary">stay in sync</span>
            </h1>
            <p className="text-muted-foreground text-lg sm:text-xl">
              For couples and partners
            </p>
            <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
              A minimalist expense tracker for couples and partners. 
              Share costs, compare spending, and maintain financial transparency.
            </p>
            <Button size="lg" onClick={handleGetStarted} disabled={isLoading}>
              {isAuthenticated ? "Go to Dashboard" : "Start Tracking"}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-32 px-8 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl font-bold tracking-tight mb-4">
              Everything you need, nothing you don't
            </h2>
            <p className="text-muted-foreground text-lg">
              Clean, simple expense tracking designed for two
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="border-0 shadow-none bg-background">
                <CardContent className="pt-8 text-center">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">Shared Rooms</h3>
                  <p className="text-muted-foreground">
                    Create a room, share the code, and start tracking expenses together instantly.
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="border-0 shadow-none bg-background">
                <CardContent className="pt-8 text-center">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <BarChart3 className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">Smart Comparisons</h3>
                  <p className="text-muted-foreground">
                    See who spends what, track differences, and maintain spending balance.
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Card className="border-0 shadow-none bg-background">
                <CardContent className="pt-8 text-center">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <TrendingUp className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">Recurring Expenses</h3>
                  <p className="text-muted-foreground">
                    Set up recurring expenses with start and end dates for accurate tracking.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
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
                    Your financial data stays secure. Only you and your partner can access your shared room.
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
                    Add expenses in seconds. Real-time sync means you're always up to date.
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
                    Understand your spending patterns with clean, simple visualizations.
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

      {/* CTA */}
      <section className="py-32 px-8 bg-primary text-primary-foreground">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
          >
            <h2 className="text-3xl font-bold tracking-tight mb-4">
              Ready to sync your expenses?
            </h2>
            <p className="text-xl mb-8 opacity-90">
              Join thousands of couples already tracking smarter together.
            </p>
            <Button 
              size="lg" 
              variant="secondary" 
              onClick={handleGetStarted}
              disabled={isLoading}
            >
              {isAuthenticated ? "Go to Dashboard" : "Get Started Free"}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </motion.div>
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