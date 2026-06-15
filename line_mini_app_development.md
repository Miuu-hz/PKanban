# LINE Mini App Frontend Development Guide
## Planka Kanban Integration — Complete Implementation

**Version:** 1.0.0
**Tech Stack:** React 18 + TypeScript 5 + Vite + Tailwind CSS + LIFF SDK v2.26.0
**Target:** LINE Mini App (LIFF Full Mode)

---

# Table of Contents

1. [Project Architecture](#1-project-architecture)
2. [LIFF Integration Module](#2-liff-integration-module)
3. [Authentication Flow](#3-authentication-flow-implementation)
4. [Kanban Board Components](#4-kanban-board-components-architecture)
5. [Mobile-Optimized Kanban UX](#5-mobile-optimized-kanban-ux-design)
6. [Complete Page Flow](#6-complete-page-flow)
7. [API Integration](#7-api-integration-code)
8. [Offline-First Strategy](#8-offline-first-strategy)
9. [Environment Configuration](#9-environment-configuration)
10. [Build & Deploy Guide](#10-build--deploy-guide)

---

# 1. Project Architecture

## 1.1 Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Framework** | React 18.3+ | UI library with hooks |
| **Language** | TypeScript 5.4+ | Type safety |
| **Bundler** | Vite 5.0+ | Fast dev & optimized builds |
| **Styling** | Tailwind CSS 3.4+ | Utility-first CSS |
| **State** | Zustand 4.5+ | Lightweight global state |
| **HTTP** | Axios 1.6+ | API client with interceptors |
| **Drag/Drop** | @dnd-kit/core + sensors | Touch-friendly Kanban DnD |
| **Forms** | React Hook Form + Zod | Form handling & validation |
| **Dates** | date-fns | Date formatting & manipulation |
| **Icons** | lucide-react | Lightweight icon set |
| **LIFF** | @line/liff SDK 2.26+ | LINE integration |
| **WS** | native WebSocket | Real-time sync |
| **Testing** | Vitest + Testing Library | Unit & integration tests |

## 1.2 Project Folder Structure

```
planka-liff-app/
├── .env                          # Environment variables
├── .env.local                    # Local overrides (gitignored)
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.js
├── package.json
├── index.html
│
├── public/
│   └── liff-init.js              # LIFF SDK loader
│
├── src/
│   ├── main.tsx                  # Entry point
│   ├── App.tsx                   # Root component
│   ├── index.css                 # Global styles + Tailwind
│   │
│   ├── types/                    # TypeScript interfaces
│   │   ├── models.ts             # Planka entity types
│   │   ├── api.ts                # API request/response types
│   │   ├── liff.ts               # LIFF custom types
│   │   └── index.ts              # Barrel export
│   │
│   ├── lib/                      # Core utilities & config
│   │   ├── constants.ts          # App constants
│   │   ├── config.ts             # Runtime config resolver
│   │   ├── utils.ts              # General utilities
│   │   └── cn.ts                 # Tailwind class merge (clsx+twMerge)
│   │
│   ├── modules/
│   │   └── liff/
│   │       ├── liff.ts           # LIFF SDK wrapper module
│   │       ├── LiffProvider.tsx  # React context provider
│   │       └── useLiff.ts        # LIFF hook
│   │
│   ├── services/
│   │   ├── authService.ts        # Authentication logic
│   │   ├── apiClient.ts          # Axios instance with interceptors
│   │   └── websocketService.ts   # WebSocket connection manager
│   │
│   ├── stores/                   # Zustand state stores
│   │   ├── useAuthStore.ts
│   │   ├── useBoardStore.ts
│   │   ├── useKanbanStore.ts
│   │   └── useUIStore.ts
│   │
│   ├── api/                      # API endpoint functions
│   │   ├── boardsApi.ts
│   │   ├── columnsApi.ts
│   │   ├── cardsApi.ts
│   │   ├── labelsApi.ts
│   │   └── membersApi.ts
│   │
│   ├── hooks/                    # Reusable React hooks
│   │   ├── useAuth.ts
│   │   ├── useBoard.ts
│   │   ├── useWebSocket.ts
│   │   ├── useDragAndDrop.ts
│   │   ├── usePullToRefresh.ts
│   │   ├── useLongPress.ts
│   │   ├── useOfflineQueue.ts
│   │   ├── useOptimisticUpdate.ts
│   │   └── useDebounce.ts
│   │
│   ├── pages/                    # Route-level pages
│   │   ├── SplashPage.tsx
│   │   ├── BoardsListPage.tsx
│   │   ├── BoardDetailPage.tsx
│   │   ├── CardDetailPage.tsx
│   │   └── BoardSettingsPage.tsx
│   │
│   ├── components/               # Reusable components
│   │   ├── common/
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── BottomSheet.tsx
│   │   │   ├── Skeleton.tsx
│   │   │   ├── Toast.tsx
│   │   │   ├── Avatar.tsx
│   │   │   ├── Badge.tsx
│   │   │   └── Spinner.tsx
│   │   │
│   │   ├── kanban/
│   │   │   ├── BoardHeader.tsx
│   │   │   ├── ColumnsContainer.tsx
│   │   │   ├── Column.tsx
│   │   │   ├── ColumnHeader.tsx
│   │   │   ├── CardsContainer.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── CardTitle.tsx
│   │   │   ├── CardLabels.tsx
│   │   │   ├── CardMeta.tsx
│   │   │   ├── AddColumnButton.tsx
│   │   │   ├── AddCardButton.tsx
│   │   │   ├── ColumnSwitcher.tsx
│   │   │   └── DragOverlay.tsx
│   │   │
│   │   ├── card-detail/
│   │   │   ├── CardDetailModal.tsx
│   │   │   ├── CardForm.tsx
│   │   │   ├── LabelPicker.tsx
│   │   │   ├── AssigneePicker.tsx
│   │   │   ├── DueDatePicker.tsx
│   │   │   └── CardActivity.tsx
│   │   │
│   │   └── layout/
│   │       ├── AuthGuard.tsx
│   │       ├── KanbanLayout.tsx
│   │       └── AppLayout.tsx
│   │
│   └── styles/
│       └── kanban.css            # Kanban-specific styles
│
└── docs/
    ├── liff-setup.md
    └── api-reference.md
```

## 1.3 State Management Architecture

### Zustand Store Design

```typescript
// ┌─────────────────────────────────────────────────────────────┐
// │                    ZUSTAND STORE LAYER                       │
// ├─────────────────┬───────────────────┬───────────────────────┤
// │  useAuthStore   │  useKanbanStore   │      useUIStore       │
// ├─────────────────┼───────────────────┼───────────────────────┤
// │ • user          │ • boards[]        │ • isLoading           │
// │ • accessToken   │ • activeBoard     │ • activeModal         │
// │ • isLoggedIn    │ • columns[]       │ • toast[]             │
// │ • isLoading     │ • cards (Map)     │ • isPullingToRefresh  │
// │                 │ • labels[]        │ • selectedCardId      │
// │ Actions:        │ • members[]       │                       │
// │ • setUser()     │                   │ Actions:              │
// │ • setToken()    │ Actions:          │ • setLoading()        │
// │ • logout()      │ • setBoards()     │ • showToast()         │
// │                 │ • moveCard()      │ • openModal()         │
// │ Selectors:      │ • moveColumn()    │ • closeModal()        │
// │ • getUser()     │ • addCard()       │                       │
// │                 │ • updateCard()    │                       │
// │                 │ • reorder()       │                       │
// └─────────────────┴───────────────────┴───────────────────────┘
```

### Store Dependencies

```
App.tsx
 ├── LiffProvider (initializes LIFF, provides context)
 │    └── calls useAuthStore.getState().setUser()
 │
 ├── AuthGuard (checks isLoggedIn)
 │    └── on unauthenticated → redirects to login
 │
 └── KanbanLayout
      ├── useKanbanStore (subscribes to columns, cards)
 │    │   └── calls boardsApi, columnsApi, cardsApi
 │    │
 │    ├── BoardHeader (reads activeBoard, members)
 │    │
 │    ├── ColumnsContainer
 │    │    ├── Column[] (reads columns[] from store)
 │    │    │    └── CardsContainer
 │    │    │         └── Card[] (reads cards by columnId)
 │    │    │
 │    │    └── AddColumnButton (calls columnsApi.create)
 │    │
 │    └── useWebSocket (listens for real-time updates)
 │         └── dispatches to useKanbanStore actions
 │
 └── ModalLayer (reads useUIStore.activeModal)
      ├── CardDetailModal
      └── BoardSettingsModal
```

## 1.4 API Client Layer Design

```typescript
// ┌──────────────────────────────────────────────────────────┐
// │                  API CLIENT LAYER                         │
// ├──────────────────────────────────────────────────────────┤
// │                                                          │
// │  ┌──────────────┐     ┌─────────────────────────────┐   │
// │  │  Axios Instance  │──▶│  Request Interceptor        │   │
// │  │  (apiClient.ts)  │   │  - Attach Bearer token      │   │
// │  └──────────────┘   │   │  - Add request timestamp    │   │
// │                      │   └─────────────────────────────┘   │
// │                      │                                     │
// │                      │   ┌─────────────────────────────┐   │
// │                      └──▶│  Response Interceptor       │   │
// │                          │  - 401 → trigger re-auth    │   │
// │                          │  - Retry with backoff         │   │
// │                          │  - Normalize errors           │   │
// │                          └─────────────────────────────┘   │
// │                                                          │
// │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │
// │  │ boardsApi   │  │ columnsApi  │  │   cardsApi      │  │
// │  │             │  │             │  │                 │  │
// │  │ • getAll()  │  │ • getAll()  │  │ • getAll()      │  │
// │  │ • getById() │  │ • create()  │  │ • create()      │  │
// │  │ • update()  │  │ • update()  │  │ • update()      │  │
// │  │ • delete()  │  │ • delete()  │  │ • move()        │  │
// │  │             │  │ • reorder() │  │ • reorder()     │  │
// │  └─────────────┘  └─────────────┘  └─────────────────┘  │
// │                                                          │
// └──────────────────────────────────────────────────────────┘
```

## 1.5 LIFF SDK Integration Module Design

```typescript
// ┌──────────────────────────────────────────────────────┐
// │              LIFF INTEGRATION MODULE                  │
// ├──────────────────────────────────────────────────────┤
// │                                                      │
// │   liff.ts (Core Module)                              │
// │   ├─ initializeLiff()                                │
// │   ├─ getLineToken()                                  │
// │   ├─ isLoggedIn()                                    │
// │   ├─ getProfile()                                    │
// │   ├─ closeApp()                                      │
// │   └─ error handlers                                  │
// │                                                      │
// │         ▼                                            │
// │   LiffProvider.tsx (React Context)                   │
// │   ├─ LIFF init on mount                              │
// │   ├─ Exposes: liffObject, isReady, error             │
// │   └─ Wraps entire app                                │
// │                                                      │
// │         ▼                                            │
// │   useLiff.ts (Hook)                                  │
// │   ├─ Access LIFF context                             │
// │   ├─ Helper methods                                  │
// │   └─ Profile caching                                 │
// │                                                      │
// └──────────────────────────────────────────────────────┘
```

---

# 2. LIFF Integration Module

## 2.1 Core LIFF Module (`src/modules/liff/liff.ts`)

```typescript
/**
 * LIFF SDK Integration Module
 *
 * Handles all LINE Front-end Framework interactions.
 * This module is platform-agnostic and can be used outside React.
 */

import liff from '@line/liff';

// ── Types ────────────────────────────────────────────────

export interface LiffConfig {
  liffId: string;
  mock?: boolean;                    // Enable mock mode for browser dev
  mockProfile?: LineProfile;         // Mock profile for dev
}

export interface LineProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
}

export interface LiffError extends Error {
  code: string;
  originalError: unknown;
}

export type LiffInitStatus = 'idle' | 'initializing' | 'ready' | 'error';

// ── Module State ─────────────────────────────────────────

let _status: LiffInitStatus = 'idle';
let _profile: LineProfile | null = null;
let _error: LiffError | null = null;
let _config: LiffConfig | null = null;

// ── Constants ────────────────────────────────────────────

const LIFF_ERRORS = {
  INIT_FAILED: 'LIFF_INIT_FAILED',
  NOT_INITIALIZED: 'LIFF_NOT_INITIALIZED',
  LOGIN_FAILED: 'LIFF_LOGIN_FAILED',
  GET_PROFILE_FAILED: 'LIFF_GET_PROFILE_FAILED',
  GET_TOKEN_FAILED: 'LIFF_GET_TOKEN_FAILED',
  NOT_IN_CLIENT: 'LIFF_NOT_IN_CLIENT',
  CLOSE_FAILED: 'LIFF_CLOSE_FAILED',
} as const;

// ── Private Helpers ──────────────────────────────────────

function createLiffError(code: string, message: string, original: unknown): LiffError {
  const error = new Error(message) as LiffError;
  error.code = code;
  error.originalError = original;
  return error;
}

/**
 * Detect if running inside LINE app (not external browser)
 */
export function isInLineClient(): boolean {
  if (_status !== 'ready') return false;
  return liff.isInClient();
}

/**
 * Detect if running on mobile device
 */
export function isMobile(): boolean {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

// ── Public API ───────────────────────────────────────────

/**
 * Initialize the LIFF SDK.
 * Must be called before any other LIFF operation.
 */
export async function initializeLiff(config: LiffConfig): Promise<void> {
  if (_status === 'ready') {
    console.warn('[LIFF] Already initialized, skipping');
    return;
  }

  if (_status === 'initializing') {
    console.warn('[LIFF] Initialization already in progress');
    return;
  }

  _config = config;
  _status = 'initializing';
  _error = null;

  try {
    // Use mock mode for development outside LINE app
    if (config.mock) {
      console.log('[LIFF] Mock mode enabled');
      _status = 'ready';
      if (config.mockProfile) {
        _profile = config.mockProfile;
      }
      return;
    }

    await liff.init({
      liffId: config.liffId,
      // Use pluggable SDK for better performance
      // Load from CDN in index.html: <script src="https://static.line-scdn.net/liff/edge/2.26.0/sdk.js"></script>
    });

    _status = 'ready';
    console.log('[LIFF] Initialized successfully');

    // Auto-login if not authenticated
    if (!liff.isLoggedIn()) {
      console.log('[LIFF] User not logged in, triggering login...');
      liff.login({
        // Redirect back to same URL after login
        redirectUri: window.location.href,
      });
      // Execution stops here — page will reload after login
      return;
    }

    // Pre-fetch and cache profile
    try {
      _profile = await liff.getProfile();
      console.log('[LIFF] Profile cached:', _profile.displayName);
    } catch (profileErr) {
      console.warn('[LIFF] Could not fetch profile:', profileErr);
      // Non-fatal — profile can be fetched later
    }
  } catch (err) {
    _status = 'error';
    _error = createLiffError(
      LIFF_ERRORS.INIT_FAILED,
      `Failed to initialize LIFF: ${err instanceof Error ? err.message : 'Unknown error'}`,
      err
    );
    console.error('[LIFF] Initialization failed:', err);
    throw _error;
  }
}

/**
 * Get the LINE ID token for backend authentication.
 * This token is exchanged for a Planka JWT.
 */
export function getLineToken(): string {
  if (_status !== 'ready') {
    throw createLiffError(
      LIFF_ERRORS.NOT_INITIALIZED,
      'LIFF is not initialized. Call initializeLiff() first.',
      null
    );
  }

  // Mock mode: return mock token
  if (_config?.mock) {
    return 'mock_line_id_token_' + Date.now();
  }

  if (!liff.isLoggedIn()) {
    throw createLiffError(
      LIFF_ERRORS.NOT_INITIALIZED,
      'User is not logged in to LINE',
      null
    );
  }

  try {
    const idToken = liff.getIDToken();
    if (!idToken) {
      throw createLiffError(
        LIFF_ERRORS.GET_TOKEN_FAILED,
        'getIDToken() returned null',
        null
      );
    }
    return idToken;
  } catch (err) {
    throw createLiffError(
      LIFF_ERRORS.GET_TOKEN_FAILED,
      `Failed to get ID token: ${err instanceof Error ? err.message : 'Unknown error'}`,
      err
    );
  }
}

/**
 * Get the LINE access token (for calling LINE APIs directly)
 */
export function getAccessToken(): string {
  if (_status !== 'ready' || _config?.mock) {
    return 'mock_access_token';
  }
  return liff.getAccessToken() || '';
}

/**
 * Check if the user is logged in to LINE
 */
export function isLoggedIn(): boolean {
  if (_config?.mock) return true;
  if (_status !== 'ready') return false;
  return liff.isLoggedIn();
}

/**
 * Get the LINE user profile
 */
export async function getProfile(): Promise<LineProfile> {
  // Return cached profile if available
  if (_profile) {
    return _profile;
  }

  if (_status !== 'ready') {
    throw createLiffError(
      LIFF_ERRORS.NOT_INITIALIZED,
      'LIFF is not initialized',
      null
    );
  }

  if (_config?.mock && _config.mockProfile) {
    return _config.mockProfile;
  }

  try {
    const profile = await liff.getProfile();
    _profile = profile;
    return profile;
  } catch (err) {
    throw createLiffError(
      LIFF_ERRORS.GET_PROFILE_FAILED,
      `Failed to get profile: ${err instanceof Error ? err.message : 'Unknown error'}`,
      err
    );
  }
}

/**
 * Get cached profile (synchronous, may be null)
 */
export function getCachedProfile(): LineProfile | null {
  return _profile;
}

/**
 * Close the LIFF app window
 */
export function closeApp(): void {
  if (_config?.mock) {
    console.log('[LIFF] Mock: would close app');
    return;
  }

  if (!liff.isInClient()) {
    console.warn('[LIFF] Not running inside LINE app, redirecting to close page');
    window.location.href = 'https://line.me';
    return;
  }

  try {
    liff.closeWindow();
  } catch (err) {
    throw createLiffError(
      LIFF_ERRORS.CLOSE_FAILED,
      `Failed to close window: ${err instanceof Error ? err.message : 'Unknown error'}`,
      err
    );
  }
}

/**
 * Open external URL in LINE's in-app browser
 */
export function openExternal(url: string): void {
  if (_config?.mock) {
    window.open(url, '_blank');
    return;
  }
  liff.openWindow({
    url,
    external: true,
  });
}

/**
 * Share a message to LINE chat
 */
export async function sendMessage(text: string): Promise<void> {
  if (_config?.mock) {
    console.log('[LIFF] Mock: would send message:', text);
    return;
  }

  if (!liff.isInClient()) {
    console.warn('[LIFF] Cannot send message outside LINE app');
    return;
  }

  if (!liff.isApiAvailable('shareTargetPicker')) {
    console.warn('[LIFF] shareTargetPicker not available');
    return;
  }

  await liff.shareTargetPicker([
    {
      type: 'text',
      text,
    },
  ]);
}

/**
 * Get LIFF context (type, viewType, utm params, etc.)
 */
export function getContext() {
  if (_config?.mock) {
    return {
      type: 'utou',
      viewType: 'full',
      utmSource: 'mock',
    };
  }
  return liff.getContext();
}

/**
 * Get current initialization status
 */
export function getStatus(): LiffInitStatus {
  return _status;
}

/**
 * Get last error (if any)
 */
export function getError(): LiffError | null {
  return _error;
}

/**
 * Get the LIFF SDK version
 */
export function getVersion(): string {
  return liff.getVersion();
}

/**
 * Check if a LIFF API is available
 */
export function isApiAvailable(apiName: string): boolean {
  if (_config?.mock) return true;
  return liff.isApiAvailable(apiName);
}

/**
 * Logout from LINE
 */
export function logout(): void {
  _profile = null;
  if (_config?.mock) return;
  if (liff.isLoggedIn()) {
    liff.logout();
  }
  window.location.reload();
}
```

## 2.2 React Context Provider (`src/modules/liff/LiffProvider.tsx`)

```typescript
/**
 * LiffProvider — React Context Provider for LIFF SDK
 *
 * Wraps the app and provides LIFF state to all children.
 * Handles initialization on mount and exposes LIFF state via context.
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import {
  initializeLiff,
  getProfile,
  isLoggedIn,
  getStatus,
  getError,
  getVersion,
  closeApp,
  sendMessage,
  openExternal,
  logout,
  type LiffConfig,
  type LineProfile,
  type LiffInitStatus,
  type LiffError,
} from './liff';

// ── Context Type ─────────────────────────────────────────

export interface LiffContextValue {
  // State
  isReady: boolean;
  isLoggedIn: boolean;
  status: LiffInitStatus;
  profile: LineProfile | null;
  version: string;
  error: LiffError | null;

  // Actions
  initialize: (config: LiffConfig) => Promise<void>;
  refreshProfile: () => Promise<LineProfile | null>;
  closeApp: () => void;
  sendMessage: (text: string) => Promise<void>;
  openExternal: (url: string) => void;
  logout: () => void;
}

// ── Context ──────────────────────────────────────────────

const LiffContext = createContext<LiffContextValue | null>(null);

// ── Provider ─────────────────────────────────────────────

interface LiffProviderProps {
  children: ReactNode;
  config: LiffConfig;
  fallback?: ReactNode;  // Loading UI during init
  errorFallback?: ReactNode;  // Error UI
}

export function LiffProvider({
  children,
  config,
  fallback,
  errorFallback,
}: LiffProviderProps) {
  const [status, setStatus] = useState<LiffInitStatus>('idle');
  const [profile, setProfile] = useState<LineProfile | null>(null);
  const [error, setError] = useState<LiffError | null>(null);
  const [version, setVersion] = useState<string>('');

  // Initialize LIFF on mount
  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        setStatus('initializing');
        await initializeLiff(config);

        if (cancelled) return;

        setStatus('ready');
        setVersion(getVersion());

        // Fetch profile if logged in
        if (isLoggedIn()) {
          try {
            const userProfile = await getProfile();
            if (!cancelled) {
              setProfile(userProfile);
            }
          } catch (profileErr) {
            console.warn('[LiffProvider] Profile fetch failed:', profileErr);
          }
        }
      } catch (initErr) {
        if (!cancelled) {
          setStatus('error');
          setError(initErr instanceof Error ? (initErr as LiffError) : null);
        }
      }
    }

    init();

    return () => {
      cancelled = true;
    };
  }, [config.liffId, config.mock]);

  // Refresh profile (public action)
  const refreshProfile = useCallback(async () => {
    if (!isLoggedIn()) return null;
    try {
      const userProfile = await getProfile();
      setProfile(userProfile);
      return userProfile;
    } catch {
      return null;
    }
  }, []);

  // Context value
  const value: LiffContextValue = {
    isReady: status === 'ready',
    isLoggedIn: isLoggedIn(),
    status,
    profile,
    version,
    error,
    initialize: initializeLiff,
    refreshProfile,
    closeApp,
    sendMessage,
    openExternal,
    logout,
  };

  // Loading state
  if (status === 'initializing' || status === 'idle') {
    return (
      <LiffContext.Provider value={value}>
        {fallback ?? <DefaultLoadingFallback />}
      </LiffContext.Provider>
    );
  }

  // Error state
  if (status === 'error') {
    return (
      <LiffContext.Provider value={value}>
        {errorFallback ?? <DefaultErrorFallback error={error} />}
      </LiffContext.Provider>
    );
  }

  return (
    <LiffContext.Provider value={value}>
      {children}
    </LiffContext.Provider>
  );
}

// ── Default Fallbacks ────────────────────────────────────

function DefaultLoadingFallback() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-[#06C755]">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-white border-t-transparent" />
        <p className="text-sm font-medium text-white">Loading...</p>
      </div>
    </div>
  );
}

function DefaultErrorFallback({ error }: { error: LiffError | null }) {
  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center gap-4 p-6">
      <div className="text-4xl">⚠️</div>
      <h2 className="text-lg font-semibold text-gray-900">Failed to initialize</h2>
      <p className="text-center text-sm text-gray-500">
        {error?.message ?? 'An unknown error occurred'}
      </p>
      <button
        onClick={() => window.location.reload()}
        className="mt-4 rounded-lg bg-[#06C755] px-6 py-2 text-sm font-medium text-white active:bg-[#05a347]"
      >
        Retry
      </button>
    </div>
  );
}

// ── Hook ─────────────────────────────────────────────────

export function useLiff(): LiffContextValue {
  const context = useContext(LiffContext);
  if (!context) {
    throw new Error('useLiff must be used within a LiffProvider');
  }
  return context;
}
```

## 2.3 LIFF Hook (`src/modules/liff/useLiff.ts`)

```typescript
/**
 * useLiff — Convenience hook that combines LIFF context with common operations
 */

import { useCallback } from 'react';
import { useLiff as useLiffContext } from './LiffProvider';
import { getLineToken } from './liff';

export function useLiff() {
  const context = useLiffContext();

  /**
   * Get LINE ID token for backend authentication
   */
  const getIdToken = useCallback((): string => {
    return getLineToken();
  }, []);

  /**
   * Share a board/card link via LINE
   */
  const shareBoard = useCallback(
    async (boardName: string, boardUrl: string) => {
      const text = `Let's collaborate on "${boardName}"!\n${boardUrl}`;
      await context.sendMessage(text);
    },
    [context]
  );

  /**
   * Share a card via LINE
   */
  const shareCard = useCallback(
    async (cardTitle: string, cardUrl: string) => {
      const text = `Check out this task: "${cardTitle}"\n${cardUrl}`;
      await context.sendMessage(text);
    },
    [context]
  );

  return {
    ...context,
    getIdToken,
    shareBoard,
    shareCard,
  };
}
```

---

# 3. Authentication Flow Implementation

## 3.1 Architecture Overview

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│  LINE App   │────▶│  LIFF SDK    │────▶│  Your Frontend   │
│  (User)     │     │  liff.init() │     │  React App       │
└─────────────┘     └──────────────┘     └─────────────────┘
                                                │
                                                │ liff.getIDToken()
                                                ▼
                                        ┌─────────────────┐
                                        │  Exchange Token  │
                                        │  POST /api/auth  │
                                        │  { idToken }     │
                                        └─────────────────┘
                                                │
                                                ▼
                                        ┌─────────────────┐
                                        │  Planka Backend  │
                                        │  - Verify token  │
                                        │  - Find/create   │
                                        │    user          │
                                        │  - Generate JWT  │
                                        └─────────────────┘
                                                │
                                                │ { accessToken, user }
                                                ▼
                                        ┌─────────────────┐
                                        │  Store in        │
                                        │  useAuthStore    │
                                        │  localStorage    │
                                        └─────────────────┘
```

## 3.2 TypeScript Interfaces (`src/types/models.ts`)

```typescript
// ═══════════════════════════════════════════════════════════
// Planka Entity TypeScript Interfaces
// ═══════════════════════════════════════════════════════════

/** Base entity with common Planka fields */
interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

/** User model (from Planka) */
export interface User extends BaseEntity {
  email: string;
  username: string;
  name: string;
  avatarUrl?: string;
  phone?: string;
  organization?: string;
  language?: string;
  subscribeToOwnCards?: boolean;
  dueComplete?: boolean;
  // LINE-specific
  lineUserId?: string;
  lineDisplayName?: string;
  linePictureUrl?: string;
}

/** Board model */
export interface Board extends BaseEntity {
  name: string;
  position: number;
  projectId: string;
  labels: Label[];
  lists: Column[];
  memberships: BoardMembership[];
  isOwner: boolean;
}

/** Board membership */
export interface BoardMembership extends BaseEntity {
  boardId: string;
  userId: string;
  role: 'editor' | 'viewer';
  canEdit: boolean;
  user: Pick<User, 'id' | 'name' | 'avatarUrl' | 'email'>;
}

/** Column (List in Planka terminology) */
export interface Column extends BaseEntity {
  name: string;
  position: number;
  boardId: string;
  cards: Card[];
}

/** Card model */
export interface Card extends BaseEntity {
  name: string;
  description?: string;
  position: number;
  boardId: string;
  listId: string;       // References Column
  dueDate?: string;
  dueComplete?: boolean;
  stopwatch?: Stopwatch;
  coverAttachmentId?: string;
  isSubscribed?: boolean;
  labels: Label[];
  assignees: User[];
  attachments: Attachment[];
  activities: Activity[];
}

/** Stopwatch for time tracking */
export interface Stopwatch {
  startedAt: string | null;
  total: number;  // seconds
  isRunning: boolean;
}

/** Label model */
export interface Label extends BaseEntity {
  name: string;
  color: string;  // hex color
  boardId: string;
}

/** Attachment model */
export interface Attachment extends BaseEntity {
  name: string;
  cardId: string;
  url: string;
  type: 'file' | 'link';
  size?: number;
}

/** Activity log entry */
export interface Activity extends BaseEntity {
  cardId: string;
  userId: string;
  type: string;
  data: Record<string, unknown>;
  user: Pick<User, 'id' | 'name' | 'avatarUrl'>;
}

/** Member (project/board member) */
export interface Member {
  id: string;
  userId: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: string;
}

// ═══════════════════════════════════════════════════════════
// API Request/Response Types
// ═══════════════════════════════════════════════════════════

/** Auth: Exchange LINE token request */
export interface ExchangeTokenRequest {
  idToken: string;
  // Optional: include LIFF context
  context?: {
    type: string;
    viewType: string;
    utmSource?: string;
  };
}

/** Auth: Exchange LINE token response */
export interface ExchangeTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;  // seconds
  user: User;
}

/** Auth: Refresh token request */
export interface RefreshTokenRequest {
  refreshToken: string;
}

/** Generic API response wrapper */
export interface ApiResponse<T> {
  data: T;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
  };
}

/** API Error response */
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string[]>;
}

/** Create card request */
export interface CreateCardRequest {
  name: string;
  description?: string;
  listId: string;
  boardId: string;
  position?: number;
  dueDate?: string;
  labelIds?: string[];
  assigneeIds?: string[];
}

/** Update card request */
export interface UpdateCardRequest {
  name?: string;
  description?: string;
  dueDate?: string | null;
  dueComplete?: boolean;
  position?: number;
  listId?: string;
  labelIds?: string[];
  assigneeIds?: string[];
  coverAttachmentId?: string | null;
}

/** Create column request */
export interface CreateColumnRequest {
  name: string;
  boardId: string;
  position?: number;
}

/** Update column request */
export interface UpdateColumnRequest {
  name?: string;
  position?: number;
}

/** Move card request */
export interface MoveCardRequest {
  cardId: string;
  sourceListId: string;
  targetListId: string;
  position: number;
}

/** Reorder columns request */
export interface ReorderColumnsRequest {
  boardId: string;
  columnIds: string[];  // Ordered list of column IDs
}

/** Reorder cards request */
export interface ReorderCardsRequest {
  listId: string;
  cardIds: string[];    // Ordered list of card IDs
}

/** WebSocket event types */
export interface WebSocketEvent {
  type: string;
  payload: Record<string, unknown>;
  timestamp: string;
}

export interface CardCreatedEvent extends WebSocketEvent {
  type: 'card:create';
  payload: { card: Card };
}

export interface CardUpdatedEvent extends WebSocketEvent {
  type: 'card:update';
  payload: { card: Card; oldValues: Partial<Card> };
}

export interface CardMovedEvent extends WebSocketEvent {
  type: 'card:move';
  payload: {
    card: Card;
    sourceListId: string;
    targetListId: string;
    position: number;
  };
}

export interface ColumnCreatedEvent extends WebSocketEvent {
  type: 'list:create';
  payload: { list: Column };
}

export interface ColumnUpdatedEvent extends WebSocketEvent {
  type: 'list:update';
  payload: { list: Column };
}

export type PlankaWebSocketEvent =
  | CardCreatedEvent
  | CardUpdatedEvent
  | CardMovedEvent
  | ColumnCreatedEvent
  | ColumnUpdatedEvent;
```

## 3.3 Auth Service (`src/services/authService.ts`)

```typescript
/**
 * Authentication Service
 *
 * Handles the complete auth flow:
 * 1. Exchange LINE ID token for Planka JWT
 * 2. Refresh expired tokens
 * 3. Logout and session cleanup
 */

import { apiClient } from './apiClient';
import {
  getLineToken,
  logout as liffLogout,
} from '../modules/liff/liff';
import type {
  ExchangeTokenRequest,
  ExchangeTokenResponse,
  RefreshTokenRequest,
  User,
} from '../types/models';

// ── Constants ────────────────────────────────────────────

const AUTH_STORAGE_KEY = 'planka_auth';
const TOKEN_EXPIRY_BUFFER = 5 * 60 * 1000; // Refresh 5 min before expiry

// ── Storage Helpers ──────────────────────────────────────

interface StoredAuth {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;  // Timestamp
  user: User;
}

function getStoredAuth(): StoredAuth | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredAuth;
  } catch {
    return null;
  }
}

function setStoredAuth(auth: StoredAuth): void {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
}

function clearStoredAuth(): void {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

// ── Token Timing ─────────────────────────────────────────

function isTokenExpiringSoon(expiresAt: number): boolean {
  return Date.now() + TOKEN_EXPIRY_BUFFER >= expiresAt;
}

// ── Service ──────────────────────────────────────────────

export const authService = {
  /**
   * Exchange LINE ID token for Planka JWT
   *
   * Flow:
   * 1. Get LINE ID token from LIFF SDK
   * 2. Send to backend /api/auth/line endpoint
   * 3. Backend verifies token with LINE API
   * 4. Backend finds or creates user, returns Planka JWT
   * 5. Store tokens and user data
   */
  async login(): Promise<User> {
    console.log('[Auth] Starting login flow...');

    // Step 1: Get LINE ID token
    let idToken: string;
    try {
      idToken = getLineToken();
      console.log('[Auth] Got LINE ID token');
    } catch (err) {
      console.error('[Auth] Failed to get LINE ID token:', err);
      throw new Error('LINE authentication required. Please login through LINE app.');
    }

    // Step 2: Exchange for Planka JWT
    const requestBody: ExchangeTokenRequest = {
      idToken,
    };

    try {
      const response = await apiClient.post<ExchangeTokenResponse>(
        '/api/auth/line',
        requestBody,
        // No auth header for this request
        { skipAuth: true }
      );

      const { accessToken, refreshToken, expiresIn, user } = response.data;
      const expiresAt = Date.now() + expiresIn * 1000;

      // Step 3: Store auth data
      const auth: StoredAuth = {
        accessToken,
        refreshToken,
        expiresAt,
        user,
      };
      setStoredAuth(auth);

      // Step 4: Set default auth header for subsequent requests
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

      console.log('[Auth] Login successful, user:', user.name);
      return user;
    } catch (err) {
      console.error('[Auth] Token exchange failed:', err);
      throw new Error('Failed to authenticate with server. Please try again.');
    }
  },

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(): Promise<string> {
    console.log('[Auth] Refreshing token...');

    const stored = getStoredAuth();
    if (!stored) {
      throw new Error('No stored credentials found');
    }

    const requestBody: RefreshTokenRequest = {
      refreshToken: stored.refreshToken,
    };

    try {
      const response = await apiClient.post<{
        accessToken: string;
        refreshToken: string;
        expiresIn: number;
      }>('/api/auth/refresh', requestBody, { skipAuth: true });

      const { accessToken, refreshToken, expiresIn } = response.data;
      const expiresAt = Date.now() + expiresIn * 1000;

      // Update stored auth
      const updated: StoredAuth = {
        ...stored,
        accessToken,
        refreshToken,
        expiresAt,
      };
      setStoredAuth(updated);

      // Update default header
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

      console.log('[Auth] Token refreshed successfully');
      return accessToken;
    } catch (err) {
      console.error('[Auth] Token refresh failed:', err);
      // Clear everything — user needs to re-login
      authService.logout();
      throw new Error('Session expired. Please login again.');
    }
  },

  /**
   * Check if we have valid stored credentials
   */
  isAuthenticated(): boolean {
    const stored = getStoredAuth();
    if (!stored) return false;
    return Date.now() < stored.expiresAt;
  },

  /**
   * Get current access token
   */
  getAccessToken(): string | null {
    const stored = getStoredAuth();
    return stored?.accessToken ?? null;
  },

  /**
   * Get current user
   */
  getUser(): User | null {
    const stored = getStoredAuth();
    return stored?.user ?? null;
  },

  /**
   * Check if token needs refresh
   */
  needsRefresh(): boolean {
    const stored = getStoredAuth();
    if (!stored) return false;
    return isTokenExpiringSoon(stored.expiresAt);
  },

  /**
   * Logout — clear all auth state
   */
  logout(): void {
    console.log('[Auth] Logging out...');
    clearStoredAuth();
    delete apiClient.defaults.headers.common['Authorization'];
    liffLogout();
    // LIFF logout reloads the page, but just in case:
    window.location.reload();
  },

  /**
   * Initialize auth from stored credentials
   * Call this on app startup to restore session
   */
  initFromStorage(): boolean {
    const stored = getStoredAuth();
    if (!stored) return false;

    if (Date.now() >= stored.expiresAt) {
      console.log('[Auth] Stored token expired');
      clearStoredAuth();
      return false;
    }

    // Set default header
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${stored.accessToken}`;
    console.log('[Auth] Session restored from storage');
    return true;
  },
};

// ── Axios interceptor integration ────────────────────────

/**
 * Setup authentication interceptors on the axios instance
 */
export function setupAuthInterceptors(): void {
  // Request interceptor: attach token
  apiClient.interceptors.request.use(
    async (config) => {
      // Skip if explicitly marked
      // @ts-expect-error custom flag
      if (config.skipAuth) {
        return config;
      }

      const token = authService.getAccessToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor: handle 401
  let isRefreshing = false;
  let refreshSubscribers: Array<(token: string) => void> = [];

  function onTokenRefreshed(token: string) {
    refreshSubscribers.forEach((cb) => cb(token));
    refreshSubscribers = [];
  }

  apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;

      // If 401 and not already retrying
      if (error.response?.status === 401 && !originalRequest._retry) {
        if (isRefreshing) {
          // Wait for refresh to complete
          return new Promise((resolve) => {
            refreshSubscribers.push((token: string) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(apiClient(originalRequest));
            });
          });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          const newToken = await authService.refreshToken();
          onTokenRefreshed(newToken);
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return apiClient(originalRequest);
        } catch {
          // Refresh failed — logout
          authService.logout();
          return Promise.reject(error);
        } finally {
          isRefreshing = false;
        }
      }

      return Promise.reject(error);
    }
  );
}
```

## 3.4 API Client with Interceptors (`src/services/apiClient.ts`)

```typescript
/**
 * Axios API Client
 *
 * Pre-configured axios instance with:
 * - Base URL from environment config
 * - Request/response interceptors
 * - Auth header management
 * - Error normalization
 * - Timeout and retry logic
 */

import axios, { type AxiosError, type AxiosInstance } from 'axios';
import { config } from '../lib/config';

// ── Custom Config Type ───────────────────────────────────

declare module 'axios' {
  interface InternalAxiosRequestConfig {
    skipAuth?: boolean;
    _retry?: boolean;
  }
}

// ── Create Instance ──────────────────────────────────────

export const apiClient: AxiosInstance = axios.create({
  baseURL: config.apiBaseUrl,
  timeout: 30000,  // 30 seconds
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// ── Request Interceptor ──────────────────────────────────

apiClient.interceptors.request.use(
  (config) => {
    // Add request timestamp for performance tracking
    config.headers['X-Request-Time'] = Date.now().toString();

    // Add LIFF version header
    config.headers['X-LIFF-Version'] = '2.26.0';

    console.log(
      `[API] ${config.method?.toUpperCase()} ${config.url}`,
      config.params || ''
    );

    return config;
  },
  (error) => {
    console.error('[API] Request error:', error);
    return Promise.reject(error);
  }
);

// ── Response Interceptor ─────────────────────────────────

interface ApiErrorResponse {
  code: string;
  message: string;
  details?: Record<string, string[]>;
}

export class ApiError extends Error {
  status: number;
  code: string;
  details?: Record<string, string[]>;

  constructor(status: number, code: string, message: string, details?: Record<string, string[]>) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
    this.name = 'ApiError';
  }
}

apiClient.interceptors.response.use(
  (response) => {
    const duration = Date.now() - Number(response.config.headers['X-Request-Time']);
    console.log(`[API] ${response.status} ${response.config.url} (${duration}ms)`);
    return response;
  },
  (error: AxiosError<ApiErrorResponse>) => {
    if (error.response) {
      const { status, data } = error.response;
      const apiError = new ApiError(
        status,
        data?.code ?? 'UNKNOWN_ERROR',
        data?.message ?? error.message,
        data?.details
      );
      console.error(`[API] Error ${status}:`, apiError.message);
      return Promise.reject(apiError);
    }

    if (error.request) {
      // Network error (no response)
      const networkError = new ApiError(
        0,
        'NETWORK_ERROR',
        'Network connection failed. Please check your internet connection.'
      );
      return Promise.reject(networkError);
    }

    return Promise.reject(error);
  }
);

// ── Retry Logic for Network Errors ───────────────────────

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // ms

apiClient.interceptors.response.use(undefined, async (error) => {
  const { config } = error;

  // Only retry on network errors (no response)
  if (!error.response && config && config._retryCount < MAX_RETRIES) {
    config._retryCount = config._retryCount || 0;
    config._retryCount++;

    const delay = RETRY_DELAY * Math.pow(2, config._retryCount - 1);
    console.log(`[API] Retrying request (${config._retryCount}/${MAX_RETRIES}) in ${delay}ms`);

    await new Promise((resolve) => setTimeout(resolve, delay));
    return apiClient(config);
  }

  return Promise.reject(error);
});

// ── Health Check ─────────────────────────────────────────

export async function checkApiHealth(): Promise<boolean> {
  try {
    await apiClient.get('/api/health', { timeout: 5000, skipAuth: true });
    return true;
  } catch {
    return false;
  }
}
```

## 3.5 Auth Hook (`src/hooks/useAuth.ts`)

```typescript
/**
 * useAuth — React hook for authentication state and actions
 *
 * Integrates Zustand store with auth service for reactive auth state.
 */

import { useCallback, useEffect, useState } from 'react';
import { useLiff } from '../modules/liff/LiffProvider';
import { authService } from '../services/authService';
import { useAuthStore } from '../stores/useAuthStore';

export function useAuth() {
  const liff = useLiff();
  const { user, setUser, clearAuth } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-login on mount if LIFF is ready
  useEffect(() => {
    if (!liff.isReady || !liff.isLoggedIn) return;

    async function autoLogin() {
      // Check if we already have a valid session
      if (authService.isAuthenticated()) {
        const storedUser = authService.getUser();
        if (storedUser) {
          setUser(storedUser);
          return;
        }
      }

      // Try to exchange LINE token
      setIsLoading(true);
      setError(null);
      try {
        const user = await authService.login();
        setUser(user);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Login failed');
      } finally {
        setIsLoading(false);
      }
    }

    autoLogin();
  }, [liff.isReady, liff.isLoggedIn, setUser]);

  /** Manual login (if auto-login didn't work) */
  const login = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const user = await authService.login();
      setUser(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  }, [setUser]);

  /** Logout */
  const logout = useCallback(() => {
    clearAuth();
    authService.logout();
  }, [clearAuth]);

  /** Check if authenticated */
  const isAuthenticated = !!user && authService.isAuthenticated();

  return {
    user,
    isLoading,
    error,
    isAuthenticated,
    isReady: liff.isReady,
    login,
    logout,
  };
}
```

## 3.6 Auth Store (`src/stores/useAuthStore.ts`)

```typescript
/**
 * Auth Store — Zustand store for authentication state
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types/models';

interface AuthState {
  // State
  user: User | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setUser: (user: User) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  updateUser: (partial: Partial<User>) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isLoading: false,
      error: null,

      setUser: (user) => set({ user, isLoading: false, error: null }),

      setLoading: (isLoading) => set({ isLoading }),

      setError: (error) => set({ error, isLoading: false }),

      updateUser: (partial) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...partial } : null,
        })),

      clearAuth: () => set({ user: null, isLoading: false, error: null }),
    }),
    {
      name: 'auth-store',
      partialize: (state) => ({ user: state.user }),
    }
  )
);
```

## 3.7 Auth Guard Component (`src/components/layout/AuthGuard.tsx`)

```typescript
/**
 * AuthGuard — Route guard that ensures user is authenticated
 *
 * Shows loading state during auth check, redirects to login if needed.
 */

import React, { type ReactNode } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Spinner } from '../common/Spinner';

interface AuthGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function AuthGuard({ children, fallback }: AuthGuardProps) {
  const { isAuthenticated, isLoading, isReady, login, error } = useAuth();

  // Still initializing LIFF
  if (!isReady || isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <Spinner size="lg" className="text-[#06C755]" />
          <p className="text-sm text-gray-500">Authenticating...</p>
        </div>
      </div>
    );
  }

  // Auth error
  if (error) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center gap-4 p-6">
        <div className="text-4xl">🔐</div>
        <h2 className="text-lg font-semibold">Authentication Required</h2>
        <p className="text-center text-sm text-gray-500">{error}</p>
        <button
          onClick={login}
          className="mt-2 rounded-lg bg-[#06C755] px-6 py-3 text-sm font-medium text-white shadow-sm active:bg-[#05a347]"
        >
          Login with LINE
        </button>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center gap-4 bg-[#06C755] p-6">
        <div className="text-6xl">📋</div>
        <h1 className="text-xl font-bold text-white">Planka Boards</h1>
        <p className="text-center text-sm text-white/80">
          Manage your projects with Kanban boards
        </p>
        <button
          onClick={login}
          className="mt-4 w-full max-w-xs rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#06C755] shadow-lg active:bg-gray-100"
        >
          Continue with LINE
        </button>
      </div>
    );
  }

  // Authenticated — render children
  return <>{children}</>;
}
```


---

# 4. Kanban Board Components Architecture

## 4.1 Component Tree Diagram

```
App.tsx
│
├── LiffProvider (LIFF context)
│
├── AuthGuard (auth check wrapper)
│
└── Router (wouter or react-router-dom)
    │
    ├── / → BoardsListPage
    │
    ├── /boards/:boardId → BoardDetailPage
    │   │
    │   └── KanbanLayout
    │       │
    │       ├── BoardHeader
    │       │   ├── BoardTitle (editable)
    │       │   ├── MembersRow (avatars)
    │       │   └── BoardActions (share, settings, close)
    │       │
    │       ├── ColumnsContainer (horizontal scroll snap)
    │       │   └── Column[]
    │       │       │
    │       │       ├── ColumnHeader
    │       │       │   ├── ColumnTitle (editable)
    │       │       │   ├── CardCount badge
    │       │       │   └── ColumnMenu (edit, delete, color)
    │       │       │
    │       │       ├── CardsContainer (droppable, vertical scroll)
    │       │       │   └── Card[] (draggable, touch-optimized)
    │       │       │       ├── CardCover (optional image)
    │       │       │       ├── CardLabels (color chips)
    │       │       │       ├── CardTitle
    │       │       │       └── CardMeta
    │       │       │           ├── Assignees (avatar stack)
    │       │       │           ├── DueDate badge
    │       │       │           └── Comment/Attachment count
    │       │       │
    │       │       └── AddCardButton
    │       │
    │       └── AddColumnButton
    │
    ├── /cards/:cardId → CardDetailPage (modal)
    │   └── CardDetailModal (bottom sheet on mobile)
    │       ├── CardHeader
    │       ├── CardForm (title, description)
    │       ├── LabelPicker
    │       ├── AssigneePicker
    │       ├── DueDatePicker
    │       ├── AttachmentList
    │       ├── CardActivity (comments)
    │       └── CardActions (archive, delete, share)
    │
    └── /boards/:boardId/settings → BoardSettingsPage
        ├── MembersManager
├── LabelManager
└── BoardDangerZone
```

## 4.2 Kanban Store (`src/stores/useKanbanStore.ts`)

```typescript
/**
 * Kanban Store — Zustand store for Kanban board state
 *
 * Manages columns, cards, and board-level state with optimistic updates.
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Board, Column, Card, Label } from '../types/models';

// ── State Types ──────────────────────────────────────────

interface ColumnWithCards extends Column {
  cards: Card[];
}

interface KanbanState {
  // Data
  boards: Board[];
  activeBoard: Board | null;
  columns: ColumnWithCards[];
  labels: Label[];
  isLoading: boolean;
  error: string | null;

  // UI State
  draggingCardId: string | null;
  draggingColumnId: string | null;
  selectedCardId: string | null;
  isColumnSwitcherOpen: boolean;

  // ── Actions ──

  // Board actions
  setBoards: (boards: Board[]) => void;
  setActiveBoard: (board: Board | null) => void;
  updateBoard: (partial: Partial<Board>) => void;

  // Column actions
  setColumns: (columns: ColumnWithCards[]) => void;
  addColumn: (column: ColumnWithCards) => void;
  updateColumn: (columnId: string, partial: Partial<Column>) => void;
  removeColumn: (columnId: string) => void;
  reorderColumns: (orderedIds: string[]) => void;

  // Card actions
  addCard: (card: Card) => void;
  updateCard: (cardId: string, partial: Partial<Card>) => void;
  removeCard: (cardId: string) => void;
  moveCard: (
    cardId: string,
    sourceColumnId: string,
    targetColumnId: string,
    newPosition: number
  ) => void;

  // Optimistic updates
  moveCardOptimistic: (
    cardId: string,
    sourceColumnId: string,
    targetColumnId: string,
    newIndex: number
  ) => void;
  rollbackCardMove: (
    cardId: string,
    sourceColumnId: string,
    originalPosition: number
  ) => void;

  // UI actions
  setDraggingCard: (id: string | null) => void;
  setDraggingColumn: (id: string | null) => void;
  selectCard: (id: string | null) => void;
  setColumnSwitcherOpen: (open: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Bulk
  reset: () => void;
}

// ── Store Implementation ─────────────────────────────────

const initialState = {
  boards: [],
  activeBoard: null,
  columns: [],
  labels: [],
  isLoading: false,
  error: null,
  draggingCardId: null,
  draggingColumnId: null,
  selectedCardId: null,
  isColumnSwitcherOpen: false,
};

export const useKanbanStore = create<KanbanState>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // ── Board ──
      setBoards: (boards) => set({ boards }),
      setActiveBoard: (board) => set({ activeBoard: board }),
      updateBoard: (partial) =>
        set((state) => ({
          activeBoard: state.activeBoard
            ? { ...state.activeBoard, ...partial }
            : null,
        })),

      // ── Columns ──
      setColumns: (columns) => set({ columns }),

      addColumn: (column) =>
        set((state) => ({
          columns: [...state.columns, column],
        })),

      updateColumn: (columnId, partial) =>
        set((state) => ({
          columns: state.columns.map((col) =>
            col.id === columnId ? { ...col, ...partial } : col
          ),
        })),

      removeColumn: (columnId) =>
        set((state) => ({
          columns: state.columns.filter((col) => col.id !== columnId),
        })),

      reorderColumns: (orderedIds) =>
        set((state) => {
          const columnMap = new Map(state.columns.map((c) => [c.id, c]));
          return {
            columns: orderedIds
              .map((id) => columnMap.get(id))
              .filter(Boolean)
              .map((col, index) => ({ ...col!, position: index })),
          };
        }),

      // ── Cards ──
      addCard: (card) =>
        set((state) => ({
          columns: state.columns.map((col) =>
            col.id === card.listId
              ? { ...col, cards: [...col.cards, card] }
              : col
          ),
        })),

      updateCard: (cardId, partial) =>
        set((state) => ({
          columns: state.columns.map((col) => ({
            ...col,
            cards: col.cards.map((card) =>
              card.id === cardId ? { ...card, ...partial } : card
            ),
          })),
        })),

      removeCard: (cardId) =>
        set((state) => ({
          columns: state.columns.map((col) => ({
            ...col,
            cards: col.cards.filter((card) => card.id !== cardId),
          })),
        })),

      moveCard: (cardId, sourceColumnId, targetColumnId, newPosition) =>
        set((state) => {
          const newColumns = state.columns.map((col) => {
            // Remove from source
            if (col.id === sourceColumnId) {
              return {
                ...col,
                cards: col.cards.filter((c) => c.id !== cardId),
              };
            }
            return col;
          });

          // Add to target at position
          const targetCol = newColumns.find((c) => c.id === targetColumnId);
          if (targetCol) {
            const card = state.columns
              .flatMap((c) => c.cards)
              .find((c) => c.id === cardId);
            if (card) {
              const updatedCard = { ...card, listId: targetColumnId, position: newPosition };
              const insertIndex = Math.min(newPosition, targetCol.cards.length);
              targetCol.cards.splice(insertIndex, 0, updatedCard);
            }
          }

          return { columns: newColumns };
        }),

      // ── Optimistic Updates ──
      moveCardOptimistic: (cardId, sourceColumnId, targetColumnId, newIndex) => {
        const { columns } = get();
        // Save state for rollback
        const card = columns
          .flatMap((c) => c.cards)
          .find((c) => c.id === cardId);
        if (!card) return;

        const originalPosition = card.position;

        // Apply optimistic move
        get().moveCard(cardId, sourceColumnId, targetColumnId, newIndex);

        // Store rollback info (could be in a separate map)
        (card as Card & { _rollback?: { sourceColumnId: string; position: number } })._rollback = {
          sourceColumnId,
          position: originalPosition,
        };
      },

      rollbackCardMove: (cardId, sourceColumnId, originalPosition) => {
        const state = get();
        const card = state.columns.flatMap((c) => c.cards).find((c) => c.id === cardId);
        if (!card) return;
        get().moveCard(cardId, card.listId, sourceColumnId, originalPosition);
      },

      // ── UI ──
      setDraggingCard: (id) => set({ draggingCardId: id }),
      setDraggingColumn: (id) => set({ draggingColumnId: id }),
      selectCard: (id) => set({ selectedCardId: id }),
      setColumnSwitcherOpen: (open) => set({ isColumnSwitcherOpen: open }),
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),

      reset: () => set(initialState),
    }),
    { name: 'kanban-store' }
  )
);

// ── Selectors ────────────────────────────────────────────

export function getColumnById(state: KanbanState, columnId: string): ColumnWithCards | undefined {
  return state.columns.find((c) => c.id === columnId);
}

export function getCardById(state: KanbanState, cardId: string): Card | undefined {
  return state.columns.flatMap((c) => c.cards).find((card) => card.id === cardId);
}

export function getCardsByColumnId(state: KanbanState, columnId: string): Card[] {
  return state.columns.find((c) => c.id === columnId)?.cards ?? [];
}
```

## 4.3 Board Header Component (`src/components/kanban/BoardHeader.tsx`)

```typescript
/**
 * BoardHeader — Top bar for the Kanban board
 *
 * Features:
 * - Board title (editable inline)
 * - Members avatars
 * - Share, settings, close buttons
 * - Mobile-optimized layout
 */

import React, { useState, useCallback } from 'react';
import { Settings, Share2, X, Users, ChevronLeft } from 'lucide-react';
import { useLiff } from '../../modules/liff/LiffProvider';
import { useKanbanStore } from '../../stores/useKanbanStore';
import { useAuth } from '../../hooks/useAuth';
import { Avatar } from '../common/Avatar';

export function BoardHeader() {
  const liff = useLiff();
  const { user } = useAuth();
  const { activeBoard, columns } = useKanbanStore();

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(activeBoard?.name ?? '');

  // Count total cards
  const totalCards = columns.reduce((sum, col) => sum + col.cards.length, 0);

  // Get unique members from board
  const members = activeBoard?.memberships?.map((m) => m.user) ?? [];

  const handleTitleSave = useCallback(() => {
    if (titleDraft.trim() && titleDraft !== activeBoard?.name) {
      // TODO: API call to update board name
      // boardsApi.update(activeBoard!.id, { name: titleDraft.trim() });
    }
    setIsEditingTitle(false);
  }, [titleDraft, activeBoard?.name, activeBoard?.id]);

  const handleShare = useCallback(async () => {
    if (!activeBoard) return;
    const boardUrl = `${window.location.origin}/boards/${activeBoard.id}`;
    await liff.shareBoard(activeBoard.name, boardUrl);
  }, [liff, activeBoard]);

  const handleClose = useCallback(() => {
    liff.closeApp();
  }, [liff]);

  if (!activeBoard) return null;

  return (
    <header className="flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3 shadow-sm">
      {/* Left section */}
      <div className="flex flex-1 items-center gap-2 min-w-0">
        <button
          onClick={() => window.history.back()}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full hover:bg-gray-100 active:bg-gray-200"
        >
          <ChevronLeft size={20} className="text-gray-600" />
        </button>

        <div className="min-w-0 flex-1">
          {isEditingTitle ? (
            <input
              type="text"
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleTitleSave();
                if (e.key === 'Escape') {
                  setTitleDraft(activeBoard.name);
                  setIsEditingTitle(false);
                }
              }}
              autoFocus
              className="w-full rounded border border-[#06C755] px-2 py-1 text-base font-semibold text-gray-900 outline-none"
            />
          ) : (
            <h1
              onClick={() => {
                setTitleDraft(activeBoard.name);
                setIsEditingTitle(true);
              }}
              className="cursor-pointer truncate text-base font-semibold text-gray-900 hover:text-[#06C755]"
            >
              {activeBoard.name}
            </h1>
          )}
          <p className="text-xs text-gray-400">
            {totalCards} cards · {columns.length} columns
          </p>
        </div>
      </div>

      {/* Members avatars */}
      {members.length > 0 && (
        <div className="flex shrink-0 -space-x-2">
          {members.slice(0, 3).map((member) => (
            <Avatar
              key={member.id}
              src={member.avatarUrl}
              name={member.name}
              size="sm"
              className="ring-2 ring-white"
            />
          ))}
          {members.length > 3 && (
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 ring-2 ring-white">
              <span className="text-xs text-gray-500">+{members.length - 3}</span>
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex shrink-0 items-center gap-1">
        <button
          onClick={handleShare}
          className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-gray-100 active:bg-gray-200"
          title="Share"
        >
          <Share2 size={18} className="text-gray-500" />
        </button>

        <button
          onClick={() => {/* TODO: open settings */}}
          className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-gray-100 active:bg-gray-200"
          title="Settings"
        >
          <Settings size={18} className="text-gray-500" />
        </button>

        <button
          onClick={handleClose}
          className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-red-50 active:bg-red-100"
          title="Close"
        >
          <X size={18} className="text-gray-400 hover:text-red-500" />
        </button>
      </div>
    </header>
  );
}
```

## 4.4 Columns Container (`src/components/kanban/ColumnsContainer.tsx`)

```typescript
/**
 * ColumnsContainer — Horizontally scrollable column container
 *
 * Features:
 * - Touch swipe horizontal scrolling
 * - CSS scroll-snap on mobile
 * - DnD context from @dnd-kit
 * - Touch sensor integration
 */

import React, { useRef, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import { restrictToHorizontalAxis } from '@dnd-kit/modifiers';
import {
  horizontalListSortingStrategy,
  SortableContext,
} from '@dnd-kit/sortable';
import { useKanbanStore } from '../../stores/useKanbanStore';
import { Column } from './Column';
import { AddColumnButton } from './AddColumnButton';
import { ColumnSwitcher } from './ColumnSwitcher';
import { useOptimisticMove } from '../../hooks/useOptimisticUpdate';

export function ColumnsContainer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { columns, setDraggingColumn, moveCard, reorderColumns } = useKanbanStore();
  const { executeOptimistic } = useOptimisticMove();

  // DnD sensors — tuned for touch
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Prevent accidental drags on tap
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,   // 200ms hold before drag starts (prevents scroll interference)
        tolerance: 8, // Allow 8px movement during delay
      },
    })
  );

  // ── DnD Handlers ───────────────────────────────────────

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    if (active.data.current?.type === 'card') {
      useKanbanStore.getState().setDraggingCard(active.id as string);
    } else if (active.data.current?.type === 'column') {
      setDraggingColumn(active.id as string);
    }
  }, [setDraggingColumn]);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeType = active.data.current?.type;
    const overType = over.data.current?.type;

    // Card over card or card over column
    if (activeType === 'card') {
      const activeCardId = active.id as string;
      const activeColumnId = active.data.current?.columnId as string;
      const overColumnId = over.data.current?.columnId as string || over.id as string;

      if (activeColumnId === overColumnId) return; // Same column, handled by sortable

      // Moving to different column
      const overIndex = over.data.current?.sortable?.index ?? 0;
      moveCard(activeCardId, activeColumnId, overColumnId, overIndex);
    }
  }, [moveCard]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      useKanbanStore.getState().setDraggingCard(null);
      setDraggingColumn(null);
      return;
    }

    const activeType = active.data.current?.type;

    if (activeType === 'column') {
      if (active.id !== over.id) {
        const oldIndex = columns.findIndex((c) => c.id === active.id);
        const newIndex = columns.findIndex((c) => c.id === over.id);
        const newOrder = [...columns];
        const [moved] = newOrder.splice(oldIndex, 1);
        newOrder.splice(newIndex, 0, moved);
        reorderColumns(newOrder.map((c) => c.id));

        // TODO: API call to persist reorder
        // columnsApi.reorder(activeBoard.id, newOrder.map(c => c.id));
      }
      setDraggingColumn(null);
    }

    if (activeType === 'card') {
      const state = useKanbanStore.getState();
      const cardId = active.id as string;
      const card = state.columns.flatMap((c) => c.cards).find((c) => c.id === cardId);

      if (card) {
        // Persist the move
        executeOptimistic(
          () => {/* API call already done in dragOver */ Promise.resolve(),
          () => {/* rollback if needed */}
        );
      }

      state.setDraggingCard(null);
    }
  }, [columns, reorderColumns, setDraggingColumn, executeOptimistic]);

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[/* restrictToHorizontalAxis for columns only */]}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div
          ref={containerRef}
          className="flex h-full overflow-x-auto overflow-y-hidden snap-x snap-mandatory scrollbar-hide"
          style={{
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          <SortableContext
            items={columns.map((c) => c.id)}
            strategy={horizontalListSortingStrategy}
          >
            {columns.map((column) => (
              <Column key={column.id} column={column} />
            ))}
          </SortableContext>

          <AddColumnButton />
        </div>
      </DndContext>

      {/* Column switcher for small screens */}
      <ColumnSwitcher />
    </>
  );
}
```

## 4.5 Column Component (`src/components/kanban/Column.tsx`)

```typescript
/**
 * Column — A single Kanban column (list)
 *
 * Features:
 * - Droppable zone for cards
 * - Sortable within columns container
 * - Vertical scroll for cards
 * - Touch-optimized header
 */

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/dnd-utilities';
import { useDroppable } from '@dnd-kit/core';
import type { ColumnWithCards } from '../../stores/useKanbanStore';
import { ColumnHeader } from './ColumnHeader';
import { CardsContainer } from './CardsContainer';
import { AddCardButton } from './AddCardButton';

