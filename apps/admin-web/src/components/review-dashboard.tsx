import type {
  ListModerationGamesResponse,
  ListModerationReportsResponse
} from "@edugames/contracts";

import type { DashboardTelemetryHighlight } from "../lib/admin-dashboard";

type ReviewDashboardProps = {
  games: ListModerationGamesResponse["games"];
  reports: ListModerationReportsResponse["reports"];
  telemetryHighlights: DashboardTelemetryHighlight[];
  errorMessage?: string;
};

const statusToneClassName: Record<ReviewDashboardProps["games"][number]["status"], string> = {
  queued: "queued",
  live: "live",
  disabled: "disabled"
};

export function ReviewDashboard({
  games,
  reports,
  telemetryHighlights,
  errorMessage
}: ReviewDashboardProps) {
  const queuedCount = games.filter((item) => item.status === "queued").length;
  const disabledCount = games.filter((item) => item.status === "disabled").length;

  return (
    <main className="dashboard-shell">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">EduGames Control Room</p>
          <h1>Review, safety, and quality in one place.</h1>
          <p className="hero-copy">
            Keep the catalog calm for kids by approving new games, triaging
            parent reports, and watching live health signals before anything
            reaches the shelf.
          </p>
          {errorMessage ? (
            <p className="error-banner" role="alert">
              {errorMessage}
            </p>
          ) : null}
        </div>
        <div className="hero-stats" aria-label="dashboard summary">
          <article>
            <span>Queued reviews</span>
            <strong>{queuedCount}</strong>
          </article>
          <article>
            <span>Open reports</span>
            <strong>{reports.filter((report) => report.status === "open").length}</strong>
          </article>
          <article>
            <span>Disabled games</span>
            <strong>{disabledCount}</strong>
          </article>
        </div>
      </section>

      <section className="dashboard-grid">
        <section className="panel queue-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Moderation queue</p>
              <h2>Games under review</h2>
            </div>
          </div>
          <ul className="queue-list">
            {games.map((item) => (
              <li key={item.gameId} className="queue-card">
                <div className="queue-copy">
                  <div className="queue-title-row">
                    <h3>{item.title}</h3>
                    <span className={`status-pill ${statusToneClassName[item.status]}`}>
                      {item.status}
                    </span>
                  </div>
                  <p>
                    Version {item.version} · {item.slug}
                  </p>
                  <p className="timestamp">
                    Open reports {item.openReportCount} · Total reports {item.totalReportCount}
                  </p>
                  {item.disabledReason ? (
                    <p className="timestamp">Reason: {item.disabledReason}</p>
                  ) : null}
                </div>
                <div className="queue-actions">
                  {item.status === "queued" ? (
                    <form action={`/actions/games/${item.gameId}/approve`} method="post">
                      <button type="submit">Approve</button>
                    </form>
                  ) : null}
                  {item.status === "disabled" ? (
                    <form action={`/actions/games/${item.gameId}/enable`} method="post">
                      <button type="submit">Re-enable</button>
                    </form>
                  ) : (
                    <form action={`/actions/games/${item.gameId}/disable`} method="post">
                      <button type="submit" className="danger">
                        Disable
                      </button>
                    </form>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="stack">
          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Parent reports</p>
                <h2>Fresh signal from families</h2>
              </div>
            </div>
            <ul className="report-list">
              {reports.map((report) => (
                <li key={report.reportId}>
                  <div>
                    <strong>{report.gameTitle}</strong>
                    <p>{report.reason} report</p>
                    {report.details ? <p>{report.details}</p> : null}
                  </div>
                  <div className="report-actions">
                    <span>{report.status}</span>
                    {report.status === "open" ? (
                      <form
                        action={`/actions/reports/${report.reportId}/resolve`}
                        method="post"
                      >
                        <button type="submit">Resolve</button>
                      </form>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Live telemetry</p>
                <h2>Operational highlights</h2>
              </div>
            </div>
            <div className="telemetry-grid">
              {telemetryHighlights.map((highlight) => (
                <article key={highlight.label}>
                  <span>{highlight.label}</span>
                  <strong>{highlight.value}</strong>
                  <p>{highlight.detail}</p>
                </article>
              ))}
            </div>
          </section>
        </section>
      </section>
    </main>
  );
}
