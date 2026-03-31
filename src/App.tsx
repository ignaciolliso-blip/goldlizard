import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { GuideModeProvider } from "@/components/GuideMode";
import AppNav from "@/components/AppNav";
import Index from "./pages/Index.tsx";
import Analysis from "./pages/Analysis.tsx";
import { lazy, Suspense } from "react";
import NotFound from "./pages/NotFound.tsx";
import LoadingProgress from "@/components/LoadingProgress";

const Evidence = lazy(() => import("./pages/Evidence.tsx"));
const UraniumSignal = lazy(() => import("./pages/UraniumSignal.tsx"));
const UraniumAnalysis = lazy(() => import("./pages/UraniumAnalysis.tsx"));
const UraniumEvidence = lazy(() => import("./pages/UraniumEvidence.tsx"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <GuideModeProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppNav />
          <div className="pt-[88px] md:pt-[96px]">
            <Routes>
              <Route path="/" element={<Index />} />
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
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </BrowserRouter>
      </GuideModeProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
