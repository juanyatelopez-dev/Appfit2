import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Mail, Lock, UserPlus, LogIn, AlertTriangle } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

const Auth = () => {
    const [mode, setMode] = useState<"login" | "register">("login");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [resendingEmail, setResendingEmail] = useState(false);
    const [pendingEmailConfirmation, setPendingEmailConfirmation] = useState(false);
    const [authErrorMessage, setAuthErrorMessage] = useState("");

    const { user, isGuest, signIn, signUp, resendConfirmationEmail, continueAsGuest } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const allowGuestAuth = Boolean((location.state as { fromGuestSwitch?: boolean } | null)?.fromGuestSwitch);

    useEffect(() => {
        if (user || (isGuest && !allowGuestAuth)) {
            navigate("/today", { replace: true });
        }
    }, [user, isGuest, allowGuestAuth, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setPendingEmailConfirmation(false);
        setAuthErrorMessage("");

        if (mode === "register" && password !== confirmPassword) {
            toast.error("Passwords do not match.");
            return;
        }

        setLoading(true);
        try {
            if (mode === "login") {
                await signIn(email, password);
                toast.success("Welcome back!");
                navigate("/today", { replace: true });
            } else {
                const { requiresEmailConfirmation } = await signUp(email, password);
                if (requiresEmailConfirmation) {
                    setPendingEmailConfirmation(true);
                    toast.error("Email confirmation is enabled in Supabase. Confirm your email before signing in.");
                    return;
                }
                toast.success("Account created successfully!");
                navigate("/today", { replace: true });
            }
        } catch (error: unknown) {
            console.error("Auth error:", error);
            const nextMessage = getErrorMessage(error, "Authentication failed.");
            setAuthErrorMessage(nextMessage);
            if (!nextMessage.toLowerCase().includes("desactivada")) {
                toast.error(nextMessage);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleResendConfirmation = async () => {
        if (!email) {
            toast.error("Enter your email first so we know where to resend the confirmation.");
            return;
        }

        setResendingEmail(true);
        try {
            await resendConfirmationEmail(email);
            toast.success("We sent a new confirmation email.");
        } catch (error: unknown) {
            console.error("Resend confirmation error:", error);
            toast.error(getErrorMessage(error, "We could not resend the confirmation email."));
        } finally {
            setResendingEmail(false);
        }
    };

    return (
        <div className="app-shell min-h-screen flex items-center justify-center bg-background p-4">
            <Card className="w-full max-w-md glass-card animate-in fade-in zoom-in duration-300">
                <CardHeader className="text-center">
                    <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                        {mode === "login" ? <LogIn className="text-primary w-6 h-6" /> : <UserPlus className="text-primary w-6 h-6" />}
                    </div>
                    <Tabs value={mode} onValueChange={(value) => setMode(value as "login" | "register")} className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger
                                value="login"
                                onClick={() => setAuthErrorMessage("")}
                            >
                                Login
                            </TabsTrigger>
                            <TabsTrigger
                                value="register"
                                onClick={() => setAuthErrorMessage("")}
                            >
                                Register
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                    <CardTitle className="text-2xl font-bold">
                        {mode === "login" ? "Welcome Back" : "Create Account"}
                    </CardTitle>
                    <CardDescription>
                        {mode === "login"
                            ? "Sign in to your account to continue your fitness journey."
                            : "Join Appfit and start tracking your fitness goals today."}
                    </CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4">
                        {authErrorMessage && (
                            <Alert variant="destructive">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertTitle>Acceso no disponible</AlertTitle>
                                <AlertDescription>{authErrorMessage}</AlertDescription>
                            </Alert>
                        )}
                        {pendingEmailConfirmation && (
                            <Alert variant="destructive">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertTitle>Check your inbox to verify your email</AlertTitle>
                                <AlertDescription>
                                    Open the confirmation link we sent to your email. You will be redirected back to AppFit automatically.
                                </AlertDescription>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="mt-3 w-full"
                                    onClick={handleResendConfirmation}
                                    disabled={resendingEmail}
                                >
                                    {resendingEmail ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Resending email...
                                        </>
                                    ) : (
                                        "Resend confirmation email"
                                    )}
                                </Button>
                            </Alert>
                        )}
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="name@example.com"
                                    className="pl-10"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••"
                                    className="pl-10"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                        {mode === "register" && (
                            <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                                <Label htmlFor="confirmPassword">Confirm Password</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="confirmPassword"
                                        type="password"
                                        placeholder="••••••••"
                                        className="pl-10"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                        )}
                    </CardContent>
                    <CardFooter className="flex flex-col gap-4">
                        <Button type="submit" className="w-full h-11" disabled={loading}>
                            {loading ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                                mode === "login" ? "Sign in" : "Create account"
                            )}
                        </Button>
                        <div className="relative w-full">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-background px-2 text-muted-foreground">Or</span>
                            </div>
                        </div>
                        <Button
                            type="button"
                            variant="ghost"
                            className="w-full"
                            onClick={() => {
                                continueAsGuest();
                                navigate("/today");
                            }}
                        >
                            Continue as Guest
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
};

export default Auth;
