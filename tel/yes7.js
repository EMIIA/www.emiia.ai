var token = "";
var telegramUrl = "https://api.telegram.org/bot" + token;
var webAppUrl = "https://script.google.com/macros/s/AKfycbyEzJCbsFz5QzcZRakoz-jsajXc5-T1g4RTizYuSfEHt3BuwrvhmxA-s_rB4xFeVU7hTw/exec";

function setWebhook() {
  var url = telegramUrl + "/setWebhook?url=" + webAppUrl;
  var response = UrlFetchApp.fetch(url);
}

function doPost(e) {
  //parse user data
  var contents = JSON.parse(e.postData.contents);
  var chat_id = contents.message.chat.id;
  
  //list of allowed user ids
  var allowed_ids = [1005942370, 67890];
  
  if (allowed_ids.indexOf(chat_id) === -1) {
    //send error message to user
    var message = "You are not authorized to use this bot.";
    var url = telegramUrl + "/sendMessage?chat_id=" + chat_id + "&text=" + message;
    UrlFetchApp.fetch(url);
    return;
  }
  
  //continue with bot logic for authorized users
  // ...
  
  //send inline keyboard to user
  var inlineKeyboard = {
    "keyboard": [
      [{text: 'ТИМ (BIM)', url: 'https://www.emiia.ai'}, {"text": "ЭДО (EDM)", url: 'https://www.emiia.ai'}],
      [{"text": "DATA ANALYSIS", url: 'https://www.emiia.ai'}, {"text": "CLOUD EMIIA.AI", url: 'https://www.emiia.ai'}]
    ]
  };
  var payload = {
    "method": "sendMessage",
    "chat_id": chat_id,
    "text": "Please choose an option:",
    "reply_markup": inlineKeyboard
  };
  var options = {
    "method": "post",
    "payload": JSON.stringify(payload),
    "contentType": "application/json"
  };
  UrlFetchApp.fetch(telegramUrl + "/", options);

  var response = UrlFetchApp.fetch(telegramUrl + "/sendMessage", options);
}
