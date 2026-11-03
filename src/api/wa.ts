import axios from 'axios'
import type { Participant } from '../routes/dashboard/data'

export function getWaBaseUrl() {
  if (import.meta.env.VITE_WA_API_URL) {
    return import.meta.env.VITE_WA_API_URL
  }
  if (typeof window !== 'undefined' && window.location.hostname) {
    return `http://${window.location.hostname}:5001`
  }
  return 'http://localhost:5001'
}

export interface WaUser {
  id: string
  name: string
}

export interface WaStatusResponse {
  success: boolean
  connected: boolean
  status: 'disconnected' | 'connecting' | 'open' | 'qr'
  user: WaUser | null
  hasQr: boolean
  qr: string | null
  hasFlyer?: boolean
}

export interface BlastLog {
  phone: string
  name: string
  status: 'success' | 'failed' | 'skipped' | 'cooldown' | 'stopped'
  time: string
  message: string
}

export interface BlastStatus {
  isRunning: boolean
  shouldStop: boolean
  total: number
  current: number
  sent: number
  failed: number
  skipped: number
  currentParticipant: string | null
  cooldownUntil: string | null
  startedAt: string | null
  finishedAt: string | null
  logs: BlastLog[]
}

export interface BlastParams {
  messageTemplate: string
  participants: Participant[]
  minDelay?: number
  maxDelay?: number
  batchSize?: number
  batchPauseMs?: number
  sendFlyer?: boolean
  webBaseUrl?: string
}

export async function fetchWaStatus(): Promise<WaStatusResponse> {
  const res = await axios.get<WaStatusResponse>(`${getWaBaseUrl()}/api/status`, {
    timeout: 5000,
  })
  return res.data
}

export async function logoutWa(): Promise<{ success: boolean; message: string }> {
  const res = await axios.post(`${getWaBaseUrl()}/api/logout`)
  return res.data
}

export async function sendTestWa(
  phone: string,
  message: string,
  sendFlyer = true,
  webBaseUrl?: string
): Promise<{ success: boolean; message: string }> {
  const res = await axios.post(`${getWaBaseUrl()}/api/test-send`, {
    phone,
    message,
    sendFlyer,
    webBaseUrl,
  })
  return res.data
}

export async function startBlast(params: BlastParams): Promise<{ success: boolean; message: string; total: number }> {
  const res = await axios.post(`${getWaBaseUrl()}/api/blast`, params)
  return res.data
}

export async function fetchBlastStatus(): Promise<{ success: boolean; data: BlastStatus }> {
  const res = await axios.get<{ success: boolean; data: BlastStatus }>(`${getWaBaseUrl()}/api/blast/status`)
  return res.data
}

export async function stopBlast(): Promise<{ success: boolean; message: string }> {
  const res = await axios.post(`${getWaBaseUrl()}/api/blast/stop`)
  return res.data
}
