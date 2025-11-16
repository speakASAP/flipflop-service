/**
 * Notification Service Interfaces
 */

export type NotificationChannel = 'email' | 'telegram' | 'whatsapp';

export type NotificationType =
  | 'order_confirmation'
  | 'payment_confirmation'
  | 'order_status_update'
  | 'shipment_tracking'
  | 'custom';

export interface SendNotificationDto {
  channel: NotificationChannel;
  type: NotificationType;
  recipient: string; // email, phone number, or telegram chat ID
  subject?: string; // Required for email
  message: string;
  templateData?: Record<string, any>;
  // Telegram-specific fields (optional)
  botToken?: string; // Per-request bot token (overrides global)
  chatId?: string; // Alternative to recipient for Telegram
  parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2'; // Message parse mode
  inlineKeyboard?: Array<Array<{
    text: string;
    url?: string;
    callback_data?: string;
  }>>; // Inline keyboard buttons
}

export interface NotificationResponse {
  success: boolean;
  data?: {
    id: string;
    status: string;
    channel: NotificationChannel;
    recipient: string;
  };
  error?: {
    code: string;
    message: string;
  };
}
