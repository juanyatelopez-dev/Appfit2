import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const Index = () => {
    const { user, signIn, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);

    const handleDashboardClick = async (e: React.FormEvent) => {
        e.preventDefault();

        console.log("[Navigation Flow] Button clicked.");

        if (user) {
            console.log("[Navigation Flow] User authenticated, navigating to /dashboard");
            navigate("/dashboard");
        } else {
            if (!email) {
                toast.error("Please enter your email to continue.");
                return;
            }

            setLoading(true);
            console.log(`[Navigation Flow] No user, triggering signIn for: ${email}`);
            try {
                await signIn(email);
                console.log("[Navigation Flow] Magic link sent successfully.");
                toast.success("Check your email for the login link!");
            } catch (error: any) {
                console.error("[Navigation Flow] Sign-in error:", error);
                toast.error(error.message || "Failed to send magic link.");
            } finally {
                setLoading(false);
            }
        }
    };

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 text-center relative">
            {import.meta.env.DEV && (
                <div className="absolute top-4 right-4 text-[10px] text-muted-foreground opacity-50 z-50">
                    Landing Page
                </div>
            )}
            <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl mb-4">
                Welcome to Appfit
            </h1>
            <p className="text-xl text-muted-foreground max-w-[600px] mb-8">
                Your personal fitness companion for a healthier lifestyle.
            </p>

            <form onSubmit={handleDashboardClick} className="w-full max-w-sm space-y-4">
                {!user && (
                    <div className="space-y-2">
                        <Input
                            type="email"
                            placeholder="Enter your email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="text-center"
                        />
                        <p className="text-xs text-muted-foreground">
                            We'll send you a magic link to sign in.
                        </p>
                    </div>
                )}

                <Button
                    type="submit"
                    className="w-full h-10 px-6 font-medium"
                    disabled={loading}
                >
                    {loading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Sending link...
                        </>
                    ) : (
                        user ? "Go to Dashboard" : "Sign In / Go to Dashboard"
                    )}
                </Button>
            </form>
        </div>
    );
};

export default Index;
