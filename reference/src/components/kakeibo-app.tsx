"use client";

import { useState } from 'react';
import type { User } from '@/hooks/use-auth';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Logo } from "@/components/logo";
import { TransactionsTab } from './transactions-tab';
import { InsightsTab } from './insights-tab';
import { CategorizeToolTab } from './categorize-tool-tab';

interface KakeiboAppProps {
  user: User;
  onSignOut: () => void;
}

export function KakeiboApp({ user, onSignOut }: KakeiboAppProps) {
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 sm:px-6">
        <div className="flex items-center gap-2">
          <Logo />
          <h1 className="text-xl font-semibold font-headline">KakeiboAI</h1>
        </div>
        <div className="ml-auto flex items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={user.photoURL || ''} alt={user.displayName || ''} />
                  <AvatarFallback>{user.displayName?.charAt(0)}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{user.displayName}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onSignOut}>Logout</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      <main className="flex flex-1 flex-col gap-4 p-4 sm:p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 max-w-lg mx-auto">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
            <TabsTrigger value="tool">Categorize Tool</TabsTrigger>
          </TabsList>
          <TabsContent value="dashboard">
            <TransactionsTab userId={user.uid} />
          </TabsContent>
          <TabsContent value="insights">
            <InsightsTab userId={user.uid} />
          </TabsContent>
          <TabsContent value="tool">
            <CategorizeToolTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
