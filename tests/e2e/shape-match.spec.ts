import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { expect, test } from "@playwright/test";

const gameRoot = path.resolve(process.cwd(), "games/shape-match");

const contentTypes: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml"
};

let origin = "";
let closeServer = async () => {};

test.beforeAll(async () => {
  const server = createServer(async (request, response) => {
    const requestPath = new URL(request.url ?? "/", "http://127.0.0.1").pathname;
    const safePath = requestPath === "/" ? "/index.html" : requestPath;
    const resolvedPath = path.resolve(gameRoot, `.${safePath}`);

    if (!resolvedPath.startsWith(gameRoot)) {
      response.writeHead(403).end("Forbidden");
      return;
    }

    try {
      const contents = await readFile(resolvedPath);
      const extension = path.extname(resolvedPath).toLowerCase();

      response.writeHead(200, {
        "content-type":
          contentTypes[extension] ?? "application/octet-stream"
      });
      response.end(contents);
    } catch {
      response.writeHead(404).end("Not found");
    }
  });

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address();

  if (!address || typeof address === "string") {
    throw new Error("Expected the shape-match test server to bind to a TCP port.");
  }

  origin = `http://127.0.0.1:${address.port}`;
  closeServer = async () =>
    new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
});

test.afterAll(async () => {
  await closeServer();
});

const expectNoRuntimeErrors = async (page: Parameters<typeof test>[0]["page"]) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });

  page.on("pageerror", (error) => {
    pageErrors.push(error.message);
  });

  return async () => {
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  };
};

test("shape-match loads the intro state", async ({ page }) => {
  const assertNoRuntimeErrors = await expectNoRuntimeErrors(page);

  await page.goto(origin, {
    waitUntil: "networkidle"
  });

  await expect(page.getByTestId("shape-match-app")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Shape Match Garden" })).toBeVisible();
  await expect(page.getByTestId("shape-match-prompt")).toContainText(
    "Match the two shapes at the top!"
  );

  const textState = await page.evaluate(() =>
    JSON.parse(window.render_game_to_text())
  );

  expect(textState.mode).toBe("intro");
  expect(textState.round.index).toBe(1);
  expect(textState.targets).toHaveLength(2);

  await expect(page).toHaveScreenshot("shape-match-intro.png", {
    animations: "disabled",
    fullPage: true
  });

  await assertNoRuntimeErrors();
});

test("shape-match can complete a full session", async ({ page }) => {
  const assertNoRuntimeErrors = await expectNoRuntimeErrors(page);

  await page.goto(origin, {
    waitUntil: "networkidle"
  });

  await page.locator("#start-button").click();

  await page.evaluate(async () => {
    const app = window.__shapeMatchApp;

    if (!app) {
      throw new Error("Expected window.__shapeMatchApp to be available.");
    }

    const playRound = async (pairs) => {
      for (const [shapeId, targetId] of pairs) {
        app.chooseTrayShape(shapeId);
        app.placeOnTarget(targetId);
      }
    };

    await playRound([
      ["circle", "target-circle"],
      ["square", "target-square"]
    ]);
    app.advanceTime(1600);

    await playRound([
      ["triangle", "target-triangle"],
      ["star", "target-star"],
      ["circle", "target-circle"]
    ]);
    app.advanceTime(1600);

    await playRound([
      ["square", "target-square"],
      ["triangle", "target-triangle"],
      ["circle", "target-circle"],
      ["star", "target-star"]
    ]);
    app.advanceTime(1600);
  });

  await expect(page.getByTestId("shape-match-complete")).toBeVisible();
  await expect(page.getByTestId("shape-match-complete")).toContainText("You finished");
  await expect(page.getByTestId("shape-match-progress")).toContainText("Round 3 of 3");

  const textState = await page.evaluate(() =>
    JSON.parse(window.render_game_to_text())
  );

  expect(textState.mode).toBe("complete");
  expect(textState.sessionStars).toBe(9);
  expect(textState.sessionsCompleted).toBe(1);

  await expect(page).toHaveScreenshot("shape-match-complete.png", {
    animations: "disabled",
    fullPage: true
  });

  await assertNoRuntimeErrors();
});
