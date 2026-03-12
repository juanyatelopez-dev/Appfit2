import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const GuestWarningBanner: React.FC = () => {
    const navigate = useNavigate();
    const { exitGuest } = useAuth();

    return (
        <div className="bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800 p-3 sticky top-0 z-20 animate-in slide-in-from-top duration-300">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200 text-sm font-medium">
                    <AlertCircle className="h-4 w-4" />
                    <span>Estás usando modo invitado. Tus datos no se guardarán.</span>
                </div>
                <Button
                    size="sm"
                    variant="default"
                    className="bg-amber-600 hover:bg-amber-700 text-white border-none h-8 text-xs font-semibold px-4"
                    onClick={() => {
                        exitGuest();
                        navigate('/auth', { replace: true, state: { fromGuestSwitch: true } });
                    }}
                >
                    Crear cuenta
                </Button>
            </div>
        </div>
    );
};

export default GuestWarningBanner;
