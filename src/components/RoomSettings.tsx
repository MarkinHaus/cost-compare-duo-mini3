import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Copy, Users, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

interface RoomSettingsProps {
  userRoom: any;
  userBilling: any;
  onRoomChange?: () => void;
}

export function RoomSettings({ userRoom, userBilling, onRoomChange }: RoomSettingsProps) {
  const [showCreateRoomConfig, setShowCreateRoomConfig] = useState(false);
  const [showJoinRoom, setShowJoinRoom] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [newRoomMaxMembers, setNewRoomMaxMembers] = useState("2");
  const [newRoomCurrency, setNewRoomCurrency] = useState("USD");
  const [joinCode, setJoinCode] = useState("");
  const [selectedRoomCode, setSelectedRoomCode] = useState<string>("");

  const createRoom = useMutation(api.rooms.create);
  const joinRoom = useMutation(api.rooms.join);
  const removeRoom = useMutation(api.rooms.removeMyRoom);
  const myRooms = useQuery(api.rooms.listMyRooms);
  const memberRooms = useQuery(api.rooms.listMemberRooms);

  const currencyOptions = [
    { code: "USD", symbol: "$" },
    { code: "EUR", symbol: "€" },
    { code: "GBP", symbol: "£" },
    { code: "JPY", symbol: "¥" },
    { code: "INR", symbol: "₹" },
    { code: "AUD", symbol: "A$" },
    { code: "CAD", symbol: "C$" },
    { code: "CHF", symbol: "CHF" }
  ];

  const copyRoomCode = () => {
    if (userRoom?.code) {
      navigator.clipboard.writeText(userRoom.code);
      toast.success("Room code copied to clipboard!");
    }
  };

  const handleCopyInviteLink = (code: string) => {
    // Change: copy an auth-based invite link so unauthenticated users can click and be routed through Auth,
    // which will then process the invite post-login. This also works for already-authenticated users.
    const inviteUrl = `${window.location.origin}/auth?invite=${encodeURIComponent(code)}`;
    navigator.clipboard.writeText(inviteUrl);
    toast.success("Invite link copied to clipboard!");
  };

  const handleCreateRoom = async () => {
    try {
      const maxMembers = Math.max(2, parseInt(newRoomMaxMembers) || 2);
      const clampedMaxMembers = !userBilling?.premium ? Math.min(maxMembers, 3) : maxMembers;
      
      await createRoom({
        maxMembers: clampedMaxMembers,
        currencyCode: newRoomCurrency
      });
      
      setShowCreateRoomConfig(false);
      setNewRoomMaxMembers("2");
      setNewRoomCurrency("USD");
      toast.success("Room created successfully!");
      onRoomChange?.();
    } catch (error: any) {
      toast.error(error.message || "Failed to create room");
    }
  };

  const handleCreateRoomInherit = async () => {
    if (!userRoom) return;
    
    try {
      await createRoom({
        maxMembers: userRoom.maxMembers,
        currencyCode: userRoom.currencyCode
      });
      toast.success("Room created with current settings!");
      onRoomChange?.();
    } catch (error: any) {
      toast.error(error.message || "Failed to create room");
    }
  };

  const handleJoinRoom = async () => {
    if (!joinCode.trim()) {
      toast.error("Please enter a room code");
      return;
    }

    try {
      await joinRoom({ code: joinCode.trim().toUpperCase() });
      setShowJoinRoom(false);
      setJoinCode("");
      toast.success("Joined room successfully!");
      onRoomChange?.();
    } catch (error: any) {
      toast.error(error.message || "Failed to join room");
    }
  };

  const handleSwitchRoom = (roomCode: string) => {
    setSelectedRoomCode(roomCode);
    onRoomChange?.();
  };

  const handleDeleteRoom = async (roomCode: string) => {
    try {
      await removeRoom({ code: roomCode });
      setShowDeleteConfirm(null);
      toast.success("Room deleted successfully!");
      onRoomChange?.();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete room");
    }
  };

  // Combine and deduplicate rooms
  const allRooms = [...(myRooms || []), ...(memberRooms || [])];
  const dedupedRooms = allRooms.filter((room, index, self) => 
    index === self.findIndex(r => r.code === room.code)
  );

  return (
    <div className="space-y-6">
      {/* Current Room Settings */}
      {userRoom && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Current Room Settings
            </CardTitle>
            <CardDescription>
              Your active room configuration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-muted-foreground">Currency:</span>
                <div className="font-semibold">{userRoom.currencyCode}</div>
              </div>
              <div>
                <span className="font-medium text-muted-foreground">Member Limit:</span>
                <div className="font-semibold">{userRoom.maxMembers}</div>
              </div>
            </div>
            
            {/* Room Code Display */}
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

            <Button onClick={handleCreateRoomInherit} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Create Room with these settings
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Room Management Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Room Management</CardTitle>
          <CardDescription>
            {userBilling?.premium ? "Create and manage multiple rooms" : "Join or create a room"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <Dialog open={showCreateRoomConfig} onOpenChange={setShowCreateRoomConfig}>
              <DialogTrigger asChild>
                <Button className="flex-1">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Room
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Configure New Room</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="currency">Currency</Label>
                    <Select value={newRoomCurrency} onValueChange={setNewRoomCurrency}>
                      <SelectTrigger id="currency">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {currencyOptions.map((curr) => (
                          <SelectItem key={curr.code} value={curr.code}>
                            {curr.code} ({curr.symbol})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="maxMembers">Max Members</Label>
                    <Input
                      id="maxMembers"
                      type="number"
                      min="2"
                      max={userBilling?.premium ? "100" : "3"}
                      value={newRoomMaxMembers}
                      onChange={(e) => setNewRoomMaxMembers(e.target.value)}
                    />
                    {!userBilling?.premium && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Free users limited to 3 members
                      </p>
                    )}
                  </div>
                  <Button onClick={handleCreateRoom} className="w-full">
                    Create Room
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={showJoinRoom} onOpenChange={setShowJoinRoom}>
              <DialogTrigger asChild>
                <Button variant="outline" className="flex-1">
                  <Users className="h-4 w-4 mr-2" />
                  Join Room
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Join Existing Room</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="joinCode">Room Code</Label>
                    <Input
                      id="joinCode"
                      placeholder="Enter 6-character code"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
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

      {/* Premium Room List */}
      {userBilling?.premium && dedupedRooms.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Your Rooms</CardTitle>
            <CardDescription>
              Manage all your rooms ({dedupedRooms.length} total)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dedupedRooms.map((room) => {
                const isOwner = myRooms?.some(r => r.code === room.code);
                const isActive = room.code === userRoom?.code;
                
                return (
                  <div
                    key={room.code}
                    className={`rounded-lg border p-4 ${isActive ? 'border-primary bg-primary/5' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="font-mono">
                            {room.code}
                          </Badge>
                          {isActive && (
                            <Badge variant="default" className="text-xs">
                              Active
                            </Badge>
                          )}
                          {isOwner && (
                            <Badge variant="outline" className="text-xs">
                              Owner
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {room.members?.length || 0}/{room.maxMembers} members • {room.currencyCode}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopyInviteLink(room.code)}
                        >
                          <Users className="h-4 w-4" />
                        </Button>
                        
                        {!isActive && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSwitchRoom(room.code)}
                          >
                            Switch
                          </Button>
                        )}
                        
                        {isOwner && (
                          <AlertDialog 
                            open={showDeleteConfirm === room.code} 
                            onOpenChange={(open) => setShowDeleteConfirm(open ? room.code : null)}
                          >
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => setShowDeleteConfirm(room.code)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Room</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete room {room.code}? This will permanently delete all expenses in this room. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteRoom(room.code)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete Room
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}