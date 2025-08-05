export interface Message {
  id: string;
  content?: string;
  sender: "user" | "bot";
  timestamp: Date;
  isPlaying?: boolean;
  type: "text" | "audio";
  audioBlob?: Blob;
  audioUrl?: string;
  duration?: number;
}

export interface AudioSettings {
  autoPlay: boolean;
  voice: "male" | "female";
  language: "fr" | "en";
  speed: number;
}

export interface ChatPageProps {
  title?: string;
  placeholder?: string;
  initialMessages?: Message[];
}
