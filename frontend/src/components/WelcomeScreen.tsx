import { MapPin, Compass, Plane } from "lucide-react";

export default function WelcomeScreen() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-4 pb-28 bg-gradient-to-br from-background via-muted to-background">
      <div className="mb-6">
        <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-lg mx-auto">
          <Compass className="w-8 h-8 text-primary-foreground" />
        </div>
      </div>
      <h2 className="text-3xl font-semibold tracking-tight text-foreground mb-3 text-balance">
        Where shall we go?
      </h2>
      <p className="text-muted-foreground max-w-md text-base mb-10 leading-relaxed">
        Tell me your dream destination, trip style, or budget and I'll craft a
        personalized travel plan with visual inspiration.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl">
        {[
          {
            icon: MapPin,
            color: "text-primary",
            title: "Destinations",
            desc: "Explore cities and countries",
          },
          {
            icon: Compass,
            color: "text-green-400",
            title: "Activities",
            desc: "Find things to do",
          },
          {
            icon: Plane,
            color: "text-muted-foreground",
            title: "Itineraries",
            desc: "Day-by-day planning",
          },
        ].map(({ icon: Icon, color, title, desc }) => (
          <div
            key={title}
            className="bg-card p-4 rounded-xl border border-[rgba(0,0,0,0.06)] shadow-sm"
          >
            <Icon className={`w-6 h-6 ${color} mb-2`} />
            <h3 className="font-semibold text-foreground mb-1">{title}</h3>
            <p className="text-sm text-muted-foreground">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
