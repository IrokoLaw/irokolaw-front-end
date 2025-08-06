"use client";

import { useCreateDiscussion } from "@/api/create-new-discussion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Zap } from "lucide-react";

const NewDiscussionPage: React.FC = () => {
  const [title, setTitle] = useState("");
  const [initialQuestion, setInitialQuestion] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const router = useRouter();

  const { mutate, isPending } = useCreateDiscussion({
    mutationConfig: {},
  });

  const handleCreateDiscussion = () => {
    if (isCreating) return;

    setIsCreating(true);
    const discussionTitle = title.trim() || `Discussion ${Date.now()}`;
    const question = initialQuestion.trim();

    mutate(
      { title: initialQuestion },
      {
        onSuccess: (data) => {
          console.log(
            "SYSTEM",
            `Nouvelle discussion créée avec succès: ${data.id}`,
            {
              title: discussionTitle,
              initialQuestion: question,
            }
          );
          setIsCreating(false);
          router.push(`/discussion/${data.id}`);
        },
        onError: (err) => {
          console.error("Erreur lors de la création de la discussion:", err);
          console.log(
            "SYSTEM",
            "Erreur lors de la création de la discussion",
            err
          );
          setIsCreating(false);
          // TODO: Ajouter une notification d'erreur pour l'utilisateur
        },
      }
    );
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleCreateDiscussion();
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <CardTitle>Nouvelle Discussion</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Textarea
              value={initialQuestion}
              onChange={(e: any) => setInitialQuestion(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Posez votre première question juridique..."
              disabled={isCreating}
              className="min-h-[100px] resize-none"
            />
            {/* <Button
              onClick={handleCreateDiscussion}
              disabled={isCreating}
              className="w-full"
            >
              {isCreating ? "Création..." : "Commencer une nouvelle discussion"}
            </Button> */}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NewDiscussionPage;
