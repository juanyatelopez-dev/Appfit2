const Index = () => {
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
            <div className="flex gap-4">
                <a
                    href="/dashboard"
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
                >
                    Go to Dashboard
                </a>
            </div>
        </div>
    );
};

export default Index;
