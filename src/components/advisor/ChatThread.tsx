'use client';

import React, { useEffect, useRef } from 'react';
import { Bot, User, Compass, AlertCircle } from 'lucide-react';
import type { ChatMessage } from '@/lib/advisor/chat-reducer';

export interface ChatThreadProps {
  messages: ChatMessage[];
  isWaitingForResponse: boolean;
}

export function ChatThread({ messages, isWaitingForResponse }: ChatThreadProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isWaitingForResponse]);

  return (
    <div className="flex-1 overflow-y-auto space-y-4 p-3 sm:p-5 bg-slate-50/70 rounded-3xl border border-slate-200/80 min-h-[340px] max-h-[520px]">
      {messages.length === 0 && <p className="text-sm text-slate-600">กำลังเปิดคำถามชวนคิดระดับ 1 จากเซิร์ฟเวอร์ หากเชื่อมต่อไม่ได้ คุณยังพิมพ์เก็บฉบับร่างไว้ได้</p>}
      {messages.map((msg) => {
        const isCoach = msg.role === 'coach';

        return (
          <div
            key={msg.id}
            className={`flex flex-col ${isCoach ? 'items-start' : 'items-end'} space-y-1.5`}
          >
            {/* Header Badge */}
            <div className="flex items-center gap-1.5 px-2 text-[11px] font-prompt text-slate-500">
              {isCoach ? (
                <>
                  <Bot className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="font-bold text-slate-700">ครูที่ปรึกษา AI</span>
                  {msg.tier && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        msg.tier === 1
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                          : msg.tier === 2
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {msg.tier === 1
                        ? 'Tier 1 • Socratic Question'
                        : msg.tier === 2
                          ? 'Tier 2 • Guided Hint'
                          : 'Tier 3 • Last Resort'}
                    </span>
                  )}
                </>
              ) : (
                <>
                  <span className="font-bold text-slate-700">คำตอบของคุณ</span>
                  <User className="w-3.5 h-3.5 text-emerald-600" />
                </>
              )}
            </div>

            {/* Bubble */}
            <div
              className={`max-w-[92%] sm:max-w-[80%] rounded-2xl p-3.5 sm:p-4 text-xs sm:text-sm font-prompt leading-relaxed shadow-xs ${
                isCoach
                  ? 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm'
                  : 'bg-indigo-600 text-white rounded-tr-sm shadow-indigo-100'
              }`}
            >
              {isCoach && msg.source === 'fallback' && <p className="mb-2 text-[11px] text-slate-500">คำแนะนำสำรองอัตโนมัติจากเซิร์ฟเวอร์</p>}
              <div className="whitespace-pre-wrap break-words">{msg.content}</div>

              {/* Tier 2 Lenses */}
              {isCoach && msg.lenses && msg.lenses.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5">
                  <div className="flex items-center gap-1 text-[11px] font-bold text-amber-800">
                    <Compass className="w-3.5 h-3.5 text-amber-600" />
                    <span>กรอบคิดแนะนำ (Thinking Lenses):</span>
                  </div>
                  <ul className="space-y-1 pl-1">
                    {msg.lenses.map((lens, i) => (
                      <li
                        key={i}
                        className="text-xs text-slate-700 bg-amber-50/60 border border-amber-200/60 rounded-xl p-2"
                      >
                        • {lens}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Tier 3 Examples */}
              {isCoach && msg.examples && msg.examples.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5">
                  <div className="flex items-center gap-1 text-[11px] font-bold text-rose-800">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                    <span>ตัวอย่างแนวทางตั้งต้น (จำเป็นต้องเขียนใหม่ในสำนวนของคุณเอง):</span>
                  </div>
                  <ul className="space-y-1 pl-1">
                    {msg.examples.map((example, i) => (
                      <li
                        key={i}
                        className="text-xs text-slate-700 bg-rose-50/60 border border-rose-200/60 rounded-xl p-2.5 font-medium"
                      >
                        📌 {example}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Waiting Indicator */}
      {isWaitingForResponse && (
        <div className="flex items-center gap-2 p-3 rounded-2xl bg-white border border-indigo-100 max-w-fit shadow-xs">
          <Bot className="w-4 h-4 text-indigo-600 animate-pulse" />
          <span className="text-xs font-prompt text-slate-600">
            ครูที่ปรึกษากำลังคิดคำถามชวนคิด...
          </span>
          <div className="flex gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" />
            <span
              className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce"
              style={{ animationDelay: '0.15s' }}
            />
            <span
              className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce"
              style={{ animationDelay: '0.3s' }}
            />
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
