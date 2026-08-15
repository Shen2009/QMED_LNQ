import { test, expect } from '@playwright/test';

test.describe('Q-Med Expo Web smoke', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Splash waits 2s before navigating to Login; keep buffer for CI variance.
    await page.waitForTimeout(3500);
  });

  test('renders login screen after splash', async ({ page }) => {
    await expect(page.getByText('Chào mừng trở lại!')).toBeVisible();
    await expect(
      page.getByText('Đăng nhập để tiếp tục theo dõi sức khỏe của bạn'),
    ).toBeVisible();
    await expect(page.getByText('Đăng nhập', {exact: true})).toBeVisible();
  });

  test('navigates from Login to Register', async ({ page }) => {
    await page.getByText('Chưa có tài khoản? Đăng ký ngay').click();
    await expect(page.getByText('Tạo tài khoản mới')).toBeVisible();
    await expect(
      page.getByText('Bắt đầu hành trình chăm sóc sức khỏe cùng Q-Med'),
    ).toBeVisible();
  });

  test('shows validation error on empty login submit', async ({ page }) => {
    await page.getByText('Đăng nhập', {exact: true}).click();
    await expect(page.getByText('Vui lòng nhập email và mật khẩu')).toBeVisible();
  });

  test('logs in successfully with local mock auth and lands on Home', async ({ page }) => {
    await page.getByPlaceholder('Nhập email của bạn').fill('test@example.com');
    await page.getByPlaceholder('Nhập mật khẩu của bạn').fill('Password123');
    await page.getByText('Đăng nhập', {exact: true}).click();

    await expect(page.getByText('Chào test!')).toBeVisible();
    await expect(page.getByText('Thao tác nhanh')).toBeVisible();
  });

  test('switches language to English in Profile settings', async ({ page }) => {
    await page.getByPlaceholder('Nhập email của bạn').fill('test@example.com');
    await page.getByPlaceholder('Nhập mật khẩu của bạn').fill('Password123');
    await page.getByText('Đăng nhập', {exact: true}).click();

    await page.getByText('Hồ sơ', {exact: true}).first().click();
    await page.getByText('English', {exact: true}).click();

    await expect(page.getByText('Profile', {exact: true}).first()).toBeVisible();
    await expect(page.getByText('Settings', {exact: true})).toBeVisible();
    await expect(page.getByText('Language', {exact: true})).toBeVisible();
    await expect(page.getByText('Home', {exact: true})).toBeVisible();
  });
});


