import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';

export interface IncidentReport {
  id: string;
  uid: string;
  clientName: string;
  clientEmail: string;
  category: string;
  messages: string[];
  status: 'open' | 'investigating' | 'resolved' | 'closed';
  createdAt: any;
  updatedAt?: any;
}

@Injectable({
  providedIn: 'root'
})
export class ReportService {
  constructor(private firestore: Firestore) {}

  getAllReportsRealtime(): Observable<IncidentReport[]> {
    return new Observable<IncidentReport[]>(subscriber => {
      const ref = collection(this.firestore, 'reports');
      const q = query(ref, orderBy('createdAt', 'desc'));
      const unsubscribe = onSnapshot(q, (snap) => {
        const reports = snap.docs.map(d => ({ ...d.data(), id: d.id } as IncidentReport));
        subscriber.next(reports);
      }, (error) => {
        subscriber.error(error);
      });
      return { unsubscribe };
    });
  }

  async updateReportStatus(id: string, status: 'open' | 'investigating' | 'resolved' | 'closed') {
    const docRef = doc(this.firestore, `reports/${id}`);
    return updateDoc(docRef, { 
      status, 
      updatedAt: serverTimestamp() 
    });
  }
}
