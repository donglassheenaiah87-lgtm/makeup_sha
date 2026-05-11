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
  lastTimestamp: any; // Renamed from lastTime
  unreadArtist: number;
  unreadClient: number;
  participants: string[]; // Added
  createdAt: any;
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  constructor(private firestore: Firestore) {}

  // ── Get Conversations for Artist (Real-time) ──
  getConversationsForArtist(artistId: string): Observable<Conversation[]> {
    console.log('[ChatService] Getting convs for artist:', artistId);
    const convRef = collection(this.firestore, 'chatRooms');
    const q = query(convRef, where('artistId', '==', artistId));
    return new Observable<Conversation[]>(subscriber => {
      return onSnapshot(q, (snap) => {
        console.log('[ChatService] Artist convs snap size:', snap.size);
        const convs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Conversation));
        convs.sort((a, b) => (b.lastTimestamp?.seconds || 0) - (a.lastTimestamp?.seconds || 0));
        subscriber.next(convs);
      }, error => {
        console.error('[ChatService] Artist onSnapshot error:', error);
        subscriber.error(error);
      });
    });
  }

  // ── Get Conversations for Client (Real-time) ──
  getConversationsForClient(clientId: string): Observable<Conversation[]> {
    console.log('[ChatService] Getting convs for client:', clientId);
    const convRef = collection(this.firestore, 'chatRooms');
    // Using simple where first to avoid index issues
    const q = query(convRef, where('clientId', '==', clientId));
    return new Observable<Conversation[]>(subscriber => {
      return onSnapshot(q, (snap) => {
        console.log('[ChatService] Client convs snap size:', snap.size);
        const convs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Conversation));
        convs.sort((a, b) => (b.lastTimestamp?.seconds || 0) - (a.lastTimestamp?.seconds || 0));
        subscriber.next(convs);
      }, error => {
        console.error('[ChatService] Client onSnapshot error:', error);
        subscriber.error(error);
      });
    });
  }

  // ── Get Messages for a Conversation ──
  getMessages(conversationId: string): Observable<Message[]> {
    const msgRef = collection(this.firestore, `chatRooms/${conversationId}/messages`);
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
    console.log('[ChatService] Sending message to:', conversationId);
    const convRef = doc(this.firestore, `chatRooms/${conversationId}`);
    const msgRef = collection(this.firestore, `chatRooms/${conversationId}/messages`);
    
    // 1. Ensure conversation exists
    const snap = await getDoc(convRef);
    if (!snap.exists()) {
      console.log('[ChatService] Room missing, creating with metadata...');
      if (!metadata) throw new Error("Chat room does not exist and no metadata provided.");
      await setDoc(convRef, {
        ...metadata,
        id: conversationId,
        lastMessage: text,
        lastTimestamp: serverTimestamp(),
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

    // 3. Update conversation summary if it already existed
    if (snap.exists()) {
      const data = snap.data() as Conversation;
      const updates: any = {
        lastMessage: text,
        lastTimestamp: serverTimestamp()
      };
      if (senderRole === 'artist') {
        updates.unreadClient = (data.unreadClient || 0) + 1;
      } else {
        updates.unreadArtist = (data.unreadArtist || 0) + 1;
      }
      await updateDoc(convRef, updates);
    }
  }

  // ── Initialize Conversation (Explicitly) ──
  async initializeConversation(conversationId: string, data: Omit<Conversation, 'id'>) {
    const docRef = doc(this.firestore, `chatRooms/${conversationId}`);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      console.log('[ChatService] Explicitly initializing room:', conversationId);
      return setDoc(docRef, { 
        ...data, 
        id: conversationId, 
        lastTimestamp: serverTimestamp(),
        createdAt: serverTimestamp(),
        participants: [data.artistId, data.clientId]
      });
    }
  }

  // ── Mark as Read ──
  async markAsRead(conversationId: string, role: 'artist' | 'client') {
    const docRef = doc(this.firestore, `chatRooms/${conversationId}`);
    return updateDoc(docRef, {
      [role === 'artist' ? 'unreadArtist' : 'unreadClient']: 0
    });
  }
}
