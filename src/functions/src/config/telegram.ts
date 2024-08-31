/* eslint-disable require-jsdoc */
import * as functions from "firebase-functions";
import fetch from "node-fetch";

export async function sendTelegramMessage(message: string) {
  const botToken = functions.config().telegram.bot_token;
  const chatId = functions.config().telegram.chat_id;
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
      }),
    });

    if (!response.ok) {
      console.error("Failed to send Telegram message:", await response.text());
    }
  } catch (error) {
    console.error("Error sending Telegram message:", error);
  }
}
