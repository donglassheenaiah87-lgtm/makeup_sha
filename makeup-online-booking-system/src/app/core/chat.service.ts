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
  orderBy
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';

export interface Message {
  sender: 'artist' | 'client';
  text: string;
  time: string;
  timestamp: number;
}

export interface Conversation {
  id: string; // The doc ID (e.g. artistId_clientId)
  artistId: string;
  clientId: string;
  artistName: string;
  clientName: string;
  lastMessage: string;
  lastTime: string;
  unreadArtist: number;
  unreadClient: number;
  messages: Message[];
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
      const q = query(convRef, where('artistId', '==', artistId));
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
      const q = query(convRef, where('clientId', '==', clientId));
      const unsubscribe = onSnapshot(q, (snap) => {
        const convs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Conversation));
        subscriber.next(convs);
      }, (error) => {
        subscriber.error(error);
      });
      return { unsubscribe };
    });
  }

  // ── Send Message ──
  async sendMessage(conversationId: string, message: Message, unreadArtist: number, unreadClient: number, lastMessage: string, lastTime: string) {
    const docRef = doc(this.firestore, `conversations/${conversationId}`);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as Conversation;
      const messages = data.messages || [];
      messages.push(message);
      return updateDoc(docRef, {
        messages,
        lastMessage,
        lastTime,
        unreadArtist,
        unreadClient
      });
    }
  }

  // ── Initialize Conversation ──
  async initializeConversation(conversationId: string, initialData: Omit<Conversation, 'id' | 'messages'>) {
    const docRef = doc(this.firestore, `conversations/${conversationId}`);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      return setDoc(docRef, { ...initialData, messages: [] });
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
