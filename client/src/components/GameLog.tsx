import { useEffect, useRef } from 'react';

interface Props {
  logs: string[];
}

export function GameLog({ logs }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div ref={containerRef}>
      {logs.map((log, idx) => (
        <p key={idx}>{log}</p>
      ))}
    </div>
  );
}
