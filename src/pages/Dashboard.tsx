import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { motion } from "framer-motion";
import { Plus, Copy, Users, TrendingUp, Calendar, Tag, Trash2, BarChart3, Pencil } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import { useMutation, useQuery, useAction } from "convex/react";
import { toast } from "sonner";
import type { Id } from "@/convex/_generated/dataModel";
import { ChartContainer, ChartTooltipContent, ChartLegendContent } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip, Legend as RechartsLegend, PieChart, Pie, Cell } from "recharts";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { RoomSettings } from "@/components/RoomSettings";
/* removed duplicate useMutation import */

export default function Dashboard() {
  const { isLoading, isAuthenticated, user, signOut } = useAuth();
  const location = useLocation();
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

  // Cookie & Legal modals state
  const [showCookieModal, setShowCookieModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showTrialExpiredModal, setShowTrialExpiredModal] = useState(false);

  // Initialize cookie & terms visibility from localStorage
  useEffect(() => {
    try {
      const cookieAccepted = localStorage.getItem("cookieConsentAccepted");
      const termsAccepted = localStorage.getItem("termsPrivacyAccepted");

      // Show cookie modal only if acceptance state is missing
      if (cookieAccepted === null) setShowCookieModal(true);
      // Show terms modal only if acceptance state is missing
      if (termsAccepted === null) setShowTermsModal(true);
    } catch {
      // If localStorage is blocked, don't break UX
    }
  }, []);

  // Cookie consent handlers
  const handleCookieAcceptAll = () => {
    try {
      localStorage.setItem("cookieConsentAccepted", "true");
      localStorage.setItem("cookieConsentLevel", "all");
    } catch {}
    setShowCookieModal(false);
    toast("Cookie preferences saved: All cookies enabled.");
  };

  const handleCookieAllowAnalytics = () => {
    try {
      localStorage.setItem("cookieConsentAccepted", "true");
      localStorage.setItem("cookieConsentLevel", "analytics");
    } catch {}
    setShowCookieModal(false);
    toast("Cookie preferences saved: Analytics only.");
  };

  const handleCookieDecline = () => {
    try {
      localStorage.setItem("cookieConsentAccepted", "false");
      localStorage.setItem("cookieConsentLevel", "none");
    } catch {}
    setShowCookieModal(false);
    toast("Cookie preferences saved: Declined.");
  };

  // Terms & Privacy handlers
  const handleTermsAccept = () => {
    try {
      localStorage.setItem("termsPrivacyAccepted", "true");
    } catch {}
    setShowTermsModal(false);
    toast("Terms & Privacy accepted.");
  };

  const handleTermsDecline = () => {
    try {
      localStorage.setItem("termsPrivacyAccepted", "false");
    } catch {}
    setShowTermsModal(false);
    toast("You declined the Terms & Privacy.");
  };

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

  // ADD: load my owned rooms and rooms I'm a member of (for premium management panel)
  const myRooms = useQuery(api.rooms.listMyRooms);
  const memberRooms = useQuery(api.rooms.listMemberRooms);

  // ADD: selected room state to allow switching rooms in the UI (defaults to backend room)
  const [selectedRoomCode, setSelectedRoomCode] = useState<string | null>(null);

  // ADD: compute combined rooms and active room
  const combinedRooms: Array<any> = [
    ...((myRooms as any) ?? []),
    ...((memberRooms as any) ?? []),
  ].filter(Boolean);

  const dedupedRooms = Array.from(
    new Map(combinedRooms.map((r: any) => [r.code, r])).values()
  );

  const activeRoom = selectedRoomCode
    ? dedupedRooms.find((r: any) => r.code === selectedRoomCode) ?? null
    : null;

  // Keep selectedRoom in sync if not set yet
  useEffect(() => {
    if (!selectedRoomCode && userRoom?.code) {
      setSelectedRoomCode(userRoom.code);
    }
  }, [userRoom, selectedRoomCode]);

  const expenses = useQuery(
    api.expenses.getByRoom,
    activeRoom ? { roomCode: activeRoom.code } : "skip"
  );

  // Add: load member profiles for labeling when rooms have >2 members
  const memberProfiles = useQuery(
    api.users.getProfilesByIds,
    activeRoom ? { ids: activeRoom.members as any } : "skip"
  );

  // Fix typo in filters state key
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
  /* removed deprecated cancelAtPeriodEnd action hook */
  const userBilling = useQuery(api.subscriptions.getMe);
  const pricing = useQuery(api.subscriptions.getPricing);
  const [showCancelNow, setShowCancelNow] = useState(false);
  const cancelNowAction = useAction(api.subscriptions_actions.cancelNow);
  const cancelNowImmediate = useAction(api.subscriptions_actions.cancelNow);
  const downgradeToFreeSimple = useMutation(api.subscriptions.downgradeToFreeSimple);

  // Mutation to join a room by code
  const joinRoomByCode = useMutation(api.rooms.join);

  // Add: immediate room creation mutation
  const createRoomImmediate = useMutation(api.rooms.create);

  // Helper to copy invite link
  function handleCopyInviteLink(code: string) {
    const origin = window.location.origin;
    const link = `${origin}/dashboard?invite=${encodeURIComponent(code)}`;
    navigator.clipboard
      .writeText(link)
      .then(() => {
        try {
          // @ts-ignore
          toast.success?.("Invite link copied!") ?? toast("Invite link copied!");
        } catch {
          toast("Invite link copied!");
        }
      })
      .catch(() => {
        try {
          // @ts-ignore
          toast.error?.("Failed to copy invite link.") ?? toast("Failed to copy invite link.");
        } catch {
          toast("Failed to copy invite link.");
        }
      });
  }

  // Replace broken invite auto-join effect with a correct, robust implementation
  // Auto-join invite flow via ?invite=CODE
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlCode = params.get("invite");

    let storedCode: string | null = null;
    try {
      storedCode = localStorage.getItem("pendingInviteCode");
    } catch {
      storedCode = null;
    }

    const inviteCode = urlCode || storedCode;
    if (!inviteCode) return;

    const isLoggedIn = Boolean(user?._id);
    if (!isLoggedIn) {
      try {
        localStorage.setItem("pendingInviteCode", inviteCode);
      } catch {}
      window.location.assign("/auth");
      return;
    }

    (async () => {
      try {
        await joinRoomByCode({ code: inviteCode });
        toast("Joined room via invite.");
      } catch (err: any) {
        const msg = String(err?.message || err || "");
        const lower = msg.toLowerCase();
        if (lower.includes("free") && lower.includes("room")) {
          toast("Free users can only be in one room. Upgrade to Premium to join more rooms.");
        } else {
          toast("Unable to join room. The invite may be invalid or the room is full.");
        }
      } finally {
        try {
          localStorage.removeItem("pendingInviteCode");
        } catch {}
        if (urlCode) {
          const clean = new URL(window.location.href);
          clean.searchParams.delete("invite");
          window.history.replaceState(null, "", `${clean.pathname}${clean.search}${clean.hash}`);
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?._id]);

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

  // Trigger modal when the free trial has ended and the user is not premium
  useEffect(() => {
    const ended =
      !!userBilling?.trialEnd &&
      Date.now() >= (userBilling?.trialEnd ?? 0) &&
      !userBilling?.premium;

    if (ended) {
      setShowTrialExpiredModal(true);
    }
  }, [userBilling?.trialEnd, userBilling?.premium]);

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
      /* removed deprecated cancelAtPeriodEnd */
      toast.success("Subscription will be canceled at the end of the current period");
    } catch (e) {
      toast.error("Failed to schedule cancellation");
    }
  };

  // Handler for immediate cancel now from the trial-ended prompt
  const handleTrialCancelNow = async () => {
    try {
      await cancelNowImmediate({});
      toast.success("Premium canceled and data pruned. You're now on Free.");
      setShowTrialExpiredModal(false);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to cancel now");
    }
  };

  // Add: helper to format remaining time from milliseconds
  function formatRemaining(ms: number) {
    const totalSec = Math.floor(ms / 1000);
    const days = Math.floor(totalSec / (3600 * 24));
    const hours = Math.floor((totalSec % (3600 * 24)) / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  }

  // Add: continue as free user handler
  const handleContinueAsFree = async () => {
    try {
      await downgradeToFreeSimple({});
      toast.success("You're now on the Free plan");
      setShowTrialExpiredModal(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to downgrade");
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

  // Add: palette for per-user bar colors (fallback loop)
  const MEMBER_COLORS: Array<string> = [
    "#2563eb", // blue-600
    "#16a34a", // green-600
    "#dc2626", // red-600
    "#f59e0b", // amber-500
    "#7c3aed", // violet-600
    "#0ea5e9", // sky-500
    "#d946ef", // fuchsia-500
    "#10b981", // emerald-500
    "#ef4444", // red-500
    "#eab308", // yellow-500
  ];

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

  // Add: compute scoped totals by member using beneficiaries and recurrence
  function computeMemberScopedTotals(
    expenses: Array<any>,
    memberIds: Array<string>,
    meId: string,
    fromMs: number,
    toMs: number,
    getOccurrences: (e: any, fromMs: number, toMs: number) => number,
    getBeneficiariesFn: (e: any) => Array<string>
  ) {
    const totals: Record<string, number> = {};
    for (const id of memberIds) totals[id] = 0;

    for (const e of expenses) {
      const occ = getOccurrences(e, fromMs, toMs);
      if (occ <= 0) continue;

      const bens = getBeneficiariesFn(e);
      const share = bens.length > 0 ? e.amount / bens.length : e.amount;

      for (const b of bens) {
        if (!(b in totals)) continue;
        totals[b] += share * occ;
      }
    }

    const myTotal = totals[meId] ?? 0;
    const others: Array<{ id: string; total: number; diffVsMe: number }> = [];
    for (const id of memberIds) {
      if (id === meId) continue;
      const t = totals[id] ?? 0;
      others.push({ id, total: t, diffVsMe: Math.abs(myTotal - t) });
    }
    return { totals, myTotal, others };
  }

  // Scoped totals using filtered list and window-aware accumulation
  const memberIds = (activeRoom?.members ?? []) as Array<string>;
  const meId = user?._id as string;
  const scopedTotalsComputed = computeMemberScopedTotals(
    filteredExpenses,
    memberIds,
    meId,
    fromMs,
    toMs,
    countOccurrencesInWindow,
    getBeneficiaries
  );
  const myTotalScoped = scopedTotalsComputed.myTotal;
  const otherMembersScoped = scopedTotalsComputed.others;

  // Also compute combined total if needed
  const combinedTotalScoped = myTotalScoped + otherMembersScoped.reduce((s, o) => s + o.total, 0);

  const scopedDifference = myTotalScoped - otherMembersScoped.reduce((s, o) => s + o.total, 0);

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

  // Build per-user tag data (1..n members) for Bar chart, and combined totals for Pie chart
  const memberIdOrder: Array<string> = (activeRoom?.members ?? []) as Array<string>;
  const memberLabels: Array<string> = memberIdOrder.map((id) => userLabel(id));
  // Dynamic legend/tooltip config for ChartContainer
  const chartConfig: Record<string, { label: string; color: string }> = {};
  memberLabels.forEach((label, idx) => {
    chartConfig[label] = { label, color: MEMBER_COLORS[idx % MEMBER_COLORS.length] };
  });

  // Map: tag -> { [userLabel]: totalAmountInScope }
  const tagMap: Record<string, Record<string, number>> = {};
  for (const e of filteredExpenses) {
    const count = countOccurrencesInWindow(e, fromMs, toMs);
    if (count <= 0) continue;
    const tags = (e.tags && e.tags.length > 0 ? e.tags : ["untagged"]).map((t: string) => t.toLowerCase());
    const beneficiaries = getBeneficiaries(e);
    const share = beneficiaries.length > 0 ? (e.amount * count) / beneficiaries.length : e.amount * count;
    for (const tag of tags) {
      if (!tagMap[tag]) tagMap[tag] = {};
      for (const uid of beneficiaries) {
        const label = userLabel(uid);
        tagMap[tag][label] = (tagMap[tag][label] ?? 0) + share;
      }
    }
  }

  // Recharts dataset: [{ tag, <userLabel1>: n, <userLabel2>: m, ... }, ...]
  const chartData = Object.entries(tagMap).map(([tag, perUser]) => {
    const row: Record<string, any> = { tag };
    for (const label of memberLabels) {
      row[label] = Number((perUser[label] ?? 0).toFixed(2));
    }
    return row;
  });

  // Pie data: combined total per tag
  const pieData = chartData.map((d) => {
    let sum = 0;
    for (const label of memberLabels) sum += d[label] ?? 0;
    return { name: d.tag, value: sum };
  });
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
  const currencySymbol = activeRoom?.currencySymbol ?? "$";

  // Add: handler to create a room inheriting current room settings
  async function handleCreateRoomInherit() {
    try {
      const currencyCode = newRoomCurrency ?? "USD";
      const maxMembers = newRoomMaxMembers ?? 3;
      await createRoomImmediate({ currencyCode, maxMembers: Number(maxMembers) });
      toast.success("Room created with current settings");
    } catch (err: any) {
      toast.error(err?.message || "Failed to create room");
    }
  }

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
            {user?.role === "admin" && (
              <Button variant="ghost" onClick={() => navigate("/admin")}>
                Admin
              </Button>
            )}
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
            {/* Room Info (moved into Manage Rooms) */}
            {false && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span className="font-medium">Room Code:</span>
                      <Badge variant="secondary" className="font-mono text-lg">
                        {userRoom?.code ?? "------"}
                      </Badge>
                    </div>
                    <Button variant="ghost" size="sm" onClick={copyRoomCode}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-sm text-muted-foreground">
                      {(userRoom?.members?.length ?? 0)} member{((userRoom?.members?.length ?? 0) !== 1 ? "s" : "")}
                    </div>
                    {userBilling && (
                      <Badge variant={(userBilling?.premium ? "default" : "outline")}>
                        {userBilling?.premium ? "Premium" : "Free"}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
            )}

            {/* Subscription Card (moved below; hidden here) */}
            <Card className="hidden">
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
                </div>
                {userBilling?.trialActive && typeof userBilling?.remainingMs === "number" && userBilling.remainingMs > 0 && (
                  <div className="text-sm text-muted-foreground">
                    Trial: {formatRemaining(userBilling.remainingMs)} remaining
                  </div>
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
                      <span className="font-medium">Partner:</span> {currencySymbol}{otherMembersScoped.reduce((s, o) => s + o.total, 0).toFixed(2)}
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
                  <p className="text-2xl font-bold mt-2">{currencySymbol}{otherMembersScoped.reduce((s, o) => s + o.total, 0).toFixed(2)}</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-purple-600" />
                    <span className="text-sm font-medium">Combined Total</span>
                  </div>
                  <p className="text-2xl font-bold mt-2">{currencySymbol}{combinedTotalScoped.toFixed(2)}</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-orange-600" />
                    <span className="text-sm font-medium">Difference</span>
                  </div>
                  <p className="text-2xl font-bold mt-2">{currencySymbol}{Math.abs(scopedDifference).toFixed(2)}</p>
                  {myTotalScoped > otherMembersScoped.reduce((s, o) => s + o.total, 0) && (
                    <p className="text-xs text-muted-foreground mt-1">You spend more</p>
                  )}
                  {otherMembersScoped.reduce((s, o) => s + o.total, 0) > myTotalScoped && (
                    <p className="text-xs text-muted-foreground mt-1">Partner spends more</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle>Members</CardTitle>
                  <CardDescription>Totals in this scope</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {otherMembersScoped.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No other members</div>
                  ) : (
                    otherMembersScoped.map((m, idx) => (
                      <div key={m.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: MEMBER_COLORS[idx % MEMBER_COLORS.length] }}
                          />
                          <span className="text-sm font-medium">{userLabel(m.id)}</span>
                        </div>
                        <div className="text-sm font-semibold">
                          {currencySymbol}{m.total.toFixed(2)}
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle>Differences</CardTitle>
                  <CardDescription>Compared to You</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {otherMembersScoped.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No differences to show</div>
                  ) : (
                    otherMembersScoped.map((m, idx) => {
                      const otherMore = m.total > myTotalScoped;
                      const diff = Math.abs(myTotalScoped - m.total);
                      return (
                        <div key={m.id} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div
                              className="h-3 w-3 rounded-full"
                              style={{ backgroundColor: MEMBER_COLORS[idx % MEMBER_COLORS.length] }}
                            />
                            <span className="text-sm font-medium">
                              {otherMore ? `${userLabel(m.id)} spends more` : `You spend more vs ${userLabel(m.id)}`}
                            </span>
                          </div>
                          <div className={`text-sm font-semibold ${otherMore ? "text-red-600" : "text-emerald-600"}`}>
                            {otherMore ? "+" : "-"}
                            {currencySymbol}{diff.toFixed(2)}
                          </div>
                        </div>
                      );
                    })
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
                          {/* New: Recurring start date and scoped total */}
                          {expense.isRecurring && (
                            <div className="text-xs text-muted-foreground mt-2">
                              Starts: {expense.startDate ? new Date(expense.startDate).toLocaleDateString() : "—"} · In scope: {currencySymbol}
                              {(expense.amount * countOccurrencesInWindow(expense, fromMs, toMs)).toFixed(2)} ({countOccurrencesInWindow(expense, fromMs, toMs)}×)
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-lg font-semibold">{currencySymbol}{expense.amount.toFixed(2)}</span>
                          {(expense.userId === user?._id || userRoom?.createdBy === (user?._id as any)) && (
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditDialog(expense)}
                                title="Edit"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              {expense.userId === user?._id && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteExpense(expense._id)}
                                  title="Delete"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
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
                    config={chartConfig}
                  >
                    {chartType === "bar" ? (
                      <BarChart data={chartData} margin={{ left: 8, right: 8 }}>
                        <CartesianGrid vertical={false} strokeDasharray="3 3" />
                        <XAxis dataKey="tag" />
                        <YAxis />
                        <RechartsTooltip content={<ChartTooltipContent />} />
                        <RechartsLegend content={<ChartLegendContent />} />
                        {memberIds.map((id, idx) => (
                          <Bar
                            key={id}
                            dataKey={userLabel(id)}
                            stackId={undefined} // not stacking; separate bars per tag
                            fill={MEMBER_COLORS[idx % MEMBER_COLORS.length]}
                            radius={[4, 4, 0, 0]}
                          />
                        ))}
                      </BarChart>
                    ) : (
                      <PieChart>
                        <RechartsTooltip />
                        <RechartsLegend />
                        <Pie
                          data={pieData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          innerRadius={60}
                        >
                          {pieData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={PIE_COLORS[index % PIE_COLORS.length]}
                            />
                          ))}
                        </Pie>
                      </PieChart>
                    )}
                  </ChartContainer>
                )}
              </CardContent>
            </Card>

            {/* Manage Rooms - Current Configuration and Quick Create */}
            <div className="mt-4 rounded-lg border p-4 bg-card">
              <h4 className="font-semibold mb-2">Current Room Settings</h4>
              <div className="text-sm text-muted-foreground space-y-3">
                {/* Currency */}
                <div className="flex flex-col">
                  <label className="font-medium text-foreground mb-1" htmlFor="currency">
                    Currency
                  </label>
                  <select
                    id="currency"
                    className="border rounded p-1 text-foreground bg-background"
                    value={newRoomCurrency ?? "USD"}
                    onChange={(e) => setNewRoomCurrency(e.target.value)}
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="JPY">JPY (¥)</option>
                    <option value="INR">INR (₹)</option>
                    <option value="AUD">AUD (A$)</option>
                    <option value="CAD">CAD (C$)</option>
                    <option value="CHF">CHF (CHF)</option>
                  </select>
                </div>

                {/* Member limit */}
                <div className="flex flex-col">
                  <label className="font-medium text-foreground mb-1" htmlFor="maxMembers">
                    Member Limit
                  </label>
                  <input
                    type="number"
                    id="maxMembers"
                    min={1}
                    max={100}
                    className="border rounded p-1 text-foreground bg-background"
                    value={newRoomMaxMembers ?? 3}
                    onChange={(e) => setNewRoomMaxMembers(e.target.value)}
                  />
                </div>
              </div>

              <div className="mt-3">
                <Button onClick={handleCreateRoomInherit}>
                  Create Room with these settings
                </Button>
              </div>
            </div>

          </>
        )}

        {/* Premium-only Room Management Panel at bottom */}
        {userBilling?.premium && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Manage Rooms</CardTitle>
              <CardDescription>Premium-only room management</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Current Room Code (moved here from standalone card) */}
              {userRoom && (
                <div className="rounded-md border p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-medium">Room Code:</span>
                    <Badge variant="secondary" className="font-mono text-base">
                      {userRoom.code}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={copyRoomCode}>
                      <Copy className="h-4 w-4 mr-1" />
                      Copy
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleCopyInviteLink(userRoom.code)}
                    >
                      <Users className="h-4 w-4 mr-1" />
                      Invite
                    </Button>
                  </div>
                </div>
              )}
              {/* Global actions */}
              <div className="flex flex-wrap gap-3">
                <Dialog open={showJoinRoom} onOpenChange={setShowJoinRoom}>
                  <DialogTrigger asChild>
                    <Button variant="outline">Join Room</Button>
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

              {/* Rooms list */}
              {dedupedRooms.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  You are not in any rooms yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {dedupedRooms.map((r: any) => {
                    const isOwner = r.createdBy === (user?._id as any);
                    const isActive = r.code === selectedRoomCode;
                    return (
                      <div
                        key={r.code}
                        className="flex items-center justify-between border rounded-md p-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Room {r.code}</span>
                            <button
                              type="button"
                              onClick={() => handleCopyInviteLink(r.code)}
                              className="inline-flex items-center rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground hover:opacity-90"
                              aria-label={`Copy invite link for room ${r.code}`}
                              title="Invite"
                            >
                              Invite
                            </button>
                            {isActive && (
                              <Badge variant="default">Active</Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {r.members?.length ?? 0} member{(r.members?.length ?? 0) !== 1 ? "s" : ""} · Max {r.maxMembers} · {r.currencySymbol} ({r.currencyCode})
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant={isActive ? "secondary" : "outline"}
                            size="sm"
                            onClick={() => {
                              setSelectedRoomCode(r.code);
                              toast.success(`Switched to room ${r.code}`);
                            }}
                          >
                            Switch Room
                          </Button>
                          {isOwner && (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="destructive" size="sm">
                                  Delete
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Delete room {r.code}?</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <p className="text-sm text-muted-foreground">
                                    This will permanently delete the room and all its expenses. Only the room owner can delete their room.
                                  </p>
                                  <div className="flex justify-end gap-2">
                                    <Button variant="outline" onClick={() => {}}>
                                      Cancel
                                    </Button>
                                    <Button
                                      variant="destructive"
                                      onClick={async () => {
                                        try {
                                          await useMutation(api.rooms.removeMyRoom)({ code: r.code });
                                          toast.success(`Deleted room ${r.code}`);
                                          // If we deleted the active room, clear selection
                                          setSelectedRoomCode((prev) => (prev === r.code ? null : prev));
                                        } catch (e) {
                                          toast.error("Failed to delete room");
                                        }
                                      }}
                                    >
                                      Confirm Delete
                                    </Button>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {userBilling?.premium ? (
          <div className="mt-8 border rounded-lg p-4 bg-red-50 dark:bg-red-950/20">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-red-700 dark:text-red-300">Danger Zone</h3>
                <p className="text-sm text-muted-foreground">
                  Immediate cancellation will revoke premium and delete your owned rooms.
                </p>
              </div>
              <Button variant="destructive" onClick={() => setShowCancelNow(true)}>
                Cancel Now
              </Button>
            </div>
          </div>
        ) : null}

        {/* Trial Ended Prompt */}
        <AlertDialog open={showTrialExpiredModal} onOpenChange={setShowTrialExpiredModal}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Your free trial has ended</AlertDialogTitle>
              <AlertDialogDescription>
                To keep premium features (unlimited rooms, higher member limits, etc.), please subscribe.
                If you choose not to subscribe, you can Cancel Now which will immediately revoke premium
                access and delete all rooms you own and their expenses, and remove you from any other rooms.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setShowTrialExpiredModal(false)}>
                Decide Later
              </AlertDialogCancel>
              <Button variant="default" onClick={() => { setShowTrialExpiredModal(false); handleSubscribe(); }}>
                Subscribe
              </Button>
              <AlertDialogAction asChild>
                <Button variant="destructive" onClick={handleTrialCancelNow}>
                  Cancel Now (delete my data)
                </Button>
              </AlertDialogAction>
              <Button variant="secondary" onClick={handleContinueAsFree}>
                Continue as Free
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={showCancelNow} onOpenChange={setShowCancelNow}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel Premium Now?</AlertDialogTitle>
              <AlertDialogDescription>
                If you cancel now, your premium access will end immediately. All rooms you own will be deleted, and you will lose access to any other rooms you are a member of. This action cannot be undone. Do you want to continue?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setShowCancelNow(false)}>
                Keep Premium
              </AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={async () => {
                  try {
                    await cancelNowAction({});
                    // Close the dialog and rely on reactive queries to refresh the UI,
                    // which will hide premium-only panels and detach from deleted rooms.
                    setShowCancelNow(false);
                  } catch (e) {
                    // no toast here to keep minimal; existing error handling/notifications apply
                    setShowCancelNow(false);
                  }
                }}
              >
                Confirm & Cancel Premium
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Cookie Consent Modal */}
        <Dialog open={showCookieModal} onOpenChange={setShowCookieModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Cookie Preferences</DialogTitle>
              <DialogDescription>
                We use cookies to enhance your experience. Choose your preference below. You can change this later in your browser settings.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 space-y-2 text-sm text-muted-foreground">
              <p className="text-foreground">What we use:</p>
              <ul className="list-disc pl-6">
                <li>Essential cookies for core functionality</li>
                <li>Optional analytics to improve the product</li>
              </ul>
            </div>
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Button variant="secondary" onClick={handleCookieDecline}>
                Decline
              </Button>
              <Button variant="outline" onClick={handleCookieAllowAnalytics}>
                Allow Analytics Only
              </Button>
              <Button onClick={handleCookieAcceptAll}>
                Accept All
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Terms & Privacy Modal */}
        <Dialog open={showTermsModal} onOpenChange={setShowTermsModal}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Terms & Privacy</DialogTitle>
              <DialogDescription>
                Please review our Terms of Service and Privacy Policy. By accepting, you agree to the terms outlined.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 space-y-2 text-sm text-muted-foreground">
              <p>
                We collect minimal data required to operate collaborative rooms, subscriptions, and security. See details in our policies below.
              </p>
              <div className="text-primary underline">
                {/* Replace with actual hosted documents if available */}
                <a href="#" onClick={(e) => e.preventDefault()}>View Terms of Service</a> ·{" "}
                <a href="#" onClick={(e) => e.preventDefault()}>View Privacy Policy</a>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Button variant="secondary" onClick={handleTermsDecline}>
                Decline
              </Button>
              <Button onClick={handleTermsAccept}>
                Accept
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Optional enhancement: quick access to Terms & Privacy */}
        <div className="fixed bottom-4 right-4 z-40 print:hidden">
          <Button
            variant="outline"
            size="sm"
            className="opacity-80 hover:opacity-100"
            onClick={() => setShowTermsModal(true)}
          >
            Terms & Privacy
          </Button>
        </div>

        {/* Add: Bottom subscription card for free users */}
        {!userBilling?.premium && (
          <div className="fixed bottom-4 left-4 right-4 z-50 print:hidden">
            <div className="mx-auto max-w-3xl">
              <Card className="shadow-lg border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75">
                <CardContent className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4">
                  <div className="space-y-1">
                    <div className="font-semibold">Upgrade to Premium</div>
                    <div className="text-sm text-muted-foreground">
                      • Unlimited rooms • Larger member limits • Enhanced charts & PDF • Priority support
                    </div>
                  </div>
                  <Button onClick={handleSubscribe} className="whitespace-nowrap">
                    Subscribe {currencySymbol}{(((pricing?.planPriceCents ?? 120) / 100)).toFixed(2)}/mo
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
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
              {/* Replace the old You/Partner/Difference trio with a multi-user breakdown */}
              <div className="w-full">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Per-member totals */}
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Members (scoped totals)</p>
                    <div className="space-y-1">
                      {memberIds.map((id, idx) => (
                        <div key={`print-member-${id}`} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div
                              className="h-3 w-3 rounded-full"
                              style={{ backgroundColor: MEMBER_COLORS[idx % MEMBER_COLORS.length] }}
                            />
                            <span className="text-sm font-medium">{userLabel(id)}</span>
                          </div>
                          <div className="text-sm font-semibold">
                            {currencySymbol}{(scopedTotalsComputed.totals[id] ?? 0).toFixed(2)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Differences vs You */}
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Differences (vs You)</p>
                    {otherMembersScoped.length === 0 ? (
                      <div className="text-sm text-muted-foreground">No other members</div>
                    ) : (
                      <div className="space-y-1">
                        {otherMembersScoped.map((m, idx) => {
                          const otherMore = m.total > myTotalScoped;
                          const diff = Math.abs(myTotalScoped - m.total);
                          return (
                            <div key={`print-diff-${m.id}`} className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div
                                  className="h-3 w-3 rounded-full"
                                  style={{ backgroundColor: MEMBER_COLORS[idx % MEMBER_COLORS.length] }}
                                />
                                <span className="text-sm font-medium">
                                  {otherMore ? `${userLabel(m.id)} spends more` : `You spend more vs ${userLabel(m.id)}`}
                                </span>
                              </div>
                              <div className={`text-sm font-semibold ${otherMore ? "text-red-600" : "text-emerald-600"}`}>
                                {otherMore ? "+" : "-"}{currencySymbol}{diff.toFixed(2)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
                {/* Combined total */}
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Combined Total</span>
                  <span className="text-sm font-semibold">{currencySymbol}{combinedTotalScoped.toFixed(2)}</span>
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
                config={chartConfig}
              >
                <BarChart data={chartData} margin={{ left: 8, right: 8 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="tag" />
                  <YAxis />
                  <RechartsTooltip content={<ChartTooltipContent />} />
                  <RechartsLegend content={<ChartLegendContent />} />
                  {memberIds.map((id, idx) => (
                    <Bar
                      key={id}
                      dataKey={userLabel(id)}
                      stackId={undefined} // not stacking; separate bars per tag
                      fill={MEMBER_COLORS[idx % MEMBER_COLORS.length]}
                      radius={[4, 4, 0, 0]}
                    />
                  ))}
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
                      <Cell
                        key={`print-cell-${index}`}
                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                      />
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
                    {/* Add: Start date for recurring */}
                    <th className="border-b text-left py-2">Start</th>
                    {/* Add: In-scope total for recurring */}
                    <th className="border-b text-right py-2">In-scope</th>
                    <th className="border-b text-right py-2">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedExpenses.map((e) => (
                    <tr key={e._id}>
                      <td className="border-b py-2 pr-2">
                        <span className="whitespace-nowrap">
                          {e.name}
                          {e.ownerOverrideEdit ? (
                            <span className="ml-2 text-[10px] text-red-600 print:text-black">
                              (owner edit)
                            </span>
                          ) : null}
                        </span>
                      </td>
                      <td className="border-b py-2 pr-2">{userLabel(e.userId as any)}</td>
                      <td className="border-b py-2 pr-2">{(e.tags || []).join(", ") || "—"}</td>
                      <td className="border-b py-2 pr-2">
                        {e.isRecurring ? `recurring (${e.frequency})` : "one-time"}
                      </td>
                      {/* Add: Start date column */}
                      <td className="border-b py-2 pr-2">
                        {e.isRecurring && e.startDate ? new Date(e.startDate).toLocaleDateString() : "—"}
                      </td>
                      {/* Add: In-scope total column */}
                      <td className="border-b py-2 pl-2 text-right">
                        {e.isRecurring
                          ? `${currencySymbol}${(e.amount * countOccurrencesInWindow(e, fromMs, toMs)).toFixed(2)} (${countOccurrencesInWindow(e, fromMs, toMs)}×)`
                          : "—"}
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