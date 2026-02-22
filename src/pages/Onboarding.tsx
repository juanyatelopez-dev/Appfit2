import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';

const Onboarding = () => {
    const { completeOnboarding } = useAuth();
    const navigate = useNavigate();

    const handleComplete = async () => {
        try {
            await completeOnboarding();
            navigate('/dashboard');
        } catch (error) {
            console.error('Error completing onboarding:', error);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 text-center">
            <h1 className="text-3xl font-bold mb-4">Welcome to Appfit!</h1>
            <p className="text-muted-foreground mb-8 max-w-md">
                Let's get your profile set up so you can start tracking your fitness goals.
            </p>
            <Button onClick={handleComplete} size="lg">
                Complete Onboarding
            </Button>
        </div>
    );
};

export default Onboarding;
