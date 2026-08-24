const TELEGRAM_BOT_TOKEN = "8925619066:AAH1KpM550ubsV1V0G8X3GWQMKI9d6cX0ns";
const TELEGRAM_CHAT_IDS = ["-1004321239973"];

async function run() {
  const messageText = `??Recharge Request Created ??\n\n??Amount :- ?100 / 1$ \n\n?? Method :- UPI\n\n?? Time : 12:00:00  \n\n??Date : 01/01/26\n\n??Uid :-1234567890\n\n??order id :-abcd\n\n??Txid :- 1234\n\n??Status :-Created??`;
  
  for (const chatId of TELEGRAM_CHAT_IDS) {
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: messageText,
        parse_mode: "HTML",
      }),
    });
    
    if (!response.ok) {
      console.error(chatId, await response.text());
    } else {
      console.log("Success on", chatId);
    }
  }
}
run();
