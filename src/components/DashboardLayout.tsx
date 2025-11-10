import { ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { BarChart3, Users, Calendar, TrendingUp, LogOut } from "lucide-react";
import { NavLink } from "@/components/NavLink";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { signOut, user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 w-64 bg-card border-r border-border">
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="bg-primary rounded-lg p-2">
                <BarChart3 className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="font-bold text-lg">Sales Tracker</h1>
                <p className="text-xs text-muted-foreground">Gestão Comercial</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-2">
            <NavLink
              to="/dashboard"
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
              activeClassName="bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
            >
              <TrendingUp className="h-5 w-5" />
              <span className="font-medium">Dashboard</span>
            </NavLink>

            <NavLink
              to="/fifty-scripts"
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
              activeClassName="bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
            >
              <Users className="h-5 w-5" />
              <span className="font-medium">50 Scripts</span>
            </NavLink>

            <NavLink
              to="/agenda"
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
              activeClassName="bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
            >
              <Calendar className="h-5 w-5" />
              <span className="font-medium">Agenda</span>
            </NavLink>
          </nav>

          <div className="p-4 border-t border-border">
            <div className="flex items-center justify-between mb-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.email}</p>
                <p className="text-xs text-muted-foreground">Closer</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => signOut()}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </aside>

      <main className="ml-64">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
