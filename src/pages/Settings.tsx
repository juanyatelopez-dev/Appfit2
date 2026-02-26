import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Scale, Ruler, Target, User, Settings as SettingsIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";

const Settings = () => {
  const { profile, updateProfile, isGuest, loading } = useAuth();
  const [fullName, setFullName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [goalType, setGoalType] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setBirthDate(profile.birth_date || "");
      setWeight(profile.weight?.toString() || "");
      setHeight(profile.height?.toString() || "");
      setGoalType(profile.goal_type || "");
    }
  }, [profile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedHeight = height ? Number(height) : null;
    const parsedWeight = weight ? Number(weight) : null;

    if (parsedHeight !== null && (!Number.isFinite(parsedHeight) || parsedHeight <= 0)) {
      toast.error("Height must be a positive number.");
      return;
    }

    if (parsedWeight !== null && (!Number.isFinite(parsedWeight) || parsedWeight <= 0)) {
      toast.error("Weight must be a positive number.");
      return;
    }

    setIsSaving(true);
    try {
      await updateProfile({
        full_name: fullName,
        birth_date: birthDate || null,
        weight: parsedWeight,
        height: parsedHeight,
        goal_type: goalType,
      });

      if (isGuest) {
        toast.info("Guest mode: Changes are not permanently saved.");
      } else {
        toast.success("Settings updated successfully");
      }
    } catch (error: any) {
      toast.error(error?.message || "Failed to update settings");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading && !profile) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <p className="text-muted-foreground">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl py-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center gap-3 mb-2">
        <SettingsIcon className="w-8 h-8 text-primary" />
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>
            Manage your personal details and fitness goals.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSave}>
          <CardContent className="space-y-6">
            {isGuest && (
              <Alert>
                <AlertDescription>Guest mode: changes won't be saved.</AlertDescription>
              </Alert>
            )}

            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14">
                <AvatarImage src={profile?.avatar_url || undefined} alt="Profile avatar" />
                <AvatarFallback>{(fullName || "U").slice(0, 1).toUpperCase()}</AvatarFallback>
              </Avatar>
              <p className="text-sm text-muted-foreground">
                Avatar can be updated from Edit Profile.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullName" className="flex items-center gap-2">
                <User className="h-4 w-4" /> Full Name
              </Label>
              <Input
                id="fullName"
                placeholder="Your Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="bg-background/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="birthDate">Birth Date</Label>
              <Input
                id="birthDate"
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="bg-background/50"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  className="bg-background/50"
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
                  className="bg-background/50"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="goalType" className="flex items-center gap-2">
                <Target className="h-4 w-4" /> Fitness Goal
              </Label>
              <Select value={goalType} onValueChange={setGoalType}>
                <SelectTrigger id="goalType" className="bg-background/50">
                  <SelectValue placeholder="Select your goal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Build Muscles">Build Muscles</SelectItem>
                  <SelectItem value="Lose Weight">Lose Weight</SelectItem>
                  <SelectItem value="Keep Fit">Keep Fit</SelectItem>
                  <SelectItem value="Improve Endurance">Improve Endurance</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
          <CardFooter className="border-t border-border/50 pt-6">
            <Button type="submit" className="w-full md:w-auto ml-auto" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default Settings;
