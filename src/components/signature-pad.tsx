"use client"

import { useRef, useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Eraser, Check, X, PenTool } from "lucide-react"

interface SignaturePadProps {
  title?: string
  description?: string
  initialSignature?: string
  onSave: (dataUrl: string) => void
  onCancel?: () => void
}

export function SignaturePad({
  title = "Signature",
  description = "Signez à l'aide de votre doigt, stylet ou souris dans le cadre ci-dessous.",
  initialSignature,
  onSave,
  onCancel,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasDrawn, setHasDrawn] = useState(!!initialSignature)

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // High DPI scaling
    const rect = canvas.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    ctx.strokeStyle = "#0f172a" // slate-900
    ctx.lineWidth = 2.5
    ctx.lineCap = "round"
    ctx.lineJoin = "round"

    if (initialSignature) {
      const img = new Image()
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, rect.height)
      }
      img.src = initialSignature
    }
  }, [initialSignature])

  const getCoordinates = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }
  }

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    canvas.setPointerCapture(e.pointerId)
    setIsDrawing(true)
    setHasDrawn(true)

    const { x, y } = getCoordinates(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const { x, y } = getCoordinates(e)
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    const canvas = canvasRef.current
    if (canvas) {
      canvas.releasePointerCapture(e.pointerId)
    }
    setIsDrawing(false)
  }

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    ctx.clearRect(0, 0, rect.width, rect.height)
    setHasDrawn(false)
  }, [])

  const saveSignature = () => {
    const canvas = canvasRef.current
    if (!canvas || !hasDrawn) return
    const dataUrl = canvas.toDataURL("image/png")
    onSave(dataUrl)
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm print:hidden">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
        <div className="flex items-center gap-2">
          <PenTool className="h-4 w-4 text-blue-600" />
          <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        </div>
        {onCancel && (
          <Button variant="ghost" size="sm" onClick={onCancel} className="h-7 w-7 p-0 text-slate-400 hover:text-slate-600">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <p className="text-xs text-slate-500 mb-3">{description}</p>

      <div className="relative rounded-lg border-2 border-dashed border-slate-300 bg-slate-50/50 overflow-hidden touch-none select-none">
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="h-44 w-full cursor-crosshair"
          style={{ width: "100%", height: "176px" }}
        />
        {!hasDrawn && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-slate-400">
            Signer ici
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        <Button variant="outline" size="sm" onClick={clearCanvas} className="text-xs text-slate-600">
          <Eraser className="h-3.5 w-3.5 mr-1.5" />
          Effacer
        </Button>
        <div className="flex items-center gap-2">
          {onCancel && (
            <Button variant="ghost" size="sm" onClick={onCancel} className="text-xs">
              Annuler
            </Button>
          )}
          <Button
            size="sm"
            onClick={saveSignature}
            disabled={!hasDrawn}
            className="bg-blue-600 hover:bg-blue-700 text-xs text-white"
          >
            <Check className="h-3.5 w-3.5 mr-1.5" />
            Valider la signature
          </Button>
        </div>
      </div>
    </div>
  )
}
