import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

type ThemeToggleProps = {
  theme: "light" | "dark";
  onToggle: () => void;
};

export function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  return (
    <Button variant="outline" onClick={onToggle} aria-label="Alternar tema">
      {theme === "dark" ? <Moon size={16} /> : <Sun size={16} />}
      {theme === "dark" ? "Escuro" : "Claro"}
    </Button>
  );
}
