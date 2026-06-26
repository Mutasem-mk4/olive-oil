// ============================================================
// Zaytoun Vision — Zustand State Management
// ============================================================
// Central store for analysis state, history, and UI state.
// Uses Zustand for lightweight, type-safe state management.
// ============================================================

import { create } from 'zustand';
import type { AnalysisResult, LoadingState, DemoScenario } from '../types';
import { DEMO_SCENARIOS, DEMO_OIL_BREAKDOWNS, simulateAnalysis } from '../services/demo';
import { addToDemoHistory, getHistory, computeOilBreakdown } from '../services/api';
import type { OilBreakdown } from '../types';

interface AnalysisStore {
  // Current state
  currentResult: AnalysisResult | null;
  currentBreakdown: OilBreakdown[];
  loadingState: LoadingState;
  loadingMessage: string;
  selectedScenario: DemoScenario | null;
  
  // History
  history: AnalysisResult[];
  
  // Demo
  demoMode: boolean;
  demoScenarios: DemoScenario[];
  
  // Actions
  selectScenario: (scenario: DemoScenario) => void;
  runDemoAnalysis: (scenario: DemoScenario) => Promise<void>;
  setResult: (result: AnalysisResult, breakdown?: OilBreakdown[]) => void;
  clearResult: () => void;
  addToHistory: (result: AnalysisResult) => void;
  fetchHistory: () => Promise<void>;
  setLoadingState: (state: LoadingState, message?: string) => void;
  toggleDemoMode: () => void;
}

export const useAnalysisStore = create<AnalysisStore>((set, get) => ({
  // Initial state
  currentResult: null,
  currentBreakdown: [],
  loadingState: 'idle',
  loadingMessage: '',
  selectedScenario: null,
  history: [],
  demoMode: true,
  demoScenarios: DEMO_SCENARIOS,

  selectScenario: (scenario) => {
    set({ selectedScenario: scenario });
  },

  runDemoAnalysis: async (scenario) => {
    set({ loadingState: 'analyzing', loadingMessage: 'Initializing...' });

    await simulateAnalysis((stage) => {
      set({ loadingMessage: stage });
    });

    const result = {
      ...scenario.result,
      id: `zv-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
    };

    const breakdown = DEMO_OIL_BREAKDOWNS[scenario.id] || [];

    set({
      currentResult: result,
      currentBreakdown: breakdown,
      loadingState: 'complete',
      loadingMessage: 'Analysis complete!',
    });

    // Add to history
    get().addToHistory(result);
    addToDemoHistory(result);
  },

  setResult: (result, breakdown = []) => {
    const finalBreakdown = breakdown.length > 0 ? breakdown : computeOilBreakdown(result);
    set({ currentResult: result, currentBreakdown: finalBreakdown, loadingState: 'complete' });
    get().addToHistory(result);
    addToDemoHistory(result);
  },

  clearResult: () => {
    set({
      currentResult: null,
      currentBreakdown: [],
      loadingState: 'idle',
      loadingMessage: '',
      selectedScenario: null,
    });
  },

  addToHistory: (result) => {
    set((state) => ({
      history: [result, ...state.history],
    }));
  },

  fetchHistory: async () => {
    try {
      const response = await getHistory();
      set({ history: response.analyses });
    } catch (error) {
      console.error('Failed to fetch history:', error);
    }
  },

  setLoadingState: (state, message = '') => {
    set({ loadingState: state, loadingMessage: message });
  },

  toggleDemoMode: () => {
    set((state) => ({ demoMode: !state.demoMode }));
  },
}));
