import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { GuideModeProvider } from "@/components/GuideMode";
import { AuthProvider } from "@/hooks/useAuth";
import AppNav from "@/components/AppNav";
import Index from "./pages/Index.tsx";
import Analysis from "./pages/Analysis.tsx";
import Login from "./pages/Login.tsx";
import { lazy, Suspense } from "react";
import NotFound from "./pages/NotFound.tsx";
import LoadingProgress from "@/components/LoadingProgress";

const Evidence = lazy(() => import("./pages/Evidence.tsx"));
const UraniumSignal = lazy(() => import("./pages/UraniumSignal.tsx"));
const UraniumAnalysis = lazy(() => import("./pages/UraniumAnalysis.tsx"));
const UraniumEvidence = lazy(() => import("./pages/UraniumEvidence.tsx"));
const SolanaSignal = lazy(() => import("./pages/SolanaSignal.tsx"));
const SolanaAnalysis = lazy(() => import("./pages/SolanaAnalysis.tsx"));
const SolanaEvidence = lazy(() => import("./pages/SolanaEvidence.tsx"));
const CopperSignal = lazy(() => import("./pages/CopperSignal.tsx"));
const EconomyDashboard = lazy(() => import("./pages/EconomyDashboard.tsx"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <GuideModeProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppNav />
            <div className="pt-[88px] md:pt-[96px]">
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<Login />} />
                <Route path="/analysis" element={<Analysis />} />
                <Route
                  path="/evidence"
                  element={
                    <Suspense fallback={<LoadingProgress message="Loading Evidence..." />}>
                      <Evidence />
                    </Suspense>
                  }
                />
                <Route
                  path="/uranium"
                  element={
                    <Suspense fallback={<LoadingProgress message="Loading Uranium..." />}>
                      <UraniumSignal />
                    </Suspense>
                  }
                />
                <Route
                  path="/uranium/analysis"
                  element={
                    <Suspense fallback={<LoadingProgress message="Loading Uranium Analysis..." />}>
                      <UraniumAnalysis />
                    </Suspense>
                  }
                />
                <Route
                  path="/uranium/evidence"
                  element={
                    <Suspense fallback={<LoadingProgress message="Loading Uranium Evidence..." />}>
                      <UraniumEvidence />
                    </Suspense>
                  }
                />
                <Route
                  path="/solana"
                  element={
                    <Suspense fallback={<LoadingProgress message="Loading Solana..." />}>
                      <SolanaSignal />
                    </Suspense>
                  }
                />
                <Route
                  path="/solana/analysis"
                  element={
                    <Suspense fallback={<LoadingProgress message="Loading Solana Analysis..." />}>
                      <SolanaAnalysis />
                    </Suspense>
                  }
                />
                <Route
                  path="/solana/evidence"
                  element={
                    <Suspense fallback={<LoadingProgress message="Loading Solana Evidence..." />}>
                      <SolanaEvidence />
                    </Suspense>
                  }
                />
                <Route
                  path="/copper"
                  element={
                    <Suspense fallback={<LoadingProgress message="Loading Copper..." />}>
                      <CopperSignal />
                    </Suspense>
                  }
                />
                <Route
                  path="/economy"
                  element={
                    <Suspense fallback={<LoadingProgress message="Loading Economy..." />}>
                      <EconomyDashboard />
                    </Suspense>
                  }
                />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </div>
          </BrowserRouter>
        </AuthProvider>
      </GuideModeProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
