import React, { useEffect, useRef, useState } from 'react';
import {
  Landmark,
  Compass,
  Sparkles,
  Music,
  Layers,
  FolderHeart,
  Clock,
  Search,
  MapPin,
  Users,
  Settings,
  ShieldCheck,
  HelpCircle,
  Plus,
  X,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  Download,
  Check,
  BookOpen,
  User,
  Eye,
  EyeOff,
  LogOut,
  LogIn,
  UserPlus,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import {
  ActiveNavTab,
  Collection,
  Floor,
  Memory,
  MuseumSettings,
  MuseumUserAccount,
  Room,
  WallFeatureId,
} from '../types/museum';
import { BRAND, resolveMuseumDisplayName } from '../config/brand';

/**
 * Ordered Interactive Feature Wall items (1..9) opposite the rooms on every floor.
 */
export const WALL_MENU_ITEMS: {
  id: WallFeatureId;
  numberLabel: string;
  title: string;
  shortTitle: string;
  subtitle: string;
  accentHex: string;
}[] = [
  {
    id: 'music_playlists',
    numberLabel: '01',
    title: 'Music & Playlists',
    shortTitle: 'Music & Playlists',
    subtitle: 'Spotify, YouTube & room soundscapes',
    accentHex: '#1DB954',
  },
  {
    id: 'museum_settings',
    numberLabel: '02',
    title: 'Museum Settings',
    shortTitle: 'Museum Settings',
    subtitle: 'Project name, camera sensitivity & tips',
    accentHex: '#D6A15D',
  },
  {
    id: 'floor_navigation',
    numberLabel: '03',
    title: 'Floor Navigation',
    shortTitle: 'Floor Navigation',
    subtitle: 'Current floor & animated elevator travel',
    accentHex: '#E0A96D',
  },
  {
    id: 'my_rooms',
    numberLabel: '04',
    title: 'My Rooms',
    shortTitle: 'My Rooms',
    subtitle: '4 room slots per floor & Smart Add Room',
    accentHex: '#C87D55',
  },
  {
    id: 'memories',
    numberLabel: '05',
    title: 'Memories',
    shortTitle: 'Memories',
    subtitle: 'Upload, search & organize personal exhibits',
    accentHex: '#D49B6A',
  },
  {
    id: 'ai_studio',
    numberLabel: '06',
    title: 'AI Studio',
    shortTitle: 'AI Studio',
    subtitle: 'AI Curator, Image, Film & 3D Room Designer',
    accentHex: '#B8860B',
  },
  {
    id: 'collections_timeline',
    numberLabel: '07',
    title: 'Collections & Timeline',
    shortTitle: 'Collections & Timeline',
    subtitle: 'Curated anthologies & chronological history',
    accentHex: '#87977C',
  },
  {
    id: 'profile_privacy',
    numberLabel: '08',
    title: 'Profile & Privacy',
    shortTitle: 'Profile & Privacy',
    subtitle: `Account identity, privacy & Reset ${BRAND.name}`,
    accentHex: '#9F8170',
  },
  {
    id: 'help_tutorials',
    numberLabel: '09',
    title: 'Help & Tutorials',
    shortTitle: 'Help & Tutorials',
    subtitle: 'Interactive 6-step walkthrough & controls guide',
    accentHex: '#7A9A95',
  },
];

export interface TutorialStep {
  stepNumber: number;
  title: string;
  subtitle: string;
  description: string;
  targetHighlight:
    | 'overview'
    | 'movement_controls'
    | 'childhood_entrance'
    | 'add_memory'
    | 'customise_room'
    | 'explore_world'
    | 'camera_controls'
    | 'feature_wall'
    | 'lift'
    | 'rooms'
    | 'memories'
    | 'playlists'
    | 'header_menu';
  keyHint: string;
  highlightBadge: string;
}

/**
 * 6-Step Interactive Project Walkthrough
 */
export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    stepNumber: 1,
    title: 'Welcome to Your Museum',
    subtitle: 'Central Atrium — Your Main Exploration Space',
    description:
      `Welcome to the Central Atrium. This grand sunlit hall is the main space from which you explore your personal ${BRAND.name} world and walk into your activated memory rooms.`,
    targetHighlight: 'overview',
    keyHint: 'Central Atrium · Main Hub',
    highlightBadge: 'Central Atrium Lobby',
  },
  {
    stepNumber: 2,
    title: 'Move Your Character',
    subtitle: 'Walk Around the Atrium & Look Around',
    description:
      'Use W, A, S, D or the Arrow Keys (or the on-screen controls) to walk your character smoothly around the atrium, and move your mouse to look in any direction.',
    targetHighlight: 'movement_controls',
    keyHint: 'W A S D / Arrow Keys · Mouse Look',
    highlightBadge: 'Your Character & Movement Controls',
  },
  {
    stepNumber: 3,
    title: 'Discover Your Childhood Room',
    subtitle: 'Your Activated Personal Room',
    description:
      'Look toward the illuminated Childhood Room entrance on the Ground Floor West wall. Walk your character toward the open archway and step right through the doorway to enter.',
    targetHighlight: 'childhood_entrance',
    keyHint: 'Walk Through the Open Archway',
    highlightBadge: 'Childhood Room Entrance',
  },
  {
    stepNumber: 4,
    title: 'Add Your Memories',
    subtitle: 'Photos, Videos, Audio, Documents & Stories',
    description:
      'Inside your Childhood Room, click Add Memory to upload your personal photographs, videos, voice recordings, documents, and written stories directly onto 3D frames, desks, and displays.',
    targetHighlight: 'add_memory',
    keyHint: 'Add Memory · Personal Uploads',
    highlightBadge: 'Add Memory Control',
  },
  {
    stepNumber: 5,
    title: 'Customise Your Room',
    subtitle: 'Interior, Furniture, Colours, Lighting & Atmosphere',
    description:
      'Click Customise Room inside your Childhood Room to change wall colours, floor materials, bed and desk styles, decorative toys, daylight warmth, and outdoor sky atmosphere in real time.',
    targetHighlight: 'customise_room',
    keyHint: 'Customise Room · Real-Time 3D Studio',
    highlightBadge: 'Customise Room Studio',
  },
  {
    stepNumber: 6,
    title: 'Interact with AI-Created 3D Objects',
    subtitle: 'Memory-to-3D Objects, Animations & Original Media',
    description:
      'Approved memories transform into interactive 3D objects in your Bedroom, Backyard, Play Area, and Treehouse. Approach any AI-created 3D object and click or press E to trigger its animation and inspect your original memory.',
    targetHighlight: 'explore_world',
    keyHint: 'Walk · Click or Press E on 3D Objects',
    highlightBadge: 'Interactive AI-Created 3D Objects',
  },
];

/* ============================================================================
   1. TEMPORARY 10-SECOND HEADER NOTIFICATION / TIP COMPONENT
      (With Critical-Message Exception that stays visible until acknowledged)
   ============================================================================ */
export const DEFAULT_NOTIFICATION_DURATION_MS = 10000;

export interface MuseumNotificationItem {
  id: string;
  message: string;
  detail?: string;
  priority: 'tip' | 'important' | 'critical';
  durationMs?: number;
  persistent?: boolean;
}

interface TemporaryNotificationBannerProps {
  notification: MuseumNotificationItem | null;
  reducedMotion: boolean;
  onDismiss: () => void;
  onDisableOptionalTips?: () => void;
}

export const TemporaryNotificationBanner: React.FC<
  TemporaryNotificationBannerProps
