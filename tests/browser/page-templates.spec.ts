import { expect, test } from "@playwright/test";

test("work-display catalog pages expose the registered grid template", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "项目库", exact: true }).click();

  const shell = page.locator(".page-template-shell");
  await expect(shell).toHaveAttribute("data-template", "grid");
  await expect(
    shell.getByText("还没有本地项目", { exact: false }),
  ).toBeVisible();
  await expect(
    shell.locator(".catalog-page-actions .primary-button"),
  ).toBeVisible();
  await shell.getByRole("button", { name: "新建项目", exact: true }).click();
  await page.getByRole("button", { name: "项目库", exact: true }).click();
  await expect(shell.locator(".project-grid")).toBeVisible();
  await expect(shell.locator(".project-library-card")).toHaveCount(1);
});
