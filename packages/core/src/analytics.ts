export interface ClickEvent {
  code: string;
  timestamp: number;
  userAgent: string;
  ip: string;
}

export interface ClickRecord extends ClickEvent {
  clickId: string;
}
