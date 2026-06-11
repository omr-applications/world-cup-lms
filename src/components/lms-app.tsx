"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { FormEvent, useEffect, useMemo, useState, useTransition } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Icon } from "./icon";
import { Badge, Button, Field, Input, Panel, Select } from "./ui";

type GroupId = Id<"groups">;
type MatchId = Id<"matches">;
type TeamId = Id<"teams">;
type GroupTab = "matches" | "table" | "stats" | "setup";
type AuthMode = "signIn" | "signUp" | "resetRequest" | "resetVerify";
type ScheduleMode = "day" | "round";
type MineGroups = NonNullable<ReturnType<typeof useQuery<typeof api.groups.getMine>>>;

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function LmsApp() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { signOut } = useAuthActions();
  const ensureMe = useMutation(api.users.ensureMe);
  const groups = useQuery(api.groups.getMine);
  const [selectedGroupId, setSelectedGroupId] = useState<GroupId | null>(null);
  const [activeTab, setActiveTab] = useState<GroupTab>("matches");
  const firstGroupId = groups?.find((row) => row.group)?.group?._id as GroupId | undefined;
  const activeGroupId = selectedGroupId ?? firstGroupId ?? null;

  useEffect(() => {
    if (isAuthenticated) {
      void ensureMe();
    }
  }, [ensureMe, isAuthenticated]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  return (
    <main className="min-h-screen px-3 pb-[calc(8.5rem+env(safe-area-inset-bottom))] pt-2 text-foreground sm:px-6 sm:py-5 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-3 sm:gap-5">
        <header className="sticky top-0 z-20 -mx-3 border-b border-neutral-200 bg-white/90 px-3 py-2.5 backdrop-blur-xl sm:static sm:mx-0 sm:rounded-[28px] sm:border sm:px-4 sm:pb-4 sm:pt-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-full bg-black text-white shadow-[0_12px_28px_rgba(0,0,0,0.14)] sm:size-11">
                <Icon name="sports_soccer" size={21} filled />
              </div>
              <div className="min-w-0">
                <p className="truncate text-[11px] font-extrabold uppercase tracking-[0.18em] text-muted sm:text-xs">World Cup LMS</p>
                <h1 className="truncate text-lg font-black tracking-normal sm:text-2xl">Last player standing</h1>
              </div>
            </div>
            <Button variant="secondary" className="min-h-10 shrink-0 px-3 sm:min-h-11 sm:px-4" onClick={() => void signOut()} aria-label="Sign out">
              <Icon name="logout" size={16} />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </header>

        <section className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)] lg:gap-5">
          <aside className="hidden content-start gap-4 lg:grid">
            <CreateGroupPanel onCreated={setSelectedGroupId} />
            <JoinGroupPanel onJoined={setSelectedGroupId} />
            <GroupList
              groups={groups ?? []}
              selectedGroupId={activeGroupId}
              onSelect={setSelectedGroupId}
            />
          </aside>

          <GroupWorkspace
            groupId={activeGroupId}
            activeTab={activeTab}
            onActiveTabChange={setActiveTab}
            groups={groups ?? []}
            selectedGroupId={activeGroupId}
            onGroupSelect={setSelectedGroupId}
            onCreated={setSelectedGroupId}
            onJoined={setSelectedGroupId}
          />
        </section>
        <MobileBottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
    </main>
  );
}

function LoadingScreen() {
  return (
    <main className="grid min-h-screen place-items-center">
      <div className="flex items-center gap-3 rounded-lg border border-panel-border bg-panel px-4 py-3 text-sm font-medium shadow-sm">
        <Icon name="progress_activity" className="animate-spin text-accent" size={18} />
        Loading competition
      </div>
    </main>
  );
}

