import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideAuth, getAuth } from '@angular/fire/auth';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';
import { provideAnalytics, getAnalytics } from '@angular/fire/analytics';
import { routes } from './app.routes';

const firebaseConfig = {
  apiKey: "AIzaSyAlos4rj_yaO84h7CrgZpqRiKejTiQrUmQ",
  authDomain: "my-makeupservice-project.firebaseapp.com",
  projectId: "my-makeupservice-project",
  storageBucket: "my-makeupservice-project.firebasestorage.app",
  messagingSenderId: "1048905694112",
  appId: "1:1048905694112:web:e71199d03533d8909e82c5",
  measurementId: "G-QQP0V023EZ"
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideFirebaseApp(() => initializeApp(firebaseConfig)),
    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore()),
    provideAnalytics(() => getAnalytics()),
  ]
};