> = ({ notification, reducedMotion, onDismiss, onDisableOptionalTips }) => {
  const [isVisible, setIsVisible] = useState(false);
  const remainingMsRef = useRef<number>(DEFAULT_NOTIFICATION_DURATION_MS);
  const lastStartTimestampRef = useRef<number>(0);
  const timerIdRef = useRef<number | null>(null);
  const fadeOutTimerRef = useRef<number | null>(null);
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  const notificationId = notification?.id ?? null;
  const notificationPriority = notification?.priority ?? 'tip';
  const notificationPersistent = Boolean(notification?.persistent);
  const notificationDurationMs =
    notification?.durationMs ?? DEFAULT_NOTIFICATION_DURATION_MS;

  useEffect(() => {
    const clearTimers = () => {
      if (timerIdRef.current !== null) {
        window.clearTimeout(timerIdRef.current);
        timerIdRef.current = null;
      }
      if (fadeOutTimerRef.current !== null) {
        window.clearTimeout(fadeOutTimerRef.current);
        fadeOutTimerRef.current = null;
      }
    };

    if (!notificationId) {
      clearTimers();
      setIsVisible(false);
      return;
    }

    const isCriticalPersistent =
      notificationPriority === 'critical' || notificationPersistent;

    remainingMsRef.current = notificationDurationMs;
    setIsVisible(true);

    if (isCriticalPersistent) {
      clearTimers();
      return () => clearTimers();
    }

    const scheduleAutoHide = () => {
      clearTimers();
      if (document.visibilityState === 'hidden') return;
      lastStartTimestampRef.current = performance.now();
      timerIdRef.current = window.setTimeout(() => {
        setIsVisible(false);
        fadeOutTimerRef.current = window.setTimeout(
          () => {
            onDismissRef.current();
          },
          reducedMotion ? 0 : 280,
        );
      }, remainingMsRef.current);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        if (timerIdRef.current !== null) {
          const elapsed = performance.now() - lastStartTimestampRef.current;
          remainingMsRef.current = Math.max(
            1200,
            remainingMsRef.current - elapsed,
          );
          window.clearTimeout(timerIdRef.current);
          timerIdRef.current = null;
        }
      } else {
        scheduleAutoHide();
      }
    };

    scheduleAutoHide();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearTimers();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [
    notificationId,
    notificationPriority,
    notificationPersistent,
    notificationDurationMs,
    reducedMotion,
  ]);

  if (!notification) return null;

  const isCritical =
    notification.priority === 'critical' || notification.persistent === true;

  return (
    <div
      role={isCritical ? 'alert' : 'status'}
      aria-live={isCritical ? 'assertive' : 'polite'}
      className={`pointer-events-auto max-w-md bg-[#27231F] text-[#FFFCF6] border ${
        isCritical
          ? 'border-[#C98D87] ring-2 ring-[#C98D87]/40'
          : notification.priority === 'important'
            ? 'border-[#FDE68A]'
            : 'border-[#D6A15D]/60'
      } rounded-xl px-3.5 py-2 shadow-lg flex items-center gap-3 ${
        reducedMotion
          ? ''
          : `transition-all duration-300 ${
              isVisible
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 -translate-y-1'
            }`
      }`}
    >
      {isCritical && (
        <AlertTriangle className="w-4 h-4 text-[#C98D87] shrink-0" />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-[#FDE68A] truncate">
          {notification.message}
        </p>
        {notification.detail && (
          <p className="text-[11px] text-[#E9D4B1]/90 truncate mt-0.5">
            {notification.detail}
          </p>
        )}
      </div>
      {notification.priority === 'tip' && onDisableOptionalTips && (
        <button
          type="button"
          onClick={() => {
            onDisableOptionalTips();
            onDismiss();
          }}
          title="Hide optional tips in settings"
          className="text-[10px] text-[#E9D4B1]/70 hover:text-[#FDE68A] underline shrink-0 cursor-pointer"
        >
          Mute tips
        </button>
      )}
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="p-1 rounded-lg text-[#E9D4B1]/75 hover:text-[#FFFCF6] hover:bg-[#3C2D22] transition-colors cursor-pointer shrink-0"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

/* ============================================================================
   2. ACCOUNT CREATION, SIGN-IN & GUEST WELCOME SCREEN OVERLAY
   ============================================================================ */
interface WelcomeScreenOverlayProps {
  projectName: string;
  onAuthenticated: (
    user: MuseumUserAccount,
    sessionToken: string,
    isNewRegistration: boolean,
  ) => void;
}

const EMAIL_VALIDATION_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const WelcomeScreenOverlay: React.FC<WelcomeScreenOverlayProps> = ({
  projectName,
  onAuthenticated,
}) => {
  const [authMode, setAuthMode] = useState<'welcome' | 'register' | 'signin'>(
    'welcome',
  );
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetFormErrors = () => {
    setFieldErrors({});
    setFormError(null);
  };

  const validateRegisterClient = (): boolean => {
    const errs: Record<string, string> = {};
    if (!displayName.trim() || displayName.trim().length < 2) {
      errs.displayName = 'Please enter your display name (at least 2 characters).';
    }
    if (!email.trim() || !EMAIL_VALIDATION_REGEX.test(email.trim())) {
      errs.email = 'Please enter a valid email address.';
    }
    if (!password || password.length < 8) {
      errs.password = 'Password must be at least 8 characters long.';
    }
    if (password !== confirmPassword) {
      errs.confirmPassword = 'Passwords do not match.';
    }
    if (!termsAccepted) {
      errs.termsAccepted =
        'Please acknowledge the terms and privacy notice to continue.';
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateSignInClient = (): boolean => {
    const errs: Record<string, string> = {};
    if (!email.trim() || !EMAIL_VALIDATION_REGEX.test(email.trim())) {
      errs.email = 'Please enter a valid email address.';
    }
    if (!password) {
      errs.password = 'Please enter your password.';
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetFormErrors();
    if (!validateRegisterClient()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: displayName.trim(),
          email: email.trim(),
          password,
          confirmPassword,
          termsAccepted,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok || !data.user) {
        if (data.fieldErrors) setFieldErrors(data.fieldErrors);
        setFormError(
          data.message || 'Unable to create your account. Please try again.',
        );
        return;
      }
      // Clear password fields from memory immediately after server response
      setPassword('');
      setConfirmPassword('');
      onAuthenticated(data.user, data.sessionToken, true);
    } catch {
      setFormError(
        'Network error while contacting authentication server. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetFormErrors();
    if (!validateSignInClient()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok || !data.user) {
        if (data.fieldErrors) setFieldErrors(data.fieldErrors);
        setFormError(
          data.message || 'Invalid email or password. Please try again.',
        );
        return;
      }
      setPassword('');
      onAuthenticated(data.user, data.sessionToken, false);
    } catch {
      setFormError(
        'Network error while contacting authentication server. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContinueAsGuest = async () => {
    resetFormErrors();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/guest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (res.ok && data.ok && data.user) {
        onAuthenticated(data.user, data.sessionToken, false);
      } else {
        setFormError('Unable to start guest session. Please try again.');
      }
    } catch {
      setFormError('Network error starting guest session.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const passwordStrengthLabel =
    password.length === 0
      ? null
      : password.length < 8
        ? { text: 'Too short (minimum 8 characters)', color: 'text-[#991B1B]' }
        : password.length >= 12 &&
            /[A-Z]/.test(password) &&
            /[0-9]/.test(password)
          ? { text: 'Strong password', color: 'text-[#87977C]' }
          : { text: 'Good password strength', color: 'text-[#854D27]' };

  const resolvedBrandName = resolveMuseumDisplayName(projectName);

  return (
    <main
      aria-label={`Welcome to ${resolvedBrandName}`}
      className="fixed inset-0 z-30 flex items-center justify-center px-4 py-6 overflow-y-auto bg-[#1E1813]/38 pointer-events-auto"
    >
      <div className="max-w-md w-full bg-[#FFFCF6] border border-[#E8DED0] rounded-3xl px-7 py-8 sm:px-9 sm:py-9 shadow-2xl my-auto">
        {/* MEMORA Wordmark & Project Name */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#F6F1E8] border border-[#E8DED0] mb-3">
            <Landmark className="w-4 h-4 text-[#854D27]" />
            <span className="font-serif-display text-base font-semibold text-[#27231F] tracking-wide">
              {resolvedBrandName}
            </span>
          </div>

          <p className="text-[11px] font-mono-tabular uppercase tracking-widest text-[#854D27] mb-3">
            {BRAND.tagline}
          </p>

          {authMode === 'welcome' && (
            <>
              <h1
                className="font-serif-display text-3xl sm:text-4xl font-semibold text-[#27231F] tracking-tight leading-tight"
                style={{ textWrap: 'balance' }}
              >
                Your memories deserve a place of their own.
              </h1>

              <p className="text-xs sm:text-sm text-[#493629] mt-3 max-w-sm mx-auto leading-relaxed">
                {BRAND.description}
              </p>

              {formError && (
                <div className="mt-4 p-3 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#991B1B] text-left">
                  {formError}
                </div>
              )}

              <div className="mt-7 flex flex-col items-stretch gap-3">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleContinueAsGuest}
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm font-semibold bg-[#27231F] text-[#FFFCF6] hover:bg-[#493629] transition-all duration-200 shadow-md cursor-pointer disabled:opacity-60"
                >
                  <Compass className="w-4 h-4 text-[#D6A15D]" />
                  {isSubmitting ? 'Entering Museum...' : 'Continue to Museum'}
                </button>

                <div className="flex items-center justify-center gap-4 text-xs pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      resetFormErrors();
                      setAuthMode('signin');
                    }}
                    className="font-medium text-[#6E5641] hover:text-[#27231F] transition-colors cursor-pointer"
                  >
                    Sign In
                  </button>
                  <span className="text-[#D8C8B0]" aria-hidden="true">·</span>
                  <button
                    type="button"
                    onClick={() => {
                      resetFormErrors();
                      setAuthMode('register');
                    }}
                    className="font-medium text-[#854D27] hover:underline transition-colors cursor-pointer"
                  >
                    Create Account
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* REGISTRATION FORM */}
        {authMode === 'register' && (
          <form onSubmit={handleRegisterSubmit} noValidate className="space-y-3.5">
            <div className="text-center mb-2">
              <h1 className="font-serif-display text-2xl sm:text-3xl font-semibold text-[#27231F]">
                Create Your Personal Museum
              </h1>
              <p className="text-xs text-[#493629] mt-1">
                Start with a fresh, private 3-floor museum of your own.
              </p>
            </div>

            {formError && (
              <div
                role="alert"
                className="p-3 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#991B1B]"
              >
                {formError}
              </div>
            )}

            <div>
              <label
                htmlFor="reg-display-name"
                className="block text-xs font-semibold text-[#27231F] mb-1"
              >
                Display Name *
              </label>
              <input
                id="reg-display-name"
                type="text"
                autoComplete="name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g., Clara Bennett"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F6F1E8] border border-[#E8DED0] text-sm text-[#27231F] focus:outline-none focus:border-[#854D27]"
              />
              {fieldErrors.displayName && (
                <p className="text-[11px] text-[#991B1B] mt-1">
                  {fieldErrors.displayName}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="reg-email"
                className="block text-xs font-semibold text-[#27231F] mb-1"
              >
                Email Address *
              </label>
              <input
                id="reg-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F6F1E8] border border-[#E8DED0] text-sm text-[#27231F] focus:outline-none focus:border-[#854D27]"
              />
              {fieldErrors.email && (
                <p className="text-[11px] text-[#991B1B] mt-1">
                  {fieldErrors.email}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="reg-password"
                  className="block text-xs font-semibold text-[#27231F] mb-1"
                >
                  Password *
                </label>
                <div className="relative">
                  <input
                    id="reg-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    className="w-full pl-3.5 pr-9 py-2.5 rounded-xl bg-[#F6F1E8] border border-[#E8DED0] text-sm text-[#27231F] focus:outline-none focus:border-[#854D27]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-2.5 top-2.5 text-[#6E5641] hover:text-[#27231F] cursor-pointer"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {passwordStrengthLabel && (
                  <p className={`text-[10px] mt-1 ${passwordStrengthLabel.color}`}>
                    {passwordStrengthLabel.text}
                  </p>
                )}
                {fieldErrors.password && (
                  <p className="text-[11px] text-[#991B1B] mt-1">
                    {fieldErrors.password}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="reg-confirm-password"
                  className="block text-xs font-semibold text-[#27231F] mb-1"
                >
                  Confirm Password *
                </label>
                <input
                  id="reg-confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F6F1E8] border border-[#E8DED0] text-sm text-[#27231F] focus:outline-none focus:border-[#854D27]"
                />
                {fieldErrors.confirmPassword && (
                  <p className="text-[11px] text-[#991B1B] mt-1">
                    {fieldErrors.confirmPassword}
                  </p>
                )}
              </div>
            </div>

            <div className="pt-1">
              <label className="flex items-start gap-2.5 text-xs text-[#493629] cursor-pointer">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-0.5 accent-[#854D27] w-4 h-4 rounded shrink-0"
                />
                <span>
                  I acknowledge the Terms &amp; Privacy notice. My personal
                  memories and museum rooms are isolated to my private account.
                </span>
              </label>
              {fieldErrors.termsAccepted && (
                <p className="text-[11px] text-[#991B1B] mt-1">
                  {fieldErrors.termsAccepted}
                </p>
              )}
            </div>

            <div className="pt-2 space-y-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold bg-[#27231F] text-[#FFFCF6] hover:bg-[#493629] transition-colors shadow-md cursor-pointer disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#D6A15D]" />
                    Creating Your Museum...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 text-[#D6A15D]" />
                    Create Account
                  </>
                )}
              </button>

              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={() => {
                    resetFormErrors();
                    setAuthMode('welcome');
                  }}
                  className="text-[#6E5641] hover:text-[#27231F] cursor-pointer"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={() => {
                    resetFormErrors();
                    setAuthMode('signin');
                  }}
                  className="font-semibold text-[#854D27] hover:underline cursor-pointer"
                >
                  Already have an account? Sign In
                </button>
              </div>
            </div>
          </form>
        )}

        {/* SIGN-IN FORM */}
        {authMode === 'signin' && (
          <form onSubmit={handleSignInSubmit} noValidate className="space-y-4">
            <div className="text-center mb-2">
              <h1 className="font-serif-display text-2xl sm:text-3xl font-semibold text-[#27231F]">
                Sign In to {resolvedBrandName}
              </h1>
              <p className="text-xs text-[#493629] mt-1">
                Return to your personal 3D museum archive.
              </p>
            </div>

            {formError && (
              <div
                role="alert"
                className="p-3 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#991B1B]"
              >
                {formError}
              </div>
            )}

            <div>
              <label
                htmlFor="signin-email"
                className="block text-xs font-semibold text-[#27231F] mb-1"
              >
                Email Address *
              </label>
              <input
                id="signin-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F6F1E8] border border-[#E8DED0] text-sm text-[#27231F] focus:outline-none focus:border-[#854D27]"
              />
              {fieldErrors.email && (
                <p className="text-[11px] text-[#991B1B] mt-1">
                  {fieldErrors.email}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="signin-password"
                className="block text-xs font-semibold text-[#27231F] mb-1"
              >
                Password *
              </label>
              <div className="relative">
                <input
                  id="signin-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-3.5 pr-9 py-2.5 rounded-xl bg-[#F6F1E8] border border-[#E8DED0] text-sm text-[#27231F] focus:outline-none focus:border-[#854D27]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-2.5 top-2.5 text-[#6E5641] hover:text-[#27231F] cursor-pointer"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="text-[11px] text-[#991B1B] mt-1">
                  {fieldErrors.password}
                </p>
              )}
            </div>

            <div className="pt-2 space-y-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold bg-[#27231F] text-[#FFFCF6] hover:bg-[#493629] transition-colors shadow-md cursor-pointer disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#D6A15D]" />
                    Signing In...
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4 text-[#D6A15D]" />
                    Sign In
                  </>
                )}
              </button>

              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={() => {
                    resetFormErrors();
                    setAuthMode('welcome');
                  }}
                  className="text-[#6E5641] hover:text-[#27231F] cursor-pointer"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={() => {
                    resetFormErrors();
                    setAuthMode('register');
                  }}
                  className="font-semibold text-[#854D27] hover:underline cursor-pointer"
                >
                  Need an account? Create Account
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </main>
  );
};

/* ============================================================================
   3. 3D CHARACTER WELCOME EXPERIENCE DIALOGUE BUBBLE
   ============================================================================ */
interface CharacterWelcomeBubbleProps {
  isOpen: boolean;
  displayName: string;
  onLetsExplore: () => void;
  onTakeQuickTour: () => void;
  onSkipForNow: () => void;
}

export const CharacterWelcomeBubble: React.FC<CharacterWelcomeBubbleProps> = ({
  isOpen,
  displayName,
  onLetsExplore,
  onTakeQuickTour,
  onSkipForNow,
}) => {
  if (!isOpen) return null;

  return (
    <aside
      role="dialog"
      aria-label="Museum Guide Welcome"
      className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 w-[92vw] max-w-lg bg-[#FFFCF6] text-[#27231F] border-2 border-[#D6A15D] rounded-3xl p-5 sm:p-6 shadow-2xl pointer-events-auto"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-xl bg-[#27231F] text-[#D6A15D] flex items-center justify-center font-serif-display font-bold text-sm">
            M
          </span>
          <div>
            <span className="text-[10px] font-mono-tabular uppercase tracking-widest text-[#854D27] font-semibold block">
              3D Museum Guide · Welcome, {displayName}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onSkipForNow}
          aria-label="Dismiss welcome message"
          className="p-1 rounded-lg text-[#6E5641] hover:text-[#27231F] cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <p className="font-serif-display text-xl sm:text-2xl font-semibold text-[#27231F] mt-3 leading-snug">
        “Welcome to {BRAND.name}! I&apos;m your guide. Together, we&apos;ll create a
        place for your memories, stories, and meaningful moments.”
      </p>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onLetsExplore}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold bg-[#27231F] text-[#FFFCF6] hover:bg-[#493629] transition-colors cursor-pointer shadow-xs"
          >
            <Compass className="w-3.5 h-3.5 text-[#D6A15D]" />
            Let&apos;s Explore
          </button>

          <button
            type="button"
            onClick={onTakeQuickTour}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold bg-[#D6A15D] text-[#27231F] hover:bg-[#E9D4B1] transition-colors cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5" />
            Take a Quick Tour
          </button>
        </div>

        <button
          type="button"
          onClick={onSkipForNow}
          className="px-3 py-2 rounded-xl text-xs font-medium text-[#6E5641] hover:text-[#27231F] underline cursor-pointer"
        >
          Skip for Now
        </button>
      </div>
    </aside>
  );
};

/* ============================================================================
   4. 6-STEP INTERACTIVE PROJECT WALKTHROUGH OVERLAY
   ============================================================================ */
interface InteractiveTutorialOverlayProps {
  activeStepIndex: number;
  onPrevStep: () => void;
  onNextStep: () => void;
  onRestartTutorial: () => void;
  onSkipTutorial: () => void;
  onFinishTutorial: () => void;
}

export const InteractiveTutorialOverlay: React.FC<
  InteractiveTutorialOverlayProps
> = ({
  activeStepIndex,
  onPrevStep,
  onNextStep,
  onSkipTutorial,
  onFinishTutorial,
}) => {
  const step = TUTORIAL_STEPS[activeStepIndex] || TUTORIAL_STEPS[0];
  const isLast = activeStepIndex === TUTORIAL_STEPS.length - 1;

  return (
    <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
      {/* Contextual 3D / UI Target Highlights & Subtle Arrows */}
      {step.targetHighlight === 'overview' && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 animate-in fade-in duration-200">
          <div className="px-3.5 py-1.5 rounded-full bg-[#27231F]/92 border border-[#D6A15D] text-[#FFE2B5] text-xs font-semibold shadow-xl flex items-center gap-2">
            <Compass className="w-3.5 h-3.5 text-[#D6A15D]" />
            <span>Central Atrium · Main Exploration Space</span>
          </div>
          <span className="text-[#D6A15D] text-lg leading-none">↓</span>
        </div>
      )}

      {step.targetHighlight === 'movement_controls' && (
        <>
          {/* Highlight Character in the Center of the Atrium */}
          <div className="fixed top-[42%] left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1.5 animate-in fade-in duration-200">
            <div className="px-3 py-1 rounded-full bg-[#27231F]/92 border border-[#D6A15D] text-[#FFE2B5] text-[11px] font-semibold shadow-lg">
              Your Character · Walk with W A S D
            </div>
            <span className="text-[#D6A15D] text-lg leading-none">↓</span>
            <div className="w-20 h-20 rounded-full border-2 border-[#D6A15D]/80 ring-4 ring-[#D6A15D]/20" />
          </div>

          {/* Subtle Arrow Pointing to Bottom-Right Movement Controls */}
          <div className="fixed bottom-44 right-6 sm:right-8 flex flex-col items-end gap-1 animate-in fade-in duration-200">
            <div className="px-3 py-1.5 rounded-xl bg-[#27231F]/95 border border-[#D6A15D] text-[#FFE2B5] text-[11px] font-semibold shadow-lg">
              Movement Controls (W A S D / Arrows)
            </div>
            <span className="text-[#D6A15D] text-lg leading-none pr-6">↓</span>
          </div>
        </>
      )}

      {step.targetHighlight === 'childhood_entrance' && (
        <div className="fixed top-[36%] left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-2 animate-in fade-in duration-200">
          <div className="px-4 py-1.5 rounded-2xl bg-[#27231F]/95 border-2 border-[#D6A15D] text-[#FFE2B5] text-xs font-semibold shadow-2xl flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#87977C]" />
            <span>Childhood Room Entrance · Walk Through Archway</span>
          </div>
          <span className="text-[#D6A15D] text-xl leading-none">↓</span>
          <div className="w-40 h-44 rounded-t-full border-2 border-[#D6A15D]/85 ring-4 ring-[#D6A15D]/25" />
        </div>
      )}

      {(step.targetHighlight === 'add_memory' ||
        step.targetHighlight === 'customise_room') && (
        <div className="fixed top-16 right-4 sm:right-6 flex flex-col items-end gap-2 animate-in fade-in duration-200">
          <div className="flex items-center gap-2 bg-[#27231F]/92 p-1.5 rounded-2xl border border-[#C9A66B]/50 shadow-xl">
            <div className="px-3 py-1.5 rounded-xl bg-[#27231F] text-[#E8DED0]/60 border border-[#C9A66B]/30 text-xs font-semibold">
              Exit Room
            </div>
            <div
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                step.targetHighlight === 'add_memory'
                  ? 'bg-[#D6A15D] text-[#27231F] ring-4 ring-[#D6A15D]/40 font-bold scale-105'
                  : 'bg-[#27231F] text-[#FFE2B5]/70 border border-[#C9A66B]/30'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Memory</span>
            </div>
            <div
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                step.targetHighlight === 'customise_room'
                  ? 'bg-[#D6A15D] text-[#27231F] ring-4 ring-[#D6A15D]/40 font-bold scale-105'
                  : 'bg-[#27231F] text-[#FFE2B5]/70 border border-[#C9A66B]/30'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Customise Room</span>
            </div>
          </div>

          <div className="flex flex-col items-end pr-4">
            <span className="text-[#D6A15D] text-lg leading-none">↑</span>
            <div className="px-3 py-1.5 rounded-xl bg-[#27231F]/95 border border-[#D6A15D] text-[#FFE2B5] text-[11px] font-semibold shadow-lg">
              {step.targetHighlight === 'add_memory'
                ? 'Inside your room, click Add Memory to upload photos, videos, audio & stories'
                : 'Inside your room, click Customise Room to style walls, furniture & lighting in 3D'}
            </div>
          </div>
        </div>
      )}

      {step.targetHighlight === 'explore_world' && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 animate-in fade-in duration-200">
          <div className="px-4 py-1.5 rounded-full bg-[#27231F]/92 border border-[#D6A15D] text-[#FFE2B5] text-xs font-semibold shadow-xl flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-[#D6A15D]" />
            <span>Step Inside Your Childhood Room & Interact with Your Memories</span>
          </div>
          <span className="text-[#D6A15D] text-lg leading-none">↓</span>
        </div>
      )}

      {/* Compact Museum-Integrated Walkthrough Card */}
      <aside
        aria-label="Interactive Project Walkthrough"
        className="pointer-events-auto fixed bottom-6 left-1/2 -translate-x-1/2 w-[92vw] max-w-lg bg-[#27231F]/95 backdrop-blur-xl text-[#FFFCF6] border-2 border-[#D6A15D] rounded-2xl p-4 sm:p-5 shadow-2xl"
      >
        <div className="flex items-center justify-between gap-3 pb-2.5 border-b border-[#493629]">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-[#D6A15D] text-[#27231F] font-mono-tabular text-xs font-bold">
              {step.stepNumber} of {TUTORIAL_STEPS.length}
            </span>
            <span className="text-[11px] text-[#E9D4B1] font-mono-tabular truncate">
              {step.keyHint}
            </span>
          </div>

          <button
            type="button"
            onClick={onSkipTutorial}
            className="px-2.5 py-1 rounded-lg bg-[#3C2D22] hover:bg-[#493629] text-xs font-semibold text-[#FFE2B5] transition-colors cursor-pointer shrink-0"
          >
            Skip Walkthrough
          </button>
        </div>

        <div className="mt-3">
          <span className="text-[10px] font-mono-tabular uppercase tracking-widest text-[#D6A15D] block">
            Step {step.stepNumber} — {step.subtitle}
          </span>
          <h2 className="font-serif-display text-xl sm:text-2xl font-semibold text-[#FDE68A] mt-0.5">
            {step.title}
          </h2>
          <p className="text-xs sm:text-sm text-[#FFFCF6]/90 mt-1.5 leading-relaxed">
            {step.description}
          </p>
        </div>

        <div className="mt-4 pt-3 border-t border-[#493629] flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            {TUTORIAL_STEPS.map((s, idx) => (
              <span
                key={s.stepNumber}
                className={`h-1.5 rounded-full transition-all ${
                  idx === activeStepIndex
                    ? 'w-5 bg-[#D6A15D]'
                    : idx < activeStepIndex
                      ? 'w-2 bg-[#D6A15D]/60'
                      : 'w-2 bg-[#493629]'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {activeStepIndex > 0 && (
              <button
                type="button"
                onClick={onPrevStep}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#3C2D22] text-[#FFFCF6] hover:bg-[#493629] cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Back
              </button>
            )}

            {isLast ? (
              <button
                type="button"
                onClick={onFinishTutorial}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold bg-[#D6A15D] text-[#27231F] hover:bg-[#E9D4B1] shadow-md cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                Start Exploring
              </button>
            ) : (
              <button
                type="button"
                onClick={onNextStep}
                className="inline-flex items-center gap-1 px-4 py-1.5 rounded-xl text-xs font-semibold bg-[#D6A15D] text-[#27231F] hover:bg-[#E9D4B1] shadow-md cursor-pointer"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
};

/* ============================================================================
   5. RESET MEMORA EXPLICIT CONFIRMATION MODAL
   ============================================================================ */
interface ResetMuseumConfirmModalProps {
  isOpen: boolean;
  displayName: string;
  onCancel: () => void;
  onConfirmReset: () => void;
}

export const ResetMuseumConfirmModal: React.FC<
  ResetMuseumConfirmModalProps
> = ({ isOpen, displayName, onCancel, onConfirmReset }) => {
  if (!isOpen) return null;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="reset-museum-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C1612]/75 pointer-events-auto"
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-[#FFFCF6] border-2 border-[#C98D87] rounded-3xl p-6 shadow-2xl space-y-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FEE2E2] text-[#991B1B] flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-mono-tabular uppercase tracking-widest text-[#991B1B] font-semibold">
              Destructive Action Confirmation
            </span>
            <h3
              id="reset-museum-title"
              className="font-serif-display text-2xl font-semibold text-[#27231F]"
            >
              Reset {BRAND.name}?
            </h3>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-[#493629] leading-relaxed">
          This will permanently clear all uploaded memories, collections,
          personal stories, saved playlists, and user-created rooms for{' '}
          <strong>{displayName}</strong>.
        </p>

        <div className="p-3.5 rounded-xl bg-[#F6F1E8] border border-[#E8DED0] text-xs text-[#27231F] space-y-1">
          <p className="font-semibold text-[#854D27]">
            Default Architecture Preserved:
          </p>
          <p className="text-[#493629]">
            Your museum will return to a fresh start with 3 default floors and 4
            predefined empty room slots per floor.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#F6F1E8] text-[#27231F] border border-[#E8DED0] hover:bg-[#E9D4B1]/40 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirmReset}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[#991B1B] text-[#FFFCF6] hover:bg-[#7F1D1D] cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Confirm Reset {BRAND.name}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ============================================================================
   6. INTERACTIVE BLANK-WALL FEATURE HUB MODAL & SETTINGS WORKSPACE
   ============================================================================ */
interface FeatureWallHubModalProps {
  isOpen: boolean;
  initialSection: WallFeatureId;
  currentUser: MuseumUserAccount | null;
  museumSettings: MuseumSettings;
  floors: Floor[];
  rooms: Room[];
  memories: Memory[];
  collections: Collection[];
  currentFloorNumber: number;
  onClose: () => void;
  onUpdateMuseumSettings: (next: MuseumSettings) => void;
  onNavigateTab: (
    tab: ActiveNavTab,
    exploreSub?: 'search' | 'map' | 'people' | 'dashboard',
  ) => void;
  onOpenAddMemory: () => void;
  onSmartAddRoom: () => void;
  onEnterRoom: (roomId: string) => void;
  onCallLiftToFloor: (targetFloorNumber: number) => void;
  onOpenFloorExpansion: () => void;
  onStartTutorial: () => void;
  onRequestResetMuseum: () => void;
  onSignOut: () => void;
}

export const FeatureWallHubModal: React.FC<FeatureWallHubModalProps> = ({
  isOpen,
  initialSection,
  currentUser,
  museumSettings,
  floors,
  rooms,
  memories,
  collections,
  currentFloorNumber,
  onClose,
  onUpdateMuseumSettings,
  onNavigateTab,
  onOpenAddMemory,
  onSmartAddRoom,
  onEnterRoom,
  onCallLiftToFloor,
  onOpenFloorExpansion,
  onStartTutorial,
  onRequestResetMuseum,
  onSignOut,
}) => {
  const [activeSection, setActiveSection] =
    useState<WallFeatureId>(initialSection);

  useEffect(() => {
    setActiveSection(initialSection);
  }, [initialSection, isOpen]);

  if (!isOpen) return null;

  const userCreatedRoomsCount = rooms.filter((r) => r.isUserCreated).length;

  const handleExportArchiveJson = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      account: currentUser
        ? { displayName: currentUser.displayName, email: currentUser.email }
        : undefined,
      museumSettings,
      floors,
      rooms,
      memories,
      collections,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${resolveMuseumDisplayName(museumSettings.projectName)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')}-archive.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Interactive Feature Wall Hub"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-[#1C1612]/65 pointer-events-auto"
    >
      <div className="w-full max-w-5xl max-h-[88vh] bg-[#FFFCF6] border-2 border-[#D6A15D] rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Top Bar with Configurable Project Name */}
        <div className="px-5 py-4 bg-[#27231F] text-[#FFFCF6] flex items-center justify-between gap-4 border-b border-[#493629]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#D6A15D] text-[#27231F] flex items-center justify-center font-serif-display font-bold text-lg">
              {resolveMuseumDisplayName(museumSettings.projectName).charAt(0).toUpperCase()}
            </div>
            <div>
              <span className="text-[10px] font-mono-tabular uppercase tracking-widest text-[#D6A15D] block">
                Feature Wall · Floor {currentFloorNumber + 1}
              </span>
              <h2 className="font-serif-display text-xl sm:text-2xl font-semibold text-[#FFFCF6]">
                {resolveMuseumDisplayName(museumSettings.projectName)}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Feature Wall Hub"
            className="p-2 rounded-xl bg-[#3C2D22] text-[#E9D4B1] hover:text-[#FFFCF6] hover:bg-[#493629] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Split Layout: Left Ordered 9 Wall Options, Right Active Workspace */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
          <nav
            aria-label="Feature Wall Sections"
            className="md:col-span-4 bg-[#F6F1E8] border-b md:border-b-0 md:border-r border-[#E8DED0] p-3 overflow-y-auto space-y-1 max-h-52 md:max-h-none"
          >
            {WALL_MENU_ITEMS.map((item) => {
              const isSelected = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl transition-all flex items-center justify-between gap-2 cursor-pointer ${
                    isSelected
                      ? 'bg-[#27231F] text-[#FFFCF6] shadow-xs'
                      : 'text-[#27231F] hover:bg-[#E9D4B1]/45'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-mono-tabular font-bold ${
                          isSelected ? 'text-[#D6A15D]' : 'text-[#854D27]'
                        }`}
                      >
                        {item.numberLabel}
                      </span>
                      <span className="font-serif-display text-base font-semibold truncate">
                        {item.title}
                      </span>
                    </div>
                    <p
                      className={`text-[11px] truncate mt-0.5 ${
                        isSelected ? 'text-[#E9D4B1]/85' : 'text-[#6E5641]'
                      }`}
                    >
                      {item.subtitle}
                    </p>
                  </div>
                  <ChevronRight
                    className={`w-4 h-4 shrink-0 ${
                      isSelected ? 'text-[#D6A15D]' : 'text-[#856B52]'
                    }`}
                  />
                </button>
              );
            })}
          </nav>

          {/* Right Content Panel */}
          <div className="md:col-span-8 p-5 sm:p-6 overflow-y-auto space-y-5 bg-[#FFFCF6]">
            {activeSection === 'music_playlists' && (
              <div className="space-y-4">
                <div className="border-b border-[#E8DED0] pb-3">
                  <span className="text-xs font-mono-tabular text-[#854D27]">
                    01 · MUSIC &amp; PLAYLISTS
                  </span>
                  <h3 className="font-serif-display text-2xl font-semibold text-[#27231F]">
                    Spotify, YouTube &amp; Room Soundscapes
                  </h3>
                  <p className="text-xs text-[#6E5641] mt-1">
                    Connect Spotify or YouTube, browse and save playlists, and
                    configure ambient soundscapes.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-[#F6F1E8] border border-[#E8DED0] flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="font-serif-display text-lg font-semibold text-[#27231F]">
                      Open Music &amp; Playlists Workspace
                    </p>
                    <p className="text-xs text-[#6E5641]">
                      Manage Spotify Playlists, YouTube Playlists, and My
                      Playlists.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onNavigateTab('soundscapes');
                    }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-[#27231F] text-[#FFFCF6] hover:bg-[#493629] cursor-pointer"
                  >
                    <Music className="w-4 h-4 text-[#D6A15D]" />
                    Browse Playlists
                  </button>
                </div>
              </div>
            )}

            {activeSection === 'museum_settings' && (
              <div className="space-y-5">
                <div className="border-b border-[#E8DED0] pb-3">
                  <span className="text-xs font-mono-tabular text-[#854D27]">
                    02 · MUSEUM SETTINGS
                  </span>
                  <h3 className="font-serif-display text-2xl font-semibold text-[#27231F]">
                    Project Name, Camera Look &amp; Notifications
                  </h3>
                  <p className="text-xs text-[#6E5641] mt-1">
                    Updating your project name immediately refreshes the header,
                    browser title, and the top plaque on every floor’s 3D
                    Feature Wall.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#27231F] mb-1.5">
                      Project Name
                    </label>
                    <input
                      type="text"
                      value={
                        museumSettings.projectName === 'MyMuseum' ||
                        museumSettings.projectName === 'My Museum'
                          ? BRAND.name
                          : museumSettings.projectName
                      }
                      onChange={(e) =>
                        onUpdateMuseumSettings({
                          ...museumSettings,
                          projectName: e.target.value,
                        })
                      }
                      onBlur={(e) => {
                        if (!e.target.value.trim()) {
                          onUpdateMuseumSettings({
                            ...museumSettings,
                            projectName: BRAND.name,
                          });
                        }
                      }}
                      placeholder={BRAND.name}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#F6F1E8] border border-[#D8C8B0] text-sm text-[#27231F] focus:outline-none focus:border-[#854D27]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#27231F] mb-1">
                        Mouse Look Sensitivity (
                        {museumSettings.mouseSensitivity.toFixed(1)}x)
                      </label>
                      <input
                        type="range"
                        min={0.4}
                        max={2.0}
                        step={0.1}
                        value={museumSettings.mouseSensitivity}
                        onChange={(e) =>
                          onUpdateMuseumSettings({
                            ...museumSettings,
                            mouseSensitivity: parseFloat(e.target.value),
                          })
                        }
                        className="w-full accent-[#854D27]"
                      />
                    </div>

                    <div className="flex flex-col justify-center space-y-2 pt-2">
                      <label className="flex items-center justify-between text-xs font-medium text-[#27231F] cursor-pointer">
                        <span>Invert Vertical Mouse Look</span>
                        <input
                          type="checkbox"
                          checked={museumSettings.invertCameraY}
                          onChange={(e) =>
                            onUpdateMuseumSettings({
                              ...museumSettings,
                              invertCameraY: e.target.checked,
                            })
                          }
                          className="accent-[#854D27] w-4 h-4"
                        />
                      </label>

                      <label className="flex items-center justify-between text-xs font-medium text-[#27231F] cursor-pointer">
                        <span>Reduced Motion</span>
                        <input
                          type="checkbox"
                          checked={museumSettings.reducedMotion}
                          onChange={(e) =>
                            onUpdateMuseumSettings({
                              ...museumSettings,
                              reducedMotion: e.target.checked,
                            })
                          }
                          className="accent-[#854D27] w-4 h-4"
                        />
                      </label>

                      <label className="flex items-center justify-between text-xs font-medium text-[#27231F] cursor-pointer">
                        <span>Show Compact Floor Indicator</span>
                        <input
                          type="checkbox"
                          checked={museumSettings.showMiniMap}
                          onChange={(e) =>
                            onUpdateMuseumSettings({
                              ...museumSettings,
                              showMiniMap: e.target.checked,
                            })
                          }
                          className="accent-[#854D27] w-4 h-4"
                        />
                      </label>

                      <label className="flex items-center justify-between text-xs font-medium text-[#27231F] cursor-pointer">
                        <span>Show Optional Tips (10s Auto-Hide)</span>
                        <input
                          type="checkbox"
                          checked={museumSettings.showOptionalTips !== false}
                          onChange={(e) =>
                            onUpdateMuseumSettings({
                              ...museumSettings,
                              showOptionalTips: e.target.checked,
                            })
                          }
                          className="accent-[#854D27] w-4 h-4"
                        />
                      </label>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#E8DED0] flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs text-[#6E5641]">
                      Need a guided walkthrough or want to reset your museum?
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onStartTutorial();
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-[#27231F] bg-[#D6A15D] hover:bg-[#E9D4B1] cursor-pointer"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        Reopen Walkthrough
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onRequestResetMuseum();
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-[#991B1B] bg-[#FEE2E2]/70 hover:bg-[#FEE2E2] cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Reset {BRAND.name}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'floor_navigation' && (
              <div className="space-y-4">
                <div className="border-b border-[#E8DED0] pb-3">
                  <span className="text-xs font-mono-tabular text-[#854D27]">
                    03 · FLOOR NAVIGATION &amp; ELEVATOR
                  </span>
                  <h3 className="font-serif-display text-2xl font-semibold text-[#27231F]">
                    Board the Lift &amp; Travel Between Floors
                  </h3>
                  <p className="text-xs text-[#6E5641] mt-1">
                    You are currently on{' '}
                    <strong>
                      Floor {currentFloorNumber + 1} of {floors.length}
                    </strong>
                    . Selecting a floor below boards your character into the
                    elevator cabin, closes the doors, travels vertically, and
                    opens onto the destination corridor.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {floors.map((fl) => {
                    const isCurrent = fl.floorNumber === currentFloorNumber;
                    const floorActiveRooms = rooms.filter(
                      (r) =>
                        r.floorNumber === fl.floorNumber &&
                        r.status === 'active',
                    );
                    return (
                      <div
                        key={fl.id}
                        className={`p-4 rounded-2xl border flex flex-col justify-between gap-3 ${
                          isCurrent
                            ? 'bg-[#27231F] text-[#FFFCF6] border-[#D6A15D]'
                            : 'bg-[#F6F1E8] text-[#27231F] border-[#E8DED0]'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-mono-tabular font-bold text-[#D6A15D]">
                              FLOOR {fl.floorNumber + 1}
                            </span>
                            {isCurrent && (
                              <span className="text-[11px] font-semibold text-[#FDE68A]">
                                Current Floor
                              </span>
                            )}
                          </div>
                          <h4 className="font-serif-display text-xl font-semibold mt-0.5">
                            {fl.name}
                          </h4>
                          <p
                            className={`text-xs mt-0.5 ${
                              isCurrent ? 'text-[#E9D4B1]' : 'text-[#6E5641]'
                            }`}
                          >
                            {floorActiveRooms.length} of 3 room slots active
                          </p>
                        </div>

                        <button
                          type="button"
                          disabled={isCurrent}
                          onClick={() => {
                            onClose();
                            onCallLiftToFloor(fl.floorNumber);
                          }}
                          className={`w-full py-2 px-3 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                            isCurrent
                              ? 'bg-[#3C2D22] text-[#E9D4B1]/60 cursor-default'
                              : 'bg-[#D6A15D] text-[#27231F] hover:bg-[#E9D4B1]'
                          }`}
                        >
                          {isCurrent
                            ? 'Currently on This Floor'
                            : `Ride Elevator to Floor ${fl.floorNumber + 1}`}
                        </button>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <span className="text-xs text-[#6E5641]">
                    Need another level for additional rooms?
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenFloorExpansion();
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[#F6F1E8] border border-[#D8C8B0] text-[#27231F] hover:border-[#854D27] cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#854D27]" />
                    Construct New Floor
                  </button>
                </div>
              </div>
            )}

            {activeSection === 'my_rooms' && (
              <div className="space-y-4">
                <div className="border-b border-[#E8DED0] pb-3 flex items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-mono-tabular text-[#854D27]">
                      04 · MY ROOMS
                    </span>
                    <h3 className="font-serif-display text-2xl font-semibold text-[#27231F]">
                      Gallery Wings &amp; Room Slots
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onSmartAddRoom();
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#D6A15D] text-[#27231F] hover:bg-[#E9D4B1] cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Room
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onNavigateTab('rooms');
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#27231F] text-[#FFFCF6] hover:bg-[#493629] cursor-pointer"
                    >
                      Manage All Rooms
                    </button>
                  </div>
                </div>

                {userCreatedRoomsCount === 0 && (
                  <div className="p-4 rounded-2xl bg-[#F6F1E8] border border-[#D6A15D]/60 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-serif-display text-lg font-semibold text-[#27231F]">
                        Create your first personal room.
                      </p>
                      <p className="text-xs text-[#6E5641]">
                        3 default floors with 3 predefined room slots per floor
                        are ready for your memories.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onSmartAddRoom();
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#27231F] text-[#FFFCF6] hover:bg-[#493629] cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-[#D6A15D]" />
                      Add Room
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1">
                  {rooms.map((rm) => {
                    const count = memories.filter(
                      (m) => m.roomId === rm.id,
                    ).length;
                    return (
                      <div
                        key={rm.id}
                        className="p-3 rounded-xl bg-[#F6F1E8] border border-[#E8DED0] flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <span className="text-[10px] font-mono-tabular text-[#854D27]">
                            Floor {rm.floorNumber + 1} · Slot {rm.slotIndex + 1}{' '}
                            · {rm.isUserCreated ? 'PERSONAL' : 'PREDEFINED'}
                          </span>
                          <p className="font-serif-display text-base font-semibold text-[#27231F] truncate">
                            {rm.name}
                          </p>
                          <p className="text-[11px] text-[#6E5641]">
                            {count} memories
                          </p>
                        </div>
                        {rm.status === 'active' && (
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onEnterRoom(rm.id);
                            }}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#27231F] text-[#FFFCF6] hover:bg-[#493629] shrink-0 cursor-pointer"
                          >
                            Enter
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeSection === 'memories' && (
              <div className="space-y-4">
                <div className="border-b border-[#E8DED0] pb-3 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-mono-tabular text-[#854D27]">
                      05 · MEMORIES &amp; ARCHIVE
                    </span>
                    <h3 className="font-serif-display text-2xl font-semibold text-[#27231F]">
                      Personal Memory Archive ({memories.length} Exhibits)
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenAddMemory();
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[#D6A15D] text-[#27231F] hover:bg-[#E9D4B1] cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Upload Memories
                  </button>
                </div>

                {memories.length === 0 ? (
                  <div className="p-6 rounded-2xl bg-[#F6F1E8] border border-[#E8DED0] text-center space-y-2.5">
                    <p className="font-serif-display text-xl font-semibold text-[#27231F]">
                      Your memory collection starts here.
                    </p>
                    <p className="text-xs text-[#6E5641]">
                      Upload your first photographs, stories, audio recordings,
                      or keepsakes to begin building your personal museum.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenAddMemory();
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[#27231F] text-[#FFFCF6] hover:bg-[#493629] cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-[#D6A15D]" />
                      Upload Memories
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-[#493629] leading-relaxed">
                    Browse, search, and filter all preserved photographs,
                    videos, voice recordings, places, and companions across your
                    museum.
                  </p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onNavigateTab('explore', 'search');
                    }}
                    className="p-3.5 rounded-2xl bg-[#F6F1E8] border border-[#E8DED0] hover:border-[#854D27] text-left cursor-pointer"
                  >
                    <Search className="w-4 h-4 text-[#854D27] mb-1.5" />
                    <p className="font-serif-display text-base font-semibold text-[#27231F]">
                      Search &amp; Filter
                    </p>
                    <p className="text-[11px] text-[#6E5641]">
                      Browse all {memories.length} exhibits
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onNavigateTab('explore', 'map');
                    }}
                    className="p-3.5 rounded-2xl bg-[#F6F1E8] border border-[#E8DED0] hover:border-[#854D27] text-left cursor-pointer"
                  >
                    <MapPin className="w-4 h-4 text-[#854D27] mb-1.5" />
                    <p className="font-serif-display text-base font-semibold text-[#27231F]">
                      Places &amp; Geography
                    </p>
                    <p className="text-[11px] text-[#6E5641]">
                      Memories grouped by location
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onNavigateTab('explore', 'people');
                    }}
                    className="p-3.5 rounded-2xl bg-[#F6F1E8] border border-[#E8DED0] hover:border-[#854D27] text-left cursor-pointer"
                  >
                    <Users className="w-4 h-4 text-[#854D27] mb-1.5" />
                    <p className="font-serif-display text-base font-semibold text-[#27231F]">
                      People Directory
                    </p>
                    <p className="text-[11px] text-[#6E5641]">
                      Companions, family &amp; friends
                    </p>
                  </button>
                </div>
              </div>
            )}

            {activeSection === 'ai_studio' && (
              <div className="space-y-4">
                <div className="border-b border-[#E8DED0] pb-3">
                  <span className="text-xs font-mono-tabular text-[#854D27]">
                    06 · AI STUDIO
                  </span>
                  <h3 className="font-serif-display text-2xl font-semibold text-[#27231F]">
                    AI Curator, Image Studio, Film &amp; 3D Room Designer
                  </h3>
                  <p className="text-xs text-[#6E5641] mt-1">
                    Synthesize curatorial stories, generate room cover art,
                    build memory film storyboards, and restyle 3D rooms.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    {
                      title: 'AI Curator',
                      desc: 'Search, explain, organize, and write grounded narratives about your memories.',
                    },
                    {
                      title: 'Image Studio',
                      desc: 'Generate or restyle room covers, collection artwork, and decorative imagery.',
                    },
                    {
                      title: 'Memory Film Studio',
                      desc: 'Create cinematic storyboards and generate memory videos.',
                    },
                    {
                      title: '3D Room Designer',
                      desc: 'Generate custom wall palettes, lighting, and exhibit layouts for any room.',
                    },
                  ].map((tool) => (
                    <div
                      key={tool.title}
                      className="p-3.5 rounded-xl bg-[#F6F1E8] border border-[#E8DED0]"
                    >
                      <h4 className="font-serif-display text-base font-semibold text-[#27231F]">
                        {tool.title}
                      </h4>
                      <p className="text-xs text-[#6E5641] mt-1">{tool.desc}</p>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onNavigateTab('ai_studio');
                  }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-[#27231F] text-[#FFFCF6] hover:bg-[#493629] cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-[#D6A15D]" />
                  Launch AI Studio Workspace
                </button>
              </div>
            )}

            {activeSection === 'collections_timeline' && (
              <div className="space-y-4">
                <div className="border-b border-[#E8DED0] pb-3">
                  <span className="text-xs font-mono-tabular text-[#854D27]">
                    07 · COLLECTIONS &amp; TIMELINE
                  </span>
                  <h3 className="font-serif-display text-2xl font-semibold text-[#27231F]">
                    Curated Anthologies &amp; Chronological History
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-4 rounded-2xl bg-[#F6F1E8] border border-[#E8DED0] flex flex-col justify-between gap-3">
                    <div>
                      <h4 className="font-serif-display text-xl font-semibold text-[#27231F]">
                        Curated Collections ({collections.length})
                      </h4>
                      <p className="text-xs text-[#6E5641] mt-1">
                        {collections.length === 0
                          ? 'Create your first collection.'
                          : 'Thematic cross-room exhibitions and personal anthologies.'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onNavigateTab('collections');
                      }}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-[#27231F] text-[#FFFCF6] hover:bg-[#493629] cursor-pointer"
                    >
                      <FolderHeart className="w-4 h-4 text-[#D6A15D]" />
                      {collections.length === 0
                        ? 'Create Collection'
                        : 'Open Collections'}
                    </button>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#F6F1E8] border border-[#E8DED0] flex flex-col justify-between gap-3">
                    <div>
                      <h4 className="font-serif-display text-xl font-semibold text-[#27231F]">
                        Chronological Timeline
                      </h4>
                      <p className="text-xs text-[#6E5641] mt-1">
                        {memories.length === 0
                          ? 'Your story will appear here as you add memories.'
                          : 'Walk through your life’s milestones ordered by year and decade.'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onNavigateTab('timeline');
                      }}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-[#27231F] text-[#FFFCF6] hover:bg-[#493629] cursor-pointer"
                    >
                      <Clock className="w-4 h-4 text-[#D6A15D]" />
                      Open Timeline
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'profile_privacy' && (
              <div className="space-y-4">
                <div className="border-b border-[#E8DED0] pb-3 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-mono-tabular text-[#854D27]">
                      08 · PROFILE &amp; PRIVACY CONTROLS
                    </span>
                    <h3 className="font-serif-display text-2xl font-semibold text-[#27231F]">
                      Curator Profile &amp; Data Governance
                    </h3>
                  </div>
                  {currentUser && (
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#F6F1E8] border border-[#E8DED0] text-[#493629]">
                      {currentUser.email}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#27231F] mb-1">
                      Curator Display Name
                    </label>
                    <input
                      type="text"
                      value={museumSettings.curatorName}
                      onChange={(e) =>
                        onUpdateMuseumSettings({
                          ...museumSettings,
                          curatorName: e.target.value,
                        })
                      }
                      className="w-full px-3.5 py-2 rounded-xl bg-[#F6F1E8] border border-[#D8C8B0] text-sm text-[#27231F]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#27231F] mb-1">
                      Curatorial Note / Bio
                    </label>
                    <input
                      type="text"
                      value={museumSettings.curatorBio}
                      onChange={(e) =>
                        onUpdateMuseumSettings({
                          ...museumSettings,
                          curatorBio: e.target.value,
                        })
                      }
                      className="w-full px-3.5 py-2 rounded-xl bg-[#F6F1E8] border border-[#D8C8B0] text-sm text-[#27231F]"
                    />
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#F6F1E8] border border-[#E8DED0] text-xs text-[#493629] space-y-1.5">
                  <p className="font-semibold text-[#27231F]">
                    Account Isolation &amp; Privacy Guarantee
                  </p>
                  <p>
                    Each user account has an isolated private museum archive.
                    Passwords are hashed on the server and never stored in
                    localStorage. External AI providers and music services are
                    only contacted when you explicitly invoke them.
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      onClick={handleExportArchiveJson}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[#27231F] text-[#FFFCF6] hover:bg-[#493629] cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-[#D6A15D]" />
                      Export Archive JSON
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onRequestResetMuseum();
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-[#991B1B] bg-[#FEE2E2]/60 hover:bg-[#FEE2E2] cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Reset {BRAND.name}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onSignOut();
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[#F6F1E8] border border-[#E8DED0] text-[#493629] hover:text-[#27231F] cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}

            {activeSection === 'help_tutorials' && (
              <div className="space-y-4">
                <div className="border-b border-[#E8DED0] pb-3 flex items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-mono-tabular text-[#854D27]">
                      09 · HELP &amp; TUTORIALS
                    </span>
                    <h3 className="font-serif-display text-2xl font-semibold text-[#27231F]">
                      6-Step Interactive Project Walkthrough &amp; Controls Guide
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onStartTutorial();
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[#D6A15D] text-[#27231F] hover:bg-[#E9D4B1] cursor-pointer"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    Reopen Walkthrough
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-[#F6F1E8] border border-[#E8DED0] space-y-1">
                    <p className="font-semibold text-[#27231F]">
                      Directional &amp; Diagonal Movement
                    </p>
                    <p className="text-[#6E5641]">
                      Press W / Up to move forward, S / Down to move backward,
                      A / Left to move left, and D / Right to move right
                      relative to your camera view.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#F6F1E8] border border-[#E8DED0] space-y-1">
                    <p className="font-semibold text-[#27231F]">
                      Mouse Camera POV &amp; Facing
                    </p>
                    <p className="text-[#6E5641]">
                      Move your mouse to rotate the camera horizontally and
                      vertically. Your character faces your horizontal camera
                      direction. Press Escape anytime to release cursor capture.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#F6F1E8] border border-[#E8DED0] space-y-1">
                    <p className="font-semibold text-[#27231F]">
                      First-Person Cabin Elevator
                    </p>
                    <p className="text-[#6E5641]">
                      Approach the North Lift on any floor and press E to step
                      inside the cabin, close the doors, select a floor, and
                      travel vertically.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#F6F1E8] border border-[#E8DED0] space-y-1">
                    <p className="font-semibold text-[#27231F]">
                      Interactive Feature Wall
                    </p>
                    <p className="text-[#6E5641]">
                      Opposite the rooms on every floor, hover and click any of
                      the 9 panels with your mouse to open museum tools.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ============================================================================
   7. COMPACT PROFILE ICON MENU POPOVER
   ============================================================================ */
interface UnifiedHeaderPopoverProps {
  isOpen: boolean;
  currentUser: MuseumUserAccount | null;
  museumSettings: MuseumSettings;
  activeNav: ActiveNavTab;
  activeRoomId: string | null;
  floorsCount: number;
  activeRoomsCount: number;
  memoriesCount: number;
  onClose: () => void;
  onReturnTo3DAtrium: () => void;
  onNavigateTab: (
    tab: ActiveNavTab,
    exploreSub?: 'search' | 'map' | 'people' | 'dashboard',
  ) => void;
  onOpenWallSection: (section: WallFeatureId) => void;
  onOpenAddMemory: () => void;
  onStartTutorial: () => void;
  onRequestResetMuseum: () => void;
  onSignOut: () => void;
}

export const UnifiedHeaderPopover: React.FC<UnifiedHeaderPopoverProps> = ({
  isOpen,
  currentUser,
  museumSettings,
  activeNav,
  activeRoomId,
  floorsCount,
  activeRoomsCount,
  memoriesCount,
  onClose,
  onReturnTo3DAtrium,
  onNavigateTab,
  onOpenWallSection,
  onOpenAddMemory,
  onStartTutorial,
  onRequestResetMuseum,
  onSignOut,
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="menu"
      aria-label="Profile and Museum Navigation Menu"
      className="absolute right-0 mt-2 w-80 max-h-[85vh] overflow-y-auto bg-[#FFFCF6]/97 border border-[#E8DED0] rounded-2xl shadow-2xl p-4 z-50 space-y-3 pointer-events-auto backdrop-blur-xs"
    >
      {/* 1. Profile Details, Display Name & Account Email */}
      <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#E8DED0]">
        <button
          type="button"
          onClick={() => {
            onClose();
            onOpenWallSection('profile_privacy');
          }}
          className="flex items-center gap-3 text-left group cursor-pointer min-w-0"
        >
          <div className="w-10 h-10 rounded-xl bg-[#27231F] text-[#D6A15D] flex items-center justify-center shrink-0">
            <User className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="font-serif-display text-lg font-semibold text-[#27231F] group-hover:text-[#854D27] leading-tight truncate">
              {currentUser?.displayName || museumSettings.curatorName}
            </p>
            <p className="text-[11px] text-[#854D27] font-mono-tabular truncate">
              {currentUser?.email || 'Guest Museum Session'}
            </p>
            <p className="text-[10px] text-[#6E5641] mt-0.5">
              {floorsCount} Floors · {activeRoomsCount} Rooms · {memoriesCount}{' '}
              Memories
            </p>
          </div>
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close Profile Menu"
          className="p-1 rounded-lg text-[#6E5641] hover:text-[#27231F] cursor-pointer shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Quick Return to 3D Museum / Upload Memory */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => {
            onReturnTo3DAtrium();
            onClose();
          }}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
            activeNav === 'home' && !activeRoomId
              ? 'bg-[#27231F] text-[#FFFCF6]'
              : 'bg-[#F6F1E8] text-[#27231F] hover:bg-[#E9D4B1]/50'
          }`}
        >
          <Compass className="w-3.5 h-3.5 text-[#D6A15D]" />
          3D Museum
        </button>

        <button
          type="button"
          onClick={() => {
            onClose();
            onOpenAddMemory();
          }}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-[#D6A15D] text-[#27231F] hover:bg-[#E9D4B1] cursor-pointer transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Upload Memories
        </button>
      </div>

      {/* Ordered Destinations */}
      <div className="space-y-1">
        {[
          {
            label: 'Museum Settings',
            sub: 'Project name, camera sensitivity & tips',
            icon: Settings,
            onClick: () => onOpenWallSection('museum_settings'),
          },
          {
            label: 'Music & Playlists',
            sub: 'Spotify, YouTube & room soundscapes',
            icon: Music,
            onClick: () => onNavigateTab('soundscapes'),
          },
          {
            label: 'Rooms & Memories',
            sub: `${activeRoomsCount} active galleries · ${memoriesCount} memories`,
            icon: Layers,
            onClick: () => onNavigateTab('rooms'),
          },
          {
            label: 'Memory Library & Search',
            sub: `Browse & filter ${memoriesCount} exhibits`,
            icon: Search,
            onClick: () => onNavigateTab('explore', 'search'),
          },
          {
            label: 'AI Studio',
            sub: 'Curator, Image, Film & 3D Room Designer',
            icon: Sparkles,
            onClick: () => onNavigateTab('ai_studio'),
          },
          {
            label: 'Collections & Timeline',
            sub: 'Anthologies & chronological history',
            icon: FolderHeart,
            onClick: () => onOpenWallSection('collections_timeline'),
          },
          {
            label: 'Reopen Project Walkthrough',
            sub: 'Interactive 6-step museum & room guide',
            icon: HelpCircle,
            onClick: () => onStartTutorial(),
          },
          {
            label: 'Privacy and Data',
            sub: 'Profile details, data isolation & JSON export',
            icon: ShieldCheck,
            onClick: () => onOpenWallSection('profile_privacy'),
          },
        ].map((item) => {
          const IconComponent = item.icon;
          return (
            <button
              key={item.label}
              type="button"
              onClick={() => {
                item.onClick();
                onClose();
              }}
              className="w-full flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-xl hover:bg-[#F6F1E8] text-left transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-[#F6F1E8] border border-[#E8DED0] flex items-center justify-center shrink-0">
                  <IconComponent className="w-3.5 h-3.5 text-[#854D27]" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[#27231F] truncate">
                    {item.label}
                  </p>
                  <p className="text-[11px] text-[#6E5641] truncate">
                    {item.sub}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-[#856B52] shrink-0" />
            </button>
          );
        })}
      </div>

      {/* Footer Actions: Reset MEMORA & Sign Out */}
      <div className="pt-2.5 border-t border-[#E8DED0] flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => {
            onClose();
            onRequestResetMuseum();
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold text-[#991B1B] bg-[#FEE2E2]/60 hover:bg-[#FEE2E2] cursor-pointer"
        >
          <RotateCcw className="w-3 h-3" />
          Reset {BRAND.name}
        </button>

        <button
          type="button"
          onClick={() => {
            onClose();
            onSignOut();
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold bg-[#F6F1E8] border border-[#E8DED0] text-[#27231F] hover:bg-[#E9D4B1]/50 cursor-pointer"
        >
          <LogOut className="w-3 h-3 text-[#854D27]" />
          Sign Out
        </button>
      </div>
    </div>
  );
};
