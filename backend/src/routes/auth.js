import { Router } from "express";
import { auth, db } from "../firebase.js";
import { FieldValue } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { OAuth2Client } from "google-auth-library";
dotenv.config();
const router = Router();

// Retrieve Web API key for Identity Toolkit calls
let firebaseApiKey = process.env.FIREBASE_API_KEY;
console.log(firebaseApiKey);

const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  "http://localhost:3001/api/auth/google/callback" // Redirect URI
);

// Initiate Google Login
router.get("/google", (req, res) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(500).send("Google Client ID or Secret is missing in backend.");
  }
  const authorizeUrl = googleClient.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/userinfo.profile', 'https://www.googleapis.com/auth/userinfo.email'],
    prompt: 'consent'
  });
  res.redirect(authorizeUrl);
});

// Google Login Callback
router.get("/google/callback", async (req, res) => {
  const code = req.query.code;
  if (!code) {
    return res.redirect(`${process.env.FRONTEND_URL}/auth?error=NoCode`);
  }

  try {
    const { tokens } = await googleClient.getToken(code);
    googleClient.setCredentials(tokens);

    // Verify Google ID Token
    const ticket = await googleClient.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { email, name, picture } = payload;

    if (!email) {
      return res.redirect(`${process.env.FRONTEND_URL}/auth?error=NoEmail`);
    }

    // Find or create user in Firebase Auth
    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(email);
    } catch (e) {
      if (e.code === "auth/user-not-found") {
        userRecord = await auth.createUser({
          email: email,
          displayName: name || "Học viên",
          photoURL: picture || "https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=200&auto=format&fit=crop",
        });
      } else {
        throw e;
      }
    }

    const uid = userRecord.uid;

    // Generate Custom Token
    const customToken = await auth.createCustomToken(uid);

    // Exchange Custom Token for Firebase ID Token
    const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${firebaseApiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: customToken, returnSecureToken: true })
    });

    const data = await response.json();
    if (data.error) {
      console.error("Firebase signInWithCustomToken error:", data.error);
      return res.redirect(`${process.env.FRONTEND_URL}/auth?error=${data.error.message}`);
    }

    const firebaseIdToken = data.idToken;

    const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days
    const sessionCookie = await auth.createSessionCookie(firebaseIdToken, { expiresIn });
    const options = { maxAge: expiresIn, httpOnly: true, secure: process.env.NODE_ENV === "production" };
    res.cookie("session", sessionCookie, options);

    // Initialize user in Firestore if not exists
    const userDocRef = db.collection("users").doc(uid);
    const userDocSnap = await userDocRef.get();

    if (!userDocSnap.exists) {
      await userDocRef.set({
        uid: userRecord.uid,
        email: userRecord.email || "",
        displayName: userRecord.displayName || "Học viên",
        photoURL: userRecord.photoURL || "https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=200&auto=format&fit=crop",
        role: "user",
        level: 1,
        xp: 0,
        streak: 0,
        rankId: 1,
        tier: 3,
        stars: 0,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    res.redirect(`${process.env.FRONTEND_URL}/`);
  } catch (error) {
    console.error("Google auth callback error:", error);
    res.redirect(`${process.env.FRONTEND_URL}/auth?error=CallbackFailed`);
  }
});

// Login with email and password
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).send("Missing email or password");
  }

  if (!firebaseApiKey) {
    return res.status(500).send("Firebase API Key not configured on backend.");
  }

  try {
    // We use the Identity Toolkit REST API to verify password
    const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseApiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    });

    const data = await response.json();

    if (data.error) {
      return res.status(401).json({ error: data.error.message });
    }

    const idToken = data.idToken;
    const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days
    const sessionCookie = await auth.createSessionCookie(idToken, { expiresIn });

    const options = { maxAge: expiresIn, httpOnly: true, secure: process.env.NODE_ENV === "production" };
    res.cookie("session", sessionCookie, options);

    res.status(200).json({ status: "success", uid: data.localId });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

// Register with email and password
router.post("/register", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).send("Missing email or password");
  }

  try {
    const userRecord = await auth.createUser({
      email,
      password,
    });

    // After creating user, sign in to get idToken for session cookie
    const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseApiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    });

    const data = await response.json();

    if (data.error) {
      return res.status(401).json({ error: data.error.message });
    }

    const idToken = data.idToken;
    const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days
    const sessionCookie = await auth.createSessionCookie(idToken, { expiresIn });

    const options = { maxAge: expiresIn, httpOnly: true, secure: process.env.NODE_ENV === "production" };
    res.cookie("session", sessionCookie, options);

    res.status(200).json({ status: "success", uid: userRecord.uid });
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: error.message || "Error creating user" });
  }
});

router.post("/logout", (req, res) => {
  res.clearCookie("session");
  res.status(200).json({ status: "success" });
});

router.get("/me", async (req, res) => {
  const sessionCookie = req.cookies.session || "";

  if (!sessionCookie) {
    return res.status(401).send("Unauthenticated");
  }

  try {
    const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
    const userRecord = await auth.getUser(decodedClaims.uid);

    const userDocRef = db.collection("users").doc(userRecord.uid);
    const userDocSnap = await userDocRef.get();

    let userProfile;
    if (userDocSnap.exists) {
      userProfile = userDocSnap.data();
    } else {
      userProfile = {
        uid: userRecord.uid,
        email: userRecord.email || "",
        displayName: userRecord.displayName || "Học viên",
        photoURL: userRecord.photoURL || "https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=200&auto=format&fit=crop",
        role: "user",
        level: 1,
        xp: 0,
        streak: 0,
        rankId: 1,
        tier: 3,
        stars: 0,
      };

      await userDocRef.set({
        ...userProfile,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    res.status(200).json(userProfile);
  } catch (error) {
    res.clearCookie("session");
    res.status(401).send("Unauthenticated");
  }
});

export default router;
