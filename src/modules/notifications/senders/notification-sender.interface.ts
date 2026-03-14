export interface INotificationSender {
  send(token: string, title: string, body: string, data?: Record<string, string>): Promise<void>;
}
