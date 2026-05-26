import * as schema from "../db/schema";
import { eq, count, and } from "drizzle-orm";

/**
 * Check if a user has potential report abuse patterns
 * Returns true if >50% of their reports are dismissed
 */
export async function checkReportAbuse(db: any, userId: string): Promise<boolean> {
  // Get total reports by user
  const totalReports = await db
    .select({ count: count() })
    .from(schema.reports)
    .where(eq(schema.reports.reporterId, userId));

  if (totalReports[0].count === 0) return false;

  // Get dismissed reports
  const dismissedReports = await db
    .select({ count: count() })
    .from(schema.reports)
    .where(
      and(
        eq(schema.reports.reporterId, userId),
        eq(schema.reports.status, "dismissed")
      )
    );

  const total = totalReports[0].count;
  const dismissed = dismissedReports[0].count;
  const dismissedRatio = dismissed / total;

  // Flag if >50% dismissed
  return dismissedRatio > 0.5;
}

/**
 * Get users with potential report abuse patterns
 * Returns array of user IDs with >50% dismissed reports
 */
export async function getAbusiveReporters(db: any): Promise<string[]> {
  // Get all reports grouped by reporter
  const allReports = await db
    .select({
      reporterId: schema.reports.reporterId,
      status: schema.reports.status,
    })
    .from(schema.reports);

  // Group by reporter
  const reporterStats: Record<string, { total: number; dismissed: number }> = {};

  allReports.forEach((report: { reporterId: string; status: string }) => {
    if (!reporterStats[report.reporterId]) {
      reporterStats[report.reporterId] = { total: 0, dismissed: 0 };
    }
    reporterStats[report.reporterId].total++;
    if (report.status === "dismissed") {
      reporterStats[report.reporterId].dismissed++;
    }
  });

  // Filter for abusive reporters (>50% dismissed)
  const abusiveReporters: string[] = [];

  Object.entries(reporterStats).forEach(([userId, stats]) => {
    if (stats.total >= 3 && stats.dismissed / stats.total > 0.5) {
      abusiveReporters.push(userId);
    }
  });

  return abusiveReporters;
}
