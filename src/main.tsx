import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query"
import { BrowserRouter, Route, Routes } from "react-router"
import { toast } from "sonner"
import { AppLayout } from "@/components/app-layout"
import { Toaster } from "@/components/ui/sonner"
import { ROUTE_PATH } from "@/constants/routes"
import { getErrorMessage } from "@/lib/get-error-message"
import { DashboardPage } from "@/pages/dashboard-page"
import { MatchesPage } from "@/pages/matches-page"
import { PlayerPage } from "@/pages/player-page"
import "./index.css"

const showError = (error: unknown) => {
  toast.error(getErrorMessage(error))
}

const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: showError }),
  mutationCache: new MutationCache({
    onSuccess: () => {
      void queryClient.invalidateQueries()
    },
    onError: showError,
  }),
})

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path={ROUTE_PATH.dashboard} element={<DashboardPage />} />
            <Route path={ROUTE_PATH.matches} element={<MatchesPage />} />
            <Route path={ROUTE_PATH.player} element={<PlayerPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster richColors />
    </QueryClientProvider>
  </StrictMode>,
)
