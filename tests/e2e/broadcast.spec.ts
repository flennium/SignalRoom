import { expect, test } from '@playwright/test';

test('two browser clients share presence and one authoritative notice', async ({
  browser,
}) => {
  const hostContext = await browser.newContext();
  const host = await hostContext.newPage();
  await host.goto('/');
  await host.getByLabel('Room label').fill('API rehearsal');
  await host.getByLabel('Your name').first().fill('Sam');
  await host.getByRole('button', { name: 'Create room' }).click();
  await expect(
    host.getByRole('heading', { name: 'API rehearsal' }),
  ).toBeVisible();

  const participantContext = await browser.newContext();
  await participantContext.addInitScript(() => {
    localStorage.setItem('signalroom.displayName', 'Lina');
  });
  const participant = await participantContext.newPage();
  await participant.goto(host.url());

  await expect(
    host
      .getByText('2 online', { exact: true })
      .filter({ visible: true })
      .first(),
  ).toBeVisible();
  await expect(
    participant
      .getByText('2 online', { exact: true })
      .filter({ visible: true })
      .first(),
  ).toBeVisible();

  await host.getByLabel('Write a signal').fill('The API is ready.');
  await host.getByRole('button', { name: 'Publish' }).click();

  await expect(host.getByText('The API is ready.')).toHaveCount(1);
  await expect(participant.getByText('The API is ready.')).toHaveCount(1);

  await host.getByLabel('Action').check({ force: true });
  await host.getByLabel('Write a signal').fill('Restart the test client.');
  await host.getByRole('button', { name: 'Publish' }).click();
  await participant.getByRole('button', { name: 'Acknowledge action' }).click();
  await expect(host.getByText('1 of 2 online acknowledged')).toBeVisible();
  await expect(
    participant.getByRole('button', { name: 'Acknowledged' }),
  ).toBeDisabled();

  await host.getByLabel('Notice').check({ force: true });
  await host
    .getByLabel('Write a signal')
    .fill('<img src=x onerror="window.signalRoomXss=true">');
  await host.getByRole('button', { name: 'Publish' }).click();
  await expect(
    participant.getByText('<img src=x onerror="window.signalRoomXss=true">'),
  ).toBeVisible();
  expect(
    await participant.evaluate(
      () => (window as Window & { signalRoomXss?: boolean }).signalRoomXss,
    ),
  ).toBeUndefined();

  const storedKeys = await host.evaluate(() =>
    Object.keys(localStorage).sort(),
  );
  expect(storedKeys).toEqual(['signalroom.displayName', 'signalroom.lastKind']);

  await hostContext.close();
  await participantContext.close();
});

test('participant rail opens on a narrow screen', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    localStorage.setItem('signalroom.displayName', 'Noor');
  });
  await page.goto(`/r/mobile-room-${testInfo.project.name}`);
  await page.getByRole('button', { name: '1 online' }).click();
  await expect(
    page.getByRole('heading', { name: 'Participants' }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Close participants' })
    .first()
    .click();
});
