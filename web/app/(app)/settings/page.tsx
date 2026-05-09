"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { mockUser } from "@/lib/mock-data";
import { useAuthStore } from "@/lib/auth-store";
import { User, Bell, Shield, Trash2 } from "lucide-react";

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user) ?? mockUser;
  const [profile, setProfile] = useState({
    displayName: user.displayName,
    username: user.username,
    email: user.email,
    bio: user.bio ?? "",
  });

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-[var(--color-text)]">Settings</h1>

      {/* Profile */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-[var(--color-accent)]" />
            <CardTitle>Profile</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <Avatar name={user.displayName} size="lg" />
            <Button variant="outline" size="sm">Change photo</Button>
          </div>
          <Input label="Display name" value={profile.displayName}
            onChange={(e) => setProfile((p) => ({ ...p, displayName: e.target.value }))} />
          <Input label="Username" value={profile.username}
            onChange={(e) => setProfile((p) => ({ ...p, username: e.target.value }))} />
          <Input label="Email" type="email" value={profile.email}
            onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))} />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--color-text-muted)]">Bio</label>
            <textarea
              rows={3}
              value={profile.bio}
              onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))}
              className="bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-[var(--radius-md)] px-3 py-2.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] resize-none"
              placeholder="Tell people about yourself..."
            />
          </div>
          <Button className="self-start">Save changes</Button>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-[var(--color-accent)]" />
            <CardTitle>Notifications</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {[
            { label: "Kudos on activities", desc: "When someone gives you kudos" },
            { label: "New followers", desc: "When someone follows you" },
            { label: "Weekly summary", desc: "Your training recap every Monday" },
          ].map(({ label, desc }) => (
            <label key={label} className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="text-sm font-medium text-[var(--color-text)]">{label}</p>
                <p className="text-xs text-[var(--color-text-muted)]">{desc}</p>
              </div>
              <div className="relative">
                <input type="checkbox" defaultChecked className="sr-only peer" />
                <div className="w-10 h-5 bg-[var(--color-border)] rounded-full peer peer-checked:bg-[var(--color-accent)] transition-colors" />
                <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5 shadow" />
              </div>
            </label>
          ))}
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-[var(--color-accent)]" />
            <CardTitle>Security</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Input label="Current password" type="password" placeholder="••••••••" />
          <Input label="New password" type="password" placeholder="••••••••" />
          <Input label="Confirm new password" type="password" placeholder="••••••••" />
          <Button variant="secondary" className="self-start">Update password</Button>
        </CardContent>
      </Card>

      {/* Danger */}
      <Card className="border-[var(--color-red)]/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-[var(--color-red)]" />
            <CardTitle className="text-[var(--color-red)]">Danger Zone</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-[var(--color-text-muted)] mb-4">Permanently delete your account and all data. This cannot be undone.</p>
          <Button variant="danger" size="sm">Delete account</Button>
        </CardContent>
      </Card>
    </div>
  );
}
