import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  setDoc,
  query,
  where,
  onSnapshot
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';

export interface MonthlyReport {
  id: string; // e.g. "2026-05_system" or "2026-05_artistId"
  month: string; // YYYY-MM format
  type: 'system' | 'artist';
  artistId?: string;
  totalBookings: number;
  totalRevenue: number;
  completedBookings: number;
  cancelledBookings: number;
  generatedAt: Date;
}

@Injectable({
  providedIn: 'root'
})
export class MonthlyReportService {
  constructor(private firestore: Firestore) {}

  // ── Save or Update Monthly Report (Admin/System) ──
  async saveMonthlyReport(data: Omit<MonthlyReport, 'id' | 'generatedAt'>) {
    const id = data.type === 'system' ? `${data.month}_system` : `${data.month}_${data.artistId}`;
    const docRef = doc(this.firestore, `monthlyReports/${id}`);
    return setDoc(docRef, { ...data, id, generatedAt: new Date() }, { merge: true });
  }

  // ── Get System-wide Reports (Admin) ──
  getSystemReportsRealtime(): Observable<MonthlyReport[]> {
    return new Observable<MonthlyReport[]>(subscriber => {
      const ref = collection(this.firestore, 'monthlyReports');
      const q = query(ref, where('type', '==', 'system'));
      const unsubscribe = onSnapshot(q, (snap) => {
        const reports = snap.docs.map(d => d.data() as MonthlyReport);
        subscriber.next(reports.sort((a, b) => b.month.localeCompare(a.month)));
      }, (error) => {
        subscriber.error(error);
      });
      return { unsubscribe };
    });
  }

  // ── Get Reports for a Specific Artist (Artist & Admin) ──
  getArtistReportsRealtime(artistId: string): Observable<MonthlyReport[]> {
    return new Observable<MonthlyReport[]>(subscriber => {
      const ref = collection(this.firestore, 'monthlyReports');
      const q = query(ref, where('type', '==', 'artist'), where('artistId', '==', artistId));
      const unsubscribe = onSnapshot(q, (snap) => {
        const reports = snap.docs.map(d => d.data() as MonthlyReport);
        subscriber.next(reports.sort((a, b) => b.month.localeCompare(a.month)));
      }, (error) => {
        subscriber.error(error);
      });
      return { unsubscribe };
    });
  }
}
