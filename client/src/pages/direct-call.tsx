import { useEffect, useRef, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useDirectCall } from "@/hooks/use-direct-call";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft } from "lucide-react";
import { VideoPlayer } from "@/components/video-player";
import { ControlBar } from "@/components/control-bar";
import { ChatBox } from "@/components/chat-box";
import { useToast } from "@/hooks/use-toast";

export default function DirectCallPage() {
  const [match, params] = useRoute("/call/:modelId");
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const {
    callState,
    localStream,
    remoteStream,
    requestCall,
    endCall,
    tokens,
    chatMessages,
    sendMessage
  } = useDirectCall();

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  useEffect(() => {
    if (user && params?.modelId) {
      requestCall(parseInt(params.modelId));
    }
  }, [user, params?.modelId]);

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => track.enabled = !track.enabled);
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => track.enabled = !track.enabled);
      setIsVideoOff(!isVideoOff);
    }
  };

  const handleEndCall = () => {
    endCall();
    setLocation("/models");
  };

  if (!user) {
    setLocation("/auth");
    return null;
  }

  const isConnected = callState === "connected";
  const isRequesting = callState === "requesting";

  return (
    <div className="h-screen w-full bg-background flex flex-col overflow-hidden relative">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background pointer-events-none z-0" />

      {/* Header */}
      <header className="h-16 border-b border-white/10 flex items-center justify-between px-6 z-10 bg-black/20 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="hover:bg-white/10 text-white/70 hover:text-white" onClick={() => setLocation("/models")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex flex-col">
            <span className="font-bold text-sm tracking-wide">DIRECT CALL</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? "bg-green-500 animate-pulse" : isRequesting ? "bg-yellow-500" : "bg-red-500"}`} />
              {isConnected ? "Connected" : isRequesting ? "Calling..." : "Ended"}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-2 bg-secondary/50 px-3 py-1.5 rounded-full border border-white/10">
           <span className="font-bold text-primary">{tokens}</span>
           <span className="text-xs text-muted-foreground">Tokens</span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex relative z-10 overflow-hidden">
        {/* Video Area */}
        <div className="flex-1 relative flex flex-col p-4 gap-4">
          
          {/* Main Remote Video */}
          <div className="flex-1 relative rounded-3xl overflow-hidden bg-black/40 border border-white/5 shadow-2xl">
            {isRequesting ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <Loader2 className="w-16 h-16 text-primary animate-spin mb-6" />
                <h3 className="text-2xl font-bold mb-2">Calling Model...</h3>
                <p className="text-muted-foreground">Waiting for response</p>
              </div>
            ) : callState === "rejected" ? (
               <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <div className="text-2xl mb-4 text-red-500 font-bold">Call Rejected</div>
                <Button onClick={() => setLocation("/models")}>Back to Models</Button>
              </div>
            ) : (
              <VideoPlayer 
                stream={remoteStream} 
                isLocal={false} 
                label="Model"
              />
            )}

            {/* PIP Local Video */}
            {localStream && (
              <div className="absolute top-4 right-4 w-32 md:w-48 aspect-video rounded-xl overflow-hidden shadow-2xl border border-white/20 transition-all hover:scale-105 z-20">
                <VideoPlayer 
                  stream={localStream} 
                  isLocal={true} 
                  isMuted={isMuted} 
                  isVideoOff={isVideoOff}
                  label="You"
                />
              </div>
            )}
          </div>

          {/* Controls - Floating at bottom */}
          <div className="absolute bottom-8 left-0 right-0 z-30 flex justify-center px-4">
            <ControlBar 
              onToggleMute={toggleMute}
              onToggleVideo={toggleVideo}
              onSkip={() => {}} // No skip in direct call
              onStop={handleEndCall}
              onToggleChat={() => setIsChatOpen(!isChatOpen)}
              isMuted={isMuted}
              isVideoOff={isVideoOff}
              isChatOpen={isChatOpen}
              disabled={!isConnected && !isRequesting}
              showSkip={false}
            />
          </div>
        </div>

        {/* Chat Sidebar - Collapsible on Mobile */}
        <div className={`
          absolute inset-y-0 right-0 z-40 w-full sm:w-80 bg-background/95 backdrop-blur-xl border-l border-white/10 transform transition-transform duration-300 ease-out sm:relative sm:translate-x-0
          ${isChatOpen ? "translate-x-0" : "translate-x-full sm:translate-x-0 sm:flex hidden"}
        `}>
          <ChatBox 
            messages={chatMessages} 
            onSendMessage={sendMessage}
            disabled={!isConnected}
          />
          
          {/* Mobile Close Button */}
          <button 
            onClick={() => setIsChatOpen(false)}
            className="absolute top-4 right-4 sm:hidden p-2 text-white/50 hover:text-white"
          >
            ✕
          </button>
        </div>
      </main>
    </div>
  );
}
