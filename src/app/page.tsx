"use client";

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
import type { AudioSettings, ChatPageProps, Message } from "@/utils/types/chat";
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
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";

const ChatPage: React.FC<ChatPageProps> = ({
  title = "Assistant Juridique IA",
  placeholder = "Posez votre question juridique...",
  initialMessages = [],
}) => {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [inputValue, setInputValue] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioSettings, setAudioSettings] = useState<AudioSettings>({
    autoPlay: false,
    voice: "female",
    language: "fr",
    speed: 1,
  });

  // Ajouter un nouvel état pour gérer la lecture audio
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingStartTimeRef = useRef<number>(0);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentPlayingAudioRef = useRef<HTMLAudioElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

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
    if (extra) {
      console.log("Données supplémentaires:", extra);
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

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

  useEffect(() => {
    // Ne scroll que si on doit auto-scroll (nouveaux messages, typing, etc.)
    if (shouldAutoScroll) {
      scrollToBottom();
    }
  }, [messages.length, isTyping, scrollToBottom, shouldAutoScroll]); // Utiliser messages.length au lieu de messages

  useEffect(() => {
    const savedMessages = localStorage.getItem("chat-messages");
    if (savedMessages) {
      try {
        const parsed = JSON.parse(savedMessages).map(
          (msg: { timestamp: string | number | Date }) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
            // Ne pas recréer les URLs audio car les blobs ne sont pas persistants
            audioUrl: undefined,
          })
        );
        setMessages(parsed);
        logMessage(
          "SYSTEM",
          `${parsed.length} messages chargés depuis le localStorage`
        );
      } catch (error) {
        console.error("Error loading saved messages:", error);
        logMessage(
          "SYSTEM",
          "Erreur lors du chargement des messages sauvegardés",
          error
        );
      }
    }
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      // Sauvegarder sans les URLs et blobs audio (non persistants)
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

  const cleanupRecording = () => {
    // Nettoyer les chunks audio
    audioChunksRef.current = [];

    // Arrêter et nettoyer le timer
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }

    // Fermer tous les tracks audio
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => {
        track.stop();
        logMessage("AUDIO", "🔇 Track audio fermé lors du nettoyage");
      });
      mediaStreamRef.current = null;
    }

    // Réinitialiser les états
    setIsRecording(false);
    setRecordingDuration(0);

    // Nettoyer la référence du MediaRecorder
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current = null;
    }

    setShouldAutoScroll(true); // Réactiver le scroll automatique après nettoyage

    logMessage("AUDIO", "🧹 Nettoyage complet de l'enregistrement effectué");
  };

  const startRecording = async () => {
    try {
      setShouldAutoScroll(false); // Désactiver le scroll pendant l'enregistrement
      logMessage("AUDIO", "Démarrage de l'enregistrement vocal...");
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });

      // Stocker la référence du stream pour le nettoyage
      mediaStreamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      recordingStartTimeRef.current = Date.now();
      setRecordingDuration(0);

      // Démarrer le compteur de durée
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

        logMessage("AUDIO", "✅ Enregistrement terminé avec succès", {
          size: `${(audioBlob.size / 1024).toFixed(1)} KB`,
          type: audioBlob.type,
          duration: `${duration.toFixed(1)}s`,
          chunks: audioChunksRef.current.length,
        });

        // Créer l'URL pour la lecture immédiate
        const audioUrl = URL.createObjectURL(audioBlob);

        // Tester que l'URL fonctionne
        const testAudio = new Audio(audioUrl);
        testAudio.oncanplay = () => {
          logMessage("AUDIO", "✅ URL audio créée et testée avec succès");
        };
        testAudio.onerror = () => {
          logMessage("AUDIO", "❌ Erreur lors du test de l'URL audio");
        };

        // Créer le message audio directement (sans transcription)
        const audioMessage: Message = {
          id: Date.now().toString(),
          sender: "user",
          timestamp: new Date(),
          type: "audio",
          audioBlob,
          audioUrl,
          duration,
        };

        // Ajouter le message à la conversation
        setMessages((prev) => [...prev, audioMessage]);
        logMessage("USER", `🎤 Message vocal envoyé directement`, {
          messageId: audioMessage.id,
          duration: `${duration.toFixed(1)}s`,
          size: `${(audioBlob.size / 1024).toFixed(1)} KB`,
          url: audioUrl.substring(0, 50) + "...",
        });

        // Déclencher la réponse de l'IA
        handleAIResponse(audioMessage);

        // Nettoyer après traitement réussi
        cleanupRecording();
      };

      mediaRecorder.start(100); // Collecter des chunks toutes les 100ms
      setIsRecording(true);
      logMessage("AUDIO", "Enregistrement démarré avec succès");
    } catch (error) {
      console.error("Error starting recording:", error);
      logMessage(
        "AUDIO",
        "Erreur lors du démarrage de l'enregistrement",
        error
      );
      setShouldAutoScroll(true); // Réactiver en cas d'erreur
      cleanupRecording();
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      logMessage("AUDIO", "Arrêt de l'enregistrement demandé");
    }
  };

  const cancelRecording = () => {
    logMessage("AUDIO", "🚫 Annulation de l'enregistrement demandée");

    // Arrêter l'enregistrement si en cours
    if (mediaRecorderRef.current && isRecording) {
      // Supprimer les event listeners pour éviter le traitement
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onstop = null;

      // Arrêter l'enregistrement
      try {
        mediaRecorderRef.current.stop();
      } catch (error) {
        logMessage("AUDIO", "Erreur lors de l'arrêt du MediaRecorder", error);
      }
    }

    // Nettoyer complètement
    cleanupRecording();

    logMessage("AUDIO", "✅ Enregistrement annulé avec succès");
  };

  const sendMessage = async () => {
    if (!inputValue.trim()) {
      logMessage("SYSTEM", "Tentative d'envoi d'un message vide - ignoré");
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      sender: "user",
      timestamp: new Date(),
      type: "text",
    };

    // Log du message utilisateur
    logMessage("USER", inputValue, {
      messageId: userMessage.id,
      timestamp: userMessage.timestamp,
      length: inputValue.length,
    });

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");

    // Déclencher la réponse de l'IA
    handleAIResponse(userMessage);
  };

  const handleAIResponse = (userMessage: Message) => {
    setIsTyping(true);
    setShouldAutoScroll(true); // S'assurer que le scroll est activé pour les nouvelles réponses
    logMessage("SYSTEM", "IA en train de taper...");

    // Simulate AI response
    setTimeout(() => {
      let botResponse: string;
      if (userMessage.type === "audio") {
        botResponse =
          "J'ai bien reçu votre message vocal. En tant qu'assistant juridique IA, je peux vous aider avec vos questions juridiques. Pouvez-vous me donner plus de détails sur votre situation ?";
      } else {
        botResponse = `En tant qu'assistant juridique IA, je peux vous aider avec votre question : "${userMessage.content}". Voici une réponse détaillée basée sur le droit français applicable...`;
      }

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: botResponse,
        sender: "bot",
        timestamp: new Date(),
        type: "text",
      };

      // Log de la réponse de l'IA
      logMessage("BOT", botResponse, {
        messageId: botMessage.id,
        timestamp: botMessage.timestamp,
        responseTime: "2000ms",
        length: botResponse.length,
      });

      setMessages((prev) => [...prev, botMessage]);
      setIsTyping(false);

      if (audioSettings.autoPlay) {
        logMessage(
          "AUDIO",
          "Lecture automatique activée - démarrage de la synthèse vocale"
        );
        playMessageAudio(botMessage.id, botMessage.content!);
      }
    }, 2000);
  };

  const playMessageAudio = (messageId: string, text: string) => {
    if ("speechSynthesis" in window) {
      logMessage("AUDIO", "Démarrage de la synthèse vocale", {
        messageId,
        textLength: text.length,
        language: audioSettings.language,
        voice: audioSettings.voice,
        speed: audioSettings.speed,
      });

      // Arrêter toute lecture en cours
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

      if (selectedVoice) {
        utterance.voice = selectedVoice;
        logMessage("AUDIO", `Voix sélectionnée: ${selectedVoice.name}`);
      } else {
        logMessage(
          "AUDIO",
          "Aucune voix spécifique trouvée - utilisation de la voix par défaut"
        );
      }

      utterance.onstart = () => {
        logMessage(
          "AUDIO",
          `Lecture audio démarrée pour le message ${messageId}`
        );
        setPlayingMessageId(messageId);
        setShouldAutoScroll(false); // Désactiver le scroll automatique pendant la lecture
      };

      utterance.onend = () => {
        logMessage(
          "AUDIO",
          `Lecture audio terminée pour le message ${messageId}`
        );
        setPlayingMessageId(null);
        setShouldAutoScroll(true); // Réactiver le scroll automatique
      };

      utterance.onerror = (event) => {
        logMessage("AUDIO", "Erreur lors de la synthèse vocale", event);
        setPlayingMessageId(null);
        setShouldAutoScroll(true);
      };

      speechSynthesis.speak(utterance);
    } else {
      logMessage("AUDIO", "Synthèse vocale non supportée par ce navigateur");
    }
  };

  const playRecordedAudio = (messageId: string, audioUrl: string) => {
    logMessage("AUDIO", `🎵 Lecture de votre message vocal (ID: ${messageId})`);

    // Arrêter l'audio en cours s'il y en a un
    if (currentPlayingAudioRef.current) {
      currentPlayingAudioRef.current.pause();
      currentPlayingAudioRef.current = null;
    }

    // Arrêter la synthèse vocale si active
    speechSynthesis.cancel();
    setPlayingMessageId(null);

    const audio = new Audio(audioUrl);
    currentPlayingAudioRef.current = audio;

    // Améliorer la qualité audio
    audio.preload = "auto";
    audio.volume = 1.0;

    audio.onloadstart = () => {
      logMessage("AUDIO", "🔄 Chargement de l'audio...");
    };

    audio.oncanplay = () => {
      logMessage("AUDIO", "✅ Audio prêt à être lu");
    };

    audio.onplay = () => {
      setPlayingMessageId(messageId);
      setShouldAutoScroll(false); // Désactiver le scroll automatique pendant la lecture
      logMessage("AUDIO", `▶️ Lecture démarrée pour votre message vocal`);
    };

    audio.onended = () => {
      setPlayingMessageId(null);
      setShouldAutoScroll(true); // Réactiver le scroll automatique
      currentPlayingAudioRef.current = null;
      logMessage("AUDIO", `⏹️ Lecture terminée pour votre message vocal`);
    };

    audio.onerror = (error) => {
      logMessage(
        "AUDIO",
        "❌ Erreur lors de la lecture de votre message vocal",
        error
      );
      setPlayingMessageId(null);
      setShouldAutoScroll(true);
      currentPlayingAudioRef.current = null;
    };

    audio.onpause = () => {
      logMessage("AUDIO", "⏸️ Lecture mise en pause");
      setPlayingMessageId(null);
      setShouldAutoScroll(true);
    };

    // Démarrer la lecture
    audio.play().catch((error) => {
      logMessage("AUDIO", "❌ Erreur lors du démarrage de la lecture", error);
      setPlayingMessageId(null);
      setShouldAutoScroll(true);
      console.warn(
        "La lecture automatique peut être bloquée. Cliquez pour écouter."
      );
    });
  };

  const pauseAudio = (messageId: string) => {
    // Arrêter la synthèse vocale
    speechSynthesis.cancel();

    // Arrêter l'audio en cours
    if (currentPlayingAudioRef.current) {
      currentPlayingAudioRef.current.pause();
      currentPlayingAudioRef.current.currentTime = 0;
      currentPlayingAudioRef.current = null;
    }

    logMessage(
      "AUDIO",
      `Audio mis en pause/arrêté pour le message ${messageId}`
    );
    setPlayingMessageId(null);
    setShouldAutoScroll(true); // Réactiver le scroll automatique
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      logMessage("SYSTEM", "Envoi du message via la touche Entrée");
      sendMessage();
    }
  };

  const handleAudioSettingsChange = (
    setting: keyof AudioSettings,
    value: any
  ) => {
    setAudioSettings((prev) => ({ ...prev, [setting]: value }));
    logMessage("SYSTEM", `Paramètre audio modifié: ${setting} = ${value}`);
  };

  return (
    <div className="flex flex-col h-screen bg-background mwx">
      <header className="sticky top-0 w-full rounded-xl mt-3 border bg-card p-4 ">
        <div className="bg-background/5 backdrop-blur-md transition-colors duration-300">
          <div className="flex items-center justify-between w-full">
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
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowSettings(!showSettings);
                logMessage(
                  "SYSTEM",
                  `Paramètres ${!showSettings ? "ouverts" : "fermés"}`
                );
              }}
              className="flex-shrink-0"
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
          {/* Panel des paramètres */}
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
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={audioSettings.speed.toString()}
                    onValueChange={(value) =>
                      handleAudioSettingsChange(
                        "speed",
                        Number.parseFloat(value)
                      )
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
        </div>
      </header>

      <ScrollArea ref={scrollAreaRef} className="flex-1 p-4 mt-32">
        <div>
          {messages.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Bot className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">
                Bonjour ! Comment puis-je vous aider ?
              </h3>
              <p className="text-muted-foreground">
                Posez votre question juridique par écrit ou envoyez un message
                vocal
              </p>
            </div>
          )}
          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={{
                ...message,
                isPlaying: playingMessageId === message.id,
              }}
              onPlayAudio={playMessageAudio}
              onPauseAudio={pauseAudio}
              onPlayRecordedAudio={playRecordedAudio}
              formatDuration={formatDuration}
            />
          ))}
          {isTyping && <TypingIndicator />}
        </div>
      </ScrollArea>

      <footer className="sticky bottom-0 w-full bg-card p-4 z-50">
        <div>
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
                  Cliquez sur "Arrêter" pour envoyer ou "Annuler" pour
                  abandonner
                </p>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={cancelRecording}
                    className="h-8 px-3 text-xs border-destructive/20 text-destructive hover:bg-destructive/10 hover:text-destructive bg-transparent"
                  >
                    <X className="w-3 h-3 mr-1" />
                    Annuler
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={stopRecording}
                    className="h-8 px-3 text-xs bg-primary hover:bg-primary/90"
                  >
                    <Send className="w-3 h-3 mr-1" />
                    Envoyer
                  </Button>
                </div>
              </div>
            </Card>
          )}
          <div className="flex items-end space-x-2">
            <div className="flex-1 relative">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder={placeholder}
                className="pr-12 min-h-[44px] resize-none"
                disabled={isRecording}
              />
            </div>
            <Button
              variant={isRecording ? "destructive" : "outline"}
              size="sm"
              className="h-[44px] w-[44px] p-0"
              onClick={
                inputValue.trim() && !isRecording
                  ? sendMessage
                  : isRecording
                  ? stopRecording
                  : startRecording
              }
            >
              {isRecording ? (
                <MicOff className="w-4 h-4" />
              ) : !inputValue.trim() ? (
                <Mic className="w-4 h-4" />
              ) : (
                <Send className="w-4 h-4" />
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
              <span>
                Audio {audioSettings.autoPlay ? "activé" : "désactivé"}
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ChatPage;
