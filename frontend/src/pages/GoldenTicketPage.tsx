/**
 * GoldenTicketPage — v1.65, user-driven Golden Ticket flow.
 *
 * Replaces the old "wait for admin to convert your ticket" model.
 * Here the user picks an SP investment via slider, writes a short
 * urgent query + longer context, and submits. SP is debited up
 * front. If admin rejects, the user is penalised 1.25x the SP
 * (configurable in Admin → Settings) and locked out for 48h
 * (also configurable).
 *
 * Layout: two-column grid on lg+. Left = the form (slider, query,
 * context, submit). Right = live Escalation Queue (anonymous
 * names to non-admins). Both columns stack on mobile.
 *
 * State is read-only on the page — no state mutations outside the
 * form. Refetch on submit, on userId change, and on focus.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  fetchGoldenQueue,
  fetchSpurtiStatus,
  submitGoldenTicket,
  type GoldenQueueItem,
  type SpurtiStatus,
} from '../components/support/api';

const MIN_SP = 1;
const MAX_SP = 100; // hard cap so the slider stays reasonable

function friendlyError(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { message?: string } } };
  return e?.response?.data?.message || fallback;
}

function formatCooldownEndsAt(iso: string, now = Date.now()): string {
  const ends = new Date(iso).getTime();
  const diffMs = ends - now;
  if (diffMs <= 0) return 'now';
  const hours = Math.floor(diffMs / 3_600_000);
  const mins = Math.floor((diffMs % 3_600_000) / 60_000);
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

export default function GoldenTicketPage(): React.ReactElement {
  const { user } = useAuth();
  const isAuthed = Boolean(user?.id);

  // SP + cooldown status (drives slider max, form gating, header chip)
  const [status, setStatus] = useState<SpurtiStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);

  // Form state
  const [spCost, setSpCost] = useState<number>(1);
  const [title, setTitle] = useState<string>('');
  const [details, setDetails] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Escalation queue
  const [queue, setQueue] = useState<GoldenQueueItem[]>([]);
  const [queueLoading, setQueueLoading] = useState(false);

  const remainingSp = useMemo(() => {
    const total = status?.sp ?? 0;
    return Math.max(0, total - spCost);
  }, [status?.sp, spCost]);

  // Clamp the slider when the SP balance changes (e.g. after a submit)
  // or when the cooldown kicks in (forces slider to 0 and disables).
  useEffect(() => {
    if (!status) return;
    const cap = Math.min(MAX_SP, status.sp);
    if (spCost > cap) setSpCost(Math.max(MIN_SP, Math.min(cap, 1)));
  }, [status?.sp, status?.canSubmitGolden]); // eslint-disable-line react-hooks/exhaustive-deps

  const reloadStatus = useCallback(async () => {
    if (!isAuthed) return;
    setStatusLoading(true);
    try {
      const s = await fetchSpurtiStatus();
      setStatus(s);
    } catch {
      setStatus(null);
    } finally {
      setStatusLoading(false);
    }
  }, [isAuthed]);

  const reloadQueue = useCallback(async () => {
    if (!isAuthed) return;
    setQueueLoading(true);
    try {
      const items = await fetchGoldenQueue(8);
      setQueue(items);
    } catch {
      setQueue([]);
    } finally {
      setQueueLoading(false);
    }
  }, [isAuthed]);

  useEffect(() => { void reloadStatus(); }, [reloadStatus]);
  useEffect(() => { void reloadQueue(); }, [reloadQueue]);

  const inCooldown = status ? !status.canSubmitGolden : false;
  const cooldownEndsAt = status?.cooldownEndsAt ?? null;
  const canSubmit =
    isAuthed &&
    !inCooldown &&
    spCost > 0 &&
    spCost <= (status?.sp ?? 0) &&
    title.trim().length > 0 &&
    details.trim().length > 0 &&
    !submitting;

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await submitGoldenTicket(title.trim(), details.trim(), spCost);
      setTitle('');
      setDetails('');
      setSpCost(1);
      await Promise.all([reloadStatus(), reloadQueue()]);
    } catch (err) {
      setSubmitError(friendlyError(err, 'Failed to submit Golden ticket.'));
    } finally {
      setSubmitting(false);
    }
  }

  // ── Unauthed gate ────────────────────────────────────────────────────────
  if (!isAuthed) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <h1 className="font-serif text-3xl text-ink mb-3">Golden Ticket</h1>
        <p className="text-ink-soft">Sign in to escalate a time-sensitive query with Spurti Points.</p>
        <Link
          to="/"
          className="inline-block mt-6 px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <header className="mb-8 flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl bg-card border border-border flex items-center justify-center text-accent shrink-0">
          {/* Crown icon — marks this as the priority path */}
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M3 7l5 4 4-6 4 6 5-4-1 11H4L3 7zm0 14h18v2H3v-2z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-serif text-3xl tracking-tight text-ink">Golden Ticket</h1>
          <p className="text-sm text-ink-soft mt-1">
            Escalate a time-sensitive query. Higher SP investment signals higher priority.
            Admin rejection applies a 1.25x penalty and a cooldown.
          </p>
        </div>
        {/* SP chip on the right of the header (mirrors the navbar chip,
            shows the same data, gives the page a self-contained summary) */}
        {status && (
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-sm font-semibold shrink-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2 L13.5 10.5 L22 12 L13.5 13.5 L12 22 L10.5 13.5 L2 12 L10.5 10.5 Z" />
            </svg>
            <span className="tabular-nums">{status.sp}</span>
            <span className="text-accent/70 font-medium">SP</span>
          </div>
        )}
      </header>

      {/* Two-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-6">
        {/* ── Form column ──────────────────────────────────────────── */}
        <form
          onSubmit={handleSubmit}
          className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-5"
        >
          {/* SP investment */}
          <div>
            <div className="flex items-baseline justify-between mb-1">
              <label className="text-sm font-semibold text-ink">Spurti Point Investment</label>
              <span className="text-xs text-ink-soft">Higher SP = higher priority</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl" aria-hidden="true">🔥</span>
              <input
                type="range"
                min={MIN_SP}
                max={Math.max(MIN_SP, Math.min(MAX_SP, status?.sp ?? 0))}
                value={spCost}
                onChange={(e) => setSpCost(Math.max(MIN_SP, Number(e.target.value)))}
                disabled={inCooldown || !status || status.sp < MIN_SP}
                className="flex-1 accent-accent disabled:opacity-50"
                aria-label="Spurti Points to invest"
              />
              <span className="font-semibold text-ink tabular-nums w-16 text-right">
                {spCost} <span className="text-ink-soft font-normal">SP</span>
              </span>
            </div>
            <div className="flex justify-between text-[11px] text-ink-soft mt-1 tabular-nums">
              <span>{MIN_SP}</span>
              <span>Remaining: {remainingSp} SP</span>
              <span>{MAX_SP}</span>
            </div>
          </div>

          {/* Urgent query */}
          <div>
            <label className="block text-sm font-semibold text-ink mb-1">
              Urgent Query <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="One-line summary of your problem"
              maxLength={120}
              disabled={inCooldown}
              className="w-full px-3 py-2 rounded-lg border border-border bg-bg text-ink placeholder:text-ink-soft focus:outline-none focus:border-accent/60 disabled:opacity-50"
            />
          </div>

          {/* Full context */}
          <div>
            <label className="block text-sm font-semibold text-ink mb-1">
              Full Context <span className="text-red-500">*</span>
            </label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="What happened, what you've tried, what you need from the support team."
              maxLength={2000}
              rows={6}
              disabled={inCooldown}
              className="w-full px-3 py-2 rounded-lg border border-border bg-bg text-ink placeholder:text-ink-soft focus:outline-none focus:border-accent/60 resize-y disabled:opacity-50"
            />
            <p className="text-[11px] text-ink-soft mt-1 text-right">
              {details.length} / 2000
            </p>
          </div>

          {/* Cooldown banner */}
          {inCooldown && cooldownEndsAt && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              <strong>Golden Ticket cooldown active.</strong>{' '}
              You can submit again in{' '}
              <span className="font-semibold tabular-nums">
                {formatCooldownEndsAt(cooldownEndsAt)}
              </span>
              . Admin rejection carries a 1.25x SP penalty and a{' '}
              {status?.cooldownHours ?? 48}h cooldown (configurable in Admin → Settings).
            </div>
          )}

          {/* Error banner */}
          {submitError && (
            <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900">
              {submitError}
            </div>
          )}

          {/* Submit */}
          <div className="flex items-center justify-end pt-2">
            <button
              type="submit"
              disabled={!canSubmit}
              className="px-5 py-2.5 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
            >
              {submitting ? 'Submitting…' : 'Submit Escalation'}
            </button>
          </div>
        </form>

        {/* ── Escalation Queue column ──────────────────────────────── */}
        <aside className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-ink mb-4">Escalation Queue</h2>

          {queueLoading && queue.length === 0 ? (
            <p className="text-sm text-ink-soft">Loading…</p>
          ) : queue.length === 0 ? (
            <p className="text-sm text-ink-soft">
              No escalations yet. Be the first to file a Golden Ticket.
            </p>
          ) : (
            <ul className="space-y-3">
              {queue.map((item) => (
                <li
                  key={item._id}
                  className="rounded-xl border border-border/60 bg-bg/50 p-3"
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft">
                      {item.userName}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-accent">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M12 2 L13.5 10.5 L22 12 L13.5 13.5 L12 22 L10.5 13.5 L2 12 L10.5 10.5 Z" />
                      </svg>
                      {item.spCost} SP
                    </span>
                  </div>
                  <p className="text-sm text-ink line-clamp-1">{item.title}</p>
                  {item.details && (
                    <p className="text-xs text-ink-soft mt-1 line-clamp-2 italic">"{item.details}"</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>

      {statusLoading && !status && (
        <p className="text-center text-sm text-ink-soft mt-6">Loading your Spurti Points balance…</p>
      )}
    </div>
  );
}
