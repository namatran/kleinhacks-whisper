"use client"

import { useEffect, useRef } from "react"

export function NeuralBackground() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    let animationFrameId

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resizeCanvas()
    window.addEventListener("resize", resizeCanvas)

    // Create neurons (nodes)
    const neurons = []
    const neuronCount = Math.round((canvas.width * canvas.height) / 15000) // More neurons
    
    class Neuron {
      constructor() {
        this.x = Math.random() * canvas.width
        this.y = Math.random() * canvas.height
        this.vx = (Math.random() - 0.5) * 0.8
        this.vy = (Math.random() - 0.5) * 0.8
        this.radius = Math.random() * 3 + 2 // Larger neurons
        this.pulsePhase = Math.random() * Math.PI * 2
        this.pulseSpeed = Math.random() * 0.02 + 0.01
        this.baseRadius = this.radius
      }

      update() {
        // Drift movement
        this.x += this.vx
        this.y += this.vy

        // Bounce off edges
        if (this.x < 0 || this.x > canvas.width) this.vx *= -1
        if (this.y < 0 || this.y > canvas.height) this.vy *= -1

        // Keep in bounds
        this.x = Math.max(0, Math.min(canvas.width, this.x))
        this.y = Math.max(0, Math.min(canvas.height, this.y))

        // Pulse animation
        this.pulsePhase += this.pulseSpeed
        this.radius = this.baseRadius * (1 + 0.6 * Math.sin(this.pulsePhase))
      }

      draw(ctx) {
        // Glowing effect
        const gradient = ctx.createRadialGradient(
          this.x,
          this.y,
          0,
          this.x,
          this.y,
          this.radius * 4
        )
        gradient.addColorStop(0, "rgba(99, 102, 241, 1)")
        gradient.addColorStop(0.5, "rgba(99, 102, 241, 0.6)")
        gradient.addColorStop(1, "rgba(99, 102, 241, 0.1)")

        ctx.fillStyle = gradient
        ctx.fillRect(
          this.x - this.radius * 4,
          this.y - this.radius * 4,
          this.radius * 8,
          this.radius * 8
        )

        // Core neuron - brighter
        ctx.fillStyle = "rgba(99, 102, 241, 1)"
        ctx.beginPath()
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2)
        ctx.fill()

        // Bright center
        ctx.fillStyle = "rgba(255, 255, 255, 0.9)"
        ctx.beginPath()
        ctx.arc(this.x, this.y, this.radius * 0.5, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // Initialize neurons
    for (let i = 0; i < neuronCount; i++) {
      neurons.push(new Neuron())
    }

    // Draw connections between nearby neurons
    const drawConnections = () => {
      const connectionDistance = 200 // Longer connections

      for (let i = 0; i < neurons.length; i++) {
        for (let j = i + 1; j < neurons.length; j++) {
          const dx = neurons[i].x - neurons[j].x
          const dy = neurons[i].y - neurons[j].y
          const distance = Math.sqrt(dx * dx + dy * dy)

          if (distance < connectionDistance) {
            // Fade connections based on distance
            const opacity = (1 - distance / connectionDistance) * 0.7 // Brighter connections
            
            ctx.strokeStyle = `rgba(99, 102, 241, ${opacity})`
            ctx.lineWidth = (1 - distance / connectionDistance) * 2.5 // Thicker lines
            ctx.beginPath()
            ctx.moveTo(neurons[i].x, neurons[i].y)
            ctx.lineTo(neurons[j].x, neurons[j].y)
            ctx.stroke()
          }
        }
      }
    }

    // Animation loop
    const animate = () => {
      // Clear with slight trail effect
      ctx.fillStyle = "rgba(0, 0, 0, 0.08)" // Less trail
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Update and draw neurons
      neurons.forEach((neuron) => {
        neuron.update()
        neuron.draw(ctx)
      })

      // Draw connections
      drawConnections()

      animationFrameId = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener("resize", resizeCanvas)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 -z-10 bg-gradient-to-br from-background via-background to-primary/10"
      style={{ opacity: 1 }}
    />
  )
}
