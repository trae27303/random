import { Mic, MicOff, Video, VideoOff, SkipForward, PhoneOff, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface ControlBarProps {
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onSkip: () => void;
  onStop: () => void;
  onToggleChat: () => void;
  isMuted: boolean;
  isVideoOff: boolean;
  isChatOpen: boolean;
  disabled?: boolean;
}

export function ControlBar({
  onToggleMute,
  onToggleVideo,
  onSkip,
  onStop,
  onToggleChat,
  isMuted,
  isVideoOff,
  isChatOpen,
  disabled
}: ControlBarProps) {
  return (
    <div className="flex items-center justify-center gap-4 p-4 glass-panel rounded-full mx-auto max-w-fit animate-in slide-in-from-bottom-10 fade-in duration-500">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            onClick={onToggleMute}
            disabled={disabled}
            className={cn(
              "h-12 w-12 rounded-full border-white/10 hover:bg-white/10 transition-all duration-300",
              isMuted ? "bg-red-500/20 text-red-500 border-red-500/50 hover:bg-red-500/30" : "bg-white/5 text-white"
            )}
          >
            {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{isMuted ? "Unmute" : "Mute"}</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            onClick={onToggleVideo}
            disabled={disabled}
            className={cn(
              "h-12 w-12 rounded-full border-white/10 hover:bg-white/10 transition-all duration-300",
              isVideoOff ? "bg-red-500/20 text-red-500 border-red-500/50 hover:bg-red-500/30" : "bg-white/5 text-white"
            )}
          >
            {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{isVideoOff ? "Start Video" : "Stop Video"}</TooltipContent>
      </Tooltip>

      <div className="w-px h-8 bg-white/10 mx-2" />

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="default"
            size="lg"
            onClick={onSkip}
            disabled={disabled}
            className="h-14 px-8 rounded-full bg-white text-black hover:bg-white/90 font-bold shadow-lg shadow-white/5 hover:scale-105 active:scale-95 transition-all duration-200"
          >
            <SkipForward className="h-5 w-5 mr-2" />
            Skip
          </Button>
        </TooltipTrigger>
        <TooltipContent>Find Next Partner</TooltipContent>
      </Tooltip>

      <div className="w-px h-8 bg-white/10 mx-2" />

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="destructive"
            size="icon"
            onClick={onStop}
            className="h-12 w-12 rounded-full bg-red-600 hover:bg-red-700 shadow-lg shadow-red-900/20"
          >
            <PhoneOff className="h-5 w-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>End Call</TooltipContent>
      </Tooltip>

      {/* Mobile Chat Toggle */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggleChat}
        className={cn(
          "h-12 w-12 rounded-full lg:hidden border border-white/10",
          isChatOpen ? "bg-primary/20 text-primary border-primary/50" : "bg-white/5 text-white"
        )}
      >
        <MessageSquare className="h-5 w-5" />
      </Button>
    </div>
  );
}
