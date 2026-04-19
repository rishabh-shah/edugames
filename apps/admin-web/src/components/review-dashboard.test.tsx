import React from "react";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ReviewDashboard } from "./review-dashboard";
import { adminDashboardFixtures } from "../lib/admin-dashboard";

describe("ReviewDashboard", () => {
  it("renders moderation, reports, and telemetry sections", () => {
    render(<ReviewDashboard {...adminDashboardFixtures} />);

    expect(screen.getByRole("heading", { name: /Games under review/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Fresh signal from families/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Operational highlights/i })).toBeInTheDocument();
  });

  it("shows summary counts derived from the queue and report fixtures", () => {
    render(<ReviewDashboard {...adminDashboardFixtures} />);

    const summary = screen.getByLabelText(/dashboard summary/i);
    const queuedReviews = within(summary)
      .getByText("Queued reviews")
      .closest("article");
    const openReports = within(summary)
      .getByText("Open reports")
      .closest("article");

    expect(queuedReviews).not.toBeNull();
    expect(openReports).not.toBeNull();
    expect(within(queuedReviews!).getByText("1")).toBeInTheDocument();
    expect(within(openReports!).getByText("1")).toBeInTheDocument();
  });

  it("renders moderation and resolve actions from live dashboard data", () => {
    render(<ReviewDashboard {...adminDashboardFixtures} />);

    const queueCard = screen.getByRole("heading", { name: /Counting Kites/i }).closest("li");
    expect(queueCard).not.toBeNull();
    expect(within(queueCard!).getByRole("button", { name: /Approve/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Resolve/i })).toBeInTheDocument();
  });
});
