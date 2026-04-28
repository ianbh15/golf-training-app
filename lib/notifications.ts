import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Show alerts for foreground notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const PRACTICE_IDS = [
  'practice-reminder-tue',
  'practice-reminder-wed',
  'practice-reminder-thu',
];

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

// Schedule weekly practice-day reminders for Tue/Wed/Thu at 8 am.
// Safe to call on every app launch — cancels stale schedules first.
export async function schedulePracticeReminders(): Promise<void> {
  if (Platform.OS === 'web') return;
  const granted = await requestNotificationPermissions();
  if (!granted) return;

  // Cancel any previously scheduled reminders before re-scheduling
  for (const id of PRACTICE_IDS) {
    await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
  }

  // Weekday numbering: 1=Sunday … 7=Saturday
  const days = [
    { id: 'practice-reminder-tue', weekday: 3, label: 'Tuesday' },
    { id: 'practice-reminder-wed', weekday: 4, label: 'Wednesday' },
    { id: 'practice-reminder-thu', weekday: 5, label: 'Thursday' },
  ] as const;

  for (const day of days) {
    await Notifications.scheduleNotificationAsync({
      identifier: day.id,
      content: {
        title: 'Practice day',
        body: `Your ${day.label} session is ready.`,
        data: { screen: 'practice' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: day.weekday,
        hour: 8,
        minute: 0,
      },
    });
  }
}

export async function cancelPracticeReminders(): Promise<void> {
  for (const id of PRACTICE_IDS) {
    await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
  }
}

// Fire a one-shot notification shortly after the weekly summary is generated.
export async function notifyWeeklySummaryReady(): Promise<void> {
  if (Platform.OS === 'web') return;
  const granted = await requestNotificationPermissions();
  if (!granted) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Weekly summary ready',
      body: 'Your GoLo Coach has analyzed this week.',
      data: { screen: 'coach' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 2,
    },
  });
}
