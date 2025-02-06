import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { insertCoupleSchema, type InsertCouple } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { MoodSelector } from "@/components/mood-selector";
import { DateDisplay } from "@/components/date-display";
import { differenceInDays, parse } from "date-fns";
import { useLocation } from "wouter";

export default function Home() {
  const { toast } = useToast();
  const [location] = useLocation();
  const searchParams = new URLSearchParams(location.split('?')[1] || '');
  const initialCoupleId = searchParams.get("coupleId");
  const [coupleId, setCoupleId] = useState<number | null>(
    initialCoupleId ? Number(initialCoupleId) : Number(localStorage.getItem("coupleId")) || null
  );

  const [searchId, setSearchId] = useState<string>('');

  const form = useForm<InsertCouple>({
    resolver: zodResolver(insertCoupleSchema),
    defaultValues: {
      partner1Name: "Partner 1",
      partner2Name: "Partner 2",
      anniversary: new Date().toISOString().split("T")[0],
    },
  });

  const coupleMutation = useMutation({
    mutationFn: async (data: InsertCouple) => {
      const res = await apiRequest("POST", "/api/couples", data);
      return await res.json();
    },
    onSuccess: (data) => {
      setCoupleId(data.id);
      localStorage.setItem("coupleId", data.id.toString());
      window.history.pushState({}, '', `/?coupleId=${data.id}`);
      queryClient.invalidateQueries({ queryKey: [`/api/couples/${data.id}`] });
      toast({
        title: "Welcome!",
        description: "Share this page's URL with your partner to connect!",
      });
    },
  });

  const { data: couple, isLoading } = useQuery({
    queryKey: [`/api/couples/${coupleId}`],
    enabled: !!coupleId,
  });

  useEffect(() => {
    if (coupleId) {
      queryClient.invalidateQueries({ queryKey: [`/api/couples/${coupleId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/moods/${coupleId}/${new Date().toISOString().split("T")[0]}`] });
    }
  }, [coupleId]);

  const handleSearch = () => {
    if (searchId) {
      setCoupleId(Number(searchId));
      window.history.pushState({}, '', `/?coupleId=${searchId}`);
      localStorage.setItem("coupleId", searchId);
    } else {
      toast({
        title: "Error",
        description: "Please enter a valid ID.",
        variant: "destructive",
      });
    }
  };

  const handleShare = async () => {
    try {
      const res = await fetch(`/api/share/${coupleId}`);
      const data = await res.json();
      const shareDetails = {
        shareUrl: data.shareUrl,
        coupleId: coupleId,
      };

      await navigator.clipboard.writeText(JSON.stringify(shareDetails));
      toast({
        title: "Share Link Copied!",
        description: "Send this link to someone to share your mood tracker along with your ID.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate share link",
        variant: "destructive",
      });
    }
  };

  if (!coupleId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-red-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-2xl font-bold bg-gradient-to-r from-pink-500 to-red-500 text-transparent bg-clip-text">
              Our Love Story
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => coupleMutation.mutate(data))} className="space-y-4">
                <div className="space-y-2">
                  <Input placeholder="Your name" {...form.register("partner1Name")} />
                  <Input placeholder="Partner's name" {...form.register("partner2Name")} />
                  <Input type="date" {...form.register("anniversary")} />
                </div>
                <Button type="submit" className="w-full" disabled={coupleMutation.isPending}>
                  Start Our Journey
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!couple) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-red-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-2xl font-bold bg-gradient-to-r from-pink-500 to-red-500 text-transparent bg-clip-text">
              Loading...
            </CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-red-50 flex items-center justify-center">
        <p>Loading your love story...</p>
      </div>
    );
  }

  const daysTogether = differenceInDays(
    new Date(),
    parse(couple.anniversary, "yyyy-MM-dd", new Date())
  );

  return (
    <div>
      <div className="container mx-auto px-4"> {/* Wrap the entire content in a div */}
        <header className="w-full bg-white p-1 rounded shadow flex items-center space-x-1 z-10 px-2 pb-2 mt-10 mb-4"> 
          <Input
            placeholder="Enter ID"
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
            className="h-8 text-sm"
          />
          <Button onClick={handleSearch} size="sm">
            Connect
          </Button>
        </header>
        <div className="mt-16 mb-4"> {/* Adjusted margin to create space between the two */}
          <span>Your ID: {coupleId}</span>
        </div>


        <DateDisplay
          className="px-200 mt-5" 
          anniversary={couple.anniversary}
          daysTogether={daysTogether}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <MoodSelector
            name={couple.partner1Name}
            coupleId={couple.id}
            partnerId={1}
          />
          <MoodSelector
            name={couple.partner2Name}
            coupleId={couple.id}
            partnerId={2}
          />
        </div>
        <Button onClick={handleShare} className="mt-4">
          Share Mood Tracker
        </Button>
      </div>
    </div>
  );
}