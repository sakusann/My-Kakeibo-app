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
// index.htmlで読み込まれたグローバルなfirebaseオブジェクトを使用します
if (typeof firebase !== 'undefined' && !firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// 初期化後に各サービスをエクスポート
export const auth = firebase.auth();
export const db = firebase.firestore();
