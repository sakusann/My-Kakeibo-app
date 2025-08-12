import React, { useState } from 'react';
// Firebase設定ファイルからauthオブジェクトをインポート
import { auth } from '../firebase/config';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut
} from "firebase/auth";

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSignUp = async () => {
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      alert('ユーザー登録が完了しました！');
    } catch (error) {
      alert(`エラー: ${error.message}`);
    }
  };

  const handleLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      alert('ログインしました！');
    } catch (error) {
      alert(`エラー: ${error.message}`);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      alert('ログアウトしました。');
    } catch (error) {
      alert(`エラー: ${error.message}`);
    }
  };

  return (
    <div>
      <h2>ユーザー認証</h2>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="メールアドレス"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="パスワード"
      />
      <button onClick={handleSignUp}>サインアップ</button>
      <button onClick={handleLogin}>ログイン</button>
      <button onClick={handleLogout}>ログアウト</button>
    </div>
  );
};

export default Auth;