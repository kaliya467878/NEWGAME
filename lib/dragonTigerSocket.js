export function joinDtRoom(socket, duration) {
  if (socket?.emit) {
    socket.emit("dt:join", { duration: Number(duration) });
  }
}

export function leaveDtRoom(socket, duration) {
  if (socket?.emit) {
    socket.emit("dt:leave", { duration: Number(duration) });
  }
}

export function bindDtSocket(socket, duration, handlers = {}) {
  if (!socket) return () => {};

  const sec = Number(duration);

  const handleTimer = (data) => {
    if (data?.duration === sec || !data?.duration) handlers.onTimer?.(data);
  };
  const handleCreated = (data) => {
    if (data?.duration === sec || !data?.duration) handlers.onPeriodCreated?.(data);
  };
  const handleSnapshot = (data) => {
    if (data?.duration === sec || !data?.duration) handlers.onPeriodSnapshot?.(data);
  };
  const handleClosed = (data) => {
    if (data?.duration === sec || !data?.duration) handlers.onBetClosed?.(data);
  };
  const handleResult = (data) => {
    if (data?.duration === sec || !data?.duration) handlers.onResult?.(data);
  };
  const handleWallet = (data) => {
    handlers.onWalletUpdated?.(data);
  };

  socket.on("dt:timer:update", handleTimer);
  socket.on("dt:period:created", handleCreated);
  socket.on("dt:period:snapshot", handleSnapshot);
  socket.on("dt:bet:closed", handleClosed);
  socket.on("dt:result:declared", handleResult);
  socket.on("wallet:updated", handleWallet);

  return () => {
    socket.off("dt:timer:update", handleTimer);
    socket.off("dt:period:created", handleCreated);
    socket.off("dt:period:snapshot", handleSnapshot);
    socket.off("dt:bet:closed", handleClosed);
    socket.off("dt:result:declared", handleResult);
    socket.off("wallet:updated", handleWallet);
  };
}
