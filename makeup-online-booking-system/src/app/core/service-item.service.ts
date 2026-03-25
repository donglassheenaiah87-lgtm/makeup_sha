import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where
} from '@angular/fire/firestore';

export interface ServiceData {
  id: string; // Document ID
  icon?: string;
  imageUrl?: string;
  name: string;
  desc: string;
  price: string;
  duration: string;
  bookings: number;
  status: 'active' | 'inactive';
  createdAt: Date;
}

@Injectable({
  providedIn: 'root'
})
export class ServiceItemService {

  constructor(private firestore: Firestore) {}

  // ── Create a new service ──
  async addService(data: Omit<ServiceData, 'id'>) {
    const servicesRef = collection(this.firestore, 'services');
    const newDocRef = doc(servicesRef);
    return setDoc(newDocRef, { ...data, id: newDocRef.id, createdAt: new Date() });
  }

  // ── Get all services ──
  async getAllServices(): Promise<ServiceData[]> {
    const servicesRef = collection(this.firestore, 'services');
    const snap = await getDocs(servicesRef);
    return snap.docs.map(d => d.data() as ServiceData);
  }

  // ── Update service ──
  async updateService(id: string, data: Partial<ServiceData>) {
    const serviceRef = doc(this.firestore, `services/${id}`);
    return updateDoc(serviceRef, { ...data });
  }

  // ── Update service status ──
  async updateServiceStatus(id: string, status: string) {
    const serviceRef = doc(this.firestore, `services/${id}`);
    return updateDoc(serviceRef, { status });
  }

  // ── Delete service ──
  async deleteService(id: string) {
    const serviceRef = doc(this.firestore, `services/${id}`);
    return deleteDoc(serviceRef);
  }
}
