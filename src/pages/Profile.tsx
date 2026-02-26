import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { User, Scale, Ruler, Target } from "lucide-react";

const Profile = () => {
    const { profile, updateProfile, isGuest } = useAuth();
    const [fullName, setFullName] = useState("");
    const [weight, setWeight] = useState<string>("");
    const [height, setHeight] = useState<string>("");
    const [goalType, setGoalType] = useState<string>("");
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (profile) {
            setFullName(profile.full_name || "");
            setWeight(profile.weight?.toString() || "");
            setHeight(profile.height?.toString() || "");
            setGoalType(profile.goal_type || "");
        }
    }, [profile]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isGuest) {
            toast.error("Cannot save profile in guest mode");
            return;
        }

        setIsSaving(true);
        try {
            await updateProfile({
                full_name: fullName,
                weight: weight ? parseFloat(weight) : null,
                height: height ? parseFloat(height) : null,
                goal_type: goalType,
            });
            toast.success("Profile updated successfully");
        } catch (error) {
            console.error("Error updating profile:", error);
            toast.error("Failed to update profile");
        } finally {
            setIsSaving(false);
        }
    };

    const getInitials = (name: string) => {
        return name
            .split(" ")
            .filter(Boolean)
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    };

    return (
        <div className="container max-w-2xl py-8 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Profile Settings</CardTitle>
                    <CardDescription>
                        {isGuest
                            ? "You are viewing the profile in guest mode. Changes will not be saved."
                            : "Manage your personal information and fitness goals."}
                    </CardDescription>
                </CardHeader>
                <form onSubmit={handleSave}>
                    <CardContent className="space-y-6">
                        <div className="flex flex-col items-center space-y-4">
                            <Avatar className="h-24 w-24">
                                <AvatarFallback className="text-2xl">
                                    {fullName ? getInitials(fullName) : <User className="h-12 w-12" />}
                                </AvatarFallback>
                            </Avatar>
                            <div className="space-y-1 text-center">
                                <h3 className="text-lg font-medium">{fullName || (isGuest ? "Guest User" : "New User")}</h3>
                                <p className="text-sm text-muted-foreground">
                                    {isGuest ? "Temporary Session" : "Personalize your account"}
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="fullName">Full Name</Label>
                                <Input
                                    id="fullName"
                                    placeholder="Enter your full name"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    disabled={isGuest}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="weight" className="flex items-center gap-2">
                                    <Scale className="h-4 w-4" /> Weight (kg)
                                </Label>
                                <Input
                                    id="weight"
                                    type="number"
                                    placeholder="70"
                                    value={weight}
                                    onChange={(e) => setWeight(e.target.value)}
                                    disabled={isGuest}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="height" className="flex items-center gap-2">
                                    <Ruler className="h-4 w-4" /> Height (cm)
                                </Label>
                                <Input
                                    id="height"
                                    type="number"
                                    placeholder="175"
                                    value={height}
                                    onChange={(e) => setHeight(e.target.value)}
                                    disabled={isGuest}
                                />
                            </div>

                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="goalType" className="flex items-center gap-2">
                                    <Target className="h-4 w-4" /> Fitness Goal
                                </Label>
                                <Input
                                    id="goalType"
                                    placeholder="e.g. Muscle Gain, Weight Loss"
                                    value={goalType}
                                    onChange={(e) => setGoalType(e.target.value)}
                                    disabled={isGuest}
                                />
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-end border-t pt-6">
                        <Button type="submit" disabled={isSaving || isGuest}>
                            {isSaving ? "Saving..." : "Save Changes"}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
};

export default Profile;
