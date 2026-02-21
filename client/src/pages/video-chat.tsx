import { useState } from "react";
import { useWebRTC } from "@/hooks/use-webrtc";
import { VideoPlayer } from "@/components/video-player";
import { ChatBox } from "@/components/chat-box";
import { ControlBar } from "@/components/control-bar";
import { ReportDialog } from "@/components/report-dialog";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function VideoChat() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  
  const {
    connectionState,
    localStream,
    remoteStream,
    chatMessages,
    isMuted,
    isVideoOff,
    startCall,
    stopCall,
    skipPartner,
    sendMessage,
    toggleMute,
    toggleVideo
  } = useWebRTC();

  const handleStart = () => {
    startCall();
  };

  const isConnected = connectionState === "connected";
  const isWaiting = connectionState === "waiting";
  const isIdle = connectionState === "idle";

  return (
    <div className="h-screen w-full bg-background flex flex-col overflow-hidden relative">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background pointer-events-none z-0" />

      {/* Header */}
      <header className="h-16 border-b border-white/10 flex items-center justify-between px-6 z-10 bg-black/20 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon" className="hover:bg-white/10 text-white/70 hover:text-white">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex flex-col">
            <span className="font-bold text-sm tracking-wide">VIDEO CHAT</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? "bg-green-500 animate-pulse" : isWaiting ? "bg-yellow-500" : "bg-red-500"}`} />
              {connectionState === "idle" ? "Offline" : connectionState === "waiting" ? "Searching..." : "Connected"}
            </span>
          </div>
        </div>
        
        <ReportDialog />
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex relative z-10 overflow-hidden">
        {/* Video Area */}
        <div className="flex-1 relative flex flex-col p-4 gap-4">
          
          {/* Main Remote Video */}
          <div className="flex-1 relative rounded-3xl overflow-hidden bg-black/40 border border-white/5 shadow-2xl">
            {isIdle ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
                <div className="w-24 h-24 bg-primary/20 rounded-full flex items-center justify-center mb-6 animate-pulse">
                  <VideoPlayer stream={null} />
                </div>
                <h2 className="text-3xl font-bold mb-2 font-display">Ready to connect?</h2>
                <p className="text-muted-foreground mb-8 max-w-md">
                  Click start to allow camera access and find a random partner instantly.
                </p>
                <Button 
                  size="lg" 
                  onClick={handleStart}
                  className="h-14 px-10 text-lg rounded-full bg-primary hover:bg-primary/90 shadow-[0_0_30px_-5px_rgba(124,58,237,0.6)] font-bold transition-all hover:scale-105 active:scale-95"
                >
                  Start Video Chat
                </Button>
              </div>
            ) : isWaiting ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <Loader2 className="w-16 h-16 text-primary animate-spin mb-6" />
                <h3 className="text-2xl font-bold mb-2">Looking for someone...</h3>
                <p className="text-muted-foreground">Please wait while we match you.</p>
              </div>
            ) : (
              <VideoPlayer 
                stream={remoteStream} 
                isLocal={false} 
                label="Stranger"
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
          {!isIdle && (
            <div className="absolute bottom-8 left-0 right-0 z-30 flex justify-center px-4">
              <ControlBar 
                onToggleMute={toggleMute}
                onToggleVideo={toggleVideo}
                onSkip={skipPartner}
                onStop={stopCall}
                onToggleChat={() => setIsChatOpen(!isChatOpen)}
                isMuted={isMuted}
                isVideoOff={isVideoOff}
                isChatOpen={isChatOpen}
                disabled={isIdle}
              />
            </div>
          )}
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
