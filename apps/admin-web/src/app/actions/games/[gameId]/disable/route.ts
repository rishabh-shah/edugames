import { NextResponse } from "next/server";

import { postDisableGame } from "../../../../../lib/admin-dashboard";

export async function POST(
  request: Request,
  context: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await context.params;

  await postDisableGame(gameId, "Disabled from the EduGames admin dashboard.");

  return NextResponse.redirect(new URL("/", request.url), {
    status: 303
  });
}
