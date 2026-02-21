import { useState, useRef, useCallback, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

type CallState = "idle" | "requesting" | "incoming" | "connecting" | "connected" | "ended" | "rejected";

interface ChatMessage {
  id: string;
  sender: "me" | "stranger";
  text: string;
}

export function useDirectCall() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [callState, setCallState] = useState<CallState>("idle");
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [incomingCall, setIncomingCall] = useState<{ callId: number; callerId: number; callerName: string } | null>(null);
  const [currentCallId, setCurrentCallId] = useState<number | null>(null);
  const [tokens, setTokens] = useState<number>(user?.tokens || 0);

  const wsRef = useRef<WebSocket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const targetIdRef = useRef<number | null>(null);
  const [wsConnected, setWsConnected] = useState(false);

  // Initialize WS connection
  useEffect(() => {
    if (!user) return;
    
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsConnected(true);
    };

    ws.onmessage = async (event) => {
      const msg = JSON.parse(event.data);

      switch (msg.type) {
        case "incoming_call":
          setIncomingCall({
            callId: msg.callId,
            callerId: msg.callerId,
            callerName: msg.callerName
          });
          setCallState("incoming");
          break;

        case "call_accepted":
          setCurrentCallId(msg.callId);
          targetIdRef.current = msg.modelId;
          setCallState("connecting");
          startWebRTC(true); // Initiator
          break;

        case "call_rejected":
          setCallState("rejected");
          toast({ title: "Call Rejected", description: msg.reason, variant: "destructive" });
          cleanupCall();
          break;

        case "call_ended":
          setCallState("ended");
          toast({ title: "Call Ended", description: msg.reason });
          cleanupCall();
          break;

        case "token_update":
          setTokens(msg.tokens);
          break;

        case "offer":
          if (callState === "connecting" || callState === "connected") {
            handleOffer(msg.sdp, msg.fromId);
          }
          break;

        case "answer":
          handleAnswer(msg.sdp);
          break;

        case "ice-candidate":
          handleCandidate(msg.candidate);
          break;
          
        case "chat":
           setChatMessages(prev => [...prev, { id: crypto.randomUUID(), sender: "stranger", text: msg.message }]);
           break;
           
        case "error":
           toast({ title: "Error", description: msg.message, variant: "destructive" });
           break;
      }
    };

    ws.onclose = () => {
        setWsConnected(false);
    };

    return () => {
      ws.close();
    };
  }, [user]); // Removed callState from dependencies to prevent WS reconnect loops

  const startWebRTC = async (isInitiator: boolean) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
      });
      pcRef.current = pc;

      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        setRemoteStream(event.streams[0]);
        setCallState("connected");
      };

      pc.onicecandidate = (event) => {
        if (event.candidate && wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: "ice-candidate",
            candidate: event.candidate,
            targetId: targetIdRef.current
          }));
        }
      };

      if (isInitiator) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                type: "offer",
                sdp: offer,
                targetId: targetIdRef.current
            }));
        }
      }
    } catch (err) {
      console.error("WebRTC Error:", err);
      toast({ title: "Device Error", description: "Could not access camera/mic", variant: "destructive" });
    }
  };

  const handleOffer = async (sdp: any, fromId: number) => {
    if (!pcRef.current) {
      await startWebRTC(false);
    }
    targetIdRef.current = fromId;
    
    if (pcRef.current) {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
        const answer = await pcRef.current.createAnswer();
        await pcRef.current.setLocalDescription(answer);
        
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
            type: "answer",
            sdp: answer,
            targetId: fromId
            }));
        }
    }
  };

  const handleAnswer = async (sdp: any) => {
    await pcRef.current?.setRemoteDescription(new RTCSessionDescription(sdp));
  };

  const handleCandidate = async (candidate: any) => {
    if (pcRef.current) {
      await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
    }
  };

  const requestCall = (modelId: number) => {
    setCallState("requesting");
    
    // Helper function to send request when WS is ready
    const sendRequest = () => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                type: "request_call",
                modelId
            }));
        } else {
            // Retry after a short delay if connecting
            setTimeout(sendRequest, 500);
        }
    };
    
    sendRequest();
  };

  const acceptCall = (callId: number) => {
    if (!incomingCall) return;
    setCurrentCallId(callId);
    targetIdRef.current = incomingCall.callerId;
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
        type: "accept_call",
        callId
        }));
    }
    setCallState("connecting");
    startWebRTC(false); 
  };

  const rejectCall = (callId: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
        type: "reject_call",
        callId
        }));
    }
    setIncomingCall(null);
    setCallState("idle");
  };

  const endCall = () => {
    if (currentCallId) {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
            type: "end_call",
            callId: currentCallId
        }));
      }
    }
    cleanupCall();
  };

  const cleanupCall = () => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (localStream) {
      localStream.getTracks().forEach(t => t.stop());
      setLocalStream(null);
    }
    setRemoteStream(null);
    setCallState("idle");
    setCurrentCallId(null);
    setIncomingCall(null);
    targetIdRef.current = null;
    setChatMessages([]);
  };
  
  const sendMessage = (text: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN && text.trim() && targetIdRef.current) {
      wsRef.current.send(JSON.stringify({ type: "chat", message: text, targetId: targetIdRef.current }));
      setChatMessages(prev => [...prev, { id: crypto.randomUUID(), sender: "me", text }]);
    }
  };

  return {
    callState,
    localStream,
    remoteStream,
    incomingCall,
    tokens,
    requestCall,
    acceptCall,
    rejectCall,
    endCall,
    chatMessages,
    sendMessage,
    wsConnected
  };
}