interface ColumnProps {
  column: ColumnWithCards;
}

export function Column({ column }: ColumnProps) {
  // Sortable (for column reordering)
  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging: isColumnDragging,
  } = useSortable({
    id: column.id,
    data: {
      type: 'column',
    },
  });

  // Droppable (for cards)
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: column.id,
    data: {
      type: 'column',
      columnId: column.id,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setSortableRef}
      style={style}
      className={`
        flex h-full w-[85vw] max-w-[320px] shrink-0 snap-start flex-col
        rounded-xl bg-gray-100/80 shadow-sm
        sm:w-[300px]
        ${isColumnDragging ? 'z-50 rotate-2 opacity-80 shadow-lg' : ''}
        ${isOver ? 'ring-2 ring-[#06C755] ring-inset' : ''}
      `}
    >
      {/* Column Header */}
      <ColumnHeader
        column={column}
        dragHandleProps={{ ...attributes, ...listeners }}
      />

      {/* Cards Container */}
      <div
        ref={setDroppableRef}
        className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden px-2 py-1"
        style={{
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <CardsContainer columnId={column.id} cards={column.cards} />
      </div>

      {/* Add Card */}
      <div className="px-2 pb-2">
        <AddCardButton columnId={column.id} />
      </div>
    </div>
  );
}
```

## 4.6 Card Component (`src/components/kanban/Card.tsx`)

```typescript
/**
 * Card — Individual Kanban card
 *
 * Features:
 * - Draggable (touch-optimized)
 * - Long-press context menu
 * - Visual feedback during drag
 * - Label chips, assignees, due date
 */

