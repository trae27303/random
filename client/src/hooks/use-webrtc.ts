import { useState, useEffect, useRef, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

type ConnectionState = "idle" | "connecting" | "waiting" | "connected" | "disconnected";

interface ChatMessage {
  id: string;
  sender: "me" | "stranger";
  text: string;
}

export function useWebRTC() {
  const [connectionState, setConnectionState] = useState<ConnectionState>("idle");
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const { toast } = useToast();

  // Initialize WebRTC Peer Connection
  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
    });

    pc.onicecandidate = (event) => {
      if (event.candidate && wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: "ice-candidate",
          candidate: event.candidate,
        }));
      }
    };

    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === "disconnected" || pc.iceConnectionState === "failed" || pc.iceConnectionState === "closed") {
        handlePeerLeft();
      }
    };

    return pc;
  }, []);

  const handlePeerLeft = useCallback(() => {
    setRemoteStream(null);
    setChatMessages([]); // Clear chat on disconnect
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    // Automatically search again
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      setConnectionState("waiting");
      wsRef.current.send(JSON.stringify({ type: "join" }));
    } else {
      setConnectionState("idle");
    }
    toast({
      title: "Stranger disconnected",
      description: "Searching for a new partner...",
    });
  }, [toast]);

  const startCall = async () => {
    try {
      setConnectionState("connecting");
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);

      // Connect WebSocket
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({ type: "join" }));
      };

      ws.onmessage = async (event) => {
        const msg = JSON.parse(event.data);

        switch (msg.type) {
          case "waiting":
            setConnectionState("waiting");
            break;

          case "match":
            setConnectionState("connected");
            pcRef.current = createPeerConnection();
            
            // Add tracks
            stream.getTracks().forEach((track) => {
              pcRef.current?.addTrack(track, stream);
            });

            if (msg.initiator) {
              const offer = await pcRef.current.createOffer();
              await pcRef.current.setLocalDescription(offer);
              ws.send(JSON.stringify({ type: "offer", sdp: offer }));
            }
            break;

          case "offer":
            if (!pcRef.current) {
              pcRef.current = createPeerConnection();
              stream.getTracks().forEach((track) => {
                pcRef.current?.addTrack(track, stream);
              });
            }
            await pcRef.current.setRemoteDescription(new RTCSessionDescription(msg.sdp));
            const answer = await pcRef.current.createAnswer();
            await pcRef.current.setLocalDescription(answer);
            ws.send(JSON.stringify({ type: "answer", sdp: answer }));
            break;

          case "answer":
            await pcRef.current?.setRemoteDescription(new RTCSessionDescription(msg.sdp));
            break;

          case "ice-candidate":
            if (pcRef.current) {
              await pcRef.current.addIceCandidate(new RTCIceCandidate(msg.candidate));
            }
            break;

          case "peer_left":
            handlePeerLeft();
            break;
            
          case "chat":
            setChatMessages(prev => [...prev, { id: crypto.randomUUID(), sender: "stranger", text: msg.message }]);
            break;
        }
      };

      ws.onclose = () => {
        setConnectionState("idle");
      };

    } catch (err) {
      console.error("Failed to start call:", err);
      setConnectionState("idle");
      toast({
        variant: "destructive",
        title: "Camera/Mic Error",
        description: "Please allow camera and microphone access to continue.",
      });
    }
  };

  const stopCall = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    setRemoteStream(null);
    setConnectionState("idle");
    setChatMessages([]);
  };

  const skipPartner = () => {
    setRemoteStream(null);
    setChatMessages([]);
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    
    // Create new PC for next connection if we have local stream
    if (localStream) {
       // Just send skip to server, server handles re-queueing
       if (wsRef.current?.readyState === WebSocket.OPEN) {
         setConnectionState("waiting");
         wsRef.current.send(JSON.stringify({ type: "skip" }));
       }
    }
  };

  const sendMessage = (text: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN && text.trim()) {
      wsRef.current.send(JSON.stringify({ type: "chat", message: text }));
      setChatMessages(prev => [...prev, { id: crypto.randomUUID(), sender: "me", text }]);
    }
  };

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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCall();
    };
  }, []);

  return {
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
  };
}
