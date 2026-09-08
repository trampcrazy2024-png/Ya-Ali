export interface AIMessage { role: 'system' | 'user' | 'assistant'; content: string; }
export interface AICompletionRequest { messages: AIMessage[]; temperature?: number; maxTokens?: number; task?: string; }
export interface AIProvider { readonly id: string; complete(request: AICompletionRequest): Promise<string>; isAvailable(): Promise<boolean>; }
export interface STTProvider { readonly id: string; listen(language: string): Promise<{ text: string; alternatives?: string[] }>; }
export interface TTSProvider { readonly id: string; speak(text: string, language: string): Promise<void>; stop(): Promise<void>; }
