import { Card, CardContent } from "@/components/ui/card";
import { differenceInDays, format, parse } from "date-fns";

interface DateDisplayProps {
  anniversary: string;
  daysTogether: number;
}

export function DateDisplay({ anniversary, daysTogether }: DateDisplayProps) {
  const anniversaryDate = parse(anniversary, "yyyy-MM-dd", new Date());
  const nextAnniversary = new Date(anniversaryDate);
  nextAnniversary.setFullYear(new Date().getFullYear());
  
  if (nextAnniversary < new Date()) {
    nextAnniversary.setFullYear(nextAnniversary.getFullYear() + 1);
  }

  const daysUntilAnniversary = differenceInDays(nextAnniversary, new Date());

  return (
    <Card className="bg-white/80 backdrop-blur">
      <CardContent className="p-6">
        <div className="text-center space-y-4">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-pink-500 to-red-500 text-transparent bg-clip-text">
              {daysTogether} Days Together
            </h2>
            <p className="text-gray-600">
              Anniversary: {format(anniversaryDate, "MMMM do, yyyy")}
            </p>
          </div>
          <div className="text-lg text-gray-700">
            {daysUntilAnniversary === 0 ? (
              <p className="font-bold text-pink-500">Happy Anniversary! 🎉</p>
            ) : (
              <p>{daysUntilAnniversary} days until your next anniversary</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
