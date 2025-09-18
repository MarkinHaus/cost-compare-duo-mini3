import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { Id } from "@/convex/_generated/dataModel";
import type { Role } from "@/convex/schema";

export default function Admin() {
  const users = useQuery(api.admin.listUsers);
  const setUserRole = useMutation(api.admin.setUserRole);
  const setUserPremium = useMutation(api.admin.setUserPremium);

  const handleRoleChange = async (userId: Id<"users">, role: Role) => {
    try {
      await setUserRole({ userId, role });
      toast.success("Role updated successfully");
    } catch (error) {
      toast.error("Failed to update role");
    }
  };

  const handlePremiumToggle = async (userId: Id<"users">, premium: boolean) => {
    try {
      await setUserPremium({
        userId,
        premium,
        plan: premium ? "pro" : undefined,
        trialEnd: premium ? undefined : undefined,
      });
      toast.success(`Premium ${premium ? "enabled" : "disabled"} successfully`);
    } catch (error) {
      toast.error("Failed to update premium status");
    }
  };

  if (users === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (users === null || (Array.isArray(users) && users.length === 0)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Not authorized</h1>
          <p className="text-muted-foreground">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Admin Panel</h1>
            <p className="text-muted-foreground mt-2">Manage users and subscriptions</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Users Management</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {users.map((user) => (
                <div key={user._id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-medium">{user.name || "Unnamed"}</h3>
                      <Badge variant="outline">{user.email}</Badge>
                      {user.premium && (
                        <Badge variant="default">Premium</Badge>
                      )}
                      {user.trialEnd && Date.now() < user.trialEnd && (
                        <Badge variant="secondary">Trial</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">Role:</span>
                      <Select
                        value={user.role || "user"}
                        onValueChange={(value) => handleRoleChange(user._id, value as Role)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">User</SelectItem>
                          <SelectItem value="member">Member</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">Premium:</span>
                      <Switch
                        checked={user.premium || false}
                        onCheckedChange={(checked) => handlePremiumToggle(user._id, checked)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}