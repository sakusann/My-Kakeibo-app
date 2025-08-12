"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/logo";

interface AuthFormProps {
  onGoogleSignIn: () => void;
}

export function AuthForm({ onGoogleSignIn }: AuthFormProps) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Logo />
          </div>
          <CardTitle className="text-2xl font-headline">Welcome to KakeiboAI</CardTitle>
          <CardDescription>Your intelligent financial companion.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={onGoogleSignIn} variant="accent" className="w-full">
            <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512"><path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 126 23.4 172.9 61.9l-72.2 72.2C297.1 113.7 274.6 104 248 104c-73.8 0-134.3 60.5-134.3 135.3s60.5 135.3 134.3 135.3c84.3 0 115.7-60.2 120.7-91.8H248v-85.3h236.1c2.3 12.7 3.9 26.9 3.9 41.4z"></path></svg>
            Sign in with Google
          </Button>
        </CardContent>
      </Card>
      <footer className="mt-8 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} KakeiboAI. All rights reserved.</p>
      </footer>
    </main>
  );
}
