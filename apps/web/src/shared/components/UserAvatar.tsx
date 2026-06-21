import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";
import { cn } from "@/shared/utils/utils";

interface UserAvatarProps {
  name?: string | null;
  avatarUrl?: string | null;
  className?: string;
}

export function UserAvatar({ name, avatarUrl, className }: UserAvatarProps) {
  const nameStr = String(name || "?").trim();
  const initials = nameStr.length > 0
    ? nameStr
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "?";

  return (
    <Avatar className={cn("h-8 w-8", className)}>
      {avatarUrl && <AvatarImage src={avatarUrl} alt={name} />}
      <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
