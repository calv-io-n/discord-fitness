import { NavLink } from "react-router";
import { UtensilsCrossed, Dumbbell, Footprints, Scale, StretchHorizontal, HeartPulse } from "lucide-react";

const links = [
  { to: "/nutrition", label: "Nutrition", icon: UtensilsCrossed },
  { to: "/strength", label: "Strength", icon: Dumbbell },
  { to: "/steps", label: "Steps", icon: Footprints },
  { to: "/weight", label: "Weight", icon: Scale },
  { to: "/stretching", label: "Stretching", icon: StretchHorizontal },
  { to: "/cardio", label: "Cardio", icon: HeartPulse },
];

export default function Sidebar() {
  return (
    <aside className="w-52 min-h-screen bg-zinc-950 border-r border-zinc-800 p-4 flex flex-col gap-1">
      <div className="text-sm font-bold text-zinc-400 mb-4 px-3">Fitness</div>
      {links.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
              isActive
                ? "bg-zinc-800 text-white font-medium"
                : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900"
            }`
          }
        >
          <Icon className="w-4 h-4" />
          {label}
        </NavLink>
      ))}
    </aside>
  );
}
