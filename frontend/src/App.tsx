import {
  Activity,
  BarChart3,
  Check,
  Clapperboard,
  Clock3,
  RefreshCw,
  Send,
  Sparkles,
  ThumbsDown,
  Wand2,
  X
} from "lucide-react";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { api } from "./api";
import { Account, ContentItem, DashboardResponse, JobStatus, LogEntry } from "./types";

const LandingPage = lazy(() => import("./components/LandingPage"));

function accountIdOf(item: ContentItem) {
  return typeof item.accountId === "string" ? item.accountId : item.accountId._id;
}

function accountNameOf(item: ContentItem) {
  return typeof item.accountId === "string" ? "Account" : item.accountId.name;
}

function numberCompact(value = 0) {
  return Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function statusLabel(status: ContentItem["status"]) {
  return status.replace(/_/g, " ");
}

function metricTotal(data: DashboardResponse | undefined, key: "views" | "likes" | "shares" | "saves") {
  if (!data) return 0;
  return Object.values(data.analytics).reduce((sum, snapshot) => sum + (snapshot?.[key] ?? 0), 0);
}

function AccountRail({
  accounts,
  selectedId,
  onSelect,
  onGenerate,
  busy
}: {
  accounts: Account[];
  selectedId?: string;
  onSelect: (id: string) => void;
  onGenerate: (id: string) => void;
  busy: boolean;
}) {
  return (
    <aside className="rail">
      <div className="rail-title">
        <Sparkles size={18} />
        Accounts
      </div>
      <div className="account-list">
        {accounts.map((account) => (
          <button
            className={`account-row ${account._id === selectedId ? "selected" : ""}`}
            key={account._id}
            onClick={() => onSelect(account._id)}
          >
            <span className={`niche-dot ${account.niche}`} />
            <span>
              <strong>{account.name}</strong>
              <small>{account.channels.map((channel) => channel.handle).join("  ")}</small>
            </span>
          </button>
        ))}
      </div>
      {selectedId && (
        <button className="primary full" onClick={() => onGenerate(selectedId)} disabled={busy} title="Generate content">
          <Wand2 size={16} />
          Generate
        </button>
      )}
    </aside>
  );
}

function Metrics({ data }: { data?: DashboardResponse }) {
  const pending = data?.pendingApprovals.length ?? 0;
  const posted = data?.content.filter((item) => item.status === "posted").length ?? 0;
  return (
    <section className="metrics">
      <div className="metric">
        <BarChart3 size={18} />
        <span>Views</span>
        <strong>{numberCompact(metricTotal(data, "views"))}</strong>
      </div>
      <div className="metric">
        <Activity size={18} />
        <span>Engagement</span>
        <strong>{numberCompact(metricTotal(data, "likes") + metricTotal(data, "shares") + metricTotal(data, "saves"))}</strong>
      </div>
      <div className="metric">
        <Clock3 size={18} />
        <span>Pending</span>
        <strong>{pending}</strong>
      </div>
      <div className="metric">
        <Send size={18} />
        <span>Posted</span>
        <strong>{posted}</strong>
      </div>
    </section>
  );
}

function ApprovalItem({
  item,
  onApprove,
  onReject,
  onEdit,
  busy
}: {
  item: ContentItem;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onEdit: (item: ContentItem) => void;
  busy: boolean;
}) {
  return (
    <article className="approval-item">
      <div className="video-frame">
        {item.assets?.finalVideo?.url ? (
          <video src={item.assets.finalVideo.url} controls muted playsInline />
        ) : (
          <Clapperboard size={42} />
        )}
      </div>
      <div className="approval-copy">
        <div className="content-topline">
          <span>{accountNameOf(item)}</span>
          <span className={`status ${item.status}`}>{statusLabel(item.status)}</span>
        </div>
        <h3>{item.script?.title ?? "Generated draft"}</h3>
        <p>{item.script?.caption ?? "Caption pending"}</p>
        <div className="hashtags">{item.script?.hashtags?.slice(0, 6).join(" ")}</div>
        <div className="approval-actions">
          <button className="success" onClick={() => onApprove(item._id)} disabled={busy} title="Approve and publish">
            <Check size={16} />
            Approve
          </button>
          <button className="neutral" onClick={() => onEdit(item)} disabled={busy} title="Edit with feedback">
            <RefreshCw size={16} />
            Edit
          </button>
          <button className="danger" onClick={() => onReject(item._id)} disabled={busy} title="Reject and regenerate">
            <ThumbsDown size={16} />
            Reject
          </button>
        </div>
      </div>
    </article>
  );
}

function QueueTable({ items }: { items: ContentItem[] }) {
  return (
    <section className="panel queue-panel">
      <div className="panel-head">
        <h2>Content Queue</h2>
        <span>{items.length}</span>
      </div>
      <div className="queue-table">
        {items.slice(0, 12).map((item) => (
          <div className="queue-row" key={item._id}>
            <span className={`status ${item.status}`}>{statusLabel(item.status)}</span>
            <strong>{item.script?.hook ?? item.script?.title ?? "Pipeline item"}</strong>
            <span>{accountNameOf(item)}</span>
            <span>{item.pipelineStage}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function SelectedAccount({
  account,
  data
}: {
  account?: Account;
  data?: DashboardResponse;
}) {
  if (!account || !data) return null;
  const analytics = data.analytics[account._id];
  const content = data.content.filter((item) => accountIdOf(item) === account._id).slice(0, 4);
  return (
    <section className="panel account-panel">
      <div className="panel-head">
        <h2>{account.name}</h2>
        <span className={`status ${account.enabled ? "posted" : "failed"}`}>
          {account.enabled ? "active" : "paused"}
        </span>
      </div>
      <div className="account-grid">
        <div>
          <span>Views</span>
          <strong>{numberCompact(analytics?.views)}</strong>
        </div>
        <div>
          <span>Rate</span>
          <strong>{analytics?.engagementRate ?? 0}%</strong>
        </div>
        <div>
          <span>Quota</span>
          <strong>{account.dailyQuota}/day</strong>
        </div>
      </div>
      <div className="rules">
        {account.brandRules.slice(0, 3).map((rule) => (
          <span key={rule}>{rule}</span>
        ))}
      </div>
      <div className="recent-list">
        {content.map((item) => (
          <div key={item._id}>
            <small>{statusLabel(item.status)}</small>
            <span>{item.script?.title ?? item.pipelineStage}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function HooksPanel({ data }: { data?: DashboardResponse }) {
  return (
    <section className="panel hooks-panel">
      <div className="panel-head">
        <h2>Hook Templates</h2>
        <span>{data?.hooks.length ?? 0}</span>
      </div>
      <div className="hook-list">
        {data?.hooks.slice(0, 8).map((hook) => (
          <div key={hook._id}>
            <strong>{hook.template}</strong>
            <span>
              {hook.niche} / score {hook.score}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function JobsPanel({ jobs }: { jobs: JobStatus[] }) {
  const visible = jobs.slice(0, 8);
  return (
    <section className="panel jobs-panel">
      <div className="panel-head">
        <h2>Job Queues</h2>
        <span>{jobs.length}</span>
      </div>
      <div className="job-list">
        {visible.length === 0 && <div className="empty compact">No queue activity yet.</div>}
        {visible.map((job) => (
          <div className="job-row" key={job._id}>
            <span className={`job-status ${job.status}`}>{job.status}</span>
            <strong>{job.queueName}</strong>
            <span>{job.name}</span>
            <span>
              {job.attemptsMade}/{job.maxAttempts || 1}
            </span>
            {job.error && <small>{job.error}</small>}
          </div>
        ))}
      </div>
    </section>
  );
}

function LogsPanel({ logs }: { logs: LogEntry[] }) {
  const visible = logs.slice(0, 10);
  return (
    <section className="panel logs-panel">
      <div className="panel-head">
        <h2>Error Logs</h2>
        <span>{logs.filter((log) => log.level === "error" || log.level === "warn").length}</span>
      </div>
      <div className="log-list">
        {visible.length === 0 && <div className="empty compact">No log entries yet.</div>}
        {visible.map((log) => (
          <div className={`log-row ${log.level}`} key={log._id}>
            <span>{log.level}</span>
            <strong>{log.scope}</strong>
            <p>{log.message}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Dashboard() {
  const [data, setData] = useState<DashboardResponse>();
  const [selectedId, setSelectedId] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [editing, setEditing] = useState<ContentItem>();
  const [feedback, setFeedback] = useState("");

  async function load() {
    const next = await api.dashboard();
    setData(next);
    setSelectedId((current) => current ?? next.accounts[0]?._id);
  }

  async function runAction(action: () => Promise<unknown>) {
    setBusy(true);
    setError(undefined);
    try {
      await action();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : "Unable to load dashboard"));
    const timer = window.setInterval(() => {
      load().catch(() => undefined);
    }, 15000);
    return () => window.clearInterval(timer);
  }, []);

  const selectedAccount = useMemo(
    () => data?.accounts.find((account) => account._id === selectedId),
    [data?.accounts, selectedId]
  );
  const selectedPending = data?.pendingApprovals.filter((item) => !selectedId || accountIdOf(item) === selectedId) ?? [];
  const highlightedId = window.location.pathname.match(/approvals\/([^/]+)/)?.[1];
  const approvals = highlightedId
    ? [...selectedPending].sort((a) => (a._id === highlightedId ? -1 : 1))
    : selectedPending;

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <h1>AI Social Automation</h1>
          <span>Multi-agent approval pipeline</span>
        </div>
        <div className="top-actions">
          <button className="neutral" onClick={() => runAction(() => api.collectAnalytics())} disabled={busy} title="Collect analytics">
            <BarChart3 size={16} />
            Analytics
          </button>
          <button className="primary" onClick={() => runAction(() => api.generate())} disabled={busy} title="Generate for all accounts">
            <Wand2 size={16} />
            Generate All
          </button>
        </div>
      </header>

      {error && (
        <div className="error-banner">
          <X size={16} />
          {error}
        </div>
      )}

      <div className="layout">
        <AccountRail
          accounts={data?.accounts ?? []}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onGenerate={(id) => runAction(() => api.generate(id))}
          busy={busy}
        />

        <div className="workspace">
          <Metrics data={data} />

          <div className="secondary-grid monitoring-grid">
            <JobsPanel jobs={data?.jobs ?? []} />
            <LogsPanel logs={data?.logs ?? []} />
          </div>

          <section className="panel approvals-panel">
            <div className="panel-head">
              <h2>Pending Approvals</h2>
              <span>{approvals.length}</span>
            </div>
            <div className="approval-list">
              {approvals.length === 0 && <div className="empty">No drafts waiting for approval.</div>}
              {approvals.map((item) => (
                <ApprovalItem
                  item={item}
                  key={item._id}
                  busy={busy}
                  onApprove={(id) => runAction(() => api.approve(id))}
                  onReject={(id) => runAction(() => api.reject(id, true))}
                  onEdit={(draft) => {
                    setEditing(draft);
                    setFeedback("");
                  }}
                />
              ))}
            </div>
          </section>

          <div className="secondary-grid">
            <SelectedAccount account={selectedAccount} data={data} />
            <HooksPanel data={data} />
          </div>

          <QueueTable items={data?.queue ?? []} />
        </div>
      </div>

      {editing && (
        <div className="modal-backdrop">
          <form
            className="modal"
            onSubmit={(event) => {
              event.preventDefault();
              runAction(() => api.edit(editing._id, feedback)).then(() => {
                setEditing(undefined);
                setFeedback("");
              });
            }}
          >
            <div className="panel-head">
              <h2>Edit Draft</h2>
              <button className="icon-button" type="button" onClick={() => setEditing(undefined)} title="Close">
                <X size={16} />
              </button>
            </div>
            <textarea
              value={feedback}
              onChange={(event) => setFeedback(event.target.value)}
              placeholder="Tighten hook, change visual style, adjust caption..."
              rows={5}
              required
            />
            <button className="primary full" type="submit" disabled={busy || feedback.trim().length < 3}>
              <RefreshCw size={16} />
              Regenerate
            </button>
          </form>
        </div>
      )}
    </main>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div className="route-fallback">Loading system...</div>}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/dashboard/approvals/:id" element={<Dashboard />} />
          <Route path="/approvals/:id" element={<Dashboard />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