function AuthScreen() {
  const { signIn } = useAuthActions();
  const [mode, setMode] = useState<AuthMode>("signUp");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [resetEmail, setResetEmail] = useState("");
  const [isPending, startTransition] = useTransition();
  const isResetMode = mode === "resetRequest" || mode === "resetVerify";

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    if (email) {
      setResetEmail(email);
    }

    if (mode === "resetRequest") {
      formData.set("flow", "reset");
    } else if (mode === "resetVerify") {
      formData.set("flow", "reset-verification");
    } else {
      formData.set("flow", mode);
    }

    startTransition(async () => {
      try {
        await signIn("password", formData);
        if (mode === "resetRequest") {
          setMode("resetVerify");
          setNotice("Reset code sent. Check your email and enter the code below.");
        } else if (mode === "resetVerify") {
          setNotice("Password reset. Signing you in now.");
        }
      } catch (caught) {
        setError(authErrorMessage(caught, mode));
      }
    });
  }

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setError(null);
    setNotice(null);
  }

  return (
    <main className="min-h-screen px-4 py-5 text-foreground sm:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-2.5rem)] max-w-5xl content-center gap-5 lg:grid-cols-[1fr_400px] lg:gap-8">
        <section className="relative overflow-hidden rounded-[34px] bg-black p-5 text-white shadow-[0_24px_70px_rgba(0,0,0,0.18)] sm:p-8">
          <div className="absolute inset-0 opacity-15 [background-image:linear-gradient(135deg,transparent_0_20%,rgba(255,255,255,.65)_20%_24%,transparent_24%_46%,rgba(255,255,255,.5)_46%_50%,transparent_50%)]" />
          <div className="relative grid gap-4 lg:gap-5">
          <div className="flex items-center gap-3">
            <div className="grid size-12 place-items-center rounded-full bg-white/18 text-white ring-1 ring-white/30 backdrop-blur sm:size-14">
              <Icon name="trophy" size={24} filled />
            </div>
            <div>
              <span className="text-sm font-extrabold uppercase tracking-[0.16em] text-white/80">World Cup LMS</span>
              <p className="text-sm text-white/64 lg:hidden">Private groups. Daily tension. One winner.</p>
            </div>
          </div>
          <div className="max-w-2xl">
            <h1 className="text-4xl font-black tracking-normal text-white sm:text-6xl">
              Pick winners by round or match day. Survive until the final player falls.
            </h1>
            <p className="mt-3 text-base font-medium leading-7 text-white/78 sm:mt-4">
              Create private World Cup groups, share a join code, lock picks by kickoff, and let host-entered
              results decide who stays alive.
            </p>
          </div>
          <div className="grid border-t border-white/18 pt-4 sm:grid-cols-3">
            {[
              ["Per-match locks", "Picks can change until the chosen match kicks off."],
              ["No repeats", "Each player can only use a team once per group."],
              ["Host control", "Results are entered manually for v1."],
            ].map(([title, body]) => (
              <div key={title} className="border-b border-white/14 py-3 sm:border-b-0 sm:border-r sm:px-4 sm:first:pl-0 sm:last:border-r-0">
                <p className="text-lg font-bold leading-none">{title}</p>
                <p className="mt-1 text-base leading-5 text-white/74">{body}</p>
              </div>
            ))}
          </div>
          </div>
        </section>

        <Panel className="p-4 sm:p-5">
          {isResetMode ? (
            <div className="mb-5">
              <button
                type="button"
                className="inline-flex items-center gap-2 text-sm font-black text-muted transition hover:text-black"
                onClick={() => switchMode("signIn")}
              >
                <Icon name="logout" size={15} />
                Back to sign in
              </button>
              <h2 className="mt-4 text-3xl font-black leading-none">
                {mode === "resetRequest" ? "Reset password" : "Enter reset code"}
              </h2>
              <p className="mt-2 text-base leading-5 text-muted">
                {mode === "resetRequest"
                  ? "We will email you a short code to set a new password."
                  : "Use the code from your email and choose a new password."}
              </p>
            </div>
          ) : (
          <div className="mb-5 flex rounded-full bg-neutral-100 p-1">
            <button
              type="button"
              className={`min-h-10 flex-1 rounded-full px-3 text-sm font-extrabold ${mode === "signUp" ? "bg-white text-black shadow-sm" : "text-muted"}`}
              onClick={() => switchMode("signUp")}
            >
              Sign up
            </button>
            <button
              type="button"
              className={`min-h-10 flex-1 rounded-full px-3 text-sm font-extrabold ${mode === "signIn" ? "bg-white text-black shadow-sm" : "text-muted"}`}
              onClick={() => switchMode("signIn")}
            >
              Sign in
            </button>
          </div>
          )}
          <form className="grid gap-4" onSubmit={submit}>
            {mode === "signUp" ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="First name">
                  <Input name="firstName" type="text" autoComplete="given-name" required placeholder="Alex" />
                </Field>
                <Field label="Last name">
                  <Input name="lastName" type="text" autoComplete="family-name" required placeholder="Morgan" />
                </Field>
              </div>
            ) : null}
            <Field label="Email">
              <Input
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@example.com"
                defaultValue={mode === "resetVerify" ? resetEmail : undefined}
              />
            </Field>
            {mode === "resetVerify" ? (
              <Field label="Reset code">
                <Input name="code" type="text" autoComplete="one-time-code" required placeholder="123456" />
              </Field>
            ) : null}
            {mode !== "resetRequest" ? (
            <Field label={mode === "resetVerify" ? "New password" : "Password"}>
              <Input
                name={mode === "resetVerify" ? "newPassword" : "password"}
                type="password"
                autoComplete={mode === "signIn" ? "current-password" : "new-password"}
                minLength={8}
                required
              />
            </Field>
            ) : null}
            {mode === "signIn" ? (
              <button
                type="button"
                className="-mt-1 justify-self-start text-sm font-black text-muted transition hover:text-black"
                onClick={() => switchMode("resetRequest")}
              >
                Forgot password?
              </button>
            ) : null}
            {notice ? <p className="rounded-2xl bg-black px-3 py-2 text-sm font-semibold text-white">{notice}</p> : null}
            {error ? <p className="rounded-2xl bg-neutral-100 px-3 py-2 text-sm font-semibold text-black ring-1 ring-neutral-200">{error}</p> : null}
            <Button type="submit" disabled={isPending}>
              {isPending ? <Icon name="progress_activity" className="animate-spin" size={16} /> : <Icon name="shield" size={16} />}
              {mode === "signUp"
                ? "Create account"
                : mode === "resetRequest"
                  ? "Send reset code"
                  : mode === "resetVerify"
                    ? "Reset password"
                    : "Sign in"}
            </Button>
          </form>
        </Panel>
      </div>
    </main>
  );
}

function authErrorMessage(caught: unknown, mode: AuthMode) {
  const message = caught instanceof Error ? caught.message : String(caught);

  if (mode === "signUp" && /server error|already exists|account/i.test(message)) {
    return "An account already exists for that email. Switch to sign in instead.";
  }
  if (mode === "signIn" && /server error|invalid|account|credentials/i.test(message)) {
    return "Could not sign in. Check your email and password, or reset your password.";
  }
  if (mode === "resetRequest" && /server error|invalidaccountid|account/i.test(message)) {
    return "No account was found for that email. Check the address or create an account.";
  }
  if (mode === "resetRequest" && /resend_api_key|not configured|password reset email/i.test(message)) {
    return "Password reset email is not configured yet. Ask the app owner to add the email sending key.";
  }
  if (mode === "resetVerify" && /server error|invalid|code/i.test(message)) {
    return "That reset code did not work. Check the code and try again.";
  }

  return message || "Auth request failed.";
}

function SetupView({
  groups,
  selectedGroupId,
  onGroupSelect,
  onCreated,
  onJoined,
}: {
  groups: MineGroups;
  selectedGroupId: GroupId | null;
  onGroupSelect: (groupId: GroupId) => void;
  onCreated: (groupId: GroupId) => void;
  onJoined: (groupId: GroupId) => void;
}) {
  return (
    <section className="grid gap-3 sm:gap-4">
      <div className="px-1">
        <h3 className="text-3xl font-black leading-none text-black sm:text-4xl">Setup</h3>
        <p className="mt-1 text-base leading-5 text-muted sm:text-lg">
          Create a group, join by code, or switch between your groups.
        </p>
      </div>
      <div className="lg:hidden">
        <GroupList groups={groups} selectedGroupId={selectedGroupId} onSelect={onGroupSelect} compact />
      </div>
      <CreateGroupPanel onCreated={onCreated} />
      <JoinGroupPanel onJoined={onJoined} />
    </section>
  );
}

