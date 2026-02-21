import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useLocation } from "wouter";
import { Video, DollarSign, Clock } from "lucide-react";
import { useDirectCall } from "@/hooks/use-direct-call";
import { useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";

export default function ModelDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { incomingCall, acceptCall, rejectCall, callState, endCall } = useDirectCall();
  
  // Audio for ringtone
  const ringtoneRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    ringtoneRef.current = new Audio("/assets/ringtone.mp3"); // Ensure this asset exists or use a default sound
    ringtoneRef.current.loop = true;
  }, []);

  useEffect(() => {
    if (incomingCall) {
      ringtoneRef.current?.play().catch(() => {});
      toast({
        title: "Incoming Call",
        description: `${incomingCall.callerName} is calling you!`,
        duration: Infinity,
        action: (
          <div className="flex gap-2">
            <Button size="sm" onClick={() => { acceptCall(incomingCall.callId); ringtoneRef.current?.pause(); }}>Accept</Button>
            <Button size="sm" variant="destructive" onClick={() => { rejectCall(incomingCall.callId); ringtoneRef.current?.pause(); }}>Reject</Button>
          </div>
        ),
      });
    } else {
      ringtoneRef.current?.pause();
      if (ringtoneRef.current) ringtoneRef.current.currentTime = 0;
    }
  }, [incomingCall, toast, acceptCall, rejectCall]);

  if (!user || user.role !== "model") {
    setLocation("/");
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Model Dashboard</h1>
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2 bg-secondary px-4 py-2 rounded-full">
              <span className="font-bold text-green-500">{user.tokens}</span>
              <span className="text-sm text-muted-foreground">Tokens Earned</span>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-500" />
                Earnings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">{user.tokens}</div>
              <p className="text-muted-foreground">Total tokens earned from calls.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-500" />
                Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-medium text-green-500">Online</div>
              <p className="text-muted-foreground">You are visible to users.</p>
            </CardContent>
          </Card>
        </div>

        {callState === "connected" && (
            <div className="mt-8 p-4 bg-green-900/20 border border-green-500 rounded-lg text-center">
                <h2 className="text-2xl font-bold text-green-500 mb-2">Call in Progress</h2>
                <p>You are earning 5 tokens per minute.</p>
                <Button variant="destructive" className="mt-4" onClick={endCall}>End Call</Button>
            </div>
        )}
      </div>
    </div>
  );
}
