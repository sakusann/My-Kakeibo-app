import React, { useState, useEffect } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { useAuthContext } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Settings, LogOut } from 'lucide-react';
import SetupDialog from './SetupDialog';
import DashboardTab from './DashboardTab';
import TransactionsTab from './TransactionsTab';
import MonthlySummaryTab from './MonthlySummaryTab';
import AnnualSummaryTab from './AnnualSummaryTab';

const AppShell = () => {
    const { isInitialSetupDone, loading } = useAppContext();
    const { signOut } = useAuthContext();
    const [isSetupDialogOpen, setSetupDialogOpen] = useState(false);
    
    useEffect(() => {
        if (!loading && !isInitialSetupDone) {
            setSetupDialogOpen(true);
        }
    }, [isInitialSetupDone, loading]);

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <p>ユーザーデータを読み込んでいます...</p>
            </div>
        );
    }
    
    if (!isInitialSetupDone && !isSetupDialogOpen) {
        return (
            <div className="flex h-screen items-center justify-center flex-col gap-4 p-4 text-center">
                <h2 className="text-2xl font-bold">ようこそ！</h2>
                <p>家計簿を始めるために、まずは初期設定を行いましょう。</p>
                <Button onClick={() => setSetupDialogOpen(true)}>設定を開始する</Button>
            </div>
        )
    }

    return (
        <div className="p-4 md:p-8">
            <header className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-bold">家計簿</h1>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={() => setSetupDialogOpen(true)}>
                        <Settings className="h-4 w-4" />
                        <span className="sr-only">設定</span>
                    </Button>
                     <Button variant="outline" size="icon" onClick={signOut}>
                        <LogOut className="h-4 w-4" />
                        <span className="sr-only">ログアウト</span>
                    </Button>
                </div>
            </header>
            
            <Tabs defaultValue="dashboard">
                <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
                    <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
                    <TabsTrigger value="transactions">取引履歴</TabsTrigger>
                    <TabsTrigger value="monthly">月次サマリー</TabsTrigger>
                    <TabsTrigger value="annual">年次サマリー</TabsTrigger>
                </TabsList>
                <TabsContent value="dashboard">
                    <DashboardTab />
                </TabsContent>
                <TabsContent value="transactions">
                    <TransactionsTab />
                </TabsContent>
                <TabsContent value="monthly">
                    <MonthlySummaryTab />
                </TabsContent>
                <TabsContent value="annual">
                    <AnnualSummaryTab />
                </TabsContent>
            </Tabs>

            <SetupDialog open={isSetupDialogOpen} onOpenChange={setSetupDialogOpen} />
        </div>
    );
}


export default function KakeiboApp() {
    return (
        // AppProvider is already in App.tsx, so we don't need it here.
        // But if this component was used elsewhere without the main provider, this would be necessary.
        // For now, let's just render the shell.
        <AppShell />
    );
}