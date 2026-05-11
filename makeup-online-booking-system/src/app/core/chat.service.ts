import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  addDoc
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';

export interface Message {
  id?: string;
  senderId: string;
  receiverId: string;
  text: string;
  timestamp: any;
}

export interface Conversation {
  id: string; // The doc ID (e.g. artistId_clientId)
  artistId: string;
  clientId: string;
  artistName: string;
  clientName: string;
  artistImage?: string;
  clientImage?: string;
  lastMessage: string;
  lastTime: any;
  unreadArtist: number;
  unreadClient: number;
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  constructor(private firestore: Firestore) {}

  // ── Get Conversations for Artist ──
  getConversationsForArtist(artistId: string): Observable<Conversation[]> {
    return new Observable<Conversation[]>(subscriber => {
      const convRef = collection(this.firestore, 'conversations');
      const q = query(convRef, where('artistId', '==', artistId), orderBy('lastTime', 'desc'));
      const unsubscribe = onSnapshot(q, (snap) => {
        const convs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Conversation));
        subscriber.next(convs);
      }, (error) => {
        subscriber.error(error);
      });
      return { unsubscribe };
    });
  }

  // ── Get Conversations for Client ──
  getConversationsForClient(clientId: string): Observable<Conversation[]> {
    return new Observable<Conversation[]>(subscriber => {
      const convRef = collection(this.firestore, 'conversations');
      const q = query(convRef, where('clientId', '==', clientId), orderBy('lastTime', 'desc'));
      const unsubscribe = onSnapshot(q, (snap) => {
        const convs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Conversation));
        subscriber.next(convs);
      }, (error) => {
        subscriber.error(error);
      });
      return { unsubscribe };
    });
  }

  // ── Get Messages for a Conversation ──
  getMessages(conversationId: string): Observable<Message[]> {
    return new Observable<Message[]>(subscriber => {
      const msgRef = collection(this.firestore, `conversations/${conversationId}/messages`);
      const q = query(msgRef, orderBy('timestamp', 'asc'));
      const unsubscribe = onSnapshot(q, (snap) => {
        const messages = snap.docs.map(d => ({ id: d.id, ...d.data() } as Message));
        subscriber.next(messages);
      }, (error) => {
        subscriber.error(error);
      });
      return { unsubscribe };
    });
  }

  // ── Send Message ──
  async sendMessage(conversationId: string, senderId: string, receiverId: string, text: string, senderRole: 'artist' | 'client') {
    const convRef = doc(this.firestore, `conversations/${conversationId}`);
    const msgRef = collection(this.firestore, `conversations/${conversationId}/messages`);
    
    const messageData = {
      senderId,
      receiverId,
      text,
      timestamp: serverTimestamp()
    };

    // 1. Add message to subcollection
    await addDoc(msgRef, messageData);

    // 2. Update conversation summary
    const snap = await getDoc(convRef);
    if (snap.exists()) {
      const data = snap.data() as Conversation;
      const updates: any = {
        lastMessage: text,
        lastTime: serverTimestamp()
      };
      
      if (senderRole === 'artist') {
        updates.unreadClient = (data.unreadClient || 0) + 1;
      } else {
        updates.unreadArtist = (data.unreadArtist || 0) + 1;
      }

      await updateDoc(convRef, updates);
    }
  }

  // ── Initialize Conversation ──
  async initializeConversation(conversationId: string, initialData: Omit<Conversation, 'id'>) {
    const docRef = doc(this.firestore, `conversations/${conversationId}`);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      return setDoc(docRef, { ...initialData, id: conversationId, lastTime: serverTimestamp() });
    }
  }

  // ── Mark as Read ──
  async markAsRead(conversationId: string, role: 'artist' | 'client') {
    const docRef = doc(this.firestore, `conversations/${conversationId}`);
    return updateDoc(docRef, {
      [role === 'artist' ? 'unreadArtist' : 'unreadClient']: 0
    });
  }
}
