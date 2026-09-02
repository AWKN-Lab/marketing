"use client";

import {
  AuiIf,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
} from "@assistant-ui/react";

export function MarketingThread() {
  return (
    <ThreadPrimitive.Root className="aui-thread">
      <ThreadPrimitive.Viewport className="aui-viewport">
        <AuiIf condition={(state) => state.thread.isEmpty}>
          <div className="aui-empty"><strong>直接说你现在要完成什么</strong><span>研究、策略、方案、会前准备、沟通与复盘都从任务开始。</span></div>
        </AuiIf>
        <ThreadPrimitive.Messages components={{ UserMessage, AssistantMessage }} />
        <ThreadPrimitive.ViewportFooter className="aui-footer">
          <ComposerPrimitive.Root className="aui-composer">
            <ComposerPrimitive.Input className="aui-input" placeholder="继续补充要求，或告诉我最新结果…" rows={1} />
            <ComposerPrimitive.Send className="aui-send">↑</ComposerPrimitive.Send>
          </ComposerPrimitive.Root>
        </ThreadPrimitive.ViewportFooter>
      </ThreadPrimitive.Viewport>
    </ThreadPrimitive.Root>
  );
}

function UserMessage() {
  return <MessagePrimitive.Root className="aui-message-row user-row"><div className="aui-message user-message"><MessagePrimitive.Parts /></div></MessagePrimitive.Root>;
}

function AssistantMessage() {
  return <MessagePrimitive.Root className="aui-message-row"><div className="aui-message assistant-message"><MessagePrimitive.Parts /></div></MessagePrimitive.Root>;
}
