"use client";

import { useCreateChatInDiscussion } from "@/api/create-new-chat";
import { MessageBubble } from "@/components/chat/message-bubble";
import TypingIndicator from "@/components/chat/typing-indicator";
import { WaveformVisualizer } from "@/components/chat/wave-form-visualizer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { env } from "@/config/env";
import type { AudioSettings, Message } from "@/utils/types/chat";
import { useQueryClient } from "@tanstack/react-query";
import {
  Bot,
  Mic,
  MicOff,
  Send,
  Settings,
  Volume2,
  X,
  Zap,
} from "lucide-react";
import Link from "next/link";
import type React from "react";
import { use, useCallback, useEffect, useRef, useState } from "react";

// Interface pour le stream personnalisé
interface CustomStream {
  close: () => Promise<void> | undefined;
}

const ChatPage: React.FC<ChatPageProps> = ({
  title = "Assistant Juridique IA",
  placeholder = "Posez votre question juridique...",
  initialMessages = [],
  params,
}) => {
  const { id } = use(params);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [inputValue, setInputValue] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isStreaming, setIsStreaming] = useState(false);
  const [allAnswer, setAllAnswer] = useState<string>("");
  const eventSourceRef = useRef<CustomStream | null>(null);
  const [audioSettings, setAudioSettings] = useState<AudioSettings>({
    autoPlay: false,
    voice: "female",
    language: "fr",
    speed: 1,
  });
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingStartTimeRef = useRef<number>(0);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentPlayingAudioRef = useRef<HTMLAudioElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const queryClient = useQueryClient();

  // Fonction pour téléverser l'audio vers Google Cloud Storage
  const uploadToGoogleStorage = async (audioBlob: Blob): Promise<string> => {
    const formData = new FormData();
    const fileName = `audio_${Date.now()}.webm`;
    formData.append("file", audioBlob, fileName);

    try {
      // Remplacez cette URL par votre endpoint d'API pour GCS
      const response = await fetch(`${env.API_URL}/chats/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Erreur lors du téléversement: ${response.statusText}`);
      }

      const result = await response.json();
      const publicUrl = result.publicUrl; // Assurez-vous que votre API renvoie l'URL publique
      logMessage("AUDIO", `Audio téléversé vers GCS: ${publicUrl}`);
      return publicUrl;
    } catch (error) {
      logMessage("AUDIO", "Erreur lors du téléversement vers GCS", error);
      throw error;
    }
  };

  // Fonction de journalisation
  const logMessage = (
    type: "USER" | "BOT" | "SYSTEM" | "AUDIO",
    content: string,
    extra?: any
  ) => {
    const timestamp = new Date().toLocaleTimeString();
    const styles = {
      USER: "color: #3b82f6; font-weight: bold;",
      BOT: "color: #10b981; font-weight: bold;",
      SYSTEM: "color: #f59e0b; font-weight: bold;",
      AUDIO: "color: #8b5cf6; font-weight: bold;",
    };
    console.log(`%c[${timestamp}] ${type}:`, styles[type], content);
    if (extra) console.log("Données supplémentaires:", extra);
  };

  // Formatage de la durée
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Défilement vers le bas
  const scrollToBottom = useCallback(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector(
        "[data-radix-scroll-area-viewport]"
      );
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, []);

  // Auto-scroll
  useEffect(() => {
    if (shouldAutoScroll) scrollToBottom();
  }, [messages, isTyping, shouldAutoScroll, scrollToBottom]);

  // Charger les messages depuis localStorage
  useEffect(() => {
    const savedMessages = localStorage.getItem("chat-messages");
    if (savedMessages) {
      try {
        const parsed = JSON.parse(savedMessages).map(
          (msg: { timestamp: string | number | Date }) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
            audioUrl: undefined,
          })
        );
        setMessages(parsed);
        logMessage(
          "SYSTEM",
          `${parsed.length} messages chargés depuis le localStorage`
        );
      } catch (error) {
        console.error("Erreur lors du chargement des messages:", error);
        logMessage("SYSTEM", "Erreur lors du chargement des messages", error);
      }
    }
  }, []);

  // Sauvegarder les messages
  useEffect(() => {
    if (messages.length > 0) {
      const messagesToSave = messages.map((msg) => ({
        ...msg,
        audioUrl: undefined,
        audioBlob: undefined,
      }));
      localStorage.setItem("chat-messages", JSON.stringify(messagesToSave));
      logMessage(
        "SYSTEM",
        `${messages.length} messages sauvegardés dans le localStorage`
      );
    }
  }, [messages]);

  // Nettoyage de l'enregistrement
  const cleanupRecording = () => {
    audioChunksRef.current = [];
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => {
        track.stop();
        logMessage("AUDIO", "🔇 Track audio fermé");
      });
      mediaStreamRef.current = null;
    }
    setIsRecording(false);
    setRecordingDuration(0);
    if (mediaRecorderRef.current) mediaRecorderRef.current = null;
    setShouldAutoScroll(true);
    logMessage("AUDIO", "🧹 Nettoyage de l'enregistrement effectué");
  };

  // Démarrer l'enregistrement
  const startRecording = async () => {
    try {
      setShouldAutoScroll(false);
      logMessage("AUDIO", "Démarrage de l'enregistrement...");
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });
      mediaStreamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      recordingStartTimeRef.current = Date.now();
      setRecordingDuration(0);

      recordingIntervalRef.current = setInterval(() => {
        const elapsed = (Date.now() - recordingStartTimeRef.current) / 1000;
        setRecordingDuration(elapsed);
      }, 100);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          logMessage("AUDIO", `Chunk audio reçu: ${event.data.size} bytes`);
        }
      };

      mediaRecorder.onstop = async () => {
        const duration = (Date.now() - recordingStartTimeRef.current) / 1000;
        if (audioChunksRef.current.length === 0) {
          logMessage("AUDIO", "❌ Aucun chunk audio reçu");
          cleanupRecording();
          return;
        }

        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm;codecs=opus",
        });
        const audioUrl = URL.createObjectURL(audioBlob);

        try {
          // Téléverser vers Google Cloud Storage
          const publicUrl = await uploadToGoogleStorage(audioBlob);
          logMessage("AUDIO", `Audio téléversé avec succès: ${publicUrl}`);

          const audioMessage: Message = {
            id: Date.now().toString(),
            sender: "user",
            timestamp: new Date(),
            type: "audio",
            audioBlob,
            audioUrl: publicUrl, // Utiliser l'URL publique de GCS
            duration,
          };

          setMessages((prev) => [...prev, audioMessage]);
          logMessage("USER", `🎤 Message vocal envoyé`, {
            messageId: audioMessage.id,
            duration: `${duration.toFixed(1)}s`,
            publicUrl,
          });

          // Envoyer l'URL publique à l'API de streaming
          handleAIResponse(audioMessage, publicUrl);
        } catch (error) {
          logMessage("AUDIO", "Erreur lors du traitement de l'audio", error);
          setMessages((prev) => [
            ...prev,
            {
              id: Date.now().toString(),
              content: "Erreur lors du téléversement de l'audio",
              sender: "bot",
              type: "text",
              timestamp: new Date(),
            },
          ]);
        }

        cleanupRecording();
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      logMessage("AUDIO", "Enregistrement démarré");
    } catch (error) {
      console.error("Erreur lors du démarrage de l'enregistrement:", error);
      logMessage(
        "AUDIO",
        "Erreur lors du démarrage de l'enregistrement",
        error
      );
      setShouldAutoScroll(true);
      cleanupRecording();
    }
  };

  // Arrêter l'enregistrement
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      logMessage("AUDIO", "Arrêt de l'enregistrement");
    }
  };

  // Annuler l'enregistrement
  const cancelRecording = () => {
    logMessage("AUDIO", "🚫 Annulation de l'enregistrement");
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onstop = null;
      try {
        mediaRecorderRef.current.stop();
      } catch (error) {
        logMessage("AUDIO", "Erreur lors de l'arrêt du MediaRecorder", error);
      }
    }
    cleanupRecording();
    logMessage("AUDIO", "✅ Enregistrement annulé");
  };

  const { mutate, isPending } = useCreateChatInDiscussion({
    mutationConfig: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["chats", id] });
      },
      onError: (err) => {
        throw err;
      },
    },
  });
  // Envoyer un message texte ou audio
  const sendMessage = async () => {
    if (!inputValue.trim()) {
      logMessage("SYSTEM", "Message vide ignoré");
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      sender: "user",
      timestamp: new Date(),
      type: "text",
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    logMessage("USER", inputValue, {
      messageId: userMessage.id,
      timestamp: userMessage.timestamp,
    });

    setIsStreaming(true);
    setIsTyping(true);

    const queryParams = new URLSearchParams({
      query: inputValue,
      model: env.MODEL ?? "",
      temperature: env.TEMPERATURE ?? "",
      similarity_threshold: env.SIMILARITY_THRESHOLD ?? "",
      top_k: env.TOP_K ?? "",
    });

    const url = `${env.ALIA_LLM_URL}?${queryParams.toString()}`;
    const token = env.ALIA_API_ACCESS_TOKEN || "VOTRE_TOKEN_API";

    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "text/event-stream",
        },
        method: "GET",
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Aucun reader disponible pour le stream");
      }

      const decoder = new TextDecoder();
      let fullResponse = "";
      let buffer = "";
      let rawSources = "";
      let afterEndGeneration = false;

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "",
        sender: "bot",
        timestamp: new Date(),
        type: "text",
      };
      setMessages((prev) => [...prev, botMessage]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        if (!chunk) continue;

        fullResponse += chunk;
        if (afterEndGeneration) {
          rawSources += chunk;
        } else if (fullResponse.includes("[END_GENERATION]")) {
          const parts = fullResponse.split("[END_GENERATION]");
          buffer = parts[0];
          rawSources = parts[1] || "";
          afterEndGeneration = true;

          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1].content = buffer.trim();
            updated[updated.length - 1].timestamp = new Date();
            return updated;
          });
        } else {
          buffer += chunk;
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1].content = buffer;
            updated[updated.length - 1].timestamp = new Date();
            return updated;
          });
        }
      }

      if (!fullResponse.includes("[END_GENERATION]")) {
        throw new Error("Marqueur [END_GENERATION] manquant");
      }

      if (!rawSources) {
        throw new Error("Aucune source reçue");
      }

      try {
        const parsed = JSON.parse(rawSources.trim());
        const documents = parsed?.source;
        setAllAnswer(buffer.trim());
        mutate({
          question: inputValue,
          discussionId: id,
          answer: buffer.trim(),
          documents,
        });
      } catch (error) {
        console.error("Erreur lors du parsing JSON:", error);
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            content: "Erreur: JSON invalide reçu du serveur",
            sender: "bot",
            type: "text",
            timestamp: new Date(),
          },
        ]);
      }
    } catch (error: any) {
      console.error("Erreur SSE:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          content: `Erreur: ${error.message}`,
          sender: "bot",
          type: "text",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsStreaming(false);
      setIsTyping(false);
      if (eventSourceRef.current) {
        eventSourceRef.current.close?.();
        eventSourceRef.current = null;
      }
    }
  };

  // Gérer la réponse de l'IA pour les messages audio
  const handleAIResponse = async (userMessage: Message, audioUrl?: string) => {
    setIsTyping(true);
    setShouldAutoScroll(true);
    logMessage("SYSTEM", "IA en train de répondre...");

    if (userMessage.type === "audio" && audioUrl) {
      setIsStreaming(true);
      const queryParams = new URLSearchParams({
        query: audioUrl, // Utiliser l'URL publique de l'audio
        model: env.MODEL ?? "",
        temperature: env.TEMPERATURE ?? "",
        similarity_threshold: env.SIMILARITY_THRESHOLD ?? "",
        top_k: env.TOP_K ?? "",
      });

      const url = `${env.ALIA_LLM_URL}?${queryParams.toString()}`;
      const token = env.ALIA_API_ACCESS_TOKEN || "VOTRE_TOKEN_API";

      try {
        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "text/event-stream",
          },
          method: "GET",
        });

        if (!response.ok) {
          throw new Error(`Erreur HTTP: ${response.statusText}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("Aucun reader disponible pour le stream");
        }

        const decoder = new TextDecoder();
        let fullResponse = "";
        let buffer = "";
        let rawSources = "";
        let afterEndGeneration = false;

        const botMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: "",
          sender: "bot",
          timestamp: new Date(),
          type: "text",
        };
        setMessages((prev) => [...prev, botMessage]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          if (!chunk) continue;

          fullResponse += chunk;
          if (afterEndGeneration) {
            rawSources += chunk;
          } else if (fullResponse.includes("[END_GENERATION]")) {
            const parts = fullResponse.split("[END_GENERATION]");
            buffer = parts[0];
            rawSources = parts[1] || "";
            afterEndGeneration = true;

            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1].content = buffer.trim();
              updated[updated.length - 1].timestamp = new Date();
              return updated;
            });
          } else {
            buffer += chunk;
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1].content = buffer;
              updated[updated.length - 1].timestamp = new Date();
              return updated;
            });
          }
        }

        if (!fullResponse.includes("[END_GENERATION]")) {
          throw new Error("Marqueur [END_GENERATION] manquant");
        }

        if (!rawSources) {
          throw new Error("Aucune source reçue");
        }

        try {
          const parsed = JSON.parse(rawSources.trim());
          const documents = parsed?.source;
          setAllAnswer(buffer.trim());
          mutate({
            question: audioUrl,
            discussionId: id,
            answer: buffer.trim(),
            documents,
          });
        } catch (error) {
          console.error("Erreur lors du parsing JSON:", error);
          setMessages((prev) => [
            ...prev,
            {
              id: Date.now().toString(),
              content: "Erreur: JSON invalide reçu du serveur",
              sender: "bot",
              type: "text",
              timestamp: new Date(),
            },
          ]);
        }
      } catch (error: any) {
        console.error("Erreur SSE:", error);
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            content: `Erreur: ${error.message}`,
            sender: "bot",
            type: "text",
            timestamp: new Date(),
          },
        ]);
      } finally {
        setIsStreaming(false);
        setIsTyping(false);
        if (eventSourceRef.current) {
          eventSourceRef.current.close?.();
          eventSourceRef.current = null;
        }
      }
    } else {
      // Réponse simulée pour les messages texte
      setTimeout(() => {
        const botResponse =
          userMessage.type === "audio"
            ? "J'ai reçu votre message vocal. Pouvez-vous préciser votre question juridique ?"
            : `Réponse à votre question : "${userMessage.content}"...`;

        const botMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: botResponse,
          sender: "bot",
          timestamp: new Date(),
          type: "text",
        };

        setMessages((prev) => [...prev, botMessage]);
        setIsTyping(false);

        if (audioSettings.autoPlay) {
          playMessageAudio(botMessage.id ?? "", botResponse);
        }
      }, 2000);
    }
  };

  // Lecture de la synthèse vocale
  const playMessageAudio = (messageId: string, text: string) => {
    if ("speechSynthesis" in window) {
      speechSynthesis.cancel();
      setPlayingMessageId(null);

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = audioSettings.language === "fr" ? "fr-FR" : "en-US";
      utterance.rate = audioSettings.speed;

      const voices = speechSynthesis.getVoices();
      const selectedVoice = voices.find(
        (voice) =>
          voice.lang.startsWith(audioSettings.language) &&
          (audioSettings.voice === "female"
            ? voice.name.includes("Female") || voice.name.includes("femme")
            : voice.name.includes("Male") || voice.name.includes("homme"))
      );

      if (selectedVoice) utterance.voice = selectedVoice;

      utterance.onstart = () => {
        setPlayingMessageId(messageId);
        setShouldAutoScroll(false);
      };
      utterance.onend = () => {
        setPlayingMessageId(null);
        setShouldAutoScroll(true);
      };
      utterance.onerror = (event) => {
        logMessage("AUDIO", "Erreur synthèse vocale", event);
        setPlayingMessageId(null);
        setShouldAutoScroll(true);
      };

      speechSynthesis.speak(utterance);
    } else {
      logMessage("AUDIO", "Synthèse vocale non supportée");
    }
  };

  // Lecture de l'audio enregistré
  const playRecordedAudio = (messageId: string, audioUrl: string) => {
    if (currentPlayingAudioRef.current) {
      currentPlayingAudioRef.current.pause();
      currentPlayingAudioRef.current = null;
    }
    speechSynthesis.cancel();
    setPlayingMessageId(null);

    const audio = new Audio(audioUrl);
    currentPlayingAudioRef.current = audio;
    audio.volume = 1.0;

    audio.onplay = () => {
      setPlayingMessageId(messageId);
      setShouldAutoScroll(false);
    };
    audio.onended = () => {
      setPlayingMessageId(null);
      setShouldAutoScroll(true);
      currentPlayingAudioRef.current = null;
    };
    audio.onerror = (error) => {
      logMessage("AUDIO", "Erreur lecture audio", error);
      setPlayingMessageId(null);
      setShouldAutoScroll(true);
    };

    audio.play().catch((error) => {
      logMessage("AUDIO", "Erreur démarrage lecture", error);
    });
  };

  // Pause de l'audio
  const pauseAudio = (messageId: string) => {
    speechSynthesis.cancel();
    if (currentPlayingAudioRef.current) {
      currentPlayingAudioRef.current.pause();
      currentPlayingAudioRef.current.currentTime = 0;
      currentPlayingAudioRef.current = null;
    }
    setPlayingMessageId(null);
    setShouldAutoScroll(true);
    logMessage("AUDIO", `Audio arrêté pour message ${messageId}`);
  };

  // Gestion de la touche Entrée
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Mise à jour des paramètres audio
  const handleAudioSettingsChange = (
    setting: keyof AudioSettings,
    value: any
  ) => {
    setAudioSettings((prev) => ({ ...prev, [setting]: value }));
    logMessage("SYSTEM", `Paramètre audio modifié: ${setting} = ${value}`);
  };

  return (
    <div className="flex flex-col h-screen bg-background mx-auto max-w-4xl">
      {/* En-tête */}
      <header className="sticky top-0 z-10 bg-card p-4 rounded-xl mt-3 border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">
                Irokolaw
              </h1>
              <p className="text-sm text-muted-foreground">
                Assistant IA spécialisé en droit
              </p>
            </div>
          </div>
          <div className="flex items-center justify-end space-x-2">
            <Link href="/">
              <Button
                size="sm"
                className="bg-primary/10 text-foreground rounded-md px-4 py-3"
              >
                Nouvelle Discussion
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>
        {showSettings && (
          <>
            <Separator className="my-4" />
            <div className="p-4 bg-muted/30 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={audioSettings.autoPlay}
                    onCheckedChange={(checked) =>
                      handleAudioSettingsChange("autoPlay", checked)
                    }
                  />
                  <span className="text-sm">Lecture auto</span>
                </div>
                <Select
                  value={audioSettings.voice}
                  onValueChange={(value: "male" | "female") =>
                    handleAudioSettingsChange("voice", value)
                  }
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="female">Voix féminine</SelectItem>
                    <SelectItem value="male">Voix masculine</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={audioSettings.language}
                  onValueChange={(value: "fr" | "en") =>
                    handleAudioSettingsChange("language", value)
                  }
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fr">Français</SelectItem>
                    <SelectItem value="en">Anglais</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={audioSettings.speed.toString()}
                  onValueChange={(value) =>
                    handleAudioSettingsChange("speed", parseFloat(value))
                  }
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0.5">0.5x</SelectItem>
                    <SelectItem value="1">1x</SelectItem>
                    <SelectItem value="1.5">1.5x</SelectItem>
                    <SelectItem value="2">2x</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </>
        )}
      </header>

      {/* Zone de messages */}
      <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bot className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">
              Bonjour ! Comment puis-je vous aider ?
            </h3>
            <p className="text-muted-foreground">
              Posez votre question juridique par écrit ou via un message vocal
            </p>
          </div>
        )}
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={{ ...message, isPlaying: playingMessageId === message.id }}
            onPlayAudio={playMessageAudio}
            onPauseAudio={pauseAudio}
            onPlayRecordedAudio={playRecordedAudio}
            formatDuration={formatDuration}
          />
        ))}
        {isTyping && <TypingIndicator />}
      </ScrollArea>

      {/* Pied de page avec champ de saisie */}
      <footer className="sticky bottom-0 bg-card p-4 z-50">
        {isRecording && (
          <Card className="p-4 mb-4 bg-primary/5 border-primary/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                <span className="text-sm font-medium">
                  🎤 Enregistrement... {formatDuration(recordingDuration)}
                </span>
              </div>
              <WaveformVisualizer isRecording={isRecording} />
            </div>
            <div className="mt-3 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Cliquez sur "Arrêter" pour envoyer ou "Annuler" pour abandonner
              </p>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={cancelRecording}
                  className="h-8 px-3 text-xs border-destructive/20 text-destructive"
                >
                  <X className="w-3 h-3 mr-1" />
                  Annuler
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={stopRecording}
                  className="h-8 px-3 text-xs bg-primary"
                >
                  <Send className="w-3 h-3 mr-1" />
                  Envoyer
                </Button>
              </div>
            </div>
          </Card>
        )}
        <div className="flex items-end space-x-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={placeholder}
            className="min-h-[44px]"
            disabled={isRecording}
          />
          <Button
            variant={isRecording ? "destructive" : "outline"}
            size="sm"
            className="h-[44px] w-[44px] p-0"
            onClick={
              isRecording
                ? stopRecording
                : inputValue.trim()
                ? sendMessage
                : startRecording
            }
          >
            {isRecording ? (
              <MicOff className="w-4 h-4" />
            ) : inputValue.trim() ? (
              <Send className="w-4 h-4" />
            ) : (
              <Mic className="w-4 h-4" />
            )}
          </Button>
        </div>
        <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
          <span>
            Appuyez sur Entrée pour envoyer • Cliquez sur 🎤 pour un message
            vocal
          </span>
          <div className="flex items-center space-x-2">
            <Volume2 className="w-3 h-3" />
            <span>Audio {audioSettings.autoPlay ? "activé" : "désactivé"}</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ChatPage;
export interface ChatPageProps {
  title?: string;
  placeholder?: string;
  initialMessages?: Message[];
  params: Promise<{ id: string }>;
}
