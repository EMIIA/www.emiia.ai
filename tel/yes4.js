var token = "Кнопки публикуются только внесенным в список ID. Если ID нет в списке возвращается вы не авторизированы";
var telegramUrl = "https://api.telegram.org/bot" + token;
var webAppUrl = "https://script.google.com/macros/s/YOUR_WEB_APP_ID/exec";

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
  
  //send keyboard to user
  var keyBoard = {
    "keyboard": [
      [{text: 'ТИМ (BIM)', url: 'https://www.emiia.ai'}, {"text": "ЭДО (EDM)", url: 'https://www.emiia.ai'}],
      [{"text": "DATA ANALYSIS"}, {"text": "CLOUD EMIIA.AI"}]
    ],
    'resize_keyboard': true,
    'one_time_keyboard': true,
    'selective': false
  };
  var payload = {
    "method": "sendMessage",
    "chat_id": chat_id,
    "text": "Please choose an option:",
    "reply_markup": keyBoard
  };
  var options = {
    "method": "post",
    "payload": JSON.stringify(payload),
    "contentType": "application/json"
  };
  UrlFetchApp.fetch(telegramUrl + "/", options);
}