import React, { useCallback, useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/dnd-utilities';
import { Calendar, MessageSquare, Paperclip } from 'lucide-react';
import { format, isPast, isToday, isTomorrow } from 'date-fns';
import type { Card as CardType } from '../../types/models';
import { useKanbanStore } from '../../stores/useKanbanStore';
import { useLongPress } from '../../hooks/useLongPress';
import { CardLabels } from './CardLabels';
import { Avatar } from '../common/Avatar';

interface CardProps {
  card: CardType;
  columnId: string;
}

export function Card({ card, columnId }: CardProps) {
  const selectCard = useKanbanStore((s) => s.selectCard);
  const [showActions, setShowActions] = useState(false);

  // Sortable (for card reordering within column)
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: card.id,
    data: {
      type: 'card',
      columnId,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Long press for quick actions
  const longPressProps = useLongPress(
    () => setShowActions(true),
    500 // 500ms for long press
  );

  // Due date styling
  const getDueDateStyle = useCallback(() => {
    if (!card.dueDate || card.dueComplete) return 'text-gray-400 bg-gray-100';
    const date = new Date(card.dueDate);
    if (isPast(date) && !isToday(date)) return 'text-red-600 bg-red-50';
    if (isToday(date)) return 'text-orange-600 bg-orange-50';
    if (isTomorrow(date)) return 'text-yellow-600 bg-yellow-50';
    return 'text-gray-500 bg-gray-100';
  }, [card.dueDate, card.dueComplete]);

  const formatDueDate = useCallback(() => {
    if (!card.dueDate) return null;
    const date = new Date(card.dueDate);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'MMM d');
  }, [card.dueDate]);

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        {...longPressProps}
        onClick={() => selectCard(card.id)}
        className={`
          group relative mb-2 cursor-pointer rounded-lg border border-gray-200 bg-white p-3 shadow-sm
          active:shadow-md
          ${isDragging ? 'z-50 rotate-1 opacity-90 shadow-lg ring-2 ring-[#06C755]' : ''}
          ${card.dueComplete ? 'opacity-60' : ''}
        `}
      >
        {/* Cover image */}
        {card.coverAttachmentId && (
          <div className="-mx-3 -mt-3 mb-2 h-24 overflow-hidden rounded-t-lg bg-gray-200">
            {/* TODO: load actual cover image */}
            <div className="h-full w-full bg-gradient-to-br from-[#06C755]/20 to-[#06C755]/40" />
          </div>
        )}

        {/* Labels */}
        {card.labels.length > 0 && (
          <CardLabels labels={card.labels} />
        )}

        {/* Title */}
        <h3 className={`text-sm leading-snug ${card.dueComplete ? 'line-through text-gray-400' : 'text-gray-800'}`}>
          {card.name}
        </h3>

        {/* Meta row */}
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Due date */}
            {card.dueDate && (
              <span
                className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${getDueDateStyle()}`}
              >
                <Calendar size={10} />
                {formatDueDate()}
              </span>
            )}

            {/* Comments count */}
            {card.activities && card.activities.length > 0 && (
              <span className="inline-flex items-center gap-0.5 text-[10px] text-gray-400">
                <MessageSquare size={10} />
                {card.activities.length}
              </span>
            )}

            {/* Attachments count */}
            {card.attachments && card.attachments.length > 0 && (
              <span className="inline-flex items-center gap-0.5 text-[10px] text-gray-400">
                <Paperclip size={10} />
                {card.attachments.length}
              </span>
            )}
          </div>

          {/* Assignees */}
          {card.assignees.length > 0 && (
            <div className="flex -space-x-1.5">
              {card.assignees.slice(0, 2).map((assignee) => (
                <Avatar
                  key={assignee.id}
                  src={assignee.avatarUrl}
                  name={assignee.name}
                  size="xs"
                  className="ring-1 ring-white"
                />
              ))}
              {card.assignees.length > 2 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 text-[8px] text-gray-500 ring-1 ring-white">
                  +{card.assignees.length - 2}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions Menu (from long press) */}
      {showActions && (
        <div
          className="fixed inset-0 z-[60] bg-black/50"
          onClick={() => setShowActions(false)}
        >
          <div className="absolute bottom-4 left-4 right-4 rounded-xl bg-white p-2 shadow-xl">
            <div className="mb-2 border-b border-gray-100 pb-2 text-center text-xs text-gray-400">
              {card.name}
            </div>
            <button
              className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm hover:bg-gray-50 active:bg-gray-100"
              onClick={() => {
                selectCard(card.id);
                setShowActions(false);
              }}
            >
              Open Card
            </button>
            <button
              className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm text-green-600 hover:bg-gray-50 active:bg-gray-100"
              onClick={() => {
                // TODO: mark complete
                setShowActions(false);
              }}
            >
              Mark Complete
            </button>
            <button
              className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm text-red-500 hover:bg-red-50 active:bg-red-100"
              onClick={() => {
                // TODO: archive card
                setShowActions(false);
              }}
            >
              Archive
            </button>
          </div>
        </div>
      )}
    </>
  );
}
```

## 4.7 Cards Container (`src/components/kanban/CardsContainer.tsx`)

```typescript
/**
 * CardsContainer — Vertical list of cards within a column
 *
 * Uses SortableContext for card reordering via drag-and-drop.
 */

import React from 'react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { Card as CardType } from '../../types/models';
import { Card } from './Card';

interface CardsContainerProps {
  columnId: string;
  cards: CardType[];
}

export function CardsContainer({ columnId, cards }: CardsContainerProps) {
  return (
    <SortableContext
      items={cards.map((c) => c.id)}
      strategy={verticalListSortingStrategy}
    >
      <div className="flex min-h-[60px] flex-col">
        {cards.length === 0 && (
          <div className="flex h-16 items-center justify-center rounded-lg border-2 border-dashed border-gray-200">
            <p className="text-xs text-gray-300">Drop cards here</p>
          </div>
        )}
        {cards.map((card) => (
          <Card key={card.id} card={card} columnId={columnId} />
        ))}
      </div>
    </SortableContext>
  );
}
```

## 4.8 Column Header (`src/components/kanban/ColumnHeader.tsx`)

```typescript
/**
 * ColumnHeader — Column title bar with count and menu
 */

import React, { useState, useCallback } from 'react';
import { MoreHorizontal, Plus } from 'lucide-react';
import type { ColumnWithCards } from '../../stores/useKanbanStore';
import { useKanbanStore } from '../../stores/useKanbanStore';

interface ColumnHeaderProps {
  column: ColumnWithCards;
  dragHandleProps?: Record<string, unknown>;
}

export function ColumnHeader({ column, dragHandleProps }: ColumnHeaderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(column.name);
  const [showMenu, setShowMenu] = useState(false);
  const updateColumn = useKanbanStore((s) => s.updateColumn);

  const handleSave = useCallback(() => {
    const trimmed = title.trim();
    if (trimmed && trimmed !== column.name) {
      updateColumn(column.id, { name: trimmed });
      // TODO: API call
    }
    setIsEditing(false);
  }, [title, column.id, column.name, updateColumn]);

  return (
    <div
      className="flex items-center gap-2 px-3 py-2.5"
      {...dragHandleProps}
    >
      {/* Title */}
      <div className="min-w-0 flex-1">
        {isEditing ? (
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleSave}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
              if (e.key === 'Escape') {
                setTitle(column.name);
                setIsEditing(false);
              }
            }}
            autoFocus
            className="w-full rounded border border-[#06C755] px-1.5 py-0.5 text-sm font-medium outline-none"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <button
            onClick={() => {
              setTitle(column.name);
              setIsEditing(true);
            }}
            className="text-left text-sm font-medium text-gray-700 hover:text-[#06C755]"
          >
            {column.name}
          </button>
        )}
      </div>

      {/* Card count */}
      <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-gray-200 px-1 text-[10px] font-medium text-gray-500">
        {column.cards.length}
      </span>

      {/* Menu */}
      <div className="relative">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="flex h-6 w-6 items-center justify-center rounded hover:bg-gray-200"
        >
          <MoreHorizontal size={14} className="text-gray-400" />
        </button>

        {showMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
            <div className="absolute right-0 top-7 z-50 w-44 rounded-lg border border-gray-100 bg-white py-1 shadow-lg">
              <button
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50"
                onClick={() => {
                  setIsEditing(true);
                  setShowMenu(false);
                }}
              >
                Edit name
              </button>
              <button
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-500 hover:bg-red-50"
                onClick={() => {
                  // TODO: Delete column
                  setShowMenu(false);
                }}
              >
                Delete column
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
```

## 4.9 Add Column & Add Card Buttons

```typescript
// ── AddColumnButton.tsx ──────────────────────────────────

import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { useKanbanStore } from '../../stores/useKanbanStore';

export function AddColumnButton() {
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const { activeBoard, addColumn } = useKanbanStore();

  const handleAdd = () => {
    const trimmed = name.trim();
    if (!trimmed || !activeBoard) return;

    const newColumn = {
      id: `temp-${Date.now()}`,
      name: trimmed,
      position: useKanbanStore.getState().columns.length,
      boardId: activeBoard.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      cards: [],
    };
    addColumn(newColumn);
    // TODO: API call then update with real ID

    setName('');
    setIsAdding(false);
  };

  if (isAdding) {
    return (
      <div className="mx-1 w-[85vw] max-w-[320px] shrink-0 snap-start rounded-xl bg-gray-100 p-3 sm:w-[300px]">
        <input
          type="text"
          placeholder="Column name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAdd();
            if (e.key === 'Escape') setIsAdding(false);
          }}
          autoFocus
          className="mb-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#06C755]"
        />
        <div className="flex gap-2">
          <button
            onClick={handleAdd}
            className="rounded-lg bg-[#06C755] px-4 py-1.5 text-sm font-medium text-white active:bg-[#05a347]"
          >
            Add
          </button>
          <button
            onClick={() => setIsAdding(false)}
            className="rounded-lg px-4 py-1.5 text-sm text-gray-500 hover:bg-gray-200"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setIsAdding(true)}
      className="mx-1 flex h-fit w-[85vw] max-w-[320px] shrink-0 snap-start items-center gap-2 rounded-xl border-2 border-dashed border-gray-300 p-3 text-gray-400 hover:border-[#06C755] hover:text-[#06C755] sm:w-[300px]"
    >
      <Plus size={18} />
      <span className="text-sm font-medium">Add column</span>
    </button>
  );
}
```

```typescript
// ── AddCardButton.tsx ────────────────────────────────────

import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { useKanbanStore } from '../../stores/useKanbanStore';

interface AddCardButtonProps {
  columnId: string;
}

export function AddCardButton({ columnId }: AddCardButtonProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const addCard = useKanbanStore((s) => s.addCard);

  const handleAdd = () => {
    const trimmed = name.trim();
    if (!trimmed) return;

    const newCard = {
      id: `temp-${Date.now()}`,
      name: trimmed,
      listId: columnId,
      boardId: useKanbanStore.getState().activeBoard?.id ?? '',
      position: 9999, // Will be set properly by API
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      labels: [],
      assignees: [],
      attachments: [],
      activities: [],
      description: '',
    };
    addCard(newCard);
    // TODO: API call

    setName('');
    setIsAdding(false);
  };

  if (isAdding) {
    return (
      <div className="mb-2 rounded-lg bg-white p-2 shadow-sm">
        <textarea
          placeholder="Card title"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleAdd();
            }
            if (e.key === 'Escape') setIsAdding(false);
          }}
          autoFocus
          rows={2}
          className="mb-2 w-full resize-none rounded border border-gray-200 px-2 py-1.5 text-sm outline-none focus:border-[#06C755]"
        />
        <div className="flex gap-2">
          <button
            onClick={handleAdd}
            className="rounded bg-[#06C755] px-3 py-1 text-xs font-medium text-white active:bg-[#05a347]"
          >
            Add
          </button>
          <button
            onClick={() => setIsAdding(false)}
            className="rounded px-3 py-1 text-xs text-gray-500 hover:bg-gray-100"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setIsAdding(true)}
      className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-gray-400 hover:bg-gray-200/50 hover:text-gray-600"
    >
      <Plus size={14} />
      <span>Add card</span>
    </button>
  );
}
```

## 4.10 Column Switcher (`src/components/kanban/ColumnSwitcher.tsx`)

```typescript
/**
 * ColumnSwitcher — Bottom sheet for switching columns on small screens
 *
 * Shows when screen width < 375px or when there are many columns.
 * Provides a quick way to navigate without horizontal scrolling.
 */

import React from 'react';
import { Layers } from 'lucide-react';
import { useKanbanStore } from '../../stores/useKanbanStore';

export function ColumnSwitcher() {
  const {
    columns,
    isColumnSwitcherOpen,
    setColumnSwitcherOpen,
  } = useKanbanStore();

  // Only show on small screens
  if (typeof window !== 'undefined' && window.innerWidth >= 640) {
    return null;
  }

  return (
    <>
      {/* FAB to open switcher */}
      <button
        onClick={() => setColumnSwitcherOpen(true)}
        className="fixed bottom-4 right-4 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-[#06C755] text-white shadow-lg active:bg-[#05a347]"
      >
        <Layers size={20} />
      </button>

      {/* Bottom sheet */}
      {isColumnSwitcherOpen && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setColumnSwitcherOpen(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 max-h-[60vh] overflow-y-auto rounded-t-2xl bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold">Jump to Column</h3>
              <button
                onClick={() => setColumnSwitcherOpen(false)}
                className="rounded-lg px-3 py-1 text-sm text-gray-500"
              >
                Close
              </button>
            </div>

            <div className="space-y-2">
              {columns.map((col, index) => (
                <button
                  key={col.id}
                  onClick={() => {
                    // Scroll to column
                    const el = document.querySelector(`[data-column="${col.id}"]`);
                    el?.scrollIntoView({ behavior: 'smooth', inline: 'start' });
                    setColumnSwitcherOpen(false);
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left hover:bg-gray-50 active:bg-gray-100"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-xs font-medium text-gray-500">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-800">
                      {col.name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {col.cards.length} cards
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
```

---

# 5. Mobile-Optimized Kanban UX Design

## 5.1 UX Principles for Mobile Kanban

| Principle | Implementation |
|-----------|---------------|
| **Thumb Zone** | Primary actions in bottom 1/3 of screen |
| **Touch Targets** | Minimum 44×44px for all interactive elements |
| **Visual Feedback** | Haptic-like animations for card moves |
| **Reduced Clutter** | Collapse labels to dots, show counts only |
| **Contextual Actions** | Long-press for card actions, swipe for quick actions |
| **Progressive Disclosure** | Bottom sheets for detailed actions |
| **Scroll Conflict Resolution** | Delay-based DnD activation to distinguish scroll vs drag |

## 5.2 Touch Drag-and-Drop (@dnd-kit Integration)

```typescript
/**
 * useDragAndDrop.ts — Custom hook that configures @dnd-kit for mobile
 */

import {
  useSensor,
  useSensors,
  PointerSensor,
  TouchSensor,
  MouseSensor,
  KeyboardSensor,
  type DragEndEvent,
  type DragStartEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useCallback } from 'react';

export function useKanbanSensors() {
  return useSensors(
    // Desktop: pointer with small movement threshold
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    // Desktop: mouse
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    // Mobile: touch with delay to prevent scroll conflicts
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,      // 250ms press before drag activates
        tolerance: 5,    // Allow 5px movement during press
      },
    }),
    // Accessibility: keyboard
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
}
```

## 5.3 Pull-to-Refresh Hook (`src/hooks/usePullToRefresh.ts`)

```typescript
/**
 * usePullToRefresh — Pull-to-refresh for mobile
 *
 * Detects downward pull gesture and triggers refresh callback.
 * Shows visual indicator during pull.
 */

import { useState, useCallback, useRef, useEffect } from 'react';

interface PullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;    // Pull distance to trigger (default 80px)
  maxPull?: number;      // Max visual pull distance
  disabled?: boolean;
}

interface PullToRefreshState {
  isPulling: boolean;
  pullDistance: number;
  isRefreshing: boolean;
}

export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  maxPull = 120,
  disabled = false,
}: PullToRefreshOptions) {
  const [state, setState] = useState<PullToRefreshState>({
    isPulling: false,
    pullDistance: 0,
    isRefreshing: false,
  });

  const startY = useRef(0);
  const currentY = useRef(0);
  const isAtTop = useRef(true);
  const containerRef = useRef<HTMLDivElement>(null);

  const checkIsAtTop = useCallback(() => {
    return window.scrollY <= 0;
  }, []);

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (disabled || state.isRefreshing) return;
      isAtTop.current = checkIsAtTop();
      if (!isAtTop.current) return;

      startY.current = e.touches[0].clientY;
      currentY.current = startY.current;
    },
    [disabled, state.isRefreshing, checkIsAtTop]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isAtTop.current || disabled || state.isRefreshing) return;

      currentY.current = e.touches[0].clientY;
      const distance = Math.max(0, currentY.current - startY.current);

      if (distance > 10) {
        // Prevent default scroll when pulling
        e.preventDefault();

        const visualDistance = Math.min(distance * 0.5, maxPull);
        setState({
          isPulling: true,
          pullDistance: visualDistance,
          isRefreshing: false,
        });
      }
    },
    [disabled, state.isRefreshing, maxPull]
  );

  const handleTouchEnd = useCallback(async () => {
    if (!state.isPulling || state.isRefreshing) return;

    if (state.pullDistance >= threshold) {
      // Trigger refresh
      setState((s) => ({ ...s, isRefreshing: true, pullDistance: threshold * 0.8 }));

      try {
        await onRefresh();
      } finally {
        setState({ isPulling: false, pullDistance: 0, isRefreshing: false });
      }
    } else {
      // Snap back
      setState({ isPulling: false, pullDistance: 0, isRefreshing: false });
    }
  }, [state.isPulling, state.isRefreshing, state.pullDistance, threshold, onRefresh]);

  useEffect(() => {
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return {
    containerRef,
    ...state,
    pullProgress: state.isPulling ? Math.min(state.pullDistance / threshold, 1) : 0,
  };
}
```

## 5.4 Long Press Hook (`src/hooks/useLongPress.ts`)

```typescript
/**
 * useLongPress — Detect long press on touch devices
 *
 * Returns props to spread on the target element.
 */

import { useCallback, useRef } from 'react';

interface LongPressOptions {
  onLongPress: () => void;
  onClick?: () => void;
  delay?: number;
  shouldPreventDefault?: boolean;
}

interface LongPressResult {
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerUp: () => void;
  onPointerLeave: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onTouchStart: (e: React.TouchEvent) => void;
}

export function useLongPress(
  onLongPress: () => void,
  delay = 500,
  shouldPreventDefault = true
): LongPressResult {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPress = useRef(false);

  const start = useCallback(() => {
    isLongPress.current = false;
    timerRef.current = setTimeout(() => {
      isLongPress.current = true;
      onLongPress();
    }, delay);
  }, [onLongPress, delay]);

  const stop = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  return {
    onPointerDown: (e: React.PointerEvent) => {
      if (e.pointerType === 'touch') {
        start();
      }
    },
    onPointerUp: () => {
      stop();
    },
    onPointerLeave: () => {
      stop();
    },
    onContextMenu: (e: React.MouseEvent) => {
      if (shouldPreventDefault) {
        e.preventDefault();
      }
    },
    onTouchStart: () => {
      start();
    },
  };
}
```

## 5.5 Skeleton Loaders

```typescript
/**
 * Skeleton components for perceived performance
 */

import React from 'react';

export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded bg-gray-200 ${className}`}
    />
  );
}

