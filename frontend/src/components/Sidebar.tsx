import { NavLink } from "react-router";
import { UtensilsCrossed, Dumbbell, Footprints, Scale, StretchHorizontal, HeartPulse, Activity } from "lucide-react";

const links = [
  { to: "/nutrition", label: "Nutrition", icon: UtensilsCrossed, color: "text-amber-400" },
  { to: "/strength", label: "Strength", icon: Dumbbell, color: "text-emerald-400" },
  { to: "/steps", label: "Steps", icon: Footprints, color: "text-blue-400" },
  { to: "/weight", label: "Weight", icon: Scale, color: "text-violet-400" },
  { to: "/stretching", label: "Stretch", icon: StretchHorizontal, color: "text-cyan-400" },
  { to: "/cardio", label: "Cardio", icon: HeartPulse, color: "text-rose-400" },
];

export default function Sidebar() {
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 min-h-screen bg-[#07070c] border-r border-[#1a1b2e] p-5 flex-col">
        <div className="flex items-center gap-2 mb-8 px-2">
          <Activity className="w-5 h-5 text-emerald-400" />
          <span className="text-base font-bold tracking-tight text-white">VibeFitness</span>
        </div>
        <nav className="flex flex-col gap-0.5">
          {links.map(({ to, label, icon: Icon, color }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? `bg-white/[0.06] text-white border-l-2 border-emerald-400 -ml-[2px] pl-[14px]`
                    : "text-[#6b6f85] hover:text-[#c0c3d4] hover:bg-white/[0.03]"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={`w-[18px] h-[18px] ${isActive ? color : ""}`} />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#07070c] border-t border-[#1a1b2e] flex justify-around px-1 py-1.5 safe-bottom">
        {links.map(({ to, label, icon: Icon, color }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-1 py-1.5 rounded-lg text-[10px] font-medium transition-colors min-w-0 ${
                isActive
                  ? `text-white`
                  : "text-[#6b6f85]"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={`w-5 h-5 ${isActive ? color : ""}`} />
                <span className="truncate">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </>
  );
}
