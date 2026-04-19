import { NextResponse } from "next/server";

import { postApproveGame } from "../../../../../lib/admin-dashboard";

export async function POST(
  _request: Request,
  context: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await context.params;

  await postApproveGame(gameId);

  return NextResponse.redirect(new URL("/", _request.url), {
    status: 303
  });
}