export function BoardSkeleton() {
  return (
    <div className="flex h-full gap-3 overflow-x-hidden p-3">
      {/* 3 columns */}
      {[1, 2, 3].map((i) => (
        <div key={i} className="w-[85vw] max-w-[320px] shrink-0 rounded-xl bg-gray-100 p-3">
          {/* Column header */}
          <Skeleton className="mb-3 h-5 w-24" />
          {/* Cards */}
          {[1, 2, 3, 4].map((j) => (
            <div key={j} className="mb-2 rounded-lg bg-white p-3 shadow-sm">
              <Skeleton className="mb-2 h-4 w-full" />
              <div className="flex gap-2">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-3 w-8" />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardDetailSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
      <div className="flex gap-2">
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-6 w-16" />
      </div>
      <Skeleton className="h-24 w-full" />
    </div>
  );
}
```

## 5.6 LINE-Native Features Integration

```typescript
/**
 * useLineFeatures.ts — Hook for LINE-specific features
 */

import { useCallback } from 'react';
import { useLiff } from '../modules/liff/LiffProvider';

export function useLineFeatures() {
  const liff = useLiff();

  /**
   * Share a board link via LINE chat
   */
  const shareBoard = useCallback(
    async (boardName: string, boardId: string) => {
      const url = `${window.location.origin}/boards/${boardId}`;
      await liff.sendMessage(
        `📋 *${boardName}*\n\nCheck out this board:\n${url}`
      );
    },
    [liff]
  );

  /**
   * Share a specific card
   */
  const shareCard = useCallback(
    async (cardTitle: string, cardId: string, boardId: string) => {
      const url = `${window.location.origin}/boards/${boardId}?card=${cardId}`;
      await liff.sendMessage(
        `📝 *${cardTitle}*\n\nView this task:\n${url}`
      );
    },
    [liff]
  );

  /**
   * Close the LIFF app
   */
  const closeApp = useCallback(() => {
    liff.closeApp();
  }, [liff]);

  /**
   * Open external URL in LINE browser
   */
  const openExternal = useCallback(
    (url: string) => {
      liff.openExternal(url);
    },
    [liff]
  );

  /**
   * Scan QR code (for quick board access)
   */
  const scanQR = useCallback(async () => {
    if (liff.isApiAvailable('scanCode')) {
      const result = await liff.scanCode();
      return result.value;
    }
    return null;
  }, [liff]);

  /**
   * Get user profile for display
   */
  const getProfile = useCallback(async () => {
    return liff.refreshProfile();
  }, [liff]);

  return {
    shareBoard,
    shareCard,
    closeApp,
    openExternal,
    scanQR,
    getProfile,
  };
}
```

---

# 6. Complete Page Flow

## 6.1 Page Flow Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                     APP FLOW                                 │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│   [LINE App] → Open LIFF URL                                │
│        │                                                     │
│        ▼                                                     │
│   ┌─────────────┐                                           │
│   │ SplashPage  │  LIFF init → Auto login → Fetch boards    │
│   │  (2-3s)     │                                           │
│   └──────┬──────┘                                           │
│          │                                                   │
│          ▼                                                   │
│   ┌───────────────┐                                         │
│   │ BoardsListPage│  Grid of boards → Tap to open          │
│   │               │  Pull-to-refresh → FAB for new board   │
│   └───────┬───────┘                                         │
│           │                                                  │
│           ▼                                                  │
│   ┌───────────────┐                                         │
│   │BoardDetailPage│  Kanban board → Drag cards              │
│   │  (KanbanView) │  → Tap card → Card detail              │
│   │               │  → Add column/card → Settings           │
│   └───────┬───────┘                                         │
│           │                                                  │
│    ┌──────┴──────┐                                          │
│    ▼             ▼                                           │
│ ┌───────┐   ┌──────────┐                                   │
│ │Card   │   │Board     │                                   │
│ │Detail │   │Settings  │                                   │
│ │(Modal)│   │(New Page)│                                   │
│ └───┬───┘   └──────────┘                                   │
│     │                                                        │
│     ▼                                                        │
│ ┌──────────┐                                                │
│ │Card Edit │  Full form: title, desc, labels, assignee     │
│ │(Bottom  │  due date, attachments, comments                │
│ │ Sheet)  │                                                │
│ └──────────┘                                                │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

## 6.2 Splash Page (`src/pages/SplashPage.tsx`)

```typescript
/**
 * SplashPage — Initial loading screen
 *
 * - Shows LINE branding
 * - Initializes LIFF
 * - Auto-authenticates
 * - Redirects to boards list on success
 */

import React, { useEffect, useState } from 'react';
import { useLiff } from '../modules/liff/LiffProvider';
import { useAuth } from '../hooks/useAuth';
import { Spinner } from '../components/common/Spinner';
import { config } from '../lib/config';

type SplashStep = 'init' | 'auth' | 'loading' | 'error' | 'ready';

export function SplashPage() {
  const liff = useLiff();
  const { isAuthenticated, user } = useAuth();
  const [step, setStep] = useState<SplashStep>('init');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!liff.isReady) return;

    async function init() {
      try {
        setStep('auth');

        // If not logged in, LIFF login will redirect
        if (!liff.isLoggedIn) {
          console.log('[Splash] Not logged in, waiting for redirect...');
          return;
        }

        setStep('loading');

        // If authenticated with backend, redirect
        if (isAuthenticated && user) {
          console.log('[Splash] Already authenticated, redirecting...');
          // Use replace to avoid back button returning to splash
          window.location.replace('/boards');
          return;
        }

        // Otherwise, wait for auth hook to complete
        // (the useAuth hook handles auto-login)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setStep('error');
      }
    }

    init();
  }, [liff.isReady, liff.isLoggedIn, isAuthenticated, user]);

  // Watch for auth success
  useEffect(() => {
    if (isAuthenticated && user && step === 'loading') {
      window.location.replace('/boards');
    }
  }, [isAuthenticated, user, step]);

  if (step === 'error') {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center gap-4 bg-white p-6">
        <div className="text-4xl">⚠️</div>
        <h1 className="text-lg font-semibold text-gray-900">Something went wrong</h1>
        <p className="text-center text-sm text-gray-500">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 rounded-full bg-[#06C755] px-6 py-3 text-sm font-medium text-white"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center bg-[#06C755]">
      {/* App logo */}
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-white shadow-lg">
        <svg viewBox="0 0 24 24" className="h-12 w-12 text-[#06C755]" fill="currentColor">
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" opacity="0.5" />
        </svg>
      </div>

      <h1 className="mb-2 text-2xl font-bold text-white">Planka Boards</h1>
      <p className="mb-8 text-sm text-white/70">Kanban for your team</p>

      {/* Loading indicator */}
      <div className="flex items-center gap-3">
        <Spinner size="sm" className="text-white" />
        <span className="text-sm text-white/90">
          {step === 'init' && 'Initializing...'}
          {step === 'auth' && 'Authenticating...'}
          {step === 'loading' && 'Loading boards...'}
        </span>
      </div>
    </div>
  );
}
```

## 6.3 Boards List Page (`src/pages/BoardsListPage.tsx`)

```typescript
/**
 * BoardsListPage — Grid view of all user's boards
 *
 * - Grid layout (2 columns on mobile, 3 on tablet)
 * - Pull-to-refresh
 * - FAB to create new board
 * - Board card with member count, card count
 */

import React, { useEffect } from 'react';
import { Plus, LayoutGrid, Users, CreditCard } from 'lucide-react';
import { useKanbanStore } from '../stores/useKanbanStore';
import { boardsApi } from '../api/boardsApi';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { BoardSkeleton } from '../components/common/Skeleton';
import type { Board } from '../types/models';

const BOARD_COLORS = [
  'bg-gradient-to-br from-[#06C755] to-[#04a846]',
  'bg-gradient-to-br from-blue-500 to-blue-600',
  'bg-gradient-to-br from-purple-500 to-purple-600',
  'bg-gradient-to-br from-orange-400 to-orange-500',
  'bg-gradient-to-br from-pink-500 to-pink-600',
  'bg-gradient-to-br from-cyan-500 to-cyan-600',
];

function getBoardColor(index: number): string {
  return BOARD_COLORS[index % BOARD_COLORS.length];
}

export function BoardsListPage() {
  const { boards, setBoards, isLoading, setLoading, setActiveBoard } = useKanbanStore();

  const loadBoards = async () => {
    setLoading(true);
    try {
      const data = await boardsApi.getAll();
      setBoards(data);
    } catch (err) {
      console.error('Failed to load boards:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBoards();
  }, []);

  const { isPulling, pullDistance, isRefreshing, pullProgress } = usePullToRefresh({
    onRefresh: loadBoards,
  });

  const handleBoardClick = (board: Board) => {
    setActiveBoard(board);
    window.location.href = `/boards/${board.id}`;
  };

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">My Boards</h1>
            <p className="text-xs text-gray-500">
              {boards.length} board{boards.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={() => {/* TODO: create board modal */}}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#06C755] text-white shadow-md active:bg-[#05a347]"
          >
            <Plus size={20} />
          </button>
        </div>
      </header>

      {/* Pull-to-refresh indicator */}
      {isPulling && (
        <div
          className="flex items-center justify-center overflow-hidden bg-gray-50 transition-all"
          style={{ height: pullDistance }}
        >
          <div
            className="flex items-center gap-2"
            style={{
              opacity: Math.min(pullProgress, 1),
              transform: `scale(${Math.min(pullProgress * 1.2, 1)})`,
            }}
          >
            <div
              className={`h-5 w-5 rounded-full border-2 border-[#06C755] ${
                isRefreshing ? 'animate-spin border-t-transparent' : ''
              }`}
            />
            <span className="text-xs text-gray-500">
              {isRefreshing ? 'Refreshing...' : 'Pull to refresh'}
            </span>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {isLoading && boards.length === 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="aspect-[4/3] animate-pulse rounded-xl bg-gray-200" />
            ))}
          </div>
        ) : boards.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center text-center">
            <LayoutGrid size={48} className="mb-4 text-gray-300" />
            <p className="text-sm font-medium text-gray-500">No boards yet</p>
            <p className="mt-1 text-xs text-gray-400">Create your first board to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {boards.map((board, index) => (
              <button
                key={board.id}
                onClick={() => handleBoardClick(board)}
                className={`group relative flex aspect-[4/3] flex-col justify-between rounded-xl p-4 text-left shadow-sm transition-transform active:scale-95 ${getBoardColor(index)}`}
              >
                <div>
                  <h2 className="line-clamp-2 text-sm font-semibold text-white">
                    {board.name}
                  </h2>
                </div>
                <div className="flex items-center gap-3 text-white/80">
                  <span className="flex items-center gap-1 text-[10px]">
                    <CreditCard size={10} />
                    {board.labels?.length ?? 0}
                  </span>
                  <span className="flex items-center gap-1 text-[10px]">
                    <Users size={10} />
                    {board.memberships?.length ?? 0}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

## 6.4 Board Detail Page (`src/pages/BoardDetailPage.tsx`)

```typescript
/**
 * BoardDetailPage — The main Kanban board view
 *
 * - Loads board with columns and cards
 * - Sets up WebSocket for real-time updates
 * - Renders Kanban layout with DnD
 */

import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useKanbanStore } from '../stores/useKanbanStore';
import { boardsApi } from '../api/boardsApi';
import { useWebSocket } from '../../hooks/useWebSocket';
import { usePullToRefresh } from '../../hooks/usePullToRefresh';
import { BoardHeader } from '../components/kanban/BoardHeader';
import { ColumnsContainer } from '../components/kanban/ColumnsContainer';
import { BoardSkeleton } from '../components/common/Skeleton';
import { CardDetailModal } from '../components/card-detail/CardDetailModal';

export function BoardDetailPage() {
  const { boardId } = useParams<{ boardId: string }>();
  const {
    activeBoard,
    columns,
    setActiveBoard,
    setColumns,
    selectedCardId,
    isLoading,
    setLoading,
    setError,
  } = useKanbanStore();

  // Load board data
  const loadBoard = async () => {
    if (!boardId) return;
    setLoading(true);
    try {
      const board = await boardsApi.getById(boardId);
      setActiveBoard(board);
      // Columns come nested in board data
      setColumns(board.lists ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load board');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBoard();
    return () => {
      // Cleanup on unmount
      useKanbanStore.getState().setActiveBoard(null);
      useKanbanStore.getState().setColumns([]);
    };
  }, [boardId]);

  // WebSocket for real-time updates
  useWebSocket(boardId);

  // Pull-to-refresh
  const { isPulling, pullDistance, isRefreshing, pullProgress } = usePullToRefresh({
    onRefresh: loadBoard,
    disabled: isLoading,
  });

  if (isLoading && !activeBoard) {
    return (
      <div className="flex h-screen flex-col bg-gray-50">
        <div className="h-14 animate-pulse bg-gray-200" />
        <BoardSkeleton />
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-gray-50">
      <BoardHeader />

      {/* Pull-to-refresh indicator */}
      {isPulling && (
        <div
          className="flex shrink-0 items-center justify-center overflow-hidden transition-all"
          style={{ height: pullDistance }}
        >
          <div
            style={{
              opacity: Math.min(pullProgress, 1),
              transform: `scale(${Math.min(pullProgress * 1.2, 1)})`,
            }}
          >
            <div
              className={`h-5 w-5 rounded-full border-2 border-[#06C755] ${
                isRefreshing ? 'animate-spin border-t-transparent' : ''
              }`}
            />
          </div>
        </div>
      )}

      {/* Kanban Board */}
      <div className="min-h-0 flex-1">
        <ColumnsContainer />
      </div>

      {/* Card Detail Modal */}
      {selectedCardId && <CardDetailModal cardId={selectedCardId} />}
    </div>
  );
}
```

## 6.5 Card Detail Modal (`src/components/card-detail/CardDetailModal.tsx`)

```typescript
/**
 * CardDetailModal — Bottom sheet modal for card details on mobile
 *
 * Slides up from bottom on mobile, centered modal on desktop.
 */

import React, { useEffect, useState } from 'react';
import { X, Archive, Trash2, Share2, CheckCircle2 } from 'lucide-react';
import { useKanbanStore } from '../../stores/useKanbanStore';
import { useLineFeatures } from '../../hooks/useLineFeatures';
import { CardForm } from './CardForm';
import { LabelPicker } from './LabelPicker';
import { AssigneePicker } from './AssigneePicker';
import { DueDatePicker } from './DueDatePicker';
import { CardDetailSkeleton } from '../common/Skeleton';
import type { Card } from '../../types/models';

interface CardDetailModalProps {
  cardId: string;
}

export function CardDetailModal({ cardId }: CardDetailModalProps) {
  const { selectCard, activeBoard, updateCard, removeCard } = useKanbanStore();
  const lineFeatures = useLineFeatures();
  const [isClosing, setIsClosing] = useState(false);

  // Find card
  const card = useKanbanStore((s) =>
    s.columns.flatMap((c) => c.cards).find((c) => c.id === cardId)
  );

  // Close with animation
  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => selectCard(null), 200);
  };

  // Handle card update
  const handleUpdate = (partial: Partial<Card>) => {
    updateCard(cardId, partial);
    // TODO: API call
  };

  if (!card) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/50 transition-opacity duration-200 ${
          isClosing ? 'opacity-0' : 'opacity-100'
        }`}
        onClick={handleClose}
      />

      {/* Bottom sheet */}
      <div
        className={`absolute bottom-0 left-0 right-0 max-h-[90vh] overflow-y-auto rounded-t-2xl bg-white shadow-2xl transition-transform duration-200 sm:left-auto sm:right-auto sm:top-1/2 sm:max-h-[80vh] sm:w-full sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:bottom-auto ${
          isClosing ? 'translate-y-full sm:translate-y-0 sm:opacity-0' : 'translate-y-0 sm:translate-y-0'
        }`}
        style={{ transform: 'translateY(0)' }}
      >
        {/* Handle indicator */}
        <div className="sticky top-0 z-10 flex items-center justify-center bg-white pt-3 pb-2">
          <div className="h-1 w-10 rounded-full bg-gray-300" />
        </div>

        {/* Header */}
        <div className="sticky top-6 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-4 pb-3">
          <h2 className="text-lg font-semibold text-gray-900">Card Details</h2>
          <button
            onClick={handleClose}
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-gray-100"
          >
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-6">
          {/* Card Form (title + description) */}
          <CardForm card={card} onUpdate={handleUpdate} />

          {/* Labels */}
          <LabelPicker
            selectedLabels={card.labels.map((l) => l.id)}
            availableLabels={activeBoard?.labels ?? []}
            onToggle={(labelId) => {
              const currentIds = card.labels.map((l) => l.id);
              const newIds = currentIds.includes(labelId)
                ? currentIds.filter((id) => id !== labelId)
                : [...currentIds, labelId];
              handleUpdate({ labelIds: newIds });
            }}
          />

          {/* Assignees */}
          <AssigneePicker
            assignees={card.assignees}
            members={activeBoard?.memberships?.map((m) => m.user) ?? []}
            onToggle={(userId) => {
              const currentIds = card.assignees.map((a) => a.id);
              const newIds = currentIds.includes(userId)
                ? currentIds.filter((id) => id !== userId)
                : [...currentIds, userId];
              handleUpdate({ assigneeIds: newIds });
            }}
          />

          {/* Due Date */}
          <DueDatePicker
            dueDate={card.dueDate}
            dueComplete={card.dueComplete}
            onChange={(date) => handleUpdate({ dueDate: date })}
            onToggleComplete={() => handleUpdate({ dueComplete: !card.dueComplete })}
          />

          {/* Actions */}
          <div className="space-y-2 pt-4 border-t border-gray-100">
            <button
              onClick={() => handleUpdate({ dueComplete: !card.dueComplete })}
              className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-medium hover:bg-gray-50"
            >
              <CheckCircle2 size={18} className={card.dueComplete ? 'text-green-500' : 'text-gray-400'} />
              {card.dueComplete ? 'Mark Incomplete' : 'Mark Complete'}
            </button>

            <button
              onClick={() => lineFeatures.shareCard(card.name, card.id, card.boardId)}
              className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-medium hover:bg-gray-50"
            >
              <Share2 size={18} className="text-gray-400" />
              Share Card
            </button>

            <button
              onClick={() => {/* TODO: archive */}}
              className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-medium hover:bg-gray-50"
            >
              <Archive size={18} className="text-gray-400" />
              Archive Card
            </button>

            <button
              onClick={() => {
                removeCard(card.id);
                handleClose();
              }}
              className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-medium text-red-500 hover:bg-red-50"
            >
              <Trash2 size={18} />
              Delete Card
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

## 6.6 Card Form Component

```typescript
/**
 * CardForm — Title and description editor
 */

import React, { useState, useCallback } from 'react';
import type { Card } from '../../types/models';

interface CardFormProps {
  card: Card;
  onUpdate: (partial: Partial<Card>) => void;
}

export function CardForm({ card, onUpdate }: CardFormProps) {
  const [title, setTitle] = useState(card.name);
  const [description, setDescription] = useState(card.description ?? '');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDesc, setIsEditingDesc] = useState(false);

  const saveTitle = useCallback(() => {
    const trimmed = title.trim();
    if (trimmed && trimmed !== card.name) {
      onUpdate({ name: trimmed });
    }
    setIsEditingTitle(false);
  }, [title, card.name, onUpdate]);

  const saveDescription = useCallback(() => {
    const trimmed = description.trim();
    if (trimmed !== (card.description ?? '')) {
      onUpdate({ description: trimmed || null });
    }
    setIsEditingDesc(false);
  }, [description, card.description, onUpdate]);

  return (
    <div className="space-y-3">
      {/* Title */}
      {isEditingTitle ? (
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={saveTitle}
          onKeyDown={(e) => {
            if (e.key === 'Enter') saveTitle();
            if (e.key === 'Escape') {
              setTitle(card.name);
              setIsEditingTitle(false);
            }
          }}
          autoFocus
          className="w-full rounded-lg border border-[#06C755] px-3 py-2 text-base font-semibold outline-none"
        />
      ) : (
        <button
          onClick={() => setIsEditingTitle(true)}
          className="w-full text-left text-base font-semibold text-gray-900 hover:text-[#06C755]"
        >
          {card.name}
        </button>
      )}

      {/* Description */}
      {isEditingDesc ? (
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={saveDescription}
          placeholder="Add a description..."
          autoFocus
          rows={4}
          className="w-full resize-none rounded-lg border border-[#06C755] px-3 py-2 text-sm outline-none"
        />
      ) : (
        <button
          onClick={() => setIsEditingDesc(true)}
          className={`w-full rounded-lg p-2 text-left text-sm ${
            description
              ? 'text-gray-700 hover:bg-gray-50'
              : 'text-gray-400 hover:bg-gray-50'
          }`}
        >
          {description || 'Add a description...'}
        </button>
      )}
    </div>
  );
}
```

## 6.7 Label Picker Component

```typescript
/**
 * LabelPicker — Select/deselect labels for a card
 */

import React from 'react';
import { Tag, X } from 'lucide-react';
import type { Label } from '../../types/models';

interface LabelPickerProps {
  selectedLabels: string[];
  availableLabels: Label[];
  onToggle: (labelId: string) => void;
}

export function LabelPicker({ selectedLabels, availableLabels, onToggle }: LabelPickerProps) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
        <Tag size={16} className="text-gray-400" />
        Labels
      </div>
      <div className="flex flex-wrap gap-2">
        {availableLabels.map((label) => {
          const isSelected = selectedLabels.includes(label.id);
          return (
            <button
              key={label.id}
              onClick={() => onToggle(label.id)}
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-all ${
                isSelected
                  ? 'ring-2 ring-offset-1'
                  : 'opacity-40 hover:opacity-70'
              }`}
              style={{
                backgroundColor: isSelected ? label.color : `${label.color}40`,
                color: isSelected ? '#fff' : label.color,
                ringColor: isSelected ? label.color : 'transparent',
              }}
            >
              {isSelected && <X size={10} />}
              {label.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

## 6.8 Assignee Picker Component

```typescript
/**
 * AssigneePicker — Select/deselect assignees for a card
 */

import React from 'react';
import { UserPlus, Check } from 'lucide-react';
import type { User } from '../../types/models';
import { Avatar } from '../common/Avatar';

interface AssigneePickerProps {
  assignees: User[];
  members: User[];
  onToggle: (userId: string) => void;
}

export function AssigneePicker({ assignees, members, onToggle }: AssigneePickerProps) {
  const assigneeIds = new Set(assignees.map((a) => a.id));

  return (
    <div>
      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
        <UserPlus size={16} className="text-gray-400" />
        Assignees
      </div>
      <div className="space-y-1">
        {members.map((member) => {
          const isAssigned = assigneeIds.has(member.id);
          return (
            <button
              key={member.id}
              onClick={() => onToggle(member.id)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                isAssigned ? 'bg-[#06C755]/10' : 'hover:bg-gray-50'
              }`}
            >
              <Avatar src={member.avatarUrl} name={member.name} size="sm" />
              <span className="flex-1 text-gray-800">{member.name}</span>
              {isAssigned && <Check size={16} className="text-[#06C755]" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

## 6.9 Due Date Picker Component

```typescript
/**
 * DueDatePicker — Date selection with completion toggle
 */

import React, { useState } from 'react';
import { Calendar, Check } from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';

interface DueDatePickerProps {
  dueDate?: string;
  dueComplete?: boolean;
  onChange: (date: string | null) => void;
  onToggleComplete: () => void;
}

export function DueDatePicker({ dueDate, dueComplete, onChange, onToggleComplete }: DueDatePickerProps) {
  const [showPicker, setShowPicker] = useState(false);

  const getDateStyle = () => {
    if (!dueDate || dueComplete) return 'text-gray-500 bg-gray-100';
    const date = new Date(dueDate);
    if (isPast(date) && !isToday(date)) return 'text-red-600 bg-red-50';
    if (isToday(date)) return 'text-orange-600 bg-orange-50';
    return 'text-gray-600 bg-gray-100';
  };

  return (
    <div>
      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
        <Calendar size={16} className="text-gray-400" />
        Due Date
      </div>

      <div className="flex items-center gap-2">
        {dueDate ? (
          <>
            <button
              onClick={onToggleComplete}
              className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors ${
                dueComplete
                  ? 'border-green-500 bg-green-500 text-white'
                  : 'border-gray-300 hover:border-green-400'
              }`}
            >
              {dueComplete && <Check size={14} />}
            </button>
            <button
              onClick={() => setShowPicker(!showPicker)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium ${getDateStyle()}`}
            >
              {format(new Date(dueDate), 'MMM d, yyyy')}
              {isToday(new Date(dueDate)) && ' (Today)'}
            </button>
            <button
              onClick={() => onChange(null)}
              className="text-xs text-gray-400 hover:text-red-500"
            >
              Clear
            </button>
          </>
        ) : (
          <button
            onClick={() => setShowPicker(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-3 py-1.5 text-xs text-gray-400 hover:border-[#06C755] hover:text-[#06C755]"
          >
            <Calendar size={12} />
            Set due date
          </button>
        )}
      </div>

      {/* Native date input (simplified — use a date picker library for production) */}
      {showPicker && (
        <div className="mt-2">
          <input
            type="date"
            onChange={(e) => {
              onChange(e.target.value ? `${e.target.value}T00:00:00.000Z` : null);
              setShowPicker(false);
            }}
            autoFocus
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#06C755]"
          />
        </div>
      )}
    </div>
  );
}
```


---

# 7. API Integration Code

## 7.1 Boards API (`src/api/boardsApi.ts`)

```typescript
/**
 * boardsApi — Board CRUD and management
 */

import { apiClient } from '../services/apiClient';
import type {
  Board,
  ApiResponse,
  CreateBoardRequest,
  UpdateBoardRequest,
  ReorderColumnsRequest,
} from '../types/models';

export const boardsApi = {
  /**
   * Get all boards for the current user
   */
  async getAll(): Promise<Board[]> {
    const response = await apiClient.get<ApiResponse<Board[]>>('/api/boards');
    return response.data.data;
  },

  /**
   * Get a single board with full details (columns, cards, labels, members)
   */
  async getById(boardId: string): Promise<Board> {
    const response = await apiClient.get<ApiResponse<Board>>(`/api/boards/${boardId}`);
    return response.data.data;
  },

  /**
   * Create a new board
   */
  async create(data: CreateBoardRequest): Promise<Board> {
    const response = await apiClient.post<ApiResponse<Board>>('/api/boards', data);
    return response.data.data;
  },

  /**
   * Update board properties
   */
  async update(boardId: string, data: UpdateBoardRequest): Promise<Board> {
    const response = await apiClient.patch<ApiResponse<Board>>(`/api/boards/${boardId}`, data);
    return response.data.data;
  },

  /**
   * Delete a board
   */
  async delete(boardId: string): Promise<void> {
    await apiClient.delete(`/api/boards/${boardId}`);
  },

  /**
   * Reorder columns within a board
   */
  async reorderColumns(boardId: string, orderedColumnIds: string[]): Promise<void> {
    const payload: ReorderColumnsRequest = {
      boardId,
      columnIds: orderedColumnIds,
    };
    await apiClient.put(`/api/boards/${boardId}/lists/reorder`, payload);
  },

  /**
   * Get board members
   */
  async getMembers(boardId: string) {
    const response = await apiClient.get<ApiResponse<Board['memberships']>>(
      `/api/boards/${boardId}/memberships`
    );
    return response.data.data;
  },

  /**
   * Add a member to the board
   */
  async addMember(boardId: string, userId: string, role: 'editor' | 'viewer' = 'editor') {
    const response = await apiClient.post<ApiResponse<Board['memberships'][0]>>(
      `/api/boards/${boardId}/memberships`,
      { userId, role }
    );
    return response.data.data;
  },

  /**
   * Remove a member from the board
   */
  async removeMember(boardId: string, membershipId: string): Promise<void> {
    await apiClient.delete(`/api/boards/${boardId}/memberships/${membershipId}`);
  },
};
```

## 7.2 Columns API (`src/api/columnsApi.ts`)

```typescript
/**
 * columnsApi — Column (List) CRUD
 */

import { apiClient } from '../services/apiClient';
import type {
  Column,
  ApiResponse,
  CreateColumnRequest,
  UpdateColumnRequest,
} from '../types/models';

export const columnsApi = {
  /**
   * Get all columns for a board
   */
  async getAll(boardId: string): Promise<Column[]> {
    const response = await apiClient.get<ApiResponse<Column[]>>(`/api/boards/${boardId}/lists`);
    return response.data.data;
  },

  /**
   * Get a single column
   */
  async getById(columnId: string): Promise<Column> {
    const response = await apiClient.get<ApiResponse<Column>>(`/api/lists/${columnId}`);
    return response.data.data;
  },

  /**
   * Create a new column
   */
  async create(data: CreateColumnRequest): Promise<Column> {
    const response = await apiClient.post<ApiResponse<Column>>('/api/lists', data);
    return response.data.data;
  },

  /**
   * Update column properties
   */
  async update(columnId: string, data: UpdateColumnRequest): Promise<Column> {
    const response = await apiClient.patch<ApiResponse<Column>>(`/api/lists/${columnId}`, data);
    return response.data.data;
  },

  /**
   * Delete a column
   */
  async delete(columnId: string): Promise<void> {
    await apiClient.delete(`/api/lists/${columnId}`);
  },

  /**
   * Reorder columns
   */
  async reorder(boardId: string, orderedIds: string[]): Promise<void> {
    await apiClient.put(`/api/boards/${boardId}/lists/reorder`, {
      columnIds: orderedIds,
    });
  },
};
```

## 7.3 Cards API (`src/api/cardsApi.ts`)

```typescript
/**
 * cardsApi — Card CRUD and movement operations
 */

import { apiClient } from '../services/apiClient';
import type {
  Card,
  ApiResponse,
  CreateCardRequest,
  UpdateCardRequest,
  MoveCardRequest,
  ReorderCardsRequest,
} from '../types/models';

export const cardsApi = {
  /**
   * Get all cards for a column
   */
  async getAll(columnId: string): Promise<Card[]> {
    const response = await apiClient.get<ApiResponse<Card[]>>(`/api/lists/${columnId}/cards`);
    return response.data.data;
  },

  /**
   * Get a single card with full details
   */
  async getById(cardId: string): Promise<Card> {
    const response = await apiClient.get<ApiResponse<Card>>(`/api/cards/${cardId}`);
    return response.data.data;
  },

  /**
   * Create a new card
   */
  async create(data: CreateCardRequest): Promise<Card> {
    const response = await apiClient.post<ApiResponse<Card>>('/api/cards', data);
    return response.data.data;
  },

  /**
   * Update card properties
   */
  async update(cardId: string, data: UpdateCardRequest): Promise<Card> {
    const response = await apiClient.patch<ApiResponse<Card>>(`/api/cards/${cardId}`, data);
    return response.data.data;
  },

  /**
   * Delete a card
   */
  async delete(cardId: string): Promise<void> {
    await apiClient.delete(`/api/cards/${cardId}`);
  },

  /**
   * Move a card to a different column and/or position
   */
  async move(cardId: string, data: MoveCardRequest): Promise<Card> {
    const response = await apiClient.put<ApiResponse<Card>>(`/api/cards/${cardId}/move`, data);
    return response.data.data;
  },

  /**
   * Reorder cards within a column
   */
  async reorder(columnId: string, orderedCardIds: string[]): Promise<void> {
    const payload: ReorderCardsRequest = {
      listId: columnId,
      cardIds: orderedCardIds,
    };
    await apiClient.put(`/api/lists/${columnId}/cards/reorder`, payload);
  },

  /**
   * Duplicate a card
   */
  async duplicate(cardId: string): Promise<Card> {
    const response = await apiClient.post<ApiResponse<Card>>(`/api/cards/${cardId}/duplicate`);
    return response.data.data;
  },

  /**
   * Archive a card
   */
  async archive(cardId: string): Promise<Card> {
    const response = await apiClient.patch<ApiResponse<Card>>(`/api/cards/${cardId}`, {
      isArchived: true,
    });
    return response.data.data;
  },

  /**
   * Get card activities (comments)
   */
  async getActivities(cardId: string) {
    const response = await apiClient.get<ApiResponse<Card['activities']>>(
      `/api/cards/${cardId}/activities`
    );
    return response.data.data;
  },

  /**
   * Add a comment to a card
   */
  async addComment(cardId: string, text: string) {
    const response = await apiClient.post<ApiResponse<Card['activities'][0]>>(
      `/api/cards/${cardId}/comments`,
      { text }
    );
    return response.data.data;
  },
};
```

## 7.4 Labels API (`src/api/labelsApi.ts`)

```typescript
/**
 * labelsApi — Label CRUD
 */

import { apiClient } from '../services/apiClient';
import type { Label, ApiResponse } from '../types/models';

export interface CreateLabelRequest {
  name: string;
  color: string;
  boardId: string;
}

export interface UpdateLabelRequest {
  name?: string;
  color?: string;
}

export const labelsApi = {
  async getAll(boardId: string): Promise<Label[]> {
    const response = await apiClient.get<ApiResponse<Label[]>>(`/api/boards/${boardId}/labels`);
    return response.data.data;
  },

  async create(data: CreateLabelRequest): Promise<Label> {
    const response = await apiClient.post<ApiResponse<Label>>('/api/labels', data);
    return response.data.data;
  },

  async update(labelId: string, data: UpdateLabelRequest): Promise<Label> {
    const response = await apiClient.patch<ApiResponse<Label>>(`/api/labels/${labelId}`, data);
    return response.data.data;
  },

  async delete(labelId: string): Promise<void> {
    await apiClient.delete(`/api/labels/${labelId}`);
  },
};
```

## 7.5 Members API (`src/api/membersApi.ts`)

```typescript
/**
 * membersApi — Project/board member management
 */

import { apiClient } from '../services/apiClient';
import type { Member, ApiResponse } from '../types/models';

export const membersApi = {
  async getAll(projectId: string): Promise<Member[]> {
    const response = await apiClient.get<ApiResponse<Member[]>>(`/api/projects/${projectId}/members`);
    return response.data.data;
  },

  async invite(projectId: string, email: string, role: string = 'editor'): Promise<Member> {
    const response = await apiClient.post<ApiResponse<Member>>(`/api/projects/${projectId}/members`, {
      email,
      role,
    });
    return response.data.data;
  },

  async updateRole(memberId: string, role: string): Promise<Member> {
    const response = await apiClient.patch<ApiResponse<Member>>(`/api/members/${memberId}`, {
      role,
    });
    return response.data.data;
  },

  async remove(memberId: string): Promise<void> {
    await apiClient.delete(`/api/members/${memberId}`);
  },
};
```

## 7.6 WebSocket Hook (`src/hooks/useWebSocket.ts`)

```typescript
/**
 * useWebSocket — Real-time sync with Planka backend
 *
 * Establishes WebSocket connection and dispatches events to Zustand store.
 * Auto-reconnects with exponential backoff.
 */

import { useEffect, useRef, useCallback } from 'react';
import { config } from '../lib/config';
import { useAuthStore } from '../stores/useAuthStore';
import { useKanbanStore } from '../stores/useKanbanStore';
import type { PlankaWebSocketEvent } from '../types/models';

// WebSocket event handlers
const eventHandlers: Record<string, (payload: unknown) => void> = {
  'card:create': (payload: { card: { listId: string } & Record<string, unknown> }) => {
    const { card } = payload;
    useKanbanStore.getState().addCard(card as never);
  },

  'card:update': (payload: { card: { id: string } & Record<string, unknown> }) => {
    const { card } = payload;
    useKanbanStore.getState().updateCard(card.id, card);
  },

  'card:move': (payload: {
    card: { id: string; listId: string; position: number };
    sourceListId: string;
    targetListId: string;
  }) => {
    const { card, targetListId, sourceListId } = payload;
    useKanbanStore.getState().moveCard(card.id, sourceListId, targetListId, card.position);
  },

  'card:delete': (payload: { card: { id: string } }) => {
    useKanbanStore.getState().removeCard(payload.card.id);
  },

  'list:create': (payload: { list: { cards: never[] } & Record<string, unknown> }) => {
    const list = { ...payload.list, cards: payload.list.cards ?? [] };
    useKanbanStore.getState().addColumn(list as never);
  },

  'list:update': (payload: { list: { id: string } & Record<string, unknown> }) => {
    const { list } = payload;
    useKanbanStore.getState().updateColumn(list.id, list);
  },

  'list:delete': (payload: { list: { id: string } }) => {
    useKanbanStore.getState().removeColumn(payload.list.id);
  },

  'board:update': (payload: { board: Record<string, unknown> }) => {
    useKanbanStore.getState().updateBoard(payload.board);
  },
};

export function useWebSocket(boardId?: string) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttempt = useRef(0);
  const MAX_RECONNECT_DELAY = 30000; // 30 seconds

  const accessToken = useAuthStore((s) => s.user); // We get token from storage

  const connect = useCallback(() => {
    if (!boardId) return;

    const token = localStorage.getItem('planka_auth');
    const parsed = token ? JSON.parse(token) : null;
    const accessToken = parsed?.accessToken;

    if (!accessToken) return;

    const wsUrl = `${config.wsUrl}/boards/${boardId}?token=${accessToken}`;

    console.log('[WS] Connecting...');
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[WS] Connected');
      reconnectAttempt.current = 0;
    };

    ws.onmessage = (event) => {
      try {
        const message: PlankaWebSocketEvent = JSON.parse(event.data);
        console.log('[WS] Event:', message.type);

        const handler = eventHandlers[message.type];
        if (handler) {
          handler(message.payload as never);
        } else {
          console.log('[WS] Unhandled event type:', message.type);
        }
      } catch (err) {
        console.error('[WS] Failed to parse message:', err);
      }
    };

    ws.onclose = (event) => {
      console.log('[WS] Disconnected:', event.code, event.reason);
      wsRef.current = null;

      // Auto-reconnect with backoff
      if (!event.wasClean) {
        const delay = Math.min(
          1000 * Math.pow(2, reconnectAttempt.current),
          MAX_RECONNECT_DELAY
        );
        reconnectAttempt.current++;
        console.log(`[WS] Reconnecting in ${delay}ms (attempt ${reconnectAttempt.current})`);

        reconnectTimeoutRef.current = setTimeout(connect, delay);
      }
    };

    ws.onerror = (error) => {
      console.error('[WS] Error:', error);
    };
  }, [boardId]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close(1000, 'Component unmounting');
      wsRef.current = null;
    }
  }, []);

  // Connect/disconnect based on boardId
  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  // Send a message through WebSocket
  const send = useCallback((type: string, payload: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, payload }));
    } else {
      console.warn('[WS] Cannot send, not connected');
    }
  }, []);

  return { connect, disconnect, send, isConnected: wsRef.current?.readyState === WebSocket.OPEN };
}
```

## 7.7 Optimistic Update Hook (`src/hooks/useOptimisticUpdate.ts`)

```typescript
/**
 * useOptimisticUpdate — Hook for optimistic UI updates with rollback
 *
 * Pattern:
 * 1. Apply optimistic update to store immediately
 * 2. Execute API call
 * 3. On success: server state takes over (via WebSocket or response)
 * 4. On error: rollback to previous state
 */

import { useRef, useCallback } from 'react';

interface OptimisticState<T> {
  previous: T;
  current: T;
}

interface OptimisticOptions<T> {
  optimisticUpdate: () => void;
  apiCall: () => Promise<unknown>;
  rollback: () => void;
  onSuccess?: (result: unknown) => void;
  onError?: (error: Error) => void;
}

export function useOptimisticUpdate<T>() {
  const statesRef = useRef<Map<string, OptimisticState<T>>>(new Map());

  const executeOptimistic = useCallback(
    async <R>(options: OptimisticOptions<T>): Promise<R | null> => {
      const { optimisticUpdate, apiCall, rollback, onSuccess, onError } = options;

      // 1. Apply optimistic update
      optimisticUpdate();

      try {
        // 2. Execute API call
        const result = await apiCall();

        // 3. Success
        onSuccess?.(result);
        return result as R;
      } catch (err) {
        // 4. Error — rollback
        console.error('[Optimistic] API call failed, rolling back:', err);
        rollback();

        const error = err instanceof Error ? err : new Error('Unknown error');
        onError?.(error);
        return null;
      }
    },
    []
  );

  return { executeOptimistic };
}

/**
 * Specialized hook for card movement with optimistic updates
 */
export function useOptimisticMove() {
  const executeOptimistic = useCallback(
    async (
      apiCall: () => Promise<unknown>,
      rollback: () => void
    ): Promise<boolean> => {
      try {
        await apiCall();
        return true;
      } catch (err) {
        console.error('[OptimisticMove] Failed:', err);
        rollback();
        return false;
      }
    },
    []
  );

  return { executeOptimistic };
}
```

---

# 8. Offline-First Strategy

## 8.1 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                  OFFLINE-FIRST ARCHITECTURE                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   ┌──────────────┐     ┌──────────────┐     ┌──────────┐   │
│   │   UI Layer   │◄────│ OfflineQueue │◄────│  API     │   │
│   │  (Zustand)   │     │   (Queue)    │     │ Client   │   │
│   └──────┬───────┘     └──────────────┘     └──────────┘   │
│          │                      │                           │
│          │                     │                            │
│   ┌──────▼───────┐     ┌──────▼──────┐                    │
│   │ localStorage │     │  SyncEngine │                     │
│   │  (Board Data)│     │  (Conflict) │                     │
│   └──────────────┘     └─────────────┘                     │
│                                                              │
│   Flow:                                                      │
│   1. User moves card → Optimistic UI update                  │
│   2. Online? → Direct API call                               │
│   3. Offline? → Queue action + localStorage                  │
│   4. Reconnect → Process queue (FIFO)                        │
│   5. Conflict → Last-write-wins + merge                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 8.2 Offline Queue (`src/hooks/useOfflineQueue.ts`)

```typescript
/**
 * useOfflineQueue — Queue API actions when offline
 *
 * Uses a persistent queue that survives page reloads.
 * Processes queue when connection is restored.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// ── Types ────────────────────────────────────────────────

export type QueuedActionType =
  | 'card:create'
  | 'card:update'
  | 'card:move'
  | 'card:delete'
  | 'list:create'
  | 'list:update'
  | 'list:reorder';

export interface QueuedAction {
  id: string;
  type: QueuedActionType;
  payload: Record<string, unknown>;
  timestamp: number;
  retryCount: number;
}

// ── Constants ────────────────────────────────────────────

const QUEUE_STORAGE_KEY = 'planka_offline_queue';
const MAX_RETRIES = 3;
const SYNC_INTERVAL = 5000; // Check for connection every 5s

// ── Storage Helpers ──────────────────────────────────────

function loadQueue(): QueuedAction[] {
  try {
    const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveQueue(queue: QueuedAction[]): void {
  localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
}

// ── Network Status ───────────────────────────────────────

function isOnline(): boolean {
  return navigator.onLine;
}

// ── Hook ─────────────────────────────────────────────────

export interface OfflineQueueState {
  queue: QueuedAction[];
  isProcessing: boolean;
  isOnline: boolean;
  pendingCount: number;
}

export function useOfflineQueue() {
  const [state, setState] = useState<OfflineQueueState>({
    queue: loadQueue(),
    isProcessing: false,
    isOnline: navigator.onLine,
    pendingCount: 0,
  });

  const processingRef = useRef(false);

  // Update pending count
  useEffect(() => {
    setState((s) => ({
      ...s,
      pendingCount: s.queue.filter((a) => a.retryCount < MAX_RETRIES).length,
    }));
  }, [state.queue]);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => setState((s) => ({ ...s, isOnline: true }));
    const handleOffline = () => setState((s) => ({ ...s, isOnline: false }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Add action to queue
  const enqueue = useCallback((type: QueuedActionType, payload: Record<string, unknown>) => {
    const action: QueuedAction = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      type,
      payload,
      timestamp: Date.now(),
      retryCount: 0,
    };

    setState((s) => {
      const newQueue = [...s.queue, action];
      saveQueue(newQueue);
      return { ...s, queue: newQueue };
    });

    return action.id;
  }, []);

  // Remove action from queue
  const dequeue = useCallback((actionId: string) => {
    setState((s) => {
      const newQueue = s.queue.filter((a) => a.id !== actionId);
      saveQueue(newQueue);
      return { ...s, queue: newQueue };
    });
  }, []);

  // Mark action as failed, increment retry
  const markFailed = useCallback((actionId: string) => {
    setState((s) => {
      const newQueue = s.queue.map((a) =>
        a.id === actionId ? { ...a, retryCount: a.retryCount + 1 } : a
      );
      saveQueue(newQueue);
      return { ...s, queue: newQueue };
    });
  }, []);

  // Clear all queued actions
  const clearQueue = useCallback(() => {
    saveQueue([]);
    setState((s) => ({ ...s, queue: [] }));
  }, []);

  // Process queue (attempt to send pending actions)
  const processQueue = useCallback(async () => {
    if (processingRef.current || !isOnline()) return;
    processingRef.current = true;
    setState((s) => ({ ...s, isProcessing: true }));

    try {
      const queue = loadQueue();
      const processable = queue.filter((a) => a.retryCount < MAX_RETRIES);

      for (const action of processable) {
        try {
          // TODO: Route to appropriate API based on action type
          // This would dispatch to the relevant API function
          console.log('[OfflineQueue] Processing:', action.type, action.id);

          // Simulate API call success
          await new Promise((resolve) => setTimeout(resolve, 200));

          // Remove from queue on success
          dequeue(action.id);
        } catch {
          markFailed(action.id);
        }
      }
    } finally {
      processingRef.current = false;
      setState((s) => ({ ...s, isProcessing: false }));
    }
  }, [dequeue, markFailed]);

  // Auto-process queue when coming online
  useEffect(() => {
    if (state.isOnline && state.pendingCount > 0) {
      const timer = setTimeout(processQueue, 1000);
      return () => clearTimeout(timer);
    }
  }, [state.isOnline, state.pendingCount, processQueue]);

  // Periodic sync check
  useEffect(() => {
    const interval = setInterval(() => {
      if (isOnline() && loadQueue().length > 0) {
        processQueue();
      }
    }, SYNC_INTERVAL);

    return () => clearInterval(interval);
  }, [processQueue]);

  return {
    ...state,
    enqueue,
    dequeue,
    clearQueue,
    processQueue,
    isOnline: () => navigator.onLine,
  };
}
```

## 8.3 localStorage Persistence for Board Data

```typescript
/**
 * boardPersistence.ts — Persist board data for offline access
 *
 * Saves board snapshot to localStorage for viewing when offline.
 */

import type { Board, Column, Card } from '../types/models';

const BOARD_SNAPSHOT_KEY = 'planka_board_snapshot';
const SNAPSHOT_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

interface BoardSnapshot {
  board: Board;
  columns: (Column & { cards: Card[] })[];
  fetchedAt: number;
}

export const boardPersistence = {
  /**
   * Save current board state to localStorage
   */
  save(boardId: string, board: Board, columns: (Column & { cards: Card[] })[]): void {
    const snapshot: BoardSnapshot = {
      board,
      columns,
      fetchedAt: Date.now(),
    };
    localStorage.setItem(`${BOARD_SNAPSHOT_KEY}_${boardId}`, JSON.stringify(snapshot));
    console.log('[Persistence] Board snapshot saved');
  },

  /**
   * Load board snapshot from localStorage
   */
  load(boardId: string): BoardSnapshot | null {
    try {
      const raw = localStorage.getItem(`${BOARD_SNAPSHOT_KEY}_${boardId}`);
      if (!raw) return null;

      const snapshot = JSON.parse(raw) as BoardSnapshot;

      // Check freshness
      const age = Date.now() - snapshot.fetchedAt;
      if (age > SNAPSHOT_MAX_AGE) {
        console.log('[Persistence] Snapshot expired');
        this.clear(boardId);
        return null;
      }

      console.log('[Persistence] Board snapshot loaded, age:', Math.round(age / 1000), 's');
      return snapshot;
    } catch {
      return null;
    }
  },

  /**
   * Clear stored snapshot
   */
  clear(boardId: string): void {
    localStorage.removeItem(`${BOARD_SNAPSHOT_KEY}_${boardId}`);
  },

  /**
   * Get all cached board IDs
   */
  getCachedBoardIds(): string[] {
    const ids: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(BOARD_SNAPSHOT_KEY + '_')) {
        ids.push(key.slice((BOARD_SNAPSHOT_KEY + '_').length));
      }
    }
    return ids;
  },

  /**
   * Clear all snapshots (logout cleanup)
   */
  clearAll(): void {
    const keys = this.getCachedBoardIds().map((id) => `${BOARD_SNAPSHOT_KEY}_${id}`);
    keys.forEach((key) => localStorage.removeItem(key));
  },
};
```

## 8.4 Optimistic Update Integration

```typescript
/**
 * Example: Card move with offline support
 *
 * This pattern combines optimistic UI, offline queuing, and rollback.
 */

import { useCallback } from 'react';
import { useKanbanStore } from '../stores/useKanbanStore';
import { useOfflineQueue } from './useOfflineQueue';
import { cardsApi } from '../api/cardsApi';

export function useSmartCardMove() {
  const {
    moveCard,
    moveCardOptimistic,
    rollbackCardMove,
    columns,
  } = useKanbanStore();
  const offlineQueue = useOfflineQueue();

  const moveCardWithOffline = useCallback(
    async (
      cardId: string,
      sourceColumnId: string,
      targetColumnId: string,
      newPosition: number
    ) => {
      // Save original state for rollback
      const card = columns
        .flatMap((c) => c.cards)
        .find((c) => c.id === cardId);
      const originalPosition = card?.position ?? 0;

      // 1. Optimistic UI update
      moveCard(cardId, sourceColumnId, targetColumnId, newPosition);

      // 2. Check if online
      if (!offlineQueue.isOnline) {
        // Queue the action for later
        offlineQueue.enqueue('card:move', {
          cardId,
          sourceColumnId,
          targetColumnId,
          position: newPosition,
        });
        return;
      }

      // 3. Online — make API call
      try {
        await cardsApi.move(cardId, {
          cardId,
          sourceListId: sourceColumnId,
          targetListId: targetColumnId,
          position: newPosition,
        });
      } catch {
        // API failed — rollback
        rollbackCardMove(cardId, sourceColumnId, originalPosition);

        // Queue for retry
        offlineQueue.enqueue('card:move', {
          cardId,
          sourceColumnId,
          targetColumnId,
          position: newPosition,
        });
      }
    },
    [columns, moveCard, moveCardOptimistic, rollbackCardMove, offlineQueue]
  );

  return { moveCard: moveCardWithOffline };
}
```

## 8.5 Conflict Resolution Strategy

```typescript
/**
 * conflictResolution.ts — Handle conflicts when reconnecting
 *
 * Strategy: Last-Write-Wins with merge for compatible changes.
 */

import type { Card, Column } from '../types/models';

interface Conflict<T> {
  local: T;
  server: T;
  field: string;
}

/**
 * Resolve conflicts between local state and server state.
 * For Planka Kanban, we use these rules:
 *
 * 1. Card position: server wins (WebSocket already updated)
 * 2. Card content (title, desc): most recent timestamp wins
 * 3. Labels/assignees: merge (union of both sets)
 * 4. Due date: most recent change wins
 */
export function resolveCardConflict(local: Card, server: Card): Card {
  // Compare update timestamps
  const localUpdated = new Date(local.updatedAt).getTime();
  const serverUpdated = new Date(server.updatedAt).getTime();

  return {
    ...server,
    // Content: use most recent
    name: localUpdated > serverUpdated ? local.name : server.name,
    description:
      localUpdated > serverUpdated ? local.description : server.description,
    // Labels: merge (union)
    labels: mergeArraysById(local.labels, server.labels),
    // Assignees: merge (union)
    assignees: mergeArraysById(local.assignees, server.assignees),
    // Position: server always wins (single source of truth for ordering)
    position: server.position,
    listId: server.listId,
  };
}

function mergeArraysById<T extends { id: string }>(a: T[], b: T[]): T[] {
  const map = new Map<string, T>();
  [...a, ...b].forEach((item) => {
    if (!map.has(item.id)) {
      map.set(item.id, item);
    }
  });
  return Array.from(map.values());
}

/**
 * Check if two cards have conflicting changes
 */
export function hasConflict(local: Card, server: Card): boolean {
  if (local.updatedAt === server.updatedAt) return false;

  const localUpdated = new Date(local.updatedAt).getTime();
  const serverUpdated = new Date(server.updatedAt).getTime();

  // If local is newer, no conflict from our perspective
  // (but server may have different data)
  if (localUpdated > serverUpdated) return false;

  // Server is newer — check if we made changes
  return (
    local.name !== server.name ||
    local.description !== server.description ||
    local.dueDate !== server.dueDate ||
    local.dueComplete !== server.dueComplete
  );
}
```

## 8.6 Service Worker for Offline Support (Optional)

```typescript
/**
 * sw.ts — Service Worker for caching static assets
 *
 * Provides offline access to the app shell.
 * Place in public/sw.js for Create React App,
 * or use Vite PWA plugin.
 */

const CACHE_NAME = 'planka-liff-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/assets/index.js',
  '/assets/index.css',
];

// Install: cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch: serve from cache when offline
self.addEventListener('fetch', (event) => {
  // Only handle GET requests for static assets
  if (event.request.method !== 'GET') return;
  if (event.request.url.includes('/api/')) return; // Don't cache API calls

  event.respondWith(
    caches.match(event.request).then((cached) => {
      // Return cached version or fetch from network
      return cached || fetch(event.request);
    })
  );
});
```


---

# 9. Environment Configuration

## 9.1 `.env` Template

```bash
# ═══════════════════════════════════════════════════════════
# Planka LIFF App — Environment Configuration
# Copy to .env.local and fill in your values
# ═══════════════════════════════════════════════════════════

# ── LIFF Configuration ───────────────────────────────────
# Your LIFF ID from LINE Developers Console
# Format: 1234567890-AbCdEfGh (16 digits + 8 chars)
REACT_APP_LIFF_ID=your-liff-id-here

# Enable LIFF mock mode for browser development
# Set to 'true' when developing outside LINE app
REACT_APP_LIFF_MOCK=false

# ── Backend API Configuration ────────────────────────────
# Your self-hosted Planka instance
REACT_APP_API_BASE_URL=https://your-planka-domain.com

# WebSocket URL (usually same domain with wss:// protocol)
REACT_APP_WS_URL=wss://your-planka-domain.com

# API version
REACT_APP_API_VERSION=v1

# ── Feature Flags ────────────────────────────────────────
# Enable offline mode with action queue
REACT_APP_ENABLE_OFFLINE=true

# Enable WebSocket real-time sync
REACT_APP_ENABLE_WEBSOCKET=true

# Enable service worker for offline app shell
REACT_APP_ENABLE_PWA=false

# Show debug logs in console
REACT_APP_DEBUG=false

# ── Analytics (Optional) ─────────────────────────────────
# Google Analytics 4 Measurement ID (optional)
# REACT_APP_GA_ID=G-XXXXXXXXXX

# Sentry DSN for error tracking (optional)
# REACT_APP_SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx

# ── App Settings ─────────────────────────────────────────
# App name shown in UI
REACT_APP_APP_NAME=Planka Boards

# Maximum cards to show per column before "Load more"
REACT_APP_MAX_CARDS_PER_COLUMN=50

# Default card color palette
REACT_APP_LABEL_COLORS=#06C755,#00B900,#4A90D9,#E02020,#FAAD14,#EB2F96,#722ED1,#13C2C2
```

## 9.2 Runtime Config (`src/lib/config.ts`)

```typescript
/**
 * config.ts — Runtime configuration resolver
 *
 * Reads environment variables with fallbacks.
 * All REACT_APP_ prefixed env vars are available here.
 */

interface AppConfig {
  // LIFF
  liffId: string;
  liffMock: boolean;

  // API
  apiBaseUrl: string;
  wsUrl: string;
  apiVersion: string;

  // Features
  enableOffline: boolean;
  enableWebSocket: boolean;
  enablePWA: boolean;
  debug: boolean;

  // App
  appName: string;
  maxCardsPerColumn: number;
  labelColors: string[];
}

function getEnv(key: string, defaultValue: string = ''): string {
  const value = import.meta.env[key];
  return value !== undefined ? value : defaultValue;
}

function getBoolEnv(key: string, defaultValue: boolean = false): boolean {
  const value = import.meta.env[key];
  if (value === undefined) return defaultValue;
  return value === 'true' || value === '1';
}

function getNumberEnv(key: string, defaultValue: number): number {
  const value = import.meta.env[key];
  if (value === undefined) return defaultValue;
  const parsed = Number(value);
  return isNaN(parsed) ? defaultValue : parsed;
}

// LIFF ID validation
function validateLiffId(id: string): string {
  // LIFF IDs follow pattern: 1234567890-AbCdEfGh
  const pattern = /^\d{10,}-[A-Za-z0-9]+$/;
  if (id && !pattern.test(id)) {
    console.warn(
      `[Config] LIFF ID "${id}" doesn't match expected format. ` +
        'Expected: 1234567890-AbCdEfGh (10+ digits, hyphen, alphanumeric)'
    );
  }
  return id;
}

// Config singleton
export const config: AppConfig = {
  // LIFF
  liffId: validateLiffId(getEnv('VITE_LIFF_ID', getEnv('REACT_APP_LIFF_ID', ''))),
  liffMock: getBoolEnv('VITE_LIFF_MOCK', getBoolEnv('REACT_APP_LIFF_MOCK', false)),

  // API
  apiBaseUrl: getEnv('VITE_API_BASE_URL', getEnv('REACT_APP_API_BASE_URL', 'https://localhost:3000')),
  wsUrl: getEnv('VITE_WS_URL', getEnv('REACT_APP_WS_URL', 'wss://localhost:3000')),
  apiVersion: getEnv('VITE_API_VERSION', getEnv('REACT_APP_API_VERSION', 'v1')),

  // Features
  enableOffline: getBoolEnv('VITE_ENABLE_OFFLINE', getBoolEnv('REACT_APP_ENABLE_OFFLINE', true)),
  enableWebSocket: getBoolEnv('VITE_ENABLE_WEBSOCKET', getBoolEnv('REACT_APP_ENABLE_WEBSOCKET', true)),
  enablePWA: getBoolEnv('VITE_ENABLE_PWA', getBoolEnv('REACT_APP_ENABLE_PWA', false)),
  debug: getBoolEnv('VITE_DEBUG', getBoolEnv('REACT_APP_DEBUG', false)),

  // App
  appName: getEnv('VITE_APP_NAME', getEnv('REACT_APP_APP_NAME', 'Planka Boards')),
  maxCardsPerColumn: getNumberEnv('VITE_MAX_CARDS_PER_COLUMN', getNumberEnv('REACT_APP_MAX_CARDS_PER_COLUMN', 50)),
  labelColors: getEnv('VITE_LABEL_COLORS', getEnv('REACT_APP_LABEL_COLORS',
    '#06C755,#00B900,#4A90D9,#E02020,#FAAD14,#EB2F96,#722ED1,#13C2C2'
  )).split(','),
};

// Debug logging
if (config.debug) {
  console.log('[Config] Loaded configuration:', {
    ...config,
    liffId: config.liffId ? `${config.liffId.slice(0, 5)}...` : 'NOT SET',
  });
}

// Validation on startup
export function validateConfig(): string[] {
  const errors: string[] = [];

  if (!config.liffId) {
    errors.push('LIFF ID is not set. Add VITE_LIFF_ID to your .env file.');
  }

  if (!config.apiBaseUrl) {
    errors.push('API base URL is not set. Add VITE_API_BASE_URL to your .env file.');
  }

  if (!config.wsUrl) {
    errors.push('WebSocket URL is not set. Add VITE_WS_URL to your .env file.');
  }

  return errors;
}
```

## 9.3 Constants (`src/lib/constants.ts`)

```typescript
/**
 * constants.ts — Application-wide constants
 */

// LINE Brand Colors
export const LINE_COLORS = {
  primary: '#06C755',
  primaryDark: '#05a347',
  primaryLight: '#e8f5e9',
  text: '#1E1E1E',
  textSecondary: '#666666',
  background: '#F5F5F5',
  white: '#FFFFFF',
  error: '#E02020',
  warning: '#FAAD14',
  success: '#06C755',
  info: '#4A90D9',
} as const;

// Kanban-specific constants
export const KANBAN = {
  columnWidth: 280,
  columnWidthMobile: '85vw',
  cardMinHeight: 40,
  maxColumnsVisible: 4,
  snapScrollThreshold: 50, // px
} as const;

// Drag and Drop
export const DND = {
  touchDelay: 200,       // ms before drag starts on touch
  touchTolerance: 8,     // px movement allowed during touch delay
  pointerDistance: 5,    // px movement before drag starts on pointer
  dropAnimationDuration: 150, // ms
} as const;

// API
export const API = {
  timeout: 30000,        // ms
  retryAttempts: 3,
  retryBaseDelay: 1000,  // ms
  tokenExpiryBuffer: 300000, // Refresh 5 min before expiry (ms)
} as const;

// Timing
export const TIMING = {
  debounceMs: 300,
  toastDuration: 3000,
  skeletonDelay: 200,
  longPressDelay: 500,
  pullToRefreshThreshold: 80,
  offlineQueueSyncInterval: 5000,
} as const;

// Storage keys
export const STORAGE_KEYS = {
  auth: 'planka_auth',
  offlineQueue: 'planka_offline_queue',
  boardSnapshot: 'planka_board_snapshot',
  authStore: 'auth-store',
  settings: 'planka_settings',
} as const;

// Default label colors (Planka-compatible)
export const DEFAULT_LABEL_COLORS = [
  { name: 'Green', hex: '#06C755' },
  { name: 'Blue', hex: '#4A90D9' },
  { name: 'Red', hex: '#E02020' },
  { name: 'Yellow', hex: '#FAAD14' },
  { name: 'Purple', hex: '#722ED1' },
  { name: 'Pink', hex: '#EB2F96' },
  { name: 'Cyan', hex: '#13C2C2' },
  { name: 'Gray', hex: '#8C8C8C' },
] as const;
```

## 9.4 Utility Functions (`src/lib/utils.ts`)

```typescript
/**
 * utils.ts — General utility functions
 */

import { format, isToday, isTomorrow, isPast, differenceInDays } from 'date-fns';

/**
 * Format a due date for display
 */
export function formatDueDate(dateStr: string | undefined): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  if (differenceInDays(date, new Date()) < 7) return format(date, 'EEEE'); // Day name
  return format(date, 'MMM d');
}

/**
 * Get CSS class for due date badge
 */
export function getDueDateClass(dateStr: string | undefined, isComplete: boolean): string {
  if (!dateStr || isComplete) return 'text-gray-400 bg-gray-100';
  const date = new Date(dateStr);
  if (isPast(date) && !isToday(date)) return 'text-red-600 bg-red-50';
  if (isToday(date)) return 'text-orange-600 bg-orange-50';
  if (isTomorrow(date)) return 'text-yellow-600 bg-yellow-50';
  return 'text-gray-500 bg-gray-100';
}

/**
 * Generate a temporary ID for optimistic updates
 */
export function tempId(): string {
  return `temp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Check if an ID is a temporary (optimistic) ID
 */
export function isTempId(id: string): boolean {
  return id.startsWith('temp-');
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: Parameters<T>) => ReturnType<T>>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Throttle function
 */
export function throttle<T extends (...args: Parameters<T>) => ReturnType<T>>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  return (...args) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => { inThrottle = false; }, limit);
    }
  };
}

/**
 * Truncate text with ellipsis
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + '...';
}

/**
 * Get initials from name
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    return success;
  }
}

/**
 * Check if device is iOS
 */
export function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

/**
 * Check if device is Android
 */
export function isAndroid(): boolean {
  return /Android/.test(navigator.userAgent);
}

/**
 * Check if running in LINE app
 */
export function isInLineApp(): boolean {
  return /Line/.test(navigator.userAgent);
}
```

## 9.5 Tailwind Config

```javascript
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        line: {
          green: '#06C755',
          'green-dark': '#05a347',
          'green-light': '#e8f5e9',
          black: '#1E1E1E',
          gray: '#F5F5F5',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'Helvetica',
          'Arial',
          'sans-serif',
        ],
      },
      spacing: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)',
      },
      animation: {
        'slide-up': 'slideUp 0.2s ease-out',
        'slide-down': 'slideDown 0.2s ease-out',
        'fade-in': 'fadeIn 0.15s ease-out',
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { transform: 'translateY(0)' },
          '100%': { transform: 'translateY(100%)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [
    // Hide scrollbar utility
    function ({ addUtilities }) {
      addUtilities({
        '.scrollbar-hide': {
          '-ms-overflow-style': 'none',
          'scrollbar-width': 'none',
          '&::-webkit-scrollbar': {
            display: 'none',
          },
        },
      });
    },
  ],
};
```

## 9.6 Shared Components

### Avatar (`src/components/common/Avatar.tsx`)

```typescript
/**
 * Avatar — User avatar with fallback to initials
 */

import React from 'react';
import { getInitials } from '../../lib/utils';

interface AvatarProps {
  src?: string;
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap = {
  xs: 'h-5 w-5 text-[8px]',
  sm: 'h-7 w-7 text-[10px]',
  md: 'h-10 w-10 text-xs',
  lg: 'h-14 w-14 text-sm',
};

export function Avatar({ src, name, size = 'md', className = '' }: AvatarProps) {
  const sizeClass = sizeMap[size];

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`${sizeClass} rounded-full object-cover ${className}`}
        loading="lazy"
        onError={(e) => {
          // Fallback on error
          (e.target as HTMLImageElement).style.display = 'none';
          const parent = (e.target as HTMLImageElement).parentElement;
          if (parent) {
            parent.innerHTML = `<div class="${sizeClass} flex items-center justify-center rounded-full bg-gray-200 text-gray-500 font-medium ${className}">${getInitials(name)}</div>`;
          }
        }}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-gray-200 to-gray-300 text-gray-600 font-medium ${className}`}
    >
      {getInitials(name)}
    </div>
  );
}
```

### Spinner (`src/components/common/Spinner.tsx`)

```typescript
/**
 * Spinner — Loading indicator
 */

import React from 'react';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap = {
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-3',
  lg: 'h-12 w-12 border-4',
};

export function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  return (
    <div
      className={`animate-spin rounded-full border-current border-t-transparent ${sizeMap[size]} ${className}`}
    />
  );
}
```

### Toast (`src/components/common/Toast.tsx`)

```typescript
/**
 * Toast — Notification component with auto-dismiss
 */

import React, { useEffect } from 'react';
import { CheckCircle, AlertCircle, X, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose: () => void;
}

const typeConfig: Record<ToastType, { icon: React.ElementType; bg: string; text: string; border: string }> = {
  success: { icon: CheckCircle, bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  error: { icon: AlertCircle, bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  warning: { icon: AlertCircle, bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
  info: { icon: Info, bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
};

export function Toast({ message, type = 'info', duration = 3000, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const config = typeConfig[type];
  const Icon = config.icon;

  return (
    <div
      className={`animate-slide-up fixed bottom-4 left-4 right-4 z-[70] flex items-center gap-3 rounded-xl border ${config.border} ${config.bg} p-4 shadow-lg sm:left-auto sm:right-4 sm:max-w-sm`}
      role="alert"
    >
      <Icon size={20} className={`shrink-0 ${config.text}`} />
      <p className={`flex-1 text-sm ${config.text}`}>{message}</p>
      <button onClick={onClose} className="shrink-0 text-gray-400 hover:text-gray-600">
        <X size={16} />
      </button>
    </div>
  );
}
```

---

# 10. Build & Deploy Guide

## 10.1 Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 18+ | Runtime |
| npm/yarn/pnpm | latest | Package manager |
| Git | latest | Version control |
| LINE Developer Account | - | LIFF app registration |
| Planka Backend | 1.0+ | API server |

## 10.2 Project Initialization

```bash
# ═══════════════════════════════════════════════════════════
# Step 1: Create Vite + React + TypeScript project
# ═══════════════════════════════════════════════════════════

npm create vite@latest planka-liff-app -- --template react-ts
cd planka-liff-app

# Install core dependencies
npm install \
  react@18 \
  react-dom@18 \
  react-router-dom@6 \
  @line/liff@2.26 \
  axios \
  zustand \
  @dnd-kit/core \
  @dnd-kit/sortable \
  @dnd-kit/utilities \
  @dnd-kit/modifiers \
  react-hook-form \
  @hookform/resolvers \
  zod \
  date-fns \
  lucide-react \
  clsx \
  tailwind-merge

# Install dev dependencies
npm install -D \
  typescript \
  vite \
  @vitejs/plugin-react \
  tailwindcss \
  postcss \
  autoprefixer \
  @types/react \
  @types/react-dom \
  vitest \
  @testing-library/react \
  @testing-library/jest-dom \
  @testing-library/user-event

# Initialize Tailwind CSS
npx tailwindcss init -p
```

## 10.3 Vite Configuration

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  // LIFF apps don't need SPA fallback — serve index.html for all routes
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate vendor chunks for better caching
          vendor: ['react', 'react-dom', 'react-router-dom'],
          liff: ['@line/liff'],
          dnd: ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
        },
      },
    },
  },
  server: {
    port: 5173,
    host: true, // Allow external access (for ngrok)
  },
  // Define env variable prefix for Vite
  envPrefix: 'VITE_',
});
```

## 10.4 Entry Point Files

```html
<!-- index.html -->
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="theme-color" content="#06C755" />
    <meta name="description" content="Planka Kanban Boards for LINE" />
    <title>Planka Boards</title>
    <!-- Preconnect to API domain -->
    <link rel="preconnect" href="%VITE_API_BASE_URL%" />
  </head>
  <body class="bg-gray-50">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

```typescript
// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

// Setup auth interceptors before rendering
import { setupAuthInterceptors } from './services/authService';
setupAuthInterceptors();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
```

```typescript
// src/App.tsx
import { Routes, Route } from 'react-router-dom';
import { LiffProvider } from './modules/liff/LiffProvider';
import { AuthGuard } from './components/layout/AuthGuard';
import { SplashPage } from './pages/SplashPage';
import { BoardsListPage } from './pages/BoardsListPage';
import { BoardDetailPage } from './pages/BoardDetailPage';
import { config, validateConfig } from './lib/config';
import type { LineProfile } from './modules/liff/liff';

// Validate config on startup
const configErrors = validateConfig();
if (configErrors.length > 0) {
  console.error('Configuration errors:', configErrors);
}

// LIFF configuration
const liffConfig = {
  liffId: config.liffId,
  mock: config.liffMock,
  mockProfile: config.liffMock
    ? {
        userId: 'mock-user-id',
        displayName: 'Mock User',
        pictureUrl: undefined,
        statusMessage: 'Testing',
      }
    : undefined,
};

function App() {
  return (
    <LiffProvider config={liffConfig}>
      <AuthGuard>
        <Routes>
          <Route path="/" element={<SplashPage />} />
          <Route path="/boards" element={<BoardsListPage />} />
          <Route path="/boards/:boardId" element={<BoardDetailPage />} />
        </Routes>
      </AuthGuard>
    </LiffProvider>
  );
}

export default App;
```

```css
/* src/index.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Global styles */
* {
  -webkit-tap-highlight-color: transparent;
}

html {
  height: 100%;
  overflow: hidden; /* Prevent body scroll, handle in components */
}

body {
  height: 100%;
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  overscroll-behavior-y: none; /* Prevent pull-to-refresh on body */
}

#root {
  height: 100%;
}

/* iOS safe area support */
@supports (padding: max(0px)) {
  .safe-area-top {
    padding-top: max(0px, env(safe-area-inset-top));
  }
  .safe-area-bottom {
    padding-bottom: max(0px, env(safe-area-inset-bottom));
  }
}

/* Hide scrollbar but allow scrolling */
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}

/* Touch action optimization */
.touch-pan-x {
  touch-action: pan-x;
}
.touch-pan-y {
  touch-action: pan-y;
}
.touch-none {
  touch-action: none;
}

/* Prevent text selection during drag */
.select-none {
  -webkit-user-select: none;
  user-select: none;
}

/* Smooth scrolling */
.smooth-scroll {
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
}
```

## 10.5 Local Development Setup

```bash
# ═══════════════════════════════════════════════════════════
# Step 1: Configure environment
# ═══════════════════════════════════════════════════════════

cp .env .env.local
# Edit .env.local with your values

# ═══════════════════════════════════════════════════════════
# Step 2: Start development server
# ═══════════════════════════════════════════════════════════

npm run dev

# ═══════════════════════════════════════════════════════════
# Step 3: Expose via ngrok (required for LIFF testing)
# ═══════════════════════════════════════════════════════════

# Install ngrok if needed
# npm install -g ngrok

# Start ngrok tunnel to your dev server
ngrok http 5173

# ngrok will output:
# Forwarding  https://xxxx.ngrok-free.app -> http://localhost:5173
#                                                    ^^^^
#                                         Copy this URL

# ═══════════════════════════════════════════════════════════
# Step 4: Configure LIFF endpoint
# ═══════════════════════════════════════════════════════════

# 1. Go to https://developers.line.biz/console
# 2. Select your provider and channel
# 3. Go to "LIFF" tab
# 4. Edit your LIFF app
# 5. Set "Endpoint URL" to: https://xxxx.ngrok-free.app
# 6. Save
# 7. Set "LIFF ID" in your .env.local

# ═══════════════════════════════════════════════════════════
# Step 5: Test in LINE app
# ═══════════════════════════════════════════════════════════

# Method 1: Scan QR code from LINE console
# Method 2: Send LIFF URL to yourself in LINE chat
# Method 3: Use LINE Simulator (limited)

# LIFF URL format:
# https://liff.line.me/1234567890-AbCdEfGh
#                          ^^^^
#                      Your LIFF ID

# ═══════════════════════════════════════════════════════════
# Step 6: Enable LIFF mock mode for browser testing
# ═══════════════════════════════════════════════════════════

# In .env.local:
# VITE_LIFF_MOCK=true

# This allows testing in regular browser without LINE app
```

## 10.6 Build for Production

```bash
# ═══════════════════════════════════════════════════════════
# Production Build
# ═══════════════════════════════════════════════════════════

# Set production environment variables
export VITE_LIFF_ID=your-production-liff-id
export VITE_API_BASE_URL=https://your-planka-domain.com
export VITE_WS_URL=wss://your-planka-domain.com
export VITE_LIFF_MOCK=false

# Build
npm run build

# Output: dist/ directory with:
#   dist/index.html
#   dist/assets/index-xxx.js
#   dist/assets/index-xxx.css

# Preview build locally
npm run preview

# Verify build output
ls -la dist/
```

## 10.7 Deploy to Vercel

```bash
# ═══════════════════════════════════════════════════════════
# Deploy to Vercel (Recommended)
# ═══════════════════════════════════════════════════════════

# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod

# Follow prompts:
# - Set up and deploy? [Y/n] → Y
# - Which scope? → Your account
# - Link to existing project? → N (first time)
# - What's your project name? → planka-liff-app

# After deployment, set environment variables:
vercel env add VITE_LIFF_ID
vercel env add VITE_API_BASE_URL
vercel env add VITE_WS_URL

# Redeploy to apply env vars
vercel --prod

# ═══════════════════════════════════════════════════════════
# Configure vercel.json for SPA routing
# ═══════════════════════════════════════════════════════════
```

```json
// vercel.json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Access-Control-Allow-Origin",
          "value": "*"
        },
        {
          "key": "Access-Control-Allow-Methods",
          "value": "GET, POST, PUT, DELETE, PATCH, OPTIONS"
        },
        {
          "key": "Access-Control-Allow-Headers",
          "value": "Content-Type, Authorization, X-LIFF-Version, X-Request-Time"
        }
      ]
    }
  ]
}
```

## 10.8 Deploy to Netlify

```bash
# ═══════════════════════════════════════════════════════════
# Deploy to Netlify
# ═══════════════════════════════════════════════════════════

