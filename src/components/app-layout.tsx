import { CreatePlayerDialog } from "@/components/create-player-dialog"
import { Logo } from "@/components/logo"
import { buttonVariants } from "@/components/ui/button"
import { ROUTE_PATH } from "@/constants/routes"
import { cn } from "@/lib/utils"
import { Link, NavLink, Outlet } from "react-router"

const NAV_ITEMS = [
  { to: ROUTE_PATH.dashboard, label: "Leaderboard" },
  { to: ROUTE_PATH.rankings, label: "Rankings" },
  { to: ROUTE_PATH.tournaments, label: "Tournaments" },
  { to: ROUTE_PATH.matches, label: "History" },
]

export const AppLayout = () => (
  <div className="min-h-svh bg-muted/40">
    <header className="border-b bg-background">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3">
        <Link
          to={ROUTE_PATH.dashboard}
          className="flex items-center gap-2 font-heading text-lg font-semibold"
        >
          <Logo className="h-6 w-auto" />
          FLIM x SMASH
        </Link>
        <nav className="flex gap-1">
          {NAV_ITEMS.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "aria-[current=page]:bg-muted",
              )}
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto">
          <CreatePlayerDialog />
        </div>
      </div>
    </header>
    <main className="mx-auto max-w-6xl px-4 py-6">
      <Outlet />
    </main>
  </div>
)
