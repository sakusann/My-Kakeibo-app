"use client";

import React from 'react';
import { useAuth, type User } from "@/hooks/use-auth";
import { AuthForm } from "@/components/auth-form";
import { KakeiboApp } from "@/components/kakeibo-app";
import { LoadingSpinner } from "@/components/loading-spinner";

export default function Home() {
  const { user, loading, signInWithGoogle, signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) {
    return <AuthForm onGoogleSignIn={signInWithGoogle} />;
  }

  return <KakeiboApp user={user as User} onSignOut={handleSignOut} />;
}
