import React, { useState, useEffect, useRef } from "react";
import type { ChatMessage, RoomView } from "@hand-cricket/shared";
import { MessageSquare, Send, X, Smile } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ChatWidgetProps {
  playerId: string;
  room: RoomView;
  chatHistory: ChatMessage[];
  onSendMessage: (channel: "all" | "team", text: string) => void;
  onAddReaction: (messageId: string, emoji: string) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export function ChatWidget({
  playerId,
  room,
  chatHistory,
  onSendMessage,
  onAddReaction,
  isOpen,
  setIsOpen
}: ChatWidgetProps) {
  const [channel, setChannel] = useState<"all" | "team">("all");
  const [inputText, setInputText] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const [latestPreview, setLatestPreview] = useState<ChatMessage | null>(null);
  const [activeReactionMenu, setActiveReactionMenu] = useState<string | null>(null);

  const prevHistoryLenRef = useRef(chatHistory.length);
  const previewTimerRef = useRef<NodeJS.Timeout | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const myPlayer = room.players.find((p) => p.id === playerId);
  const isSoloMode = room.mode === "quick" || room.mode === "series";

  // Auto-scroll to bottom on new message or when opening chat
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory.length, isOpen, channel]);

  // Handle new messages for preview and unread count
  useEffect(() => {
    if (chatHistory.length > prevHistoryLenRef.current) {
      const newMsgs = chatHistory.slice(prevHistoryLenRef.current);
      const lastMsg = newMsgs[newMsgs.length - 1];

      // Ignore messages sent by ourselves for notifications/badges
      if (lastMsg && lastMsg.senderId !== playerId) {
        if (!isOpen) {
          setUnreadCount((prev) => prev + newMsgs.length);
          setLatestPreview(lastMsg);

          if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
          previewTimerRef.current = setTimeout(() => {
            setLatestPreview(null);
          }, 3000);
        }
      }
    }
    prevHistoryLenRef.current = chatHistory.length;
  }, [chatHistory, isOpen, playerId]);

  // Clear unread and preview when opening
  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
      setLatestPreview(null);
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
      // Auto-focus input on desktop
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Listen to keyboard shortcut ESC to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, setIsOpen]);

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputText.trim();
    if (!text) return;
    onSendMessage(channel, text);
    setInputText("");
    inputRef.current?.focus();
  };

  const handleReactionClick = (msgId: string, emoji: string) => {
    onAddReaction(msgId, emoji);
    setActiveReactionMenu(null);
  };

  const filteredMessages = chatHistory.filter((msg) => {
    if (isSoloMode) return msg.channel === "all";
    if (channel === "team") {
      // In team chat, show messages on "team" channel from players who are in my team
      const sender = room.players.find((p) => p.id === msg.senderId);
      return msg.channel === "team" && sender?.team === myPlayer?.team;
    }
    // In global channel, show all global messages
    return msg.channel === "all";
  });

  const emojis = ["🔥", "😂", "👏", "😭", "😎", "❤️", "🎉"];

  return (
    <>
      {/* Floating Chat Trigger Button & Preview Bubble */}
      <div className="fixed bottom-6 right-6 z-[990] flex flex-col items-end gap-3 pointer-events-none">
        {/* Floating Preview Bubble */}
        <AnimatePresence>
          {latestPreview && !isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="bg-slate-900/90 backdrop-blur-md border border-slate-700/50 text-white px-4 py-2.5 rounded-2xl shadow-xl max-w-[240px] pointer-events-auto cursor-pointer flex flex-col gap-0.5"
              onClick={() => setIsOpen(true)}
            >
              <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-1">
                💬 {latestPreview.senderName}
              </span>
              <span className="text-xs font-semibold text-slate-200 line-clamp-2 break-words">
                {latestPreview.text}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chat Icon Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`pointer-events-auto h-14 w-14 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 relative border ${
            isOpen
              ? "bg-slate-800 border-slate-700 text-white"
              : "bg-emerald-500 hover:bg-emerald-400 border-emerald-400 text-slate-950 hover:scale-105"
          }`}
        >
          {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
          {/* Unread Count Badge */}
          {unreadCount > 0 && !isOpen && (
            <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white font-black text-xs h-5 px-1.5 rounded-full flex items-center justify-center border-2 border-slate-950 animate-bounce min-w-[20px]">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Global Sliding Chat Panel - remain mounted to preserve state/scroll */}
      <div
        className={`fixed z-[995] flex flex-col transition-all duration-300
          /* Mobile styles: floating glassmorphism at the bottom */
          bottom-24 left-[5%] right-[5%] w-[90%] h-[40vh] rounded-3xl border border-white/[0.08] bg-[#0f0f14]/55 backdrop-blur-[16px] shadow-2xl overflow-hidden
          
          /* Desktop/Tablet overrides: full-height sidebar */
          md:top-0 md:bottom-0 md:right-0 md:left-auto md:w-96 md:h-auto md:rounded-none md:border-l md:border-t-0 md:border-b-0 md:border-r-0 md:border-slate-800 md:bg-slate-950/95 md:backdrop-blur-md
          
          ${
            isOpen
              ? "translate-y-0 opacity-100 md:translate-x-0 md:translate-y-0"
              : "translate-y-12 opacity-0 pointer-events-none md:translate-x-full md:translate-y-0"
          }
        `}
      >
        {/* Header & Tabs Combined Horizontally */}
        <div className="p-3 border-b border-slate-800/60 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="font-black text-xs uppercase tracking-wider text-white">
              Chat
            </h3>
          </div>

          <div className="flex bg-slate-900/80 border border-slate-800/60 p-0.5 rounded-xl gap-0.5">
            <button
              onClick={() => setChannel("all")}
              className={`py-1 px-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors ${
                channel === "all"
                  ? "bg-slate-800 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Global
            </button>
            <button
              onClick={() => setChannel("team")}
              disabled={isSoloMode}
              className={`py-1 px-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors ${
                isSoloMode
                  ? "opacity-30 cursor-not-allowed text-slate-655"
                  : channel === "team"
                  ? "bg-slate-800 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Team
            </button>
          </div>

          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Warnings or messages container */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 relative bg-slate-950/40" ref={scrollRef}>
          {channel === "team" && isSoloMode && (
            <div className="text-center p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 text-xs font-bold">
              ⚠️ Solo Mode: Team Chat Disabled
            </div>
          )}

          {filteredMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 py-12 gap-2">
              <MessageSquare size={36} className="opacity-30" />
              <p className="text-xs font-bold uppercase tracking-wider">No messages yet</p>
            </div>
          ) : (
            filteredMessages.map((msg) => {
              const isSystem = msg.senderId === "system";
              const isSelf = msg.senderId === playerId;

              if (isSystem) {
                return (
                  <div
                    key={msg.id}
                    className="self-center bg-slate-900/60 border border-slate-800 text-[10px] md:text-xs font-bold text-slate-400 px-3.5 py-1.5 rounded-full text-center max-w-[90%] shadow-sm italic"
                  >
                    {msg.text}
                  </div>
                );
              }

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col gap-1 max-w-[85%] ${
                    isSelf ? "self-end items-end" : "self-start items-start"
                  }`}
                >
                  {/* Sender Name */}
                  <span className="text-[10px] font-black text-slate-400 px-1 uppercase tracking-wider">
                    {msg.senderName} {isSelf && <span className="text-slate-500 font-bold">(You)</span>}
                  </span>

                  {/* Bubble content */}
                  <div className="relative group flex items-center gap-1.5">
                    {/* Emoji Reaction Trigger (for other players' messages or self) */}
                    {!isSelf && (
                      <button
                        onClick={() =>
                          setActiveReactionMenu(activeReactionMenu === msg.id ? null : msg.id)
                        }
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-700/50 text-slate-400 hover:text-white"
                      >
                        <Smile size={14} />
                      </button>
                    )}

                    <div
                      className={`px-3 py-2 rounded-2xl text-xs md:text-sm font-semibold shadow-md break-words max-w-full ${
                        isSelf
                          ? "bg-emerald-500 text-slate-950 rounded-tr-none font-bold"
                          : "bg-slate-900 border border-slate-800 text-white rounded-tl-none"
                      }`}
                    >
                      {msg.text}
                    </div>

                    {isSelf && (
                      <button
                        onClick={() =>
                          setActiveReactionMenu(activeReactionMenu === msg.id ? null : msg.id)
                        }
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-700/50 text-slate-400 hover:text-white"
                      >
                        <Smile size={14} />
                      </button>
                    )}

                    {/* Popover Emoji Menu */}
                    <AnimatePresence>
                      {activeReactionMenu === msg.id && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8, y: 5 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.8, y: 5 }}
                          className={`absolute bottom-full z-[1000] flex gap-1 bg-slate-900/95 backdrop-blur-sm border border-slate-800 p-1.5 rounded-xl shadow-xl ${
                            isSelf ? "right-0" : "left-0"
                          }`}
                        >
                          {emojis.map((emoji) => (
                            <button
                              key={emoji}
                              onClick={() => handleReactionClick(msg.id, emoji)}
                              className="hover:scale-125 transition-transform duration-100 text-sm p-1"
                            >
                              {emoji}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Render Message Reactions */}
                  {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-0.5 px-1">
                      {Object.entries(msg.reactions).map(([emoji, playerIds]) => {
                        const hasReacted = playerIds.includes(playerId);
                        return (
                          <button
                            key={emoji}
                            onClick={() => onAddReaction(msg.id, emoji)}
                            className={`flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full border transition-colors ${
                              hasReacted
                                ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                                : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                            }`}
                          >
                            <span>{emoji}</span>
                            <span>{playerIds.length}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSend} className="p-3 border-t border-slate-800/80 flex gap-2 shrink-0 bg-slate-950/40">
          <input
            ref={inputRef}
            type="text"
            maxLength={200}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              channel === "team" ? "Message Team..." : "Message Room..."
            }
            className="flex-1 bg-slate-900/60 border border-slate-800/85 rounded-xl px-3 py-1.5 text-xs font-semibold text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="h-8 w-8 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:hover:bg-emerald-500 rounded-xl flex items-center justify-center text-slate-950 transition-all active:scale-95 shrink-0"
          >
            <Send size={14} />
          </button>
        </form>
      </div>
    </>
  );
}
