import { Injectable } from '@nestjs/common';
import { Subject } from 'rxjs';

export type AdminEventType =
  | 'PERMISSIONS_UPDATED'
  | 'SESSION_REVOKED'
  | 'EMERGENCY_LOCK'
  | 'EMERGENCY_UNLOCK';

export interface AdminEvent {
  type: AdminEventType;
  permissionVersion?: number;
  timestamp: string;
}

@Injectable()
export class AdminEventsService {
  private readonly events$ = new Subject<AdminEvent>();

  stream() {
    return this.events$.asObservable();
  }

  emit(event: Omit<AdminEvent, 'timestamp'>) {
    this.events$.next({ ...event, timestamp: new Date().toISOString() });
  }
}
