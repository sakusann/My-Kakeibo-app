import React, { useState, useEffect } from 'react';
import { auth } from './firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import Auth from './components/Auth.jsx'; // 作成したAuthコンポーネントをインポート

function App() {
  const [user, setUser] = useState(null); // ログイン状態を管理

  // ログイン状態の変化を監視する
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser); // ユーザー情報をセット
    });
    return () => unsubscribe(); // クリーンアップ
  }, []);

  return (
    <div className="App">
      <h1>My Kakeibo App</h1>
      {user ? (
        <div>
          <p>ようこそ、{user.email} さん</p>
          {/* ここにログイン後のメインコンテンツ（取引フォームや一覧）が入る */}
        </div>
      ) : (
        <Auth /> // ログインしていない場合は認証コンポーネントを表示
      )}
    </div>
  );
}

export default App;