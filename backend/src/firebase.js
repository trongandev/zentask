import { initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

let credential;
if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    const serviceAccountPath = path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
    if (fs.existsSync(serviceAccountPath)) {
        const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
        credential = cert(serviceAccount);
    }
}

if (!credential) {
    try {
        credential = applicationDefault();
    } catch (error) {
        console.warn("Could not find default credentials. Please set GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT_PATH.");
    }
}

try {
    const config = credential ? { credential } : {};
    initializeApp(config);
} catch (error) {
    console.error("Firebase admin init failed", error);
}

export const db = getFirestore();
export const auth = getAuth();
