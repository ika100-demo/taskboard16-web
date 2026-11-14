import { expect, test } from "@playwright/test";

// These specs assume the app runs with API_URL unset.
// The e2e server runs without a reachable Task API (API_URL unset), i.e. "the Task API is down".

test("AC-001.6 the start page loads with 200 and shows the load error and the form", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  const main = page.getByRole("main");
  await expect(main.getByRole("heading", { level: 1, name: "Taskboard" })).toBeVisible();
  await expect(main.getByText("Tasks could not be loaded. Please try again later.")).toBeVisible();
  await expect(main.getByRole("form", { name: "Create task" })).toBeVisible();
});

test("AC-001.7 submitting while the Task API is down shows the save error and keeps the title", async ({ page }) => {
  await page.goto("/");
  const form = page.getByRole("form", { name: "Create task" });
  await form.getByLabel("Title").fill("Call Anna");
  await form.getByRole("button", { name: "Add task" }).click();
  await expect(form.getByRole("alert")).toHaveText("The task could not be saved. Please try again.");
  await expect(form.getByLabel("Title")).toHaveValue("Call Anna");
});

test("AC-001.4 an empty title shows the validation message", async ({ page }) => {
  await page.goto("/");
  const form = page.getByRole("form", { name: "Create task" });
  await form.getByRole("button", { name: "Add task" }).click();
  await expect(form.getByRole("alert")).toHaveText("Title must be 1 to 200 characters");
});

test("AC-001.8 the probes answer 200 while the Task API is down", async ({ request }) => {
  expect((await request.get("/api/health")).status()).toBe(200);
  expect((await request.get("/api/ready")).status()).toBe(200);
});
