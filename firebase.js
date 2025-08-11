// 重要：このファイルは、あなたのFirebaseプロジェクトの設定に置き換える必要があります。
// Firebaseコンソールのプロジェクト設定ページから、ウェブアプリのFirebase設定オブジェクトを取得して貼り付けてください。

// 環境変数からFirebaseの設定を読み込みます。
// ローカルでの開発時は、プロジェクトルートの`.env`ファイルから読み込まれます。
// GitHub Actionsでのデプロイ時は、GitHubのSecretsから読み込まれます。
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

// Firebaseの初期化
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

export const auth = firebase.auth();
export const db = firebase.firestore();
