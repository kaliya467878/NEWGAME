const TELEGRAM_BOT_TOKEN = "8925619066:AAH1KpM550ubsV1V0G8X3GWQMKI9d6cX0ns";
const TELEGRAM_CHAT_IDS = ["-1004321239973", "5417636031"];

export async function sendTelegramNotification(
  userUid: string | number,
  amount: number,
  mode: string,
  orderId: string,
  status: "created" | "approved" | "success" | "failed" | "mock" | "processing",
  createdAt: Date,
  txid: string = "N/A",
  _messageIdToEdit?: number,
  isMock: boolean = false,
  approvedBy?: string
): Promise<number | null> {
  const d = new Date(createdAt);
  
  // Format creation time and date in Asia/Kolkata (IST)
  const optionsTime = { timeZone: "Asia/Kolkata", hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" } as const;
  const optionsDate = { timeZone: "Asia/Kolkata", day: "2-digit", month: "2-digit", year: "2-digit" } as const;
  
  const formatterTime = new Intl.DateTimeFormat("en-IN", optionsTime);
  const formatterDate = new Intl.DateTimeFormat("en-IN", optionsDate);
  
  const timeStr = formatterTime.format(d);
  const dateStr = formatterDate.format(d);

  const isWithdraw = mode.toLowerCase().includes("withdraw");
  
  const eDance = `<tg-emoji emoji-id="6307506297080121060">💃</tg-emoji>`;
  const eMoney = `💵`;
  const eComet = `☄️`;
  const eTime = `<tg-emoji emoji-id="6242510612824332116">🕐</tg-emoji>`;
  const eArrow = `<tg-emoji emoji-id="6068736321927519921">➡️</tg-emoji>`;
  const eRainbow = `<tg-emoji emoji-id="6068664995405633126">🌈</tg-emoji>`;
  const eBoom = `<tg-emoji emoji-id="6068901240081748746">💥</tg-emoji>`;
  const eShield = `<tg-emoji emoji-id="6269105110450705259">🛡</tg-emoji>`;
  const eSos = `<tg-emoji emoji-id="6068945070223005574">🆘</tg-emoji>`;
  const eEyes = `<tg-emoji emoji-id="6068719730468853667">👀</tg-emoji>`;
  const eMoneyFly = `<tg-emoji emoji-id="6235445786759402354">💸</tg-emoji>`;
  const eProhibited = `<tg-emoji emoji-id="6269019133795374514">🚫</tg-emoji>`;
  const eExclamation = `‼️`;
  const eSmile = `<tg-emoji emoji-id="6269347200577311493">💀</tg-emoji>`;
  const eLightning = `<tg-emoji emoji-id="6271459718896554468">⚡️</tg-emoji>`;

  let headerText = "";
  if (isWithdraw) {
    if (status === "created") {
      headerText = `${eDance}Withdrawal request  ${eDance}`;
    } else if (status === "approved") {
      headerText = `${eDance}Withdrawal Approved ${eDance}`;
    } else if (status === "processing") {
      headerText = `${eDance}Withdrawal Sent to Sunpay ${eDance}`;
    } else if (status === "success") {
      headerText = `${eDance}Withdrawal Success ${eDance}`;
    } else if (status === "mock") {
      headerText = `${eDance}Withdrawal Mock  ${eDance}`;
    } else {
      headerText = `${eDance}Withdrawal Failed ${eDance}`;
    }
  } else {
    if (status === "created") {
      headerText = `${eDance}Recharge request  ${eDance}`;
    } else if (status === "success") {
      headerText = `${eDance}Recharge Success ${eDance}`;
    } else if (status === "mock") {
      headerText = `${eDance}Recharge Mock  ${eDance}`;
    } else {
      headerText = `${eDance}Recharge Failed ${eDance}`;
    }
  }

  let statusText = "";
  if (status === "created") {
    statusText = `Created${eEyes}`;
  } else if (status === "approved") {
    statusText = `Approved${eSmile}`;
  } else if (status === "processing") {
    statusText = `Sent to Sunpay ${eLightning}`;
  } else if (status === "success") {
    statusText = `Suceess${eMoneyFly}`;
  } else if (status === "mock") {
    statusText = `Mock ${eExclamation}`;
  } else {
    statusText = `Failed ${eProhibited}`;
  }

  const isUsdt = mode.toLowerCase().includes("usdt") || mode.toLowerCase().includes("trc20") || mode.toLowerCase().includes("bep20");
  let amountText = "";
  if (isUsdt) {
    const rate = isWithdraw ? 104 : 102;
    const usdAmount = (amount / rate).toFixed(2);
    amountText = `${usdAmount}$`;
  } else {
    amountText = `₹${amount}`;
  }

  let extraRows = "";
  if (status !== "created") {
    const typeLabel = isMock 
      ? `Mock <tg-emoji emoji-id="6269083884722328380">⁉️</tg-emoji>`
      : `Real <tg-emoji emoji-id="6147460667281511517">✔️</tg-emoji>`;
    extraRows += `\n\n🔛Type : ${typeLabel}`;

    if (approvedBy) {
      let byName = approvedBy;
      let crown = "";
      if (approvedBy === "BlazingViper7683") {
        byName = "Ashu";
        crown = ` <tg-emoji emoji-id="6271665430650163493">👑</tg-emoji>`;
      } else if (approvedBy === "MightyLion5113") {
        byName = "Prince";
        crown = ` <tg-emoji emoji-id="6271665430650163493">👑</tg-emoji>`;
      } else if (approvedBy !== "Automatic") {
        crown = ` <tg-emoji emoji-id="6271665430650163493">👑</tg-emoji>`;
      }
      extraRows += `\n\n<tg-emoji emoji-id="6269279237014819841">📣</tg-emoji>BY : ${byName}${crown}`;
    }
  }

  const messageText = `${headerText}

${eMoney}Amount :- ${amountText}

${eTime} Time : ${timeStr}  

${eArrow}Date : ${dateStr}

${eRainbow}Uid :-<code>${userUid}</code>

${eBoom}order id :-<code>${orderId}</code>

${eShield}Txid :- <code>${txid}</code>

${eSos}Status :- ${statusText}${extraRows}`;

  console.log(`Sending Telegram notification status: ${status}. Message:\n${messageText}`);

  // Send a new message every time (do not edit)
  for (const chatId of TELEGRAM_CHAT_IDS) {
    try {
      const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({
           chat_id: chatId,
           text: messageText,
           parse_mode: "HTML",
         }),
      });

      if (response.ok) {
        const resJson = await response.json();
        const msgId = resJson.result?.message_id;
        console.log(`Telegram notification successfully sent to chat ID: ${chatId}`);
        return msgId || null;
      } else {
        const errorText = await response.text();
        console.warn(`Telegram send failed for chat ID ${chatId}:`, errorText);
      }
    } catch (error) {
      console.error(`Error sending Telegram to chat ID ${chatId}:`, error);
    }
  }

  return null;
}
