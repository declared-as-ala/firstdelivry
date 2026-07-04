"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Package, Eye, EyeOff, Loader2, ArrowRight, BarChart3, ScanLine, Shield } from "lucide-react"
import { toast } from "sonner"

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const result = await signIn("credentials", { email, password, redirect: false })

      if (result?.error) {
        toast.error("Erreur de connexion", { description: "Email ou mot de passe incorrect" })
        return
      }

      router.push("/colis")
    } catch {
      toast.error("Erreur", { description: "Une erreur est survenue" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left brand panel — hidden on mobile, shown on md+ */}
      <div className="hidden md:flex md:w-[55%] lg:w-[60%] relative bg-primary overflow-hidden">
        {/* Background grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.8) 1px, transparent 0)`,
            backgroundSize: "32px 32px",
          }}
        />

        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-blue-900" />

        {/* Decorative ring */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-white/5" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] rounded-full border border-white/[0.03]" />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 lg:p-16 w-full">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center ring-1 ring-white/10">
              <Package className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-semibold tracking-tight text-white/90">LogiFlow</span>
          </div>

          {/* Center hero */}
          <div className="flex-1 flex flex-col justify-center max-w-md">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-xs font-medium text-white/60 ring-1 ring-white/10 mb-4">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Opérationnel
              </div>
              <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-white leading-[1.1]">
                Centre de contrôle
                <br />
                <span className="text-blue-300">logistique &amp; COD</span>
              </h1>
              <p className="text-base text-white/50 leading-relaxed mt-3">
                Gérez vos remises First Delivery, suivez les livraisons, confirmez les retours
                et réconciliez les paiements COD en un seul endroit.
              </p>
            </div>

            {/* Feature list */}
            <div className="mt-10 grid grid-cols-1 gap-3">
              {[
                { icon: ScanLine, text: "Scan colis avant remise" },
                { icon: BarChart3, text: "Tableaux de bord temps réel" },
                { icon: Shield, text: "Réconciliation COD automatisée" },
              ].map((f) => {
                const Icon = f.icon
                return (
                  <div key={f.text} className="flex items-center gap-3 text-sm text-white/60">
                    <div className="h-6 w-6 rounded-md bg-white/5 flex items-center justify-center ring-1 ring-white/10">
                      <Icon className="h-3.5 w-3.5 text-blue-300" />
                    </div>
                    {f.text}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Footer */}
          <p className="text-xs text-white/20">
            LogiFlow v1.0 — Gestion logistique &amp; COD
          </p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center bg-background p-6">
        <div className="w-full max-w-sm">
          {/* Logo on mobile — hidden on md+ */}
          <div className="flex flex-col items-center mb-10 md:hidden">
            <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center shadow-sm mb-3">
              <Package className="h-6 w-6 text-primary-foreground" />
            </div>
            <h1 className="text-lg font-semibold text-foreground">LogiFlow</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Centre de contrôle logistique</p>
          </div>

          {/* Desktop heading — hidden on mobile */}
          <div className="hidden md:block mb-10">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">Connexion</h2>
            <p className="text-sm text-muted-foreground mt-1">Accédez à votre tableau de bord</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
                Email
              </Label>
              <div className="relative group">
                <div className="absolute -inset-0.5 rounded-lg bg-primary/5 opacity-0 group-focus-within:opacity-100 transition-opacity blur-sm" />
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@logiflow.tn"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  className="relative h-12 bg-white border-border/80 text-foreground placeholder:text-muted-foreground/40 rounded-lg transition-shadow focus:border-primary/50 focus:shadow-[0_0_0_3px_rgba(var(--primary)/0.1)]"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
                  Mot de passe
                </Label>
              </div>
              <div className="relative group">
                <div className="absolute -inset-0.5 rounded-lg bg-primary/5 opacity-0 group-focus-within:opacity-100 transition-opacity blur-sm" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="relative h-12 bg-white border-border/80 text-foreground placeholder:text-muted-foreground/40 rounded-lg pr-11 transition-shadow focus:border-primary/50 focus:shadow-[0_0_0_3px_rgba(var(--primary)/0.1)]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 rounded-lg text-sm font-medium transition-all duration-200 shadow-sm hover:shadow-md"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Connexion en cours…
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Se connecter
                  <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </Button>
          </form>

          {/* Footer — desktop only */}
          <p className="hidden md:block text-center text-[11px] text-muted-foreground/40 mt-10 tracking-wider">
            LogiFlow v1.0 — Gestion logistique &amp; COD
          </p>
        </div>
      </div>
    </div>
  )
}
