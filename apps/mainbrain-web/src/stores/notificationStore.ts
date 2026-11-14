export interface NotificationItem {
  id: string;
  kind: "agent" | "artifact" | "approval" | "workflow" | "knowledge";
  message: string;
}

export interface NotificationStoreState {
  items: NotificationItem[];
}

export const initialNotificationStoreState: NotificationStoreState = {
  items: [],
};
