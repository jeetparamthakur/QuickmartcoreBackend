import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const BATCH_SIZE = 100;

export type ExpoPushMessage = {
  to: string;
  title: string;
  body: string;
  sound?: 'default' | null;
  priority?: 'default' | 'normal' | 'high';
  channelId?: string;
  data?: Record<string, string>;
};

@Injectable()
export class ExpoPushService {
  private readonly logger = new Logger(ExpoPushService.name);

  constructor(private readonly config: ConfigService) {}

  async sendMessages(messages: ExpoPushMessage[]): Promise<void> {
    if (!messages.length) return;

    const accessToken = this.config.get<string>('expo.accessToken');
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Accept-Encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    };
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }

    for (let i = 0; i < messages.length; i += BATCH_SIZE) {
      const chunk = messages.slice(i, i + BATCH_SIZE);
      try {
        const res = await fetch(EXPO_PUSH_URL, {
          method: 'POST',
          headers,
          body: JSON.stringify(chunk),
        });
        if (!res.ok) {
          const text = await res.text();
          this.logger.warn(`Expo push HTTP ${res.status}: ${text}`);
          continue;
        }
        const json = (await res.json()) as {
          data?: { status?: string; message?: string; details?: unknown }[];
        };
        for (const ticket of json.data ?? []) {
          if (ticket.status === 'error') {
            this.logger.warn(
              `Expo push ticket error: ${ticket.message ?? 'unknown'}`,
              ticket.details,
            );
          }
        }
      } catch (err) {
        this.logger.warn(
          `Expo push request failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
  }
}
