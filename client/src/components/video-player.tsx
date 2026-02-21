import { useEffect, useRef } from "react";
import { User, VideoOff } from "lucide-react";

interface VideoPlayerProps {
  stream: MediaStream | null;
  isLocal?: boolean;
  isMuted?: boolean;
  isVideoOff?: boolean;
  label?: string;
}

export function VideoPlayer({ stream, isLocal, isMuted, isVideoOff, label }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative w-full h-full bg-black/80 rounded-2xl overflow-hidden shadow-2xl border border-white/5 group">
      {/* Video Element */}
      {stream && !isVideoOff ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal || isMuted} // Local video should always be muted to prevent feedback
          className={`w-full h-full object-cover ${isLocal ? "scale-x-[-1]" : ""}`}
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900 text-zinc-500">
          {isVideoOff ? <VideoOff className="w-16 h-16 mb-4 opacity-50" /> : <User className="w-16 h-16 mb-4 opacity-50" />}
          <p className="text-sm font-medium">{isVideoOff ? "Camera Off" : "Waiting for video..."}</p>
        </div>
      )}

      {/* Label Overlay */}
      <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 z-10 flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${stream && !isVideoOff ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
        <span className="text-xs font-medium text-white/90">{label || (isLocal ? "You" : "Stranger")}</span>
      </div>

      {/* Connection Status Gradient Overlay */}
      {!stream && !isLocal && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
      )}
    </div>
  );
}
