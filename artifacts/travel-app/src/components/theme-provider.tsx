import { createContext, useContext, useLayoutEffect, useState } from "react"

type Theme = "dark" | "light" | "system"
type ResolvedTheme = "dark" | "light"

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

type ThemeProviderState = {
  theme: Theme
  resolvedTheme: ResolvedTheme
  setTheme: (theme: Theme) => void
}

const initialState: ThemeProviderState = {
  theme: "system",
  resolvedTheme: "light",
  setTheme: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

function getSystemTheme(): ResolvedTheme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

function getStoredTheme(storageKey: string, defaultTheme: Theme): Theme {
  const stored = localStorage.getItem(storageKey)
  return stored === "light" || stored === "dark" || stored === "system" ? stored : defaultTheme
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "vite-ui-theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => getStoredTheme(storageKey, defaultTheme))
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(
    () => theme === "system" ? getSystemTheme() : theme
  )

  useLayoutEffect(() => {
    const root = window.document.documentElement
    const media = window.matchMedia("(prefers-color-scheme: dark)")
    const applyTheme = () => {
      const nextTheme = theme === "system" ? getSystemTheme() : theme
      root.classList.remove("light", "dark")
      root.classList.add(nextTheme)
      root.style.colorScheme = nextTheme
      setResolvedTheme(nextTheme)
    }

    applyTheme()
    if (theme === "system") media.addEventListener("change", applyTheme)
    return () => media.removeEventListener("change", applyTheme)
  }, [theme])

  const value = {
    theme,
    resolvedTheme,
    setTheme: (theme: Theme) => {
      localStorage.setItem(storageKey, theme)
      setTheme(theme)
    },
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider")

  return context
}