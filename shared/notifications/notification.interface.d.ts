export type NotificationChannel = 'email' | 'telegram' | 'whatsapp';
export type NotificationType = 'order_confirmation' | 'payment_confirmation' | 'order_status_update' | 'shipment_tracking' | 'custom';
export interface SendNotificationDto {
    channel: NotificationChannel;
    type: NotificationType;
    recipient: string;
    subject?: string;
    message: string;
    templateData?: Record<string, any>;
    botToken?: string;
    chatId?: string;
    parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
    inlineKeyboard?: Array<Array<{
        text: string;
        url?: string;
        callback_data?: string;
    }>>;
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
