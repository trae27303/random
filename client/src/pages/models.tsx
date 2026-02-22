import { useQuery } from "@tanstack/react-query";
import { User } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Video, Star, Phone } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useRef, useState } from "react";
import { useWebRTC } from "@/hooks/use-webrtc"; // We might need a new hook for direct calls or adapt this one

export default function ModelsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { data: models, isLoading } = useQuery<User[]>({
    queryKey: ["/api/models"],
    refetchInterval: 5000,
  });

  const handleCall = (modelId: number) => {
    if (!user) {
      toast({ title: "Please login first", variant: "destructive" });
      setLocation("/auth");
      return;
    }
    if (user.tokens < 20) {
      toast({ title: "Insufficient tokens", description: "You need at least 20 tokens to start a call.", variant: "destructive" });
      return;
    }
    // Navigate to call page with modelId
    setLocation(`/call/${modelId}`);
  };

  if (isLoading) return <div className="p-8 text-center">Loading models...</div>;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-2">
            <Link href="/">
              <div className="flex items-center gap-2 cursor-pointer">
                <div className="bg-primary p-2 rounded-lg">
                  <Video className="w-6 h-6 text-white" />
                </div>
                <span className="text-2xl font-bold font-display tracking-tight">Mitro</span>
              </div>
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-secondary px-4 py-2 rounded-full">
              <span className="font-bold text-primary">{user?.tokens || 0}</span>
              <span className="text-sm text-muted-foreground">Tokens</span>
            </div>
            <Link href="/tokens">
              <Button variant="outline" size="sm">Buy Tokens</Button>
            </Link>
          </div>
        </header>

        <h1 className="text-3xl font-bold mb-6">Available Models</h1>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {models?.map((model) => (
            <Card key={model.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="aspect-video bg-muted flex items-center justify-center">
                <Video className="w-12 h-12 text-muted-foreground/50" />
              </div>
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  <span className="flex items-center gap-2">
                    {model.username}
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${model.isOnline ? "bg-green-500/20 text-green-500" : "bg-gray-500/20 text-gray-400"}`}>
                      <span className={`w-2 h-2 rounded-full ${model.isOnline ? "bg-green-500" : "bg-gray-400"}`} />
                      {model.isOnline ? "Online" : "Offline"}
                    </span>
                  </span>
                  <div className="flex items-center text-yellow-500 text-sm">
                    <Star className="w-4 h-4 fill-current mr-1" />
                    <span>5.0</span>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Ready to chat! 20 tokens/min.
                </p>
              </CardContent>
              <CardFooter>
                <Button className="w-full" onClick={() => handleCall(model.id)} disabled={!model.isOnline}>
                  <Phone className="w-4 h-4 mr-2" />
                  {model.isOnline ? "Video Call" : "Offline"}
                </Button>
              </CardFooter>
            </Card>
          ))}
          {models?.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              No models available at the moment.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
