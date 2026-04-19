import { NextResponse } from "next/server";

import { postResolveReport } from "../../../../../lib/admin-dashboard";

export async function POST(
  request: Request,
  context: { params: Promise<{ reportId: string }> }
) {
  const { reportId } = await context.params;

  await postResolveReport(reportId);

  return NextResponse.redirect(new URL("/", request.url), {
    status: 303
  });
}