function MobileBottomNav({
  activeTab,
  onTabChange,
}: {
  activeTab: GroupTab;
  onTabChange: (tab: GroupTab) => void;
}) {
  const navItems = [
    { icon: "calendar_month", label: "Matches", tab: "matches" as const },
    { icon: "table_chart", label: "Table", tab: "table" as const },
    { icon: "speed", label: "Stats", tab: "stats" as const },
    { icon: "add", label: "Setup", tab: "setup" as const },
  ];

  return (
    <nav className="fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-30 grid grid-cols-4 gap-1.5 rounded-[28px] bg-white/92 p-2 shadow-[0_18px_50px_rgba(0,0,0,0.16)] ring-1 ring-neutral-200 backdrop-blur-xl lg:hidden" aria-label="Primary">
      {navItems.map(({ icon, label, tab }) => {
        const active = tab ? activeTab === tab : false;
        return (
          <button
            key={label}
            type="button"
            onClick={() => {
              onTabChange(tab);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className={`grid min-h-14 place-items-center rounded-[20px] text-[11px] font-extrabold leading-none transition ${
              active ? "bg-black text-white shadow-[0_10px_24px_rgba(0,0,0,0.18)]" : "text-neutral-500 active:bg-neutral-100"
            }`}
          >
            <Icon name={icon} size={20} filled={active} />
            {label}
          </button>
        );
      })}
    </nav>
  );
}

function CreateGroupPanel({ onCreated }: { onCreated: (groupId: GroupId) => void }) {
  const tournaments = useQuery(api.tournaments.list);
  const createGroup = useMutation(api.groups.create);
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>("");
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>("round");
  const [selectedPickWindowKey, setSelectedPickWindowKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const activeTournamentId = selectedTournamentId || tournaments?.[0]?._id || "";
  const selectedTournament = tournaments?.find((tournament) => tournament._id === activeTournamentId);
  const pickWindowOptions =
    scheduleMode === "round"
      ? selectedTournament?.roundWindows ?? []
      : selectedTournament?.dayWindows ?? [];
  const activePickWindow =
    pickWindowOptions.find((window) => window.key === selectedPickWindowKey) ?? pickWindowOptions[0];
  const activePickWindowKey = activePickWindow?.key ?? "";
  const activeStartDayKey = activePickWindow?.firstDayKey ?? activePickWindowKey;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "");

    startTransition(async () => {
      try {
        const groupId = await createGroup({
          name,
          tournamentId: activeTournamentId as Id<"tournaments">,
          scheduleMode,
          startDayKey: activeStartDayKey,
          startPickWindowKey: activePickWindowKey,
        });
        event.currentTarget.reset();
        onCreated(groupId);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Could not create group.");
      }
    });
  }

  return (
    <Panel>
      <h2 className="text-base font-semibold">Create group</h2>
      <form className="mt-4 grid gap-3" onSubmit={submit}>
        <Field label="Group name">
          <Input name="name" minLength={3} required placeholder="Office sweep" />
        </Field>
        <Field label="Tournament">
          <Select
            required
            value={activeTournamentId}
            onChange={(event) => {
              const nextTournament = tournaments?.find((tournament) => tournament._id === event.target.value);
              setSelectedTournamentId(event.target.value);
              const nextWindows = scheduleMode === "round" ? nextTournament?.roundWindows : nextTournament?.dayWindows;
              setSelectedPickWindowKey(nextWindows?.[0]?.key ?? "");
            }}
          >
            {(tournaments ?? []).map((tournament) => (
              <option key={tournament._id} value={tournament._id}>
                {tournament.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Pick cadence">
          <Select
            required
            value={scheduleMode}
            onChange={(event) => {
              const nextMode = event.target.value as ScheduleMode;
              setScheduleMode(nextMode);
              const nextWindows = nextMode === "round" ? selectedTournament?.roundWindows : selectedTournament?.dayWindows;
              setSelectedPickWindowKey(nextWindows?.[0]?.key ?? "");
            }}
          >
            <option value="round">Per round</option>
            <option value="day">Per day</option>
          </Select>
        </Field>
        <Field label={scheduleMode === "round" ? "Start round" : "Start day"}>
          <Select required value={activePickWindowKey} onChange={(event) => setSelectedPickWindowKey(event.target.value)}>
            {pickWindowOptions.map((window) => (
              <option key={window.key} value={window.key}>
                {window.label}
              </option>
            ))}
          </Select>
        </Field>
        {error ? <p className="rounded-2xl bg-neutral-100 px-3 py-2 text-sm font-semibold text-black ring-1 ring-neutral-200">{error}</p> : null}
        <Button type="submit" disabled={isPending || !activeTournamentId || !activePickWindowKey}>
          {isPending ? <Icon name="progress_activity" className="animate-spin" size={16} /> : <Icon name="add" size={16} />}
          Create
        </Button>
      </form>
    </Panel>
  );
}

function JoinGroupPanel({ onJoined }: { onJoined: (groupId: GroupId) => void }) {
  const joinByCode = useMutation(api.groups.joinByCode);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = event.currentTarget;
    const code = String(new FormData(form).get("code") ?? "");

    startTransition(async () => {
      try {
        const groupId = await joinByCode({ code });
        form.reset();
        onJoined(groupId);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Could not join group.");
      }
    });
  }

  return (
    <Panel>
      <h2 className="text-base font-semibold">Join group</h2>
      <form className="mt-4 grid gap-3" onSubmit={submit}>
        <Field label="Join code">
          <Input name="code" required placeholder="AB12CD" className="font-mono uppercase" />
        </Field>
        {error ? <p className="rounded-2xl bg-neutral-100 px-3 py-2 text-sm font-semibold text-black ring-1 ring-neutral-200">{error}</p> : null}
        <Button type="submit" variant="secondary" disabled={isPending}>
          {isPending ? <Icon name="progress_activity" className="animate-spin" size={16} /> : <Icon name="groups" size={16} />}
          Join
        </Button>
      </form>
    </Panel>
  );
}

function GroupList({
  groups,
  selectedGroupId,
  onSelect,
  compact = false,
}: {
  groups: MineGroups;
  selectedGroupId: GroupId | null;
  onSelect: (groupId: GroupId) => void;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <section className="rounded-[24px] bg-white/78 p-3 shadow-[0_10px_28px_rgba(0,0,0,0.04)] ring-1 ring-neutral-200 backdrop-blur">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold leading-none text-black">Your groups</h2>
          <Badge tone="neutral">{groups.length}</Badge>
        </div>
        {groups.length === 0 ? (
          <p className="text-sm leading-6 text-muted">Create a group or join one with a code.</p>
        ) : (
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {groups.map((row) =>
              row.group ? (
                <button
                  key={row.group._id}
                  type="button"
                  onClick={() => onSelect(row.group!._id)}
                  className={`min-w-48 rounded-[20px] px-4 py-3 text-left transition ${
                    selectedGroupId === row.group._id
                      ? "bg-black text-white"
                      : "bg-white text-foreground ring-1 ring-neutral-200"
                  }`}
                >
                  <p className="truncate text-sm font-semibold">{row.group.name}</p>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <span className={`text-xs ${selectedGroupId === row.group._id ? "text-white/75" : "text-muted"}`}>{row.memberCount} members</span>
                    <Badge tone={row.membership.status === "active" ? "success" : row.membership.status === "winner" ? "accent" : "danger"}>
                      {row.membership.status}
                    </Badge>
                  </div>
                </button>
              ) : null,
            )}
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="border-t border-neutral-200 pt-4">
      <h2 className="text-xl font-black leading-none text-black">My groups</h2>
      <div className="mt-3 grid divide-y divide-neutral-200">
        {groups.length === 0 ? (
          <p className="text-sm leading-6 text-muted">Create a group or join one with a code.</p>
        ) : (
          groups.map((row) =>
            row.group ? (
              <button
                key={row.group._id}
                type="button"
                onClick={() => onSelect(row.group!._id)}
                className={`py-3 text-left transition ${
                  selectedGroupId === row.group._id
                    ? "text-black"
                    : "text-neutral-500 hover:text-black"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-lg font-bold leading-none">{row.group.name}</p>
                  <Badge tone={row.membership.status === "active" ? "success" : row.membership.status === "winner" ? "accent" : "danger"}>
                    {row.membership.status}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted">{row.memberCount} members</p>
              </button>
            ) : null,
          )
        )}
      </div>
    </section>
  );
}

function GroupWorkspace({
  groupId,
  activeTab,
  onActiveTabChange,
  groups,
  selectedGroupId,
  onGroupSelect,
  onCreated,
  onJoined,
}: {
  groupId: GroupId | null;
  activeTab: GroupTab;
  onActiveTabChange: (tab: GroupTab) => void;
  groups: MineGroups;
  selectedGroupId: GroupId | null;
  onGroupSelect: (groupId: GroupId) => void;
  onCreated: (groupId: GroupId) => void;
  onJoined: (groupId: GroupId) => void;
}) {
  const detail = useQuery(api.groups.getDetail, groupId ? { groupId, clientVersion: 2 } : "skip");
  const [pickWindowKey, setPickWindowKey] = useState("");
  const [readyMatchPanelKey, setReadyMatchPanelKey] = useState("");
  const activePickWindowKey = detail
    ? pickWindowKey && detail.pickWindows.some((window) => window.key === pickWindowKey)
      ? pickWindowKey
      : detail.pickWindows[0]?.key ?? ""
    : "";
  const activePickWindow = detail?.pickWindows.find((window) => window.key === activePickWindowKey);
  const matchPanelKey = `${groupId ?? "none"}:${activePickWindowKey}`;
  const preloadedMatches = detail?.matchesByWindow?.find((window) => window.pickWindowKey === activePickWindowKey)?.matches;
  useEffect(() => {
    if (activeTab !== "matches" || !activePickWindowKey || preloadedMatches) {
      return;
    }
    const timeout = window.setTimeout(() => setReadyMatchPanelKey(matchPanelKey), 600);
    return () => window.clearTimeout(timeout);
  }, [activePickWindowKey, activeTab, matchPanelKey, preloadedMatches]);

  if (activeTab === "setup") {
    return (
      <SetupView
        groups={groups}
        selectedGroupId={selectedGroupId}
        onGroupSelect={onGroupSelect}
        onCreated={onCreated}
        onJoined={onJoined}
      />
    );
  }

  if (!groupId) {
    return (
      <div className="grid min-h-72 place-items-center rounded-lg border border-dashed border-panel-border bg-white/70 p-6 sm:min-h-[520px]">
        <div className="max-w-sm text-center">
          <Icon name="trophy" className="mx-auto text-accent" size={32} filled />
          <h2 className="mt-3 text-lg font-semibold">No group selected</h2>
          <p className="mt-2 text-sm leading-6 text-muted">Create or join a group to start making World Cup picks.</p>
          <Button type="button" className="mt-4" onClick={() => onActiveTabChange("setup")}>
            <Icon name="add" size={16} />
            Open setup
          </Button>
        </div>
      </div>
    );
  }

  if (!detail) {
    return <LoadingScreen />;
  }

  const standings = detail.standings;
  const myPicks = detail.myPicks;
  const activeMatches = preloadedMatches;
  const activeMembers = detail.members.filter((member) => member.membership.status === "active").length;
  const eliminatedMembers = detail.members.filter((member) => member.membership.status === "eliminated").length;
  const scheduleMode = detail.group.scheduleMode ?? "day";
  const pickTitle =
    scheduleMode === "round" ? `${activePickWindow?.label ?? "Round"} picks` : "Match day picks";
  const pickDescription =
    scheduleMode === "round"
      ? "Choose one winner from all fixtures in this round. You can edit until your selected match kicks off."
      : "Choose one winner from this day. You can edit until your selected match kicks off.";

  return (
    <div className="grid content-start gap-3 sm:gap-5">
      <section className="-mx-3 overflow-hidden rounded-b-[34px] bg-black text-white shadow-[0_22px_54px_rgba(0,0,0,0.16)] sm:mx-0 sm:rounded-[36px] sm:shadow-[0_26px_70px_rgba(0,0,0,0.18)]">
        <div className="relative px-5 pb-5 pt-6 sm:p-8">
          <div className="absolute inset-0 opacity-25 [background-image:linear-gradient(145deg,transparent_0_20%,rgba(255,255,255,.5)_20%_24%,transparent_24%_45%,rgba(255,255,255,.38)_45%_49%,transparent_49%_72%,rgba(255,255,255,.28)_72%_76%,transparent_76%)]" />
          <div className="absolute inset-x-8 bottom-0 h-16 rounded-t-full border-x-2 border-t-2 border-white/18 sm:h-20" />
          <div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="min-w-0">
              <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-extrabold uppercase tracking-[0.16em] text-white/85 ring-1 ring-white/20 sm:text-sm">
                <Icon name="auto_awesome" size={14} />
                Season
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <h2 className="truncate text-4xl font-black leading-[0.9] tracking-normal sm:text-6xl">{detail.group.name}</h2>
              </div>
              <p className="mt-3 text-sm font-medium text-white/85">
                {detail.tournament?.name} · {scheduleMode === "round" ? "per round" : "per day"} · starts {detail.pickWindows[0]?.label ?? detail.group.startDayKey}
              </p>
              <div className="mt-5 grid grid-cols-3 gap-2">
                <HeroMetric label="Alive" value={activeMembers} />
                <HeroMetric label="Out" value={eliminatedMembers} />
                <HeroMetric label="You" value={detail.currentMembership.status} />
              </div>
            </div>
            <button
              type="button"
              onClick={() => void navigator.clipboard.writeText(detail.group.code)}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-white px-5 font-mono text-sm font-black text-black shadow-[0_14px_32px_rgba(0,0,0,0.16)] hover:bg-neutral-100 md:justify-start"
            >
              <Icon name="content_copy" size={15} />
              {detail.group.code}
            </button>
          </div>
        </div>
      </section>

      <nav className="hidden gap-2 overflow-x-auto rounded-full bg-white/68 p-1.5 shadow-sm ring-1 ring-white/80 backdrop-blur lg:flex" aria-label="Group sections">
        {[
          ["matches", "Matches", "calendar_month"],
          ["table", "Table", "table_chart"],
          ["stats", "Stats", "speed"],
        ].map(([value, label, icon]) => (
          <button
            key={value as string}
            type="button"
            onClick={() => onActiveTabChange(value as GroupTab)}
            className={`relative flex min-h-10 items-center gap-2 whitespace-nowrap rounded-full px-4 text-sm font-black transition sm:min-h-11 sm:text-base ${
              activeTab === value ? "bg-black text-white shadow-[0_10px_24px_rgba(0,0,0,0.14)]" : "text-neutral-500"
            }`}
          >
            <Icon name={icon as string} size={18} filled={activeTab === value} />
            {label as string}
          </button>
        ))}
      </nav>

      {activeTab === "matches" ? (
        <section className="grid gap-4 xl:grid-cols-[1fr_360px] xl:gap-5">
          <div className="grid content-start gap-4 sm:gap-5">
            <section className="grid gap-3 sm:gap-4">
              <div className="flex flex-col gap-3 px-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h3 className="text-3xl font-black leading-none text-black sm:text-4xl">{pickTitle}</h3>
                  <p className="mt-1 text-base leading-5 text-muted sm:text-lg">
                    {pickDescription}
                  </p>
                </div>
                <Select value={activePickWindowKey} onChange={(event) => setPickWindowKey(event.target.value)} className="sm:max-w-60">
                  {detail.pickWindows.map((window) => (
                    <option key={window.key} value={window.key}>
                      {window.label}
                    </option>
                  ))}
                </Select>
              </div>
              {activePickWindowKey && (preloadedMatches || readyMatchPanelKey === matchPanelKey) ? (
                <MatchDayContainer
                  key={matchPanelKey}
                  groupId={groupId}
                  pickWindowKey={activePickWindowKey}
                  pickWindowLabel={activePickWindow?.label ?? activePickWindowKey}
                  scheduleMode={scheduleMode}
                  selectionResetAt={detail.group.selectionResetAt}
                  matches={activeMatches}
                  picks={myPicks}
                />
              ) : (
                <div className="mt-5 flex min-h-28 items-center justify-center gap-2 rounded-[26px] bg-white/82 text-sm font-bold text-muted ring-1 ring-neutral-200">
                  <Icon name="progress_activity" className="animate-spin" size={18} />
                  Loading fixtures
                </div>
              )}
            </section>
          </div>

          <aside className="hidden content-start gap-3 xl:grid xl:gap-5">
            <Standings groupId={groupId} rows={standings} />
            <SelectionResetPanel groupId={groupId} />
            <MyPicks groupId={groupId} selectionResetAt={detail.group.selectionResetAt} picks={myPicks} />
          </aside>
        </section>
      ) : null}

      {activeTab === "table" ? (
        <section className="grid gap-3 sm:gap-5">
          <Standings groupId={groupId} rows={standings} expanded />
          <SelectionResetPanel groupId={groupId} />
        </section>
      ) : null}

      {activeTab === "stats" ? (
        <GroupStats
          groupId={groupId}
          picks={myPicks}
          selectionResetAt={detail.group.selectionResetAt}
          activeMembers={activeMembers}
          eliminatedMembers={eliminatedMembers}
          totalMembers={detail.members.length}
        />
      ) : null}
    </div>
  );
}

function HeroMetric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl bg-white/14 px-3 py-2 ring-1 ring-white/20 backdrop-blur">
      <p className="text-xs font-semibold text-white/75">{label}</p>
      <p className="mt-0.5 truncate text-sm font-semibold capitalize text-white">{value}</p>
    </div>
  );
}

function MatchDayContainer({
  groupId,
  pickWindowKey,
  pickWindowLabel,
  scheduleMode,
  selectionResetAt,
  matches,
  picks,
}: {
  groupId: GroupId;
  pickWindowKey: string;
  pickWindowLabel: string;
  scheduleMode: ScheduleMode;
  selectionResetAt?: number;
  matches?: MatchForUi[];
  picks?: PickForUi[];
}) {
  const fetchedMatches = useQuery(api.matches.listForGroupWindow, matches ? "skip" : { groupId, pickWindowKey });
  return (
    <MatchDay
      groupId={groupId}
      pickWindowKey={pickWindowKey}
      pickWindowLabel={pickWindowLabel}
      scheduleMode={scheduleMode}
      selectionResetAt={selectionResetAt}
      matches={matches ?? fetchedMatches}
      picks={picks}
    />
  );
}

function MatchDay({
  groupId,
  pickWindowKey,
  pickWindowLabel,
  scheduleMode,
  selectionResetAt,
  matches,
  picks,
}: {
  groupId: GroupId;
  pickWindowKey: string;
  pickWindowLabel: string;
  scheduleMode: ScheduleMode;
  selectionResetAt?: number;
  matches?: MatchForUi[];
  picks?: PickForUi[];
}) {
  const fetchedPicks = useQuery(api.picks.listMine, picks ? "skip" : { groupId });
  const activeMatches = matches;
  const activePicks = picks ?? fetchedPicks;
  const makePick = useMutation(api.picks.upsert);
  const dayPick = activePicks?.find((pick) => pickWindowKeyForUi(pick) === pickWindowKey);
  const [draftPick, setDraftPick] = useState<{ dayKey: string; pickWindowKey: string; matchId: MatchId; teamId: TeamId; teamName: string } | null>(null);
  const usedTeamIds = useMemo(
    () =>
      new Set(
        (activePicks ?? [])
          .filter((pick) => pickWindowKeyForUi(pick) !== pickWindowKey && (!selectionResetAt || pick.createdAt > selectionResetAt))
          .map((pick) => pick.teamId),
      ),
    [pickWindowKey, activePicks, selectionResetAt],
  );
  const usedPicks = useMemo(
    () =>
      (activePicks ?? [])
        .filter((pick) => pickWindowKeyForUi(pick) !== pickWindowKey && pick.team && (!selectionResetAt || pick.createdAt > selectionResetAt))
        .map((pick) => ({ _id: pick._id, label: formatPickWindowLabel(pick.pickWindowKey ?? pick.dayKey), team: pick.team })),
    [pickWindowKey, activePicks, selectionResetAt],
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [clientNow] = useState(() => Date.now());
  const savedPick = dayPick?.team
    ? {
        dayKey: dayPick.dayKey,
        pickWindowKey,
        matchId: dayPick.matchId as MatchId,
        teamId: dayPick.teamId as TeamId,
        teamName: dayPick.team.name,
      }
    : null;
  const activeDraftPick = draftPick?.pickWindowKey === pickWindowKey ? draftPick : savedPick;
  const hasUnsavedPick = Boolean(
    activeDraftPick &&
      (!dayPick || dayPick.teamId !== activeDraftPick.teamId || dayPick.matchId !== activeDraftPick.matchId),
  );

  function savePick() {
    if (!activeDraftPick) {
      return;
    }

    startTransition(async () => {
      try {
        setError(null);
        await makePick({
          groupId,
          dayKey: activeDraftPick.dayKey,
          pickWindowKey,
          matchId: activeDraftPick.matchId,
          teamId: activeDraftPick.teamId,
        });
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Could not save pick.");
      }
    });
  }

  if (!activeMatches) {
    return (
      <div className="mt-5 flex min-h-28 items-center justify-center gap-2 rounded-[26px] bg-white/82 text-sm font-bold text-muted ring-1 ring-neutral-200">
        <Icon name="progress_activity" className="animate-spin" size={18} />
        Loading fixtures
      </div>
    );
  }

  if (activeMatches.length === 0) {
    return (
      <div className="mt-5 rounded-[26px] bg-white/82 p-5 ring-1 ring-neutral-200">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-full bg-neutral-100 text-black">
            <Icon name="calendar_month" size={19} />
          </span>
          <div>
            <p className="text-xl font-black leading-none text-black">No fixtures for this {scheduleMode === "round" ? "round" : "day"}</p>
            <p className="mt-1 text-sm font-semibold text-muted">Try another World Cup {scheduleMode === "round" ? "round" : "day"}.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:mt-2">
      <div className="-mx-3 bg-black px-4 py-3 text-white sm:mx-0 sm:rounded-[24px]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Icon name="speed" className="text-white" size={17} />
            <p className="text-base font-bold leading-none sm:text-lg">
              {dayPick?.team?.name
                ? `Saved: ${dayPick.team.name}`
                : scheduleMode === "round"
                  ? `Pick one team for ${pickWindowLabel}`
                  : "Pick one team to win today"}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="hidden sm:block">
              <Button
                type="button"
                variant="secondary"
                className="min-h-10 border-white bg-white px-5 text-black shadow-none hover:bg-neutral-100"
                disabled={isPending || !hasUnsavedPick}
                onClick={savePick}
              >
                {isPending ? <Icon name="progress_activity" className="animate-spin" size={16} /> : <Icon name="check" size={16} />}
                {activeDraftPick ? `Confirm ${activeDraftPick.teamName}` : "Confirm pick"}
              </Button>
            </div>
          </div>
        </div>
        <p className="mt-2 text-xs font-medium leading-5 text-white/75 sm:text-sm">
          {pickWindowLabel}. Previously picked teams are unavailable. Draws count as not winning.
        </p>
      </div>

      <UsedTeamsStrip picks={usedPicks} />
      {error ? <p className="rounded-2xl bg-neutral-100 px-3 py-2 text-sm font-semibold text-black ring-1 ring-neutral-200">{error}</p> : null}

      <div className="-mx-3 overflow-hidden bg-white/96 ring-1 ring-neutral-200 backdrop-blur sm:mx-0 sm:rounded-[26px]">
        {activeMatches.map((match) => {
          const kickoffPassed = match.kickoffAt <= clientNow;
          const selectedTeamId = activeDraftPick?.matchId === match._id ? activeDraftPick.teamId : null;
          const locked = kickoffPassed || match.status === "complete";

          return (
            <div key={match._id} className="border-b border-neutral-200/80 px-3 py-4 last:border-b-0 sm:p-4">
              <div className="mb-3 flex items-center justify-between gap-3 px-1">
                <p className="min-w-0 truncate text-xs font-black uppercase tracking-wide text-neutral-500">
                  {match.venue}
                  <span className="px-1.5 text-neutral-300"> | </span>
                  <span className="text-neutral-700">{dateFormatter.format(new Date(match.kickoffAt))}</span>
                </p>
                <p className="shrink-0 text-xs font-black uppercase tracking-wide text-neutral-500">
                  {match.status === "complete" ? "FT" : kickoffPassed ? "Locked" : "Open"}
                </p>
              </div>
              <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-0.5 sm:gap-3">
                <TeamPickSide
                  team={match.homeTeam}
                  selected={selectedTeamId === match.homeTeam?._id}
                  unavailable={Boolean(match.homeTeam && usedTeamIds.has(match.homeTeam._id))}
                  locked={locked}
                  onSelect={() =>
                    match.homeTeam
                      ? setDraftPick({
                          dayKey: match.dayKey,
                          pickWindowKey,
                          matchId: match._id as MatchId,
                          teamId: match.homeTeam._id as TeamId,
                          teamName: match.homeTeam.name ?? "Team",
                        })
                      : null
                  }
                />
                <div className="grid justify-items-center gap-1 text-center">
                  <span className="grid min-h-10 min-w-7 place-items-center px-0.5 text-2xl font-black leading-none text-black sm:min-w-12 sm:px-1 sm:text-3xl">
                    {match.status === "complete" ? `${match.homeScore} - ${match.awayScore}` : "v"}
                  </span>
                  <span className="hidden text-xs font-bold uppercase tracking-wide text-muted sm:block">
                    {match.status === "complete" ? "FT" : kickoffPassed ? "Locked" : "Open"}
                  </span>
                </div>
                <TeamPickSide
                  team={match.awayTeam}
                  selected={selectedTeamId === match.awayTeam?._id}
                  unavailable={Boolean(match.awayTeam && usedTeamIds.has(match.awayTeam._id))}
                  locked={locked}
                  onSelect={() =>
                    match.awayTeam
                      ? setDraftPick({
                          dayKey: match.dayKey,
                          pickWindowKey,
                          matchId: match._id as MatchId,
                          teamId: match.awayTeam._id as TeamId,
                          teamName: match.awayTeam.name ?? "Team",
                        })
                      : null
                  }
                />
              </div>
            </div>
          );
        })}
      </div>
      {hasUnsavedPick ? (
        <div className="fixed inset-x-3 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-20 lg:hidden">
          <Button
            type="button"
            className="min-h-14 w-full bg-black text-white shadow-[0_18px_38px_rgba(0,0,0,0.24)]"
            disabled={isPending}
            onClick={savePick}
          >
            {isPending ? <Icon name="progress_activity" className="animate-spin" size={16} /> : <Icon name="check" size={16} />}
            Confirm {activeDraftPick?.teamName}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

type TeamForUi = {
  name?: string;
  code?: string;
  flagUrl?: string;
  fifaRank?: number;
  rankingPoints?: number;
  group?: string;
  fifaTeamUrl?: string;
  squadUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
} | null;

type TeamWithIdForUi = (NonNullable<TeamForUi> & { _id: TeamId }) | null;

type MatchForUi = {
  _id: MatchId;
  dayKey: string;
  kickoffAt: number;
  status: "scheduled" | "complete";
  homeScore?: number;
  awayScore?: number;
  venue: string;
  homeTeam: TeamWithIdForUi;
  awayTeam: TeamWithIdForUi;
};

type PickForUi = {
  _id: Id<"picks">;
  dayKey: string;
  pickWindowKey?: string;
  matchId: MatchId;
  teamId: TeamId;
  status: "pending" | "won" | "lost";
  createdAt: number;
  team: TeamForUi;
  match: MatchForUi | null;
};

function pickWindowKeyForUi(pick: { dayKey: string; pickWindowKey?: string }) {
  return pick.pickWindowKey ?? pick.dayKey;
}

function formatPickWindowLabel(key: string) {
  const labels: Record<string, string> = {
    "group-round-1": "Group Round 1",
    "group-round-2": "Group Round 2",
    "group-round-3": "Group Round 3",
    "round-of-32": "Last 32",
    "round-of-16": "Last 16",
    "quarter-finals": "Quarter-finals",
    "semi-finals": "Semi-finals",
    final: "Final",
  };
  return labels[key] ?? key;
}

function UsedTeamsStrip({ picks }: { picks: Array<{ _id: string; label: string; team: TeamForUi }> }) {
  if (picks.length === 0) {
    return (
      <div className="-mx-3 border-y border-neutral-200 bg-white/70 px-4 py-3 sm:mx-0 sm:rounded-[20px] sm:border">
        <p className="text-sm font-bold uppercase tracking-wide text-muted">No previously picked teams yet</p>
      </div>
    );
  }

  return (
    <div className="-mx-3 border-y border-neutral-200 bg-white/80 px-4 py-3 sm:mx-0 sm:rounded-[20px] sm:border">
      <p className="text-sm font-bold uppercase tracking-wide text-muted">Previously picked</p>
      <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
        {picks.map((pick) => (
          <span key={pick._id} className="inline-flex shrink-0 items-center gap-2 rounded-full bg-neutral-100 px-3 py-2 text-sm font-bold text-neutral-700">
            <TeamFlag team={pick.team} size="sm" />
            {pick.team?.name ?? "Team"}
            <span className="font-mono text-xs text-muted">{pick.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function TeamPickSide({
  team,
  selected,
  unavailable,
  locked,
  onSelect,
}: {
  team: (NonNullable<TeamForUi> & { _id?: TeamId }) | null;
  selected: boolean;
  unavailable: boolean;
  locked: boolean;
  onSelect: () => void;
}) {
  const disabled = !team || unavailable || locked;
  const unavailableReason = unavailable ? "Previously picked" : locked ? "Locked" : null;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className={`relative flex min-h-20 flex-col items-center justify-center gap-1 rounded-[18px] px-0.5 py-2 text-center transition sm:min-h-20 sm:px-4 ${
        selected
          ? "bg-neutral-100 text-black"
          : unavailable
            ? "text-neutral-400"
            : locked
              ? "text-neutral-400"
              : "text-black hover:bg-neutral-100"
      }`}
    >
      <TeamFlag team={team} size="lg" />
      <span className="min-w-0 max-w-full overflow-hidden leading-none">
        <span className={`inline-flex max-w-full items-baseline justify-center whitespace-nowrap text-[12px] font-black leading-none sm:text-xl ${unavailable ? "line-through decoration-2" : ""}`}>
          <span className="truncate">{team?.name ?? "Team"}</span>
          {team?.fifaRank ? <span className="ml-0.5 shrink-0 text-[9px] font-black text-muted sm:ml-1 sm:text-xs">#{team.fifaRank}</span> : null}
        </span>
        {unavailableReason ? (
          <span className={`mt-2 inline-flex rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-wide sm:text-xs ${
            selected ? "bg-black text-white" : "bg-white text-neutral-600"
          }`}>
            {unavailableReason}
          </span>
        ) : null}
      </span>
      {selected ? (
        <span className="absolute right-2 top-2 grid size-5 place-items-center rounded-full bg-black text-white sm:static">
          <Icon name="check" size={14} />
        </span>
      ) : null}
    </button>
  );
}

function TeamFlag({ team, size = "md" }: { team: TeamForUi; size?: "sm" | "md" | "lg" }) {
  const sizeClass = size === "lg" ? "h-[3.15rem] w-[4.3rem] sm:w-20" : size === "sm" ? "h-5 w-7" : "h-8 w-12";
  const emojiClass = size === "sm" ? "text-[1.35rem]" : size === "lg" ? "text-[4.45rem]" : "text-[2.9rem]";
  const code = team?.code ?? "?";
  const flagEmoji = getTeamFlagEmoji(code);

  return (
    <span
      className={`${sizeClass} grid shrink-0 place-items-center overflow-hidden rounded-[6px] bg-transparent`}
      aria-label={`${team?.name ?? "Team"} flag`}
      role="img"
    >
      <span className={`${emojiClass} block -translate-y-[0.02em] scale-110 leading-[0.68]`} aria-hidden="true">
        {flagEmoji ?? code}
      </span>
    </span>
  );
}

function getTeamFlagEmoji(code: string) {
  const flags: Record<string, string> = {
    ARG: "🇦🇷",
    AUS: "🇦🇺",
    AUT: "🇦🇹",
    BIH: "🇧🇦",
    CAN: "🇨🇦",
    CRO: "🇭🇷",
    CZE: "🇨🇿",
    ENG: "🏴",
    KOR: "🇰🇷",
    MEX: "🇲🇽",
    PAR: "🇵🇾",
    RSA: "🇿🇦",
    SWE: "🇸🇪",
    TUN: "🇹🇳",
    TUR: "🇹🇷",
    USA: "🇺🇸",
  };

  return flags[code];
}

type StandingRowForUi = {
  membership: {
    _id: Id<"memberships">;
    status: "active" | "eliminated" | "winner";
  };
  displayName: string;
  picksMade: number;
  wins: number;
};

function Standings({ groupId, rows, expanded = false }: { groupId: GroupId; rows?: StandingRowForUi[]; expanded?: boolean }) {
  const fetchedStandings = useQuery(api.standings.get, rows ? "skip" : { groupId });
  const standings = rows ?? fetchedStandings;

  return (
    <section className={expanded ? "-mx-3 bg-white/92 p-4 ring-1 ring-neutral-200 sm:mx-0 sm:rounded-[26px]" : "-mx-3 bg-white/82 p-4 ring-1 ring-neutral-200 sm:mx-0 sm:rounded-[26px]"}>
      <h3 className="text-2xl font-black leading-none text-black">Table</h3>
      <div className="mt-3 divide-y divide-neutral-200">
        {(standings ?? []).map((row, index) => (
          <div key={row.membership._id} className="flex items-center justify-between gap-3 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className={`grid size-8 shrink-0 place-items-center rounded-full font-mono text-sm font-black ${index === 0 ? "bg-black text-white" : "bg-neutral-100 text-neutral-600"}`}>
                {index + 1}
              </span>
              <div className="min-w-0">
              <p className="truncate text-base font-bold leading-none text-black sm:text-lg">
                {row.displayName}
              </p>
              <p className="text-xs text-muted">{row.wins} wins · {row.picksMade} picks</p>
              </div>
            </div>
            <Badge tone={row.membership.status === "winner" ? "accent" : row.membership.status === "active" ? "success" : "danger"}>
              {row.membership.status === "winner" ? (
                <span className="inline-flex items-center gap-1">
                  <Icon name="workspace_premium" size={12} filled />
                  winner
                </span>
              ) : (
                row.membership.status
              )}
            </Badge>
          </div>
        ))}
      </div>
    </section>
  );
}

function GroupStats({
  groupId,
  picks,
  selectionResetAt,
  activeMembers,
  eliminatedMembers,
  totalMembers,
}: {
  groupId: GroupId;
  picks: PickForUi[];
  selectionResetAt?: number;
  activeMembers: number;
  eliminatedMembers: number;
  totalMembers: number;
}) {
  const livePicks = picks.filter((pick) => !selectionResetAt || pick.createdAt > selectionResetAt);
  const wins = livePicks.filter((pick) => pick.status === "won").length;
  const losses = livePicks.filter((pick) => pick.status === "lost").length;
  const pending = livePicks.filter((pick) => pick.status === "pending").length;
  const usedTeams = livePicks
    .filter((pick) => pick.team)
    .map((pick) => ({ _id: pick._id, label: formatPickWindowLabel(pick.pickWindowKey ?? pick.dayKey), team: pick.team }));
  const latestPick = livePicks.at(-1);
  const survivalRate = totalMembers > 0 ? Math.round((activeMembers / totalMembers) * 100) : 0;

  return (
    <section className="grid gap-3 sm:gap-5">
      <div className="px-1">
        <h3 className="text-3xl font-black leading-none text-black sm:text-4xl">Stats</h3>
        <p className="mt-1 text-base leading-5 text-muted sm:text-lg">
          Your run, your picks, and how the group is thinning out.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatTile label="Alive" value={String(activeMembers)} />
        <StatTile label="Out" value={String(eliminatedMembers)} />
        <StatTile label="Survival" value={`${survivalRate}%`} />
        <StatTile label="Your wins" value={String(wins)} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <StatTile label="Your picks" value={String(livePicks.length)} />
        <StatTile label="Pending" value={String(pending)} />
      </div>

      <section className="-mx-3 bg-white/92 p-4 ring-1 ring-neutral-200 sm:mx-0 sm:rounded-[26px]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-2xl font-black leading-none text-black">Your record</h3>
            <p className="mt-1 text-sm leading-5 text-muted">
              Wins keep you alive. Draws and losses count as out.
            </p>
          </div>
          <Badge tone={losses > 0 ? "danger" : "success"}>{losses > 0 ? "hit" : "clean"}</Badge>
        </div>
        <div className="mt-4 grid grid-cols-3 divide-x divide-neutral-200 rounded-[22px] bg-neutral-100 p-3 text-center">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-muted">Won</p>
            <p className="mt-1 text-2xl font-black text-black">{wins}</p>
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-muted">Lost</p>
            <p className="mt-1 text-2xl font-black text-black">{losses}</p>
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-muted">Waiting</p>
            <p className="mt-1 text-2xl font-black text-black">{pending}</p>
          </div>
        </div>
        <p className="mt-3 text-sm font-bold text-muted">
          Latest pick: {latestPick?.team?.name ?? "No pick made yet"}
        </p>
      </section>

      <UsedTeamsStrip picks={usedTeams} />
      <MyPicks groupId={groupId} selectionResetAt={selectionResetAt} picks={picks} />
    </section>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] bg-black p-4 text-white shadow-[0_14px_32px_rgba(0,0,0,0.12)]">
      <p className="text-xs font-black uppercase tracking-wide text-white/60">{label}</p>
      <p className="mt-1 text-3xl font-black leading-none">{value}</p>
    </div>
  );
}

function SelectionResetPanel({ groupId }: { groupId: GroupId }) {
  const resetStatus = useQuery(api.selectionResets.getStatus, { groupId });
  const requestReset = useMutation(api.selectionResets.request);
  const approveReset = useMutation(api.selectionResets.approve);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!resetStatus) {
    return null;
  }

  const pending = Boolean(resetStatus.requestedAt);
  const approvedAll = resetStatus.activeCount > 0 && resetStatus.approvedCount >= resetStatus.activeCount;

  return (
    <section className="-mx-3 bg-white/82 p-4 ring-1 ring-neutral-200 sm:mx-0 sm:rounded-[26px]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-2xl font-black leading-none">Team reset</h3>
          <p className="mt-1 text-sm leading-5 text-muted">
            All active players must agree before used teams become available again.
          </p>
        </div>
        <Badge tone={pending ? "accent" : "neutral"}>
          {pending ? `${resetStatus.approvedCount}/${resetStatus.activeCount}` : "none"}
        </Badge>
      </div>

      {resetStatus.lastResetAt ? (
        <p className="mt-3 text-xs font-bold uppercase tracking-wide text-muted">
          Last reset {dateFormatter.format(new Date(resetStatus.lastResetAt))}
        </p>
      ) : null}

      {message ? <p className="mt-3 rounded-2xl bg-black px-3 py-2 text-sm font-semibold text-white">{message}</p> : null}
      {error ? <p className="mt-3 rounded-2xl bg-neutral-100 px-3 py-2 text-sm font-semibold text-black ring-1 ring-neutral-200">{error}</p> : null}

      {resetStatus.canVote ? (
        <Button
          type="button"
          variant={pending ? "secondary" : "primary"}
          className="mt-4 w-full"
          disabled={isPending || approvedAll || (pending && resetStatus.approvedByMe)}
          onClick={() =>
            startTransition(async () => {
              try {
                setError(null);
                setMessage(null);
                const result = pending ? await approveReset({ groupId }) : await requestReset({ groupId });
                setMessage(
                  result.completed
                    ? "Selections reset. Everyone left can pick any team again."
                    : `Reset approval saved (${result.approvedCount}/${result.activeCount}).`,
                );
              } catch (caught) {
                setError(caught instanceof Error ? caught.message : "Could not update reset.");
              }
            })
          }
        >
          {isPending ? <Icon name="progress_activity" className="animate-spin" size={16} /> : <Icon name="workspace_premium" size={16} />}
          {pending ? (resetStatus.approvedByMe ? "Waiting for others" : "Agree to reset") : "Request reset"}
        </Button>
      ) : (
        <p className="mt-4 text-sm font-bold text-muted">Only active remaining players can vote.</p>
      )}
    </section>
  );
}

function MyPicks({ groupId, selectionResetAt, picks: initialPicks }: { groupId: GroupId; selectionResetAt?: number; picks?: PickForUi[] }) {
  const fetchedPicks = useQuery(api.picks.listMine, initialPicks ? "skip" : { groupId });
  const picks = initialPicks ?? fetchedPicks;

  return (
    <section className="-mx-3 bg-white/82 p-4 ring-1 ring-neutral-200 sm:mx-0 sm:rounded-[26px]">
      <h3 className="text-2xl font-black leading-none">My picks</h3>
      <div className="mt-3 divide-y divide-neutral-200">
        {(picks ?? []).length === 0 ? (
          <p className="text-sm leading-6 text-muted">No picks yet.</p>
        ) : (
          picks?.map((pick) => {
            const beforeReset = Boolean(selectionResetAt && pick.createdAt <= selectionResetAt);
            return (
            <div key={pick._id} className="py-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-base font-bold leading-none sm:text-lg">{pick.team?.name}</p>
                <Badge tone={beforeReset ? "neutral" : pick.status === "won" ? "success" : pick.status === "lost" ? "danger" : "neutral"}>
                  {beforeReset ? "reset" : pick.status}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-muted">
                {formatPickWindowLabel(pick.pickWindowKey ?? pick.dayKey)} · {pick.match?.homeTeam?.code} vs {pick.match?.awayTeam?.code}
              </p>
            </div>
            );
          })
        )}
      </div>
    </section>
  );
}
