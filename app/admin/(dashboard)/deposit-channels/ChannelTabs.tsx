"use client";

import { useState, useEffect } from "react";
import clsx from "clsx";
import { ChannelRow, AddChannelButton, type ChannelDto } from "./DepositChannelForms";
import { updateDepositChannelsOrderAction } from "@/lib/actions/depositChannels";

export function ChannelTabs({ channels, methods }: { channels: ChannelDto[]; methods: ChannelDto[] }) {
  const [tab, setTab] = useState<"CHANNEL" | "METHOD">("CHANNEL");
  const list = tab === "CHANNEL" ? channels : methods;

  const [localList, setLocalList] = useState<ChannelDto[]>(list);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  useEffect(() => {
    setLocalList(list);
  }, [list]);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newList = [...localList];
    const draggedItem = newList[draggedIndex];
    newList.splice(draggedIndex, 1);
    newList.splice(index, 0, draggedItem);

    setDraggedIndex(index);
    setLocalList(newList);
  };

  const handleDragEnd = async () => {
    setDraggedIndex(null);
    const orderedIds = localList.map((item) => item.id);
    try {
      await updateDepositChannelsOrderAction(orderedIds);
    } catch (err) {
      console.error("Failed to update deposit channels order:", err);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setTab("CHANNEL")}
          className={clsx(
            "rounded-full px-4 py-1.5 text-sm border font-medium",
            tab === "CHANNEL" ? "border-gold text-gold bg-gold/10" : "border-border text-muted hover:text-foreground"
          )}
        >
          Channels <span className="ml-1 text-xs opacity-70">{channels.length}</span>
        </button>
        <button
          onClick={() => setTab("METHOD")}
          className={clsx(
            "rounded-full px-4 py-1.5 text-sm border font-medium",
            tab === "METHOD" ? "border-gold text-gold bg-gold/10" : "border-border text-muted hover:text-foreground"
          )}
        >
          Payment methods <span className="ml-1 text-xs opacity-70">{methods.length}</span>
        </button>
        <div className="ml-auto">
          <AddChannelButton kind={tab} />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {localList.length === 0 && <p className="text-sm text-muted">None configured yet.</p>}
        {localList.map((c, i) => (
          <div
            key={c.id}
            draggable
            onDragStart={(e) => handleDragStart(e, i)}
            onDragOver={(e) => handleDragOver(e, i)}
            onDragEnd={handleDragEnd}
            className={clsx(
              "cursor-grab active:cursor-grabbing transition-opacity duration-150",
              draggedIndex === i && "opacity-40"
            )}
          >
            <div className="flex items-center gap-2">
              <span className="text-muted text-xs select-none cursor-move mr-1">☰</span>
              <div className="flex-1">
                <ChannelRow index={i + 1} channel={c} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
