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
import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { Id } from "@/convex/_generated/dataModel";

export default function Dashboard() {
  const { isLoading, isAuthenticated, user, signOut } = useAuth();
  const navigate = useNavigate();
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showJoinRoom, setShowJoinRoom] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [sortBy, setSortBy] = useState("date");
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

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/auth");
    }
  }, [isLoading, isAuthenticated, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const handleCreateRoom = async () => {
    try {
      const room = await createRoom({});
      toast.success("Room created successfully!");
    } catch (error) {
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

      // Add scheduling fields conditionally
      if (expenseForm.isRecurring) {
        if (expenseForm.frequency === "daily" && expenseForm.timeOfDay) {
          const [hh, mm] = expenseForm.timeOfDay.split(":").map(Number);
          if (!isNaN(hh) && !isNaN(mm)) {
            payload.timeOfDayMinutes = hh * 60 + mm;
          }
        }
        if (expenseForm.frequency === "monthly" && expenseForm.monthlyDay) {
          const d = parseInt(expenseForm.monthlyDay, 10);
          if (!isNaN(d)) payload.monthlyDay = d;
        }
        if (expenseForm.frequency === "annual") {
          const m = parseInt(expenseForm.annualMonth, 10);
          const d = parseInt(expenseForm.annualDay, 10);
          if (!isNaN(m)) payload.annualMonth = m;
          if (!isNaN(d)) payload.annualDay = d;
        }
      }

      await createExpense(payload);

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

  // Helper: count occurrences for recurring expenses up to now (respecting scheduling)
  function countOccurrences(e: any, nowMs: number): number {
    if (!e.isRecurring) return 1;
    if (!e.startDate) return 0;

    const start = e.startDate;
    const end = e.endDate ?? nowMs;
    const until = Math.min(end, nowMs);
    if (until < start) return 0;

    const msInDay = 24 * 60 * 60 * 1000;

    const clampDay = (d: number, y: number, m: number) => {
      // clamp day to month length
      const last = new Date(y, m + 1, 0).getDate();
      return Math.max(1, Math.min(d, last));
    };

    // Align first occurrence time for daily with timeOfDayMinutes
    if (e.frequency === "daily") {
      const minutes = typeof e.timeOfDayMinutes === "number" ? e.timeOfDayMinutes : 0;
      const startDate = new Date(start);
      const alignedStart = new Date(
        startDate.getFullYear(),
        startDate.getMonth(),
        startDate.getDate(),
        Math.floor(minutes / 60),
        minutes % 60,
        0,
        0
      ).getTime();

      // If alignedStart is before provided start timestamp day boundary, keep it; otherwise first occurrence might be next day
      const first = alignedStart < start ? alignedStart + msInDay : alignedStart;
      if (until < first) return 0;
      const diff = until - first;
      return Math.floor(diff / msInDay) + 1;
    }

    if (e.frequency === "weekly") {
      // Use the weekday of startDate; first occurrence is start day/time
      const first = start;
      if (until < first) return 0;
      const weekMs = 7 * msInDay;
      const diff = until - first;
      return Math.floor(diff / weekMs) + 1;
    }

    if (e.frequency === "monthly") {
      const sd = new Date(start);
      const monthlyDay = typeof e.monthlyDay === "number" ? e.monthlyDay : sd.getDate();

      // First occurrence
      const firstDay = clampDay(monthlyDay, sd.getFullYear(), sd.getMonth());
      let first = new Date(sd.getFullYear(), sd.getMonth(), firstDay, 0, 0, 0, 0).getTime();
      if (first < start) {
        // Go to next month
        const nextMonthDate = new Date(sd.getFullYear(), sd.getMonth() + 1, 1);
        const d = clampDay(monthlyDay, nextMonthDate.getFullYear(), nextMonthDate.getMonth());
        first = new Date(nextMonthDate.getFullYear(), nextMonthDate.getMonth(), d, 0, 0, 0, 0).getTime();
      }
      if (until < first) return 0;

      // Count months between first and until inclusive
      const fu = new Date(first);
      const uu = new Date(until);
      const monthsDiff = (uu.getFullYear() - fu.getFullYear()) * 12 + (uu.getMonth() - fu.getMonth());
      // Check if the occurrence day in the last month has passed
      const lastOccurDay = clampDay(monthlyDay, uu.getFullYear(), uu.getMonth());
      const lastOccur = new Date(uu.getFullYear(), uu.getMonth(), lastOccurDay, 0, 0, 0, 0).getTime();
      const passed = until >= lastOccur ? 1 : 0;
      return monthsDiff + passed;
    }

    if (e.frequency === "annual") {
      const sd = new Date(start);
      const month = typeof e.annualMonth === "number" ? e.annualMonth : (sd.getMonth() + 1); // 1..12
      const day = typeof e.annualDay === "number" ? e.annualDay : sd.getDate(); // 1..31

      // First occurrence
      const firstDay = clampDay(day, sd.getFullYear(), month - 1);
      let first = new Date(sd.getFullYear(), month - 1, firstDay, 0, 0, 0, 0).getTime();
      if (first < start) {
        const nextYear = sd.getFullYear() + 1;
        const d = clampDay(day, nextYear, month - 1);
        first = new Date(nextYear, month - 1, d, 0, 0, 0, 0).getTime();
      }
      if (until < first) return 0;

      const fu = new Date(first);
      const uu = new Date(until);
      let yearsDiff = uu.getFullYear() - fu.getFullYear();

      // Has this year's anniversary passed?
      const thisYearDay = clampDay(day, uu.getFullYear(), month - 1);
      const thisAnniv = new Date(uu.getFullYear(), month - 1, thisYearDay, 0, 0, 0, 0).getTime();
      if (until >= thisAnniv) yearsDiff += 1;

      return yearsDiff;
    }

    // Default (non-recognized frequency): count once
    return 1;
  }

  // Compute effective totals with recurrence accumulation
  const now = Date.now();
  const myExpenses = expenses?.filter(e => e.userId === user?._id) || [];
  const partnerExpenses = expenses?.filter(e => e.userId !== user?._id) || [];

  const myTotal = myExpenses.reduce((sum, e) => {
    const count = countOccurrences(e, now);
    return sum + e.amount * count;
  }, 0);

  const partnerTotal = partnerExpenses.reduce((sum, e) => {
    const count = countOccurrences(e, now);
    return sum + e.amount * count;
  }, 0);

  const totalExpenses = myTotal + partnerTotal;
  const difference = Math.abs(myTotal - partnerTotal);

  // Sort expenses
  const sortedExpenses = expenses?.sort((a, b) => {
    switch (sortBy) {
      case "amount":
        return b.amount - a.amount;
      case "name":
        return a.name.localeCompare(b.name);
      default:
        return b.createdAt - a.createdAt;
    }
  }) || [];

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
    setShowEditExpense(true);
  }

  const handleUpdateExpense = async () => {
    if (!editExpenseId || !editForm.name || !editForm.amount) return;
    try {
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
        if (editForm.frequency === "daily" && editForm.timeOfDay) {
          const [hh, mm] = editForm.timeOfDay.split(":").map(Number);
          if (!isNaN(hh) && !isNaN(mm)) payload.timeOfDayMinutes = hh * 60 + mm;
        }
        if (editForm.frequency === "monthly" && editForm.monthlyDay) {
          const d = parseInt(editForm.monthlyDay, 10);
          if (!isNaN(d)) payload.monthlyDay = d;
        }
        if (editForm.frequency === "annual") {
          const m = parseInt(editForm.annualMonth, 10);
          const d = parseInt(editForm.annualDay, 10);
          if (!isNaN(m)) payload.annualMonth = m;
          if (!isNaN(d)) payload.annualDay = d;
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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-background p-8"
    >
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Expense Tracker</h1>
            <p className="text-muted-foreground mt-2">Track and compare expenses with your partner</p>
          </div>
          <Button variant="outline" onClick={signOut}>
            Sign Out
          </Button>
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
                  <div className="text-sm text-muted-foreground">
                    {userRoom.members.length} member{userRoom.members.length !== 1 ? 's' : ''}
                  </div>
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
                  <p className="text-2xl font-bold mt-2">${myTotal.toFixed(2)}</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium">Partner Total</span>
                  </div>
                  <p className="text-2xl font-bold mt-2">${partnerTotal.toFixed(2)}</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-purple-600" />
                    <span className="text-sm font-medium">Combined Total</span>
                  </div>
                  <p className="text-2xl font-bold mt-2">${totalExpenses.toFixed(2)}</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-orange-600" />
                    <span className="text-sm font-medium">Difference</span>
                  </div>
                  <p className="text-2xl font-bold mt-2">${difference.toFixed(2)}</p>
                  {myTotal > partnerTotal && (
                    <p className="text-xs text-muted-foreground mt-1">You spend more</p>
                  )}
                  {partnerTotal > myTotal && (
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
                              {expense.userId === user?._id ? "You" : "Partner"}
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
                                <Badge key={index} variant="outline" className="text-xs">
                                  <Tag className="h-2 w-2 mr-1" />
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-lg font-semibold">${expense.amount.toFixed(2)}</span>
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
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </motion.div>
  );
}