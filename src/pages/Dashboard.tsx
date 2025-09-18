import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { motion } from "framer-motion";
import { Plus, Copy, Users, TrendingUp, Calendar, Tag, Trash2, BarChart3, Pencil } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useAction, useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import type { Id } from "@/convex/_generated/dataModel";
import { ChartContainer, ChartTooltipContent, ChartLegendContent } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip, Legend as RechartsLegend, PieChart, Pie, Cell } from "recharts";

export default function Dashboard() {
  const { isLoading, isAuthenticated, user, signOut } = useAuth();
  const navigate = useNavigate();
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showJoinRoom, setShowJoinRoom] = useState(false);
  // Add: room config modal state
  const [showCreateRoomConfig, setShowCreateRoomConfig] = useState(false);
  const [newRoomMaxMembers, setNewRoomMaxMembers] = useState<string>("2");
  const [newRoomCurrency, setNewRoomCurrency] = useState<string>("USD");
  const [joinCode, setJoinCode] = useState("");
  const [sortBy, setSortBy] = useState("date");
  // Add: chart type selector state
  const [chartType, setChartType] = useState<"bar" | "pie">("bar");
  const [showEditExpense, setShowEditExpense] = useState(false);
  const [editExpenseId, setEditExpenseId] = useState<Id<"expenses"> | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    amount: "",
    purpose: "",
    tags: "",
    isRecurring: false,
    startDate: "",
    endDate: "",
    frequency: "monthly",
    timeOfDay: "",
    monthlyDay: "",
    annualMonth: "",
    annualDay: "",
  });
  const [selectedBeneficiaries, setSelectedBeneficiaries] = useState<string[]>([]);

  // Form state
  const [expenseForm, setExpenseForm] = useState({
    name: "",
    amount: "",
    purpose: "",
    tags: "",
    isRecurring: false,
    startDate: "",
    endDate: "",
    frequency: "monthly",

    // New fields for scheduling
    timeOfDay: "",          // HH:MM for daily
    monthlyDay: "",         // 1..31
    annualMonth: "",        // 1..12
    annualDay: "",          // 1..31
  });

  // Mutations and queries
  const createRoom = useMutation(api.rooms.create);
  const joinRoom = useMutation(api.rooms.join);
  const createExpense = useMutation(api.expenses.create);
  const deleteExpense = useMutation(api.expenses.deleteExpense);
  const updateExpense = useMutation(api.expenses.updateExpense);
  const userRoom = useQuery(api.rooms.getUserRoom);
  const expenses = useQuery(api.expenses.getByRoom, 
    userRoom ? { roomCode: userRoom.code } : "skip"
  );

  // Add: load member profiles for labeling when rooms have >2 members
  const memberProfiles = useQuery(
    api.users.getProfilesByIds,
    userRoom ? { ids: userRoom.members as any } : "skip"
  );

  const [filters, setFilters] = useState({
    name: "",
    person: "all" as "all" | "you" | "partner",
    tags: "",
    type: "all" as "all" | "one-time" | "recurring",
    fromDate: "",
    toDate: "",
  });

  const startTrial = useMutation(api.subscriptions.startTrial);
  const createPaymentLink = useAction(api.stripe.createPaymentLink);
  const cancelAtPeriodEnd = useAction(api.subscriptions_actions.cancelAtPeriodEnd);
  const userBilling = useQuery(api.subscriptions.getMe);
  const pricing = useQuery(api.subscriptions.getPricing);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/auth");
    }
  }, [isLoading, isAuthenticated, navigate]);

  useEffect(() => {
    // Initialize beneficiaries to room members for >2 member rooms on open add dialog
    if (userRoom && userRoom.members && userRoom.members.length > 2 && showAddExpense) {
      setSelectedBeneficiaries(userRoom.members.map((m: any) => m));
    }
  }, [userRoom, showAddExpense]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Replace handleCreateRoom: open modal instead of prompt
  const handleCreateRoom = async () => {
    setShowCreateRoomConfig(true);
  };

  // Add: create room with modal config
  const handleConfirmCreateRoom = async () => {
    try {
      const n = Number(newRoomMaxMembers);
      const maxMembers = Number.isNaN(n) ? undefined : Math.max(2, Math.floor(n));
      await createRoom({
        ...(maxMembers ? { maxMembers } : {}),
        currencyCode: newRoomCurrency,
      });
      setShowCreateRoomConfig(false);
      setNewRoomMaxMembers("2");
      setNewRoomCurrency("USD");
      toast.success("Room created successfully!");
    } catch {
      toast.error("Failed to create room");
    }
  };

  const handleJoinRoom = async () => {
    try {
      await joinRoom({ code: joinCode });
      setShowJoinRoom(false);
      setJoinCode("");
      toast.success("Joined room successfully!");
    } catch (error) {
      toast.error("Failed to join room");
    }
  };

  const handleAddExpense = async () => {
    if (!userRoom || !expenseForm.name || !expenseForm.amount) return;

    try {
      // Enforce and default scheduling for recurring expenses
      let timeOfDay = expenseForm.timeOfDay;
      let monthlyDay = expenseForm.monthlyDay;
      let annualMonth = expenseForm.annualMonth;
      let annualDay = expenseForm.annualDay;

      if (expenseForm.isRecurring) {
        if (!expenseForm.startDate) {
          toast.error("Start date is required for recurring expenses");
          return;
        }
        const start = new Date(expenseForm.startDate);
        if (expenseForm.frequency === "daily" && !timeOfDay) {
          timeOfDay = `${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}`;
        }
        if (expenseForm.frequency === "monthly" && !monthlyDay) {
          monthlyDay = String(start.getDate());
        }
        if (expenseForm.frequency === "annual") {
          if (!annualMonth) annualMonth = String(start.getMonth() + 1);
          if (!annualDay) annualDay = String(start.getDate());
        }
      }

      const payload: any = {
        roomCode: userRoom.code,
        name: expenseForm.name,
        amount: parseFloat(expenseForm.amount),
        purpose: expenseForm.purpose,
        tags: expenseForm.tags.split(",").map(tag => tag.trim()).filter(Boolean),
        isRecurring: expenseForm.isRecurring,
        startDate: expenseForm.startDate ? new Date(expenseForm.startDate).getTime() : undefined,
        endDate: expenseForm.endDate ? new Date(expenseForm.endDate).getTime() : undefined,
        frequency: expenseForm.isRecurring ? expenseForm.frequency : undefined,
      };

      // Add scheduling fields conditionally with defaults applied above
      if (expenseForm.isRecurring) {
        if (expenseForm.frequency === "daily" && timeOfDay) {
          const [hh, mm] = timeOfDay.split(":").map(Number);
          if (!isNaN(hh) && !isNaN(mm)) {
            payload.timeOfDayMinutes = hh * 60 + mm;
          }
        }
        if (expenseForm.frequency === "monthly" && monthlyDay) {
          const d = parseInt(monthlyDay, 10);
          if (!isNaN(d)) payload.monthlyDay = d;
        }
        if (expenseForm.frequency === "annual") {
          const m = annualMonth ? parseInt(annualMonth, 10) : NaN;
          const d = annualDay ? parseInt(annualDay, 10) : NaN;
          if (!isNaN(m)) payload.annualMonth = m;
          if (!isNaN(d)) payload.annualDay = d;
        }
      }

      if (userRoom && userRoom.members.length > 2) {
        const beneficiaries = selectedBeneficiaries.filter(Boolean);
        if (beneficiaries.length > 0) {
          payload.beneficiaries = beneficiaries;
        }
      }

      await createExpense(payload);

      setSelectedBeneficiaries([]);

      setExpenseForm({
        name: "",
        amount: "",
        purpose: "",
        tags: "",
        isRecurring: false,
        startDate: "",
        endDate: "",
        frequency: "monthly",
        timeOfDay: "",
        monthlyDay: "",
        annualMonth: "",
        annualDay: "",
      });
      setShowAddExpense(false);
      toast.success("Expense added successfully!");
    } catch (error) {
      toast.error("Failed to add expense");
    }
  };

  const handleDeleteExpense = async (id: Id<"expenses">) => {
    try {
      await deleteExpense({ id });
      toast.success("Expense deleted");
    } catch (error) {
      toast.error("Failed to delete expense");
    }
  };

  const copyRoomCode = () => {
    if (userRoom) {
      navigator.clipboard.writeText(userRoom.code);
      toast.success("Room code copied to clipboard!");
    }
  };

  const handleStartTrial = async () => {
    try {
      await startTrial({});
      toast.success("7-day free trial started!");
    } catch (error) {
      toast.error("Failed to start trial");
    }
  };

  const handleSubscribe = async () => {
    try {
      const url = await createPaymentLink({
        amountCents: pricing?.planPriceCents ?? 120,
        currency: pricing?.currency ?? "usd",
        planName: pricing?.planName ?? "pro",
      });
      window.location.href = url;
    } catch (error) {
      toast.error("Failed to get checkout URL");
    }
  };

  const handleCancelAtPeriodEnd = async () => {
    try {
      await cancelAtPeriodEnd({});
      toast.success("Subscription will be canceled at the end of the current period");
    } catch (e) {
      toast.error("Failed to schedule cancellation");
    }
  };

  // Helper: count occurrences for recurring expenses up to now (respecting scheduling)
  function countOccurrencesInWindow(e: any, fromMs: number, toMs: number): number {
    if (toMs < fromMs) return 0;

    // Non-recurring: include if createdAt is within the window
    if (!e.isRecurring) {
      const t = typeof e.createdAt === "number" ? e.createdAt : 0;
      return t >= fromMs && t <= toMs ? 1 : 0;
    }

    // Recurring requires a start date
    if (!e.startDate) return 0;

    // Bound the search window to the expense lifetime
    const lifetimeStart = e.startDate;
    const lifetimeEnd = typeof e.endDate === "number" ? e.endDate : Infinity;
    const winStart = Math.max(fromMs, lifetimeStart);
    const winEnd = Math.min(toMs, lifetimeEnd);
    if (winEnd < winStart) return 0;

    const msInDay = 24 * 60 * 60 * 1000;

    // Utility: clamp day to month length
    const clampDay = (d: number, y: number, m: number) => {
      const last = new Date(y, m + 1, 0).getDate();
      return Math.max(1, Math.min(d, last));
    };

    // Advance helpers
    const nextDaily = (t: number) => t + msInDay;
    const nextWeekly = (t: number) => t + 7 * msInDay;
    const nextMonthly = (t: number, monthlyDay: number) => {
      const dt = new Date(t);
      const y = dt.getFullYear();
      const m = dt.getMonth() + 1;
      const d = clampDay(monthlyDay, y, m);
      return new Date(y, m, d, 0, 0, 0, 0).getTime();
    };
    const nextAnnual = (t: number, month: number, day: number) => {
      const dt = new Date(t);
      const y = dt.getFullYear() + 1;
      const mm = month - 1;
      const d = clampDay(day, y, mm);
      return new Date(y, mm, d, 0, 0, 0, 0).getTime();
    };

    // Find first occurrence time >= lifetimeStart, aligned by frequency specifics
    let firstOcc = lifetimeStart;

    if (e.frequency === "daily") {
      const minutes = typeof e.timeOfDayMinutes === "number" ? e.timeOfDayMinutes : 0;
      const s = new Date(lifetimeStart);
      const candidate = new Date(
        s.getFullYear(),
        s.getMonth(),
        s.getDate(),
        Math.floor(minutes / 60),
        minutes % 60,
        0,
        0
      ).getTime();
      firstOcc = candidate < lifetimeStart ? candidate + msInDay : candidate;

      // Raise to be >= winStart
      if (firstOcc < winStart) {
        const diffDays = Math.ceil((winStart - firstOcc) / msInDay);
        firstOcc = firstOcc + diffDays * msInDay;
      }

      if (firstOcc > winEnd) return 0;
      return Math.floor((winEnd - firstOcc) / msInDay) + 1;
    }

    if (e.frequency === "weekly") {
      // First weekly occurrence is at start time itself
      firstOcc = lifetimeStart;

      if (firstOcc < winStart) {
        const weekMs = 7 * msInDay;
        const diffWeeks = Math.ceil((winStart - firstOcc) / weekMs);
        firstOcc = firstOcc + diffWeeks * weekMs;
      }

      if (firstOcc > winEnd) return 0;
      const weekMs = 7 * msInDay;
      return Math.floor((winEnd - firstOcc) / weekMs) + 1;
    }

    if (e.frequency === "monthly") {
      const sd = new Date(lifetimeStart);
      const mDay = typeof e.monthlyDay === "number" ? e.monthlyDay : sd.getDate();
      const firstDay = clampDay(mDay, sd.getFullYear(), sd.getMonth());
      let f = new Date(sd.getFullYear(), sd.getMonth(), firstDay, 0, 0, 0, 0).getTime();
      if (f < lifetimeStart) {
        f = nextMonthly(f, mDay);
      }

      // Advance until >= winStart
      while (f < winStart) {
        // guard against pathological loops
        f = nextMonthly(f, mDay);
        if (f > winEnd) break;
      }

      if (f > winEnd) return 0;

      // Count monthly steps until > winEnd
      let count = 0;
      let cur = f;
      let guard = 0;
      while (cur <= winEnd && guard < 10000) {
        count += 1;
        cur = nextMonthly(cur, mDay);
        guard += 1;
      }
      return count;
    }

    if (e.frequency === "annual") {
      const sd = new Date(lifetimeStart);
      const month = typeof e.annualMonth === "number" ? e.annualMonth : sd.getMonth() + 1; // 1..12
      const day = typeof e.annualDay === "number" ? e.annualDay : sd.getDate();

      let f = new Date(sd.getFullYear(), month - 1, clampDay(day, sd.getFullYear(), month - 1), 0, 0, 0, 0).getTime();
      if (f < lifetimeStart) {
        f = nextAnnual(f, month, day);
      }

      while (f < winStart) {
        f = nextAnnual(f, month, day);
        if (f > winEnd) break;
      }

      if (f > winEnd) return 0;

      let count = 0;
      let cur = f;
      let guard = 0;
      while (cur <= winEnd && guard < 10000) {
        count += 1;
        cur = nextAnnual(cur, month, day);
        guard += 1;
      }
      return count;
    }

    // Unrecognized frequency: no count
    return 0;
  }

  // Helper to determine beneficiaries for an expense
  function getBeneficiaries(e: any): string[] {
    if (Array.isArray(e.beneficiaries) && e.beneficiaries.length > 0) return e.beneficiaries as string[];
    // default: if room has >2, assume all members; otherwise treat as legacy (payer only)
    if (userRoom && userRoom.members.length > 2) {
      return userRoom.members as string[];
    }
    // legacy two-person mode: attribute to payer only
    return [e.userId];
  }

  // Add: user label helper (email handle or short id), keeps "You" for current user
  function userLabel(id: string): string {
    if (id === (user?._id as any)) return "You";
    const profile = (memberProfiles || []).find((p: any) => p._id === id);
    const handle =
      (profile?.email && String(profile.email).split("@")[0]) || null;
    if (handle && handle.length > 0) return handle;
    const shortId = typeof id === "string" ? id.slice(0, 6) : "user";
    return shortId;
  }

  // Compute date window from filters
  const fromMs = filters.fromDate ? new Date(filters.fromDate).getTime() : 0;
  const toMs = filters.toDate ? new Date(filters.toDate).getTime() : Date.now();

  // Add: determine report type based on whether the selected window goes beyond "today"
  const nowMs = Date.now();
  const isForecast = toMs > nowMs;
  const reportType = isForecast ? "Analysis & Forecast" : "Report";

  // Parse tags filter into a set
  const tagFilterSet = new Set(
    filters.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
      .map((t) => t.toLowerCase())
  );

  // Apply filters to expenses
  const filteredExpenses = (expenses || []).filter((e) => {
    // name filter
    if (filters.name && !e.name.toLowerCase().includes(filters.name.toLowerCase())) {
      return false;
    }
    // person filter (based on beneficiaries in >2 mode, else payer)
    const bens = getBeneficiaries(e);
    if (filters.person === "you") {
      const isYou = userRoom && userRoom.members.length > 2 ? bens.includes(user?._id as any) : e.userId === user?._id;
      if (!isYou) return false;
    }
    if (filters.person === "partner") {
      const isYou = userRoom && userRoom.members.length > 2 ? bens.includes(user?._id as any) : e.userId === user?._id;
      if (isYou) return false;
    }
    // type filter
    if (filters.type === "one-time" && e.isRecurring) return false;
    if (filters.type === "recurring" && !e.isRecurring) return false;
    // tags filter
    if (tagFilterSet.size > 0) {
      const eTags = (e.tags || []).map((t: string) => t.toLowerCase());
      const hasAny = eTags.some((t: string) => tagFilterSet.has(t));
      if (!hasAny) return false;
    }
    // date window
    const count = countOccurrencesInWindow(e, fromMs, toMs);
    return count > 0;
  });

  // Scoped totals using filtered list and window-aware accumulation
  const myExpensesScoped = filteredExpenses.filter((e) => e.userId === user?._id);
  const partnerExpensesScoped = filteredExpenses.filter((e) => e.userId !== user?._id);

  const myTotalScoped = filteredExpenses.reduce((sum, e) => {
    const count = countOccurrencesInWindow(e, fromMs, toMs);
    if (count <= 0) return sum;
    const bens = getBeneficiaries(e);
    const share = bens.length > 0 ? e.amount / bens.length : e.amount;
    const occursTotal = share * count;
    const isMine = bens.includes(user?._id as any);
    return sum + (isMine ? occursTotal : 0);
  }, 0);

  const partnerTotalScoped = filteredExpenses.reduce((sum, e) => {
    const count = countOccurrencesInWindow(e, fromMs, toMs);
    if (count <= 0) return sum;
    const bens = getBeneficiaries(e);
    const share = bens.length > 0 ? e.amount / bens.length : e.amount;
    const occursTotal = share * count;
    // For "partner", sum all beneficiary shares that are NOT me
    const othersCount = bens.includes(user?._id as any) ? bens.length - 1 : bens.length;
    const othersShareTotal = othersCount > 0 ? occursTotal * (othersCount) : 0;
    return sum + othersShareTotal;
  }, 0);

  const scopedDifference = myTotalScoped - partnerTotalScoped;

  // Sort expenses
  const sortedExpenses = filteredExpenses.sort((a, b) => {
    switch (sortBy) {
      case "amount":
        return b.amount - a.amount;
      case "name":
        return a.name.localeCompare(b.name);
      default:
        return b.createdAt - a.createdAt;
    }
  });

  // Build data for chart: compare by tag within scope
  const tagSums: Record<string, { you: number; partner: number }> = {};
  for (const e of filteredExpenses) {
    const count = countOccurrencesInWindow(e, fromMs, toMs);
    if (count <= 0) continue;
    const tags = e.tags && e.tags.length > 0 ? e.tags : ["untagged"];
    const amt = e.amount * count;
    for (const t of tags) {
      const key = t.toLowerCase();
      if (!tagSums[key]) tagSums[key] = { you: 0, partner: 0 };
      if (e.userId === user?._id) tagSums[key].you += amt;
      else tagSums[key].partner += amt;
    }
  }
  const chartData = Object.entries(tagSums).map(([tag, vals]) => ({
    tag,
    you: Number(vals.you.toFixed(2)),
    partner: Number(vals.partner.toFixed(2)),
  }));
  // Add: pie data and colors
  const pieData = chartData.map((d) => ({
    name: d.tag,
    value: d.you + d.partner,
  }));
  const PIE_COLORS: string[] = [
    "oklch(70% 0.16 30)",
    "oklch(70% 0.16 70)",
    "oklch(70% 0.16 110)",
    "oklch(70% 0.16 150)",
    "oklch(70% 0.16 190)",
    "oklch(70% 0.16 230)",
    "oklch(70% 0.16 270)",
    "oklch(70% 0.16 310)",
  ];

  // helper to open edit dialog prefilled
  function openEditDialog(expense: any) {
    setEditExpenseId(expense._id);
    setEditForm({
      name: expense.name ?? "",
      amount: String(expense.amount ?? ""),
      purpose: expense.purpose ?? "",
      tags: (expense.tags ?? []).join(", "),
      isRecurring: !!expense.isRecurring,
      startDate: expense.startDate ? new Date(expense.startDate).toISOString().slice(0, 10) : "",
      endDate: expense.endDate ? new Date(expense.endDate).toISOString().slice(0, 10) : "",
      frequency: expense.frequency ?? "monthly",
      timeOfDay:
        typeof expense.timeOfDayMinutes === "number"
          ? `${String(Math.floor(expense.timeOfDayMinutes / 60)).padStart(2, "0")}:${String(expense.timeOfDayMinutes % 60).padStart(2, "0")}`
          : "",
      monthlyDay: expense.monthlyDay ? String(expense.monthlyDay) : "",
      annualMonth: expense.annualMonth ? String(expense.annualMonth) : "",
      annualDay: expense.annualDay ? String(expense.annualDay) : "",
    });
    // Prefill beneficiaries if present
    if (Array.isArray(expense.beneficiaries)) {
      setSelectedBeneficiaries(expense.beneficiaries as string[]);
    } else {
      setSelectedBeneficiaries([]);
    }
    setShowEditExpense(true);
  }

  const handleUpdateExpense = async () => {
    if (!editExpenseId || !editForm.name || !editForm.amount) return;
    try {
      // Enforce start date for recurring and default missing scheduling fields from start date
      let timeOfDay = editForm.timeOfDay;
      let monthlyDay = editForm.monthlyDay;
      let annualMonth = editForm.annualMonth;
      let annualDay = editForm.annualDay;

      if (editForm.isRecurring) {
        if (!editForm.startDate) {
          toast.error("Start date is required for recurring expenses");
          return;
        }
        const start = new Date(editForm.startDate);
        if (editForm.frequency === "daily" && !timeOfDay) {
          timeOfDay = `${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}`;
        }
        if (editForm.frequency === "monthly" && !monthlyDay) {
          monthlyDay = String(start.getDate());
        }
        if (editForm.frequency === "annual") {
          if (!annualMonth) annualMonth = String(start.getMonth() + 1);
          if (!annualDay) annualDay = String(start.getDate());
        }
      }

      const payload: any = {
        id: editExpenseId,
        name: editForm.name,
        amount: parseFloat(editForm.amount),
        purpose: editForm.purpose,
        tags: editForm.tags.split(",").map((t) => t.trim()).filter(Boolean),
        isRecurring: editForm.isRecurring,
        startDate: editForm.isRecurring && editForm.startDate ? new Date(editForm.startDate).getTime() : undefined,
        endDate: editForm.isRecurring && editForm.endDate ? new Date(editForm.endDate).getTime() : undefined,
        frequency: editForm.isRecurring ? editForm.frequency : undefined,
      };
      if (editForm.isRecurring) {
        if (editForm.frequency === "daily" && timeOfDay) {
          const [hh, mm] = timeOfDay.split(":").map(Number);
          if (!isNaN(hh) && !isNaN(mm)) payload.timeOfDayMinutes = hh * 60 + mm;
        }
        if (editForm.frequency === "monthly" && monthlyDay) {
          const d = parseInt(monthlyDay, 10);
          if (!isNaN(d)) payload.monthlyDay = d;
        }
        if (editForm.frequency === "annual") {
          const m = annualMonth ? parseInt(annualMonth, 10) : NaN;
          const d = annualDay ? parseInt(annualDay, 10) : NaN;
          if (!isNaN(m)) payload.annualMonth = m;
          if (!isNaN(d)) payload.annualDay = d;
        }
      }
      if (userRoom && userRoom.members.length > 2) {
        const beneficiaries = selectedBeneficiaries.filter(Boolean);
        if (beneficiaries.length > 0) {
          payload.beneficiaries = beneficiaries;
        }
      }
      await updateExpense(payload);
      setShowEditExpense(false);
      setEditExpenseId(null);
      toast.success("Expense updated");
    } catch {
      toast.error("Failed to update expense");
    }
  };

  // Currency symbol from room
  const currencySymbol = userRoom?.currencySymbol ?? "$";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-background p-8"
    >
      {/* Update: add print:hidden to the main content wrapper */}
      <div className="max-w-6xl mx-auto space-y-8 print:hidden">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Expense Tracker</h1>
            <p className="text-muted-foreground-2 mt-2">Track and compare expenses with your partner</p>
            <p className="text-xs text-muted-foreground mt-1">
              Signed in as: {user?.email ?? "Anonymous"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => navigate("/admin")}>
              Admin
            </Button>
            <Button variant="outline" onClick={signOut}>
              Sign Out
            </Button>
          </div>
        </div>

        {/* Room Management */}
        {!userRoom ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Get Started
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <Button onClick={handleCreateRoom} className="flex-1">
                  Create New Room
                </Button>

                {/* Add: Room Config Modal */}
                <Dialog open={showCreateRoomConfig} onOpenChange={setShowCreateRoomConfig}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Configure Room</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="currency">Currency</Label>
                        <Select value={newRoomCurrency} onValueChange={setNewRoomCurrency}>
                          <SelectTrigger id="currency">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="USD">USD ($)</SelectItem>
                            <SelectItem value="EUR">EUR (€)</SelectItem>
                            <SelectItem value="GBP">GBP (£)</SelectItem>
                            <SelectItem value="JPY">JPY (¥)</SelectItem>
                            <SelectItem value="INR">INR (₹)</SelectItem>
                            <SelectItem value="AUD">AUD (A$)</SelectItem>
                            <SelectItem value="CAD">CAD (C$)</SelectItem>
                            <SelectItem value="CHF">CHF (CHF)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="maxMembers">Max Members (min 2)</Label>
                        <Input
                          id="maxMembers"
                          type="number"
                          min={2}
                          value={newRoomMaxMembers}
                          onChange={(e) => setNewRoomMaxMembers(e.target.value)}
                        />
                      </div>
                      <Button onClick={handleConfirmCreateRoom} className="w-full">
                        Create Room
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                <Dialog open={showJoinRoom} onOpenChange={setShowJoinRoom}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="flex-1">
                      Join Existing Room
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Join Room</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="joinCode">Room Code</Label>
                        <Input
                          id="joinCode"
                          value={joinCode}
                          onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                          placeholder="Enter 6-character code"
                          maxLength={6}
                        />
                      </div>
                      <Button onClick={handleJoinRoom} className="w-full">
                        Join Room
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Room Info */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span className="font-medium">Room Code:</span>
                      <Badge variant="secondary" className="font-mono text-lg">
                        {userRoom.code}
                      </Badge>
                    </div>
                    <Button variant="ghost" size="sm" onClick={copyRoomCode}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-sm text-muted-foreground">
                      {userRoom.members.length} member{userRoom.members.length !== 1 ? 's' : ''}
                    </div>
                    {userBilling && (
                      <Badge variant={userBilling.premium ? "default" : "outline"}>
                        {userBilling.premium ? "Premium" : "Free"}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Subscription Card */}
            <Card>
              <CardHeader>
                <CardTitle>Subscription</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-4 items-center">
                  {!userBilling?.premium && (
                    <Button onClick={handleStartTrial} variant="outline">
                      Start 7-day free trial
                    </Button>
                  )}
                  <Button onClick={handleSubscribe}>
                    Subscribe {currencySymbol}{((pricing?.planPriceCents ?? 120) / 100).toFixed(2)}/mo
                  </Button>
                  {userBilling?.premium && (
                    <Button variant="destructive" onClick={handleCancelAtPeriodEnd}>
                      Cancel at end of period
                    </Button>
                  )}
                </div>
                {userBilling?.trialActive && (
                  <p className="text-sm text-muted-foreground">
                    Trial ends: {new Date(userBilling.trialEnd!).toLocaleDateString()}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Search & Scope */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Search & Scope</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="filter-name">Name</Label>
                    <Input
                      id="filter-name"
                      placeholder="e.g. groceries"
                      value={filters.name}
                      onChange={(e) => setFilters((p) => ({ ...p, name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="filter-person">Person</Label>
                    <Select
                      value={filters.person}
                      onValueChange={(v) =>
                        setFilters((p) => ({ ...p, person: v as "all" | "you" | "partner" }))
                      }
                    >
                      <SelectTrigger id="filter-person">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="you">You</SelectItem>
                        <SelectItem value="partner">Partner</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="filter-tags">Tags</Label>
                    <Input
                      id="filter-tags"
                      placeholder="food, utilities"
                      value={filters.tags}
                      onChange={(e) => setFilters((p) => ({ ...p, tags: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="filter-type">Type</Label>
                    <Select
                      value={filters.type}
                      onValueChange={(v) =>
                        setFilters((p) => ({ ...p, type: v as "all" | "one-time" | "recurring" }))
                      }
                    >
                      <SelectTrigger id="filter-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="one-time">One-time</SelectItem>
                        <SelectItem value="recurring">Recurring</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="filter-from">From</Label>
                    <Input
                      id="filter-from"
                      type="date"
                      value={filters.fromDate}
                      onChange={(e) => setFilters((p) => ({ ...p, fromDate: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="filter-to">To</Label>
                    <Input
                      id="filter-to"
                      type="date"
                      value={filters.toDate}
                      onChange={(e) => setFilters((p) => ({ ...p, toDate: e.target.value }))}
                    />
                  </div>
                </div>

                <Separator />

                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="text-sm text-muted-foreground">
                    Scoped totals based on filters and date range
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-sm">
                      <span className="font-medium">You:</span> {currencySymbol}{myTotalScoped.toFixed(2)}
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">Partner:</span> {currencySymbol}{partnerTotalScoped.toFixed(2)}
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">Difference:</span>{" "}
                      <span className={scopedDifference >= 0 ? "text-green-600" : "text-red-600"}>
                        {scopedDifference >= 0 ? "+" : "-"}{currencySymbol}{Math.abs(scopedDifference).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Add: Export PDF button */}
                <div className="flex justify-end">
                  <Button variant="outline" onClick={() => window.print()}>
                    Export PDF
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium">Your Total</span>
                  </div>
                  <p className="text-2xl font-bold mt-2">{currencySymbol}{myTotalScoped.toFixed(2)}</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium">Partner Total</span>
                  </div>
                  <p className="text-2xl font-bold mt-2">{currencySymbol}{partnerTotalScoped.toFixed(2)}</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-purple-600" />
                    <span className="text-sm font-medium">Combined Total</span>
                  </div>
                  <p className="text-2xl font-bold mt-2">{currencySymbol}{(myTotalScoped + partnerTotalScoped).toFixed(2)}</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-orange-600" />
                    <span className="text-sm font-medium">Difference</span>
                  </div>
                  <p className="text-2xl font-bold mt-2">{currencySymbol}{Math.abs(scopedDifference).toFixed(2)}</p>
                  {myTotalScoped > partnerTotalScoped && (
                    <p className="text-xs text-muted-foreground mt-1">You spend more</p>
                  )}
                  {partnerTotalScoped > myTotalScoped && (
                    <p className="text-xs text-muted-foreground mt-1">Partner spends more</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Add Expense and Controls */}
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <Label htmlFor="sort">Sort by:</Label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">Date</SelectItem>
                    <SelectItem value="amount">Amount</SelectItem>
                    <SelectItem value="name">Name</SelectItem>
                  </SelectContent>
                </Select>
                {/* Add: Chart type selector */}
                <Label htmlFor="chart-type" className="ml-2">Chart:</Label>
                <Select value={chartType} onValueChange={(v) => setChartType(v as "bar" | "pie")}>
                  <SelectTrigger id="chart-type" className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bar">Bar</SelectItem>
                    <SelectItem value="pie">Pie</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Dialog open={showAddExpense} onOpenChange={setShowAddExpense}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Expense
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add New Expense</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        value={expenseForm.name}
                        onChange={(e) => setExpenseForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Expense name"
                      />
                    </div>

                    <div>
                      <Label htmlFor="amount">Amount ($)</Label>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        value={expenseForm.amount}
                        onChange={(e) => setExpenseForm(prev => ({ ...prev, amount: e.target.value }))}
                        placeholder="0.00"
                      />
                    </div>

                    <div>
                      <Label htmlFor="purpose">Purpose</Label>
                      <Textarea
                        id="purpose"
                        value={expenseForm.purpose}
                        onChange={(e) => setExpenseForm(prev => ({ ...prev, purpose: e.target.value }))}
                        placeholder="What was this expense for?"
                        rows={2}
                      />
                    </div>

                    <div>
                      <Label htmlFor="tags">Tags (comma-separated)</Label>
                      <Input
                        id="tags"
                        value={expenseForm.tags}
                        onChange={(e) => setExpenseForm(prev => ({ ...prev, tags: e.target.value }))}
                        placeholder="food, entertainment, utilities"
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="recurring"
                        checked={expenseForm.isRecurring}
                        onCheckedChange={(checked) => setExpenseForm(prev => ({ ...prev, isRecurring: checked }))}
                      />
                      <Label htmlFor="recurring">Recurring expense</Label>
                    </div>

                    {expenseForm.isRecurring && (
                      <>
                        <div>
                          <Label htmlFor="frequency">Frequency</Label>
                          <Select
                            value={expenseForm.frequency}
                            onValueChange={(value) => setExpenseForm(prev => ({ ...prev, frequency: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="daily">Daily</SelectItem>
                              <SelectItem value="weekly">Weekly</SelectItem>
                              <SelectItem value="monthly">Monthly</SelectItem>
                              <SelectItem value="annual">Annual</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Scheduling fields based on frequency */}
                        {expenseForm.frequency === "daily" && (
                          <div>
                            <Label htmlFor="timeOfDay">Time of Day</Label>
                            <Input
                              id="timeOfDay"
                              type="time"
                              value={expenseForm.timeOfDay}
                              onChange={(e) => setExpenseForm(prev => ({ ...prev, timeOfDay: e.target.value }))}
                            />
                          </div>
                        )}

                        {expenseForm.frequency === "monthly" && (
                          <div>
                            <Label htmlFor="monthlyDay">Day of Month (1–31)</Label>
                            <Input
                              id="monthlyDay"
                              type="number"
                              min={1}
                              max={31}
                              value={expenseForm.monthlyDay}
                              onChange={(e) => setExpenseForm(prev => ({ ...prev, monthlyDay: e.target.value }))}
                              placeholder="e.g. 15"
                            />
                          </div>
                        )}

                        {expenseForm.frequency === "annual" && (
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="annualMonth">Month (1–12)</Label>
                              <Input
                                id="annualMonth"
                                type="number"
                                min={1}
                                max={12}
                                value={expenseForm.annualMonth}
                                onChange={(e) => setExpenseForm(prev => ({ ...prev, annualMonth: e.target.value }))}
                                placeholder="e.g. 7"
                              />
                            </div>
                            <div>
                              <Label htmlFor="annualDay">Day (1–31)</Label>
                              <Input
                                id="annualDay"
                                type="number"
                                min={1}
                                max={31}
                                value={expenseForm.annualDay}
                                onChange={(e) => setExpenseForm(prev => ({ ...prev, annualDay: e.target.value }))}
                                placeholder="e.g. 20"
                              />
                            </div>
                          </div>
                        )}

                        {/* Start / End Dates for recurring */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="startDate">Start Date</Label>
                            <Input
                              id="startDate"
                              type="date"
                              value={expenseForm.startDate}
                              onChange={(e) =>
                                setExpenseForm((prev) => ({ ...prev, startDate: e.target.value }))
                              }
                            />
                          </div>
                          <div>
                            <Label htmlFor="endDate">End Date</Label>
                            <Input
                              id="endDate"
                              type="date"
                              value={expenseForm.endDate}
                              onChange={(e) =>
                                setExpenseForm((prev) => ({ ...prev, endDate: e.target.value }))
                              }
                            />
                          </div>
                        </div>

                        {userRoom && userRoom.members.length > 2 && (
                          <div className="space-y-2">
                            <Label>Beneficiaries (who this expense is for)</Label>
                            <div className="flex flex-wrap gap-3">
                              {userRoom.members.map((memberId: string, idx: number) => {
                                const checked = selectedBeneficiaries.includes(memberId);
                                return (
                                  <label key={memberId} className="flex items-center gap-2 border rounded px-2 py-1">
                                    <Checkbox
                                      checked={checked}
                                      onCheckedChange={(isChecked: boolean) => {
                                        setSelectedBeneficiaries((prev) => {
                                          if (isChecked) {
                                            if (prev.includes(memberId)) return prev;
                                            return [...prev, memberId];
                                          } else {
                                            return prev.filter((id) => id !== memberId);
                                          }
                                        });
                                      }}
                                    />
                                    <span className="text-sm">{userLabel(memberId)}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    <Button onClick={handleAddExpense} className="w-full">
                      Add Expense
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={showEditExpense} onOpenChange={setShowEditExpense}>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Edit Expense</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="edit-name">Name</Label>
                      <Input
                        id="edit-name"
                        value={editForm.name}
                        onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-amount">Amount ($)</Label>
                      <Input
                        id="edit-amount"
                        type="number"
                        step="0.01"
                        value={editForm.amount}
                        onChange={(e) => setEditForm((p) => ({ ...p, amount: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-purpose">Purpose</Label>
                      <Textarea
                        id="edit-purpose"
                        rows={2}
                        value={editForm.purpose}
                        onChange={(e) => setEditForm((p) => ({ ...p, purpose: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-tags">Tags (comma-separated)</Label>
                      <Input
                        id="edit-tags"
                        value={editForm.tags}
                        onChange={(e) => setEditForm((p) => ({ ...p, tags: e.target.value }))}
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="edit-recurring"
                        checked={editForm.isRecurring}
                        onCheckedChange={(checked) => setEditForm((p) => ({ ...p, isRecurring: checked }))}
                      />
                      <Label htmlFor="edit-recurring">Recurring expense</Label>
                    </div>

                    {editForm.isRecurring && (
                      <>
                        <div>
                          <Label htmlFor="edit-frequency">Frequency</Label>
                          <Select
                            value={editForm.frequency}
                            onValueChange={(value) => setEditForm((p) => ({ ...p, frequency: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="daily">Daily</SelectItem>
                              <SelectItem value="weekly">Weekly</SelectItem>
                              <SelectItem value="monthly">Monthly</SelectItem>
                              <SelectItem value="annual">Annual</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {editForm.frequency === "daily" && (
                          <div>
                            <Label htmlFor="edit-timeOfDay">Time of Day</Label>
                            <Input
                              id="edit-timeOfDay"
                              type="time"
                              value={editForm.timeOfDay}
                              onChange={(e) => setEditForm((p) => ({ ...p, timeOfDay: e.target.value }))}
                            />
                          </div>
                        )}

                        {editForm.frequency === "monthly" && (
                          <div>
                            <Label htmlFor="edit-monthlyDay">Day of Month (1–31)</Label>
                            <Input
                              id="edit-monthlyDay"
                              type="number"
                              min={1}
                              max={31}
                              value={editForm.monthlyDay}
                              onChange={(e) => setEditForm((p) => ({ ...p, monthlyDay: e.target.value }))}
                            />
                          </div>
                        )}

                        {editForm.frequency === "annual" && (
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="edit-annualMonth">Month (1–12)</Label>
                              <Input
                                id="edit-annualMonth"
                                type="number"
                                min={1}
                                max={12}
                                value={editForm.annualMonth}
                                onChange={(e) => setEditForm((p) => ({ ...p, annualMonth: e.target.value }))}
                              />
                            </div>
                            <div>
                              <Label htmlFor="edit-annualDay">Day (1–31)</Label>
                              <Input
                                id="edit-annualDay"
                                type="number"
                                min={1}
                                max={31}
                                value={editForm.annualDay}
                                onChange={(e) => setEditForm((p) => ({ ...p, annualDay: e.target.value }))}
                              />
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="edit-startDate">Start Date</Label>
                            <Input
                              id="edit-startDate"
                              type="date"
                              value={editForm.startDate}
                              onChange={(e) => setEditForm((p) => ({ ...p, startDate: e.target.value }))}
                            />
                          </div>
                          <div>
                            <Label htmlFor="edit-endDate">End Date</Label>
                            <Input
                              id="edit-endDate"
                              type="date"
                              value={editForm.endDate}
                              onChange={(e) => setEditForm((p) => ({ ...p, endDate: e.target.value }))}
                            />
                          </div>
                        </div>

                        {userRoom && userRoom.members.length > 2 && (
                          <div className="space-y-2">
                            <Label>Beneficiaries (who this expense is for)</Label>
                            <div className="flex flex-wrap gap-3">
                              {userRoom.members.map((memberId: string, idx: number) => {
                                const checked = selectedBeneficiaries.includes(memberId);
                                return (
                                  <label key={memberId} className="flex items-center gap-2 border rounded px-2 py-1">
                                    <Checkbox
                                      checked={checked}
                                      onCheckedChange={(isChecked: boolean) => {
                                        setSelectedBeneficiaries((prev) => {
                                          if (isChecked) {
                                            if (prev.includes(memberId)) return prev;
                                            return [...prev, memberId];
                                          } else {
                                            return prev.filter((id) => id !== memberId);
                                          }
                                        });
                                      }}
                                    />
                                    <span className="text-sm">{userLabel(memberId)}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    <Button onClick={handleUpdateExpense} className="w-full">
                      Save Changes
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Expenses List */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Expenses</CardTitle>
              </CardHeader>
              <CardContent>
                {sortedExpenses.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No expenses yet. Add your first expense to get started!
                  </div>
                ) : (
                  <div className="space-y-4">
                    {sortedExpenses.map((expense) => (
                      <motion.div
                        key={expense._id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <h3 className="font-medium">{expense.name}</h3>
                            <Badge variant={expense.userId === user?._id ? "default" : "secondary"}>
                              {userLabel(expense.userId as any)}
                            </Badge>
                            {expense.isRecurring && (
                              <Badge variant="outline">
                                <Calendar className="h-3 w-3 mr-1" />
                                {expense.frequency}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{expense.purpose}</p>
                          {expense.tags.length > 0 && (
                            <div className="flex gap-1 mt-2">
                              {expense.tags.map((tag, index) => (
                                <Badge
                                  key={index}
                                  variant="outline"
                                  className="text-xs cursor-pointer"
                                  onClick={() => {
                                    const clicked = (tag || "").toLowerCase();
                                    setFilters((p) => ({
                                      ...p,
                                      tags: clicked,
                                      person: expense.userId === user?._id ? "you" : "partner",
                                    }));
                                  }}
                                  title={`Filter by tag "${tag}"`}
                                >
                                  <Tag className="h-2 w-2 mr-1" />
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-lg font-semibold">{currencySymbol}{expense.amount.toFixed(2)}</span>
                          {expense.userId === user?._id && (
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditDialog(expense)}
                                title="Edit"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteExpense(expense._id)}
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                        {Array.isArray(expense.beneficiaries) && userRoom && userRoom.members.length > 2 && (
                          <div className="mt-1">
                            <Badge variant="outline" className="text-xs">
                              For {expense.beneficiaries.length} member{expense.beneficiaries.length !== 1 ? "s" : ""}
                            </Badge>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tag Comparison Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Tag Comparison (Scoped)</CardTitle>
              </CardHeader>
              <CardContent>
                {chartData.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No data in the selected scope.
                  </div>
                ) : (
                  <ChartContainer
                    className="w-full"
                    config={{
                      you: { label: "You", color: "oklch(65% 0.2 170)" },
                      partner: { label: "Partner", color: "oklch(65% 0.2 40)" },
                    }}
                  >
                    {chartType === "bar" ? (
                      <BarChart data={chartData} margin={{ left: 8, right: 8 }}>
                        <CartesianGrid vertical={false} strokeDasharray="3 3" />
                        <XAxis dataKey="tag" />
                        <YAxis />
                        <RechartsTooltip content={<ChartTooltipContent />} />
                        <RechartsLegend content={<ChartLegendContent />} />
                        <Bar dataKey="you" fill="var(--color-you)" radius={4} />
                        <Bar dataKey="partner" fill="var(--color-partner)" radius={4} />
                      </BarChart>
                    ) : (
                      <PieChart>
                        <Pie data={chartData} dataKey="you" nameKey="tag" cx="50%" cy="50%" outerRadius={80} innerRadius={60} fill="#8884d8" />
                        <Pie data={chartData} dataKey="partner" nameKey="tag" cx="50%" cy="50%" outerRadius={80} innerRadius={60} fill="#82ca9d" />
                        <Cell key="you" fill="#8884d8" />
                        <Cell key="partner" fill="#82ca9d" />
                      </PieChart>
                    )}
                  </ChartContainer>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Add: Print-only report layout */}
      <div className="hidden print:block p-8">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">ExpenseSync – Report</h1>
              <p className="text-sm text-muted-foreground">
                Generated on {new Date().toLocaleString()}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Report Type</p>
              <p className="text-lg font-semibold">{reportType}</p>
            </div>
          </div>

          <div className="border rounded-md p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Period</p>
                <p className="font-medium">
                  {filters.fromDate ? new Date(filters.fromDate).toLocaleDateString() : "—"}{" "}
                  to{" "}
                  {filters.toDate ? new Date(filters.toDate).toLocaleDateString() : new Date().toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-8">
                <div>
                  <p className="text-sm text-muted-foreground">You</p>
                  <p className="text-xl font-semibold">{currencySymbol}{myTotalScoped.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Partner</p>
                  <p className="text-xl font-semibold">{currencySymbol}{partnerTotalScoped.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Difference</p>
                  <p className="text-xl font-semibold">
                    {currencySymbol}{Math.abs(scopedDifference).toFixed(2)} {scopedDifference >= 0 ? "(You)" : "(Partner)"}
                  </p>
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              This report is based on the current date range and filters.
            </p>
          </div>

          {/* Add: Print chart (matches user-selected chart type) */}
          <div className="border rounded-md p-4">
            <h2 className="text-lg font-semibold mb-2">Tag Comparison (Scoped)</h2>
            {chartData.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data in the selected scope.</p>
            ) : chartType === "bar" ? (
              <ChartContainer
                className="w-full"
                config={{
                  you: { label: "You", color: "oklch(65% 0.2 170)" },
                  partner: { label: "Partner", color: "oklch(65% 0.2 40)" },
                }}
              >
                <BarChart data={chartData} margin={{ left: 8, right: 8 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="tag" />
                  <YAxis />
                  <RechartsTooltip content={<ChartTooltipContent />} />
                  <RechartsLegend content={<ChartLegendContent />} />
                  <Bar dataKey="you" fill="var(--color-you)" radius={4} />
                  <Bar dataKey="partner" fill="var(--color-partner)" radius={4} />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="w-full">
                <PieChart width={700} height={380}>
                  <RechartsTooltip />
                  <RechartsLegend />
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={150}
                    innerRadius={70}
                    paddingAngle={2}
                    stroke="hsl(var(--border))"
                    strokeWidth={1}
                    label={(entry) => `${entry.name}`}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`print-cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </div>
            )}
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">Expenses (filtered)</h2>
            {sortedExpenses.length === 0 ? (
              <p className="text-sm text-muted-foreground">No expenses in the selected period.</p>
            ) : (
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="border-b text-left py-2">Name</th>
                    <th className="border-b text-left py-2">Person</th>
                    <th className="border-b text-left py-2">Tags</th>
                    <th className="border-b text-left py-2">Type</th>
                    <th className="border-b text-right py-2">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedExpenses.map((e) => (
                    <tr key={e._id}>
                      <td className="border-b py-2 pr-2">{e.name}</td>
                      <td className="border-b py-2 pr-2">{userLabel(e.userId as any)}</td>
                      <td className="border-b py-2 pr-2">{(e.tags || []).join(", ") || "—"}</td>
                      <td className="border-b py-2 pr-2">
                        {e.isRecurring ? `recurring (${e.frequency})` : "one-time"}
                      </td>
                      <td className="border-b py-2 pl-2 text-right">
                        {currencySymbol}{e.amount.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}