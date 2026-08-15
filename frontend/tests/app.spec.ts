import {expect, test} from '@playwright/test';

test.describe('Q-Med frontend skeleton', () => {
  test.beforeEach(async ({page}) => {
    await page.goto('/');
  });

  test('shows the language selection flow', async ({page}) => {
    await expect(page.getByText('Choose Language')).toBeVisible();
    await expect(page.getByText('Chọn ngôn ngữ')).toBeVisible();
  });

  test('opens the main tabs after first-run screens', async ({page}) => {
    await page.getByText('Tiếp tục').click();
    await page.getByText('Bỏ qua').click();

    await expect(page.getByText('Trang chủ').first()).toBeVisible();
    await expect(page.getByText('Đo').first()).toBeVisible();
    await expect(page.getByText('Q-Bot').first()).toBeVisible();
    await expect(page.getByText('Cài đặt').first()).toBeVisible();
  });
});
