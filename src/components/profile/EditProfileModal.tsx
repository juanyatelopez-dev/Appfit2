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

interface EditProfileModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const EditProfileModal: React.FC<EditProfileModalProps> = ({ open, onOpenChange }) => {
    const { profile, updateProfile, isGuest } = useAuth();
    const [fullName, setFullName] = useState("");
    const [weight, setWeight] = useState("");
    const [height, setHeight] = useState("");
    const [goalType, setGoalType] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (open && profile) {
            setFullName(profile.full_name || "");
            setWeight(profile.weight?.toString() || "");
            setHeight(profile.height?.toString() || "");
            setGoalType(profile.goal_type || "");
        }
    }, [open, profile]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await updateProfile({
                full_name: fullName,
                weight: weight ? parseFloat(weight) : null,
                height: height ? parseFloat(height) : null,
                goal_type: goalType,
            });

            if (isGuest) {
                toast.info("Guest mode: Changes will not be saved permanently.");
            } else {
                toast.success("Profile updated successfully");
            }
            onOpenChange(false);
        } catch (error) {
            console.error("Error updating profile:", error);
            toast.error("Failed to update profile");
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
                    <div className="space-y-2">
                        <Label htmlFor="fullName">Full Name</Label>
                        <Input
                            id="fullName"
                            placeholder="Full Name"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
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
