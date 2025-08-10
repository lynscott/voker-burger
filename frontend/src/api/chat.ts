import { postJson, postForBlob } from './client'

export interface ChatResponse {
  reply: string
  audio?: string // base64 encoded audio
}

export async function sendChat(message: string, requestAudio: boolean): Promise<ChatResponse> {
  return postJson<ChatResponse>('/chat', { message, request_audio: requestAudio })
}

export async function requestGreeting(): Promise<Blob> {
  // Special trigger to get audio greeting
  return postForBlob('/chat', { message: '__INITIAL_GREETING__' }, 'audio/mpeg')
}
