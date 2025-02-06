import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Heart, HeartCrack, HeartOff, HeartPulse } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Mood } from "@shared/schema";

const moods = [
  { icon: Heart, label: "In Love", value: "inlove" },
  { icon: HeartPulse, label: "Happy", value: "happy" },
  { icon: HeartOff, label: "Meh", value: "meh" },
  { icon: HeartCrack, label: "Sad", value: "sad" },
];

interface MoodSelectorProps {
  name: string;
  coupleId: number;
  partnerId: 1 | 2;
}

export function MoodSelector({ name, coupleId, partnerId }: MoodSelectorProps) {
  const today = new Date().toISOString().split("T")[0];
  const { toast } = useToast();

  const { data: currentMood, isLoading } = useQuery<Mood>({
    queryKey: [`/api/moods/${coupleId}/${today}`],
    staleTime: 0,
  });

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.hostname}:5001`);
    
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'mood_update' && message.data.coupleId === coupleId) {
        queryClient.invalidateQueries([`/api/moods/${coupleId}/${today}`]);
      }
    };

    ws.onclose = () => {
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    };

    return () => ws.close();
  }, [coupleId, today]);

  const moodMutation = useMutation({
    mutationFn: async (mood: string) => {
      // Get the current mood state before mutation
      const currentMoodState = queryClient.getQueryData<Mood>([`/api/moods/${coupleId}/${today}`]);
      const otherPartnerMood = partnerId === 1 ? currentMoodState?.partner2Mood : currentMoodState?.partner1Mood;

      const data = {
        coupleId,
        [`partner${partnerId}Mood`]: mood,
        [`partner${partnerId === 1 ? 2 : 1}Mood`]: otherPartnerMood
      };
      const res = await apiRequest("POST", "/api/moods", data);
      return await res.json();
    },
    onSuccess: (newMood) => {
      // Immediately set the new data in the cache
      queryClient.setQueryData([`/api/moods/${coupleId}/${today}`], newMood);
      toast({
        description: "Your mood has been updated!",
        duration: 2000,
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        description: "Failed to update mood. Please try again.",
      });
    },
  });

  const currentMoodKey = `partner${partnerId}Mood` as keyof Mood;
  const selectedMood = currentMood?.[currentMoodKey] || "none";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-center">{name}'s Mood</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2">
          {moods.map(({ icon: Icon, label, value }) => {
            const isSelected = selectedMood === value;

            return (
              <Button
                key={value}
                variant={isSelected ? "default" : "outline"}
                className="h-24 flex flex-col gap-2"
                onClick={() => moodMutation.mutate(value)}
                disabled={moodMutation.isPending || isLoading}
              >
                <Icon className={`h-8 w-8 ${isSelected ? "text-white" : ""}`} />
                {label}
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}