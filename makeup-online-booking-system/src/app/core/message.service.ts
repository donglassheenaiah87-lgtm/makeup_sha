import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  setDoc,
  query,
  where,
  orderBy,
  onSnapshot
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderRole: 'admin' | 'artist' | 'client';
  text: string;
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class MessageService {
  constructor(private firestore: Firestore) {}

  // ── Send a New Message (Admin, Artist, Client) ──
  async sendMessage(data: Omit<ChatMessage, 'id' | 'timestamp'>) {
    const ref = collection(this.firestore, 'messages');
    const newDocRef = doc(ref);
    return setDoc(newDocRef, { ...data, id: newDocRef.id, timestamp: new Date() });
  }

  // ── Get Messages for a Conversation (Admin, Artist, Client) ──
  getMessagesForConversation(conversationId: string): Observable<ChatMessage[]> {
    return new Observable<ChatMessage[]>(subscriber => {
      const ref = collection(this.firestore, 'messages');
      const q = query(ref, where('conversationId', '==', conversationId), orderBy('timestamp', 'asc'));
      const unsubscribe = onSnapshot(q, (snap) => {
        const messages = snap.docs.map(d => {
          const data = d.data();
          return {
            ...data,
            // Handle Firestore Timestamp to JS Date conversion if necessary
            timestamp: data['timestamp']?.toDate() || new Date()
          } as ChatMessage;
        });
        subscriber.next(messages);
      }, (error) => {
        subscriber.error(error);
      });
      return { unsubscribe };
    });
  }
}
