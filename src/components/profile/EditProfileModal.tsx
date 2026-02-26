import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Scale, Ruler, Target } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface EditProfileModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const EditProfileModal: React.FC<EditProfileModalProps> = ({ open, onOpenChange }) => {
    const { profile, updateProfile, updateAvatar, isGuest } = useAuth();
    const [fullName, setFullName] = useState("");
    const [birthDate, setBirthDate] = useState("");
    const [weight, setWeight] = useState("");
    const [height, setHeight] = useState("");
    const [goalType, setGoalType] = useState("");
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [removeAvatar, setRemoveAvatar] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (open && profile) {
            setFullName(profile.full_name || "");
            setBirthDate(profile.birth_date || "");
            setWeight(profile.weight?.toString() || "");
            setHeight(profile.height?.toString() || "");
            setGoalType(profile.goal_type || "");
            setAvatarPreview(profile.avatar_url || null);
            setAvatarFile(null);
            setRemoveAvatar(false);
        }
    }, [open, profile]);

    const handleAvatarSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (isGuest) {
            toast.info("Guest mode: avatar upload is disabled.");
            return;
        }

        if (!file.type.startsWith("image/")) {
            toast.error("Please choose an image file.");
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            if (typeof reader.result === "string") {
                setAvatarPreview(reader.result);
                setAvatarFile(file);
                setRemoveAvatar(false);
            }
        };
        reader.onerror = () => toast.error("Could not read image file.");
        reader.readAsDataURL(file);
    };

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
            let nextAvatarUrl: string | null | undefined = profile?.avatar_url ?? null;

            if (avatarFile && !isGuest) {
                nextAvatarUrl = await updateAvatar(avatarFile);
            }

            if (removeAvatar && !isGuest) {
                nextAvatarUrl = null;
            }

            await updateProfile({
                full_name: fullName,
                birth_date: birthDate || null,
                weight: parsedWeight,
                height: parsedHeight,
                goal_type: goalType,
                avatar_url: nextAvatarUrl,
            });

            if (isGuest) {
                toast.info("Guest mode: changes won't be saved.");
            } else {
                toast.success("Profile updated successfully");
            }
            onOpenChange(false);
        } catch (error: any) {
            toast.error(error?.message || "Failed to update profile");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Edit Profile</DialogTitle>
                    <DialogDescription>
                        {isGuest
                            ? "Make changes to your temporary guest profile here."
                            : "Update your profile details and fitness goals."}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSave} className="space-y-4 py-4">
                    {isGuest && (
                        <Alert>
                            <AlertDescription>Guest mode: changes won't be saved.</AlertDescription>
                        </Alert>
                    )}

                    <div className="flex items-center gap-4">
                        <Avatar className="h-16 w-16">
                            <AvatarImage src={avatarPreview || undefined} alt="Profile avatar" />
                            <AvatarFallback>{(fullName || "U").slice(0, 1).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="space-y-2 flex-1">
                            <Label htmlFor="avatar">Profile Photo</Label>
                            <Input
                                id="avatar"
                                type="file"
                                accept="image/*"
                                onChange={handleAvatarSelect}
                                disabled={isGuest}
                            />
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={isGuest || !avatarPreview}
                                    onClick={() => {
                                        setAvatarPreview(null);
                                        setAvatarFile(null);
                                        setRemoveAvatar(true);
                                    }}
                                >
                                    Remove photo
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="fullName">Full Name</Label>
                        <Input
                            id="fullName"
                            placeholder="Full Name"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="birthDate">Birth Date</Label>
                        <Input
                            id="birthDate"
                            type="date"
                            value={birthDate}
                            onChange={(e) => setBirthDate(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
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
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="goalType" className="flex items-center gap-2">
                            <Target className="h-4 w-4" /> Fitness Goal
                        </Label>
                        <Select value={goalType} onValueChange={setGoalType}>
                            <SelectTrigger id="goalType">
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

                    <DialogFooter className="pt-4">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSaving}>
                            {isSaving ? "Saving..." : "Save Changes"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default EditProfileModal;
