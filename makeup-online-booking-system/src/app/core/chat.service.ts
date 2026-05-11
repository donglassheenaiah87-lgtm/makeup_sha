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
  lastTime: any; // Reverted from lastTimestamp
  unreadArtist: number;
  unreadClient: number;
  participants: string[];
  createdAt: any;
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  constructor(private firestore: Firestore) {}

  // ── Get Conversations for Artist (Real-time) ──
  getConversationsForArtist(artistId: string): Observable<Conversation[]> {
    const convRef = collection(this.firestore, 'conversations'); // Reverted from chatRooms
    const q = query(convRef, where('artistId', '==', artistId));
    return new Observable<Conversation[]>(subscriber => {
      return onSnapshot(q, (snap) => {
        const convs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Conversation));
        convs.sort((a, b) => (b.lastTime?.seconds || 0) - (a.lastTime?.seconds || 0));
        subscriber.next(convs);
      }, error => subscriber.error(error));
    });
  }

  // ── Get Conversations for Client (Real-time) ──
  getConversationsForClient(clientId: string): Observable<Conversation[]> {
    const convRef = collection(this.firestore, 'conversations'); // Reverted from chatRooms
    const q = query(convRef, where('clientId', '==', clientId));
    return new Observable<Conversation[]>(subscriber => {
      return onSnapshot(q, (snap) => {
        const convs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Conversation));
        convs.sort((a, b) => (b.lastTime?.seconds || 0) - (a.lastTime?.seconds || 0));
        subscriber.next(convs);
      }, error => subscriber.error(error));
    });
  }

  // ── Get Messages for a Conversation ──
  getMessages(conversationId: string): Observable<Message[]> {
    const msgRef = collection(this.firestore, `conversations/${conversationId}/messages`);
    const q = query(msgRef, orderBy('timestamp', 'asc'));
    return new Observable<Message[]>(subscriber => {
      return onSnapshot(q, (snap) => {
        const messages = snap.docs.map(d => ({ id: d.id, ...d.data() } as Message));
        subscriber.next(messages);
      }, error => subscriber.error(error));
    });
  }

  // ── Send Message ──
  async sendMessage(conversationId: string, senderId: string, receiverId: string, text: string, senderRole: 'artist' | 'client', metadata?: any) {
    const convRef = doc(this.firestore, `conversations/${conversationId}`);
    const msgRef = collection(this.firestore, `conversations/${conversationId}/messages`);
    
    // 1. Ensure conversation exists
    const snap = await getDoc(convRef);
    if (!snap.exists()) {
      if (!metadata) throw new Error("Conversation does not exist.");
      await setDoc(convRef, {
        ...metadata,
        id: conversationId,
        lastMessage: text,
        lastTime: serverTimestamp(),
        unreadArtist: senderRole === 'client' ? 1 : 0,
        unreadClient: senderRole === 'artist' ? 1 : 0,
        createdAt: serverTimestamp(),
        participants: [metadata.artistId, metadata.clientId]
      });
    }

    // 2. Add message
    await addDoc(msgRef, {
      senderId,
      receiverId,
      text,
      timestamp: serverTimestamp()
    });

    // 3. Update conversation summary
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
  async initializeConversation(conversationId: string, data: Omit<Conversation, 'id'>) {
    const docRef = doc(this.firestore, `conversations/${conversationId}`);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      return setDoc(docRef, { 
        ...data, 
        id: conversationId, 
        lastTime: serverTimestamp(),
        createdAt: serverTimestamp(),
        participants: [data.artistId, data.clientId]
      });
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
