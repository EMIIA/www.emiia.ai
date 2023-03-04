function onMessageReceived(event) {
  var chatId = event.message.chat.id;
  var messageText = event.message.text;
  
  var button1 = {
    text: "Button #1",
    url: "https://www.example.com/button1"
  };
  
  var button2 = {
    text: "Button #2",
    url: "https://www.example.com/button2"
  };
  
  var message = {
    chat_id: chatId,
    text: "This is a message with two buttons.",
    reply_markup: {
      inline_keyboard: [
        [button1, button2]
      ]
    }
  };
  
  sendMessage(message);
}

function sendMessage(message) {
  var token = "YOUR_BOT_TOKEN";
  var url = "https://api.telegram.org/bot" + token + "/sendMessage";
  var payload = {
    method: "post",
    payload: message
  };
  
  UrlFetchApp.fetch(url, payload);
}
