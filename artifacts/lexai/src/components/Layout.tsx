import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import {
  MessageSquare, FileText, Users, Calendar, Crown, Settings, LogOut, Scale, Home
} from "lucide-react";

const navItems = [
  { path: "/dashboard", icon: Home, label: "Dashboard" },
  { path: "/chat", icon: MessageSquare, label: "AI Assistant" },
  { path: "/documents", icon: FileText, label: "Documents" },
  { path: "/lawyernet", icon: Users, label: "LawyerNet" },
  { path: "/messages", icon: MessageSquare, label: "Messages" },
  { path: "/bookings", icon: Calendar, label: "Bookings" },
  { path: "/membership", icon: Crown, label: "Membership" },
  { path: "/settings", icon: Settings, label: "Settings" },
];

export default function Layout({ children }: { children: ReactNode }) {
  const { user, token, logout } = useAuth();
  const [location] = useLocation();

  const handleLogout = async () => {
    try {
      await apiFetch("/auth/logout", token, { method: "POST" });
    } catch {}
    logout();
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 flex flex-col border-r border-border bg-sidebar shrink-0">
        {/* Logo */}
        <div className="px-6 py-5 border-b border-sidebar-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 gold-gradient rounded-lg flex items-center justify-center">
              <Scale className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold text-foreground tracking-tight">LexAI</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map(({ path, icon: Icon, label }) => {
            const isActive = location === path || (path !== "/dashboard" && location.startsWith(path));
            return (
              <Link
                key={path}
                href={path}
                className={`nav-item ${isActive ? "active" : ""}`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* User info */}
        <div className="px-3 py-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 px-3 py-2 mb-1">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-semibold shrink-0">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{user?.firstName} {user?.lastName}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.membershipPlan === "PREMIUM" ? "Premium" : "Free Plan"}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="nav-item w-full text-left text-destructive hover:text-destructive hover:bg-destructive/10">
            <LogOut className="w-4 h-4 shrink-0" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
