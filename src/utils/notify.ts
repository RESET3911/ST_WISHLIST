import { RingiSettings, User } from '../types';

async function push(topic: string, title: string, body: string): Promise<void> {
  if (!topic.trim()) return;
  await fetch('https://ntfy.sh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      topic: topic.trim(),
      title,
      message: body,
      priority: 3,
      tags: ['shopping_cart'],
    }),
  });
}

export async function notifyRingiApply(
  itemName: string,
  price: number | undefined,
  applicant: User,
  settings: RingiSettings
): Promise<void> {
  const { ntfyTopic } = settings;
  if (!ntfyTopic) return;
  const applicantName = applicant === 'A' ? settings.userA.name : settings.userB.name;
  const priceStr = price != null ? `\n金額: ¥${price.toLocaleString()}` : '';
  await push(
    ntfyTopic,
    `🛍️ ウィッシュリストから申請: ${itemName}`,
    `${applicantName}がRINGIに申請しました${priceStr}`
  );
}
