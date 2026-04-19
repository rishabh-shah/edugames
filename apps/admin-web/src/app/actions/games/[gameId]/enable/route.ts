import { NextResponse } from "next/server";

import { postEnableGame } from "../../../../../lib/admin-dashboard";

export async function POST(
  request: Request,
  context: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await context.params;

  await postEnableGame(gameId);

  return NextResponse.redirect(new URL("/", request.url), {
    status: 303
  });
}