# Install Netlify CLI
npm i -g netlify-cli

# Login
netlify login

# Deploy
netlify deploy --prod --dir=dist

# Set environment variables
netlify env:set VITE_LIFF_ID your-liff-id
netlify env:set VITE_API_BASE_URL https://your-planka-domain.com

# Configure _redirects for SPA routing
echo '/* /index.html 200' > dist/_redirects
```

## 10.9 Update LIFF Endpoint URL

After deploying, update your LIFF app endpoint URL:

| Platform | URL Pattern |
|----------|-------------|
| Vercel | `https://planka-liff-app.vercel.app` |
| Netlify | `https://planka-liff-app.netlify.app` |
| Custom | `https://liff.your-domain.com` |

**Steps:**
1. Visit [LINE Developers Console](https://developers.line.biz/console)
2. Select your channel
3. Go to **LIFF** tab
4. Click **Edit** on your LIFF app
5. Update **Endpoint URL** to your deployed URL
6. Verify the URL uses **HTTPS** (required by LIFF)
7. Save changes
8. Test by opening `https://liff.line.me/{YOUR_LIFF_ID}` in LINE app

## 10.10 Testing Checklist

```markdown
## Pre-Deployment Testing

### Browser Testing (Mock Mode)
- [ ] App loads without errors
- [ ] Board list displays correctly
- [ ] Kanban board renders with columns and cards
- [ ] Horizontal scrolling works smoothly
- [ ] Card drag-and-drop functions
- [ ] Column reordering works
- [ ] Card detail modal opens/closes
- [ ] Forms (create/edit card) work
- [ ] Pull-to-refresh triggers correctly

### LINE App Testing
- [ ] LIFF initialization succeeds
- [ ] Auto-login works (redirects to LINE login)
- [ ] Profile data loads correctly
- [ ] Backend token exchange succeeds
- [ ] All API calls include Bearer token
- [ ] WebSocket connects and receives events
- [ ] shareTargetPicker works for sharing
- [ ] closeWindow() closes the LIFF app
- [ ] Bottom sheet UX feels native

### Mobile-Specific Testing
- [ ] Touch drag-and-drop doesn't interfere with scroll
- [ ] Long-press context menu appears
- [ ] Column switcher FAB works on small screens
- [ ] Safe area insets handled (notch phones)
- [ ] No horizontal body scroll
- [ ] Keyboard doesn't break layout (input focus)
- [ ] 60fps during card dragging

### Offline Testing
- [ ] Queue actions when offline
- [ ] Display cached board data
- [ ] Sync queue on reconnect
- [ ] Conflict resolution works

### Production Testing
- [ ] Environment variables loaded correctly
- [ ] HTTPS enforced
- [ ] CORS headers present
- [ ] Build output optimized (< 500KB JS)
- [ ] No console errors in production
```

## 10.11 Package.json Scripts

```json
{
  "name": "planka-liff-app",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --host",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "lint:fix": "eslint . --ext ts,tsx --fix",
    "typecheck": "tsc --noEmit",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage",
    "format": "prettier --write \"src/**/*.{ts,tsx,css}\""
  },
  "dependencies": {
    "@dnd-kit/core": "^6.1.0",
    "@dnd-kit/modifiers": "^7.0.0",
    "@dnd-kit/sortable": "^8.0.0",
    "@dnd-kit/utilities": "^3.2.2",
    "@hookform/resolvers": "^3.3.4",
    "@line/liff": "^2.26.0",
    "axios": "^1.7.0",
    "clsx": "^2.1.0",
    "date-fns": "^3.6.0",
    "lucide-react": "^0.400.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-hook-form": "^7.51.0",
    "react-router-dom": "^6.23.0",
    "tailwind-merge": "^2.3.0",
    "zod": "^3.23.0",
    "zustand": "^4.5.0"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.4.0",
    "@testing-library/react": "^15.0.0",
    "@testing-library/user-event": "^14.5.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@typescript-eslint/eslint-plugin": "^7.8.0",
    "@typescript-eslint/parser": "^7.8.0",
    "@vitejs/plugin-react": "^4.2.0",
    "autoprefixer": "^10.4.0",
    "eslint": "^8.57.0",
    "eslint-plugin-react-hooks": "^4.6.0",
    "eslint-plugin-react-refresh": "^0.4.0",
    "jsdom": "^24.0.0",
    "postcss": "^8.4.0",
    "prettier": "^3.2.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.4.0",
    "vite": "^5.2.0",
    "vitest": "^1.6.0"
  }
}
```

## 10.12 File Reference Summary

```
planka-liff-app/
├── .env                          # Environment template
├── .env.local                    # Local secrets (gitignored)
├── .eslintrc.cjs                 # ESLint config
├── .prettierrc                   # Prettier config
├── index.html                    # HTML entry point
├── package.json                  # Dependencies & scripts
├── postcss.config.js             # PostCSS config
├── tailwind.config.js            # Tailwind config
├── tsconfig.json                 # TypeScript config
├── vercel.json                   # Vercel deployment config
├── vite.config.ts                # Vite build config
│
└── src/
    ├── main.tsx                  # App entry point
    ├── App.tsx                   # Root component with routing
    ├── index.css                 # Global styles + Tailwind
    │
    ├── types/
    │   └── models.ts             # All TypeScript interfaces
    │
    ├── lib/
    │   ├── config.ts             # Runtime config
    │   ├── constants.ts          # App constants
    │   ├── utils.ts              # Utility functions
    │   └── cn.ts                 # Tailwind class merge
    │
    ├── modules/
    │   └── liff/
    │       ├── liff.ts           # LIFF SDK wrapper
    │       ├── LiffProvider.tsx   # React context provider
    │       └── useLiff.ts        # Convenience hook
    │
    ├── services/
    │   ├── authService.ts        # Auth flow logic
    │   ├── apiClient.ts          # Axios with interceptors
    │   └── websocketService.ts   # WS connection manager
    │
    ├── stores/
    │   ├── useAuthStore.ts       # Auth Zustand store
    │   └── useKanbanStore.ts     # Kanban Zustand store
    │
    ├── api/
    │   ├── boardsApi.ts          # Board CRUD
    │   ├── columnsApi.ts         # Column CRUD
    │   ├── cardsApi.ts           # Card CRUD + move
    │   ├── labelsApi.ts          # Label CRUD
    │   └── membersApi.ts         # Member management
    │
    ├── hooks/
    │   ├── useAuth.ts            # Auth hook
    │   ├── useBoard.ts           # Board data hook
    │   ├── useWebSocket.ts       # Real-time sync hook
    │   ├── useDragAndDrop.ts     # DnD sensors config
    │   ├── usePullToRefresh.ts   # Pull-to-refresh
    │   ├── useLongPress.ts       # Long-press detection
    │   ├── useOfflineQueue.ts    # Offline action queue
    │   ├── useOptimisticUpdate.ts # Optimistic updates
    │   └── useDebounce.ts        # Debounce utility
    │
    ├── pages/
    │   ├── SplashPage.tsx        # Loading + auth
    │   ├── BoardsListPage.tsx    # Board grid
    │   └── BoardDetailPage.tsx   # Kanban board
    │
    └── components/
        ├── common/
        │   ├── Button.tsx
        │   ├── Input.tsx
        │   ├── Avatar.tsx
        │   ├── Skeleton.tsx
        │   ├── Spinner.tsx
        │   └── Toast.tsx
        ├── layout/
        │   ├── AuthGuard.tsx
        │   └── KanbanLayout.tsx
        ├── kanban/
        │   ├── BoardHeader.tsx
        │   ├── ColumnsContainer.tsx
        │   ├── Column.tsx
        │   ├── ColumnHeader.tsx
        │   ├── CardsContainer.tsx
        │   ├── Card.tsx
        │   ├── CardLabels.tsx
        │   ├── AddColumnButton.tsx
        │   ├── AddCardButton.tsx
        │   └── ColumnSwitcher.tsx
        └── card-detail/
            ├── CardDetailModal.tsx
            ├── CardForm.tsx
            ├── LabelPicker.tsx
            ├── AssigneePicker.tsx
            └── DueDatePicker.tsx
```

---

# Appendix A: CORS Configuration (Planka Backend)

Your Planka backend must be configured to accept requests from your LIFF app domain:

```javascript
// Example: sails.js CORS config (Planka uses Sails)
// config/cors.js or config/security.js
module.exports.security = {
  cors: {
    allRoutes: true,
    allowOrigins: [
      'https://your-liff-app.vercel.app',
      'https://your-liff-app.netlify.app',
      'https://liff.line.me',
      'http://localhost:5173',  // Dev only
    ],
    allowCredentials: false,
    allowRequestHeaders: 'Content-Type, Authorization, X-LIFF-Version, X-Request-Time',
    allowRequestMethods: 'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD',
  },
};
```

# Appendix B: Planka API Authentication Endpoint

Your Planka backend needs an endpoint to exchange LINE ID tokens:

```javascript
// POST /api/auth/line
// Request: { idToken: string }
// Response: { accessToken, refreshToken, expiresIn, user }

async function lineAuth(req, res) {
  const { idToken } = req.body;

  // 1. Verify LINE ID token with LINE API
  const lineResponse = await fetch(
    `https://api.line.me/oauth2/v2.1/verify?id_token=${idToken}&client_id=${LINE_CHANNEL_ID}`
  );
  const lineProfile = await lineResponse.json();

  // 2. Find or create user in Planka
  let user = await User.findOne({ lineUserId: lineProfile.sub });
  if (!user) {
    user = await User.create({
      lineUserId: lineProfile.sub,
      name: lineProfile.name,
      email: lineProfile.email,
      avatarUrl: lineProfile.picture,
    });
  }

  // 3. Generate Planka JWT
  const accessToken = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '1h' });
  const refreshToken = jwt.sign({ userId: user.id }, JWT_REFRESH_SECRET, { expiresIn: '7d' });

  res.json({
    accessToken,
    refreshToken,
    expiresIn: 3600,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
    },
  });
}
```

# Appendix C: LIFF App Configuration Reference

| Setting | Value | Notes |
|---------|-------|-------|
| LIFF ID | `1234567890-AbCdEfGh` | From LINE console |
| Size | **Full** | Kanban needs full screen |
| Endpoint URL | `https://your-app.vercel.app` | Must be HTTPS |
| Module mode | ON | Pluggable SDK |
| Scan QR | Optional | For quick board access |
| Bluetooth | OFF | Not needed |

# Appendix D: Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| `LIFF ID not found` | Wrong LIFF ID | Check LINE console for correct ID |
| `Invalid redirect_uri` | Endpoint URL mismatch | Ensure LIFF endpoint URL matches deployment |
| `CORS error` | Backend not configured | Add LIFF domain to Planka CORS allowlist |
| `Token exchange 401` | Backend can't verify token | Check LINE channel ID on backend |
| `WebSocket disconnects` | Auth token expired | Implement token refresh before WS connect |
| `Cards won't drag` | DnD sensors not configured | Verify TouchSensor with delay is set |
| `Horizontal scroll broken` | CSS conflict | Check `touch-action` and `-webkit-overflow-scrolling` |
| `Keyboard pushes UI up` | Viewport meta | Ensure `maximum-scale=1, user-scalable=no` |
| `LIFF not closing` | Not in LINE client | Check `liff.isInClient()` before `closeWindow()` |

---

*This guide provides a complete foundation for building a LINE Mini App with Planka Kanban integration. Customize the UI components, add additional features (notifications, search, filters), and extend the API layer as your project grows.*

**Built with**: React 18 + TypeScript + Vite + Tailwind CSS + LIFF SDK v2.26 + @dnd-kit + Zustand + Axios
