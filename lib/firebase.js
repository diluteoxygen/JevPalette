const https = require('https');

const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'specrec';
const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY || '';

/**
 * Record a verified beta user into Firebase Firestore via REST API
 */
async function recordBetaUser(email, accessCode, metadata = {}) {
  const record = {
    email: email.toLowerCase(),
    accessCode,
    verifiedAt: new Date().toISOString(),
    userAgent: metadata.userAgent || '',
    ip: metadata.ip || '',
  };

  // If Firebase API key is present, persist to Firestore
  if (FIREBASE_PROJECT_ID && FIREBASE_API_KEY) {
    try {
      const docId = encodeURIComponent(email.replace(/[^a-zA-Z0-9]/g, '_'));
      const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/beta_users/${docId}?key=${FIREBASE_API_KEY}`;

      const firestoreBody = {
        fields: {
          email: { stringValue: record.email },
          accessCode: { stringValue: record.accessCode },
          verifiedAt: { timestampValue: record.verifiedAt },
          userAgent: { stringValue: record.userAgent },
          ip: { stringValue: record.ip },
        },
      };

      await new Promise((resolve) => {
        const req = https.request(
          url,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
          },
          (res) => {
            let data = '';
            res.on('data', chunk => (data += chunk));
            res.on('end', () => resolve(data));
          }
        );
        req.on('error', (e) => {
          console.error('Firestore log error (non-blocking):', e.message);
          resolve(null);
        });
        req.write(JSON.stringify(firestoreBody));
        req.end();
      });
    } catch (err) {
      console.error('Firebase recording failed (non-blocking):', err);
    }
  }

  return record;
}

module.exports = {
  recordBetaUser,
};
