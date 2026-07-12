import { expect, test } from "@playwright/test";

test("participants vote after reveal", async ({ browser }) => {
  const host = await browser.newContext();
  const hostPage = await host.newPage();
  await hostPage.goto("/");
  await hostPage.getByRole("button", { name: "Create a table" }).click();
  await hostPage.waitForURL(/\/room\/[A-Z0-9]+/);
  await hostPage.getByLabel("Display name").fill("Host");
  await hostPage.getByRole("button", { name: "Take a seat" }).click();
  await expect(hostPage.getByText("Dealer controls")).toBeVisible();
  await hostPage.getByLabel("Prompt").fill("Where should we eat?");
  await hostPage.getByRole("button", { name: "Deal" }).click();

  const guest = await browser.newContext();
  const guestPage = await guest.newPage();
  await guestPage.goto(hostPage.url());
  await guestPage.getByLabel("Display name").fill("Guest");
  await guestPage.getByRole("button", { name: "Take a seat" }).click();
  await expect(guestPage.getByLabel("Players at the table")).toContainText("K♠ Guest");
  await guestPage.getByLabel("Your next card").fill("Pizza");
  await guestPage.getByRole("button", { name: "Fold to table" }).click();

  await expect(hostPage.getByRole("button", { name: "Reveal" })).toBeEnabled({ timeout: 10_000 });
  await hostPage.getByRole("button", { name: "Reveal" }).click();
  await expect(guestPage.getByLabel("All face-up cards on the table")).toContainText("Pizza", { timeout: 10_000 });
  await guestPage.getByRole("button", { name: "Vote for pizza group; 0 votes" }).click();
  await expect(hostPage.getByRole("button", { name: "Vote for pizza group; 1 vote" })).toBeVisible({ timeout: 10_000 });

  const late = await browser.newContext();
  const latePage = await late.newPage();
  await latePage.goto(hostPage.url());
  await latePage.getByLabel("Display name").fill("Late guest");
  await latePage.getByRole("button", { name: "Take a seat" }).click();
  await latePage.getByRole("button", { name: "Vote for pizza group; 1 vote" }).click();
  await expect(hostPage.getByRole("button", { name: "Vote for pizza group; 2 votes" })).toBeVisible({ timeout: 10_000 });

  await late.close();
  await guest.close();
  await host.close();
});
